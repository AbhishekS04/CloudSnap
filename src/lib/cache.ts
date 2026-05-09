import { Redis } from '@upstash/redis';

/**
 * cache.ts — CloudSnap Two-Tier Asset Cache
 *
 * L1: globalThis Map (0ms) — survives hot-reloads & module re-evaluations
 *     within the same Node.js process (same Vercel function instance).
 * L2: Upstash Redis  (~30-80ms from nearest edge PoP via REST)
 *
 * Why globalThis instead of a module-level const?
 *   Next.js dev mode re-evaluates modules on every code change, destroying
 *   module-level state. On Vercel, the module may also be re-initialised
 *   between requests on the same instance. globalThis persists for the
 *   lifetime of the Node.js process — so L1 survives across reloads.
 */

type L1Entry = { buffer: Buffer; expires: number };
type CacheGlobal = {
    __csL1?: Map<string, L1Entry>;
    __csRedis?: Redis | null;
    __csRedisInit?: boolean;
};

const g = globalThis as typeof globalThis & CacheGlobal;

// ─────────────────────────────────────────────
// L1: In-Process Memory Cache (on globalThis)
// ─────────────────────────────────────────────
if (!g.__csL1) g.__csL1 = new Map<string, L1Entry>();
const L1 = g.__csL1;

const L1_TTL_MS        = 1000 * 60 * 60; // 1 hour
const L1_MAX_ENTRIES   = 200;             // evict oldest when full (memory safety)
const CACHE_GATE_RAW       = 700_000;     // 700KB — raw originals
const CACHE_GATE_TRANSFORM = 2_000_000;   // 2MB   — transformed outputs

const log = (msg: string, data?: unknown) =>
    console.log(`[Cache] ${msg}`, data ?? '');

// ─────────────────────────────────────────────
// L2: Redis Client (also on globalThis)
// ─────────────────────────────────────────────
if (!g.__csRedisInit) {
    g.__csRedisInit = true;
    g.__csRedis = null;
    try {
        const url   = process.env.UPSTASH_REDIS_REST_URL;
        const token = process.env.UPSTASH_REDIS_REST_TOKEN;
        if (url && token) {
            g.__csRedis = new Redis({ url, token });
            log('✅ Redis Client Initialized (globalThis)');
        } else {
            log('⚠️ Redis Env Missing — L1 only');
        }
    } catch (e) {
        log('❌ Redis Init Error:', e);
    }
}

const getRedis = () => g.__csRedis ?? null;

// ─────────────────────────────────────────────
// L1 helpers
// ─────────────────────────────────────────────

/** Evict the oldest entry when the cache is full. */
function l1Set(key: string, entry: L1Entry) {
    if (L1.size >= L1_MAX_ENTRIES) {
        const oldest = L1.keys().next().value;
        if (oldest !== undefined) L1.delete(oldest);
    }
    L1.set(key, entry);
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

export async function getCache(key: string): Promise<{ buffer: Buffer; source: 'L1' | 'L2' } | null> {
    // 1. Check L1 (0ms — same process instance)
    const l1Item = L1.get(key);
    if (l1Item && l1Item.expires > Date.now()) {
        log(`HIT-L1: ${key.substring(0, 8)}...`);
        return { buffer: l1Item.buffer, source: 'L1' };
    }

    // 2. Check L2 (Redis)
    const redis = getRedis();
    if (redis) {
        try {
            const base64 = await redis.get<string>(`media:${key}`);
            if (base64) {
                const buffer = Buffer.from(base64, 'base64');
                // Backfill L1 so next hit from this instance is instant
                l1Set(key, { buffer, expires: Date.now() + L1_TTL_MS });
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

export async function setCache(
    key: string,
    buffer: Buffer,
    ttlSeconds = 86400,
    isTransform = false,
): Promise<void> {
    // 1. Always write to L1
    l1Set(key, { buffer, expires: Date.now() + L1_TTL_MS });

    // 2. Write to L2 if under size gate
    const gate  = isTransform ? CACHE_GATE_TRANSFORM : CACHE_GATE_RAW;
    const redis = getRedis();
    if (redis && buffer.length < gate) {
        try {
            const base64 = buffer.toString('base64');
            await redis.set(`media:${key}`, base64, { ex: ttlSeconds });
            log(`SET-L2: ${key.substring(0, 8)}... (${Math.round(buffer.length / 1024)}KB, transform=${isTransform})`);
        } catch (e) {
            log('L2 Set Error:', e);
        }
    } else if (redis) {
        log(`SKIP-L2: Too large (${Math.round(buffer.length / 1024)}KB, gate=${Math.round(gate / 1024)}KB)`);
    }
}
