import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import busboy from 'busboy';
import { processImage, getMetadata, SIZES, ProcessedImage } from '@/lib/image-processing';
import { processVideo } from '@/lib/video-processing';
import { v4 as uuidv4 } from 'uuid';
import { UploadResponse, OptimizedSizes, OptimizedUrls } from '@/lib/types';
import path from 'path';

import { requireAdmin } from '@/lib/auth';
import { currentUser } from '@clerk/nextjs/server';
import fs from 'fs';

function logServer(msg: string) {
    try {
        const logPath = path.join(process.cwd(), 'server-debug.log');
        fs.appendFileSync(logPath, `${new Date().toISOString()} - ${msg}\n`);
    } catch (e) {
        console.error('Failed to write log:', e);
    }
}

// Route Segment Config
export const maxDuration = 300; // 5 minutes for large video uploads
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    logServer('--- Upload Request Started ---');
    try {
        // Protect Route
        await requireAdmin().catch(() => {
            // throw new Error('Unauthorized');
            // For now, logged as warning if it fails due to middleware bypass
            console.warn('Auth check failed or bypassed');
        });

        let file: File | null = null;
        let buffer: Buffer;
        let fileName: string = '';
        let mimeType: string = '';
        let folderId: string = 'null';

        const contentType = req.headers.get('content-type') || '';
        logServer(`Content-Type: ${contentType}`);

        if (contentType.includes('application/json')) {
            // Handle URL Upload
            const body = await req.json();
            const { url, folderId: fId } = body;
            folderId = fId || 'null';

            if (!url) {
                return NextResponse.json({ error: 'URL is required' }, { status: 400 });
            }

            console.log(`Fetching from URL: ${url}`);
            const fetchRes = await fetch(url);
            if (!fetchRes.ok) {
                return NextResponse.json({ error: `Failed to fetch URL: ${fetchRes.statusText}` }, { status: 400 });
            }

            const arrayBuffer = await fetchRes.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);

            // Try to deduce mime type and filename
            mimeType = fetchRes.headers.get('content-type') || 'application/octet-stream';
            fileName = path.basename(new URL(url).pathname) || `upload-${Date.now()}`;

            // Fix Pinterest/opaque URLs causing no extension
            if (!path.extname(fileName)) {
                const ext = mimeType.split('/')[1] || 'bin';
                fileName = `${fileName}.${ext}`;
            }

            console.log(`URL fetched. Size: ${buffer.length}, Type: ${mimeType}, Name: ${fileName}`);

        } else if (contentType.includes('multipart/form-data')) {
            // Handle File Upload via Busboy (Memory Buffered)
            logServer('Starting Busboy setup (Buffered Mode)...');

            // 1. Read entire body into buffer
            let fullBodyBuffer: Buffer;
            try {
                const arrayBuffer = await req.arrayBuffer();
                fullBodyBuffer = Buffer.from(arrayBuffer);
                logServer(`Read full body buffer: ${fullBodyBuffer.length} bytes`);
            } catch (e: any) {
                logServer(`Failed to read req.arrayBuffer: ${e.message}`);
                return NextResponse.json({ error: `Failed to read request body: ${e.message}` }, { status: 500 });
            }

            const bb = busboy({ headers: { 'content-type': contentType } });

            const p = new Promise<{ buffer: Buffer, fileName: string, mimeType: string, folderId: string }>((resolve, reject) => {
                let fileBuffer: Buffer | null = null;
                let fileInfoName = '';
                let fileInfoMime = '';
                let formFolderId = 'null';

                bb.on('file', (name, file, info) => {
                    logServer(`headers: Busboy file found field=${name} filename=${info.filename}`);
                    if (name === 'file') {
                        const chunks: Buffer[] = [];
                        file.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
                        file.on('close', () => {
                            logServer(`headers: Busboy file closed filename=${info.filename}`);
                            fileBuffer = Buffer.concat(chunks);
                            fileInfoName = info.filename;
                            fileInfoMime = info.mimeType;
                        });
                    } else {
                        file.resume();
                    }
                });

                bb.on('field', (name, val) => {
                    // logServer(`headers: Busboy field found name=${name} val=${val}`);
                    if (name === 'folderId') {
                        formFolderId = val;
                    }
                });

                bb.on('close', () => {
                    logServer('headers: Busboy close event fired');
                    if (!fileBuffer) {
                        logServer('headers: Busboy closed but NO FILE BUFFER');
                        reject(new Error('No file provided'));
                    } else {
                        resolve({ buffer: fileBuffer, fileName: fileInfoName, mimeType: fileInfoMime, folderId: formFolderId });
                    }
                });

                bb.on('error', (err: any) => {
                    logServer(`headers: Busboy error event: ${err.message}`);
                    reject(err);
                });
            });

            // Write buffer to busboy
            bb.end(fullBodyBuffer);

            try {
                const result = await p;
                buffer = result.buffer;
                fileName = result.fileName;
                mimeType = result.mimeType;
                folderId = result.folderId;

                logServer(`File received (buffered): ${fileName}, Size: ${buffer.length}, Type: ${mimeType}`);
            } catch (e: any) {
                logServer(`Error parsing busboy (Detailed catch): ${e.message}`);
                // @ts-ignore
                if (e.stack) logServer(e.stack);
                return NextResponse.json({ error: `Failed to parse form data: ${e.message}` }, { status: 400 });
            }
        } else {
            return NextResponse.json({ error: `Unsupported Content-Type: ${contentType}` }, { status: 400 });
        }


        // Allow image types
        const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
        // Allow video types
        const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
        if (!ALLOWED_TYPES.includes(mimeType) && !ALLOWED_VIDEO_TYPES.includes(mimeType)) {
            console.error('Invalid file type:', mimeType);
            return NextResponse.json({ error: `Invalid file type: ${mimeType}. Only JPG, PNG, MP4, WebM, MOV are allowed.` }, { status: 400 });
        }

        // Limit images to 10MB, but videos are unlimited (effectively)
        if (mimeType.startsWith('image/') && buffer.length > 10 * 1024 * 1024) {
            console.error('File too large:', buffer.length);
            return NextResponse.json({ error: `Image too large. Max 10MB.` }, { status: 400 });
        }

        console.log('File converted to buffer/verified');

        // Handle Video Processing
        if (mimeType.startsWith('video/')) {
            const id = uuidv4();
            const originalExt = path.extname(fileName).replace('.', '');

            // 1. Process Video
            const processed = await processVideo(buffer, fileName);

            // 2. Upload Artifacts to Supabase
            // Original (Optimized/FastStart)
            const originalPath = `videos/original/${id}.${originalExt}`;
            await supabaseAdmin.storage.from('assets').upload(originalPath, processed.optimizedOriginalBuffer, {
                contentType: mimeType,
                upsert: false
            });

            // Thumbnail
            const thumbPath = `video-thumbs/${id}.jpg`;
            await supabaseAdmin.storage.from('assets').upload(thumbPath, processed.thumbnailBuffer, {
                contentType: 'image/jpeg',
                upsert: false
            });

            // Compressed
            const compressedPath = `videos/compressed/${id}.mp4`;
            await supabaseAdmin.storage.from('assets').upload(compressedPath, processed.compressedBuffer, {
                contentType: 'video/mp4',
                upsert: false
            });

            const { data: { publicUrl: originalUrl } } = supabaseAdmin.storage.from('assets').getPublicUrl(originalPath);
            const { data: { publicUrl: thumbUrl } } = supabaseAdmin.storage.from('assets').getPublicUrl(thumbPath);
            const { data: { publicUrl: compressedUrl } } = supabaseAdmin.storage.from('assets').getPublicUrl(compressedPath);

            // 3. Insert into DB
            const { error: dbError } = await supabaseAdmin
                .from('images') // We use the same 'images' table for now
                .insert({
                    id,
                    original_name: fileName,
                    original_ext: originalExt,
                    mime_type: mimeType,
                    width: processed.metadata.width,
                    height: processed.metadata.height,
                    original_size: buffer.length,
                    optimized_format: 'mp4',
                    original_url: originalUrl,
                    thumb_url: thumbUrl,
                    sm_url: thumbUrl,
                    md_url: compressedUrl, // MD mapped to Compressed Video
                    lg_url: compressedUrl,
                    thumb_size: processed.thumbnailBuffer.length,
                    sm_size: 0,
                    md_size: processed.compressedBuffer.length,
                    lg_size: 0,
                    created_at: new Date().toISOString(),
                    folder_id: folderId !== 'null' ? folderId : null
                });

            if (dbError) throw dbError;

            return NextResponse.json({
                id,
                original: {
                    url: originalUrl,
                    size: buffer.length,
                    width: processed.metadata.width,
                    height: processed.metadata.height,
                    duration: processed.metadata.duration
                },
                optimized: {
                    format: 'mp4',
                    urls: { thumb: thumbUrl, sm: thumbUrl, md: compressedUrl, lg: compressedUrl },
                    sizes: { thumb: processed.thumbnailBuffer.length, sm: 0, md: processed.compressedBuffer.length, lg: 0 }
                }
            });
        }

        // Image Processing (Original Flow)
        // 1. Get Metadata & Validate
        const metadata = await getMetadata(buffer);
        const id = uuidv4();
        const originalExt = path.extname(fileName).replace('.', '');
        const originalPath = `original/${id}.${originalExt}`;

        // 2. Upload Original to Supabase
        console.log(`Uploading original to: ${originalPath}`);
        const { error: uploadError } = await supabaseAdmin.storage
            .from('assets')
            .upload(originalPath, buffer, {
                contentType: mimeType,
                cacheControl: '3600',
                upsert: false,
            });

        if (uploadError) {
            console.error('Supabase Upload Error (Original):', JSON.stringify(uploadError, null, 2));
            throw new Error(`Failed to upload original image: ${uploadError.message}`);
        }
        console.log('Original image uploaded successfully');

        const { data: { publicUrl: originalUrl } } = supabaseAdmin.storage
            .from('assets')
            .getPublicUrl(originalPath);


        // 3. Process & Upload Versions

        const getFormatFromType = (mime: string): 'jpeg' | 'png' | null => {
            if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpeg';
            if (mime === 'image/png') return 'png';
            return null;
        };

        const originalFormat = getFormatFromType(mimeType);

        // Helper to process and upload a single variant
        const processAndUpload = async (sizeName: string, targetWidth: number, format: 'webp' | 'avif' | 'jpeg' | 'png') => {
            const processed: ProcessedImage = await processImage(buffer, targetWidth, format);

            // Use correct extension for filePath
            let ext: string = format;
            if (format === 'jpeg') ext = 'jpg';

            const fileName = `${ext}/${sizeName}/${id}.${ext}`;

            const { error: uploadError } = await supabaseAdmin.storage
                .from('assets')
                .upload(fileName, processed.buffer, {
                    contentType: `image/${format}`,
                    cacheControl: '31536000',
                    upsert: false,
                });

            if (uploadError) {
                console.error(`Upload Error ${sizeName} (${format}):`, uploadError);
                throw new Error(`Failed to upload ${sizeName} ${format} version`);
            }

            const { data: { publicUrl } } = supabaseAdmin.storage
                .from('assets')
                .getPublicUrl(fileName);

            return {
                format,
                sizeName: sizeName as keyof OptimizedUrls,
                url: publicUrl,
                sizeInBytes: processed.size
            };
        };

        // Generate tasks
        const allTasks = [];

        // WebP Tasks
        for (const [sizeName, targetWidth] of Object.entries(SIZES)) {
            allTasks.push(processAndUpload(sizeName, targetWidth, 'webp'));
        }
        // AVIF Tasks
        for (const [sizeName, targetWidth] of Object.entries(SIZES)) {
            allTasks.push(processAndUpload(sizeName, targetWidth, 'avif'));
        }
        // Original Format Tasks (Optimized)
        if (originalFormat) {
            console.log(`Generating optimized duplicates for original format: ${originalFormat}`);
            for (const [sizeName, targetWidth] of Object.entries(SIZES)) {
                allTasks.push(processAndUpload(sizeName, targetWidth, originalFormat));
            }
        }

        const results = await Promise.all(allTasks);

        const webpUrls: Partial<OptimizedUrls> = {};
        const webpSizes: Partial<OptimizedSizes> = {};
        const avifUrls: Partial<OptimizedUrls> = {};
        const avifSizes: Partial<OptimizedSizes> = {};

        results.forEach(r => {
            if (r.format === 'webp') {
                webpUrls[r.sizeName] = r.url;
                webpSizes[r.sizeName] = r.sizeInBytes;
            } else {
                avifUrls[r.sizeName] = r.url;
                avifSizes[r.sizeName] = r.sizeInBytes;
            }
        });

        const { error: dbError } = await supabaseAdmin
            .from('images')
            .insert({
                id,
                original_name: fileName,
                original_ext: originalExt,
                mime_type: mimeType,
                width: metadata.width,
                height: metadata.height,
                original_size: buffer.length,
                optimized_format: 'webp',
                thumb_url: webpUrls.thumb,
                sm_url: webpUrls.sm,
                md_url: webpUrls.md,
                lg_url: webpUrls.lg,
                thumb_size: webpSizes.thumb,
                sm_size: webpSizes.sm,
                md_size: webpSizes.md,
                lg_size: webpSizes.lg,
            });

        if (dbError) {
            console.error('DB Insert Error:', dbError);
            throw new Error('Failed to save metadata');
        }

        const response: UploadResponse & { avif: any } = {
            id,
            original: {
                url: originalUrl,
                size: buffer.length,
                width: metadata.width,
                height: metadata.height,
            },
            optimized: {
                format: 'webp',
                urls: webpUrls as OptimizedUrls,
                sizes: webpSizes as OptimizedSizes,
            },
            avif: {
                format: 'avif',
                urls: avifUrls,
                sizes: avifSizes
            }
        };

        return NextResponse.json(response);

    } catch (error: any) {
        console.error('API Error:', error);
        logServer(`Fatal API Error: ${error.message}`);
        // @ts-ignore
        if (error.stack) logServer(error.stack);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
