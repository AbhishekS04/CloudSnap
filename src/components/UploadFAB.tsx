"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UploadCloud, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Zap, Box, RefreshCw } from 'lucide-react';
import { useUpload } from '@/context/UploadContext';
import { cn } from '@/lib/utils';

export function UploadFAB() {
    const { uploadState, resetUpload, getPendingSession, clearPendingSession } = useUpload();
    const [isExpanded, setIsExpanded]     = useState(true);
    const [showComplete, setShowComplete] = useState(false);
    const [pendingSession, setPendingSession] = useState<{
        sessionId: string;
        fileName: string;
        confirmedCount: number;
        totalChunks: number;
    } | null>(null);
    const checkedRef = useRef(false);

    const { progress, status, fileName, currentChunk, totalChunks, speed } = uploadState;

    // ── Check for a pending resume session on first render ──────────────────
    useEffect(() => {
        if (checkedRef.current) return;
        checkedRef.current = true;

        getPendingSession().then(session => {
            if (session && session.confirmedCount > 0) {
                setPendingSession({
                    sessionId:     session.sessionId,
                    fileName:      session.fileName,
                    confirmedCount: session.confirmedCount,
                    totalChunks:   session.totalChunks,
                });
            }
        });
    }, [getPendingSession]);

    useEffect(() => {
        if (status === 'completed') {
            setPendingSession(null); // clear any stale resume prompt
            setShowComplete(true);
            const timer = setTimeout(() => {
                setShowComplete(false);
                resetUpload();
            }, 8000);
            return () => clearTimeout(timer);
        }
    }, [status, resetUpload]);

    const isIdle      = status === 'idle';
    const isUploading = status === 'uploading';
    const isError     = status === 'error';
    const isCompleted = status === 'completed' || showComplete;

    // Only hide if truly idle, no resume prompt, and not in complete animation
    if (isIdle && !showComplete && !pendingSession) return null;

    // Circular Progress Calculation
    const SIZE = 64;
    const STROKE = 4;
    const R = (SIZE - STROKE) / 2;
    const CIRC = 2 * Math.PI * R;
    const dashOffset = CIRC - (progress / 100) * CIRC;

    return (
        <div className="fixed bottom-8 right-8 z-[9999] flex flex-col items-end gap-4 pointer-events-none">
            {/* ── Enhanced Upload Card ──────────────────────────────── */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, y: 0,  scale: 1,    filter: 'blur(0px)'  }}
                        exit   ={{ opacity: 0, y: 20, scale: 0.95, filter: 'blur(10px)' }}
                        className={cn(
                            "pointer-events-auto w-80 overflow-hidden rounded-2xl border backdrop-blur-2xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)]",
                            isError ? "bg-red-950/20 border-red-500/30" : 
                            isCompleted ? "bg-emerald-950/20 border-emerald-500/30" : 
                            "bg-zinc-900/60 border-white/10"
                        )}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/5">
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "p-2 rounded-xl",
                                    isError ? "bg-red-500/20 text-red-400" :
                                    isCompleted ? "bg-emerald-500/20 text-emerald-400" :
                                    "bg-indigo-500/20 text-indigo-400"
                                )}>
                                    {isError ? <AlertCircle size={18} /> : 
                                     isCompleted ? <CheckCircle2 size={18} /> : 
                                     <UploadCloud size={18} className="animate-pulse" />}
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-white/90 leading-none">
                                        {isError ? 'System Error' : isCompleted ? 'Transfer Ready' : 'Syncing Media'}
                                    </h4>
                                    <p className="text-[10px] text-white/40 font-medium mt-1 truncate max-w-[140px]">
                                        {fileName}
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsExpanded(false)}
                                className="p-2 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-all"
                            >
                                <ChevronDown size={16} />
                            </button>
                        </div>

                        {/* Resume Prompt — shown when a previous session is detected */}
                        {isIdle && pendingSession && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="px-4 py-3 bg-amber-950/30 border-t border-amber-500/20"
                            >
                                <p className="text-[11px] font-bold text-amber-400 mb-1">
                                    ⟳ Resume previous upload?
                                </p>
                                <p className="text-[10px] text-white/50 truncate mb-2">
                                    {pendingSession.fileName} · {pendingSession.confirmedCount}/{pendingSession.totalChunks} chunks done
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            clearPendingSession();
                                            setPendingSession(null);
                                        }}
                                        className="flex-1 text-[10px] font-bold py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-white/70 transition-colors"
                                    >
                                        Discard
                                    </button>
                                    <button
                                        onClick={() => {
                                            // User needs to re-select the file — we can't re-access it after page reload.
                                            // Show a clear instruction.
                                            setPendingSession(null);
                                            alert(`Re-select "${pendingSession.fileName}" to resume from chunk ${pendingSession.confirmedCount}/${pendingSession.totalChunks}. CloudSnap will skip the already-uploaded chunks.`);
                                        }}
                                        className="flex-1 flex items-center justify-center gap-1 text-[10px] font-bold py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500/30 transition-colors"
                                    >
                                        <RefreshCw size={10} />
                                        Resume
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* Progress / Error / Complete content */}
                        <div className="p-4 space-y-4">
                        {!isCompleted && !isError && (
                                <>
                                    <div className="relative h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                        <motion.div 
                                            className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
                                            animate={{ width: `${progress}%` }}
                                            transition={{ type: 'spring', bounce: 0, duration: 0.8 }}
                                        />
                                        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_2s_infinite]" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-white/5 rounded-xl p-2 border border-white/5">
                                            <div className="flex items-center gap-1.5 text-white/40 mb-0.5">
                                                <Box size={10} />
                                                <span className="text-[9px] uppercase font-bold tracking-wider">Segments</span>
                                            </div>
                                            <p className="text-xs font-mono font-bold text-white/80">
                                                {currentChunk} <span className="text-white/20">/</span> {totalChunks}
                                            </p>
                                        </div>
                                        <div className="bg-white/5 rounded-xl p-2 border border-white/5">
                                            <div className="flex items-center gap-1.5 text-white/40 mb-0.5">
                                                <Zap size={10} />
                                                <span className="text-[9px] uppercase font-bold tracking-wider">Velocity</span>
                                            </div>
                                            <p className="text-xs font-mono font-bold text-indigo-400">
                                                {speed || '0.00'} <span className="text-[9px] font-medium text-white/20">MB/s</span>
                                            </p>
                                        </div>
                                    </div>
                                </>
                            )}

                            {isCompleted && (
                                <div className="py-2 flex flex-col items-center text-center">
                                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 mb-2">
                                        <CheckCircle2 size={24} />
                                    </div>
                                    <p className="text-xs font-medium text-emerald-400/80">Media successfully synced to CDN</p>
                                </div>
                            )}

                            {isError && (
                                <div className="py-2 flex flex-col items-center text-center">
                                    <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 mb-2">
                                        <AlertCircle size={24} />
                                    </div>
                                    <p className="text-xs font-medium text-red-400/80">
                                        Upload interrupted. Your progress is saved —{' '}
                                        <span className="text-amber-400">re-select the file to resume</span>.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer / Status */}
                        {!isCompleted && !isError && (
                            <div className="px-4 py-2 bg-indigo-500/10 border-t border-indigo-500/20 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Active Stream</span>
                                </div>
                                <span className="text-xs font-black text-white/90 font-mono italic">
                                    {progress}%
                                </span>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Premium Circular FAB ──────────────────────────── */}
            <div className="pointer-events-auto relative group">
                <motion.button
                    onClick={() => setIsExpanded(v => !v)}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative flex items-center justify-center rounded-full bg-zinc-950 border border-white/10 shadow-2xl p-1"
                >
                    {/* SVG Progress Ring */}
                    <svg width={SIZE} height={SIZE} className="absolute inset-0 -rotate-90">
                        <circle 
                            cx={SIZE/2} cy={SIZE/2} r={R} 
                            fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth={STROKE} 
                        />
                        <motion.circle
                            cx={SIZE/2} cy={SIZE/2} r={R} 
                            fill="none" 
                            stroke={isError ? '#ef4444' : isCompleted ? '#10b981' : 'url(#fab-gradient)'}
                            strokeWidth={STROKE} 
                            strokeLinecap="round" 
                            strokeDasharray={CIRC}
                            animate={{ strokeDashoffset: dashOffset }}
                            transition={{ type: 'spring', stiffness: 50, damping: 15 }}
                        />
                        <defs>
                            <linearGradient id="fab-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#6366f1" />
                                <stop offset="100%" stopColor="#ec4899" />
                            </linearGradient>
                        </defs>
                    </svg>

                    {/* Inner Content */}
                    <div className={cn(
                        "relative z-10 flex items-center justify-center rounded-full transition-all duration-500",
                        isExpanded ? "w-10 h-10" : "w-12 h-12",
                        isError ? "bg-red-500/10 text-red-400" :
                        isCompleted ? "bg-emerald-500/10 text-emerald-400" :
                        "bg-white/5 text-indigo-400"
                    )}>
                        {isExpanded ? (
                            <ChevronUp size={20} className="text-white/40" />
                        ) : (
                            <motion.div
                                animate={isUploading ? { rotate: 360 } : {}}
                                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                            >
                                {isError ? <AlertCircle size={22} /> :
                                 isCompleted ? <CheckCircle2 size={22} /> :
                                 <UploadCloud size={22} />}
                            </motion.div>
                        )}
                    </div>

                    {/* Progress Badge */}
                    {!isExpanded && !isCompleted && !isError && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="absolute -top-1 -right-1 bg-indigo-600 text-[10px] font-black px-1.5 py-0.5 rounded-full text-white shadow-xl italic"
                        >
                            {progress}%
                        </motion.div>
                    )}
                </motion.button>
                
                {/* Tooltip / Label */}
                <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-zinc-900 border border-white/10 px-3 py-1.5 rounded-xl whitespace-nowrap shadow-xl">
                        <p className="text-[11px] font-bold text-white/60">
                            {isUploading ? 'View Sync Status' : isCompleted ? 'Transfer Complete' : 'Manage Uploads'}
                        </p>
                    </div>
                </div>
            </div>

        </div>
    );
}
