"use client";

/*
 _________________________________________
/ You’re like a gray squirrel in a field  \
\ of red ones. You don't belong here.     /
 -----------------------------------------
        \   ^__^
         \  (oo)\_______
            (__)\       )\/\
                ||----w |
                ||     ||

 "If you're reading this, you've probably copied my Sidebar. 
  Just know that I know. And I'm disappointed, boah."
*/

import Image from "next/image";
import { useEffect, useState } from "react";
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
    ChevronDown,
    Search,
    Cloud,
    Trash2,
    FileText,
    Cpu
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Folder } from "@/lib/types";
import { useUser, SignOutButton } from "@clerk/nextjs";
import { ClientUserButton } from "./ClientUserButton";
import { StorageIndicator } from "./StorageIndicator";

interface SidebarProps {
    folders: Folder[];
    currentFolder: Folder | null;
    filterType: 'all' | 'photos' | 'videos' | 'documents';
    onNavigate: (folder: Folder | null) => void;
    onSetFilter: (type: 'all' | 'photos' | 'videos' | 'documents') => void;
    onCreateFolder: () => void;
    onUploadClick: () => void;
    onDeleteFolder?: (folder: Folder) => void;
    isOpen?: boolean;
    onClose?: () => void;
    className?: string;
    storageRefreshKey?: number;
    onSetView: (view: 'gallery' | 'developer') => void;
    view: 'gallery' | 'developer';
    userRole?: 'ADMIN' | 'DEMO';
    userUploadCount?: number;
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
    className,
    storageRefreshKey,
    onSetView,
    view,
    userRole = 'DEMO',
    userUploadCount = 0
}: SidebarProps) {


    const { user } = useUser();
    
    // Lock body scroll when mobile sidebar is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const sidebarContent = (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="p-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 overflow-hidden relative">
                    <Image
                        src="/icons/android-chrome-192x192.png"
                        alt="CloudSnap Logo"
                        fill
                        className="object-cover"
                    />
                </div>
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-white leading-tight italic-display">CloudSnap</h1>
                    <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider font-sans">Premium Cloud Storage</p>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="px-4 mb-8">
                <button
                    onClick={() => { 
                        if (userRole === 'DEMO' && userUploadCount >= 1) return;
                        onUploadClick(); 
                        onClose?.(); 
                    }}
                    className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold text-sm transition-all shadow-lg active:scale-95 mb-3",
                        (userRole === 'DEMO' && userUploadCount >= 1)
                            ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/50"
                            : "bg-white text-black hover:bg-zinc-200 shadow-white/5"
                    )}
                    title={userRole === 'DEMO' && userUploadCount >= 1 ? "Trial limit reached (1 upload)" : ""}
                >
                    <Plus className="w-5 h-5" />
                    {userRole === 'DEMO' && userUploadCount >= 1 ? 'Limit Reached' : 'Upload Assets'}
                </button>
                <button
                    onClick={() => { 
                        if (userRole === 'DEMO') return;
                        onCreateFolder(); 
                        onClose?.(); 
                    }}
                    className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-medium text-sm transition-all active:scale-95",
                        userRole === 'DEMO'
                            ? "bg-zinc-900/50 text-zinc-600 cursor-not-allowed border border-zinc-800/50"
                            : "bg-zinc-900 border border-zinc-800 text-white hover:bg-zinc-800"
                    )}
                    title={userRole === 'DEMO' ? "Folder creation disabled in Demo" : ""}
                >
                    <FolderPlus className={cn("w-5 h-5", userRole === 'DEMO' ? "text-zinc-700" : "text-indigo-400")} />
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
                                active={view === 'gallery' && currentFolder === null && filterType === 'all'}
                                onClick={() => { onSetView('gallery'); onNavigate(null); onClose?.(); }}
                            />
                            <NavItem
                                icon={<ImageIcon className="w-4 h-4" />}
                                label="Photos"
                                active={view === 'gallery' && currentFolder === null && filterType === 'photos'}
                                onClick={() => {
                                    onSetView('gallery');
                                    onNavigate(null);
                                    onSetFilter('photos');
                                    onClose?.();
                                }}
                            />
                            <NavItem
                                icon={<Video className="w-4 h-4" />}
                                label="Videos"
                                active={view === 'gallery' && currentFolder === null && filterType === 'videos'}
                                onClick={() => {
                                    onSetView('gallery');
                                    onNavigate(null);
                                    onSetFilter('videos');
                                    onClose?.();
                                }}
                            />
                            <NavItem
                                icon={<FileText className="w-4 h-4" />}
                                label="Documents"
                                active={view === 'gallery' && currentFolder === null && filterType === 'documents'}
                                onClick={() => {
                                    onSetView('gallery');
                                    onNavigate(null);
                                    onSetFilter('documents');
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
                                onNavigate={(f) => { onSetView('gallery'); onNavigate(f); onClose?.(); }}
                                onDeleteFolder={onDeleteFolder}
                            />
                        </div>
                    </div>
                </nav>
            </div>

            {/* Developer Section */}
            {userRole === 'ADMIN' && (
                <div className="px-4 mb-4">
                    <NavItem
                        icon={<Cpu className="w-4 h-4" />}
                        label="Developer Hub"
                        active={view === 'developer'}
                        onClick={() => { onSetView('developer'); onClose?.(); }}
                    />
                </div>
            )}


            {/* Storage Indicator */}
            <StorageIndicator storageRefreshKey={storageRefreshKey} />

            {/* User Profile / Logout */}
            <div className="p-4 mt-auto border-t border-zinc-800/40">
                <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900/50 border border-zinc-800/40 rounded-2xl">
                    <ClientUserButton afterSignOutUrl="/" appearance={{
                        elements: {
                            avatarBox: "w-8 h-8 rounded-xl"
                        }
                    }} />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-white truncate">
                                {user?.fullName || user?.username || 'User'}
                            </p>
                            {userRole === 'DEMO' && (
                                <span className="text-[9px] font-bold bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded-full border border-indigo-500/30 uppercase tracking-tighter">
                                    Trial
                                </span>
                            )}
                        </div>
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
                            transition={{ duration: 0.3, ease: "easeInOut" }}
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
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    // Auto-expand parents of the current folder
    useEffect(() => {
        if (currentFolderId) {
            const parents = new Set<string>();
            let curr = folders.find(f => f.id === currentFolderId);
            while (curr && curr.parent_id) {
                const pid: string = curr.parent_id;
                parents.add(pid);
                curr = folders.find(f => f.id === pid);
            }
            if (parents.size > 0) {
                setExpandedIds(prev => new Set([...prev, ...parents]));
            }
        }
    }, [currentFolderId, folders]);

    const toggleExpand = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const children = folders.filter(f => f.parent_id === parentId);

    if (children.length === 0 && level === 0) {
        return <p className="px-4 text-xs text-zinc-600 italic py-2">No folders created yet</p>;
    }

    return (
        <div className="space-y-0.5">
            {children.map(folder => {
                const hasChildren = folders.some(f => f.parent_id === folder.id);
                const isExpanded = expandedIds.has(folder.id);

                return (
                    <div key={folder.id} className="relative">
                        {/* Connecting Line for nested folders */}
                        {level > 0 && (
                            <div 
                                className="absolute left-[-10px] top-0 bottom-0 w-[1px] bg-zinc-800"
                                style={{ left: `${-10}px` }}
                            />
                        )}
                        
                        <div style={{ paddingLeft: `${level * 12}px` }}>
                            <NavItem
                                icon={<FolderIcon className={cn("w-4 h-4", level > 0 && "text-zinc-500 w-3.5 h-3.5")} />}
                                label={folder.name}
                                active={currentFolderId === folder.id}
                                onClick={() => onNavigate(folder)}
                                onDelete={onDeleteFolder ? () => onDeleteFolder(folder) : undefined}
                                accessory={hasChildren ? (
                                    <button 
                                        onClick={(e) => toggleExpand(folder.id, e)}
                                        className="p-1 hover:bg-white/5 rounded-md transition-colors"
                                    >
                                        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                    </button>
                                ) : undefined}
                            />
                        </div>

                        <AnimatePresence>
                            {isExpanded && hasChildren && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2, ease: "easeInOut" }}
                                    className="overflow-hidden"
                                >
                                    <div className="ml-2 border-l border-zinc-800/50">
                                        <FolderTree
                                            folders={folders}
                                            parentId={folder.id}
                                            level={level + 1}
                                            currentFolderId={currentFolderId}
                                            onNavigate={onNavigate}
                                            onDeleteFolder={onDeleteFolder}
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                );
            })}
        </div>
    );
}

function NavItem({ icon, label, active, onClick, onDelete, count, accessory }: {
    icon: React.ReactNode,
    label: string,
    active?: boolean,
    onClick?: () => void,
    onDelete?: () => void,
    count?: number,
    accessory?: React.ReactNode
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
                    "w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13px] font-medium transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                    active
                        ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_-5px_rgba(99,102,241,0.2)]"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-800/40 border border-transparent"
                )}
            >
                <div className="flex items-center gap-2.5">
                    {accessory}
                    <span className={cn("transition-colors", active ? "text-indigo-400" : "text-zinc-500 group-hover:text-zinc-300")}>
                        {icon}
                    </span>
                    <span className="truncate max-w-[120px]">{label}</span>
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
