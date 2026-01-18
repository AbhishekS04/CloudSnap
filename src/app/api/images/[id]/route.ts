import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { SIZES } from '@/lib/image-processing';

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
    // In Next 15 params is async
) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
        }

        // 1. Get image details to know file extensions if needed, 
        // but strict naming convention makes it easier.
        const { data: image, error: fetchError } = await supabaseAdmin
            .from('images')
            .select('original_ext')
            .eq('id', id)
            .single();

        if (fetchError || !image) {
            return NextResponse.json({ error: 'Image not found' }, { status: 404 });
        }

        // 2. Delete files from Storage
        const pathsToDelete = [
            `original/${id}.${image.original_ext}`,
            ...Object.keys(SIZES).map(size => `webp/${size}/${id}.webp`)
        ];

        const { error: storageError } = await supabaseAdmin.storage
            .from('assets')
            .remove(pathsToDelete);

        if (storageError) {
            console.error('Storage Delete Error:', storageError);
            // Continue to delete DB record anyway? Maybe.
        }

        // 3. Delete DB record
        const { error: dbError } = await supabaseAdmin
            .from('images')
            .delete()
            .eq('id', id);

        if (dbError) {
            throw dbError;
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
