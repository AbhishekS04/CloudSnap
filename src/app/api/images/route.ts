import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/auth';
import { deleteFromTelegram } from '@/lib/telegram';
import { DEMO_STARTER_ASSET_IDS } from '@/lib/demo-config';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const user = await requireAuth();
        const { searchParams } = new URL(req.url);
        const limit = searchParams.get('limit');
        const folder_id = searchParams.get('folder_id');

        let query = supabaseAdmin
            .from('assets')
            .select('*')
            .order('created_at', { ascending: false });

        // Virtual Logic for Demo Users
        if (user.role === 'DEMO') {
            // Filter: (Their own uploads) OR (The Starter Pack)
            const idList = DEMO_STARTER_ASSET_IDS.map(id => `"${id}"`).join(',');
            query = query.or(`user_id.eq.${user.id},id.in.(${idList})`);
        }

        if (limit) {
            query = query.limit(parseInt(limit));
        }

        if (folder_id && folder_id !== 'null') {
            query = query.eq('folder_id', folder_id);
        } else if (folder_id === 'null') {
            query = query.is('folder_id', null);
        }

        const { data, error } = await query;
        if (error) throw error;

        const mappedData = data.map((asset: any) => {
            const isVideo = (asset.mime_type as string || '').startsWith('video/');
            const baseUrl = `/api/cdn/${asset.id}`;
            return {
                ...asset,
                original_ext: asset.original_name?.split('.').pop() || (isVideo ? 'mp4' : 'jpg'),
                original_url: baseUrl,
                thumb_url: isVideo ? baseUrl : `${baseUrl}?w=200&fmt=webp`,
                sm_url:    isVideo ? baseUrl : `${baseUrl}?w=600&fmt=webp`,
                md_url:    isVideo ? baseUrl : `${baseUrl}?w=1200&fmt=webp`,
                lg_url:    isVideo ? baseUrl : `${baseUrl}?w=2000&fmt=webp`,
            };
        });

        return NextResponse.json(mappedData);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: error.message.includes('Unauthorized') ? 401 : 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const user = await requireAuth();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
        }

        const { data: asset, error: fetchError } = await supabaseAdmin
            .from('assets')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !asset) return NextResponse.json({ success: true });

        if (user.role === 'DEMO') {
            if (asset.user_id !== user.id) {
                return NextResponse.json({ error: 'You do not have permission to delete this starter asset.' }, { status: 403 });
            }
        }

        // ── Physical Deletion from Telegram ───────────────────────────────
        const messageIds = asset.telegram_message_ids;
        if (Array.isArray(messageIds) && messageIds.length > 0) {
            console.log(`[SyncDelete] Deleting ${messageIds.length} messages from Telegram for asset ${id}`);
            // Fire and forget or await? Awaiting ensures sync but takes longer. 
            // Since it's a background process, we'll await but wrap in try/catch.
            try {
                await deleteFromTelegram(messageIds);
            } catch (err) {
                console.error('[SyncDelete] Failed to delete from Telegram:', err);
            }
        }

        const { error: dbError } = await supabaseAdmin
            .from('assets')
            .delete()
            .eq('id', id);

        if (dbError) throw dbError;
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: error.message.includes('Unauthorized') ? 401 : 500 });
    }
}

