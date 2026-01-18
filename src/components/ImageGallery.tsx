"use client";

import { ImageRecord } from '@/lib/types';
import { formatBytes } from '@/lib/utils';
import { Copy, Trash2, ExternalLink, Image as ImageIcon, Check, ChevronDown, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ImageGalleryProps {
    images: (ImageRecord & { avif?: any })[];
    onDelete: (id: string) => void;
}

export function ImageGallery({ images, onDelete }: ImageGalleryProps) {
    if (images.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-32 text-zinc-500">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <ImageIcon className="w-16 h-16 mb-4 opacity-20" />
                </motion.div>
                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-lg font-light"
                >
                    Drop images anywhere to upload
                </motion.p>
            </div>
        );
    }

    return (
        <motion.div
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-4"
        >
            <AnimatePresence mode='popLayout'>
                {images.map((image) => (
                    <ImageCard key={image.id} image={image} onDelete={onDelete} />
                ))}
            </AnimatePresence>
        </motion.div>
    );
}

function ImageCard({ image, onDelete }: { image: ImageRecord & { avif?: any }, onDelete: (id: string) => void }) {
    const [format, setFormat] = useState<'avif' | 'webp'>('avif');
    const [size, setSize] = useState<'lg' | 'md' | 'sm' | 'thumb'>('lg');
    const [isHovered, setIsHovered] = useState(false);
    const [copied, setCopied] = useState(false);

    const getUrl = () => {
        let url = image[`${size}_url` as keyof ImageRecord] as string;

        // Safety check
        if (!url && size === 'lg') url = image.md_url; // Fallback

        if (format === 'avif') {
            // Construct AVIF URL based on convention
            const parts = image.thumb_url.split('/webp/');
            if (parts.length > 0) {
                return `${parts[0]}/avif/${size}/${image.id}.avif`;
            }
        }
        return url;
    };

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        try {
            await navigator.clipboard.writeText(getUrl());
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Copy failed', err);
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="group relative bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl hover:border-zinc-700 hover:shadow-indigo-500/10 transition-colors"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Image Area */}
            <a
                href={getUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="block aspect-[4/3] relative bg-zinc-950 overflow-hidden cursor-zoom-in"
                onClick={(e) => isHovered && e.preventDefault()} // Prevent click when interacting with controls? No, let click open image, buttons handle their own.
            >
                <div className="absolute inset-0 bg-zinc-800 animate-pulse" /> {/* Skeleton placeholder underneath */}

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={image.sm_url}
                    alt={image.original_name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-in-out group-hover:scale-105 opacity-90 group-hover:opacity-100"
                />

                {/* Delete Button */}
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(image.id); }}
                    className="absolute top-3 right-3 p-2 bg-black/40 hover:bg-red-500 text-white/70 hover:text-white rounded-full opacity-0 group-hover:opacity-100 backdrop-blur-md transition-all border border-white/10"
                    title="Delete Image"
                >
                    <Trash2 className="w-4 h-4" />
                </motion.button>
            </a>

            {/* Hover Control Bar */}
            <motion.div
                initial={false}
                animate={{ y: isHovered ? 0 : '100%' }}
                transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                className="absolute bottom-0 left-0 right-0 bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-800 p-3.5 flex items-center justify-between gap-2 z-10"
            >
                {/* Controls Group */}
                <div className="flex items-center gap-2">
                    {/* Size Selector */}
                    <div className="relative">
                        <select
                            value={size}
                            onChange={(e) => setSize(e.target.value as any)}
                            className="appearance-none bg-zinc-900 text-[10px] font-bold text-zinc-300 border border-zinc-700 rounded-lg pl-2 pr-6 py-1.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer hover:bg-zinc-800 transition-colors uppercase tracking-wider"
                        >
                            <option value="lg">LG (2K)</option>
                            <option value="md">MD (1.2K)</option>
                            <option value="sm">SM (600)</option>
                            <option value="thumb">TH (200)</option>
                        </select>
                        <ChevronDown className="w-3 h-3 text-zinc-500 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {/* Format Toggles */}
                    <div className="flex bg-zinc-900 rounded-lg border border-zinc-700 p-0.5">
                        {(['avif', 'webp'] as const).map((fmt) => (
                            <button
                                key={fmt}
                                onClick={() => setFormat(fmt)}
                                className={`text-[9px] px-2 py-1 rounded-[4px] font-bold uppercase transition-all ${format === fmt
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                                    }`}
                            >
                                {fmt}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Copy Button */}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleCopy}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-lg ${copied
                            ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                            : 'bg-white text-zinc-950 hover:bg-zinc-200'
                        }`}
                >
                    {copied ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                        <Copy className="w-3.5 h-3.5" />
                    )}
                    {copied ? 'COPIED' : 'COPY'}
                </motion.button>
            </motion.div>

            {/* Minimal Info (Visible when NOT hovered) */}
            <motion.div
                animate={{ opacity: isHovered ? 0 : 1, y: isHovered ? 10 : 0 }}
                className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none"
            >
                <h4 className="text-white text-sm font-medium truncate drop-shadow-sm">{image.original_name}</h4>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-zinc-300 font-mono bg-white/10 px-1.5 py-0.5 rounded backdrop-blur-sm">
                        {formatBytes(image.original_size)}
                    </span>
                </div>
            </motion.div>
        </motion.div>
    );
}
