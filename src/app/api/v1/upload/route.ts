/**
 * /api/v1/upload — CloudSnap Programmatic Upload API
 * 
 * Supports:
 * - Authorization: Bearer <API_KEY>
 * - x-api-key: <API_KEY>
 * 
 * Payload: multipart/form-data with 'file' field.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireApiKey } from '@/lib/api-auth';
import { smartUploadToTelegram } from '@/lib/telegram';
import { getMetadata } from '@/lib/image-processing';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import busboy from 'busboy';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const MAX_IMAGE_SIZE = 50 * 1024 * 1024;
const MAX_VIDEO_SIZE = 200 * 1024 * 1024;

function generateCleanName(mimeType: string, originalName: string): string {
    const ext = path.extname(originalName).toLowerCase() || '.bin';
    const isVideo = mimeType.startsWith('video/');
    const prefix = isVideo ? 'VID' : 'IMG';
    const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}_${randomId}${ext}`;
}

export async function POST(req: NextRequest) {
    try {
        // 1. Authenticate via API Key
        const keyData = await requireApiKey(req);
        const origin = req.nextUrl.origin;

        // 2. Parse Multipart Form
        const contentType = req.headers.get('content-type') || '';
        if (!contentType.includes('multipart/form-data')) {
            return NextResponse.json({ error: 'Content-Type must be multipart/form-data' }, { status: 400 });
        }

        const ab = await req.arrayBuffer();
        const fullBodyBuffer = Buffer.from(ab);
        const bb = busboy({ headers: { 'content-type': contentType } });

        const p = new Promise<{
            buffer: Buffer;
            fileName: string;
            mimeType: string;
            folderId: string | null;
        }>((resolve, reject) => {
            let fileBuffer: Buffer | null = null;
            let fileInfoName = '';
            let fileInfoMime = '';
            let folderId: string | null = null;

            bb.on('file', (name, file, info) => {
                if (name === 'file') {
                    const chunks: Buffer[] = [];
                    file.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
                    file.on('close', () => {
                        fileBuffer = Buffer.concat(chunks);
                        fileInfoName = info.filename;
                        fileInfoMime = info.mimeType;
                    });
                } else {
                    file.resume();
                }
            });

            bb.on('field', (name, val) => {
                if (name === 'folder_id') folderId = val;
            });

            bb.on('close', () => {
                if (!fileBuffer) reject(new Error("No file uploaded in 'file' field"));
                else resolve({ buffer: fileBuffer, fileName: fileInfoName, mimeType: fileInfoMime, folderId });
            });

            bb.on('error', reject);
        });

        bb.end(fullBodyBuffer);
        const { buffer, fileName: originalName, mimeType: rawMime, folderId } = await p;

        // 3. Validate Size & Type
        const isVideo = rawMime.startsWith('video/');
        const limit = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
        if (buffer.length > limit) {
            return NextResponse.json({ error: `File too large. Max is ${limit / 1024 / 1024}MB` }, { status: 413 });
        }

        const fileName = generateCleanName(rawMime, originalName);

        // 4. Metadata
        let width = null;
        let height = null;
        if (rawMime.startsWith('image/')) {
            try {
                const meta = await getMetadata(buffer);
                width = meta.width;
                height = meta.height;
            } catch (_) {}
        }

        // 5. Telegram Upload
        const tgRes = await smartUploadToTelegram(buffer, fileName, rawMime);

        // 6. Supabase Index
        const id = uuidv4();
        const { error: dbError } = await supabaseAdmin.from('assets').insert({
            id,
            original_name: fileName,
            mime_type: rawMime,
            width,
            height,
            original_size: buffer.length,
            telegram_file_ids: tgRes.fileIds,
            telegram_chat_id: process.env.TELEGRAM_STORAGE_CHAT_ID,
            is_chunked: tgRes.isChunked,
            chunk_count: tgRes.chunkCount,
            folder_id: folderId,
            created_at: new Date().toISOString(),
        });

        if (dbError) throw dbError;

        // 7. Response
        const shareUrl = `${origin}/share/${id}`;
        const cdnUrl = `${origin}/api/cdn/${id}`;

        return NextResponse.json({
            success: true,
            asset: {
                id,
                name: fileName,
                size: buffer.length,
                mime_type: rawMime,
                links: {
                    share: shareUrl,
                    cdn: cdnUrl,
                    download: `${cdnUrl}?dl=1`,
                    thumbnail: isVideo ? cdnUrl : `${cdnUrl}?w=300&fmt=webp`
                }
            }
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: error.message?.includes('Unauthorized') ? 401 : 500 });
    }
}
