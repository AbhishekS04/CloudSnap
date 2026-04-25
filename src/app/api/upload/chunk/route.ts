import { NextRequest, NextResponse } from 'next/server';
import { uploadToTelegram } from '@/lib/telegram';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

export async function POST(req: NextRequest) {
    try {
        await requireAdmin();

        const formData = await req.formData();
        const file = formData.get('file') as File;
        const chunkIndex = formData.get('chunkIndex') as string;
        
        if (!file) {
            return NextResponse.json({ error: 'No file chunk provided' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        
        // Upload this specific chunk to Telegram
        // We use a generic name for chunks
        const chunkName = `chunk_${chunkIndex}_${Date.now()}`;
        const result = await uploadToTelegram(buffer, chunkName, file.type || 'application/octet-stream');

        return NextResponse.json({ 
            fileId: result.fileId,
            size: result.fileSize
        });

    } catch (error: any) {
        console.error('Chunk Upload Error:', error);
        
        if (error.message === 'Unauthorized: Admin access required') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        return NextResponse.json(
            { error: error.message || 'Failed to upload chunk' },
            { status: 500 }
        );
    }
}
