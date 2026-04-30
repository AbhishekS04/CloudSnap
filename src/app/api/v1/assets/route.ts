import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireApiKey } from '@/lib/api-auth';

/**
 * GET /api/v1/assets
 * Lists assets uploaded via this API (or all user assets).
 */
export async function GET(req: NextRequest) {
    try {
        const keyData = await requireApiKey(req);
        
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        let query = supabaseAdmin
            .from('assets')
            .select('*', { count: 'exact' })
            .eq('user_id', keyData.user_id);

        // Enforce folder scope if API key is restricted
        if (keyData.folder_id) {
            query = query.eq('folder_id', keyData.folder_id);
        }

        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        const origin = req.nextUrl.origin;

        // Transform into a cleaner API format
        const assets = data.map(asset => ({
            id: asset.id,
            name: asset.original_name,
            mime_type: asset.mime_type,
            size: asset.original_size,
            folder_id: asset.folder_id,
            created_at: asset.created_at,
            links: {
                share: `${origin}/share/${asset.id}`,
                cdn: `${origin}/api/cdn/${encodeURIComponent(asset.original_name || asset.id)}`,
                download: `${origin}/api/cdn/${encodeURIComponent(asset.original_name || asset.id)}?dl=1`
            }
        }));

        return NextResponse.json({
            success: true,
            total: count,
            limit,
            offset,
            assets
        });

    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' }, 
            { status: error.message?.includes('Unauthorized') ? 401 : 500 }
        );
    }
}
