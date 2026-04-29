import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Creates a Supabase client authenticated with the current Clerk user's session.
 * This enables Row Level Security (RLS) and Realtime features on the client side.
 * 
 * @param clerkToken - The JWT token obtained from `await getToken({ template: 'supabase' })`
 */
export function createClerkSupabaseClient(clerkToken: string) {
    return createClient(supabaseUrl, supabaseAnonKey, {
        global: {
            fetch: async (url, options = {}) => {
                const headers = new Headers(options?.headers);
                // Inject the Clerk token for Supabase to parse and apply RLS
                headers.set('Authorization', `Bearer ${clerkToken}`);
                return fetch(url, { ...options, headers });
            },
        },
    });
}
