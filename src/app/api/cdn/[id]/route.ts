/**
 * /api/cdn/[id] — CloudSnap Public CDN Proxy
 *
 * Fetches assets from Telegram and serves them with:
 * - On-the-fly image resizing (?w=800)
 * - On-the-fly format conversion (?fmt=webp|avif|jpeg|png)
 * - On-the-fly quality control (?q=85)
 * - Long-term edge caching (1 year, immutable)
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
} from '@/lib/telegram';
import sharp from 'sharp';

// Supported output formats
const ALLOWED_FORMATS = ['webp', 'avif', 'jpeg', 'png'] as const;
type OutputFormat = typeof ALLOWED_FORMATS[number];

// ─────────────────────────────────────────────
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

    // ── 2. Fetch binary from Telegram ──────────────────────────────────────
    let buffer: Buffer;

    if (asset.is_chunked) {
      buffer = await downloadChunkedFromTelegram(asset.telegram_file_ids);
    } else {
      buffer = await downloadFromTelegram(asset.telegram_file_ids[0]);
    }

    // ── 3. Process image (if applicable) ──────────────────────────────────
    const isImage = (asset.mime_type as string).startsWith('image/');
    let outputBuffer = buffer;
    let contentType  = asset.mime_type as string;

    if (isImage && (requestedWidth || outputFormat)) {
      const fmt = outputFormat ?? 'webp';
      contentType = `image/${fmt}`;

      let pipeline = sharp(buffer);

      if (requestedWidth) {
        pipeline = pipeline.resize({
          width: requestedWidth,
          withoutEnlargement: true, // Never upscale
          fit: 'inside',
        });
      }

      switch (fmt) {
        case 'avif':
          pipeline = pipeline.avif({ quality: requestedQuality });
          break;
        case 'jpeg':
          pipeline = pipeline.jpeg({ quality: requestedQuality, mozjpeg: true });
          break;
        case 'png':
          pipeline = pipeline.png({ quality: requestedQuality });
          break;
        default:
          pipeline = pipeline.webp({ quality: requestedQuality });
      }

      outputBuffer = await pipeline.toBuffer();
    }

    // ── 4. Stream response with caching headers ────────────────────────────
    return new NextResponse(new Uint8Array(outputBuffer), {
      status: 200,
      headers: {
        'Content-Type':  contentType,
        'Content-Length': String(outputBuffer.length),

        // Edge CDN caches this for 1 year.
        // The URL includes the ID (which is UUID), so cache busting
        // is achieved by uploading a new asset (new UUID).
        'Cache-Control': 'public, s-maxage=31536000, max-age=86400, immutable',

        // Allow embedding anywhere (portfolio, external sites)
        'Access-Control-Allow-Origin': '*',

        // Useful for debugging cache hits on Vercel
        'X-CloudSnap-Asset-Id': id,
        'X-CloudSnap-Chunked':  String(asset.is_chunked),
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
