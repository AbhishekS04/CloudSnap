import { createClient } from '@supabase/supabase-js';

// Access environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('--- Supabase Init ---');
console.log('Supabase URL:', supabaseUrl ? 'Set' : 'Missing');

if (supabaseServiceKey) {
    try {
        const parts = supabaseServiceKey.split('.');
        if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
            console.log('Key Role:', payload.role);
            console.log('Key Iss:', payload.iss);
            if (payload.role !== 'service_role') {
                console.error('CRITICAL: The provided SUPABASE_SERVICE_ROLE_KEY is NOT a service_role key. It looks like an', payload.role, 'key.');
            } else {
                console.log('Key checks out: Valid service_role structure.');
            }
        } else {
            console.error('CRITICAL: Key is not a valid JWT (does not have 3 parts).');
        }
    } catch (e) {
        console.error('Error decoding key:', e);
    }
} else {
    console.log('Service Role Key: Missing');
}

if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('Missing Supabase environment variables. Admin client will not work.');
}

// Create use a service role client for admin operations (upload, delete)
// This bypasses RLS, so it should ONLY be used in server-side API routes.
// We use fallback values to prevent build-time crashes if env vars are missing.
export const supabaseAdmin = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseServiceKey || 'placeholder-key',
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    }
);
