import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireApiKey } from '@/lib/api-auth';

/**
 * GET /api/v1/assets/[id]
 * Returns detailed metadata for a single asset.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const keyData = await requireApiKey(req);
        const { id } = await params;

        let query = supabaseAdmin
            .from('assets')
            .select('*')
            .eq('id', id);

        // Enforce folder scope if API key is restricted
        if (keyData.folder_id) {
            query = query.eq('folder_id', keyData.folder_id);
        }

        const { data, error } = await query.single();

        if (error || !data) {
            return NextResponse.json({ error: 'Asset not found or access denied' }, { status: 404 });
        }

        const origin = req.nextUrl.origin;

        return NextResponse.json({
            success: true,
            asset: {
                id: data.id,
                name: data.original_name,
                mime_type: data.mime_type,
                size: data.original_size,
                dimensions: data.width ? { width: data.width, height: data.height } : null,
                created_at: data.created_at,
                links: {
                    share: `${origin}/share/${data.id}`,
                    cdn: `${origin}/api/cdn/${data.id}`,
                    download: `${origin}/api/cdn/${data.id}?dl=1`,
                    thumbnail: data.mime_type.startsWith('video/') ? `${origin}/api/cdn/${data.id}` : `${origin}/api/cdn/${data.id}?w=300&fmt=webp`
                }
            }
        });

    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' }, 
            { status: error.message?.includes('Unauthorized') ? 401 : 500 }
        );
    }
}
