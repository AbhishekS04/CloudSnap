/**
 * /api/upload/session — Upload Session Management
 *
 * POST: Create a new upload session. Returns a sessionId the client
 *       uses to track chunk progress across network failures.
 *
 * GET:  Fetch the current state of a session (how many chunks confirmed).
 *       The client uses this to skip already-uploaded chunks on resume.
 *
 * Sessions expire after 24 hours — stale rows are cleaned up automatically
 * via the Supabase `expires_at` column (add a scheduled job or just let them age out).
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

// ── POST /api/upload/session ───────────────────────────────────────────────
// Body: { fileName, fileSize, mimeType, totalChunks, folderId? }
// Returns: { sessionId }

export async function POST(req: NextRequest) {
    try {
        await requireAdmin();

        const { fileName, fileSize, mimeType, totalChunks, folderId } = await req.json();

        // Log for debugging
        console.log('[Session] Request:', { fileName, fileSize, mimeType, totalChunks, folderId });

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

        if (error) {
            console.error('[Session] Create error:', error.message);
            throw new Error(`Failed to create session: ${error.message}`);
        }

        return NextResponse.json({ sessionId });

    } catch (error: any) {
        if (error.message === 'Unauthorized: Admin access required') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ error: error.message || 'Failed to create session' }, { status: 500 });
    }
}

// ── GET /api/upload/session?sessionId=xxx ─────────────────────────────────
// Returns: { sessionId, confirmedChunkIds, totalChunks, status, fileName, folderId }

export async function GET(req: NextRequest) {
    try {
        await requireAdmin();

        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get('sessionId');

        if (!sessionId) {
            return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('upload_sessions')
            .select('id, file_name, file_size, mime_type, folder_id, total_chunks, confirmed_chunk_ids, status, expires_at')
            .eq('id', sessionId)
            .single();

        if (error || !data) {
            return NextResponse.json({ error: 'Session not found or expired' }, { status: 404 });
        }

        // Check expiry manually (belt-and-suspenders)
        if (new Date(data.expires_at) < new Date()) {
            // Clean up expired session
            await supabaseAdmin.from('upload_sessions').delete().eq('id', sessionId);
            return NextResponse.json({ error: 'Session expired — please start a new upload' }, { status: 410 });
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
        if (error.message === 'Unauthorized: Admin access required') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ error: error.message || 'Failed to fetch session' }, { status: 500 });
    }
}

// ── PATCH /api/upload/session — Mark session complete or failed ────────────
// Body: { sessionId, status: 'complete' | 'failed' }

export async function PATCH(req: NextRequest) {
    try {
        await requireAdmin();

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
        if (error.message === 'Unauthorized: Admin access required') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
