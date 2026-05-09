import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/auth';
import { slugify } from '@/lib/utils';

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requireAuth();
        const { id } = await params;
        const body = await req.json();
        const { name, folderId } = body;

        if (!name && folderId === undefined) {
            return NextResponse.json({ error: 'Provide name or folderId' }, { status: 400 });
        }

        // Verify ownership
        const { data: asset, error: fetchError } = await supabaseAdmin
            .from('assets')
            .select('user_id')
            .eq('id', id)
            .single();

        if (fetchError || !asset) {
            return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
        }

        if (asset.user_id !== user.id && user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const updates: Record<string, unknown> = {};
        if (name) updates.original_name = slugify(name);
        if (folderId !== undefined) updates.folder_id = folderId || null; // null = move to root

        const { error: updateError } = await supabaseAdmin
            .from('assets')
            .update(updates)
            .eq('id', id);

        if (updateError) throw new Error(`Failed to update asset: ${updateError.message}`);

        return NextResponse.json({
            success: true,
            name: updates.original_name ?? undefined,
            folderId: updates.folder_id ?? null,
            cdnUrl: `/api/cdn/${id}`,
        });

    } catch (error: any) {
        console.error('Asset update error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to update asset' },
            { status: 500 }
        );
    }
}
