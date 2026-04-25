import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/auth';
import { DEMO_STARTER_ASSET_IDS } from '@/lib/demo-config';

export const dynamic = 'force-dynamic';

const STORAGE_QUOTA_BYTES = 1024 * 1024 * 1024 * 1024; // 1 TB for Admin
const GUEST_QUOTA_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB for Demo

export async function GET() {
    try {
        const user = await requireAuth();

        const formatBytes = (bytes: number): string => {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
        };

        // Virtual Usage for Demo Users
        if (user.role === 'DEMO') {
            const { data: images } = await supabaseAdmin
                .from('assets')
                .select('original_size')
                .or(`user_id.eq.${user.id},id.in.("${DEMO_STARTER_ASSET_IDS.join('","')}")`);

            const usedBytes = images?.reduce((acc, img) => acc + (img.original_size || 0), 0) || 0;
            const percentage = (usedBytes / GUEST_QUOTA_BYTES) * 100;

            return NextResponse.json({
                usedBytes,
                usedFormatted: formatBytes(usedBytes),
                quotaBytes: GUEST_QUOTA_BYTES,
                quotaFormatted: formatBytes(GUEST_QUOTA_BYTES),
                percentage: Math.min(percentage, 100),
                fileCount: images?.length || 0
            });
        }

        // Real Usage for Admins
        const { data: images, error } = await supabaseAdmin
            .from('assets')
            .select('original_size');

        if (error) throw error;

        let usedBytes = 0;
        images?.forEach(img => {
            usedBytes += (img.original_size || 0);
        });

        const percentage = (usedBytes / STORAGE_QUOTA_BYTES) * 100;

        return NextResponse.json({
            usedBytes,
            usedFormatted: formatBytes(usedBytes),
            quotaBytes: STORAGE_QUOTA_BYTES,
            quotaFormatted: formatBytes(STORAGE_QUOTA_BYTES),
            percentage: Math.min(percentage, 100),
            fileCount: images?.length || 0
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: error.message.includes('Unauthorized') ? 401 : 500 });
    }
}

