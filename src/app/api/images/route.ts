import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic'; // Ensure no caching for this route

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const limit = searchParams.get('limit');
        const folder_id = searchParams.get('folder_id'); // New param

        let query = supabaseAdmin
            .from('images')
            .select('*')
            .order('created_at', { ascending: false });

        if (limit) {
            query = query.limit(parseInt(limit));
        }

        if (folder_id && folder_id !== 'null') {
            query = query.eq('folder_id', folder_id);
        } else if (folder_id === 'null') {
            // If specific folder not requested, show root images (where folder_id is null)
            // OR should we show all? Usually dashboard root shows root items.
            // Let's assume ?folder_id=null explicitly asks for root.
            // But what if no param? Maybe show all? 
            // User asked: "Separated images like according to folder structure".
            // So default (no param) or explicitly 'null' should show root.
            query = query.is('folder_id', null);
        }
        // If folder_id is not present at all, no filter is applied for folder_id,
        // which means it will return all images (including those with folder_id and null folder_id).
        // The instruction implies that if folder_id is not present, no filter should be applied.
        // The snippet's `else` block would apply `is('folder_id', null)` if `folder_id` is null (param not present).
        // Let's stick to the instruction: "If it is 'null' string, filter for null."
        // This means if `folder_id` is not present, no filter is applied.
        // If `folder_id` is present and not 'null', filter by its value.
        // If `folder_id` is present and 'null', filter for null.

        const { data, error } = await query;

        if (error) {
            throw error;
        }

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
