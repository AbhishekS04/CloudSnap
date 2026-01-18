"use client";

import { ImageRecord, Folder } from '@/lib/types';
import { Copy, Trash2, Check, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderCard } from './FolderCard';

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
    const [format, setFormat] = useState<'avif' | 'webp' | 'original'>('original');
    const [size, setSize] = useState<'lg' | 'md' | 'sm' | 'thumb'>('lg');
    const [isHovered, setIsHovered] = useState(false);
    const [copied, setCopied] = useState(false);

    const getUrl = () => {
        // Direct Map Strategy - Much safer than string splitting
        if (format === 'original') {
            return image.original_url;
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
        return image.md_url || image.sm_url || image.original_url;
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
            className="group relative bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl hover:border-zinc-700 hover:shadow-indigo-500/10 transition-colors"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            draggable
            onDragStartCapture={handleDragStart}
        >
            {/* Image Area - Click to open raw */}
            <a
                href={getUrl()}
                target="_blank"
                rel="noreferrer"
                className="block aspect-video relative bg-zinc-950"
                onClick={(e) => e.stopPropagation()}
            >
                <img
                    src={format === 'original' ? image.original_url : format === 'webp' ? image.md_url : (image.avif?.urls?.md || image.md_url)}
                    alt={image.original_name}
                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                    loading="lazy"
                    draggable={false}
                />

                {/* Format Badge */}
                <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded-md border border-white/10 flex items-center gap-2">
                    <span className="text-[10px] font-mono text-zinc-300 uppercase">{image.original_ext}</span>
                    <div className="w-px h-3 bg-white/20" />
                    <span className={`text-[10px] font-mono font-bold ${format === 'original' ? 'text-indigo-400' : 'text-green-400'}`}>
                        {format.toUpperCase()}
                    </span>
                </div>

                {/* Controls Overlay */}
                <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200 flex flex-col items-center justify-center gap-4 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>

                    {/* Format Toggles */}
                    <div className="flex bg-black/50 rounded-lg p-1 border border-zinc-800">
                        {(['avif', 'webp', 'original'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFormat(f); }}
                                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors uppercase ${format === f ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                            >
                                {f === 'original' ? 'orig' : f}
                            </button>
                        ))}
                    </div>

                    {/* Size Toggles - Hide for original if you want, but user might want to resize original? No, original is original sized. */}
                    {format !== 'original' && (
                        <div className="flex bg-black/50 rounded-lg p-1 border border-zinc-800">
                            {(['lg', 'md', 'sm', 'thumb'] as const).map((s) => (
                                <button
                                    key={s}
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSize(s); }}
                                    className={`px-2 py-1 rounded-md text-[10px] font-bold transition-colors uppercase ${size === s ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Copy Button */}
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg font-semibold text-xs hover:bg-zinc-200 transition-colors"
                    >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied ? 'Copied!' : 'Copy Link'}
                    </button>
                </div>
            </a>

            {/* Footer */}
            <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between">
                <div className="flex-1 min-w-0 mr-4">
                    <p className="text-sm font-medium text-white truncate" title={image.original_name}>
                        {image.original_name}
                    </p>
                    <div className="flex items-center gap-2">
                        <p className="text-xs text-zinc-500 font-mono mt-0.5">
                            {getSizeDisplay()}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => onDelete(image.id)}
                    className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </motion.div>
    );
}
