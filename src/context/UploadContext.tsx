'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';

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
  const processingRef = useRef(false);

  const removeUpload = useCallback((id: string) => {
    setUploads(prev => prev.filter(u => u.id !== id));
  }, []);

  const resetUploads = useCallback(() => {
    setUploads([]);
    processingRef.current = false;
  }, []);

  const startUploads = useCallback((files: File[], folderId?: string | null) => {
    const newItems: UploadItem[] = files.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      fileName: file.name,
      progress: 0,
      status: 'pending',
      folderId: folderId || null
    }));

    setUploads(prev => [...prev, ...newItems]);
  }, []);

  // ── Queue Processor ──────────────────────────────────────────────────────

  useEffect(() => {
    const processQueue = async () => {
      if (processingRef.current) return;
      
      const pendingItem = uploads.find(u => u.status === 'pending');
      if (!pendingItem) return;

      processingRef.current = true;
      
      // Update status to uploading
      setUploads(prev => prev.map(u => 
        u.id === pendingItem.id ? { ...u, status: 'uploading' } : u
      ));

      try {
        await uploadFile(pendingItem);
        setUploads(prev => prev.map(u => 
          u.id === pendingItem.id ? { ...u, status: 'completed', progress: 100 } : u
        ));
      } catch (err: any) {
        console.error('[Upload] Failed:', err);
        setUploads(prev => prev.map(u => 
          u.id === pendingItem.id ? { ...u, status: 'error', error: err.message } : u
        ));
      } finally {
        processingRef.current = false;
      }
    };

    processQueue();
  }, [uploads]);

  const uploadFile = async (item: UploadItem) => {
    const { file, id, folderId } = item;
    const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));
    const mimeType = file.type || 'application/octet-stream';
    const startTime = Date.now();
    let uploadedSize = 0;

    // Step 1: Create Session
    let sessionId: string | null = null;
    try {
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
      }
    } catch (e) {
      console.warn('[Upload] Session non-fatal error:', e);
    }

    const telegramFileIds: string[] = [];
    const telegramMessageIds: number[] = [];

    // Step 2: Upload Chunks
    for (let i = 0; i < totalChunks; i++) {
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
          speed: parseFloat(speed.toFixed(2))
        } : u
      ));
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
