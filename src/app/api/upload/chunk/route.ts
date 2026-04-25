import { NextRequest, NextResponse } from 'next/server';
import { uploadToTelegram } from '@/lib/telegram';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

export async function POST(req: NextRequest) {
    try {
        await requireAdmin();

        const formData   = await req.formData();
        const file       = formData.get('file') as File;
        const chunkIndex = formData.get('chunkIndex') as string;
        const sessionId  = formData.get('sessionId') as string | null;

        if (!file) {
            return NextResponse.json({ error: 'No file chunk provided' }, { status: 400 });
        }

        const buffer    = Buffer.from(await file.arrayBuffer());
        const chunkName = `chunk_${chunkIndex}_${Date.now()}`;
        const result    = await uploadToTelegram(buffer, chunkName, file.type || 'application/octet-stream');

        console.log(JSON.stringify({
            level: 'info', msg: 'Chunk uploaded to Telegram',
            service: 'chunk-upload', chunkIndex, fileId: result.fileId, bytes: result.fileSize,
        }));

        // ── Record confirmed chunk in the session (for resumability) ─────────
        // We append the Telegram file ID to `confirmed_chunk_ids[]` atomically.
        // If the client crashes after this point, it can resume from this chunk on retry.
        if (sessionId) {
            const { error: sessionError } = await supabaseAdmin.rpc('append_chunk_id', {
                p_session_id: sessionId,
                p_file_id:    result.fileId,
            });

            if (sessionError) {
                // Non-fatal: log the error but still return success to the client.
                // The chunk IS in Telegram — only the session record failed to update.
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

        if (error.message === 'Unauthorized: Admin access required') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        return NextResponse.json(
            { error: error.message || 'Failed to upload chunk' },
            { status: 500 },
        );
    }
}
