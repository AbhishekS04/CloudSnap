
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
    try {
        await requireAdmin();
        const { name, parent_id } = await req.json();

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { data, error } = await supabase
            .from('folders')
            .insert({ name, parent_id: parent_id || null })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        // Optional: Require admin if private
        await requireAdmin();

        const { searchParams } = new URL(req.url);
        const parent_id = searchParams.get('parent_id');

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        let query = supabase
            .from('folders')
            .select('*')
            .order('name', { ascending: true });

        if (parent_id && parent_id !== 'null') {
            query = query.eq('parent_id', parent_id);
        } else {
            query = query.is('parent_id', null);
        }

        const { data, error } = await query;

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
