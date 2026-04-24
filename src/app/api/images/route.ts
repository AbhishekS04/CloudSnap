import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic'; // Ensure no caching for this route

export async function GET(req: Request) {
    try {
        await requireAdmin();
        const { searchParams } = new URL(req.url);
        const limit = searchParams.get('limit');
        const folder_id = searchParams.get('folder_id'); // New param

        let query = supabaseAdmin
            .from('assets')
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

        // Map the asset records to match the expected legacy ImageRecord structure
        // so the frontend Gallery components still work without modification.
        const mappedData = data.map((asset: any) => ({
            ...asset,
            // Inject fake extensions for components that expect it (mostly videos vs images)
            original_ext: asset.original_name.split('.').pop() || 'jpg',
            // Construct CDN URLs
            original_url: `/api/cdn/${asset.id}`,
            thumb_url: `/api/cdn/${asset.id}?w=200&fmt=webp`,
            sm_url: `/api/cdn/${asset.id}?w=600&fmt=webp`,
            md_url: `/api/cdn/${asset.id}?w=1200&fmt=webp`,
            lg_url: `/api/cdn/${asset.id}?w=2000&fmt=webp`,
        }));

        return NextResponse.json(mappedData);
    } catch (error: any) {
        if (error.message === 'Unauthorized: Admin access required') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        await requireAdmin();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
        }

        // 1. Get Asset Metadata to know what files to delete (from Telegram if possible, though currently we only track in DB)
        const { data: image, error: fetchError } = await supabaseAdmin
            .from('assets')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !image) {
            // Already deleted?
            return NextResponse.json({ success: true });
        }

        // Note: Actual Telegram deletion is complicated because bots cannot delete files in channels after a period of time.
        // For a full CDN, we just delete the database index, "orphaning" the file in Telegram.
        // If you need strict deletion, you'd call the Telegram `deleteMessage` API using `image.telegram_chat_id` and `image.telegram_file_ids`.

        // 4. Delete from DB
        const { error: dbError } = await supabaseAdmin
            .from('assets')
            .delete()
            .eq('id', id);

        if (dbError) throw dbError;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Delete error:", error);
        if (error.message === 'Unauthorized: Admin access required') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
