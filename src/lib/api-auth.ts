import { supabaseAdmin } from './supabase-server';

/**
 * Validates an API key against the database.
 * Supports both x-api-key and Authorization: Bearer formats.
 */
export async function validateApiKey(req: Request) {
    const apiKey = req.headers.get('x-api-key') || 
                   req.headers.get('Authorization')?.replace('Bearer ', '');

    if (!apiKey) return null;

    const { data, error } = await supabaseAdmin
        .from('api_keys')
        .select('*')
        .eq('key_value', apiKey)
        .eq('is_active', true)
        .single();

    if (error || !data) {
        return null;
    }

    // Update last used timestamp (don't await to keep response fast)
    supabaseAdmin
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', data.id)
        .then();

    return data;
}

/**
 * Middleware-like helper for API routes.
 * Throws an error if the key is invalid.
 */
export async function requireApiKey(req: Request) {
    const keyData = await validateApiKey(req);
    if (!keyData) {
        throw new Error('Unauthorized: Invalid or missing API key');
    }
    return keyData;
}
