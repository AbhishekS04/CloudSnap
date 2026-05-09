import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

// Initialize Redis for Edge
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

// Define routes that require the user to be logged in
const isProtectedRoute = createRouteMatcher([
    '/dashboard(.*)',
    '/api/upload(.*)',
    '/api/images(.*)',
    '/api/folders(.*)',
    '/api/storage-usage(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // ── Edge Cache Logic for CDN ────────────────────────────────────
    if (pathname.startsWith('/api/cdn/') && process.env.UPSTASH_REDIS_REST_URL) {
        const id = decodeURIComponent(pathname.replace('/api/cdn/', ''));
        const searchParams = url.searchParams;

        const w = searchParams.get('w') || 'null';
        const requestedFmt = searchParams.get('fmt') || '';
        const ALLOWED = ['webp', 'avif', 'jpeg', 'png'];

        // ── Mirror exact Accept-header negotiation from CDN route ──────
        // Must produce the same outputFormat string the CDN route stored.
        let resolvedFmt: string | null = ALLOWED.includes(requestedFmt) ? requestedFmt : null;
        if (!resolvedFmt) {
            const accept = req.headers.get('accept') ?? '';
            if (accept.includes('image/avif')) resolvedFmt = 'avif';
            else if (accept.includes('image/webp')) resolvedFmt = 'webp';
        }

        // ── Quality: mirror resolveQuality() from CDN route ───────────
        const rawQ = searchParams.get('q');
        const FORMAT_QUALITY: Record<string, number> = { webp: 82, jpeg: 78, avif: 65 };
        let q: number;
        if (!rawQ || rawQ === 'auto') {
            q = FORMAT_QUALITY[resolvedFmt ?? 'webp'] ?? 82;
        } else {
            q = Math.min(100, Math.max(1, parseInt(rawQ, 10)));
        }

        // Key must exactly match: cs:${assetId}:${requestedWidth}:${outputFormat}:${requestedQuality}
        // The CDN route uses the UUID asset ID, not the filename.
        // We key on the URL id (filename or UUID) — on cache miss the CDN route handles UUID resolution.
        const cacheKey = `media:cs:${id}:${w === 'null' ? 'null' : w}:${resolvedFmt}:${q}`;

        try {
            const base64 = await redis.get<string>(cacheKey);

            if (base64) {
                const buffer = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

                const contentType = resolvedFmt
                    ? `image/${resolvedFmt}`
                    : pathname.toLowerCase().endsWith('.mp4') ? 'video/mp4' : 'application/octet-stream';

                return new NextResponse(buffer, {
                    headers: {
                        'Content-Type': contentType,
                        'Cache-Control': 'public, max-age=31536000, immutable',
                        'Vary': 'Accept',
                        'X-Edge-Cache': 'HIT',
                        'X-CDN-ID': id,
                    },
                });
            }
        } catch (err) {
            console.error('[Edge Cache] Error:', err);
        }

        // CDN is public — on cache miss, fall through to the route handler
        return;
    }

    // ── Authentication Logic for Protected Routes ───────────────────
    if (isProtectedRoute(req)) {
        await auth.protect();
    }
});

export const config = {
    matcher: [
        // Skip Next.js internals and all static files
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes (including CDN now for Edge Cache)
        '/(api|trpc)(.*)',
    ],
};
