"use client";

import { ImageRecord, Folder } from '@/lib/types';
import { Copy, Trash2, Check, ExternalLink, Download, FileText, Share2, File, Archive, Link as LinkIcon, Edit2, X } from 'lucide-react';
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
    onRename?: (id: string, newName: string, cdnUrl?: string) => void;
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
    onRename,
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
    onRename,
    isTrial 
}: { 
    image: ImageRecord & { avif?: any }, 
    onDelete: (id: string) => void,
    onRename?: (id: string, newName: string, cdnUrl?: string) => void,
    isTrial?: boolean 
}) {
    const [isRenaming, setIsRenaming] = useState(false);
    const splitName = (fullName: string) => {
        const extIndex = fullName.lastIndexOf('.');
        if (extIndex === -1) return { name: fullName, ext: '' };
        return {
            name: fullName.substring(0, extIndex),
            ext: fullName.substring(extIndex)
        };
    };
    const initialParts = splitName(image.original_name);
    const [newName, setNewName] = useState(initialParts.name);
    const [extension] = useState(initialParts.ext);
    const [isSavingName, setIsSavingName] = useState(false);

    const isVideo = image.mime_type?.startsWith('video/');
    const isPDF = image.mime_type === 'application/pdf';
    const isArchive = image.mime_type?.includes('zip') || image.mime_type?.includes('tar') || image.mime_type?.includes('rar');
    const isImage = image.mime_type?.startsWith('image/');
    const isGenericFile = !isImage && !isVideo && !isPDF && !isArchive;
    const [format, setFormat] = useState<'avif' | 'webp' | 'original' | 'compressed'>('original');
    const [size, setSize] = useState<'lg' | 'md' | 'sm' | 'thumb'>('lg');
    const [isHovered, setIsHovered] = useState(false);
    const [shareCopied, setShareCopied] = useState(false);
    const [directCopied, setDirectCopied] = useState(false);

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
        const baseUrl = image.original_url || `/api/cdn/${encodeURIComponent(image.original_name || image.id)}`;

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

    const handleRename = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const fullName = `${newName}${extension}`;
        if (!newName || fullName === image.original_name) {
            setIsRenaming(false);
            return;
        }

        setIsSavingName(true);
        try {
            const response = await fetch(`/api/assets/${image.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: fullName })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to rename');
            }
            
            const data = await response.json();
            if (onRename) onRename(image.id, data.name, data.cdnUrl);
            setIsRenaming(false);
        } catch (err) {
            console.error('Rename failed', err);
            const parts = splitName(image.original_name);
            setNewName(parts.name);
        } finally {
            setIsSavingName(false);
        }
    };

    const handleCopyShare = async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        try {
            // Copy the share landing page URL
            const shareUrl = `${window.location.origin}/share/${image.id}`;
            await navigator.clipboard.writeText(shareUrl);
            setShareCopied(true);
            setTimeout(() => setShareCopied(false), 2000);
        } catch (err) {
            console.error('Share copy failed', err);
        }
    };

    const handleCopyDirect = async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        try {
            // Copy the direct CDN URL with current transforms
            const directUrl = `${window.location.origin}${getUrl()}`;
            await navigator.clipboard.writeText(directUrl);
            setDirectCopied(true);
            setTimeout(() => setDirectCopied(false), 2000);
        } catch (err) {
            console.error('Direct link copy failed', err);
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
            layout="position"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, filter: "blur(8px)", transition: { duration: 0.2 } }}
            transition={{ 
                layout: { type: "spring", stiffness: 400, damping: 30 },
                opacity: { duration: 0.2 }
            }}
            className="group relative bg-zinc-950 border border-white/5 rounded-[2rem] overflow-hidden hover:border-white/10 transition-colors duration-500 shadow-2xl isolate"
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
                            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-all duration-700 group-hover:scale-110"
                            loading="lazy"
                            draggable={false}
                        />
                    </a>
                )}
                
                {/* Trial Badge */}
                <AnimatePresence>
                    {isTrial && (
                        <motion.div 
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="absolute top-4 left-1/2 -translate-x-1/2 z-[20] flex items-center gap-1.5 px-3 py-1 bg-blue-600 shadow-xl shadow-blue-600/20 rounded-full border border-blue-400/30"
                        >
                            <Check className="w-3 h-3 text-white" />
                            <span className="text-[9px] font-black text-white uppercase tracking-[0.2em]">Trial Upload</span>
                        </motion.div>
                    )}
                </AnimatePresence>


                {/* Glassy Overlay for Meta Data */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20">
                    <div className="px-3 py-1.5 bg-black/40 backdrop-blur-xl rounded-full border border-white/10 flex items-center gap-2 pointer-events-none">
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

                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-[-10px] group-hover:translate-y-0">
                        <button
                            onClick={handleDownload}
                            className="p-2.5 bg-black/40 backdrop-blur-xl border border-white/10 text-zinc-400 hover:text-white rounded-full transition-all active:scale-90 hover:bg-white/10"
                            title="Download"
                        >
                            <Download className="w-4 h-4" />
                        </button>
                        <button
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                const parts = splitName(image.original_name);
                                setNewName(parts.name);
                                setIsRenaming(true); 
                            }}
                            className="p-2.5 bg-black/40 backdrop-blur-xl border border-white/10 text-zinc-400 hover:text-white rounded-full transition-all active:scale-90 hover:bg-white/10"
                            title="Rename"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(image.id); }}
                            className="p-2.5 bg-black/40 backdrop-blur-xl border border-white/10 text-zinc-400 hover:text-red-400 rounded-full transition-all active:scale-90 hover:bg-red-500/20"
                            title="Delete"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Main Interaction Area */}
                <div
                    className={cn(
                        "absolute inset-0 bg-gradient-to-t from-black/100 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-6 pointer-events-none group-hover:pointer-events-auto",
                        isHovered && "opacity-100 pointer-events-auto"
                    )}
                >
                    <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                        <div className="flex flex-col gap-4 mb-6">
                            <div className="flex flex-col gap-1.5">
                                <AnimatePresence mode="wait">
                                    {isRenaming ? (
                                        <motion.div 
                                            key="rename"
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 10 }}
                                            className="w-full relative flex items-center gap-2"
                                        >
                                            <div className="relative flex-1 flex items-center">
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    value={newName}
                                                    onChange={(e) => setNewName(e.target.value.replace(/\s+/g, '-'))}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Escape') setIsRenaming(false);
                                                        if (e.key === 'Enter') handleRename();
                                                    }}
                                                    disabled={isSavingName}
                                                    className="w-full bg-black/60 backdrop-blur-2xl border border-white/20 rounded-xl pl-4 pr-14 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20 shadow-2xl placeholder:text-zinc-500"
                                                    placeholder="Enter name..."
                                                />
                                                <span className="absolute right-4 text-[10px] font-black text-zinc-500 pointer-events-none select-none uppercase tracking-tighter">
                                                    {format === 'original' ? extension.replace('.', '') : format}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsRenaming(false); }}
                                                className="p-2.5 bg-black/60 backdrop-blur-2xl border border-white/20 rounded-xl text-zinc-400 hover:text-white transition-all active:scale-90 shadow-2xl"
                                                title="Cancel"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </motion.div>
                                    ) : (
                                        <motion.span 
                                            key="name"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="text-lg sm:text-xl font-bold text-white leading-tight truncate tracking-tight" 
                                            title={image.original_name}
                                        >
                                            {truncateFileName(image.original_name, 24)}
                                        </motion.span>
                                    )}
                                </AnimatePresence>

                                <div className="flex items-center gap-2">
                                    {image.width && image.height && !isPDF && (
                                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                                            {image.width}x{image.height}
                                        </span>
                                    )}
                                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">
                                        {getSizeDisplay()}
                                    </span>
                                </div>
                            </div>

                            {/* Format Selector Pills */}
                            {isImage && (
                                <div className="flex bg-black/40 rounded-full p-1 border border-white/10 backdrop-blur-2xl w-fit">
                                    {['original', 'webp', 'avif'].map((fmt) => (
                                        <button
                                            key={fmt}
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFormat(fmt as any); }}
                                            className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-[0.15em] uppercase transition-all whitespace-nowrap ${format === fmt ? 'bg-white text-black shadow-xl shadow-white/20' : 'text-zinc-400 hover:text-white'}`}
                                        >
                                            {fmt === 'original' ? 'RAW' : fmt}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {isVideo && (
                                <div className="flex bg-black/40 rounded-full p-1 border border-white/10 backdrop-blur-2xl w-fit">
                                    <button
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFormat('original'); }}
                                        className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-[0.15em] transition-all whitespace-nowrap ${format === 'original' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
                                    >
                                        RAW
                                    </button>
                                    <button
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFormat('compressed'); }}
                                        className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-[0.15em] transition-all whitespace-nowrap ${format === 'compressed' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
                                    >
                                        COMP
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Dual Action Buttons */}
                        <div className="flex gap-2 w-full">
                            <button
                                onClick={handleCopyShare}
                                className="flex-1 group/btn relative overflow-hidden rounded-2xl bg-zinc-900/80 hover:bg-zinc-800/80 backdrop-blur-3xl border border-white/10 p-3.5 font-bold text-white transition-all active:scale-95"
                                title="Share Asset Page"
                            >
                                <span className="relative z-10 flex items-center justify-center gap-2 text-sm">
                                    {shareCopied ? <Check className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4" />}
                                    <span className="hidden sm:inline">
                                        {shareCopied ? 'Copied' : 'Share'}
                                    </span>
                                </span>
                            </button>

                            <button
                                onClick={handleCopyDirect}
                                className="flex-1 group/btn relative overflow-hidden rounded-2xl bg-white p-3.5 font-bold text-black transition-all hover:bg-zinc-100 active:scale-95 shadow-xl shadow-white/10"
                                title="Copy Direct CDN Link"
                            >
                                <span className="relative z-10 flex items-center justify-center gap-2 text-sm">
                                    {directCopied ? <Check className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
                                    <span className="hidden sm:inline">
                                        {directCopied ? 'Copied' : 'Copy Link'}
                                    </span>
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
