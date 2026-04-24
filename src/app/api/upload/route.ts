/**
 * /api/upload — CloudSnap Upload Handler
 *
 * Accepts images and videos via:
 *   - multipart/form-data (file field)
 *   - application/json    (URL field for remote fetch)
 *
 * Storage: ALL binaries go to Telegram. Supabase stores only metadata.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import busboy from 'busboy';
import { getMetadata } from '@/lib/image-processing';
import { smartUploadToTelegram } from '@/lib/telegram';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

import { requireAdmin } from '@/lib/auth';

// ─────────────────────────────────────────────
// Logging
// ─────────────────────────────────────────────

function logServer(msg: string) {
    try {
        const logPath = path.join(process.cwd(), 'server-debug.log');
        fs.appendFileSync(logPath, `${new Date().toISOString()} - ${msg}\n`);
    } catch (e) {
        console.error('Failed to write log:', e);
    }
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
        if (mimeType === 'image/jpeg') ext = 'jpg';
        else if (mimeType === 'image/png')  ext = 'png';
        else if (mimeType === 'image/webp') ext = 'webp';
        else if (mimeType === 'image/gif')  ext = 'gif';
        else if (mimeType === 'video/mp4')  ext = 'mp4';
        else if (mimeType === 'video/webm') ext = 'webm';
        else ext = 'bin';
    }
    ext = ext.replace(/^\./, '');
    return `${prefix}_${randomId}.${ext}`;
}

// ─────────────────────────────────────────────
// POST /api/upload
// ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
    logServer('--- Upload Request Started (Telegram mode) ---');
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

            logServer(`Fetching file from URL: ${url}`);
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

            logServer(`URL fetch: ${fileName}, ${mimeType}, ${buffer.length}B`);

        // ── B. Handle multipart/form-data (direct file upload) ────────────
        } else if (contentType.includes('multipart/form-data')) {
            logServer('Starting busboy parse...');

            let fullBodyBuffer: Buffer;
            try {
                const ab = await req.arrayBuffer();
                fullBodyBuffer = Buffer.from(ab);
                logServer(`Body buffer size: ${fullBodyBuffer.length}B`);
            } catch (e: any) {
                logServer(`Failed to read body: ${e.message}`);
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
                logServer(`File parsed: ${fileName}, ${mimeType}, ${buffer.length}B`);
            } catch (e: any) {
                logServer(`Busboy error: ${e.message}`);
                return NextResponse.json({ error: `Failed to parse form: ${e.message}` }, { status: 400 });
            }
        } else {
            return NextResponse.json({ error: `Unsupported Content-Type: ${contentType}` }, { status: 400 });
        }

        // ── Validate mime type ─────────────────────────────────────────────
        const ALLOWED_IMAGE = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
        const ALLOWED_VIDEO = ['video/mp4', 'video/webm', 'video/quicktime'];
        if (!ALLOWED_IMAGE.includes(mimeType) && !ALLOWED_VIDEO.includes(mimeType)) {
            return NextResponse.json(
                { error: `Unsupported file type: ${mimeType}` },
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
        logServer(`Uploading to Telegram: ${fileName} (${(buffer.length / 1024 / 1024).toFixed(2)}MB)`);

        const telegramResult = await smartUploadToTelegram(buffer, fileName, mimeType);

        logServer(`Telegram upload complete. Chunked=${telegramResult.isChunked}, Chunks=${telegramResult.chunkCount}`);

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
            logServer(`DB insert error: ${dbError.message}`);
            throw new Error(`Failed to save metadata: ${dbError.message}`);
        }

        logServer(`Asset saved: id=${id}`);

        // ── Return response ────────────────────────────────────────────────
        const cdnUrl = `/api/cdn/${id}`;

        return NextResponse.json({
            id,
            cdnUrl,
            // Convenience URLs matching Cloudinary's API style
            urls: {
                original: cdnUrl,
                thumb:    `${cdnUrl}?w=200&fmt=webp`,
                sm:       `${cdnUrl}?w=600&fmt=webp`,
                md:       `${cdnUrl}?w=1200&fmt=webp`,
                lg:       `${cdnUrl}?w=2000&fmt=webp`,
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
        logServer(`Fatal: ${error.message}`);
        
        if (error.message === 'Unauthorized: Admin access required') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 },
        );
    }
}
