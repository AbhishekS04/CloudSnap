import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// Storage quota in bytes (default: 500MB for Supabase free tier)
const STORAGE_QUOTA_BYTES = parseInt(process.env.STORAGE_QUOTA_MB || '500') * 1024 * 1024;

export async function GET() {
    try {
        // Fetch all images from the database
        const { data: images, error } = await supabaseAdmin
            .from('images')
            .select('original_size, thumb_size, sm_size, md_size, lg_size');

        if (error) {
            throw error;
        }

        // Format bytes to human-readable format
        const formatBytes = (bytes: number): string => {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
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
            // Sum all size fields
            usedBytes += (img.original_size || 0);
            usedBytes += (img.thumb_size || 0);
            usedBytes += (img.sm_size || 0);
            usedBytes += (img.md_size || 0);
            usedBytes += (img.lg_size || 0);
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
        return NextResponse.json(
            { error: error.message || 'Failed to calculate storage usage' },
            { status: 500 }
        );
    }
}
