"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UploadCloud, CheckCircle2, AlertCircle } from 'lucide-react';
import { useUpload } from '@/context/UploadContext';

export function UploadFAB() {
    const { uploadState, resetUpload } = useUpload();
    const [isOpen, setIsOpen] = useState(true);
    const [showComplete, setShowComplete] = useState(false);

    const { progress, status, fileName, currentChunk, totalChunks } = uploadState;

    // Show completion for 5 seconds then hide
    useEffect(() => {
        if (status === 'completed') {
            setShowComplete(true);
            const timer = setTimeout(() => {
                setShowComplete(false);
                resetUpload();
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [status, resetUpload]);

    if (status === 'idle' && !showComplete) return null;

    // SVG ring progress indicator
    const SIZE = 56;
    const STROKE = 3;
    const R = (SIZE - STROKE) / 2;
    const CIRC = 2 * Math.PI * R;
    const dashOffset = CIRC - (progress / 100) * CIRC;

    const isUploading = status === 'uploading';
    const isError = status === 'error';
    const isCompleted = status === 'completed';

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3 pointer-events-none">
            {/* ── Popup progress card ──────────────────────────────── */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        key="upload-fab-popup"
                        initial={{ opacity: 0, scale: 0.85, y: 12 }}
                        animate={{ opacity: 1, scale: 1,    y: 0  }}
                        exit  ={{ opacity: 0, scale: 0.85, y: 12 }}
                        className="pointer-events-auto bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/60 rounded-2xl shadow-2xl p-4 w-72 origin-bottom-right"
                        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.7)' }}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                                    isError ? 'bg-red-500/20' : isCompleted ? 'bg-emerald-500/20' : 'bg-indigo-500/20'
                                }`}>
                                    {isError ? <AlertCircle className="w-3.5 h-3.5 text-red-400" /> :
                                     isCompleted ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> :
                                     <UploadCloud className="w-3.5 h-3.5 text-indigo-400" />}
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                    <p className="text-white text-xs font-semibold truncate">
                                        {isError ? 'Upload Failed' : isCompleted ? 'Upload Complete' : 'Uploading…'}
                                    </p>
                                    <p className="text-zinc-500 text-[10px] truncate">{fileName}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors pointer-events-auto"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {!isCompleted && !isError && (
                            <>
                                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-2">
                                    <motion.div
                                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                                        animate={{ width: `${progress}%` }}
                                        transition={{ duration: 0.4, ease: 'easeOut' }}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <p className="text-zinc-500 text-[10px]">
                                        {totalChunks && totalChunks > 1 
                                            ? `Chunk ${currentChunk} of ${totalChunks}`
                                            : 'Processing…'}
                                    </p>
                                    <span className="text-indigo-400 text-xs font-mono font-semibold">
                                        {progress}%
                                    </span>
                                </div>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── FAB ──────────────────────────── */}
            <div className="flex flex-col items-center gap-1.5 pointer-events-auto">
                <motion.button
                    onClick={() => setIsOpen(v => !v)}
                    whileHover={{ scale: 1.08 }}
                    whileTap ={{ scale: 0.93 }}
                    className="relative flex items-center justify-center rounded-full focus:outline-none"
                    style={{ width: SIZE, height: SIZE }}
                >
                    <span
                        className={`absolute inset-0 rounded-full animate-pulse ${
                            isError ? 'bg-red-500/10' : isCompleted ? 'bg-emerald-500/10' : 'bg-indigo-500/10'
                        }`}
                    />

                    <svg width={SIZE} height={SIZE} className="absolute inset-0 -rotate-90">
                        <circle cx={SIZE/2} cy={SIZE/2} r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={STROKE} />
                        <motion.circle
                            cx={SIZE/2} cy={SIZE/2} r={R} fill="none" 
                            stroke={isError ? '#f87171' : isCompleted ? '#34d399' : 'url(#fab-grad)'}
                            strokeWidth={STROKE} strokeLinecap="round" strokeDasharray={CIRC}
                            animate={{ strokeDashoffset: dashOffset }}
                        />
                        <defs>
                            <linearGradient id="fab-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#6366f1" />
                                <stop offset="100%" stopColor="#a78bfa" />
                            </linearGradient>
                        </defs>
                    </svg>

                    <span className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full bg-zinc-900 border border-zinc-700/60 shadow-lg">
                        <motion.span
                            animate={isUploading ? { rotate: 360 } : {}}
                            transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
                        >
                            {isError ? <AlertCircle className="w-4 h-4 text-red-400" /> :
                             isCompleted ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> :
                             <UploadCloud className="w-4 h-4 text-indigo-400" />}
                        </motion.span>
                    </span>

                    {!isCompleted && !isError && (
                        <span className="absolute -bottom-1 -left-1 bg-zinc-900 border border-zinc-700 rounded-full px-1.5 py-0.5 text-[9px] font-mono font-bold text-indigo-300 tabular-nums shadow-md">
                            {progress}%
                        </span>
                    )}
                </motion.button>
            </div>
        </div>
    );
}

