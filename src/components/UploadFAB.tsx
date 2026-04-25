"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UploadCloud, CheckCircle2, ChevronDown, Loader2 } from 'lucide-react';
import { useUpload } from '@/context/UploadContext';
import { cn } from '@/lib/utils';
import { UploadZone } from './UploadZone';

export function UploadFAB() {
    const { uploads, removeUpload, resetUploads } = useUpload();
    const [isExpanded, setIsExpanded] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const prevUploadsCount = useRef(0);

    const activeItem = uploads.find(u => u.status === 'uploading');
    const pendingItems = uploads.filter(u => u.status === 'pending');
    const completedItems = uploads.filter(u => u.status === 'completed');

    const isUploading = activeItem !== undefined;
    const hasUploads = uploads.length > 0;

    // Listen for global "open-upload" event to show the modal
    useEffect(() => {
        const handleOpen = () => {
            setShowModal(true);
        };
        window.addEventListener('open-upload', handleOpen);
        return () => window.removeEventListener('open-upload', handleOpen);
    }, []);

    // Auto-close modal when files are added (Instant disappear)
    useEffect(() => {
        if (uploads.length > prevUploadsCount.current && showModal) {
            setShowModal(false);
        }
        prevUploadsCount.current = uploads.length;
    }, [uploads.length, showModal]);

    if (!hasUploads && !showModal) return null;

    const displayProgress = activeItem ? activeItem.progress : (uploads.every(u => u.status === 'completed') ? 100 : 0);

    return (
        <>
            {/* ── Background Overlay for Modal ──────────────────── */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="fixed inset-0 z-[9990] bg-black/40 backdrop-blur-[2px]"
                        onClick={() => !isUploading && setShowModal(false)}
                    />
                )}
            </AnimatePresence>

            {/* ── Simple Modal (No complex animations) ────────────── */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[9991] flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.15 }}
                            className="pointer-events-auto w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl p-8"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-white">Upload Media</h3>
                                <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white">
                                    <X size={20} />
                                </button>
                            </div>
                            <UploadZone />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ── Corner System ─────────────────────────────────── */}
            {!showModal && hasUploads && (
                <div className="fixed bottom-6 right-6 z-[9992] flex flex-col items-end gap-3">
                    <AnimatePresence>
                        {isExpanded && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                className="w-[340px] bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
                            >
                                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/50">
                                    <h4 className="text-sm font-bold text-white">Upload Status</h4>
                                    <button onClick={() => setIsExpanded(false)} className="text-zinc-500 hover:text-white">
                                        <ChevronDown size={18} />
                                    </button>
                                </div>
                                <div className="max-h-[280px] overflow-y-auto p-2 space-y-1 custom-scrollbar">
                                    {uploads.map((item) => (
                                        <div key={item.id} className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-900/40 border border-zinc-800/50">
                                            <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0">
                                                {item.status === 'uploading' ? <Loader2 size={16} className="animate-spin text-indigo-400" /> :
                                                 item.status === 'completed' ? <CheckCircle2 size={16} className="text-emerald-400" /> :
                                                 <UploadCloud size={16} className="text-zinc-500" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[11px] font-medium text-white truncate">{item.fileName}</p>
                                                {item.status === 'uploading' ? (
                                                    <div className="mt-1.5 h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                                                        <motion.div className="h-full bg-indigo-500" animate={{ width: `${item.progress}%` }} />
                                                    </div>
                                                ) : (
                                                    <p className="text-[9px] text-zinc-500 uppercase font-bold mt-0.5">{item.status}</p>
                                                )}
                                            </div>
                                            {item.status !== 'uploading' && (
                                                <button onClick={() => removeUpload(item.id)} className="text-zinc-600 hover:text-zinc-400">
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                {completedItems.length === uploads.length && (
                                    <button onClick={resetUploads} className="w-full py-3 text-[10px] font-bold text-zinc-500 hover:text-white uppercase tracking-widest border-t border-zinc-800/50">
                                        Clear History
                                    </button>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={cn(
                            "w-14 h-14 rounded-2xl border flex items-center justify-center transition-all duration-300 shadow-xl",
                            isUploading ? "bg-indigo-600 border-indigo-500 text-white" : "bg-zinc-900 border-zinc-800 text-zinc-400"
                        )}
                    >
                        <div className="relative">
                            {isUploading ? <Loader2 size={24} className="animate-spin" /> : <UploadCloud size={24} />}
                            {pendingItems.length > 0 && (
                                <div className="absolute -top-3 -right-3 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-zinc-950">
                                    {pendingItems.length}
                                </div>
                            )}
                        </div>
                    </button>
                </div>
            )}
        </>
    );
}
