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
        const id = pathname.replace('/api/cdn/', '');
        const searchParams = url.searchParams;

        // Calculate Cache Key
        const w = searchParams.get('w') || 'null';
        const fmt = searchParams.get('fmt') || 'null';
        const q = searchParams.get('q') || '82'; 
        
        const cacheKey = `media:cs:${id}:${w}:${fmt}:${q}`;

        try {
            const base64 = await redis.get<string>(cacheKey);

            if (base64) {
                const buffer = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
                
                let contentType = 'image/webp';
                if (fmt === 'avif') contentType = 'image/avif';
                else if (fmt === 'jpeg' || fmt === 'jpg') contentType = 'image/jpeg';
                else if (fmt === 'png') contentType = 'image/png';
                else if (pathname.toLowerCase().endsWith('.mp4')) contentType = 'video/mp4';

                return new NextResponse(buffer, {
                    headers: {
                        'Content-Type': contentType,
                        'Cache-Control': 'public, max-age=31536000, immutable',
                        'X-Edge-Cache': 'HIT',
                        'X-CDN-ID': id,
                    },
                });
            }
        } catch (err) {
            console.error('[Edge Cache] Error:', err);
        }
        
        // CDN is public, so if it misses cache, it just proceeds
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
