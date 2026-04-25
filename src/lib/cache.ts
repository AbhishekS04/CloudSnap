import { Redis } from '@upstash/redis';

/**
 * cache.ts — CloudSnap Two-Tier Asset Cache
 * 
 * L1: In-process Map (0ms)
 * L2: Upstash Redis  (~100ms from Mumbai to Singapore)
 */

const log = (msg: string, data?: any) => {
    console.log(`[Cache] ${msg}`, data || '');
};

// ─────────────────────────────────────────────
// L1: In-Process Memory Cache
// ─────────────────────────────────────────────
const L1 = new Map<string, { buffer: Buffer; expires: number }>();
const L1_TTL_MS = 1000 * 60 * 60; // 1 hour
const CACHE_GATE = 700_000;      // 700KB limit for L2

// ─────────────────────────────────────────────
// L2: Redis Client
// ─────────────────────────────────────────────
let redis: Redis | null = null;

try {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (url && token) {
        redis = new Redis({ url, token });
        log('✅ Redis Client Initialized');
    } else {
        log('⚠️ Redis Env Missing - Cache will be L1 only');
    }
} catch (e) {
    log('❌ Redis Init Error:', e);
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

export async function getCache(key: string): Promise<{ buffer: Buffer; source: 'L1' | 'L2' } | null> {
    // 1. Check L1
    const l1Item = L1.get(key);
    if (l1Item && l1Item.expires > Date.now()) {
        log(`HIT-L1: ${key.substring(0, 8)}...`);
        return { buffer: l1Item.buffer, source: 'L1' };
    }

    // 2. Check L2
    if (redis) {
        try {
            const base64 = await redis.get<string>(`media:${key}`);
            if (base64) {
                const buffer = Buffer.from(base64, 'base64');
                // Backfill L1
                L1.set(key, { buffer, expires: Date.now() + L1_TTL_MS });
                log(`HIT-L2: ${key.substring(0, 8)}...`);
                return { buffer, source: 'L2' };
            }
        } catch (e) {
            log('L2 Get Error:', e);
        }
    }

    log(`MISS: ${key.substring(0, 8)}...`);
    return null;
}

export async function setCache(key: string, buffer: Buffer, ttlSeconds = 86400): Promise<void> {
    // 1. Set L1
    L1.set(key, { buffer, expires: Date.now() + L1_TTL_MS });

    // 2. Set L2 if under 700KB
    if (redis && buffer.length < CACHE_GATE) {
        try {
            const base64 = buffer.toString('base64');
            await redis.set(`media:${key}`, base64, { ex: ttlSeconds });
            log(`SET-L2 Success: ${key.substring(0, 8)}... (${Math.round(buffer.length/1024)}KB)`);
        } catch (e) {
            log('L2 Set Error:', e);
        }
    } else if (redis) {
        log(`SKIP-L2: Too large (${Math.round(buffer.length/1024)}KB)`);
    }
}
