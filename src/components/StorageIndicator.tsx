"use client";

import { useEffect, useState } from 'react';
import { HardDrive, Database } from 'lucide-react';
import { motion } from 'framer-motion';

interface StorageUsage {
    usedBytes: number;
    usedFormatted: string;
    quotaBytes: number;
    quotaFormatted: string;
    percentage: number;
    fileCount: number;
}

interface StorageIndicatorProps {
    storageRefreshKey?: number;
}

export function StorageIndicator({ storageRefreshKey }: StorageIndicatorProps) {
    const [storage, setStorage] = useState<StorageUsage | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStorage();
    }, [storageRefreshKey]);

    const fetchStorage = async () => {
        try {
            const res = await fetch('/api/storage-usage');
            const data = await res.json();
            setStorage(data);
        } catch (err) {
            console.error('Failed to fetch storage usage:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="mx-4 mb-4 p-4 rounded-2xl border border-zinc-800/50 bg-zinc-900/30">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-800/50 animate-pulse" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3 bg-zinc-800/50 rounded animate-pulse w-24" />
                        <div className="h-2 bg-zinc-800/50 rounded animate-pulse w-full" />
                    </div>
                </div>
            </div>
        );
    }

    if (!storage) return null;

    // Blue/indigo theme - all states use blue gradients matching the site theme
    const getProgressColor = () => {
        if (storage.percentage < 50) return 'from-blue-500 to-indigo-500';
        if (storage.percentage < 75) return 'from-indigo-500 to-blue-600';
        if (storage.percentage < 90) return 'from-indigo-600 to-purple-600';
        return 'from-purple-600 to-pink-600';
    };

    const getIconColor = () => {
        if (storage.percentage < 50) return 'text-blue-400';
        if (storage.percentage < 75) return 'text-indigo-400';
        if (storage.percentage < 90) return 'text-indigo-500';
        return 'text-purple-400';
    };

    const getBgGlow = () => {
        if (storage.percentage < 50) return 'from-blue-500/10 to-indigo-500/10';
        if (storage.percentage < 75) return 'from-indigo-500/10 to-blue-600/10';
        if (storage.percentage < 90) return 'from-indigo-600/10 to-purple-600/10';
        return 'from-purple-600/10 to-pink-600/10';
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mx-4 mb-4"
        >
            <div className={`p-4 rounded-2xl border border-zinc-800/50 bg-gradient-to-br ${getBgGlow()} backdrop-blur-sm`}>
                {/* Header */}
                <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getBgGlow()} border border-zinc-700/50 flex items-center justify-center flex-shrink-0`}>
                        <Database className={`w-5 h-5 ${getIconColor()}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Telegram Storage</p>
                        <p className="text-sm font-bold text-white">
                            {storage.usedFormatted} <span className="text-zinc-600">/</span> <span className="text-zinc-400">{storage.quotaFormatted}</span>
                        </p>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="relative mb-3">
                    <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/50">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${storage.percentage}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className={`h-full bg-gradient-to-r ${getProgressColor()} rounded-full relative`}
                        >
                            {/* Shimmer effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
                                style={{ backgroundSize: '200% 100%' }} />
                        </motion.div>
                    </div>
                    {/* Percentage label */}
                    <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[10px] text-zinc-600 font-medium">
                            {storage.fileCount} {storage.fileCount === 1 ? 'file' : 'files'}
                        </span>
                        <span className={`text-[10px] font-bold ${getIconColor()}`}>
                            {storage.percentage.toFixed(1)}%
                        </span>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
                .animate-shimmer {
                    animation: shimmer 3s infinite;
                }
            `}</style>
        </motion.div>
    );
}
