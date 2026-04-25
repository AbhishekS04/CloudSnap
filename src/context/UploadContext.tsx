'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface UploadState {
  fileName:     string;
  progress:     number;
  status:       'idle' | 'uploading' | 'completed' | 'error';
  totalChunks?: number;
  currentChunk?: number;
  startTime?:   number;
  speed?:       number; // MB/s
  sessionId?:   string; // for resumability
}

interface PendingSession {
  sessionId:   string;
  fileName:    string;
  fileSize:    number;
  mimeType:    string;
  folderId:    string | null;
  totalChunks: number;
  confirmedCount: number;
}

interface UploadContextType {
  uploadState:         UploadState;
  startUpload:         (file: File, folderId?: string | null) => Promise<void>;
  resetUpload:         () => void;
  getPendingSession:   () => Promise<PendingSession | null>;
  clearPendingSession: () => void;
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const CHUNK_SIZE         = 4 * 1024 * 1024; // 4MB — must match Vercel limit & upload/chunk route
const SESSION_STORAGE_KEY = 'cloudsnap_upload_session';

// ─────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [uploadState, setUploadState] = useState<UploadState>({
    fileName: '',
    progress: 0,
    status:   'idle',
  });

  const resetUpload = useCallback(() => {
    setUploadState({ fileName: '', progress: 0, status: 'idle' });
  }, []);

  // ── Pending session helpers ──────────────────────────────────────────────

  const clearPendingSession = useCallback(() => {
    try { sessionStorage.removeItem(SESSION_STORAGE_KEY); } catch {}
  }, []);

  /**
   * Check sessionStorage for an in-progress upload session.
   * Fetches current state from the API to get the confirmed chunk count.
   * Returns null if no session exists or it has expired.
   */
  const getPendingSession = useCallback(async (): Promise<PendingSession | null> => {
    try {
      const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!stored) return null;

      const { sessionId } = JSON.parse(stored);
      if (!sessionId) return null;

      const res = await fetch(`/api/upload/session?sessionId=${sessionId}`);

      if (res.status === 404 || res.status === 410) {
        // Session expired or gone
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        return null;
      }

      if (!res.ok) return null;

      const data = await res.json();

      if (data.status === 'complete' || data.confirmedCount === 0) {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        return null;
      }

      return {
        sessionId:     data.sessionId,
        fileName:      data.fileName,
        fileSize:      data.fileSize,
        mimeType:      data.mimeType,
        folderId:      data.folderId,
        totalChunks:   data.totalChunks,
        confirmedCount: data.confirmedCount,
      };
    } catch {
      return null;
    }
  }, []);

  // ── Main Upload Function ─────────────────────────────────────────────────

  const startUpload = useCallback(async (file: File, folderId?: string | null) => {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    // Step 1: Create a new upload session in Supabase
    let sessionId: string | null = null;
    try {
      const sessionRes = await fetch('/api/upload/session', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          fileName:    file.name,
          fileSize:    file.size,
          mimeType:    file.type,
          totalChunks,
          folderId:    folderId || null,
        }),
      });

      if (sessionRes.ok) {
        const sessionData = await sessionRes.json();
        sessionId = sessionData.sessionId;
        // Persist in sessionStorage so the tab can resume if it's refreshed
        try {
          sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ sessionId }));
        } catch {}
      }
    } catch (e) {
      // Session creation is non-fatal — upload continues without resumability
      console.warn('[UploadContext] Could not create upload session:', e);
    }

    setUploadState({
      fileName:    file.name,
      progress:    0,
      status:      'uploading',
      startTime:   Date.now(),
      speed:       0,
      sessionId:   sessionId ?? undefined,
    });

    const startTime   = Date.now();
    let uploadedSize  = 0;

    try {
      // Step 2: Fetch current session state to find already-confirmed chunks (resume support)
      const confirmedChunkIds: string[] = [];
      let confirmedSet = new Set<number>(); // chunk indices already in Telegram

      if (sessionId) {
        try {
          const stateRes = await fetch(`/api/upload/session?sessionId=${sessionId}`);
          if (stateRes.ok) {
            const state = await stateRes.json();
            // The session API returns confirmed_chunk_ids in order of upload
            // We map them back to chunk indices by position
            if (Array.isArray(state.confirmedChunkIds)) {
              state.confirmedChunkIds.forEach((fileId: string, idx: number) => {
                confirmedChunkIds[idx] = fileId;
                confirmedSet.add(idx);
              });
            }
          }
        } catch {}
      }

      const telegramFileIds: string[] = [...confirmedChunkIds];

      // Step 3: Upload each chunk, skipping already-confirmed ones
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end   = Math.min(file.size, start + CHUNK_SIZE);
        const chunk = file.slice(start, end);

        setUploadState(prev => ({
          ...prev,
          currentChunk: i + 1,
          totalChunks,
          progress:     Math.round((i / totalChunks) * 100),
        }));

        // Skip chunks that are already in Telegram (resume path)
        if (confirmedSet.has(i) && telegramFileIds[i]) {
          uploadedSize += chunk.size;
          continue;
        }

        const formData = new FormData();
        formData.append('file', chunk, file.name);
        formData.append('chunkIndex', i.toString());
        formData.append('totalChunks', totalChunks.toString());
        if (sessionId) formData.append('sessionId', sessionId);

        const res = await fetch('/api/upload/chunk', {
          method: 'POST',
          body:   formData,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Chunk ${i} failed`);
        }

        const { fileId } = await res.json();
        telegramFileIds[i] = fileId;

        uploadedSize += chunk.size;
        const elapsed      = (Date.now() - startTime) / 1000;
        const currentSpeed = elapsed > 0 ? (uploadedSize / (1024 * 1024)) / elapsed : 0;

        setUploadState(prev => ({
          ...prev,
          progress: Math.round(((i + 1) / totalChunks) * 100),
          speed:    parseFloat(currentSpeed.toFixed(2)),
        }));
      }

      // Step 4: Finalize — save metadata to Supabase
      const finalizeRes = await fetch('/api/assets', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name:            file.name,
          mimeType:        file.type,
          size:            file.size,
          telegramFileIds,
          isChunked:       totalChunks > 1,
          folderId:        folderId || null,
        }),
      });

      if (!finalizeRes.ok) {
        const err = await finalizeRes.json().catch(() => ({}));
        throw new Error(err.error || 'Finalization failed');
      }

      // Step 5: Mark session complete & clear sessionStorage
      if (sessionId) {
        fetch('/api/upload/session', {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ sessionId, status: 'complete' }),
        }).catch(() => {}); // fire-and-forget
        clearPendingSession();
      }

      setUploadState(prev => ({ ...prev, status: 'completed', progress: 100 }));
      toast.success('Upload complete!');

      // Notify dashboard to refresh
      window.dispatchEvent(new Event('asset-uploaded'));

    } catch (err: any) {
      console.error('Upload error:', err);
      setUploadState(prev => ({ ...prev, status: 'error' }));
      toast.error(`Upload failed: ${err.message}`);
      // Keep session in sessionStorage — user may retry
    }
  }, [clearPendingSession]);

  return (
    <UploadContext.Provider value={{ uploadState, startUpload, resetUpload, getPendingSession, clearPendingSession }}>
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const context = useContext(UploadContext);
  if (context === undefined) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
}
