import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const user = await requireAuth();

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

        if (!name) {
            return NextResponse.json({ error: 'Missing required metadata: name is required' }, { status: 400 });
        }
        if (!telegramFileIds || !Array.isArray(telegramFileIds) || telegramFileIds.length === 0) {
            return NextResponse.json({ error: 'Missing required metadata: telegramFileIds is required' }, { status: 400 });
        }

        const id = uuidv4();
        const chatId = process.env.TELEGRAM_STORAGE_CHAT_ID!;

        const { error: dbError } = await supabaseAdmin
            .from('assets')
            .insert({
                id,
                user_id:            user.id, // Track ownership
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

        if (dbError) throw new Error(`Failed to save metadata: ${dbError.message}`);

        const baseUrl = `/api/cdn/${id}`;
        const isVideo = (mimeType as string || '').startsWith('video/');
        
        const mappedAsset = {
            id,
            original_name: name,
            mime_type: mimeType,
            width: width || null,
            height: height || null,
            original_size: size,
            telegram_file_ids: telegramFileIds,
            telegram_chat_id: chatId,
            is_chunked: isChunked,
            chunk_count: telegramFileIds.length,
            folder_id: (folderId && folderId !== 'null') ? folderId : null,
            created_at: new Date().toISOString(),
            original_ext: name?.split('.').pop() || (isVideo ? 'mp4' : 'jpg'),
            original_url: baseUrl,
            thumb_url: isVideo ? baseUrl : `${baseUrl}?w=200&fmt=webp`,
            sm_url:    isVideo ? baseUrl : `${baseUrl}?w=600&fmt=webp`,
            md_url:    isVideo ? baseUrl : `${baseUrl}?w=1200&fmt=webp`,
            lg_url:    isVideo ? baseUrl : `${baseUrl}?w=2000&fmt=webp`,
        };

        return NextResponse.json({ 
            success: true,
            asset: mappedAsset
        });

    } catch (error: any) {
        console.error('Finalization Error:', error);
        const isUnauthorized = error.message?.includes('Unauthorized');
        return NextResponse.json(
            { error: error.message || 'Failed to finalize asset' },
            { status: isUnauthorized ? 401 : 500 }
        );
    }
}

