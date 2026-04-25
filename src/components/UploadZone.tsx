"use client";

import { useState, useCallback } from 'react';
import { Upload, FileImage, CheckCircle, AlertCircle, Loader2, UploadCloud, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
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
            startUpload(files[0], folderId);
        }
    };

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const { files } = await parseDropEvent(e);
        if (files.length > 0) {
            startUpload(files[0], folderId);
        }
    }, [startUpload, folderId]);

    return (
        <div
            className={cn(
                "relative group border-2 border-dashed rounded-2xl p-10 transition-all duration-500 ease-out overflow-hidden",
                isDragOver 
                    ? "border-indigo-500 bg-indigo-500/5 scale-[1.01] shadow-[0_0_40px_-10px_rgba(99,102,241,0.2)]" 
                    : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 hover:shadow-2xl",
                isUploading && "pointer-events-none opacity-80"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-upload')?.click()}
        >
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.05),transparent)] opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <input
                type="file"
                id="file-upload"
                className="hidden"
                accept="image/*,video/*"
                onChange={handleFileSelect}
            />

            <div className="relative flex flex-col items-center justify-center space-y-6">
                <div className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500",
                    isDragOver 
                        ? "bg-indigo-500 text-white shadow-[0_0_30px_rgba(99,102,241,0.5)] rotate-6" 
                        : "bg-white/5 text-zinc-500 group-hover:bg-indigo-500/10 group-hover:text-indigo-400 group-hover:scale-110"
                )}>
                    {isUploading ? (
                        <Loader2 className="w-8 h-8 animate-spin" />
                    ) : (
                        <UploadCloud className="w-8 h-8" />
                    )}
                </div>

                <div className="space-y-3">
                    <h3 className={cn(
                        "text-lg font-bold tracking-tight transition-colors",
                        isUploading ? "text-indigo-400" : "text-white/90"
                    )}>
                        {isUploading ? "Streaming to CloudSnap..." : isDragOver ? "Release to Sync" : "Upload Media Assets"}
                    </h3>
                    <div className="flex flex-col items-center space-y-1">
                        <p className="text-sm text-zinc-500 font-medium">
                            Drag and drop or <span className="text-indigo-400 hover:underline">browse files</span>
                        </p>
                        <div className="flex items-center gap-3 pt-2">
                            <span className="text-[10px] font-bold text-zinc-600 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                                IMAGES &lt; 50MB
                            </span>
                            <span className="text-[10px] font-bold text-zinc-600 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                                VIDEOS &lt; 200MB
                            </span>
                        </div>
                    </div>
                </div>

                {isUploading && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20"
                    >
                        <Zap size={12} className="text-indigo-400 animate-pulse" />
                        <span className="text-xs font-bold text-indigo-400/80 uppercase tracking-widest">
                            Active Sync Channel
                        </span>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
