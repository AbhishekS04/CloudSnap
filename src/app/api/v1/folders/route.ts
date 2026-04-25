import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireApiKey } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
    try {
        const keyData = await requireApiKey(req);
        
        let query = supabaseAdmin
            .from('folders')
            .select('*');

        // If key is scoped, only return subfolders of that scope
        if (keyData.folder_id) {
            query = query.eq('parent_id', keyData.folder_id);
        }

        const { data: folders, error } = await query.order('name', { ascending: true });

        if (error) throw error;

        return NextResponse.json({ success: true, folders });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: 401 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const keyData = await requireApiKey(req);
        const { name, parent_id } = await req.json();

        if (!name) {
            return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
        }

        // Enforcement: If the API key is scoped, any folder created MUST be under that scope
        let finalParentId = parent_id;
        if (keyData.folder_id) {
            if (!finalParentId) {
                finalParentId = keyData.folder_id;
            } else {
                // Verify the parent_id belongs to the user (security check)
                const { data: parentFolder } = await supabaseAdmin
                    .from('folders')
                    .select('id, parent_id')
                    .eq('id', finalParentId)
                    .single();

                if (!parentFolder) {
                    return NextResponse.json({ error: 'Invalid parent folder' }, { status: 400 });
                }
            }
        }

        const { data: folder, error } = await supabaseAdmin
            .from('folders')
            .insert({
                name,
                parent_id: finalParentId || null
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ 
            success: true, 
            folder: {
                id: folder.id,
                name: folder.name,
                parent_id: folder.parent_id,
                created_at: folder.created_at
            }
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: 401 });
    }
}
