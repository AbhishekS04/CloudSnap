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

    try {
      if (asset.is_chunked) {
        buffer = await downloadChunkedFromTelegram(asset.telegram_file_ids);
      } else {
        buffer = await downloadFromTelegram(asset.telegram_file_ids[0]);
      }
    } catch (tgErr: any) {
      // Telegram returns 400 when the file is >20MB and was uploaded as a single chunk.
      // This happens with assets uploaded before the 19MB chunk-size fix.
      // The asset must be deleted and re-uploaded to fix it.
      if (tgErr.message?.includes('400')) {
        console.error('[CDN] Telegram 400 — file too large for getFile API (>20MB). Asset must be re-uploaded:', id);
        return NextResponse.json(
          {
            error: 'This asset was uploaded before the chunking fix and cannot be served. Please delete it and re-upload.',
            code:  'TELEGRAM_FILE_TOO_LARGE',
          },
          { status: 422 },
        );
      }
      throw tgErr;
    }

    const mimeType     = asset.mime_type as string;
    const isImage      = mimeType.startsWith('image/');
    const isVideo      = mimeType.startsWith('video/');
    const safeFilename = encodeURIComponent(asset.original_name as string || `asset-${id}`);

    const baseHeaders: Record<string, string> = {
      'Content-Disposition':         `inline; filename="${safeFilename}"`,
      'Cache-Control':               'public, s-maxage=31536000, max-age=86400, immutable',
      'Access-Control-Allow-Origin': '*',
      'X-CloudSnap-Asset-Id':        id,
      'X-CloudSnap-Chunked':         String(asset.is_chunked),
    };

    // ── 3. Videos — pass through with Range request support ────────────────
    // Browsers REQUIRE Range responses to seek/play video.
    // Without 206 Partial Content support, <video> stalls on most browsers.
    if (isVideo) {
      const totalLength = buffer.length;
      const rangeHeader = req.headers.get('range');

      if (rangeHeader) {
        const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
        const start = match?.[1] ? parseInt(match[1], 10) : 0;
        const end   = match?.[2] ? parseInt(match[2], 10) : totalLength - 1;

        const chunkStart = Math.max(0, start);
        const chunkEnd   = Math.min(end, totalLength - 1);
        const chunkLen   = chunkEnd - chunkStart + 1;

        const chunk = buffer.subarray(chunkStart, chunkEnd + 1);

        return new NextResponse(new Uint8Array(chunk), {
          status: 206,
          headers: {
            ...baseHeaders,
            'Content-Type':   mimeType,
            'Content-Range':  `bytes ${chunkStart}-${chunkEnd}/${totalLength}`,
            'Content-Length': String(chunkLen),
            'Accept-Ranges':  'bytes',
          },
        });
      }

      // Full video (no Range header — first load)
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          ...baseHeaders,
          'Content-Type':   mimeType,
          'Content-Length': String(totalLength),
          'Accept-Ranges':  'bytes',
        },
      });
    }

    // ── 4. Images — optional sharp transform ──────────────────────────────
    let outputBuffer = buffer;
    let contentType  = mimeType;

    if (isImage && (requestedWidth || outputFormat)) {
      const fmt = outputFormat ?? 'webp';
      contentType = `image/${fmt}`;

      let pipeline = sharp(buffer);

      if (requestedWidth) {
        pipeline = pipeline.resize({
          width: requestedWidth,
          withoutEnlargement: true,
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

    // ── 5. Serve image ─────────────────────────────────────────────────────
    return new NextResponse(new Uint8Array(outputBuffer), {
      status: 200,
      headers: {
        ...baseHeaders,
        'Content-Type':   contentType,
        'Content-Length': String(outputBuffer.length),
        'Accept-Ranges':  'bytes',
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
