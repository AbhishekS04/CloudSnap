/**
 * GET /api/prewarm
 *
 * Batch-warms Vercel Edge Cache + Redis for all image assets.
 * Run this after every production deployment.
 *
 * Auth: Either—
 *   1. Admin Clerk session (browser), OR
 *   2. ?secret=PREWARM_SECRET (CI/CD, GitHub Actions, curl)
 *
 * Usage:
 *   GET /api/prewarm                    → warms latest 50 images
 *   GET /api/prewarm?limit=200          → warms latest 200 images
 *   GET /api/prewarm?secret=TOKEN       → headless / CI use
 *
 * Telegram rate limit guard:
 *   - Concurrency of 4 per batch
 *   - 150ms delay between batches
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/auth';

export const dynamic     = 'force-dynamic';
export const maxDuration = 60;

const CONCURRENCY   = 4;
const BATCH_DELAY_MS = 150; // avoid Telegram rate limits

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function GET(req: NextRequest) {
    try {
        // ── Auth: Clerk session OR secret key ──────────────────────────────
        const { searchParams } = new URL(req.url);
        const providedSecret   = searchParams.get('secret');
        const prewarmSecret    = process.env.PREWARM_SECRET;

        const isSecretAuth = prewarmSecret && providedSecret === prewarmSecret;

        if (!isSecretAuth) {
            // Fall back to Clerk session auth
            const user = await requireAuth();
            if (user.role !== 'ADMIN') {
                return NextResponse.json({ error: 'Admin only' }, { status: 403 });
            }
        }

        // ── Fetch image assets ─────────────────────────────────────────────
        const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 500);

        const { data: assets, error } = await supabaseAdmin
            .from('assets')
            .select('id, original_name, mime_type')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;

        const imageAssets = (assets || []).filter((a: any) =>
            (a.mime_type as string).startsWith('image/')
        );

        const origin  = new URL(req.url).origin;
        let warmed    = 0;
        let failed    = 0;
        const errors: string[] = [];

        // ── Process in rate-limited batches ────────────────────────────────
        for (let i = 0; i < imageAssets.length; i += CONCURRENCY) {
            if (i > 0) await sleep(BATCH_DELAY_MS); // rate-limit guard

            const batch   = imageAssets.slice(i, i + CONCURRENCY);
            const results = await Promise.allSettled(
                batch.map(async (asset: any) => {
                    // Use UUID-based CDN URL — no extra DB lookup, rename-proof
                    const cdnBase = `${origin}/api/cdn/${asset.id}`;
                    await Promise.allSettled([
                        fetch(`${cdnBase}?w=200&fmt=webp`),  // thumb
                        fetch(`${cdnBase}?w=600&fmt=webp`),  // sm
                        fetch(`${cdnBase}?w=1200&fmt=webp`), // md/lightbox
                        fetch(cdnBase),                        // original
                    ]);
                })
            );

            results.forEach((r, idx) => {
                if (r.status === 'fulfilled') {
                    warmed++;
                } else {
                    failed++;
                    errors.push(batch[idx]?.original_name ?? 'unknown');
                    console.error('[Prewarm] Failed:', batch[idx]?.original_name, (r as PromiseRejectedResult).reason);
                }
            });
        }

        return NextResponse.json({
            success : true,
            warmed,
            failed,
            total   : imageAssets.length,
            ...(errors.length > 0 && { errors: errors.slice(0, 10) }),
            message : `Warmed ${warmed}/${imageAssets.length} images. Links are now fast.`,
        });

    } catch (error: any) {
        console.error('[Prewarm] Fatal:', error.message);
        return NextResponse.json(
            { error: error.message },
            { status: error.message.includes('Unauthorized') ? 401 : 500 }
        );
    }
}
