
"use client";

import { Folder } from '@/lib/types';
import { Folder as FolderIcon, FolderOpen } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';

interface FolderCardProps {
    folder: Folder;
    onNavigate: (folder: Folder) => void;
    onDropImages: (folderId: string, imageIds: string[]) => void;
}

export function FolderCard({ folder, onNavigate, onDropImages }: FolderCardProps) {
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
            transition={{ duration: 0.2, ease: 'easeOut' }}
            whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate(folder)}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
                group cursor-pointer relative p-4 rounded-xl border transition-colors duration-200
                flex flex-col items-center justify-center gap-3 aspect-video
                ${isDragOver
                    ? 'bg-indigo-500/20 border-indigo-500 ring-2 ring-indigo-500/50'
                    : 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700'
                }
            `}
        >
            <div className={`
                p-3 rounded-full transition-colors duration-300
                ${isDragOver ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-indigo-400 group-hover:bg-zinc-700 group-hover:text-indigo-300'}
            `}>
                {isDragOver ? <FolderOpen className="w-8 h-8" /> : <FolderIcon className="w-8 h-8" />}
            </div>

            <div className="text-center w-full">
                <h3 className="text-sm font-medium text-zinc-200 truncate px-2">{folder.name}</h3>
                <p className="text-[10px] text-zinc-500 mt-1">Folder</p>
            </div>
        </motion.div>
    );
}
