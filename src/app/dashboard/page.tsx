"use client";

import { useEffect, useState, useCallback } from 'react';
import { UploadZone } from '@/components/UploadZone';
import { ImageGallery } from '@/components/ImageGallery';
import { ImageRecord, Folder, UploadResponse } from '@/lib/types';
import { RefreshCw, LayoutGrid, Plus, UploadCloud, X, FolderPlus, ChevronRight, Home, Loader2, Cloud, Menu } from 'lucide-react';
import { UserButton, useUser } from "@clerk/nextjs";
import { useImageUpload } from '@/hooks/useImageUpload';
import { motion, AnimatePresence } from 'framer-motion';
import { parseDropEvent } from '@/lib/upload-utils';
import { DeleteConfirmationModal } from '@/components/DeleteConfirmationModal';
import { Sidebar } from '@/components/Sidebar';
import { cn } from '@/lib/utils';

export default function Dashboard() {
    const [images, setImages] = useState<(ImageRecord & { avif?: any })[]>([]);
    const [subFolders, setSubFolders] = useState<Folder[]>([]);
    const [allFolders, setAllFolders] = useState<Folder[]>([]);
    const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);
    const [filterType, setFilterType] = useState<'all' | 'photos' | 'videos'>('all');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const { user } = useUser();

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

    const { uploadFile, uploadUrl, isUploading, progress } = useImageUpload({
        onUploadComplete: (data) => {
            const response = data as UploadResponse & { avif: any };
            const urlParts = response.original.url.split('/').pop()?.split('.') || ['image', 'jpg'];
            const ext = urlParts.length > 1 ? urlParts.pop() : 'jpg';
            const name = urlParts.join('.');

            const newImage: ImageRecord & { avif: any } = {
                id: response.id,
                created_at: new Date().toISOString(),
                original_name: name,
                original_ext: ext || 'jpg',
                original_url: response.original.url,
                mime_type: `image/${ext}`,
                width: response.original.width,
                height: response.original.height,
                original_size: response.original.size,
                thumb_url: response.optimized.urls.thumb,
                sm_url: response.optimized.urls.sm,
                md_url: response.optimized.urls.md,
                lg_url: response.optimized.urls.lg,
                thumb_size: response.optimized.sizes.thumb,
                sm_size: response.optimized.sizes.sm,
                md_size: response.optimized.sizes.md,
                lg_size: response.optimized.sizes.lg,
                optimized_format: 'webp',
                avif: response.avif,
                folder_id: currentFolder?.id || null
            };

            setImages(prev => [newImage, ...prev]);
            setShowUploadModal(false);
        }
    });

    const fetchData = useCallback(async () => {
        try {
            const folderId = currentFolder?.id || 'null';
            const imgRes = await fetch(`/api/images?limit=100&folder_id=${folderId}`);
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

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        if (!isGlobalDragOver) setIsGlobalDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setIsGlobalDragOver(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsGlobalDragOver(false);
        const { files, url } = await parseDropEvent(e);
        if (files.length > 0) {
            const mediaFiles = files.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
            for (const file of mediaFiles) await uploadFile(file);
        } else if (url) {
            await uploadUrl(url);
        }
    };

    return (
        <div
            className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-indigo-500/30"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
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
                onUploadClick={() => setShowUploadModal(true)}
                onDeleteFolder={(folder) => confirmDelete('folder', folder.id, folder.name)}
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
                            <button
                                onClick={() => { setRefreshing(true); fetchData(); }}
                                className={cn(
                                    "p-2 rounded-xl border border-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all",
                                    refreshing && "animate-spin"
                                )}
                            >
                                <RefreshCw className="w-4 h-4 sm:w-5 h-5" />
                            </button>
                            <div className="lg:hidden h-6 sm:h-8 w-px bg-zinc-800" />
                            <div className="lg:hidden scale-90 sm:scale-100">
                                <UserButton afterSignOutUrl="/" />
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-6 md:p-8 lg:p-10 w-full">
                    <div className="mb-10 flex flex-col gap-1">
                        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                            {filterType === 'photos' ? 'Photos' : filterType === 'videos' ? 'Videos' : currentFolder ? currentFolder.name : 'Assets'}
                        </h2>
                        <p className="text-zinc-500 font-medium">
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

                {showUploadModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                        onClick={() => setShowUploadModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl relative"
                        >
                            <button onClick={() => setShowUploadModal(false)} className="absolute top-4 right-4 p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors z-10"><X className="w-6 h-6" /></button>
                            <div className="p-8">
                                <h3 className="text-xl font-bold mb-6 text-center text-white">Upload to {currentFolder ? currentFolder.name : 'Root'}</h3>
                                <UploadZone onUploadComplete={() => { fetchData(); setShowUploadModal(false); }} />
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

                {isUploading && !showUploadModal && (
                    <motion.div
                        initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[70] bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-2xl shadow-black/50 w-full max-w-md flex flex-col items-center gap-4"
                    >
                        <div className="flex items-center gap-3 w-full">
                            <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center"><Loader2 className="w-5 h-5 text-indigo-400 animate-spin" /></div>
                            <div className="flex-1">
                                <h3 className="text-white font-medium">Uploading & Optimizing...</h3>
                                <p className="text-xs text-zinc-400">Processing your assets with high quality</p>
                            </div>
                            <span className="text-sm font-mono text-indigo-400">{progress}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
                        </div>
                    </motion.div>
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
                        onClick={() => setShowUploadModal(true)}
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
