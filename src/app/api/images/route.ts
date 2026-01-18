import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic'; // Ensure no caching for this route

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const limit = searchParams.get('limit');
        const folder_id = searchParams.get('folder_id'); // New param

        let query = supabaseAdmin
            .from('images')
            .select('*')
            .order('created_at', { ascending: false });

        if (limit) {
            query = query.limit(parseInt(limit));
        }

        if (folder_id && folder_id !== 'null') {
            query = query.eq('folder_id', folder_id);
        } else if (folder_id === 'null') {
            query = query.is('folder_id', null);
        }

        const { data, error } = await query;

        if (error) {
            throw error;
        }

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
        }

        // 1. Get Image Metadata to know what files to delete
        const { data: image, error: fetchError } = await supabaseAdmin
            .from('images')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !image) {
            // Already deleted?
            return NextResponse.json({ success: true });
        }

        // 2. Construct file paths to delete
        const pathsToDelete: string[] = [];
        const SIZES = ['thumb', 'sm', 'md', 'lg'];

        // Original raw
        pathsToDelete.push(`original/${image.id}.${image.original_ext}`);

        // Variants
        SIZES.forEach(size => {
            pathsToDelete.push(`webp/${size}/${image.id}.webp`);
            pathsToDelete.push(`avif/${size}/${image.id}.avif`);

            // Optimized original format
            let optAppExt = (image.original_ext || 'jpg').toLowerCase();
            if (optAppExt === 'jpeg') optAppExt = 'jpg';

            if (['jpg', 'png'].includes(optAppExt)) {
                pathsToDelete.push(`${optAppExt}/${size}/${image.id}.${optAppExt}`);
            }
        });

        // 3. Delete from Storage
        // We attempt to delete all potential paths. Supabase won't error if some don't exist (usually).
        const { error: storageError } = await supabaseAdmin.storage
            .from('assets')
            .remove(pathsToDelete);

        if (storageError) {
            console.error("Storage delete partial error:", storageError);
        }

        // 4. Delete from DB
        const { error: dbError } = await supabaseAdmin
            .from('images')
            .delete()
            .eq('id', id);

        if (dbError) throw dbError;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Delete error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
