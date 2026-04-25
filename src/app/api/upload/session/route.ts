import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth, checkDemoLimit } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

// ── POST /api/upload/session ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        const user = await requireAuth();
        const { fileName, fileSize, mimeType, totalChunks, folderId } = await req.json();

        // Enforcement: Check Demo Limits
        const limitCheck = await checkDemoLimit(user, fileSize);
        if (!limitCheck.allowed) {
            return NextResponse.json({ error: limitCheck.reason }, { status: 403 });
        }

        if (!fileName || totalChunks === undefined) {
            return NextResponse.json({ 
                error: 'Missing required fields', 
                details: { fileName: !fileName, totalChunks: totalChunks === undefined } 
            }, { status: 400 });
        }

        const sessionId = uuidv4();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

        const { error } = await supabaseAdmin
            .from('upload_sessions')
            .insert({
                id:                   sessionId,
                user_id:              user.id, // Store owner
                file_name:            fileName,
                file_size:            fileSize,
                mime_type:            mimeType,
                folder_id:            folderId || null,
                total_chunks:         totalChunks,
                confirmed_chunk_ids:  [],
                status:               'in_progress',
                created_at:           new Date().toISOString(),
                expires_at:           expiresAt,
            });

        if (error) throw new Error(`Failed to create session: ${error.message}`);

        return NextResponse.json({ sessionId });

    } catch (error: any) {
        const isUnauthorized = error.message?.includes('Unauthorized');
        return NextResponse.json(
            { error: error.message || 'Failed to create session' }, 
            { status: isUnauthorized ? 401 : 500 }
        );
    }
}

// ── GET /api/upload/session?sessionId=xxx ─────────────────────────────────
export async function GET(req: NextRequest) {
    try {
        await requireAuth();

        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get('sessionId');

        if (!sessionId) {
            return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('upload_sessions')
            .select('*')
            .eq('id', sessionId)
            .single();

        if (error || !data) {
            return NextResponse.json({ error: 'Session not found or expired' }, { status: 404 });
        }

        if (new Date(data.expires_at) < new Date()) {
            await supabaseAdmin.from('upload_sessions').delete().eq('id', sessionId);
            return NextResponse.json({ error: 'Session expired' }, { status: 410 });
        }

        return NextResponse.json({
            sessionId:          data.id,
            fileName:           data.file_name,
            fileSize:           data.file_size,
            mimeType:           data.mime_type,
            folderId:           data.folder_id,
            totalChunks:        data.total_chunks,
            confirmedChunkIds:  data.confirmed_chunk_ids as string[],
            confirmedCount:     (data.confirmed_chunk_ids as string[]).length,
            status:             data.status,
        });

    } catch (error: any) {
        const isUnauthorized = error.message?.includes('Unauthorized');
        return NextResponse.json(
            { error: error.message || 'Failed to fetch session' }, 
            { status: isUnauthorized ? 401 : 500 }
        );
    }
}

// ── PATCH /api/upload/session ────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
    try {
        await requireAuth();
        const { sessionId, status } = await req.json();

        if (!sessionId || !['complete', 'failed'].includes(status)) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('upload_sessions')
            .update({ status })
            .eq('id', sessionId);

        if (error) throw new Error(error.message);

        return NextResponse.json({ success: true });

    } catch (error: any) {
        const isUnauthorized = error.message?.includes('Unauthorized');
        return NextResponse.json(
            { error: error.message || 'Internal error' }, 
            { status: isUnauthorized ? 401 : 500 }
        );
    }
}

