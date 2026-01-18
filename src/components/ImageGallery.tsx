"use client";

import { ImageRecord, Folder } from '@/lib/types';
import { Copy, Trash2, Check, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderCard } from './FolderCard';
import { VideoPlayer } from './VideoPlayer';
import { cn } from '@/lib/utils';

interface ImageGalleryProps {
    images: (ImageRecord & { avif?: any })[];
    folders?: Folder[];
    onDelete: (id: string) => void;
    onNavigate?: (folder: Folder) => void;
    onMoveImage?: (folderId: string, imageIds: string[]) => void;
    onDeleteFolder?: (folder: Folder) => void;
}

export function ImageGallery({ images, folders = [], onDelete, onNavigate, onMoveImage, onDeleteFolder }: ImageGalleryProps) {
    if (images.length === 0 && folders.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                <p className="text-xl font-semibold">No assets found</p>
                <p className="text-sm mt-2">Upload some images to get started</p>
            </div>
        );
    }

    return (
        <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
            <AnimatePresence mode='popLayout'>
                {/* Images in Masonry - Folders now stay in the Sidebar as per user feedback */}
                {images.map((image) => (
                    <ImageCard key={image.id} image={image} onDelete={onDelete} />
                ))}
            </AnimatePresence>
        </motion.div>
    );
}

function ImageCard({ image, onDelete }: { image: ImageRecord & { avif?: any }, onDelete: (id: string) => void }) {
    const isVideo = image.mime_type?.startsWith('video/');
    const [format, setFormat] = useState<'avif' | 'webp' | 'original' | 'compressed'>('original');
    const [size, setSize] = useState<'lg' | 'md' | 'sm' | 'thumb'>('lg');
    const [isHovered, setIsHovered] = useState(false);
    const [copied, setCopied] = useState(false);

    // Smart Truncate Helper
    const truncateFileName = (name: string, maxLength: number = 20) => {
        if (name.length <= maxLength) return name;
        const extIndex = name.lastIndexOf('.');
        if (extIndex === -1) return name.substring(0, maxLength) + '...';

        const ext = name.substring(extIndex);
        const namePart = name.substring(0, extIndex);

        if (namePart.length + ext.length <= maxLength) return name;

        const startLen = Math.ceil((maxLength - ext.length - 3) / 2);
        const endLen = Math.floor((maxLength - ext.length - 3) / 2);

        return `${namePart.substring(0, startLen)}...${namePart.substring(namePart.length - endLen)}${ext}`;
    };

    const getUrl = () => {
        if (isVideo && format === 'compressed') {
            return image.md_url || '';
        }

        // Direct Map Strategy - Much safer than string splitting
        if (format === 'original') {
            if (image.original_url) return image.original_url;

            // Reconstruction for fetched images
            if (image.md_url) {
                const parts = image.md_url.split('/webp/');
                if (parts.length === 2) {
                    const base = parts[0];
                    const ext = image.original_ext || 'jpg';
                    return `${base}/original/${image.id}.${ext}`;
                }
            }
            return '';
        }

        if (format === 'webp') {
            // Type-safe access for webp sizes
            const key = `${size}_url` as keyof ImageRecord;
            // @ts-ignore
            return image[key] || image.md_url || image.sm_url;
        }

        if (format === 'avif' && image.avif) {
            const key = `${size}`;
            return image.avif.urls?.[key] || image.avif.urls?.md;
        }

        // Fallback
        return image.md_url || image.sm_url || image.original_url || '';
    };

    // Helper for Preview Image Source (Optimize for Speed)
    const getPreviewSrc = () => {
        if (format === 'original') {
            return image.md_url || image.sm_url || image.thumb_url || getUrl();
        }
        return getUrl();
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

    // Drag Start Handler
    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('imageId', image.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const getSizeDisplay = () => {
        let bytes = 0;

        if (format === 'original') {
            bytes = image.original_size;
        } else if (format === 'webp') {
            // Use type assertion or optional chaining safely
            const sizeKey = `${size}_size` as keyof ImageRecord;
            // @ts-ignore - Dynamic access
            bytes = image[sizeKey] || 0;
        } else if (format === 'avif' && image.avif) {
            // Access avif data if available
            const sizeKey = `${size}_size`;
            // @ts-ignore - The avif object structure matches what we expect
            bytes = image.avif.sizes?.[size] || 0;
        }

        if (!bytes) return 'Unknown Size';

        return (bytes / 1024).toFixed(2) + ' KB';
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={cn(
                "group relative bg-zinc-900 border border-zinc-800/50 rounded-3xl overflow-hidden transition-all duration-500 hover:ring-2 hover:ring-white/10 hover:shadow-2xl",
                isHovered && "scale-[1.01]"
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={(e) => {
                // On mobile/touch this usually toggles, but we want to prevent navigation if we're showing the overlay
                if (window.innerWidth < 1024) {
                    setIsHovered(!isHovered);
                }
            }}
            draggable
            onDragStartCapture={handleDragStart}
        >
            <div className="relative w-full aspect-[4/5] overflow-hidden">
                {isVideo ? (
                    <VideoPlayer
                        src={getUrl()}
                        poster={getPreviewSrc()}
                        className="w-full h-full object-cover"
                        isMuted={!isHovered}
                    />
                ) : (
                    <a
                        href={getUrl()}
                        target="_blank"
                        rel="noreferrer"
                        className="block w-full h-full"
                        onClick={(e) => {
                            if (window.innerWidth < 1024) {
                                e.preventDefault();
                                setIsHovered(!isHovered);
                            }
                        }}
                    >
                        <img
                            src={getPreviewSrc()}
                            alt={image.original_name}
                            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-all duration-700 group-hover:scale-110"
                            loading="lazy"
                            draggable={false}
                        />
                    </a>
                )}

                {/* Glassy Overlay for Meta Data - Always visible but subtle */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                    <div className="px-3 py-1.5 bg-zinc-950/60 backdrop-blur-md rounded-full border border-white/5 flex items-center gap-2 pointer-events-none">
                        <span className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase">{image.original_ext}</span>
                        <div className="w-px h-3 bg-white/10" />
                        <span className="text-[10px] font-bold text-zinc-200 tracking-widest uppercase">
                            {format === 'original' ? 'RAW' : format}
                        </span>
                    </div>

                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(image.id); }}
                        className="p-2 bg-zinc-950/60 backdrop-blur-md border border-white/5 text-zinc-400 hover:text-red-400 rounded-full transition-all hover:scale-110 opacity-0 group-hover:opacity-100"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>

                {/* Expand Area on Hover - For videos we make it non-blocking */}
                <div
                    className={cn(
                        "absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-6 pointer-events-none",
                        isHovered && "opacity-100"
                    )}
                >
                    <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-500 pointer-events-auto">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex flex-col gap-1">
                                <span className="text-lg font-bold text-white leading-tight truncate max-w-[150px]" title={image.original_name}>
                                    {truncateFileName(image.original_name, 20)}
                                </span>
                                <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest">
                                    {image.width}x{image.height} • {getSizeDisplay()}
                                </span>
                            </div>

                            {/* Format Selector Pills */}
                            <div className="flex bg-white/10 rounded-full p-1 border border-white/10 backdrop-blur-2xl">
                                {isVideo ? (
                                    <>
                                        <button
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFormat('original'); }}
                                            className={`px-3 py-1 rounded-full text-[9px] font-bold tracking-wider transition-all ${format === 'original' ? 'bg-white text-black' : 'text-zinc-300 hover:text-white'}`}
                                        >
                                            RAW
                                        </button>
                                        <button
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFormat('compressed'); }}
                                            className={`px-3 py-1 rounded-full text-[9px] font-bold tracking-wider transition-all ${format === 'compressed' ? 'bg-white text-black' : 'text-zinc-300 hover:text-white'}`}
                                        >
                                            COMP
                                        </button>
                                    </>
                                ) : (
                                    ['original', 'webp', 'avif'].map((fmt) => (
                                        <button
                                            key={fmt}
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFormat(fmt as any); }}
                                            className={`px-3 py-1 rounded-full text-[9px] font-bold tracking-wider uppercase transition-all ${format === fmt ? 'bg-white text-black shadow-xl shadow-white/20' : 'text-zinc-300 hover:text-white'}`}
                                            disabled={fmt === 'avif' && !image.avif}
                                        >
                                            {fmt === 'original' ? 'RAW' : fmt}
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Animated Action Button */}
                        <button
                            onClick={handleCopy}
                            className="group/btn relative w-full overflow-hidden rounded-2xl bg-white p-3 font-bold text-black transition-all hover:bg-zinc-100"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2 text-sm">
                                {copied ? <Check className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
                                {copied ? 'Project Link Copied' : 'Share Asset'}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
