"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Key, Plus, Trash2, Copy, Check, Terminal, Globe, 
    Code2, Cpu, Zap, Folder, ShieldCheck, Sparkles, 
    ChevronDown, AlertCircle, FileCode2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Folder as FolderType } from '@/lib/types';

interface ApiKey {
    id: string;
    name: string;
    key_value: string;
    created_at: string;
    last_used_at: string | null;
    folder_id: string | null;
}

interface DeveloperHubProps {
    folders: FolderType[];
}

export function DeveloperHub({ folders }: DeveloperHubProps) {
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [selectedFolderId, setSelectedFolderId] = useState<string | 'none'>('none');
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
                body: JSON.stringify({ 
                    name: newKeyName,
                    folder_id: selectedFolderId === 'none' ? null : selectedFolderId
                })
            });
            if (res.ok) {
                setNewKeyName('');
                setSelectedFolderId('none');
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

    const copyAiPrompt = () => {
        const origin = "https://cloud-snapp.vercel.app";
        const prompt = `### CLOUDSNAP MAAS INTEGRATION PLAN
I need to integrate CloudSnap Media-as-a-Service (MaaS) into my project.

**API Context:**
- Base URL: ${origin}/api/v1
- Auth: Header 'x-api-key'

**Task:**
1. Create a service file at \`lib/cloudsnap.ts\`.
2. Add 'CLOUDSNAP_API_KEY' to \`.env.local\`.
3. Implement an 'uploadMedia' function using multipart/form-data.

**Service Blueprint (lib/cloudsnap.ts):**
\`\`\`typescript
export async function uploadToCloudSnap(file: File, folderId?: string) {
  const formData = new FormData();
  formData.append('file', file);
  if (folderId) formData.append('folderId', folderId);

  const res = await fetch('${origin}/api/v1/upload', {
    method: 'POST',
    headers: { 'x-api-key': process.env.CLOUDSNAP_API_KEY! },
    body: formData
  });
  return res.json();
}
\`\`\`

**Next.js Configuration (next.config.js):**
If using Next.js, add this to allow image optimization from CloudSnap:
\`\`\`javascript
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cloud-snapp.vercel.app',
        pathname: '/api/cdn/**',
      },
    ],
  },
};
\`\`\`

**Response Schema:**
The API returns \`{ success: true, asset: { id, links: { cdn, share, download } } }\`. Use \`asset.links.cdn\` as the source for images/videos.

Please implement this service, update the config, and create a basic upload component for me.`;
        
        navigator.clipboard.writeText(prompt);
        setCopiedId('ai-prompt');
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-10">
            {/* Premium Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <motion.div 
                            initial={{ rotate: -10, scale: 0.9 }}
                            animate={{ rotate: 0, scale: 1 }}
                            className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/20"
                        >
                            <Cpu className="w-8 h-8 text-white" />
                        </motion.div>
                        <div>
                            <h1 className="text-4xl font-black tracking-tight text-white italic-display">Developer Hub</h1>
                            <div className="flex items-center gap-2 text-indigo-400/80 font-bold text-xs uppercase tracking-[0.2em] mt-1">
                                <Sparkles className="w-3 h-3" />
                                <span>Media-as-a-Service (MaaS)</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex p-1.5 bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-[1.25rem] shadow-inner">
                    <button 
                        onClick={() => setActiveTab('keys')}
                        className={cn(
                            "px-8 py-3 rounded-xl text-sm font-black transition-all duration-300",
                            activeTab === 'keys' ? "bg-white text-black shadow-2xl shadow-white/10 scale-105" : "text-zinc-500 hover:text-white"
                        )}
                    >
                        Secret Keys
                    </button>
                    <button 
                        onClick={() => setActiveTab('docs')}
                        className={cn(
                            "px-8 py-3 rounded-xl text-sm font-black transition-all duration-300",
                            activeTab === 'docs' ? "bg-white text-black shadow-2xl shadow-white/10 scale-105" : "text-zinc-500 hover:text-white"
                        )}
                    >
                        Integration
                    </button>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'keys' ? (
                    <motion.div 
                        key="keys"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-8"
                    >
                        {/* Advanced Key Generation Card */}
                        <div className="bg-zinc-900/40 backdrop-blur-2xl border border-zinc-800/50 p-8 rounded-[3rem] relative overflow-hidden group shadow-2xl">
                            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full -mr-64 -mt-64 transition-all duration-1000 group-hover:bg-indigo-500/10" />
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="w-10 h-10 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20">
                                        <Zap className="w-5 h-5 text-indigo-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-white">Create Access Token</h3>
                                        <p className="text-sm text-zinc-500 font-medium">Configure scoping and permissions for your new API key.</p>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Key Name</label>
                                        <input 
                                            type="text" 
                                            placeholder="e.g. Production Mobile App"
                                            value={newKeyName}
                                            onChange={(e) => setNewKeyName(e.target.value)}
                                            className="w-full h-16 bg-zinc-950/50 border border-zinc-800 rounded-2xl px-6 text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all font-medium"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Access Type</label>
                                            <CustomDropdown 
                                                value={selectedFolderId === 'none' ? 'full' : 'restricted'}
                                                options={[
                                                    { id: 'full', name: 'Full Account Access' },
                                                    { id: 'restricted', name: 'Restricted Folder Access' }
                                                ]}
                                                onChange={(val) => {
                                                    if (val === 'full') setSelectedFolderId('none');
                                                    else if (folders.length > 0) setSelectedFolderId(folders[0].id);
                                                }}
                                            />
                                        </div>

                                        {selectedFolderId !== 'none' && (
                                            <motion.div 
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="space-y-3"
                                            >
                                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Select Folder</label>
                                                <CustomDropdown 
                                                    value={selectedFolderId}
                                                    options={folders.map(f => ({ id: f.id, name: f.name }))}
                                                    onChange={setSelectedFolderId}
                                                />
                                            </motion.div>
                                        )}
                                    </div>
                                </div>

                                <button 
                                    onClick={createKey}
                                    disabled={isCreating || !newKeyName}
                                    className="w-full h-16 bg-white text-black rounded-2xl font-black text-sm flex items-center justify-center gap-3 hover:bg-zinc-200 transition-all active:scale-[0.98] disabled:opacity-50 shadow-xl shadow-white/5"
                                >
                                    {isCreating ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-black rounded-full animate-bounce" />
                                            <div className="w-2 h-2 bg-black rounded-full animate-bounce [animation-delay:0.2s]" />
                                            <div className="w-2 h-2 bg-black rounded-full animate-bounce [animation-delay:0.4s]" />
                                        </div>
                                    ) : (
                                        <>
                                            <ShieldCheck className="w-5 h-5" />
                                            Generate Production Key
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Keys Display Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-6 mb-2">
                                <h4 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">Active Security Tokens</h4>
                                <span className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-[10px] font-bold text-zinc-500">
                                    {keys.length} KEYS FOUND
                                </span>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {loading ? (
                                    Array(2).fill(0).map((_, i) => (
                                        <div key={i} className="h-32 bg-zinc-900/20 border border-zinc-800/50 rounded-[2rem] animate-pulse" />
                                    ))
                                ) : keys.length === 0 ? (
                                    <div className="py-24 text-center bg-zinc-950/30 border-2 border-dashed border-zinc-900 rounded-[3rem]">
                                        <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <Key className="w-8 h-8 text-zinc-700" />
                                        </div>
                                        <h5 className="text-lg font-bold text-zinc-400 mb-2">Zero Active Keys</h5>
                                        <p className="text-zinc-600 font-medium text-sm">Generate a key above to start building.</p>
                                    </div>
                                ) : (
                                    keys.map((key) => (
                                        <motion.div 
                                            layout
                                            key={key.id}
                                            initial={{ opacity: 0, scale: 0.98 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="bg-zinc-900/40 border border-zinc-800/40 p-6 sm:p-8 rounded-[2rem] flex flex-col lg:flex-row lg:items-center justify-between gap-8 group hover:border-indigo-500/30 transition-all hover:bg-zinc-900/60 shadow-xl"
                                        >
                                            <div className="flex items-center gap-6">
                                                <div className="w-16 h-16 bg-zinc-950 rounded-2xl flex items-center justify-center border border-white/5 group-hover:border-indigo-500/20 transition-all">
                                                    <Key className="w-6 h-6 text-indigo-400" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-3">
                                                        <h4 className="font-black text-xl text-white tracking-tight">{key.name}</h4>
                                                        {key.folder_id && (
                                                            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-[10px] font-black text-amber-400 uppercase tracking-widest">
                                                                <Folder className="w-3 h-3" />
                                                                <span>{folders.find(f => f.id === key.folder_id)?.name || 'Scoped'}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">
                                                        {key.last_used_at ? `Last active ${new Date(key.last_used_at).toLocaleDateString()}` : 'Never used'} • {new Date(key.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-3">
                                                <div className="px-6 py-4 bg-zinc-950 rounded-2xl border border-zinc-800/50 font-mono text-[11px] text-zinc-500 group-hover:text-zinc-300 transition-colors shadow-inner flex items-center gap-4">
                                                    <span>{key.key_value.substring(0, 10)}</span>
                                                    <span className="opacity-20 text-xs">••••••••••••••••••••••••</span>
                                                    <span>{key.key_value.slice(-6)}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => copyToClipboard(key.key_value, key.id)}
                                                        className="p-4 bg-zinc-800/50 hover:bg-white hover:text-black rounded-2xl transition-all shadow-lg active:scale-90"
                                                    >
                                                        {copiedId === key.id ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                                                    </button>
                                                    <button 
                                                        onClick={() => deleteKey(key.id)}
                                                        className="p-4 bg-zinc-800/50 hover:bg-red-500 hover:text-white rounded-2xl transition-all shadow-lg active:scale-90"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div 
                        key="docs"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="grid grid-cols-1 lg:grid-cols-12 gap-8"
                    >
                        {/* Knowledge Base */}
                        <div className="lg:col-span-4 space-y-6">
                            <div className="p-8 bg-zinc-900/40 border border-zinc-800/50 rounded-[2.5rem] space-y-6">
                                <div className="flex items-center gap-3">
                                    <ShieldCheck className="w-6 h-6 text-indigo-400" />
                                    <h4 className="text-sm font-black text-white uppercase tracking-[0.2em]">Security Overview</h4>
                                </div>
                                <p className="text-sm text-zinc-500 leading-relaxed font-medium">
                                    All requests must be made over HTTPS. Your API key is a secret — never expose it in client-side code.
                                </p>
                                <div className="pt-4 border-t border-zinc-800/50 space-y-4">
                                    <button 
                                        onClick={copyAiPrompt}
                                        className="w-full py-4 bg-indigo-500 hover:bg-indigo-400 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/20 active:scale-95"
                                    >
                                        {copiedId === 'ai-prompt' ? <Check size={16} /> : <FileCode2 size={16} />}
                                        {copiedId === 'ai-prompt' ? 'Copied Context' : 'Copy Prompt for AI'}
                                    </button>
                                    <p className="text-[10px] text-zinc-600 text-center font-bold px-4">
                                        Paste this prompt into ChatGPT or Claude to auto-generate the integration code.
                                    </p>
                                </div>
                            </div>

                            <div className="p-8 bg-zinc-900/40 border border-zinc-800/50 rounded-[2.5rem] space-y-6">
                                <div className="flex items-center gap-3">
                                    <AlertCircle className="w-6 h-6 text-amber-400" />
                                    <h4 className="text-sm font-black text-white uppercase tracking-[0.2em]">Postman Settings</h4>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-zinc-600 uppercase">Endpoint</p>
                                        <code className="text-[11px] text-indigo-400 break-all font-mono font-bold bg-black/40 px-2 py-1 rounded">
                                            POST /api/v1/upload
                                        </code>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-zinc-600 uppercase">Body Type</p>
                                        <p className="text-xs text-zinc-400 font-bold">multipart/form-data</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Implementation Guide */}
                        <div className="lg:col-span-8 space-y-6">
                            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[3rem] p-8 sm:p-10">
                                <div className="flex items-center gap-4 mb-10">
                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-2xl">
                                        <Code2 className="w-6 h-6 text-black" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-white tracking-tight italic-display">Implementation Guide</h3>
                                        <p className="text-zinc-500 text-sm font-medium">Standard patterns for production-grade integrations.</p>
                                    </div>
                                </div>

                                <div className="space-y-10">
                                    <CodeSnippet 
                                        label="JavaScript (Modern Fetch)"
                                        code={`// 1. Prepare the media\nconst formData = new FormData();\nformData.append('file', fileInput.files[0]);\n\n// 2. Execute secure upload\nconst res = await fetch('https://cloud-snapp.vercel.app/api/v1/upload', {\n  method: 'POST',\n  headers: { \n    'x-api-key': 'YOUR_SECRET_KEY'\n  },\n  body: formData\n});\n\n// 3. Handle response\nconst { asset } = await res.json();\nconsole.log("CloudSnap CDN:", asset.links.cdn);`}
                                    />

                                    <CodeSnippet 
                                        label="Terminal (cURL)"
                                        code={`curl -X POST https://cloud-snapp.vercel.app/api/v1/upload \\\n  -H "x-api-key: YOUR_SECRET_KEY" \\\n  -F "file=@/path/to/local/image.jpg"`}
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

function CustomDropdown({ value, options, onChange }: { value: string, options: { id: string, name: string }[], onChange: (id: string) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const selectedOption = options.find(o => o.id === value) || options[0];

    return (
        <div className="relative">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full h-16 bg-zinc-950/50 border border-zinc-800 rounded-2xl px-6 text-white flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all font-medium group"
            >
                <span className={cn(value === 'none' ? "text-zinc-400" : "text-white")}>
                    {selectedOption.name}
                </span>
                <ChevronDown className={cn("text-zinc-600 group-hover:text-zinc-400 transition-all", isOpen && "rotate-180")} size={18} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                        <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute top-full mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-50 overflow-hidden py-2"
                        >
                            {options.map((option) => (
                                <button
                                    key={option.id}
                                    onClick={() => {
                                        onChange(option.id);
                                        setIsOpen(false);
                                    }}
                                    className={cn(
                                        "w-full px-6 py-4 text-left text-sm font-bold transition-colors flex items-center justify-between group",
                                        value === option.id ? "bg-indigo-500 text-white" : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                                    )}
                                >
                                    {option.name}
                                    {value === option.id && <Check size={14} />}
                                </button>
                            ))}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
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
        <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">{label}</span>
                </div>
                <button 
                    onClick={handleCopy} 
                    className="text-[10px] font-black text-white hover:text-indigo-400 transition-colors bg-zinc-800/50 px-3 py-1 rounded-lg border border-zinc-700/50"
                >
                    {copied ? 'COPIED' : 'COPY CODE'}
                </button>
            </div>
            <div className="bg-zinc-950/80 p-8 rounded-3xl border border-zinc-800/50 font-mono text-[11px] leading-relaxed text-zinc-400 overflow-x-auto shadow-inner relative group">
                <div className="absolute top-4 right-6 text-[8px] font-black text-zinc-800 uppercase pointer-events-none group-hover:text-zinc-700 transition-colors">Read-Only View</div>
                <pre>{code}</pre>
            </div>
        </div>
    );
}
