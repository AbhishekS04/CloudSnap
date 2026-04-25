/**
 * /api/upload — CloudSnap Upload Handler
 *
 * Accepts images and videos via:
 *   - multipart/form-data (file field)
 *   - application/json    (URL field for remote fetch)
 *
 * Storage: ALL binaries go to Telegram. Supabase stores only metadata.
 */

// ─────────────────────────────────────────────
// Route segment config — MUST be here to lift Next.js's default 10MB body cap.
// Without this, large video uploads are truncated before reaching this handler.
// ─────────────────────────────────────────────
export const maxDuration = 300; // 5 minutes (for slow connections / big files)

// Raise the body size limit for this specific route handler.
// We handle the raw body ourselves via busboy, so we don't want Next.js to buffer it.
export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────
// File size limits (server-side enforcement)
// ─────────────────────────────────────────────
const MAX_IMAGE_SIZE = 50  * 1024 * 1024; // 50 MB
const MAX_VIDEO_SIZE = 200 * 1024 * 1024; // 200 MB

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import busboy from 'busboy';
import { getMetadata } from '@/lib/image-processing';
import { smartUploadToTelegram } from '@/lib/telegram';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

import { requireAdmin } from '@/lib/auth';

// ─────────────────────────────────────────────
// Logging — structured JSON for Vercel log drain
// ─────────────────────────────────────────────

function log(level: 'info' | 'warn' | 'error', msg: string, meta?: Record<string, unknown>) {
    console.log(JSON.stringify({ level, msg, service: 'upload', ts: new Date().toISOString(), ...meta }));
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function generateCleanName(mimeType: string, extension?: string): string {
    const isVideo = mimeType.startsWith('video/');
    const prefix  = isVideo ? 'VID' : 'IMG';
    const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();

    let ext = extension || '';
    if (!ext) {
        // Derive extension from mime subtype
        const sub = mimeType.split('/')[1]?.split(';')[0]?.toLowerCase() || 'bin';
        const mimeToExt: Record<string, string> = {
            jpeg: 'jpg', jpg: 'jpg', png: 'png', webp: 'webp', gif: 'gif',
            avif: 'avif', heif: 'heic', heic: 'heic', tiff: 'tiff', bmp: 'bmp',
            svg: 'svg', 'svg+xml': 'svg', ico: 'ico',
            mp4: 'mp4', webm: 'webm', quicktime: 'mov', 'x-msvideo': 'avi',
            'x-ms-wmv': 'wmv', 'x-matroska': 'mkv', '3gpp': '3gp',
            'x-flv': 'flv', 'x-m4v': 'm4v', mpeg: 'mpeg', ogg: 'ogv',
        };
        ext = mimeToExt[sub] || sub;
    }
    ext = ext.replace(/^\./, '');
    return `${prefix}_${randomId}.${ext}`;
}

// ─────────────────────────────────────────────
// POST /api/upload
// ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
    log('info', 'Upload request started');
    try {
        await requireAdmin();


        let buffer: Buffer   = Buffer.alloc(0);
        let fileName: string = '';
        let mimeType: string = '';
        let folderId: string = 'null';

        const contentType = req.headers.get('content-type') || '';
        const { searchParams } = new URL(req.url);
        const queryFolderId = searchParams.get('folderId');

        // ── A. Handle JSON (URL fetch) ─────────────────────────────────────
        if (contentType.includes('application/json')) {
            const body = await req.json();
            const { url, folderId: fId } = body;
            folderId = fId || queryFolderId || 'null';

            if (!url) {
                return NextResponse.json({ error: 'URL is required' }, { status: 400 });
            }

            log('info', 'Fetching file from URL', { url });
            const fetchRes = await fetch(url);
            if (!fetchRes.ok) {
                return NextResponse.json(
                    { error: `Failed to fetch from URL: ${fetchRes.statusText}` },
                    { status: 400 },
                );
            }

            const arrayBuffer = await fetchRes.arrayBuffer();
            buffer   = Buffer.from(arrayBuffer);
            mimeType = fetchRes.headers.get('content-type') || 'application/octet-stream';
            const urlPath = new URL(url).pathname;
            fileName = path.basename(urlPath) || `download-${Date.now()}`;
            if (!path.extname(fileName)) {
                fileName = `${fileName}.${mimeType.split('/')[1] || 'bin'}`;
            }

            log('info', 'URL fetch complete', { fileName, mimeType, bytes: buffer.length });

        // ── B. Handle multipart/form-data (direct file upload) ────────────
        } else if (contentType.includes('multipart/form-data')) {
            log('info', 'Starting busboy parse');

            let fullBodyBuffer: Buffer;
            try {
                const ab = await req.arrayBuffer();
                fullBodyBuffer = Buffer.from(ab);
                log('info', 'Body buffer received', { bytes: fullBodyBuffer.length });
            } catch (e: any) {
                log('error', 'Failed to read body', { error: e.message });
                return NextResponse.json({ error: `Failed to read body: ${e.message}` }, { status: 500 });
            }

            const bb = busboy({ headers: { 'content-type': contentType } });

            const p = new Promise<{
                buffer: Buffer;
                fileName: string;
                mimeType: string;
                folderId: string;
            }>((resolve, reject) => {
                let fileBuffer: Buffer | null = null;
                let fileInfoName = '';
                let fileInfoMime = '';
                let formFolderId = 'null';

                bb.on('file', (name, file, info) => {
                    if (name === 'file') {
                        const chunks: Buffer[] = [];
                        file.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
                        file.on('close', () => {
                            fileBuffer    = Buffer.concat(chunks);
                            fileInfoName  = info.filename;
                            fileInfoMime  = info.mimeType;
                        });
                    } else {
                        file.resume();
                    }
                });

                bb.on('field', (name, val) => {
                    if (name === 'folderId') formFolderId = val;
                });

                bb.on('close', () => {
                    if (!fileBuffer) {
                        reject(new Error('No file provided'));
                    } else {
                        resolve({ buffer: fileBuffer, fileName: fileInfoName, mimeType: fileInfoMime, folderId: formFolderId });
                    }
                });

                bb.on('error', reject);
            });

            bb.end(fullBodyBuffer);

            try {
                const result = await p;
                buffer   = result.buffer;
                mimeType = result.mimeType;
                folderId = (result.folderId && result.folderId !== 'null')
                    ? result.folderId
                    : (queryFolderId || 'null');
                const originalExt = path.extname(result.fileName);
                fileName = generateCleanName(mimeType, originalExt);
                log('info', 'File parsed', { fileName, mimeType, bytes: buffer.length });
            } catch (e: any) {
                log('error', 'Busboy parse error', { error: e.message });
                return NextResponse.json({ error: `Failed to parse form: ${e.message}` }, { status: 400 });
            }
        } else {
            return NextResponse.json({ error: `Unsupported Content-Type: ${contentType}` }, { status: 400 });
        }

        // ── Server-side file size enforcement ─────────────────────────────────
        const isVideoMime = mimeType.startsWith('video/');
        const sizeLimit   = isVideoMime ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
        const sizeLabelMB = isVideoMime ? '200MB' : '50MB';

        if (buffer.length > sizeLimit) {
            const actualMB = (buffer.length / 1024 / 1024).toFixed(1);
            log('warn', 'File too large', { actualMB, limit: sizeLabelMB });
            return NextResponse.json(
                { error: `File too large (${actualMB} MB). Maximum allowed: ${sizeLabelMB} for ${isVideoMime ? 'videos' : 'images'}.` },
                { status: 413 },
            );
        }

        // ── Validate & normalize mime type ─────────────────────────────────────
        // Accept ANY image/* or video/* mime type.
        // Browsers/OS sometimes report blank or wrong mime types — fall back to extension.
        if (!mimeType || mimeType === 'application/octet-stream') {
            const ext = path.extname(fileName).toLowerCase().replace('.', '');
            const extMimeMap: Record<string, string> = {
                jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
                webp: 'image/webp', gif: 'image/gif', avif: 'image/avif',
                heic: 'image/heic', heif: 'image/heif', bmp: 'image/bmp',
                tiff: 'image/tiff', tif: 'image/tiff', svg: 'image/svg+xml',
                ico: 'image/ico',
                mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
                avi: 'video/x-msvideo', wmv: 'video/x-ms-wmv',
                mkv: 'video/x-matroska', m4v: 'video/x-m4v',
                '3gp': 'video/3gpp', flv: 'video/x-flv',
                mpeg: 'video/mpeg', mpg: 'video/mpeg', ogv: 'video/ogg',
            };
            mimeType = extMimeMap[ext] || mimeType || 'application/octet-stream';
        }

        if (!mimeType.startsWith('image/') && !mimeType.startsWith('video/')) {
            return NextResponse.json(
                { error: `Unsupported file type: ${mimeType}. Only image and video files are accepted.` },
                { status: 400 },
            );
        }

        // ── Get image dimensions if applicable ─────────────────────────────
        let width  = 0;
        let height = 0;
        let duration: number | null = null;

        if (mimeType.startsWith('image/')) {
            try {
                const meta = await getMetadata(buffer);
                width  = meta.width;
                height = meta.height;
            } catch (_) {
                // Non-fatal — dimensions just won't be stored
            }
        }

        // ── Upload to Telegram ─────────────────────────────────────────────
        log('info', 'Uploading to Telegram', { fileName, sizeMB: (buffer.length / 1024 / 1024).toFixed(2) });

        const telegramResult = await smartUploadToTelegram(buffer, fileName, mimeType);

        log('info', 'Telegram upload complete', { isChunked: telegramResult.isChunked, chunkCount: telegramResult.chunkCount });

        // ── Save metadata to Supabase ──────────────────────────────────────
        const id = uuidv4();
        const chatId = process.env.TELEGRAM_STORAGE_CHAT_ID!;

        const { error: dbError } = await supabaseAdmin
            .from('assets')
            .insert({
                id,
                original_name:      fileName,
                mime_type:          mimeType,
                width:              width  || null,
                height:             height || null,
                duration:           duration,
                original_size:      buffer.length,
                telegram_file_ids:  telegramResult.fileIds,
                telegram_chat_id:   chatId,
                is_chunked:         telegramResult.isChunked,
                chunk_count:        telegramResult.chunkCount,
                folder_id:          folderId !== 'null' ? folderId : null,
                created_at:         new Date().toISOString(),
            });

        if (dbError) {
            log('error', 'DB insert failed', { error: dbError.message });
            throw new Error(`Failed to save metadata: ${dbError.message}`);
        }

        log('info', 'Asset saved to Supabase', { id });

        // ── Return response ────────────────────────────────────────────────
        const cdnUrl = `/api/cdn/${id}`;
        const isVideoAsset = mimeType.startsWith('video/');

        return NextResponse.json({
            id,
            cdnUrl,
            // Videos: plain URL (no image transforms). Images: optimized WebP variants.
            urls: {
                original: cdnUrl,
                thumb: isVideoAsset ? cdnUrl : `${cdnUrl}?w=200&fmt=webp`,
                sm:    isVideoAsset ? cdnUrl : `${cdnUrl}?w=600&fmt=webp`,
                md:    isVideoAsset ? cdnUrl : `${cdnUrl}?w=1200&fmt=webp`,
                lg:    isVideoAsset ? cdnUrl : `${cdnUrl}?w=2000&fmt=webp`,
            },
            meta: {
                originalName: fileName,
                mimeType,
                width,
                height,
                duration,
                originalSize: buffer.length,
                isChunked:    telegramResult.isChunked,
                chunkCount:   telegramResult.chunkCount,
            },
        });


    } catch (error: any) {
        console.error('Upload API Error:', error);
        log('error', 'Upload handler fatal error', { error: error.message });
        
        if (error.message === 'Unauthorized: Admin access required') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 },
        );
    }
}
