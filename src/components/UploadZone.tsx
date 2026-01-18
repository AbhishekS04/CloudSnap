"use client";

import { useState, useCallback } from 'react';
import { Upload, X, FileImage, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn, formatBytes } from '@/lib/utils';
import { ImageRecord, UploadResponse } from '@/lib/types';

interface UploadZoneProps {
    onUploadComplete: (newImage: ImageRecord | UploadResponse) => void;
    // In a real app we might refetch the list, but passing the new image is faster for UI.
    // Actually the response from upload is slightly different from the DB record structure (nested objects vs flat).
    // The gallery likely expects DB/ImageRecord structure. 
    // We can just rely on parent to refetch or we can adapt it.
    // Let's rely on parent refetching for simplicity and consistency.
}

export function UploadZone({ onUploadComplete }: UploadZoneProps) {
    const [isDragOver, setIsDragOver] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0); // Fake progress for better UX

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            uploadFile(files[0]);
        }
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            uploadFile(files[0]);
        }
    };

    const uploadFile = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            setError('Only image files are allowed');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setError('File size must be less than 10MB');
            return;
        }

        setIsUploading(true);
        setError(null);
        setProgress(10); // Start

        try {
            const formData = new FormData();
            formData.append('file', file);

            // Simulate progress since fetch doesn't support it easily without XHR
            const timer = setInterval(() => {
                setProgress((prev) => (prev < 90 ? prev + 10 : prev));
            }, 500);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            clearInterval(timer);

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Upload failed');
            }

            const data = await response.json();
            setProgress(100);
            onUploadComplete(data); // Pass data up
        } catch (err: any) {
            setError(err.message);
            setProgress(0);
        } finally {
            setIsUploading(false);
            // Reset progress after a delay if needed, but usually we just show success or refresh
            setTimeout(() => setProgress(0), 1000);
        }
    };

    return (
        <div
            className={cn(
                "relative border-2 border-dashed rounded-xl p-8 transition-all duration-200 ease-in-out text-center cursor-pointer",
                isDragOver ? "border-blue-500 bg-blue-50/50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50",
                isUploading && "pointer-events-none opacity-50"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-upload')?.click()}
        >
            <input
                type="file"
                id="file-upload"
                className="hidden"
                accept="image/jpeg,image/png,image/jpg"
                onChange={handleFileSelect}
            />

            <div className="flex flex-col items-center justify-center space-y-4">
                <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center bg-gray-100",
                    isDragOver && "bg-blue-100 text-blue-600"
                )}>
                    {isUploading ? (
                        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    ) : (
                        <Upload className="w-6 h-6 text-gray-500" />
                    )}
                </div>

                <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-900">
                        {isUploading ? "Optimizing & Uploading..." : "Click to upload or drag and drop"}
                    </p>
                    <p className="text-xs text-gray-500">
                        JPG, PNG up to 10MB
                    </p>
                </div>

                {isUploading && (
                    <div className="w-full max-w-xs h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-600 transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}

                {error && (
                    <div className="flex items-center text-sm text-red-500 mt-2 bg-red-50 px-3 py-2 rounded-lg">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
}
