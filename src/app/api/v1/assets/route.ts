import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireApiKey } from '@/lib/api-auth';

/**
 * GET /api/v1/assets
 * Lists assets uploaded via this API (or all user assets).
 */
export async function GET(req: NextRequest) {
    try {
        await requireApiKey(req);
        
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        const { data, error, count } = await supabaseAdmin
            .from('assets')
            .select('*', { count: 'exact' })
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
            created_at: asset.created_at,
            links: {
                share: `${origin}/share/${asset.id}`,
                cdn: `${origin}/api/cdn/${asset.id}`,
                download: `${origin}/api/cdn/${asset.id}?dl=1`
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
