"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, Plus, Trash2, Copy, Check, Terminal, Globe, Code2, Cpu, HelpCircle, ChevronRight, ExternalLink, Zap, Box } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ApiKey {
    id: string;
    name: string;
    key_value: string;
    created_at: string;
    last_used_at: string | null;
}

export function DeveloperHub() {
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'keys' | 'docs'>('keys');

    useEffect(() => {
        fetchKeys();
    }, []);

    const fetchKeys = async () => {
        try {
            const res = await fetch('/api/v1/keys');
            const data = await res.json();
            if (Array.isArray(data)) setKeys(data);
        } catch (err) {
            console.error('Failed to fetch keys', err);
        } finally {
            setLoading(false);
        }
    };

    const createKey = async () => {
        if (!newKeyName.trim()) return;
        setIsCreating(true);
        try {
            const res = await fetch('/api/v1/keys', {
                method: 'POST',
                body: JSON.stringify({ name: newKeyName })
            });
            if (res.ok) {
                setNewKeyName('');
                fetchKeys();
            }
        } catch (err) {
            console.error('Failed to create key', err);
        } finally {
            setIsCreating(false);
        }
    };

    const deleteKey = async (id: string) => {
        if (!confirm('Are you sure you want to revoke this API key? Any apps using it will stop working.')) return;
        try {
            const res = await fetch(`/api/v1/keys?id=${id}`, { method: 'DELETE' });
            if (res.ok) fetchKeys();
        } catch (err) {
            console.error('Failed to delete key', err);
        }
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Cpu className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-3xl font-black tracking-tight text-white">Developer Hub</h1>
                    </div>
                    <p className="text-zinc-500 font-medium">Build apps powered by the CloudSnap media mesh.</p>
                </div>

                <div className="flex p-1 bg-zinc-900 border border-zinc-800 rounded-2xl">
                    <button 
                        onClick={() => setActiveTab('keys')}
                        className={cn(
                            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                            activeTab === 'keys' ? "bg-white text-black shadow-xl" : "text-zinc-500 hover:text-white"
                        )}
                    >
                        API Keys
                    </button>
                    <button 
                        onClick={() => setActiveTab('docs')}
                        className={cn(
                            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                            activeTab === 'docs' ? "bg-white text-black shadow-xl" : "text-zinc-500 hover:text-white"
                        )}
                    >
                        Documentation
                    </button>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'keys' ? (
                    <motion.div 
                        key="keys"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                    >
                        {/* Key Generation Card */}
                        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2.5rem] relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full -mr-32 -mt-32" />
                            <div className="relative z-10">
                                <h3 className="text-lg font-bold text-white mb-6">Generate New Secret Key</h3>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <input 
                                        type="text" 
                                        placeholder="e.g. My Portfolio Backend"
                                        value={newKeyName}
                                        onChange={(e) => setNewKeyName(e.target.value)}
                                        className="flex-1 h-14 bg-zinc-950 border border-zinc-800 rounded-2xl px-6 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                    />
                                    <button 
                                        onClick={createKey}
                                        disabled={isCreating || !newKeyName}
                                        className="h-14 px-8 bg-white text-black rounded-2xl font-black text-sm flex items-center justify-center gap-3 hover:bg-zinc-200 transition-all active:scale-[0.98] disabled:opacity-50"
                                    >
                                        {isCreating ? <Zap className="w-4 h-4 animate-pulse" /> : <Plus className="w-5 h-5" />}
                                        Create API Key
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Keys List */}
                        <div className="grid grid-cols-1 gap-4">
                            {loading ? (
                                Array(2).fill(0).map((_, i) => (
                                    <div key={i} className="h-24 bg-zinc-900/50 border border-zinc-800 rounded-3xl animate-pulse" />
                                ))
                            ) : keys.length === 0 ? (
                                <div className="py-20 text-center border-2 border-dashed border-zinc-800 rounded-[2.5rem]">
                                    <Key className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                                    <p className="text-zinc-500 font-medium">No API keys generated yet.</p>
                                </div>
                            ) : (
                                keys.map((key) => (
                                    <motion.div 
                                        layout
                                        key={key.id}
                                        className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-6 group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-zinc-950 rounded-2xl flex items-center justify-center border border-white/5">
                                                <Key className="w-5 h-5 text-indigo-400" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white mb-0.5">{key.name}</h4>
                                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                                                    Created {new Date(key.created_at).toLocaleDateString()} • {key.last_used_at ? `Last used ${new Date(key.last_used_at).toLocaleDateString()}` : 'Never used'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="px-4 py-2 bg-zinc-950 rounded-xl border border-zinc-800 font-mono text-xs text-zinc-400 group-hover:text-white transition-colors">
                                                {key.key_value.substring(0, 10)}••••••••••••
                                            </div>
                                            <button 
                                                onClick={() => copyToClipboard(key.key_value, key.id)}
                                                className="p-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-all"
                                            >
                                                {copiedId === key.id ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                                            </button>
                                            <button 
                                                onClick={() => deleteKey(key.id)}
                                                className="p-3 bg-zinc-800 hover:bg-red-500/20 hover:text-red-400 text-zinc-500 rounded-xl transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </motion.div>
                ) : (
                    <motion.div 
                        key="docs"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-1 lg:grid-cols-12 gap-8"
                    >
                        {/* Documentation Sidebar */}
                        <div className="lg:col-span-4 space-y-4">
                            <DocSection title="Getting Started" icon={<Zap className="w-4 h-4 text-amber-400" />}>
                                <p className="text-sm text-zinc-500 leading-relaxed">
                                    CloudSnap provides a simple, versioned API for programmatic file uploads. All binaries are securely mirrored across the Telegram network.
                                </p>
                            </DocSection>

                            <DocSection title="API Endpoint" icon={<Globe className="w-4 h-4 text-sky-400" />}>
                                <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 font-mono text-[11px] text-zinc-400 break-all">
                                    POST {typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/upload
                                </div>
                            </DocSection>

                            <DocSection title="Postman Setup" icon={<Terminal className="w-4 h-4 text-indigo-400" />}>
                                <ol className="text-sm text-zinc-500 space-y-3 list-decimal list-inside">
                                    <li>Method: <span className="text-indigo-400 font-bold">POST</span></li>
                                    <li>Body: <span className="text-indigo-400 font-bold">form-data</span></li>
                                    <li>Key: <span className="text-zinc-300 font-bold">file</span> (Type: File)</li>
                                    <li>Header: <span className="text-zinc-300 font-bold">x-api-key</span></li>
                                </ol>
                            </DocSection>
                        </div>

                        {/* Code Examples Area */}
                        <div className="lg:col-span-8 space-y-6">
                            <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8">
                                <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                                    <Code2 className="text-indigo-400" />
                                    Implementation Guide
                                </h3>

                                <div className="space-y-8">
                                    <CodeSnippet 
                                        label="JavaScript (Fetch API)"
                                        code={`const formData = new FormData();\nformData.append('file', fileInput.files[0]);\n\nconst res = await fetch('${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/upload', {\n  method: 'POST',\n  headers: { 'x-api-key': 'YOUR_API_KEY' },\n  body: formData\n});\n\nconst data = await res.json();\nconsole.log(data.asset.links.share);`}
                                    />

                                    <CodeSnippet 
                                        label="cURL (Terminal)"
                                        code={`curl -X POST ${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/upload \\\n  -H "x-api-key: YOUR_API_KEY" \\\n  -F "file=@/path/to/your/image.jpg"`}
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function DocSection({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) {
    return (
        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-3xl">
            <div className="flex items-center gap-2 mb-3">
                {icon}
                <h4 className="text-sm font-black text-white uppercase tracking-widest">{title}</h4>
            </div>
            {children}
        </div>
    );
}

function CodeSnippet({ label, code }: { label: string, code: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{label}</span>
                <button onClick={handleCopy} className="text-[10px] font-bold text-indigo-400 hover:text-white transition-colors">
                    {copied ? 'Copied!' : 'Copy Code'}
                </button>
            </div>
            <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 font-mono text-[11px] leading-relaxed text-zinc-400 overflow-x-auto">
                <pre>{code}</pre>
            </div>
        </div>
    );
}
