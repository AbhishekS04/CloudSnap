"use client";

import { ImageRecord, Folder } from '@/lib/types';
import { Copy, Trash2, Check, ExternalLink, Download, FileText, Share2, File, Archive } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderCard } from './FolderCard';
import { VideoPlayer } from './VideoPlayer';
import { cn } from '@/lib/utils';

interface ImageGalleryProps {
    images: (ImageRecord & { avif?: any })[];
    filterType?: 'all' | 'photos' | 'videos' | 'documents';
    folders?: Folder[];
    onDelete: (id: string) => void;
    onNavigate?: (folder: Folder) => void;
    onMoveImage?: (folderId: string, imageIds: string[]) => void;
    onDeleteFolder?: (folder: Folder) => void;
    userRole?: 'ADMIN' | 'DEMO';
    currentUserId?: string;
}


export function ImageGallery({ 
    images, 
    filterType = 'all', 
    folders = [], 
    onDelete, 
    onNavigate, 
    onMoveImage, 
    onDeleteFolder,
    userRole,
    currentUserId
}: ImageGalleryProps) {

    const displayedImages = images.filter(img => {
        if (filterType === 'photos') return img.mime_type.startsWith('image/');
        if (filterType === 'videos') return img.mime_type.startsWith('video/');
        if (filterType === 'documents') return img.mime_type === 'application/pdf';
        return true;
    });

    if (displayedImages.length === 0 && folders.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                <p className="text-xl font-semibold">No {filterType === 'all' ? 'assets' : filterType} found</p>
                <p className="text-sm mt-2">Upload some files to get started</p>
            </div>
        );
    }

    return (
        <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
            <AnimatePresence mode='popLayout'>
                {displayedImages.map((image) => (
                    <ImageCard 
                        key={image.id} 
                        image={image} 
                        onDelete={onDelete} 
                        isTrial={userRole === 'DEMO' && !!currentUserId && image.user_id === currentUserId}
                    />
                ))}
            </AnimatePresence>
        </motion.div>

    );
}

function ImageCard({ 
    image, 
    onDelete, 
    isTrial 
}: { 
    image: ImageRecord & { avif?: any }, 
    onDelete: (id: string) => void,
    isTrial?: boolean 
}) {

    const isVideo = image.mime_type?.startsWith('video/');
    const isPDF = image.mime_type === 'application/pdf';
    const isArchive = image.mime_type?.includes('zip') || image.mime_type?.includes('tar') || image.mime_type?.includes('rar');
    const isImage = image.mime_type?.startsWith('image/');
    const isGenericFile = !isImage && !isVideo && !isPDF && !isArchive;
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
        const baseUrl = image.original_url || `/api/cdn/${image.id}`;

        if (isVideo) {
            return format === 'compressed' ? (image.md_url || baseUrl) : baseUrl;
        }

        if (format === 'original') return baseUrl;

        // Construct dynamic transform URL for optimized formats
        const width = size === 'lg' ? '' : size === 'md' ? '1200' : size === 'sm' ? '600' : '200';
        const params = new URLSearchParams();
        if (width) params.set('w', width);
        params.set('fmt', format === 'avif' ? 'avif' : 'webp');
        
        return `${baseUrl}?${params.toString()}`;
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
            // Copy the public share page URL
            const shareUrl = `${window.location.origin}/share/${image.id}`;
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Copy failed', err);
        }
    };

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        const url = getUrl();
        const downloadUrl = url.includes('?') ? `${url}&dl=1` : `${url}?dl=1`;
        // Create a temporary link and click it to trigger download
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = image.original_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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

        if (!bytes) return 'CDN Optimized';

        return (bytes / 1024).toFixed(2) + ' KB';
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ 
                type: "spring", 
                damping: 25, 
                stiffness: 300,
                layout: { duration: 0.4, ease: "easeOut" }
            }}
            className={cn(
                "group relative bg-zinc-900 border border-zinc-800/50 rounded-3xl overflow-hidden hover:ring-2 hover:ring-white/10 hover:shadow-2xl",
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
                ) : isPDF ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 p-8">
                        <div className="relative group/pdf">
                            <FileText className="w-20 h-20 text-red-500/80 group-hover:text-red-500 transition-colors duration-500" />
                            <div className="absolute -bottom-2 -right-2 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-xl">PDF</div>
                        </div>
                        <span className="mt-6 text-zinc-500 text-xs font-medium text-center line-clamp-2 px-4">{image.original_name}</span>
                    </div>
                ) : isArchive ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 p-8">
                        <div className="relative group/zip">
                            <Archive className="w-20 h-20 text-amber-500/80 group-hover:text-amber-500 transition-colors duration-500" />
                            <div className="absolute -bottom-2 -right-2 bg-amber-600 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-xl">ZIP</div>
                        </div>
                        <span className="mt-6 text-zinc-500 text-xs font-medium text-center line-clamp-2 px-4">{image.original_name}</span>
                    </div>
                ) : isGenericFile ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 p-8">
                        <div className="relative group/file">
                            <File className="w-20 h-20 text-zinc-600 group-hover:text-zinc-400 transition-colors duration-500" />
                            <div className="absolute -bottom-2 -right-2 bg-zinc-700 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-xl">FILE</div>
                        </div>
                        <span className="mt-6 text-zinc-500 text-xs font-medium text-center line-clamp-2 px-4">{image.original_name}</span>
                    </div>
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
                            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-all duration-700 group-hover:scale-105"
                            loading="lazy"
                            draggable={false}
                        />
                    </a>
                )}
                
                {/* Trial Badge */}
                {isTrial && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[20] flex items-center gap-1.5 px-3 py-1 bg-blue-600 shadow-xl shadow-blue-600/20 rounded-full border border-blue-400/30 animate-in fade-in zoom-in duration-500">
                        <Check className="w-3 h-3 text-white" />
                        <span className="text-[9px] font-black text-white uppercase tracking-[0.2em]">Trial Upload</span>
                    </div>
                )}


                {/* Glassy Overlay for Meta Data - Always visible but subtle */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                    <div className="px-3 py-1.5 bg-zinc-950/60 backdrop-blur-md rounded-full border border-white/5 flex items-center gap-2 pointer-events-none">
                        <span className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase">{image.original_ext || (isPDF ? 'PDF' : isArchive ? 'ZIP' : 'FILE')}</span>
                        {isImage && (
                            <>
                                <div className="w-px h-3 bg-white/10" />
                                <span className="text-[10px] font-bold text-zinc-200 tracking-widest uppercase">
                                    {format === 'original' ? 'RAW' : format}
                                </span>
                            </>
                        )}
                    </div>

                    <div className="flex gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-300">
                        <button
                            onClick={handleDownload}
                            className="p-2.5 bg-zinc-950/60 backdrop-blur-md border border-white/5 text-zinc-400 hover:text-white rounded-full transition-all active:scale-95 lg:hover:scale-110"
                            title="Download"
                        >
                            <Download className="w-4 h-4" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(image.id); }}
                            className="p-2.5 bg-zinc-950/60 backdrop-blur-md border border-white/5 text-zinc-400 hover:text-red-400 rounded-full transition-all active:scale-95 lg:hover:scale-110"
                            title="Delete"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Expand Area on Hover - For videos we make it non-blocking */}
                <div
                    className={cn(
                        "absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent lg:bg-black/40 lg:backdrop-blur-[2px] opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-5 sm:p-6 pointer-events-auto lg:pointer-events-none",
                        isHovered && "lg:opacity-100 lg:pointer-events-auto"
                    )}
                >
                    <div className="translate-y-0 lg:translate-y-4 lg:group-hover:translate-y-0 transition-transform duration-500 pointer-events-auto">
                        <div className="flex flex-col gap-4 mb-5">
                            <div className="flex flex-col gap-1.5">
                                <span className="text-base sm:text-lg font-bold text-white leading-tight truncate" title={image.original_name}>
                                    {truncateFileName(image.original_name, 22)}
                                </span>
                                <div className="flex items-center gap-2">
                                    {!isPDF && (
                                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                                            {image.width}x{image.height}
                                        </span>
                                    )}
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                        {getSizeDisplay()}
                                    </span>
                                </div>
                            </div>

                            {/* Format Selector Pills - Dedicated Row */}
                            {isImage && (
                                <div className="flex bg-white/10 rounded-full p-1 border border-white/10 backdrop-blur-2xl w-fit">
                                    {['original', 'webp', 'avif'].map((fmt) => (
                                        <button
                                            key={fmt}
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFormat(fmt as any); }}
                                            className={`px-3 py-1.5 rounded-full text-[9px] font-bold tracking-wider uppercase transition-all whitespace-nowrap ${format === fmt ? 'bg-white text-black shadow-xl shadow-white/20' : 'text-zinc-300 hover:text-white'}`}
                                        >
                                            {fmt === 'original' ? 'RAW' : fmt}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {isVideo && (
                                <div className="flex bg-white/10 rounded-full p-1 border border-white/10 backdrop-blur-2xl w-fit">
                                    <button
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFormat('original'); }}
                                        className={`px-3 py-1.5 rounded-full text-[9px] font-bold tracking-wider transition-all whitespace-nowrap ${format === 'original' ? 'bg-white text-black' : 'text-zinc-300 hover:text-white'}`}
                                    >
                                        RAW
                                    </button>
                                    <button
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFormat('compressed'); }}
                                        className={`px-3 py-1.5 rounded-full text-[9px] font-bold tracking-wider transition-all whitespace-nowrap ${format === 'compressed' ? 'bg-white text-black' : 'text-zinc-300 hover:text-white'}`}
                                    >
                                        COMP
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Animated Action Button */}
                        <button
                            onClick={handleCopy}
                            className="group/btn relative w-full overflow-hidden rounded-2xl bg-white p-3 font-bold text-black transition-all hover:bg-zinc-100"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2 text-sm">
                                {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                                {copied ? 'Link Copied' : 'Share Asset'}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
