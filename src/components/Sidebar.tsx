"use client";

import { cn } from "@/lib/utils";
import {
    LayoutGrid,
    Image as ImageIcon,
    Video,
    Folder as FolderIcon,
    Plus,
    FolderPlus,
    LogOut,
    ChevronRight,
    Search,
    Cloud,
    Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Folder } from "@/lib/types";
import { UserButton, useUser, SignOutButton } from "@clerk/nextjs";

interface SidebarProps {
    folders: Folder[];
    currentFolder: Folder | null;
    filterType: 'all' | 'photos' | 'videos';
    onNavigate: (folder: Folder | null) => void;
    onSetFilter: (type: 'all' | 'photos' | 'videos') => void;
    onCreateFolder: () => void;
    onUploadClick: () => void;
    onDeleteFolder?: (folder: Folder) => void;
    isOpen?: boolean;
    onClose?: () => void;
    className?: string;
}

export function Sidebar({
    folders,
    currentFolder,
    filterType,
    onNavigate,
    onSetFilter,
    onCreateFolder,
    onUploadClick,
    onDeleteFolder,
    isOpen,
    onClose,
    className
}: SidebarProps) {
    const { user } = useUser();

    const sidebarContent = (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="p-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <Cloud className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-white leading-tight italic-display">CloudSnap</h1>
                    <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider font-sans">Premium Cloud Storage</p>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="px-4 mb-8">
                <button
                    onClick={() => { onUploadClick(); onClose?.(); }}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-white text-black hover:bg-zinc-200 rounded-2xl font-semibold text-sm transition-all shadow-lg shadow-white/5 active:scale-95 mb-3"
                >
                    <Plus className="w-5 h-5" />
                    Upload Assets
                </button>
                <button
                    onClick={() => { onCreateFolder(); onClose?.(); }}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-900 border border-zinc-800 text-white hover:bg-zinc-800 rounded-2xl font-medium text-sm transition-all active:scale-95"
                >
                    <FolderPlus className="w-5 h-5 text-indigo-400" />
                    New Folder
                </button>
            </div>

            {/* Navigation Sections */}
            <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">
                <nav className="space-y-6">
                    {/* Library Section */}
                    <div>
                        <p className="px-4 text-[12px] text-zinc-500 italic-display tracking-wider mb-2 opacity-70">Library</p>
                        <div className="space-y-1">
                            <NavItem
                                icon={<LayoutGrid className="w-4 h-4" />}
                                label="All Assets"
                                active={currentFolder === null && filterType === 'all'}
                                onClick={() => { onNavigate(null); onClose?.(); }}
                            />
                            <NavItem
                                icon={<ImageIcon className="w-4 h-4" />}
                                label="Photos"
                                active={currentFolder === null && filterType === 'photos'}
                                onClick={() => {
                                    onNavigate(null);
                                    onSetFilter('photos');
                                    onClose?.();
                                }}
                            />
                            <NavItem
                                icon={<Video className="w-4 h-4" />}
                                label="Videos"
                                active={currentFolder === null && filterType === 'videos'}
                                onClick={() => {
                                    onNavigate(null);
                                    onSetFilter('videos');
                                    onClose?.();
                                }}
                            />
                        </div>
                    </div>

                    {/* Folders Section */}
                    <div>
                        <div className="flex items-center justify-between px-4 mb-2">
                            <p className="text-[12px] text-zinc-500 italic-display tracking-wider opacity-70">Folders</p>
                        </div>
                        <div className="space-y-1 px-2">
                            <FolderTree
                                folders={folders}
                                parentId={null}
                                level={0}
                                currentFolderId={currentFolder?.id}
                                onNavigate={(f) => { onNavigate(f); onClose?.(); }}
                                onDeleteFolder={onDeleteFolder}
                            />
                        </div>
                    </div>
                </nav>
            </div>

            {/* User Profile / Logout */}
            <div className="p-4 mt-auto border-t border-zinc-800/40">
                <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900/50 border border-zinc-800/40 rounded-2xl">
                    <UserButton afterSignOutUrl="/" appearance={{
                        elements: {
                            avatarBox: "w-8 h-8 rounded-xl"
                        }
                    }} />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                            {user?.fullName || user?.username || 'User'}
                        </p>
                        <p className="text-[10px] text-zinc-500 truncate">{user?.primaryEmailAddress?.emailAddress}</p>
                    </div>
                    <SignOutButton>
                        <button className="p-1.5 text-zinc-500 hover:text-white transition-colors">
                            <LogOut className="w-4 h-4" />
                        </button>
                    </SignOutButton>
                </div>
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className={cn(
                "hidden lg:flex w-72 border-r border-zinc-800/40 bg-zinc-950 h-screen flex-col fixed left-0 top-0 z-40",
                className
            )}>
                {sidebarContent}
            </aside>

            {/* Mobile Sidebar (Drawer) */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onClose}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[50] lg:hidden"
                        />
                        <motion.aside
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed left-0 top-0 bottom-0 w-[280px] bg-zinc-950 border-r border-zinc-800/50 z-[60] lg:hidden shadow-2xl"
                        >
                            {sidebarContent}
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}

function FolderTree({
    folders,
    parentId = null,
    level = 0,
    currentFolderId,
    onNavigate,
    onDeleteFolder
}: {
    folders: Folder[],
    parentId: string | null,
    level: number,
    currentFolderId?: string,
    onNavigate: (folder: Folder) => void,
    onDeleteFolder?: (folder: Folder) => void
}) {
    const children = folders.filter(f => f.parent_id === parentId);

    if (children.length === 0 && level === 0) {
        return <p className="px-4 text-xs text-zinc-600 italic py-2">No folders created yet</p>;
    }

    return (
        <div className="space-y-1">
            {children.map(folder => (
                <div key={folder.id}>
                    <div style={{ paddingLeft: `${level * 12}px` }}>
                        <NavItem
                            icon={<FolderIcon className={cn("w-4 h-4", level > 0 && "text-zinc-500 w-3.5 h-3.5")} />}
                            label={folder.name}
                            active={currentFolderId === folder.id}
                            onClick={() => onNavigate(folder)}
                            onDelete={onDeleteFolder ? () => onDeleteFolder(folder) : undefined}
                        />
                    </div>
                    <FolderTree
                        folders={folders}
                        parentId={folder.id}
                        level={level + 1}
                        currentFolderId={currentFolderId}
                        onNavigate={onNavigate}
                        onDeleteFolder={onDeleteFolder}
                    />
                </div>
            ))}
        </div>
    );
}

function NavItem({ icon, label, active, onClick, onDelete, count }: {
    icon: React.ReactNode,
    label: string,
    active?: boolean,
    onClick?: () => void,
    onDelete?: () => void,
    count?: number
}) {
    return (
        <div className="relative group/nav">
            <div
                role="button"
                tabIndex={0}
                onClick={onClick}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onClick?.();
                    }
                }}
                className={cn(
                    "w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                    active
                        ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-800/50 border border-transparent"
                )}
            >
                <div className="flex items-center gap-3">
                    <span className={cn("transition-colors", active ? "text-indigo-400" : "text-zinc-500 group-hover:text-zinc-300")}>
                        {icon}
                    </span>
                    <span className="truncate max-w-[140px]">{label}</span>
                </div>
                <div className="flex items-center gap-2">
                    {count !== undefined && (
                        <span className="text-[10px] font-bold bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded-md">
                            {count}
                        </span>
                    )}
                    {onDelete && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete();
                            }}
                            className="p-1 text-zinc-600 hover:text-red-400 opacity-0 group-hover/nav:opacity-100 transition-all"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
                {active && (
                    <motion.div layoutId="nav-active" className="absolute left-0 w-1 h-4 bg-indigo-500 rounded-r-full" />
                )}
            </div>
        </div>
    );
}
