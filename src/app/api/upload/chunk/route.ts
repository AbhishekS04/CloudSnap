import { NextRequest, NextResponse } from 'next/server';
import { uploadToTelegram } from '@/lib/telegram';
import { requireAuth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

export async function POST(req: NextRequest) {
    try {
        await requireAuth();

        const formData   = await req.formData();
        const file       = formData.get('file') as File;
        const chunkIndex = formData.get('chunkIndex') as string;
        const sessionId  = formData.get('sessionId') as string | null;

        if (!file) {
            return NextResponse.json({ error: 'No file chunk provided' }, { status: 400 });
        }

        const buffer    = Buffer.from(await file.arrayBuffer());
        const user = await requireAuth();
        const roleLabel = user.role === 'ADMIN' ? '👑 ADMIN' : '👤 TRIAL';
        
        let displayFileName = 'file';
        let caption = `${roleLabel} | [Chunk ${chunkIndex}]`;
        
        if (sessionId) {
            const { data: session } = await supabaseAdmin
                .from('upload_sessions')
                .select('file_name, total_chunks')
                .eq('id', sessionId)
                .single();
            
            if (session) {
                displayFileName = session.file_name;
                caption = `${roleLabel} | ${session.file_name}\nPart ${parseInt(chunkIndex) + 1} of ${session.total_chunks}\nID: ${sessionId.split('-')[0]}`;
            }
        }

        const chunkName = `${displayFileName}.part${chunkIndex.padStart(3, '0')}`;
        const result    = await uploadToTelegram(buffer, chunkName, file.type || 'application/octet-stream', caption);


        console.log(JSON.stringify({
            level: 'info', msg: 'Chunk uploaded to Telegram',
            service: 'chunk-upload', chunkIndex, fileId: result.fileId, bytes: result.fileSize,
        }));

        if (sessionId) {
            const { error: sessionError } = await supabaseAdmin.rpc('append_chunk_id', {
                p_session_id: sessionId,
                p_file_id:    result.fileId,
            });

            if (sessionError) {
                console.warn(JSON.stringify({
                    level: 'warn', msg: 'Failed to update session with chunk ID',
                    service: 'chunk-upload', sessionId, chunkIndex, error: sessionError.message,
                }));
            }
        }

        return NextResponse.json({
            fileId: result.fileId,
            size:   result.fileSize,
        });

    } catch (error: any) {
        console.error(JSON.stringify({
            level: 'error', msg: 'Chunk upload failed',
            service: 'chunk-upload', error: error.message,
        }));

        const isUnauthorized = error.message?.includes('Unauthorized');
        return NextResponse.json(
            { error: error.message || 'Failed to upload chunk' },
            { status: isUnauthorized ? 401 : 500 },
        );
    }
}

