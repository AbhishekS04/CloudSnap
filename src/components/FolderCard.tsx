
"use client";

import { Folder } from '@/lib/types';
import { Folder as FolderIcon, FolderOpen } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';

interface FolderCardProps {
    folder: Folder;
    onNavigate: (folder: Folder) => void;
    onDropImages: (folderId: string, imageIds: string[]) => void;
    onDelete?: (folder: Folder) => void;
}

export function FolderCard({ folder, onNavigate, onDropImages, onDelete }: FolderCardProps) {
    const [isDragOver, setIsDragOver] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const imageId = e.dataTransfer.getData('imageId');
        if (imageId) {
            onDropImages(folder.id, [imageId]);
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate(folder)}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
                group cursor-pointer relative p-8 rounded-3xl border transition-all duration-500
                flex flex-col items-center justify-center gap-4 aspect-square
                ${isDragOver
                    ? 'bg-indigo-500/10 border-indigo-500 ring-2 ring-indigo-500/50 shadow-2xl'
                    : 'bg-zinc-900/40 border-zinc-800/50 hover:bg-zinc-800/50 hover:border-white/10 hover:shadow-xl'
                }
            `}
        >
            <div className={`
                w-16 h-16 rounded-3xl flex items-center justify-center transition-all duration-500 shadow-xl
                ${isDragOver
                    ? 'bg-indigo-500 text-white scale-110'
                    : 'bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white group-hover:scale-110 shadow-indigo-500/10'
                }
            `}>
                {isDragOver ? <FolderOpen className="w-8 h-8" /> : <FolderIcon className="w-8 h-8" />}
            </div>

            <div className="text-center w-full relative z-10 flex flex-col gap-1">
                <h3 className="text-base font-bold text-white truncate px-2 leading-tight">
                    {folder.name}
                </h3>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    Collection
                </p>
            </div>

            {onDelete && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(folder);
                    }}
                    className="absolute top-4 right-4 p-2 bg-black/40 backdrop-blur-xl border border-white/5 text-zinc-500 hover:text-red-400 rounded-full transition-all hover:scale-110 opacity-0 group-hover:opacity-100 z-20"
                    title="Delete Folder"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c0 1 2 1 2 2v2" />
                    </svg>
                </button>
            )}

            {/* Subtle Gradient Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-[2rem] pointer-events-none" />
        </motion.div>
    );
}
