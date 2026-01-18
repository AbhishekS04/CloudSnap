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
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4"
        >
            <AnimatePresence mode='popLayout'>
                {/* Folders First */}
                {folders.map(folder => (
                    <FolderCard
                        key={`folder-${folder.id}`}
                        folder={folder}
                        onNavigate={(f) => onNavigate?.(f)}
                        onDropImages={(fid, ids) => onMoveImage?.(fid, ids)}
                        onDelete={onDeleteFolder}
                    />
                ))}

                {/* Then Images */}
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
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className={cn(
                "group relative bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl hover:border-zinc-700 hover:shadow-indigo-500/10 transition-colors",
                isHovered && "border-zinc-700 shadow-indigo-500/10"
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => setIsHovered(!isHovered)} // Tap to toggle on mobile
            draggable
            onDragStartCapture={handleDragStart}
        >
            {/* Media Area */}
            <div
                className="block aspect-video relative bg-zinc-950"
            >
                {isVideo ? (
                    <VideoPlayer
                        src={getUrl()}
                        poster={getPreviewSrc()}
                        className="w-full h-full"
                    />
                ) : (
                    <a href={getUrl()} target="_blank" rel="noreferrer" className="block w-full h-full">
                        <img
                            src={getPreviewSrc()}
                            alt={image.original_name}
                            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                            loading="lazy"
                            draggable={false}
                        />
                    </a>
                )}

                {/* Format Badge */}
                <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded-md border border-white/10 flex items-center gap-2 pointer-events-none">
                    <span className="text-[10px] font-mono text-zinc-300 uppercase">{image.original_ext}</span>
                    <div className="w-px h-3 bg-white/20" />
                    <span className={`text-[10px] font-mono font-bold ${format === 'original' ? 'text-indigo-400' : 'text-green-400'}`}>
                        {format.toUpperCase()}
                    </span>
                </div>

                {/* Controls Overlay */}
                <div
                    className={cn(
                        "absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-transform duration-300",
                        isHovered ? "translate-y-0" : "translate-y-full"
                    )}
                    onClick={(e) => e.stopPropagation()} // Prevent closing when interacting with overlay
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-white" title={image.original_name}>
                                {truncateFileName(image.original_name, 25)}
                            </span>
                            <span className="text-xs text-zinc-400 font-mono">
                                {image.width}x{image.height} • {getSizeDisplay()}
                            </span>
                        </div>

                        {/* Format Selector */}
                        <div className="flex bg-black/40 rounded-lg p-1 border border-white/10 backdrop-blur-md">
                            {isVideo ? (
                                <>
                                    <button
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFormat('original'); }}
                                        className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${format === 'original' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-zinc-400 hover:text-white'}`}
                                    >
                                        ORIG
                                    </button>
                                    <button
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFormat('compressed'); }}
                                        className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${format === 'compressed' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-zinc-400 hover:text-white'}`}
                                    >
                                        COMP
                                    </button>
                                </>
                            ) : (
                                ['original', 'webp', 'avif'].map((fmt) => (
                                    <button
                                        key={fmt}
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFormat(fmt as any); }}
                                        className={`px-2 py-1 rounded text-[10px] font-medium uppercase transition-colors ${format === fmt ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-zinc-400 hover:text-white'}`}
                                        disabled={fmt === 'avif' && !image.avif}
                                        title={fmt === 'avif' && !image.avif ? 'AVIF not available' : ''}
                                    >
                                        {fmt === 'original' ? 'ORIG' : fmt}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Copy Button */}
                    <button
                        onClick={handleCopy}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white text-black rounded-lg font-semibold text-xs hover:bg-zinc-200 transition-colors"
                    >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied ? 'Copied!' : 'Copy Link'}
                    </button>
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between">
                <div className="flex-1 min-w-0 mr-4">
                    <p className="text-sm font-medium text-white truncate" title={image.original_name}>
                        {truncateFileName(image.original_name, 20)}
                    </p>
                    <div className="flex items-center gap-2">
                        <p className="text-xs text-zinc-500 font-mono mt-0.5">
                            {getSizeDisplay()}
                        </p>
                    </div>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(image.id); }}
                    className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </motion.div>
    );
}
