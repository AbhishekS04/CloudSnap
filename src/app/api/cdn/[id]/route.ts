/**
 * /api/cdn/[id] — CloudSnap Public CDN Proxy
 *
 * Fetches assets from Telegram and serves them with:
 * - On-the-fly image resizing (?w=800)
 * - On-the-fly format conversion (?fmt=webp|avif|jpeg|png)
 * - On-the-fly quality control (?q=85)
 * - Long-term edge caching (1 year, immutable)
 * - HTTP Range request support (required for video playback/seeking)
 *
 * Usage:
 *   /api/cdn/[id]              → serve original
 *   /api/cdn/[id]?w=400        → resize to 400px wide (keep aspect ratio)
 *   /api/cdn/[id]?fmt=webp     → convert to WebP
 *   /api/cdn/[id]?w=400&fmt=avif&q=80
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import {
  downloadFromTelegram,
  downloadChunkedFromTelegram,
  getTelegramStream,
} from '@/lib/telegram';
import sharp from 'sharp';

// Supported output formats
const ALLOWED_FORMATS = ['webp', 'avif', 'jpeg', 'png'] as const;
type OutputFormat = typeof ALLOWED_FORMATS[number];

// ─────────────────────────────────────────────
// Simple In-Memory Cache (Blazing Speed)
// ─────────────────────────────────────────────
// Stores raw buffers to avoid Telegram round-trips on repeat hits.
const MEMORY_CACHE = new Map<string, { buffer: Buffer; expires: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour
const MAX_CACHE_SIZE_MB = 100; // Limit memory usage to 100MB

function getFromCache(key: string): Buffer | null {
  const item = MEMORY_CACHE.get(key);
  if (item && item.expires > Date.now()) {
    return item.buffer;
  }
  if (item) MEMORY_CACHE.delete(key);
  return null;
}

function setToCache(key: string, buffer: Buffer) {
  // Simple check to avoid memory bloat
  let currentSize = 0;
  MEMORY_CACHE.forEach(v => currentSize += v.buffer.length);
  
  if (currentSize + buffer.length > MAX_CACHE_SIZE_MB * 1024 * 1024) {
    // Basic LRU: delete oldest if full
    const oldestKey = MEMORY_CACHE.keys().next().value;
    if (oldestKey) MEMORY_CACHE.delete(oldestKey);
  }

  if (buffer.length < 20 * 1024 * 1024) { // Only cache chunks/files < 20MB
    MEMORY_CACHE.set(key, { buffer, expires: Date.now() + CACHE_TTL });
  }
}

// GET /api/cdn/[id]
// ─────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);

  // Parse transform params
  const requestedWidth  = parseInt(searchParams.get('w') ?? '0', 10) || null;
  const requestedFormat = (searchParams.get('fmt') ?? '') as OutputFormat | '';
  const requestedQuality = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get('q') ?? '85', 10)),
  );

  const outputFormat: OutputFormat | null = ALLOWED_FORMATS.includes(requestedFormat as OutputFormat)
    ? (requestedFormat as OutputFormat)
    : null;

  try {
    // ── 1. Look up asset metadata in Supabase ──────────────────────────────
    const { data: asset, error } = await supabaseAdmin
      .from('assets')
      .select('id, mime_type, telegram_file_ids, is_chunked, original_name')
      .eq('id', id)
      .single();

    if (error || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // ── 2. Binary Handling (Stream vs Buffer) ──────────────────────────────
    const mimeType     = asset.mime_type as string;
    const isImage      = mimeType.startsWith('image/');
    const isVideo      = mimeType.startsWith('video/');
    const safeFilename = encodeURIComponent(asset.original_name as string || `asset-${id}`);

    const baseHeaders: Record<string, string> = {
      'Content-Disposition':         `inline; filename="${safeFilename}"`,
      'Cache-Control':               'public, s-maxage=31536000, stale-while-revalidate=59, immutable',
      'Access-Control-Allow-Origin': '*',
      'X-CloudSnap-Asset-Id':        id,
      'X-CloudSnap-Chunked':         String(asset.is_chunked),
      'Accept-Ranges':               'bytes',
    };

    const needsTransform = isImage && (requestedWidth || outputFormat);
    const rangeHeader    = req.headers.get('range');

    // ── 3. Check Cache First (Final Output Cache) ──────────────────────────
    // Create a unique key for this specific request (id + transforms)
    const transformKey = `${id}-${requestedWidth}-${outputFormat}-${requestedQuality}`;
    const cachedResponse = getFromCache(transformKey);
    
    if (cachedResponse && !rangeHeader) {
      return new NextResponse(new Uint8Array(cachedResponse), {
        status: 200,
        headers: { 
          ...baseHeaders, 
          'Content-Type': needsTransform ? `image/${outputFormat || 'webp'}` : mimeType,
          'X-Cache-Status': 'HIT-MEMORY'
        },
      });
    }

    // Case A: Simple Stream Proxy (Single Chunk, No Transform, No Range)
    if (!asset.is_chunked && !needsTransform && !rangeHeader) {
      try {
        const stream = await getTelegramStream(asset.telegram_file_ids[0]);
        return new NextResponse(stream, {
          status: 200,
          headers: { ...baseHeaders, 'Content-Type': mimeType, 'X-Cache-Status': 'MISS-STREAM' },
        });
      } catch (e) {
        console.warn('[CDN] Direct stream failed, falling back to buffer:', e);
      }
    }

    // Case B: Buffer-based Handling (Chunked, Range Requests, or Image Transforms)
    let buffer: Buffer | null = getFromCache(`raw-${id}`);

    if (!buffer) {
      try {
        if (asset.is_chunked) {
          buffer = await downloadChunkedFromTelegram(asset.telegram_file_ids);
        } else {
          buffer = await downloadFromTelegram(asset.telegram_file_ids[0]);
        }
        // Cache the raw buffer for 1 hour
        if (buffer) setToCache(`raw-${id}`, buffer);
      } catch (tgErr: any) {
        if (tgErr.message?.includes('400')) {
          return NextResponse.json({ 
            error: 'Asset too large for legacy storage. Please re-upload.', 
            code: 'TELEGRAM_FILE_TOO_LARGE' 
          }, { status: 422 });
        }
        throw tgErr;
      }
    }

    if (!buffer) throw new Error('Failed to retrieve buffer');

    // Handle Range Requests
    if (isVideo && rangeHeader) {
      const totalLength = buffer.length;
      const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
      const start = match?.[1] ? parseInt(match[1], 10) : 0;
      const end   = match?.[2] ? parseInt(match[2], 10) : totalLength - 1;

      const chunkStart = Math.max(0, start);
      const chunkEnd   = Math.min(end, totalLength - 1);
      const chunkLen   = chunkEnd - chunkStart + 1;

      return new NextResponse(new Uint8Array(buffer.subarray(chunkStart, chunkEnd + 1)), {
        status: 206,
        headers: {
          ...baseHeaders,
          'Content-Type':  mimeType,
          'Content-Range': `bytes ${chunkStart}-${chunkEnd}/${totalLength}`,
          'Content-Length': String(chunkLen),
          'X-Cache-Status': 'HIT-RANGE'
        },
      });
    }

    // Handle Image Transformations
    let outputBuffer = buffer;
    let contentType  = mimeType;

    if (needsTransform) {
      const fmt = outputFormat ?? 'webp';
      contentType = `image/${fmt}`;
      let pipeline = sharp(buffer);

      if (requestedWidth) {
        pipeline = pipeline.resize({ width: requestedWidth, withoutEnlargement: true, fit: 'inside' });
      }

      switch (fmt) {
        case 'avif': pipeline = pipeline.avif({ quality: requestedQuality }); break;
        case 'jpeg': pipeline = pipeline.jpeg({ quality: requestedQuality, mozjpeg: true }); break;
        case 'png':  pipeline = pipeline.png({ quality: requestedQuality }); break;
        default:     pipeline = pipeline.webp({ quality: requestedQuality });
      }
      outputBuffer = await pipeline.toBuffer();
      
      // Cache the final transformed image
      setToCache(transformKey, outputBuffer);
    } else if (!asset.is_chunked) {
      // Cache the original single-chunk file as its own transform key for fast hits
      setToCache(transformKey, outputBuffer);
    }

    // Final Response (Buffered)
    return new NextResponse(new Uint8Array(outputBuffer), {
      status: 200,
      headers: {
        ...baseHeaders,
        'Content-Type':   contentType,
        'Content-Length': String(outputBuffer.length),
        'X-Cache-Status': 'MISS-CACHE-STORED'
      },
    });

  } catch (err: any) {
    console.error('[CDN] Error serving asset:', id, err?.message);
    return NextResponse.json(
      { error: 'Failed to serve asset', detail: err?.message },
      { status: 500 },
    );
  }
}
