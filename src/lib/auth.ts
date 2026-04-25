import { currentUser } from "@clerk/nextjs/server";
import { ADMIN_EMAILS as CONFIG_ADMIN_EMAILS } from "@/lib/demo-config";
import { supabaseAdmin } from "./supabase-server";

export const DEMO_LIMITS = {
    MAX_UPLOADS: 1,
    MAX_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
};


const ENV_ADMIN_EMAILS = (process.env.ADMIN_EMAIL || '').split(',').map(e => e.trim().toLowerCase());
const ALL_ADMIN_EMAILS = Array.from(new Set([...ENV_ADMIN_EMAILS, ...CONFIG_ADMIN_EMAILS.map(e => e.toLowerCase())]));

export type AppRole = 'ADMIN' | 'DEMO';

export interface AppUser {
    id: string;
    email: string;
    role: AppRole;
}


export async function getAppUser(): Promise<AppUser | null> {
    const user = await currentUser();
    if (!user) return null;

    const email = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress.toLowerCase();
    if (!email) return null;

    const role: AppRole = ALL_ADMIN_EMAILS.includes(email) ? 'ADMIN' : 'DEMO';

    return {
        id: user.id,
        email,
        role
    };
}

export async function isUserAdmin(): Promise<boolean> {
    const user = await getAppUser();
    return user?.role === 'ADMIN';
}

export async function requireAdmin() {
    const isAdmin = await isUserAdmin();
    if (!isAdmin) {
        throw new Error('Unauthorized: Admin access required');
    }
}

/**
 * requireAuth - Allow both ADMIN and DEMO users, but reject unlogged users.
 */
export async function requireAuth(): Promise<AppUser> {
    const user = await getAppUser();
    if (!user) {
        throw new Error('Unauthorized: Authentication required');
    }
    return user;
}

/**
 * Checks if a demo user has reached their upload limit.
 * Returns { allowed: true } or { allowed: false, reason: string }.
 */
export async function checkDemoLimit(user: AppUser, fileSize?: number) {
    if (user.role === 'ADMIN') return { allowed: true };

    // 1. Check File Size
    if (fileSize && fileSize > DEMO_LIMITS.MAX_SIZE_BYTES) {
        return { 
            allowed: false, 
            reason: `Trial limit exceeded. Max file size is ${DEMO_LIMITS.MAX_SIZE_BYTES / 1024 / 1024}MB.` 
        };
    }

    // 2. Check Total Uploads
    const { count, error } = await supabaseAdmin
        .from('assets')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

    if (error) {
        console.error('Demo limit check error:', error);
        return { allowed: false, reason: 'Internal error verifying trial limits.' };
    }

    if ((count || 0) >= DEMO_LIMITS.MAX_UPLOADS) {
        return { 
            allowed: false, 
            reason: `Trial limit reached. Demo accounts are limited to ${DEMO_LIMITS.MAX_UPLOADS} upload.` 
        };
    }

    return { allowed: true };
}


