import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { processImage, getMetadata, SIZES, ProcessedImage } from '@/lib/image-processing';
import { v4 as uuidv4 } from 'uuid';
import { UploadResponse, OptimizedSizes, OptimizedUrls } from '@/lib/types';
import path from 'path';

// 10MB limit is enforced by logic, but Next.js/Vercel might have their own limits.
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];

export async function POST(req: NextRequest) {
    console.log('--- Upload Request Started ---');
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            console.error('No file provided in form data');
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        console.log(`File received: ${file.name}, Size: ${file.size}, Type: ${file.type}`);

        if (!ALLOWED_TYPES.includes(file.type)) {
            console.error('Invalid file type:', file.type);
            return NextResponse.json({ error: 'Invalid file type. Only JPG and PNG are allowed.' }, { status: 400 });
        }

        if (file.size > MAX_FILE_SIZE) {
            console.error('File too large:', file.size);
            return NextResponse.json({ error: 'File too large. Max 10MB.' }, { status: 400 });
        }

        // Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        console.log('File converted to buffer');

        // 1. Get Metadata & Validate
        const metadata = await getMetadata(buffer);
        const id = uuidv4();
        const originalExt = path.extname(file.name).replace('.', '');
        const originalPath = `original/${id}.${originalExt}`;

        // 2. Upload Original to Supabase
        console.log(`Uploading original to: ${originalPath}`);
        const { error: uploadError } = await supabaseAdmin.storage
            .from('assets')
            .upload(originalPath, buffer, {
                contentType: file.type,
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


        // 3. Process & Upload WebP & AVIF Versions

        // Helper to process and upload a single variant
        const processAndUpload = async (sizeName: string, targetWidth: number, format: 'webp' | 'avif') => {
            const processed: ProcessedImage = await processImage(buffer, targetWidth, format);
            const fileName = `${format}/${sizeName}/${id}.${format}`;

            const { error: uploadError } = await supabaseAdmin.storage
                .from('assets')
                .upload(fileName, processed.buffer, {
                    contentType: `image/${format}`,
                    cacheControl: '31536000',
                    upsert: false,
                });

            if (uploadError) {
                console.error(`Upload Error ${sizeName} (${format}):`, uploadError);
                // We log but don't fail the whole request if optional AVIF fails? 
                // For consistent API, let's throw.
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

        // Generate tasks for both WebP and AVIF
        const allTasks = [];

        // WebP Tasks
        for (const [sizeName, targetWidth] of Object.entries(SIZES)) {
            allTasks.push(processAndUpload(sizeName, targetWidth, 'webp'));
        }
        // AVIF Tasks
        for (const [sizeName, targetWidth] of Object.entries(SIZES)) {
            allTasks.push(processAndUpload(sizeName, targetWidth, 'avif'));
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

        // 4. Insert into Database (Only storing WebP as primary for now based on schema, or we could update schema)
        // The user didn't ask to update schema explicitly for AVIF columns, so we rely on the pattern or just store WebP.
        // However, we return ALL to the client so they can validly see/use them.
        const { error: dbError } = await supabaseAdmin
            .from('images')
            .insert({
                id,
                original_name: file.name,
                original_ext: originalExt,
                mime_type: file.type,
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
            // Return AVIF data too
            avif: {
                format: 'avif',
                urls: avifUrls,
                sizes: avifSizes
            }
        };

        return NextResponse.json(response);

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
