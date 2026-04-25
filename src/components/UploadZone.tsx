"use client";

import { useState, useCallback } from 'react';
import { Upload, FileImage, CheckCircle, AlertCircle, Loader2, UploadCloud, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useUpload } from '@/context/UploadContext';
import { parseDropEvent } from '@/lib/upload-utils';

interface UploadZoneProps {
    folderId?: string | null;
    isDisabled?: boolean;
    userRole?: 'ADMIN' | 'DEMO';
}

export function UploadZone({ folderId, isDisabled, userRole }: UploadZoneProps) {
    const [isDragOver, setIsDragOver] = useState(false);
    const { startUploads, uploads } = useUpload();
    const isUploading = uploads.some(u => u.status === 'uploading');

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        if (isDisabled) return;
        setIsDragOver(true);
    }, [isDisabled]);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isDisabled) return;
        const files = e.target.files;
        if (files && files.length > 0) {
            startUploads(Array.from(files), folderId);
        }
    };

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        if (isDisabled) return;

        const { files, url } = await parseDropEvent(e);
        
        const validFiles = files.filter(f => f.size > 0);
        
        if (validFiles.length > 0) {
            startUploads(validFiles, folderId);
        } else if (url) {
            try {
                const res = await fetch(url);
                const blob = await res.blob();
                if (blob.size === 0) return;

                const fileName = url.split('/').pop()?.split('?')[0] || 'dropped-asset';
                const file = new File([blob], fileName, { type: blob.type });
                
                startUploads([file], folderId);
            } catch (err) {
                console.error('Failed to fetch dropped URL', err);
            }
        }
    }, [startUploads, folderId, isDisabled]);

    return (
        <div
            className={cn(
                "relative group border-2 border-dashed rounded-2xl p-10 transition-all duration-500 ease-out overflow-hidden",
                isDisabled ? "border-zinc-800 bg-zinc-900/20 cursor-not-allowed opacity-60" : 
                (isDragOver 
                    ? "border-indigo-500 bg-indigo-500/5 scale-[1.01] shadow-[0_0_40px_-10px_rgba(99,102,241,0.2)]" 
                    : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 hover:shadow-2xl"),
                isUploading && "opacity-80"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isDisabled && document.getElementById('file-upload')?.click()}
        >
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.08),transparent)] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            
            <input
                type="file"
                id="file-upload"
                className="hidden"
                multiple={userRole === 'ADMIN' && !isDisabled}
                onChange={handleFileSelect}
            />

            <div className="relative flex flex-col items-center justify-center space-y-8">
                <motion.div 
                    animate={isDragOver ? { scale: 1.15, rotate: 5, y: -10 } : { scale: 1, rotate: 0, y: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className={cn(
                        "w-20 h-20 rounded-[2rem] flex items-center justify-center transition-all duration-700 shadow-2xl",
                        isDisabled ? "bg-zinc-800 text-zinc-600 border border-zinc-700" :
                        (isDragOver 
                            ? "bg-indigo-500 text-white shadow-indigo-500/50 ring-4 ring-indigo-500/20" 
                            : "bg-white/[0.03] text-zinc-500 group-hover:bg-indigo-500/10 group-hover:text-indigo-400 border border-white/5 group-hover:border-indigo-500/30")
                    )}
                >
                    {isUploading ? (
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        >
                            <Loader2 className="w-10 h-10" />
                        </motion.div>
                    ) : isDisabled ? (
                        <AlertCircle className="w-10 h-10" />
                    ) : (
                        <UploadCloud className="w-10 h-10" />
                    )}
                </motion.div>

                <div className="space-y-4 text-center">
                    <motion.h3 
                        layout
                        className={cn(
                            "text-xl font-black tracking-tight transition-colors duration-500",
                            isDisabled ? "text-zinc-500" : (isUploading ? "text-indigo-400" : "text-white")
                        )}
                    >
                        {isDisabled ? "Trial Limit Reached" : (isUploading ? "Initializing Sync..." : isDragOver ? "Release to Transmit" : "Sync Digital Assets")}
                    </motion.h3>
                    <div className="flex flex-col items-center space-y-2">
                        <p className="text-sm text-zinc-500 font-bold uppercase tracking-widest opacity-60">
                            {isDisabled ? "Please delete your test file to upload again" : (
                                <>Drop any files or <span className="text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer">browse nodes</span></>
                            )}
                        </p>
                        <div className="flex items-center gap-4 pt-4">
                            <span className="text-[10px] font-black text-zinc-600 bg-white/[0.02] px-3 py-1 rounded-lg border border-white/[0.05] tracking-tighter">
                                {userRole === 'DEMO' ? '1 FILE LIMIT' : 'UNLIMITED STORAGE'}
                            </span>
                            <span className="text-[10px] font-black text-zinc-600 bg-white/[0.02] px-3 py-1 rounded-lg border border-white/[0.05] tracking-tighter">
                                MAX UPLINK <span className="opacity-40 font-normal">{userRole === 'DEMO' ? '10MB' : '200MB'}</span>
                            </span>
                        </div>
                    </div>
                </div>

                <AnimatePresence>
                    {isUploading && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                            className="flex items-center gap-3 px-6 py-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 shadow-lg shadow-indigo-500/10"
                        >
                            <Zap size={14} className="text-indigo-400 animate-pulse" />
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">
                                Uplink Active
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
