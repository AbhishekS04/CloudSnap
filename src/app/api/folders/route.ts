
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, isUserAdmin } from '@/lib/auth';
import { DEMO_FOLDERS } from '@/lib/demo-config';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
    try {
        const user = await requireAuth();
        if (user.role === 'DEMO') {
            return NextResponse.json({ error: 'Folder creation is disabled in Demo Mode.' }, { status: 403 });
        }

        const { name, parent_id } = await req.json();

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const cleanParentId = (parent_id && parent_id !== 'null') ? parent_id : null;

        const { data, error } = await supabase
            .from('folders')
            .insert({ name, parent_id: cleanParentId })
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
        const user = await requireAuth();

        // Virtual Folders for Demo Users
        if (user.role === 'DEMO') {
            return NextResponse.json(DEMO_FOLDERS);
        }

        const { searchParams } = new URL(req.url);
        const parent_id = searchParams.get('parent_id');
        const showAll = searchParams.get('all') === 'true';

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        let query = supabase
            .from('folders')
            .select('*')
            .order('name', { ascending: true });

        if (!showAll) {
            if (parent_id && parent_id !== 'null') {
                query = query.eq('parent_id', parent_id);
            } else {
                query = query.is('parent_id', null);
            }
        }

        const { data, error } = await query;
        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const user = await requireAuth();
        if (user.role === 'DEMO') {
            return NextResponse.json({ error: 'Deletion is disabled in Demo Mode.' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Standard safety: check if folder is empty
        const { count: imageCount, error: imgError } = await supabase
            .from('images')
            .select('*', { count: 'exact', head: true })
            .eq('folder_id', id);

        if (imgError) throw imgError;

        const { count: childFolderCount, error: folderError } = await supabase
            .from('folders')
            .select('*', { count: 'exact', head: true })
            .eq('parent_id', id);

        if (folderError) throw folderError;

        if (imageCount && imageCount > 0) {
            return NextResponse.json({ error: 'Cannot delete folder: It contains assets.' }, { status: 400 });
        }

        if (childFolderCount && childFolderCount > 0) {
            return NextResponse.json({ error: 'Cannot delete folder: It contains sub-folders.' }, { status: 400 });
        }

        const { error: deleteError } = await supabase
            .from('folders')
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

