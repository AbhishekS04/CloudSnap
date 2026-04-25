'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';

interface UploadState {
  fileName: string;
  progress: number;
  status: 'idle' | 'uploading' | 'completed' | 'error';
  totalChunks?: number;
  currentChunk?: number;
  startTime?: number;
  speed?: number; // in MB/s
}

interface UploadContextType {
  uploadState: UploadState;
  startUpload: (file: File, folderId?: string | null) => Promise<void>;
  resetUpload: () => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [uploadState, setUploadState] = useState<UploadState>({
    fileName: '',
    progress: 0,
    status: 'idle',
  });

  const resetUpload = useCallback(() => {
    setUploadState({ fileName: '', progress: 0, status: 'idle' });
  }, []);

  const startUpload = useCallback(async (file: File, folderId?: string | null) => {
    setUploadState({
      fileName: file.name,
      progress: 0,
      status: 'uploading',
      startTime: Date.now(),
      speed: 0
    });

    const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB (Vercel Limit)
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    let uploadedSize = 0;
    
    try {
      const telegramFileIds: string[] = [];
      const startTime = Date.now();

      for (let i = 0; i < totalChunks; i++) {
        const chunkStartTime = Date.now();
        const start = i * CHUNK_SIZE;
        const end = Math.min(file.size, start + CHUNK_SIZE);
        const chunk = file.slice(start, end);

        setUploadState(prev => ({
          ...prev,
          currentChunk: i + 1,
          totalChunks,
          progress: Math.round(((i) / totalChunks) * 100),
        }));

        const formData = new FormData();
        formData.append('file', chunk, file.name);
        formData.append('chunkIndex', i.toString());
        formData.append('totalChunks', totalChunks.toString());

        const res = await fetch('/api/upload/chunk', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) throw new Error(`Chunk ${i} failed`);
        const { fileId } = await res.json();
        telegramFileIds.push(fileId);
        
        uploadedSize += chunk.size;
        const elapsed = (Date.now() - startTime) / 1000;
        const currentSpeed = (uploadedSize / (1024 * 1024)) / elapsed;

        // Update progress after successful chunk
        setUploadState(prev => ({
          ...prev,
          progress: Math.round(((i + 1) / totalChunks) * 100),
          speed: parseFloat(currentSpeed.toFixed(2))
        }));
      }

      // Finalize the asset in Supabase
      const finalizeRes = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: file.name,
          mimeType: file.type,
          size: file.size,
          telegramFileIds,
          isChunked: totalChunks > 1,
          folderId: folderId || null
        }),
      });

      if (!finalizeRes.ok) throw new Error('Finalization failed');

      setUploadState(prev => ({ ...prev, status: 'completed', progress: 100 }));
      toast.success('Upload complete!');
      
      // Optional: Refresh the dashboard if it's open
      window.dispatchEvent(new Event('asset-uploaded'));

    } catch (err: any) {
      console.error('Upload error:', err);
      setUploadState(prev => ({ ...prev, status: 'error' }));
      toast.error(`Upload failed: ${err.message}`);
    }
  }, []);

  return (
    <UploadContext.Provider value={{ uploadState, startUpload, resetUpload }}>
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
