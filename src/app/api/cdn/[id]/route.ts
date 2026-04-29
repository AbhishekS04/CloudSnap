/**
 * /api/cdn/[id] — CloudSnap Public CDN Proxy
 *
 * Fetches assets from Telegram and serves them with:
 * - On-the-fly image resizing (?w=800)
 * - On-the-fly format conversion (?fmt=webp|avif|jpeg|png)
 * - On-the-fly quality control (?q=85 or ?q=auto for format-optimal defaults)
 * - Two-tier cache: L1 in-process Map + L2 Upstash Redis (survives cold starts)
 * - Long-term edge caching (1 year, immutable)
 * - HTTP Range request support with chunk-aware seeking (chunked videos)
 *
 * Usage:
 *   /api/cdn/[id]              → serve original
 *   /api/cdn/[id]?w=400        → resize to 400px wide (keep aspect ratio)
 *   /api/cdn/[id]?fmt=webp     → convert to WebP
 *   /api/cdn/[id]?w=400&fmt=avif&q=auto
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import {
  downloadFromTelegram,
  downloadChunkedFromTelegram,
  getTelegramStream,
} from '@/lib/telegram';
import sharp from 'sharp';
import { getCache, setCache } from '@/lib/cache';

// Supported output formats
const ALLOWED_FORMATS = ['webp', 'avif', 'jpeg', 'png'] as const;
type OutputFormat = typeof ALLOWED_FORMATS[number];

// Format-aware quality defaults (tuned per codec efficiency curve)
// PNG: no quality setting — sharp's PNG quality doesn't meaningfully reduce file size
const FORMAT_QUALITY_DEFAULTS: Record<string, number> = {
  webp: 82,
  jpeg: 78, // mozjpeg is enabled so 78 here ≈ 85+ visually
  avif: 65, // AVIF is very efficient; 65 produces excellent results
};

function resolveQuality(rawQ: string | null, format: OutputFormat | null): number {
  if (rawQ === 'auto' || rawQ === null) {
    return FORMAT_QUALITY_DEFAULTS[format ?? 'webp'] ?? 82;
  }
  return Math.min(100, Math.max(1, parseInt(rawQ, 10)));
}

// Byte size of each Telegram chunk — must stay in sync with upload CHUNK_SIZE
const TELEGRAM_CHUNK_BYTES = 4 * 1024 * 1024; // 4 MB

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

  const outputFormat: OutputFormat | null = ALLOWED_FORMATS.includes(requestedFormat as OutputFormat)
    ? (requestedFormat as OutputFormat)
    : null;

  const requestedQuality = resolveQuality(searchParams.get('q'), outputFormat);

  try {
    // ── 1. Look up asset metadata in Supabase ──────────────────────────────
    // Check if the id parameter is a valid UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    let asset = null;
    let error = null;

    if (isUuid) {
      const result = await supabaseAdmin
        .from('assets')
        .select('id, mime_type, telegram_file_ids, is_chunked, original_name, original_size, chunk_count')
        .eq('id', id)
        .single();
      asset = result.data;
      error = result.error;
    } else {
      const decodedName = decodeURIComponent(id);
      const result = await supabaseAdmin
        .from('assets')
        .select('id, mime_type, telegram_file_ids, is_chunked, original_name, original_size, chunk_count')
        .eq('original_name', decodedName)
        .limit(1)
        .single();
      asset = result.data;
      error = result.error;
    }

    if (error || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Use the actual asset ID for cache keys to prevent collisions if names change
    const assetId = asset.id;

    // ── 2. Determine MIME & base response headers ──────────────────────────
    const mimeType     = asset.mime_type as string;
    const isImage      = mimeType.startsWith('image/');
    const isVideo      = mimeType.startsWith('video/');
    const isDownload    = searchParams.get('dl') === '1';
    const safeFilename = encodeURIComponent(asset.original_name as string || `asset-${id}`);

    const baseHeaders: Record<string, string> = {
      'Content-Disposition':         `${isDownload ? 'attachment' : 'inline'}; filename="${safeFilename}"`,
      'Cache-Control':               'public, s-maxage=31536000, stale-while-revalidate=59, immutable',
      'Access-Control-Allow-Origin': '*',
      'X-CloudSnap-Asset-Id':        assetId,
      'X-CloudSnap-Chunked':         String(asset.is_chunked),
      'Accept-Ranges':               'bytes',
    };

    const isHEIC       = mimeType === 'image/heic' || mimeType === 'image/heif' || asset.original_name?.toLowerCase().endsWith('.heic') || asset.original_name?.toLowerCase().endsWith('.heif');
    const needsTransform = isImage && (requestedWidth || outputFormat || isHEIC);
    const rangeHeader    = req.headers.get('range');

    // ── 3. L1/L2 Cache Check — Final Output ──────────────────────────────
    // Key is unique per (id + transform params). Range requests bypass output cache
    // because the response body depends on the byte range, not the transform.
    const transformKey = `cs:${assetId}:${requestedWidth}:${outputFormat}:${requestedQuality}`;

    if (!rangeHeader) {
      const cached = await getCache(transformKey);
      if (cached) {
        return new NextResponse(new Uint8Array(cached.buffer), {
          status: 200,
          headers: {
            ...baseHeaders,
            'Content-Type':     needsTransform ? `image/${outputFormat || 'webp'}` : mimeType,
            'Content-Length':   String(cached.buffer.length),
            'X-Cache-Source':   cached.source,  // 'L1' or 'L2'
            'X-Cache-Status':   `HIT-${cached.source}`,
          },
        });
      }
    }

    // ── 4. Case A: Simple Stream Proxy ────────────────────────────────────
    // Non-chunked assets with no transform and no range request — stream directly.
    // Streaming avoids loading the full binary into Node.js memory.
    if (!asset.is_chunked && !needsTransform && !rangeHeader) {
      try {
        const stream = await getTelegramStream(asset.telegram_file_ids[0]);
        return new NextResponse(stream, {
          status: 200,
          headers: { ...baseHeaders, 'Content-Type': mimeType, 'X-Cache-Status': 'MISS-STREAM', 'X-Cache-Source': 'TELEGRAM' },
        });
      } catch (e) {
        console.warn('[CDN] Direct stream failed, falling back to buffer:', e);
      }
    }

    // ── 5. Case B: Range Request (video seeking) ───────────────────────────
    // Chunk-aware: for multi-chunk videos, only download the Telegram chunks
    // that contain the requested byte range — not the entire file.
    if (isVideo && rangeHeader) {
      const totalLength = (asset.original_size as number) ?? 0;

      const match     = rangeHeader.match(/bytes=(\d*)-(\d*)/);
      const byteStart = match?.[1] ? parseInt(match[1], 10) : 0;
      const byteEnd   = match?.[2]
        ? parseInt(match[2], 10)
        : Math.min(byteStart + 1024 * 1024, totalLength - 1); // default: 1MB window

      const clampedStart = Math.max(0, byteStart);
      const clampedEnd   = Math.min(byteEnd, totalLength - 1);

      if (asset.is_chunked && (asset.telegram_file_ids as string[]).length > 1 && totalLength > 0) {
        // Only fetch the specific Telegram chunk(s) that contain the byte range
        const startChunkIdx = Math.floor(clampedStart / TELEGRAM_CHUNK_BYTES);
        const endChunkIdx   = Math.floor(clampedEnd   / TELEGRAM_CHUNK_BYTES);

        const neededBuffers: Buffer[] = [];
        for (let ci = startChunkIdx; ci <= endChunkIdx; ci++) {
          const chunkKey  = `cs:chunk:${assetId}:${ci}`;
          const fromCache = await getCache(chunkKey);
          if (fromCache) {
            neededBuffers.push(fromCache.buffer);
          } else {
            const chunkBuf = await downloadFromTelegram((asset.telegram_file_ids as string[])[ci]);
            await setCache(chunkKey, chunkBuf);
            neededBuffers.push(chunkBuf);
          }
        }

        const combined   = Buffer.concat(neededBuffers);
        const sliceStart = clampedStart - startChunkIdx * TELEGRAM_CHUNK_BYTES;
        const slice      = combined.subarray(sliceStart, sliceStart + (clampedEnd - clampedStart + 1));

        return new NextResponse(new Uint8Array(slice), {
          status: 206,
          headers: {
            ...baseHeaders,
            'Content-Type':   mimeType,
            'Content-Range':  `bytes ${clampedStart}-${clampedEnd}/${totalLength}`,
            'Content-Length': String(slice.length),
            'X-Cache-Status': 'CHUNK-AWARE-RANGE',
            'X-Cache-Source': 'CHUNK-CACHE',
          },
        });
      }

      // Non-chunked video range request — download the single file, slice it
      const rawKey    = `cs:raw:${assetId}`;
      let singleBuf   = (await getCache(rawKey))?.buffer ?? null;
      if (!singleBuf) {
        singleBuf = await downloadFromTelegram((asset.telegram_file_ids as string[])[0]);
        await setCache(rawKey, singleBuf);
      }
      const total    = singleBuf.length;
      const safeEnd  = Math.min(clampedEnd, total - 1);
      const slice    = singleBuf.subarray(clampedStart, safeEnd + 1);
      return new NextResponse(new Uint8Array(slice), {
        status: 206,
        headers: {
          ...baseHeaders,
          'Content-Type':  mimeType,
          'Content-Range': `bytes ${clampedStart}-${safeEnd}/${total}`,
          'Content-Length': String(slice.length),
          'X-Cache-Status': 'HIT-RANGE',
          'X-Cache-Source': 'BUFFER',
        },
      });
    }

    // ── 6. Case C: Buffer — Image Transform or Chunked Non-Range ─────────
    const rawKey = `cs:raw:${assetId}`;
    let buffer: Buffer | null = (await getCache(rawKey))?.buffer ?? null;

    if (!buffer) {
      try {
        if (asset.is_chunked) {
          buffer = await downloadChunkedFromTelegram(asset.telegram_file_ids as string[]);
        } else {
          buffer = await downloadFromTelegram((asset.telegram_file_ids as string[])[0]);
        }
        if (buffer) await setCache(rawKey, buffer);
      } catch (tgErr: any) {
        if (tgErr.message?.includes('400')) {
          return NextResponse.json({
            error: 'Asset too large for legacy storage. Please re-upload.',
            code: 'TELEGRAM_FILE_TOO_LARGE',
          }, { status: 422 });
        }
        throw tgErr;
      }
    }

    if (!buffer) throw new Error('Failed to retrieve buffer');

    // ── 7. Image Transform ────────────────────────────────────────────────
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
        case 'png':  pipeline = pipeline.png(); break; 
        default:     pipeline = pipeline.webp({ quality: requestedQuality });
      }

      // Special handling for HEIC: ensure orientation and format
      if (isHEIC) {
          pipeline = pipeline.rotate(); // Auto-rotate iPhone photos
      }

      outputBuffer = await pipeline.toBuffer();
      // Store the transformed output in both L1 + L2
      await setCache(transformKey, outputBuffer);
    } else if (!asset.is_chunked) {
      // Cache the untransformed original for repeat hits (only if under the size gate)
      await setCache(transformKey, outputBuffer);
    }

    // ── 8. Final Buffered Response ────────────────────────────────────────
    return new NextResponse(new Uint8Array(outputBuffer), {
      status: 200,
      headers: {
        ...baseHeaders,
        'Content-Type':   contentType,
        'Content-Length': String(outputBuffer.length),
        'X-Cache-Status': 'MISS-STORED',
        'X-Cache-Source': 'TELEGRAM',
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
