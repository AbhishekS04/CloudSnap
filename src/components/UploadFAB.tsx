"use client";

/**
 * UploadFAB — Floating Action Button for background uploads
 *
 * When an upload is running in the background this component renders a small
 * spinning button in the bottom-right corner.  Clicking it opens a compact
 * progress popup anchored to the button.  Clicking the popup's "Expand" arrow
 * reopens the full upload modal (delegated to the parent via `onExpand`).
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, X, UploadCloud } from 'lucide-react';

interface UploadFABProps {
    progress: number;           // 0-100
    uploadedBytes: number;
    totalBytes: number;
    onExpand: () => void;       // reopens the full modal
}

export function UploadFAB({ progress, uploadedBytes, totalBytes, onExpand }: UploadFABProps) {
    const [isOpen, setIsOpen] = useState(false);

    // SVG ring progress indicator
    const SIZE = 56;
    const STROKE = 3;
    const R = (SIZE - STROKE) / 2;
    const CIRC = 2 * Math.PI * R;
    const dashOffset = CIRC - (progress / 100) * CIRC;

    const formattedUploaded = (uploadedBytes / 1024 / 1024).toFixed(1);
    const formattedTotal    = (totalBytes    / 1024 / 1024).toFixed(1);
    const hasSize           = totalBytes > 0;

    return (
        // Positioned above the mobile FABs (z-[75]) so it doesn't clash
        <div className="fixed bottom-6 right-6 z-[75] flex flex-col items-end gap-3">

            {/* ── Popup progress card ──────────────────────────────── */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        key="upload-fab-popup"
                        initial={{ opacity: 0, scale: 0.85, y: 12 }}
                        animate={{ opacity: 1, scale: 1,    y: 0  }}
                        exit  ={{ opacity: 0, scale: 0.85, y: 12 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                        className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/60 rounded-2xl shadow-2xl shadow-black/70 p-4 w-72 origin-bottom-right"
                        style={{ boxShadow: '0 0 0 1px rgba(99,102,241,0.12), 0 20px 60px rgba(0,0,0,0.7)' }}
                    >
                        {/* Card header */}
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center">
                                    <UploadCloud className="w-3.5 h-3.5 text-indigo-400" />
                                </div>
                                <p className="text-white text-sm font-semibold">Uploading…</p>
                            </div>
                            <div className="flex items-center gap-1">
                                {/* Expand back to full modal */}
                                <button
                                    onClick={() => { setIsOpen(false); onExpand(); }}
                                    className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                                    title="Expand to full modal"
                                >
                                    <Maximize2 className="w-3.5 h-3.5" />
                                </button>
                                {/* Collapse popup (FAB stays) */}
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                                    title="Collapse"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-2">
                            <motion.div
                                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.4, ease: 'easeOut' }}
                            />
                        </div>

                        {/* Stats row */}
                        <div className="flex items-center justify-between">
                            <p className="text-zinc-500 text-[11px]">
                                {hasSize
                                    ? `${formattedUploaded} MB of ${formattedTotal} MB`
                                    : 'Processing…'}
                            </p>
                            <span className="text-indigo-400 text-xs font-mono tabular-nums font-semibold">
                                {progress}%
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── FAB + always-visible bar ──────────────────────────── */}
            <div className="flex flex-col items-center gap-1.5">

                {/* Spinning FAB button */}
                <motion.button
                    onClick={() => setIsOpen(v => !v)}
                    title={isOpen ? 'Collapse upload progress' : 'View upload progress'}
                    whileHover={{ scale: 1.08 }}
                    whileTap ={{ scale: 0.93 }}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1   }}
                    exit   ={{ opacity: 0, scale: 0.5 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                    className="relative flex items-center justify-center rounded-full focus:outline-none"
                    style={{ width: SIZE, height: SIZE }}
                    aria-label="Upload progress"
                >
                    {/* Glow ring */}
                    <span
                        className="absolute inset-0 rounded-full animate-pulse"
                        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)' }}
                    />

                    {/* SVG progress ring */}
                    <svg
                        width={SIZE}
                        height={SIZE}
                        className="absolute inset-0 -rotate-90"
                        aria-hidden
                    >
                        {/* Track */}
                        <circle
                            cx={SIZE / 2}
                            cy={SIZE / 2}
                            r={R}
                            fill="none"
                            stroke="rgba(99,102,241,0.15)"
                            strokeWidth={STROKE}
                        />
                        {/* Progress arc */}
                        <motion.circle
                            cx={SIZE / 2}
                            cy={SIZE / 2}
                            r={R}
                            fill="none"
                            stroke="url(#fab-grad)"
                            strokeWidth={STROKE}
                            strokeLinecap="round"
                            strokeDasharray={CIRC}
                            animate={{ strokeDashoffset: dashOffset }}
                            transition={{ duration: 0.4, ease: 'easeOut' }}
                        />
                        <defs>
                            <linearGradient id="fab-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%"   stopColor="#6366f1" />
                                <stop offset="100%" stopColor="#a78bfa" />
                            </linearGradient>
                        </defs>
                    </svg>

                    {/* Inner button face */}
                    <span className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full bg-zinc-900 border border-zinc-700/60 shadow-lg">
                        {/* Spinning upload cloud icon */}
                        <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
                            className="flex items-center justify-center"
                        >
                            <UploadCloud className="w-4 h-4 text-indigo-400" />
                        </motion.span>
                    </span>

                    {/* Percentage badge — bottom-left of button */}
                    <span
                        className="absolute -bottom-1 -left-1 bg-zinc-900 border border-zinc-700 rounded-full px-1.5 py-0.5 text-[9px] font-mono font-bold text-indigo-300 tabular-nums leading-none shadow-md"
                        style={{ minWidth: '28px', textAlign: 'center' }}
                    >
                        {progress}%
                    </span>
                </motion.button>

                {/* Always-visible linear bar below the FAB — width matches button */}
                <div
                    className="rounded-full overflow-hidden bg-zinc-800/80"
                    style={{ width: SIZE, height: 4 }}
                    title={`${progress}% uploaded`}
                >
                    <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-400"
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                        style={{ boxShadow: '0 0 6px rgba(99,102,241,0.7)' }}
                    />
                </div>
            </div>
        </div>
    );
}
