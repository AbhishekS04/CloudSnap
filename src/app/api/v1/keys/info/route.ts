import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireApiKey } from '@/lib/api-auth';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
    try {
        const keyData = await requireApiKey(req);
        
        let folderName = 'Root (All Access)';
        
        if (keyData.folder_id) {
            const { data } = await supabase
                .from('folders')
                .select('name')
                .eq('id', keyData.folder_id)
                .single();
            if (data) folderName = data.name;
        }

        return NextResponse.json({
            success: true,
            key: {
                name: keyData.name,
                scope: folderName,
                is_restricted: !!keyData.folder_id,
                folder_id: keyData.folder_id
            }
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: 401 });
    }
}
