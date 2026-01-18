"use client";

import { useState, useCallback } from 'react';
import { Upload, X, FileImage, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImageRecord, UploadResponse } from '@/lib/types';
import { useImageUpload } from '@/hooks/useImageUpload';

interface UploadZoneProps {
    onUploadComplete: (newImage: ImageRecord | UploadResponse) => void;
}

export function UploadZone({ onUploadComplete }: UploadZoneProps) {
    const [isDragOver, setIsDragOver] = useState(false);

    const { uploadFile, isUploading, progress, error } = useImageUpload({
        onUploadComplete
    });

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
    }, [uploadFile]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            uploadFile(files[0]);
        }
    };

    return (
        <div
            className={cn(
                "relative border-2 border-dashed rounded-xl p-8 transition-all duration-200 ease-in-out text-center cursor-pointer",
                isDragOver ? "border-indigo-500 bg-indigo-500/10" : "border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50",
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
                    "w-12 h-12 rounded-full flex items-center justify-center bg-zinc-900 shadow-inner",
                    isDragOver && "bg-indigo-500/20 text-indigo-400"
                )}>
                    {isUploading ? (
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                    ) : (
                        <Upload className="w-6 h-6 text-zinc-500" />
                    )}
                </div>

                <div className="space-y-2">
                    <p className={cn(
                        "text-sm font-medium transition-colors",
                        isUploading ? "text-indigo-400 animate-pulse" : "text-zinc-300"
                    )}>
                        {isUploading ? "Please wait, optimizing..." : "Click to upload or drag and drop"}
                    </p>
                    <p className="text-xs text-zinc-500">
                        JPG, PNG up to 10MB
                    </p>
                    {isUploading && (
                        <p className="text-[10px] text-zinc-600 font-mono">
                            Do not close window
                        </p>
                    )}
                </div>

                {isUploading && (
                    <div className="w-full max-w-xs h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-indigo-500 transition-all duration-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}

                {error && (
                    <div className="flex items-center text-sm text-red-400 mt-2 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
}
