import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic'; // Ensure no caching for this route

export async function GET() {
    try {
        const { data, error } = await supabaseAdmin
            .from('images')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
