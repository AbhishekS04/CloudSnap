import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        await requireAdmin();

        const body = await req.json();
        const { 
            name, 
            mimeType, 
            size, 
            telegramFileIds, 
            isChunked, 
            folderId,
            width,
            height 
        } = body;

        if (!name || !telegramFileIds || telegramFileIds.length === 0) {
            return NextResponse.json({ error: 'Missing required metadata' }, { status: 400 });
        }

        const id = uuidv4();
        const chatId = process.env.TELEGRAM_STORAGE_CHAT_ID!;

        const { error: dbError } = await supabaseAdmin
            .from('assets')
            .insert({
                id,
                original_name:      name,
                mime_type:          mimeType,
                width:              width  || null,
                height:             height || null,
                original_size:      size,
                telegram_file_ids:  telegramFileIds,
                telegram_chat_id:   chatId,
                is_chunked:         isChunked,
                chunk_count:        telegramFileIds.length,
                folder_id:          (folderId && folderId !== 'null') ? folderId : null,
                created_at:         new Date().toISOString(),
            });

        if (dbError) {
            throw new Error(`Failed to save metadata: ${dbError.message}`);
        }

        return NextResponse.json({ 
            id, 
            success: true,
            cdnUrl: `/api/cdn/${id}`
        });

    } catch (error: any) {
        console.error('Finalization Error:', error);

        if (error.message === 'Unauthorized: Admin access required') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        return NextResponse.json(
            { error: error.message || 'Failed to finalize asset' },
            { status: 500 }
        );
    }
}
