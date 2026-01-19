'use client';

import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import { Cloud, Lock, Mail } from 'lucide-react';
import { ClientUserButton } from './ClientUserButton';

interface GuestViewProps {
    content: string;
    adminEmail?: string;
}

export function GuestView({ content, adminEmail }: GuestViewProps) {
    return (
        <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-indigo-500/30 flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-30 border-b border-zinc-800/40 bg-zinc-950/80 backdrop-blur-xl">
                <div className="w-full px-4 md:px-6 h-16 flex items-center justify-between max-w-7xl mx-auto">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 overflow-hidden relative">
                            <Image
                                src="/icons/android-chrome-192x192.png"
                                alt="CloudSnap Logo"
                                fill
                                className="object-cover"
                            />
                        </div>
                        <span className="text-lg font-bold tracking-tight text-white italic-display">CloudSnap</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center gap-2">
                            <Lock className="w-3 h-3 text-amber-500" />
                            <span className="text-xs font-medium text-amber-500 uppercase tracking-wider">Guest Access</span>
                        </div>
                        <ClientUserButton afterSignOutUrl="/" />
                    </div>
                </div>
            </header>

            <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-12 md:py-20">
                <div className="space-y-12">
                    {/* Terminal Window */}
                    <div className="w-full max-w-3xl bg-black rounded-lg border border-zinc-800 shadow-2xl overflow-hidden font-mono text-sm leading-relaxed">
                        {/* Terminal Header */}
                        <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
                            <div className="flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                                <div className="w-3 h-3 rounded-full bg-green-500/80" />
                            </div>
                            <div className="text-zinc-500 text-xs">admin@cloudsnap-server:~</div>
                            <div className="w-12" /> {/* Spacer for centering */}
                        </div>

                        {/* Terminal Content */}
                        <div className="p-6 md:p-8 text-zinc-300">
                            {/* Ascii-style Header */}
                            <div className="mb-6 text-indigo-500 font-bold whitespace-pre-wrap leading-none opacity-80 select-none">
                                {`   _______                __ _____                  
  / ____/ /___  __  _____/ // ___/____  ____ _____ 
 / /   / / __ \\/ / / / __  /\\__ \\/ __ \\/ __ \`/ __ \\
/ /___/ / /_/ / /_/ / /_/ /___/ / / / / /_/ / /_/ /
\\____/_/\\____/\\__,_/\\__,_//____/_/ /_/\\__,_/ .___/ 
                                          /_/      `}
                            </div>

                            <article className="prose prose-invert prose-sm max-w-none 
                                prose-headings:font-mono prose-headings:font-bold prose-headings:text-indigo-400 prose-headings:uppercase prose-headings:tracking-wider prose-headings:border-b prose-headings:border-zinc-800 prose-headings:pb-2
                                prose-h1:text-base prose-h1:mb-4
                                prose-h2:text-sm prose-h2:mt-6 prose-h2:mb-3
                                prose-p:text-zinc-400 prose-p:my-2
                                prose-strong:text-white prose-strong:font-bold
                                prose-ul:my-2 prose-ul:pl-0 prose-li:pl-0 prose-li:my-1
                                prose-hr:border-zinc-800 prose-hr:my-4
                            ">
                                <ReactMarkdown
                                    components={{
                                        // Terminal prompt for h1/h2
                                        h1: ({ node, ...props }) => <h1 className="flex items-center gap-2" {...props}><span className="text-green-500">$</span> {props.children}</h1>,
                                        h2: ({ node, ...props }) => <h2 className="flex items-center gap-2" {...props}><span className="text-indigo-500">{'>'}</span> {props.children}</h2>,
                                        // Custom terminal bullet points
                                        ul: ({ node, ...props }) => <ul className="list-none space-y-1" {...props} />,
                                        li: ({ node, ...props }) => (
                                            <li className="flex items-start gap-2">
                                                <span className="text-zinc-600 select-none shrink-0 mt-[2px]">-</span>
                                                <span>{props.children}</span>
                                            </li>
                                        ),
                                        // Code blocks look like active commands
                                        code: ({ node, ...props }) => <span className="text-green-400 bg-zinc-900 px-1 py-0.5" {...props} />
                                    }}
                                >
                                    {content}
                                </ReactMarkdown>
                            </article>

                            {/* Blinking Cursor Footer */}
                            <div className="mt-8 flex items-center gap-2 text-zinc-500 border-t border-zinc-800/50 pt-4">
                                <span className="text-green-500">➜</span>
                                <span>awaiting_admin_login...</span>
                                <span className="w-2 h-4 bg-zinc-500 animate-pulse" />
                            </div>
                        </div>
                    </div>

                    {/* Minimal Footer */}
                    <div className="text-center mt-6">
                        {adminEmail && (
                            <p className="font-mono text-xs text-zinc-600">
                                [CONTACT_ADMIN]: <span className="text-zinc-500">{adminEmail}</span>
                            </p>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
