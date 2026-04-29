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
        const { name } = await req.json();

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const cleanName = slugify(name);

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

        // Update name
        const { error: updateError } = await supabaseAdmin
            .from('assets')
            .update({ original_name: cleanName })
            .eq('id', id);

        if (updateError) {
            throw new Error(`Failed to update name: ${updateError.message}`);
        }

        return NextResponse.json({ 
            success: true, 
            name: cleanName,
            cdnUrl: `/api/cdn/${encodeURIComponent(cleanName || id)}`
        });

    } catch (error: any) {
        console.error('Rename Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to rename asset' },
            { status: 500 }
        );
    }
}
