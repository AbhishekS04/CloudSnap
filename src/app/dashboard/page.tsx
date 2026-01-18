"use client";

import { useEffect, useState, useCallback } from 'react';
import { UploadZone } from '@/components/UploadZone';
import { ImageGallery } from '@/components/ImageGallery';
import { ImageRecord } from '@/lib/types';
import { RefreshCw, LayoutGrid, Plus, UploadCloud, X } from 'lucide-react';
import { UserButton, useUser } from "@clerk/nextjs";
import { useImageUpload } from '@/hooks/useImageUpload';

export default function Dashboard() {
    const [images, setImages] = useState<(ImageRecord & { avif?: any })[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const { user, isLoaded } = useUser();

    // Global Drag State
    const [isGlobalDragOver, setIsGlobalDragOver] = useState(false);

    // Hook for global drop
    const { uploadFile, isUploading, progress, error: uploadError } = useImageUpload({
        onUploadComplete: () => {
            fetchImages();
            setShowUploadModal(false);
        }
    });

    const fetchImages = useCallback(async () => {
        try {
            const res = await fetch('/api/images');
            if (res.ok) {
                const data = await res.json();
                setImages(data);
            }
        } catch (error) {
            console.error('Failed to fetch images', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchImages();
    }, [fetchImages]);

    // Global Drag Handlers
    const handleGlobalDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        if (!isGlobalDragOver) setIsGlobalDragOver(true);
    };

    const handleGlobalDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        // Only set false if leaving the window (relatedTarget is null)
        if (!e.relatedTarget) {
            setIsGlobalDragOver(false);
        }
    };

    const handleGlobalDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsGlobalDragOver(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            uploadFile(files[0]);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this image?')) return;
        try {
            const res = await fetch(`/api/images/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setImages(prev => prev.filter(img => img.id !== id));
            }
        } catch (error) {
            console.error('Failed to delete', error);
        }
    };

    // Prevent hydration mismatch by showing nothing until auth loads
    if (!isLoaded) return null;

    return (
        <div
            className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-indigo-500/30 relative"
            onDragOver={handleGlobalDragOver}
            onDragLeave={handleGlobalDragLeave}
            onDrop={handleGlobalDrop}
        >
            {/* Header */}
            <header className="border-b border-zinc-900 bg-zinc-950/50 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <LayoutGrid className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="font-bold text-xl tracking-tight text-white hidden sm:block">AssetVault</h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-sm font-medium text-zinc-200">
                            {user?.fullName || user?.firstName || user?.username || 'User'}
                        </div>
                        <UserButton
                            appearance={{
                                elements: {
                                    avatarBox: "w-9 h-9 border-2 border-zinc-800"
                                }
                            }}
                        />
                    </div>
                </div>
            </header>

            <main className="max-w-[1600px] mx-auto px-6 py-8">

                {/* Gallery Section - Full Width */}
                <section>
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="aspect-video bg-zinc-900 rounded-xl" />
                            ))}
                        </div>
                    ) : (
                        <ImageGallery images={images} onDelete={handleDelete} />
                    )}
                </section>
            </main>

            {/* Floating Action Button */}
            <button
                onClick={() => setShowUploadModal(true)}
                className="fixed bottom-8 right-8 p-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-2xl shadow-indigo-500/40 transition-transform hover:scale-110 active:scale-95 z-40 border border-indigo-400/20"
                title="Upload Image"
            >
                <Plus className="w-6 h-6" />
            </button>

            {/* Global Drag Overlay */}
            {isGlobalDragOver && (
                <div className="fixed inset-0 bg-zinc-950/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center border-4 border-indigo-500 border-dashed m-4 rounded-3xl pointer-events-none">
                    <UploadCloud className="w-24 h-24 text-indigo-500 mb-6 animate-bounce" />
                    <h2 className="text-3xl font-bold text-white">Drop to Upload</h2>
                    <p className="text-zinc-400 mt-2">Release your files instantly</p>
                </div>
            )}

            {/* Uploading Progress Overlay (Bottom Center) */}
            {isUploading && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-800 px-6 py-3 rounded-full flex items-center gap-4 shadow-2xl z-50">
                    <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-medium text-zinc-200">Optimizing... {progress}%</span>
                </div>
            )}

            {/* Generic Modal for manual upload if FAB clicked */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={(e) => {
                    if (e.target === e.currentTarget) setShowUploadModal(false);
                }}>
                    <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl w-full max-w-lg relative animate-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setShowUploadModal(false)}
                            className="absolute top-4 right-4 text-zinc-500 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <h3 className="text-xl font-bold text-white mb-6">Upload Assets</h3>
                        <UploadZone onUploadComplete={() => {
                            fetchImages();
                            setShowUploadModal(false);
                        }} />
                    </div>
                </div>
            )}
        </div>
    );
}
