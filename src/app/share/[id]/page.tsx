import { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';
import { SharePageClient } from '@/app/share/[id]/SharePageClient';
import { formatBytes } from '@/lib/utils';

interface PageProps {
    params: Promise<{ id: string }>;
}

async function getAsset(idOrSlug: string) {
    // 1. Try UUID first (High Speed)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    
    if (isUuid) {
        const { data: asset } = await supabaseAdmin
            .from('assets')
            .select('*')
            .eq('id', idOrSlug)
            .single();
        if (asset) return asset;
    }

    // 2. Fallback to Original Name (Vanity Slug)
    // Note: We search for an exact match or a slugified match.
    // Since the CDN already uses original_name, this is the most compatible way.
    const { data: assets } = await supabaseAdmin
        .from('assets')
        .select('*')
        .eq('original_name', decodeURIComponent(idOrSlug))
        .limit(1);

    if (assets && assets.length > 0) return assets[0];

    return null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params;
    const asset = await getAsset(id);

    if (!asset) return { title: 'Asset Not Found | CloudSnap' };

    const title = `${asset.original_name} | CloudSnap`;
    const description = `Shared via CloudSnap • ${formatBytes(asset.original_size)} • ${asset.mime_type}`;
    // Use the CDN for the OG image with optimal dimensions for Discord/Slack
    const ogImage = `/api/cdn/${encodeURIComponent(asset.original_name || id)}?w=1200&fmt=webp`;

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            images: [{ url: ogImage, width: 1200, height: 630 }],
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [ogImage],
        },
    };
}

export default async function SharePage({ params }: PageProps) {
    const { id } = await params;
    const asset = await getAsset(id);

    if (!asset) notFound();

    return (
        <main className="min-h-screen bg-zinc-950 text-white selection:bg-indigo-500/30">
            <SharePageClient asset={asset} />
        </main>
    );
}
