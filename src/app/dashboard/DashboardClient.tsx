"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { UploadZone } from '@/components/UploadZone';
import { ImageGallery } from '@/components/ImageGallery';
import { toast } from 'react-hot-toast';

import { ImageRecord, Folder } from '@/lib/types';
import { FolderPlus, ChevronRight, Home, Cloud, Menu, X, Plus, Cpu } from 'lucide-react';
import { useUser } from "@clerk/nextjs";
import { DeveloperHub } from '@/components/DeveloperHub';
import { ClientUserButton } from "@/components/ClientUserButton";
import { motion, AnimatePresence } from 'framer-motion';
import { parseDropEvent } from '@/lib/upload-utils';
import { DeleteConfirmationModal } from '@/components/DeleteConfirmationModal';
import { Sidebar } from '@/components/Sidebar';
import { cn } from '@/lib/utils';
import RefreshIcon from '@/components/icons/RefreshIcon';
import { AnimatedIconHandle } from '@/components/icons/types';
import { useUpload } from '@/context/UploadContext';

export default function DashboardClient({ 
    userRole = 'DEMO',
    initialUploadCount = 0 
}: { 
    userRole?: 'ADMIN' | 'DEMO',
    initialUploadCount?: number
}) {


    const [images, setImages] = useState<(ImageRecord & { avif?: any })[]>([]);
    const [allFolders, setAllFolders] = useState<Folder[]>([]);
    const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);
    const [breadcrumbs, setBreadcrumbs] = useState<Folder[]>([]);
    const [view, setView] = useState<'gallery' | 'developer'>('gallery');
    const [filterType, setFilterType] = useState<'all' | 'photos' | 'videos' | 'documents'>('all');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const { user } = useUser();
    const { startUploads, uploads } = useUpload();
    const isUploadingGlobal = uploads.some(u => u.status === 'uploading');

    // Trial Limit Calculation
    // Use the maximum of (live image count) and (initial server count if still loading)
    const userUploads = images.filter(img => img.user_id === user?.id);
    const effectiveCount = loading ? initialUploadCount : userUploads.length;
    const hasReachedTrialLimit = userRole === 'DEMO' && effectiveCount >= 1;

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

    const fetchData = useCallback(async () => {
        try {
            const queryParams = new URLSearchParams({ limit: '100' });
            if (currentFolder?.id) {
                queryParams.set('folder_id', currentFolder.id);
            }

            const imgRes = await fetch(`/api/images?${queryParams}`);
            const imgs = await imgRes.json();

            if (Array.isArray(imgs)) {
                setImages(imgs);
            }

            const allRes = await fetch('/api/folders?all=true');
            const folders = await allRes.json();
            if (Array.isArray(folders)) setAllFolders(folders);
            setStorageRefreshKey(prev => prev + 1);
        } catch (err) {
            console.error("Failed to fetch data", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [currentFolder, filterType]);

    // Auto-refresh when uploads finish
    useEffect(() => {
        if (uploads.length > 0 && uploads.every(u => u.status === 'completed')) {
            fetchData();
        }
    }, [uploads, fetchData]);

    useEffect(() => {
        fetchData();

        // Update breadcrumbs whenever current folder or all folders change
        if (currentFolder) {
            const path: Folder[] = [];
            let curr: Folder | undefined = currentFolder;
            while (curr) {
                path.unshift(curr);
                const pid: string | null = curr.parent_id;
                curr = allFolders.find(f => f.id === pid);
            }
            setBreadcrumbs(path);
        } else {
            setBreadcrumbs([]);
        }

        // Listen for global upload completions to update the list in real-time
        const handleGlobalRefresh = (e: any) => {
            const newAsset = e.detail?.asset;
            if (newAsset) {
                // If we're in the same folder as the new asset (or in 'All Assets')
                if (!currentFolder?.id || newAsset.folder_id === currentFolder.id) {
                    setImages(prev => {
                        // Prevent duplicates if auto-refresh already caught it
                        if (prev.some(img => img.id === newAsset.id)) return prev;
                        return [newAsset, ...prev];
                    });
                }
                setStorageRefreshKey(prev => prev + 1);
            } else {
                fetchData();
            }
        };
        window.addEventListener('asset-uploaded', handleGlobalRefresh as EventListener);

        // Auto-refresh every 30 seconds
        const interval = setInterval(() => {
            refreshIconRef.current?.startAnimation();
            fetchData();
        }, 30000);
        return () => {
            clearInterval(interval);
            window.removeEventListener('asset-uploaded', handleGlobalRefresh);
        };
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

    const handleDragOver = useCallback((e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) {
            e.dataTransfer.dropEffect = 'copy';
        }
        if (e.dataTransfer?.types && e.dataTransfer.types.length > 0) {
            setIsGlobalDragOver(true);
        }
    }, []);

    const handleWindowDrop = useCallback(async (e: DragEvent) => {
        console.log('[Global Drop] Drop event fired on window');
        e.preventDefault();
        e.stopPropagation();
        setIsGlobalDragOver(false);
        dragCounter.current = 0;

        // CRITICAL: Access files SYNCHRONOUSLY before any await
        const droppedFiles = e.dataTransfer ? Array.from(e.dataTransfer.files) : [];
        const { url } = await parseDropEvent(e as unknown as React.DragEvent);
        
        // Combine files from parseDropEvent and synchronous check
        const files = droppedFiles.length > 0 ? droppedFiles : [];
        
        console.log('[Global Drop] Detected:', { filesCount: files.length, url });

        // Robust media detection: check MIME type OR extension
        const isMedia = (f: File) => {
            const type = f.type.toLowerCase();
            const name = f.name.toLowerCase();
            const mediaExtensions = [
                '.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', 
                '.mp4', '.webm', '.mov', '.heic', '.heif', '.bmp', '.tiff',
                '.pdf'
            ];
            
            return type.startsWith('image/') || 
                   type.startsWith('video/') || 
                   type === 'application/pdf' ||
                   mediaExtensions.some(ext => name.endsWith(ext));
        };

        const validFiles = files.filter(f => {
            if (!f) return false;
            const ok = isMedia(f);
            console.log(`[Global Drop] Filtering: "${f.name}" | Type: "${f.type}" | Size: ${f.size} bytes | Result: ${ok ? 'KEEP' : 'REJECT'}`);
            return ok;
        });
        
        console.log('[Global Drop] Final valid files:', validFiles.length);

        // 1. Handle Real Files
        if (validFiles.length > 0) {
            if (hasReachedTrialLimit) {
                toast.error("Trial limit reached. Please delete your test upload to try another one.");
                return;
            }
            startUploads(validFiles);
        } 
        // 2. Handle URL Drops
        else if (url) {
            if (hasReachedTrialLimit) {
                toast.error("Trial limit reached. Please delete your test upload to try another one.");
                return;
            }
            try {
                const res = await fetch(url);
                const blob = await res.blob();
                if (blob.size === 0) return;

                const fileName = url.split('/').pop()?.split('?')[0] || 'dropped-asset';
                const file = new File([blob], fileName, { type: blob.type });
                
                if (file.type.startsWith('image/') || file.type.startsWith('video/') || file.type === 'application/pdf') {
                    startUploads([file]);
                }
            } catch (err) {
                console.error('Failed to fetch dropped URL', err);
            }
        }

    }, [startUploads]);

    useEffect(() => {
        const handleDragEnter = (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            dragCounter.current++;
            if (e.dataTransfer?.types && e.dataTransfer.types.length > 0) {
                setIsGlobalDragOver(true);
            }
        };

        const handleDragLeave = (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            dragCounter.current--;
            if (dragCounter.current === 0) {
                setIsGlobalDragOver(false);
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
    }, [handleDragOver, handleWindowDrop]);

    return (
        <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-indigo-500/30">

            {/* Global background effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px]" />
            </div>

            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                folders={allFolders}
                currentFolder={currentFolder}
                filterType={filterType}
                userRole={userRole}
                userUploadCount={effectiveCount}
                onNavigate={(folder) => {
                    setView('gallery');
                    setCurrentFolder(folder);
                    setFilterType('all');
                }}
                onSetFilter={(type) => { setView('gallery'); setFilterType(type); }}
                onSetView={setView}
                view={view}
                onCreateFolder={() => setShowFolderModal(true)}
                onUploadClick={() => {
                    if (hasReachedTrialLimit) {
                        toast.error("Trial limit reached. Please delete your test upload to try another one.");
                        return;
                    }
                    window.dispatchEvent(new CustomEvent('open-upload'));
                }}
                onDeleteFolder={(folder) => confirmDelete('folder', folder.id, folder.name)}
                storageRefreshKey={storageRefreshKey}
            />




            <div className="lg:pl-72 flex flex-col min-h-screen">
                <header className="sticky top-0 z-30 border-b border-zinc-800/40 bg-zinc-950/80 backdrop-blur-xl">
                    <div className="w-full px-4 md:px-6 h-16 flex items-center justify-between">
                        <div className="flex items-center gap-3">
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
                                    onClick={() => { setView('gallery'); setCurrentFolder(null); setFilterType('all'); }}
                                    className="hover:text-white flex items-center gap-1.5 transition-colors"
                                >
                                    <Home className="w-3.5 h-3.5" />
                                    <span className="font-medium">Library</span>
                                </button>
                                {breadcrumbs.map((folder) => (
                                    <div key={folder.id} className="flex items-center gap-1.5">
                                        <ChevronRight className="w-3 h-3 text-zinc-700" />
                                        <button
                                            onClick={() => { setView('gallery'); setCurrentFolder(folder); setFilterType('all'); }}
                                            className={cn(
                                                "hover:text-white transition-colors truncate max-w-[80px] sm:max-w-[120px]",
                                                folder.id === currentFolder?.id ? "text-white font-semibold" : "font-medium"
                                            )}
                                        >
                                            {folder.name}
                                        </button>
                                    </div>
                                ))}
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

                <main className="flex-1 p-6 md:p-8 lg:p-10 w-full overflow-y-auto custom-scrollbar">
                    <AnimatePresence mode="wait">
                        {view === 'gallery' ? (
                            <motion.div
                                key="gallery"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-8"
                            >
                                <div className="mb-12 flex flex-col gap-2">
                                    <h2 className="text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight text-white leading-tight italic-display">
                                        {filterType === 'photos' ? 'Photos' : 
                                         filterType === 'videos' ? 'Videos' : 
                                         filterType === 'documents' ? 'Documents' :
                                         currentFolder ? currentFolder.name : 'Assets'}
                                    </h2>
                                    {!loading && (
                                        <p className="text-zinc-500 font-medium font-sans opacity-60">
                                            {images.length} {images.length === 1 ? 'asset' : 'assets'} in this view
                                        </p>
                                    )}
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
                                        filterType={filterType}
                                        userRole={userRole}
                                        currentUserId={user?.id}
                                        folders={allFolders.filter(f => f.parent_id === (currentFolder?.id || null))}


                                        onDelete={(id) => {
                                            const img = images.find(i => i.id === id);
                                            confirmDelete('image', id, img?.original_name || 'Asset');
                                        }}
                                        onNavigate={(f) => { setCurrentFolder(f); setFilterType('all'); }}
                                        onMoveImage={handleMoveImage}
                                        onDeleteFolder={(folder) => confirmDelete('folder', folder.id, folder.name)}
                                    />
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="developer"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                <DeveloperHub folders={allFolders} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>
            </div>

            <AnimatePresence>
                {showFolderModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
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


                {isGlobalDragOver && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] bg-zinc-950/90 backdrop-blur-sm flex flex-col items-center justify-center border-4 border-indigo-500 border-dashed m-4 rounded-3xl transition-all duration-300"
                        onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                        }}
                        onDrop={(e) => {
                            handleWindowDrop(e.nativeEvent);
                        }}
                    >
                        <Cloud className="w-24 h-24 text-indigo-500 mb-6 animate-pulse" />
                        <h2 className="text-3xl font-bold text-white">Drop to Upload</h2>
                        <p className="text-zinc-400 mt-2">Release your files instantly</p>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="lg:hidden fixed bottom-6 right-6 flex flex-col gap-3 z-40">
                <button
                    onClick={() => setShowFolderModal(true)}
                    className="flex items-center justify-center w-12 h-12 bg-zinc-900 border border-zinc-800 text-white rounded-2xl shadow-2xl"
                >
                    <FolderPlus className="w-5 h-5 text-indigo-400" />
                </button>

                <button
                    onClick={() => window.dispatchEvent(new CustomEvent('open-upload'))}
                    className="flex items-center justify-center w-14 h-14 bg-white text-black rounded-2xl shadow-2xl shadow-white/10"
                >
                    <Plus className="w-6 h-6" />
                </button>
            </div>
        </div>
    );
}
