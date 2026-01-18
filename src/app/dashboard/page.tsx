"use client";

import { useEffect, useState } from 'react';
import { UploadZone } from '@/components/UploadZone';
import { ImageGallery } from '@/components/ImageGallery';
import { ImageRecord } from '@/lib/types';
import { LayoutGrid, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
    const [images, setImages] = useState<ImageRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchImages = async () => {
        setRefreshing(true);
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
    };

    useEffect(() => {
        fetchImages();
    }, []);

    const handleUploadComplete = () => {
        fetchImages();
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this image?')) return;

        // Optimistic update
        setImages(prev => prev.filter(img => img.id !== id));

        try {
            const res = await fetch(`/api/images/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                throw new Error('Failed to delete');
            }
            // Success, do nothing as we already updated UI
        } catch (error) {
            console.error(error);
            alert('Failed to delete image');
            fetchImages(); // Revert on failure
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 text-slate-900 font-sans">
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                            IMG
                        </div>
                        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                            ImgHost
                        </h1>
                    </div>

                    <button
                        onClick={fetchImages}
                        disabled={refreshing}
                        className={cn(
                            "p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors",
                            refreshing && "animate-spin text-blue-600"
                        )}
                        title="Refresh"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {/* Upload Section */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Upload</h2>
                    </div>
                    <UploadZone onUploadComplete={handleUploadComplete} />
                </section>

                {/* Gallery Section */}
                <section>
                    <div className="flex items-center gap-2 mb-6">
                        <LayoutGrid className="w-5 h-5 text-gray-500" />
                        <h2 className="text-lg font-semibold text-gray-900">Your Gallery</h2>
                        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full font-medium">
                            {images.length}
                        </span>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                        </div>
                    ) : (
                        <ImageGallery images={images} onDelete={handleDelete} />
                    )}
                </section>
            </main>
        </div>
    );
}
