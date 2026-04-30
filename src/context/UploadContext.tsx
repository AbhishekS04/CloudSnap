'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import {
  clearPersistedUploads,
  deletePersistedUpload,
  listPersistedUploads,
  savePersistedUpload,
  updatePersistedUpload,
} from '@/lib/upload-persistence';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface UploadItem {
  id: string;
  file: File;
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  currentChunk?: number;
  totalChunks?: number;
  speed?: number;
  error?: string;
  folderId?: string | null;
  sessionId?: string | null;
  telegramFileIds?: string[];
  telegramMessageIds?: number[];
}

interface UploadContextType {
  uploads: UploadItem[];
  startUploads: (files: File[], folderId?: string | null) => void;
  resetUploads: () => void;
  removeUpload: (id: string) => void;
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB

// ─────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const processingRef = useRef(false);

  const removeUpload = useCallback((id: string) => {
    setUploads(prev => prev.filter(u => u.id !== id));
    deletePersistedUpload(id).catch(err => console.warn('[Upload] Failed to remove persisted upload:', err));
  }, []);

  const resetUploads = useCallback(() => {
    setUploads([]);
    processingRef.current = false;
    clearPersistedUploads().catch(err => console.warn('[Upload] Failed to clear persisted uploads:', err));
  }, []);

  const startUploads = useCallback((files: File[], folderId?: string | null) => {
    void (async () => {
      const now = Date.now();
      const newItems: UploadItem[] = files.map(file => ({
        id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).substring(7),
        file,
        fileName: file.name,
        progress: 0,
        status: 'pending',
        folderId: folderId || null,
        telegramFileIds: [],
        telegramMessageIds: [],
      }));

      await Promise.all(newItems.map(item => savePersistedUpload({
        ...item,
        folderId: item.folderId ?? null,
        fileSize: item.file.size,
        mimeType: item.file.type || 'application/octet-stream',
        status: 'pending',
        sessionId: null,
        createdAt: now,
        updatedAt: now,
      })));

      setUploads(prev => [...prev, ...newItems]);
    })().catch(err => {
      console.error('[Upload] Failed to persist upload queue:', err);
      toast.error('Could not prepare upload queue');
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const restoreUploads = async () => {
      try {
        const persisted = await listPersistedUploads();
        if (cancelled) return;

        const restored = persisted
          .filter(item => item.status !== 'completed')
          .sort((a, b) => a.createdAt - b.createdAt)
          .map<UploadItem>(item => ({
            id: item.id,
            file: item.file,
            fileName: item.fileName,
            progress: item.status === 'uploading' ? item.progress : item.progress || 0,
            status: item.status === 'uploading' ? 'pending' : item.status,
            currentChunk: item.currentChunk,
            totalChunks: item.totalChunks,
            speed: item.speed,
            error: item.error,
            folderId: item.folderId,
            sessionId: item.sessionId,
            telegramFileIds: item.telegramFileIds || [],
            telegramMessageIds: item.telegramMessageIds || [],
          }));

        if (restored.length > 0) {
          setUploads(restored);
          toast('Restored pending upload queue');
        }
      } catch (err) {
        console.warn('[Upload] Failed to restore persisted uploads:', err);
      } finally {
        if (!cancelled) setIsHydrated(true);
      }
    };

    restoreUploads();

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Queue Processor ──────────────────────────────────────────────────────

  useEffect(() => {
    const processQueue = async () => {
      if (processingRef.current) return;
      if (!isHydrated) return;
      
      const pendingItem = uploads.find(u => u.status === 'pending');
      if (!pendingItem) return;

      processingRef.current = true;
      
      // Update status to uploading
      setUploads(prev => prev.map(u => 
        u.id === pendingItem.id ? { ...u, status: 'uploading' } : u
      ));
      updatePersistedUpload(pendingItem.id, { status: 'uploading' }).catch(() => {});

      try {
        await uploadFile(pendingItem);
        setUploads(prev => prev.map(u => 
          u.id === pendingItem.id ? { ...u, status: 'completed', progress: 100 } : u
        ));
        deletePersistedUpload(pendingItem.id).catch(() => {});
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        console.error('[Upload] Failed:', err);
        setUploads(prev => prev.map(u => 
          u.id === pendingItem.id ? { ...u, status: 'error', error: message } : u
        ));
        updatePersistedUpload(pendingItem.id, { status: 'error', error: message }).catch(() => {});
      } finally {
        processingRef.current = false;
      }
    };

    processQueue();
  }, [uploads, isHydrated]);

  const uploadFile = async (item: UploadItem) => {
    const { file, id, folderId } = item;
    const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));
    const mimeType = file.type || 'application/octet-stream';
    const startTime = Date.now();
    let uploadedSize = 0;

    // Step 1: Create or resume session
    let sessionId: string | null = item.sessionId || null;
    let telegramFileIds: string[] = [...(item.telegramFileIds || [])];
    let telegramMessageIds: number[] = [...(item.telegramMessageIds || [])];
    let startChunk = telegramFileIds.length;

    if (sessionId) {
      try {
        const existingSession = await fetch(`/api/upload/session?sessionId=${encodeURIComponent(sessionId)}`);
        if (existingSession.ok) {
          const sessionData = await existingSession.json();
          if (sessionData.status === 'complete') return;

          const confirmedChunkIds = Array.isArray(sessionData.confirmedChunkIds)
            ? sessionData.confirmedChunkIds
            : [];

          if (confirmedChunkIds.length > telegramFileIds.length) {
            telegramFileIds = confirmedChunkIds;
          }
          startChunk = Math.min(telegramFileIds.length, totalChunks);
          uploadedSize = Math.min(file.size, startChunk * CHUNK_SIZE);
        } else {
          sessionId = null;
          telegramFileIds = [];
          telegramMessageIds = [];
          startChunk = 0;
        }
      } catch (e) {
        console.warn('[Upload] Session resume failed, creating a new session:', e);
        sessionId = null;
        telegramFileIds = [];
        telegramMessageIds = [];
        startChunk = 0;
      }
    }

    try {
      if (!sessionId) {
        const sessionRes = await fetch('/api/upload/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileSize: file.size,
            mimeType,
            totalChunks,
            folderId,
          }),
        });
        if (sessionRes.ok) {
          const data = await sessionRes.json();
          sessionId = data.sessionId;
          setUploads(prev => prev.map(u => 
            u.id === id ? { ...u, sessionId } : u
          ));
          await updatePersistedUpload(id, { sessionId });
        }
      }
    } catch (e) {
      console.warn('[Upload] Session non-fatal error:', e);
    }

    // Step 2: Upload Chunks
    for (let i = startChunk; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(file.size, start + CHUNK_SIZE);
      const chunk = file.slice(start, end);

      // Update UI Progress
      setUploads(prev => prev.map(u => 
        u.id === id ? { 
          ...u, 
          currentChunk: i + 1, 
          totalChunks, 
          progress: Math.round((i / totalChunks) * 100) 
        } : u
      ));
      updatePersistedUpload(id, {
        currentChunk: i + 1,
        totalChunks,
        progress: Math.round((i / totalChunks) * 100),
        status: 'uploading',
      }).catch(() => {});

      const formData = new FormData();
      formData.append('file', chunk, file.name);
      formData.append('chunkIndex', i.toString());
      formData.append('totalChunks', totalChunks.toString());
      if (sessionId) formData.append('sessionId', sessionId);

      const res = await fetch('/api/upload/chunk', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Chunk ${i} failed`);
      }

      const { fileId, messageId } = await res.json();
      telegramFileIds[i] = fileId;
      telegramMessageIds[i] = messageId;

      uploadedSize += chunk.size;
      const elapsed = (Date.now() - startTime) / 1000;
      const speed = elapsed > 0 ? (uploadedSize / (1024 * 1024)) / elapsed : 0;

      setUploads(prev => prev.map(u => 
        u.id === id ? { 
          ...u, 
          progress: Math.round(((i + 1) / totalChunks) * 100),
          speed: parseFloat(speed.toFixed(2)),
          telegramFileIds,
          telegramMessageIds,
        } : u
      ));
      await updatePersistedUpload(id, {
        progress: Math.round(((i + 1) / totalChunks) * 100),
        speed: parseFloat(speed.toFixed(2)),
        telegramFileIds,
        telegramMessageIds,
      });
    }

    // Step 3: Finalize
    const finalizeRes = await fetch('/api/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: file.name,
        mimeType: file.type,
        size: file.size,
        telegramFileIds,
        telegramMessageIds,
        isChunked: totalChunks > 1,
        folderId,
      }),
    });

    if (!finalizeRes.ok) {
      throw new Error('Finalization failed');
    }

    const finalizeData = await finalizeRes.json();

    // Mark session complete
    if (sessionId) {
      fetch('/api/upload/session', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, status: 'complete' }),
      }).catch(() => {});
    }

    // Success Notification
    window.dispatchEvent(new CustomEvent('asset-uploaded', { 
      detail: { asset: finalizeData.asset } 
    }));
  };

  return (
    <UploadContext.Provider value={{ uploads, startUploads, resetUploads, removeUpload }}>
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
