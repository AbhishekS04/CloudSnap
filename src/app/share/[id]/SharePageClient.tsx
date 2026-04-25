"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { Download, Share2, ExternalLink, Cloud, Check, Copy, Clock, Box, Zap } from 'lucide-react';
import { useState } from 'react';
import { formatBytes } from '@/lib/utils';
import Link from 'next/link';

interface SharePageClientProps {
    asset: any;
}

export function SharePageClient({ asset }: SharePageClientProps) {
    const [copied, setCopied] = useState(false);
    const isVideo = asset.mime_type.startsWith('video/');
    const isImage = asset.mime_type.startsWith('image/');
    const cdnUrl = `/api/cdn/${asset.id}`;
    
    const handleCopy = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = `${cdnUrl}?dl=1`;
        link.download = asset.original_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="relative min-h-screen flex flex-col items-center justify-center p-6 md:p-12 overflow-hidden">
            {/* Background Ambient Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
            
            {/* Header / Logo */}
            <motion.header 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-8 left-8 flex items-center gap-2.5"
            >
                <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <Cloud className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-black tracking-tighter text-white">CloudSnap</span>
            </motion.header>

            <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
                {/* ── Asset Preview ───────────────────────────────── */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, x: -20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="lg:col-span-8 flex justify-center"
                >
                    <div className="relative group">
                        <div className="absolute -inset-4 bg-white/5 blur-2xl rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        
                        <div className="relative rounded-[2rem] overflow-hidden border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] bg-zinc-900">
                            {isImage && (
                                <img 
                                    src={cdnUrl} 
                                    alt={asset.original_name}
                                    className="max-w-full max-h-[70vh] object-contain"
                                />
                            )}
                            {isVideo && (
                                <video 
                                    src={cdnUrl} 
                                    controls 
                                    className="max-w-full max-h-[70vh]"
                                    autoPlay
                                    muted
                                    loop
                                />
                            )}
                            {!isImage && !isVideo && (
                                <div className="w-full aspect-video flex flex-col items-center justify-center gap-4 bg-zinc-900 p-12 text-center">
                                    <Box size={64} className="text-zinc-700" />
                                    <p className="text-zinc-500 font-bold uppercase tracking-widest">{asset.mime_type}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* ── Sidebar Details ─────────────────────────────── */}
                <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 30 }}
                    className="lg:col-span-4 flex flex-col gap-6"
                >
                    <div>
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4"
                        >
                            <Zap size={10} className="fill-current" />
                            Secure Link
                        </motion.div>
                        <h1 className="text-3xl font-black tracking-tight text-white mb-2 leading-tight">
                            {asset.original_name}
                        </h1>
                        <p className="text-zinc-500 text-sm font-medium">
                            Synced via the CloudSnap decentralized media mesh.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex flex-col gap-1">
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Weight</span>
                            <span className="text-sm font-bold text-white font-mono">{formatBytes(asset.original_size)}</span>
                        </div>
                        <div className="p-4 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex flex-col gap-1">
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Type</span>
                            <span className="text-sm font-bold text-white uppercase truncate">{asset.mime_type.split('/')[1] || 'FILE'}</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 pt-4">
                        <button 
                            onClick={handleDownload}
                            className="w-full h-14 bg-white text-black rounded-2xl flex items-center justify-center gap-3 font-black text-sm hover:bg-zinc-200 transition-all active:scale-[0.98]"
                        >
                            <Download size={20} strokeWidth={3} />
                            Download Asset
                        </button>

                        <button 
                            onClick={handleCopy}
                            className="w-full h-14 bg-zinc-900 border border-white/10 text-white rounded-2xl flex items-center justify-center gap-3 font-black text-sm hover:bg-zinc-800 transition-all active:scale-[0.98]"
                        >
                            {copied ? <Check size={20} className="text-emerald-400" strokeWidth={3} /> : <Copy size={20} strokeWidth={3} />}
                            {copied ? "Link Copied" : "Copy Shared Link"}
                        </button>

                        <Link 
                            href="/dashboard"
                            className="w-full h-14 bg-white/[0.02] border border-white/[0.05] text-zinc-500 rounded-2xl flex items-center justify-center gap-3 font-bold text-sm hover:text-white transition-all mt-4"
                        >
                            <ExternalLink size={18} />
                            Access Dashboard
                        </Link>
                    </div>

                    <div className="mt-8 flex items-center gap-4 px-2">
                        <div className="flex items-center gap-2">
                            <Clock size={14} className="text-zinc-600" />
                            <span className="text-xs font-bold text-zinc-600 tracking-tight">
                                {new Date(asset.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                        </div>
                        <div className="w-1 h-1 rounded-full bg-zinc-800" />
                        <div className="flex items-center gap-2">
                            <Check className="text-emerald-500/50" size={14} />
                            <span className="text-xs font-bold text-zinc-600 tracking-tight">Verified Storage</span>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Footer Attribution */}
            <motion.footer 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="absolute bottom-8 text-center"
            >
                <p className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.4em]">
                    Powered by CloudSnap Telegram Mesh
                </p>
            </motion.footer>
        </div>
    );
}
