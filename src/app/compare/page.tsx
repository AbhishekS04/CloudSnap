"use client";

import { useState } from 'react';
import { ArrowRight, Timer, HardDrive, Ruler } from 'lucide-react';

export default function ComparePage() {
    const [urlA, setUrlA] = useState('');
    const [urlB, setUrlB] = useState('');
    const [results, setResults] = useState<{
        a: { time: number; size: number | null };
        b: { time: number; size: number | null };
    } | null>(null);
    const [loading, setLoading] = useState(false);

    const testImage = async (src: string): Promise<{ time: number; size: number | null }> => {
        // We use fetch with cache: 'reload' to force a network request (bypassing browser cache)
        // BUT we keep the URL clean so the CDN *can* serve a cached copy.
        // The previous method (?t=...) was busting the CDN cache too, forcing a slow origin fetch.
        const start = performance.now();

        try {
            const response = await fetch(src, { cache: 'reload' });
            const blob = await response.blob();
            const end = performance.now();

            const size = response.headers.get('content-length');
            const sizeVal = size ? parseInt(size) : blob.size;

            // Preload image for display so it doesn't flicker
            await new Promise((resolve) => {
                const img = new Image();
                img.onload = resolve;
                img.src = src; // Browser will likely use the fresh cache from the fetch above
            });

            return { time: end - start, size: sizeVal };
        } catch (err) {
            console.error("Speed test failed", err);
            return { time: 0, size: null };
        }
    };

    const handleCompare = async () => {
        if (!urlA || !urlB) return;
        setLoading(true);
        setResults(null);

        const [resA, resB] = await Promise.all([
            testImage(urlA),
            testImage(urlB)
        ]);

        setResults({ a: resA, b: resB });
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 text-slate-900 p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                <h1 className="text-3xl font-bold text-gray-900">Performance Comparison</h1>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <h2 className="font-semibold text-lg flex items-center gap-2">
                            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm">Target A</span>
                            Cloudinary (or Original)
                        </h2>
                        <input
                            type="text"
                            placeholder="Paste Cloudinary URL..."
                            value={urlA}
                            onChange={(e) => setUrlA(e.target.value)}
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div className="space-y-4">
                        <h2 className="font-semibold text-lg flex items-center gap-2">
                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm">Target B</span>
                            Your New Host
                        </h2>
                        <input
                            type="text"
                            placeholder="Paste New Host URL..."
                            value={urlB}
                            onChange={(e) => setUrlB(e.target.value)}
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                        />
                    </div>
                </div>

                <button
                    onClick={handleCompare}
                    disabled={loading || !urlA || !urlB}
                    className="w-full py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
                >
                    {loading ? 'Running Speed Test...' : 'Run Comparison Test'}
                </button>

                {results && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                        {/* Result A */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-gray-700">Target A</h3>
                                <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{results.a.time.toFixed(0)}ms</span>
                            </div>

                            <div className="aspect-video bg-gray-50 rounded-lg overflow-hidden border border-gray-200 relative">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={urlA} alt="A" className="w-full h-full object-contain" />
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                                        <Timer className="w-4 h-4" /> Load Time
                                    </div>
                                    <div className="font-semibold text-lg">{results.a.time.toFixed(0)}ms</div>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                                        <HardDrive className="w-4 h-4" /> Size
                                    </div>
                                    <div className="font-semibold text-lg">
                                        {results.a.size ? (results.a.size / 1024).toFixed(1) + ' KB' : 'Unknown (CORS)'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Result B */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4 ring-2 ring-green-100">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-gray-700">Target B (Yours)</h3>
                                <span className="text-xs font-mono bg-green-100 text-green-700 px-2 py-1 rounded">{results.b.time.toFixed(0)}ms</span>
                            </div>

                            <div className="aspect-video bg-gray-50 rounded-lg overflow-hidden border border-gray-200 relative">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={urlB} alt="B" className="w-full h-full object-contain" />
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="p-3 bg-green-50 rounded-lg text-green-900">
                                    <div className="flex items-center gap-2 text-green-700 mb-1">
                                        <Timer className="w-4 h-4" /> Load Time
                                    </div>
                                    <div className="font-semibold text-lg">{results.b.time.toFixed(0)}ms</div>
                                    {results.b.time < results.a.time && (
                                        <div className="text-xs text-green-600 font-bold mt-1">
                                            {(results.a.time / results.b.time).toFixed(1)}x FASTER 🚀
                                        </div>
                                    )}
                                </div>
                                <div className="p-3 bg-green-50 rounded-lg text-green-900">
                                    <div className="flex items-center gap-2 text-green-700 mb-1">
                                        <HardDrive className="w-4 h-4" /> Size
                                    </div>
                                    <div className="font-semibold text-lg">
                                        {results.b.size ? (results.b.size / 1024).toFixed(1) + ' KB' : 'Unknown'}
                                    </div>
                                    {results.a.size && results.b.size && results.b.size < results.a.size && (
                                        <div className="text-xs text-green-600 font-bold mt-1">
                                            {((1 - results.b.size / results.a.size) * 100).toFixed(0)}% SMALLER 📉
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
