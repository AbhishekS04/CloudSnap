"use client";

import { useState, useCallback } from 'react';
import { Upload, FileImage, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUpload } from '@/context/UploadContext';
import { parseDropEvent } from '@/lib/upload-utils';

interface UploadZoneProps {
    folderId?: string | null;
}

export function UploadZone({ folderId }: UploadZoneProps) {
    const [isDragOver, setIsDragOver] = useState(false);
    const { startUpload, uploadState } = useUpload();
    const isUploading = uploadState.status === 'uploading';

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            startUpload(files[0]);
        }
    };

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const { files } = await parseDropEvent(e);
        if (files.length > 0) {
            startUpload(files[0]);
        }
    }, [startUpload]);

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
                accept="image/*,video/*"
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
                        {isUploading ? "Starting background transfer..." : isDragOver ? "Drop to Upload" : "Click to upload, or drag and drop files"}
                    </p>
                    <p className="text-xs text-zinc-500">
                        Images up to 50 MB · Videos up to 200 MB
                    </p>
                    {isUploading && (
                        <p className="text-[10px] text-zinc-600 font-mono">
                            Upload continues in background. You can close this modal.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
