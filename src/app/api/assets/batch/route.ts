import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/assets/batch
 * Body: { ids: string[], folderId: string | null }
 * Bulk-moves assets to a folder (or root if folderId is null).
 */
export async function PATCH(req: NextRequest) {
    try {
        const user = await requireAuth();
        const { ids, folderId } = await req.json();

        if (!Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: 'ids array is required' }, { status: 400 });
        }

        // Verify all assets belong to this user (or user is ADMIN)
        if (user.role !== 'ADMIN') {
            const { data: assets, error } = await supabaseAdmin
                .from('assets')
                .select('id, user_id')
                .in('id', ids);

            if (error) throw new Error(error.message);

            const unauthorized = assets?.some(a => a.user_id !== user.id);
            if (unauthorized) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        const { error: updateError } = await supabaseAdmin
            .from('assets')
            .update({ folder_id: folderId || null })
            .in('id', ids);

        if (updateError) throw new Error(updateError.message);

        return NextResponse.json({ success: true, moved: ids.length });

    } catch (error: any) {
        console.error('Batch move error:', error);
        return NextResponse.json(
            { error: error.message || 'Batch move failed' },
            { status: 500 }
        );
    }
}
