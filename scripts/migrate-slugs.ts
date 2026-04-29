import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function slugify(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')     // Replace spaces with -
        .replace(/[^\w.-]+/g, '') // Remove all non-word chars (except . and -)
        .replace(/--+/g, '-')     // Replace multiple - with single -
        .replace(/^-+/, '')       // Trim - from start of text
        .replace(/-+$/, '');      // Trim - from end of text
}

async function migrate() {
    console.log('🚀 Starting migration: Slugifying all asset names...');

    const { data: assets, error } = await supabase
        .from('assets')
        .select('id, original_name');

    if (error) {
        console.error('Error fetching assets:', error);
        return;
    }

    console.log(`Found ${assets.length} assets to process.`);

    let updatedCount = 0;
    for (const asset of assets) {
        const slug = slugify(asset.original_name);
        
        if (slug !== asset.original_name) {
            const { error: updateError } = await supabase
                .from('assets')
                .update({ original_name: slug })
                .eq('id', asset.id);

            if (updateError) {
                console.error(`Failed to update ${asset.id}:`, updateError.message);
            } else {
                console.log(`✅ Updated: "${asset.original_name}" -> "${slug}"`);
                updatedCount++;
            }
        }
    }

    console.log(`\n🎉 Migration complete! Updated ${updatedCount} assets.`);
}

migrate();
