import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Storage quota in bytes (1 TB - near infinite for personal use)
const STORAGE_QUOTA_BYTES = 1024 * 1024 * 1024 * 1024;

export async function GET() {
    try {
        await requireAdmin();
        // Fetch all assets from the database
        const { data: images, error } = await supabaseAdmin
            .from('assets')
            .select('original_size');

        if (error) {
            throw error;
        }

        // Format bytes to human-readable format
        const formatBytes = (bytes: number): string => {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
        };

        if (!images || images.length === 0) {
            return NextResponse.json({
                usedBytes: 0,
                usedFormatted: '0 B',
                quotaBytes: STORAGE_QUOTA_BYTES,
                quotaFormatted: formatBytes(STORAGE_QUOTA_BYTES),
                percentage: 0,
                fileCount: 0
            });
        }

        // Calculate total storage usage
        let usedBytes = 0;

        images.forEach(img => {
            // Sum only original size since our Telegram CDN generates optimized variants on-the-fly
            usedBytes += (img.original_size || 0);
        });

        const percentage = (usedBytes / STORAGE_QUOTA_BYTES) * 100;

        return NextResponse.json({
            usedBytes,
            usedFormatted: formatBytes(usedBytes),
            quotaBytes: STORAGE_QUOTA_BYTES,
            quotaFormatted: formatBytes(STORAGE_QUOTA_BYTES),
            percentage: Math.min(percentage, 100),
            fileCount: images.length
        });

    } catch (error: any) {
        console.error('Storage usage calculation error:', error);
        if (error.message === 'Unauthorized: Admin access required') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json(
            { error: error.message || 'Failed to calculate storage usage' },
            { status: 500 }
        );
    }
}
