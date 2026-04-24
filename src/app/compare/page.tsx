"use client";

import { useState, useRef, useCallback } from 'react';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface TestResult {
  url:      string;
  ttfb:     number;   // Time to First Byte (ms)
  total:    number;   // Total load time (ms)
  size:     number | null;  // bytes
  type:     'image' | 'video' | 'unknown';
  label:    string;
  error?:   string;
}

type TestStatus = 'idle' | 'running' | 'done' | 'error';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function detectTypeFromContentType(ct: string): 'image' | 'video' | 'unknown' {
  if (ct.startsWith('video/')) return 'video';
  if (ct.startsWith('image/')) return 'image';
  // Fallback: guess from URL extension
  return 'unknown';
}

function detectTypeFromUrl(url: string): 'image' | 'video' | 'unknown' {
  const lower = url.toLowerCase().split('?')[0];
  if (/\.(mp4|webm|mov|mkv|avi|m4v|ogv)/.test(lower)) return 'video';
  if (/\.(jpg|jpeg|png|webp|avif|gif|bmp|svg)/.test(lower)) return 'image';
  return 'unknown';
}

function formatSize(bytes: number | null): string {
  if (bytes === null) return '—';
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function formatTime(ms: number): string {
  if (ms === 0) return '—';
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${ms.toFixed(0)}ms`;
}

function speedLabel(ms: number): { label: string; color: string; bg: string } {
  if (ms === 0)    return { label: 'Error',     color: 'text-red-400',    bg: 'bg-red-900/30' };
  if (ms < 200)    return { label: 'Blazing ⚡', color: 'text-green-400',  bg: 'bg-green-900/30' };
  if (ms < 600)    return { label: 'Fast 🚀',   color: 'text-blue-400',   bg: 'bg-blue-900/30' };
  if (ms < 1500)   return { label: 'Good ✅',   color: 'text-yellow-400', bg: 'bg-yellow-900/30' };
  if (ms < 3000)   return { label: 'Slow 🐢',   color: 'text-orange-400', bg: 'bg-orange-900/30' };
  return { label: 'Very Slow ❌', color: 'text-red-400', bg: 'bg-red-900/30' };
}

// ─────────────────────────────────────────────
// Core test function
// ─────────────────────────────────────────────
async function runSpeedTest(
  url: string,
  label: string,
  warmCache = false,
): Promise<TestResult> {
  // Detect type from URL first (quick guess)
  let type: 'image' | 'video' | 'unknown' = detectTypeFromUrl(url);
  let ttfb = 0;
  let total = 0;
  let size: number | null = null;

  try {
    // Optional: warm the CDN cache with a silent pre-fetch before timing
    if (warmCache) {
      try { await fetch(url, { cache: 'no-store', mode: 'cors' }); } catch {}
    }

    const startFetch = performance.now();
    const res = await fetch(url, { cache: 'no-store', mode: 'cors' });
    ttfb = performance.now() - startFetch;

    const blob = await res.blob();
    total = performance.now() - startFetch;

    // ✅ Detect type from real Content-Type header — fixes CloudSnap preview
    const ct = res.headers.get('content-type') ?? '';
    const detectedFromCT = detectTypeFromContentType(ct);
    type = detectedFromCT !== 'unknown' ? detectedFromCT : type;

    const clHeader = res.headers.get('content-length');
    size = clHeader ? parseInt(clHeader, 10) : blob.size;

    return { url, ttfb, total, size, type, label };
  } catch (err: any) {
    return { url, ttfb, total, size, type, label, error: err.message };
  }
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────
function SpeedBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function MediaPreview({ url, type }: { url: string; type: string }) {
  if (type === 'video') {
    return (
      <video
        src={url}
        controls
        playsInline
        className="w-full h-full object-contain rounded-lg"
        preload="metadata"
      />
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="preview" className="w-full h-full object-contain rounded-lg" />;
}

function ResultCard({ result, maxTime, isWinner }: {
  result: TestResult;
  maxTime: number;
  isWinner: boolean;
}) {
  const speed = speedLabel(result.total);

  return (
    <div className={`relative rounded-2xl border p-5 space-y-4 transition-all ${
      isWinner
        ? 'border-emerald-500/60 bg-emerald-950/20 shadow-lg shadow-emerald-900/20'
        : 'border-white/10 bg-white/5'
    }`}>
      {isWinner && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-black text-xs font-bold px-3 py-0.5 rounded-full">
          WINNER
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white/80">{result.label}</span>
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${speed.color} ${speed.bg}`}>
          {speed.label}
        </span>
      </div>

      {/* Media Preview */}
      <div className="aspect-video bg-black/30 rounded-lg overflow-hidden border border-white/10">
        {result.error ? (
          <div className="w-full h-full flex items-center justify-center text-red-400 text-sm px-4 text-center">
            ⚠️ {result.error}
          </div>
        ) : (
          <MediaPreview url={result.url} type={result.type} />
        )}
      </div>

      {/* Metrics */}
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-xs text-white/50 mb-1">
            <span>Total Load</span>
            <span className="font-mono font-bold text-white">{formatTime(result.total)}</span>
          </div>
          <SpeedBar value={result.total} max={maxTime} color={isWinner ? 'bg-emerald-400' : 'bg-blue-400'} />
        </div>

        <div>
          <div className="flex justify-between text-xs text-white/50 mb-1">
            <span>Time to First Byte</span>
            <span className="font-mono font-bold text-white">{formatTime(result.ttfb)}</span>
          </div>
          <SpeedBar value={result.ttfb} max={maxTime} color={isWinner ? 'bg-emerald-300' : 'bg-blue-300'} />
        </div>

        <div className="flex justify-between text-xs">
          <span className="text-white/50">File Size</span>
          <span className="font-mono font-bold text-white">{formatSize(result.size)}</span>
        </div>

        <div className="flex justify-between text-xs">
          <span className="text-white/50">Content Type</span>
          <span className="font-mono text-purple-300 capitalize">{result.type}</span>
        </div>
      </div>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 90 ? 'text-emerald-400' :
    score >= 70 ? 'text-yellow-400' :
    score >= 50 ? 'text-orange-400' : 'text-red-400';

  return (
    <div className={`text-6xl font-black tabular-nums ${color}`}>
      {score}
      <span className="text-2xl text-white/30">/100</span>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
export default function ComparePage() {
  const [urlA, setUrlA]         = useState('');
  const [urlB, setUrlB]         = useState('');
  const [labelA, setLabelA]     = useState('Cloudinary / Other');
  const [labelB, setLabelB]     = useState('CloudSnap (Yours)');
  const [results, setResults]   = useState<[TestResult, TestResult] | null>(null);
  const [status, setStatus]     = useState<TestStatus>('idle');
  const [runs, setRuns]         = useState(1);
  const [warmCache, setWarmCache] = useState(true); // pre-warm CDN cache before timing

  const handleCompare = useCallback(async () => {
    if (!urlA || !urlB) return;
    setStatus('running');
    setResults(null);

    try {
      // Run multiple times and take the median to reduce noise
      const trialsA: TestResult[] = [];
      const trialsB: TestResult[] = [];

      for (let i = 0; i < runs; i++) {
        const [a, b] = await Promise.all([
          runSpeedTest(urlA, labelA, warmCache),
          runSpeedTest(urlB, labelB, warmCache),
        ]);
        trialsA.push(a);
        trialsB.push(b);
      }

      const median = (arr: TestResult[]): TestResult => {
        const sorted = [...arr].sort((x, y) => x.total - y.total);
        return sorted[Math.floor(sorted.length / 2)];
      };

      setResults([median(trialsA), median(trialsB)]);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  }, [urlA, urlB, labelA, labelB, runs]);

  const winner   = results ? (results[0].total <= results[1].total ? 0 : 1) : -1;
  const maxTime  = results ? Math.max(results[0].total, results[1].total) : 0;
  const speedup  = results && winner !== -1
    ? results[1 - winner].total / results[winner].total
    : 0;

  // Simple CloudSnap score based on TTFB
  const cloudSnapResult = results?.[labelA === 'CloudSnap (Yours)' ? 0 : 1];
  const score = cloudSnapResult
    ? Math.max(0, Math.min(100, Math.round(100 - (cloudSnapResult.total / 50))))
    : null;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-sm font-bold">
            ⚡
          </div>
          <span className="font-semibold text-white/90">CloudSnap Speed Lab</span>
        </div>
        <a href="/dashboard" className="text-sm text-white/40 hover:text-white/70 transition-colors">
          ← Back to Dashboard
        </a>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-violet-400 via-blue-400 to-emerald-400 bg-clip-text text-transparent">
            Performance Benchmark
          </h1>
          <p className="text-white/40 text-sm max-w-md mx-auto">
            Paste any two URLs — images or videos. See who loads faster, uses less bandwidth, and wins.
          </p>
        </div>

        {/* Input Panel */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              { url: urlA, setUrl: setUrlA, label: labelA, setLabel: setLabelA, placeholder: 'https://res.cloudinary.com/...', color: 'border-blue-500 focus:ring-blue-500/30', dot: 'bg-blue-500' },
              { url: urlB, setUrl: setUrlB, label: labelB, setLabel: setLabelB, placeholder: 'http://localhost:3000/api/cdn/...', color: 'border-emerald-500 focus:ring-emerald-500/30', dot: 'bg-emerald-500' },
            ].map(({ url, setUrl, label, setLabel, placeholder, color, dot }, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${dot}`} />
                  <input
                    type="text"
                    value={label}
                    onChange={e => i === 0 ? setLabelA(e.target.value) : setLabelB(e.target.value)}
                    className="bg-transparent text-sm font-semibold text-white/80 focus:outline-none border-b border-white/10 focus:border-white/40 w-full pb-0.5 transition-colors"
                    placeholder="Label…"
                  />
                </div>
                <textarea
                  rows={2}
                  placeholder={placeholder}
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  className={`w-full bg-black/30 border rounded-xl px-4 py-3 text-sm text-white/90 placeholder:text-white/20 focus:outline-none focus:ring-2 resize-none font-mono ${color} transition-all`}
                />
              </div>
            ))}
          </div>

          {/* Options Row */}
          <div className="flex flex-wrap items-center gap-4 pt-1">
            <div className="flex items-center gap-2 text-sm text-white/50">
              <span>Runs:</span>
              {[1, 3, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setRuns(n)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    runs === n
                      ? 'bg-violet-600 text-white'
                      : 'bg-white/5 hover:bg-white/10 text-white/60'
                  }`}
                >
                  {n}×
                </button>
              ))}
              <span className="text-white/30 text-xs">— more runs = more accurate</span>
            </div>

            {/* Warm Cache Toggle */}
            <button
              onClick={() => setWarmCache(w => !w)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                warmCache
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                  : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60'
              }`}
              title="Pre-fetches both URLs once before timing. Gives CloudSnap's Vercel edge cache a chance to warm up — same advantage Cloudinary has."
            >
              🔥 {warmCache ? 'Cache Warm ON' : 'Cache Warm OFF'}
            </button>

            <button
              onClick={handleCompare}
              disabled={status === 'running' || !urlA || !urlB}
              className="ml-auto px-8 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-semibold text-sm transition-all shadow-lg shadow-violet-900/30 active:scale-95"
            >
              {status === 'running' ? (
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  {warmCache ? 'Warming cache…' : `Testing${runs > 1 ? ` (${runs} runs)` : ''}…`}
                </span>
              ) : '⚡ Run Speed Test'}
            </button>
          </div>
        </div>

        {/* Results */}
        {results && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Winner Banner */}
            {speedup > 1.05 && winner >= 0 && (
              <div className="bg-gradient-to-r from-emerald-900/40 to-emerald-800/20 border border-emerald-500/30 rounded-2xl px-6 py-4 flex items-center justify-between">
                <div>
                  <div className="text-emerald-400 font-bold text-lg">
                    🏆 {results[winner as 0 | 1].label} wins!
                  </div>
                  <div className="text-white/50 text-sm mt-0.5">
                    {speedup.toFixed(1)}× faster · saved {formatTime(results[(1 - winner) as 0 | 1].total - results[winner as 0 | 1].total)}
                  </div>
                </div>
                {results[0].size && results[1].size && (
                  <div className="text-right hidden sm:block">
                    <div className="text-white/40 text-xs">Size difference</div>
                    <div className="text-white font-mono font-bold">
                      {formatSize(Math.abs(results[0].size - results[1].size))} smaller
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Result Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {results.map((r, i) => (
                <ResultCard key={i} result={r} maxTime={maxTime} isWinner={i === winner} />
              ))}
            </div>

            {/* CloudSnap Score */}
            {score !== null && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center space-y-2">
                <div className="text-white/40 text-sm">CloudSnap Speed Score</div>
                <ScoreBadge score={score} />
                <div className="text-white/30 text-xs">
                  Based on total load time. &lt;200ms = 100, &gt;5s = 0
                </div>
              </div>
            )}
          </div>
        )}

        {/* How to use guide */}
        {status === 'idle' && (
          <div className="bg-white/3 border border-white/8 rounded-2xl p-6 space-y-3">
            <h3 className="text-sm font-semibold text-white/60">📖 How to test</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-white/40">
              <div className="space-y-1">
                <div className="text-white/70 font-medium">Test an image</div>
                <div>Paste a Cloudinary URL in A and your <code className="text-violet-300">/api/cdn/[id]?fmt=webp</code> URL in B</div>
              </div>
              <div className="space-y-1">
                <div className="text-white/70 font-medium">Test a video</div>
                <div>Paste any <code className="text-violet-300">.mp4</code> URL — the tester auto-detects and uses a <code className="text-violet-300">&lt;video&gt;</code> tag</div>
              </div>
              <div className="space-y-1">
                <div className="text-white/70 font-medium">Pro tip</div>
                <div>Use <strong className="text-white/60">3 runs</strong> for more accurate results. The median is used so outliers don't skew results.</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
