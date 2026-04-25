import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/auth';
import { currentUser } from '@clerk/nextjs/server';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
    try {
        await requireAdmin();
        const user = await currentUser();
        if (!user) throw new Error('User not found');

        const { data, error } = await supabaseAdmin
            .from('api_keys')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await requireAdmin();
        const user = await currentUser();
        if (!user) throw new Error('User not found');

        const { name, folder_id } = await req.json();
        if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

        // Generate a cryptographically secure API Key
        // Format: cs_live_ + 64 characters of high-entropy hex
        const buffer = crypto.randomBytes(32);
        const keyValue = `cs_live_${buffer.toString('hex')}`;

        const { data, error } = await supabaseAdmin
            .from('api_keys')
            .insert({
                name,
                key_value: keyValue,
                user_id: user.id,
                folder_id: folder_id || null,
                is_active: true
            })
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        await requireAdmin();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        const { error } = await supabaseAdmin
            .from('api_keys')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
