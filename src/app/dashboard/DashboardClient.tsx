"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { UploadZone } from '@/components/UploadZone';
import { ImageGallery } from '@/components/ImageGallery';
import { ImageRecord, Folder, UploadResponse } from '@/lib/types';
import { Plus, UploadCloud, X, FolderPlus, ChevronRight, Home, Cloud, Menu, Minimize2 } from 'lucide-react';
import { useUser } from "@clerk/nextjs";
import { ClientUserButton } from "@/components/ClientUserButton";
import { useImageUpload } from '@/hooks/useImageUpload';
import { motion, AnimatePresence } from 'framer-motion';
import { parseDropEvent } from '@/lib/upload-utils';
import { DeleteConfirmationModal } from '@/components/DeleteConfirmationModal';
import { Sidebar } from '@/components/Sidebar';
import { cn } from '@/lib/utils';
import RefreshIcon from '@/components/icons/RefreshIcon';
import { AnimatedIconHandle } from '@/components/icons/types';
import { UploadFAB } from '@/components/UploadFAB';

export default function DashboardClient() {
    const [images, setImages] = useState<(ImageRecord & { avif?: any })[]>([]);
    const [subFolders, setSubFolders] = useState<Folder[]>([]);
    const [allFolders, setAllFolders] = useState<Folder[]>([]);
    const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);
    const [filterType, setFilterType] = useState<'all' | 'photos' | 'videos'>('all');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [isUploadMinimized, setIsUploadMinimized] = useState(false);
    const autoMinimizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const { user } = useUser();

    // Storage refresh key
    const [storageRefreshKey, setStorageRefreshKey] = useState(0);

    // Auto-refresh state
    const refreshIconRef = useRef<AnimatedIconHandle>(null);

    // Global DnD state
    const [isGlobalDragOver, setIsGlobalDragOver] = useState(false);

    // Confirmation Modal States
    const [deleteConfig, setDeleteConfig] = useState<{
        isOpen: boolean;
        type: 'image' | 'folder';
        id: string;
        name: string;
    }>({ isOpen: false, type: 'image', id: '', name: '' });

    // New Folder UI state
    const [showFolderModal, setShowFolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const { uploadFile, uploadUrl, isUploading, progress, uploadedBytes, totalBytes } = useImageUpload({
        onUploadComplete: (data) => {
            // API shape: { id, cdnUrl, urls: { original, thumb, sm, md, lg }, meta: { originalName, mimeType, width, height, originalSize } }
            const response = data as any;
            const cdnUrl: string = response.cdnUrl || `/api/cdn/${response.id}`;
            const meta = response.meta || {};
            const urls = response.urls || {};

            const originalName: string = meta.originalName || 'asset';
            const dotIdx = originalName.lastIndexOf('.');
            const ext = dotIdx !== -1 ? originalName.slice(dotIdx + 1) : 'bin';
            const name = dotIdx !== -1 ? originalName.slice(0, dotIdx) : originalName;

            const newImage: ImageRecord & { avif: any } = {
                id: response.id,
                created_at: new Date().toISOString(),
                original_name: originalName,
                original_ext: ext,
                original_url: cdnUrl,
                mime_type: meta.mimeType || 'application/octet-stream',
                width: meta.width || null,
                height: meta.height || null,
                original_size: meta.originalSize || 0,
                thumb_url: urls.thumb || cdnUrl,
                sm_url: urls.sm || cdnUrl,
                md_url: urls.md || cdnUrl,
                lg_url: urls.lg || cdnUrl,
                thumb_size: 0,
                sm_size: 0,
                md_size: 0,
                lg_size: 0,
                optimized_format: 'webp',
                avif: null,
                folder_id: currentFolder?.id || null
            };

            setImages(prev => [newImage, ...prev]);
            setShowUploadModal(false);
            setIsUploadMinimized(false);
            if (autoMinimizeTimerRef.current) clearTimeout(autoMinimizeTimerRef.current);
            // Refresh storage indicator
            setStorageRefreshKey(prev => prev + 1);
        }
    });

    const fetchData = useCallback(async () => {
        try {
            const queryParams = new URLSearchParams({ limit: '100' });
            if (currentFolder?.id) {
                queryParams.set('folder_id', currentFolder.id);
            }
            // If currentFolder is null, we don't send folder_id, so API returns all images (global view)

            const imgRes = await fetch(`/api/images?${queryParams}`);
            let imgs = await imgRes.json();

            if (Array.isArray(imgs)) {
                if (filterType === 'photos') {
                    imgs = imgs.filter(img => img.mime_type.startsWith('image/'));
                } else if (filterType === 'videos') {
                    imgs = imgs.filter(img => img.mime_type.startsWith('video/'));
                }
                setImages(imgs);
            }

            // Fetch all folders for the sidebar tree
            const allRes = await fetch('/api/folders?all=true');
            const folders = await allRes.json();
            if (Array.isArray(folders)) setAllFolders(folders);
        } catch (err) {
            console.error("Failed to fetch data", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [currentFolder, filterType]);

    useEffect(() => {
        fetchData();

        // Auto-refresh every 15 seconds
        const interval = setInterval(() => {
            refreshIconRef.current?.startAnimation();
            fetchData();
        }, 15000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        setRefreshing(true);
        try {
            const res = await fetch('/api/folders', {
                method: 'POST',
                body: JSON.stringify({
                    name: newFolderName,
                    parent_id: (currentFolder && currentFolder.id !== 'null') ? currentFolder.id : null
                })
            });
            if (res.ok) {
                setNewFolderName('');
                setShowFolderModal(false);
                fetchData();
            } else {
                const data = await res.json();
                alert(data.error || "Failed to create folder");
                setRefreshing(false);
            }
        } catch (err) {
            console.error(err);
            setRefreshing(false);
        }
    };

    const handleMoveImage = async (targetFolderId: string, imageIds: string[]) => {
        setRefreshing(true);
        try {
            const res = await fetch('/api/images/move', {
                method: 'POST',
                body: JSON.stringify({ folderId: targetFolderId, imageIds })
            });
            if (res.ok) fetchData();
            else setRefreshing(false);
        } catch (err) {
            console.error(err);
            setRefreshing(false);
        }
    };

    const confirmDelete = (type: 'image' | 'folder', id: string, name: string) => {
        setDeleteConfig({ isOpen: true, type, id, name });
    };

    const handleDeleteExecute = async () => {
        const { type, id } = deleteConfig;
        setRefreshing(true);
        try {
            const endpoint = type === 'image' ? `/api/images?id=${id}` : `/api/folders?id=${id}`;
            const res = await fetch(endpoint, { method: 'DELETE' });
            if (res.ok) {
                if (type === 'image') setImages(prev => prev.filter(img => img.id !== id));
                fetchData();
            } else {
                const json = await res.json();
                alert(json.error || `Failed to delete ${type}`);
            }
        } catch (err) {
            console.error(`Failed to delete ${type}`, err);
        } finally {
            setRefreshing(false);
        }
    };

    // Drag counter for robust detection
    const dragCounter = useRef(0);

    useEffect(() => {
        const handleDragEnter = (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            dragCounter.current += 1;
            if (e.dataTransfer?.types && (e.dataTransfer.types.includes('Files') || e.dataTransfer.types.includes('text/uri-list') || e.dataTransfer.types.includes('text/plain'))) {
                setIsGlobalDragOver(true);
            }
        };

        const handleDragLeave = (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            dragCounter.current -= 1;
            if (dragCounter.current <= 0) {
                setIsGlobalDragOver(false);
                dragCounter.current = 0; // reset to be safe
            }
        };

        const handleDragOver = (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            // Crucial: this enables drop
        };

        const handleWindowDrop = async (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setIsGlobalDragOver(false);
            dragCounter.current = 0;

            const { files, url } = await parseDropEvent(e as unknown as React.DragEvent);
            if (files.length > 0) {
                const mediaFiles = files.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
                for (const file of mediaFiles) await uploadFile(file, currentFolder?.id);
            } else if (url) {
                await uploadUrl(url, currentFolder?.id);
            }
        };

        window.addEventListener('dragenter', handleDragEnter);
        window.addEventListener('dragleave', handleDragLeave);
        window.addEventListener('dragover', handleDragOver);
        window.addEventListener('drop', handleWindowDrop);

        return () => {
            window.removeEventListener('dragenter', handleDragEnter);
            window.removeEventListener('dragleave', handleDragLeave);
            window.removeEventListener('dragover', handleDragOver);
            window.removeEventListener('drop', handleWindowDrop);
        };
    }, [currentFolder, uploadFile, uploadUrl]);

    // Cleanup old handlers - not needed on div anymore
    // const handleDragOver = ...
    // const handleDragLeave = ...
    // const handleDrop = ...

    return (
        <div
            className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-indigo-500/30"
        // Handlers removed from here
        >
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                folders={allFolders}
                currentFolder={currentFolder}
                filterType={filterType}
                onNavigate={(folder) => {
                    setCurrentFolder(folder);
                    setFilterType('all');
                }}
                onSetFilter={setFilterType}
                onCreateFolder={() => setShowFolderModal(true)}
                onUploadClick={() => { setIsUploadMinimized(false); setShowUploadModal(true); }}
                onDeleteFolder={(folder) => confirmDelete('folder', folder.id, folder.name)}
                storageRefreshKey={storageRefreshKey}
            />

            <div className="lg:pl-72 flex flex-col min-h-screen">
                <header className="sticky top-0 z-30 border-b border-zinc-800/40 bg-zinc-950/80 backdrop-blur-xl">
                    <div className="w-full px-4 md:px-6 h-16 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {/* Mobile Menu Toggle */}
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="lg:hidden p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"
                            >
                                <Menu className="w-6 h-6" />
                            </button>

                            <div className="hidden sm:flex lg:hidden w-8 h-8 bg-indigo-600 rounded-lg items-center justify-center">
                                <Cloud className="w-5 h-5 text-white" />
                            </div>

                            <div className="flex items-center gap-1.5 text-[13px] text-zinc-400 bg-zinc-900/40 px-3 py-1.5 rounded-2xl border border-zinc-800/50">
                                <button
                                    onClick={() => { setCurrentFolder(null); setFilterType('all'); }}
                                    className="hover:text-white flex items-center gap-1.5 transition-colors"
                                >
                                    <Home className="w-3.5 h-3.5" />
                                    <span className="font-medium">Library</span>
                                </button>
                                {currentFolder && (
                                    <>
                                        <ChevronRight className="w-3 h-3 text-zinc-700" />
                                        <span className="text-white font-semibold truncate max-w-[100px] sm:max-w-[200px]">{currentFolder.name}</span>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-4">
                            <div
                                onClick={() => {
                                    refreshIconRef.current?.startAnimation();
                                    fetchData();
                                }}
                                className="p-2 rounded-xl border border-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
                            >
                                <RefreshIcon ref={refreshIconRef} className="w-4 h-4 sm:w-5 h-5" />
                            </div>
                            <div className="lg:hidden h-6 sm:h-8 w-px bg-zinc-800" />
                            <div className="lg:hidden scale-90 sm:scale-100">
                                <ClientUserButton afterSignOutUrl="/" />
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-6 md:p-8 lg:p-10 w-full">
                    <div className="mb-12 flex flex-col gap-2">
                        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight text-white leading-tight italic-display">
                            {filterType === 'photos' ? 'Photos' : filterType === 'videos' ? 'Videos' : currentFolder ? currentFolder.name : 'Assets'}
                        </h2>
                        <p className="text-zinc-500 font-medium font-sans opacity-60">
                            {images.length} {images.length === 1 ? 'asset' : 'assets'} in this view
                        </p>
                    </div>

                    {loading ? (
                        <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6">
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className="mb-6 break-inside-avoid aspect-[4/5] bg-zinc-900/50 rounded-3xl animate-pulse border border-zinc-800/50" />
                            ))}
                        </div>
                    ) : (
                        <ImageGallery
                            images={images}
                            folders={[]} // User explicitly said no folders in the gallery section
                            onDelete={(id) => {
                                const img = images.find(i => i.id === id);
                                confirmDelete('image', id, img?.original_name || 'Asset');
                            }}
                            onNavigate={setCurrentFolder}
                            onMoveImage={handleMoveImage}
                            onDeleteFolder={(folder) => confirmDelete('folder', folder.id, folder.name)}
                        />
                    )}
                </main>
            </div>

            {/* Modals & UI Overlays */}
            <AnimatePresence>
                {showFolderModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                        onClick={() => setShowFolderModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl p-8"
                        >
                            <h3 className="text-xl font-bold mb-6 text-center text-white">Create New Folder</h3>
                            <input
                                autoFocus type="text" value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                                placeholder="Enter folder name..."
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-6"
                            />
                            <div className="flex gap-3">
                                <button onClick={() => setShowFolderModal(false)} className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl font-medium transition-all">Cancel</button>
                                <button onClick={handleCreateFolder} className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-medium transition-all">Create</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {deleteConfig.isOpen && (
                    <DeleteConfirmationModal
                        isOpen={deleteConfig.isOpen}
                        onClose={() => setDeleteConfig(prev => ({ ...prev, isOpen: false }))}
                        onConfirm={handleDeleteExecute}
                        title={`Delete ${deleteConfig.type === 'folder' ? 'Folder' : 'Asset'}`}
                        message={`Are you sure you want to delete this ${deleteConfig.type}`}
                        itemName={deleteConfig.name}
                    />
                )}

                {showUploadModal && !isUploadMinimized && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                        onClick={() => { if (!isUploading) setShowUploadModal(false); }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl relative"
                        >
                            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                                {isUploading && (
                                    <button
                                        onClick={() => setIsUploadMinimized(true)}
                                        className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"
                                        title="Minimize — upload continues in background"
                                    >
                                        <Minimize2 className="w-5 h-5" />
                                    </button>
                                )}
                                {!isUploading && (
                                    <button onClick={() => { setShowUploadModal(false); setIsUploadMinimized(false); }} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors">
                                        <X className="w-6 h-6" />
                                    </button>
                                )}
                            </div>
                            <div className="p-8">
                                <h3 className="text-xl font-bold mb-6 text-center text-white">Upload to {currentFolder ? currentFolder.name : 'Root'}</h3>
                                <UploadZone
                                    onUploadComplete={() => {
                                        // Cancel any pending auto-minimize timer so it can't
                                        // silently set isUploadMinimized=true after close
                                        if (autoMinimizeTimerRef.current) {
                                            clearTimeout(autoMinimizeTimerRef.current);
                                            autoMinimizeTimerRef.current = null;
                                        }
                                        fetchData();
                                        setShowUploadModal(false);
                                        setIsUploadMinimized(false);
                                    }}
                                    folderId={currentFolder?.id}
                                    onStartUpload={() => {
                                        // Auto-minimize after 15s if still uploading
                                        if (autoMinimizeTimerRef.current) clearTimeout(autoMinimizeTimerRef.current);
                                        autoMinimizeTimerRef.current = setTimeout(() => {
                                            setIsUploadMinimized(true);
                                        }, 15000);
                                    }}
                                />
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {isGlobalDragOver && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] bg-zinc-950/90 backdrop-blur-sm flex flex-col items-center justify-center border-4 border-indigo-500 border-dashed m-4 rounded-3xl pointer-events-none transition-all duration-300"
                    >
                        <UploadCloud className="w-24 h-24 text-indigo-500 mb-6 animate-pulse" />
                        <h2 className="text-3xl font-bold text-white">Drop to Upload</h2>
                        <p className="text-zinc-400 mt-2">Release your files instantly</p>
                    </motion.div>
                )}

                {/* Floating upload FAB — compact spinning button that pops up progress on click */}
                {isUploading && (isUploadMinimized || !showUploadModal) && (
                    <UploadFAB
                        progress={progress}
                        uploadedBytes={uploadedBytes}
                        totalBytes={totalBytes}
                        onExpand={() => { setIsUploadMinimized(false); setShowUploadModal(true); }}
                    />
                )}
            </AnimatePresence>

            {/* Mobile FABs - Redesigned to be more integrated and aligned */}
            <div className="lg:hidden fixed bottom-6 right-6 flex flex-col gap-3 z-40">
                <AnimatePresence>
                    <motion.button
                        key="new-folder-fab"
                        initial={{ opacity: 0, scale: 0.5, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowFolderModal(true)}
                        className="flex items-center justify-center w-12 h-12 bg-zinc-900 border border-zinc-800 text-white rounded-2xl shadow-2xl"
                        title="New Folder"
                    >
                        <FolderPlus className="w-5 h-5 text-indigo-400" />
                    </motion.button>

                    <motion.button
                        key="upload-assets-fab"
                        initial={{ opacity: 0, scale: 0.5, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => { setIsUploadMinimized(false); setShowUploadModal(true); }}
                        className="flex items-center justify-center w-14 h-14 bg-white text-black rounded-2xl shadow-2xl shadow-white/10"
                        title="Upload Assets"
                    >
                        <Plus className="w-6 h-6" />
                    </motion.button>
                </AnimatePresence>
            </div>
        </div>
    );
}
