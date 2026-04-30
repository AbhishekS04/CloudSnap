'use client';

export type PersistedUploadStatus = 'pending' | 'uploading' | 'completed' | 'error';

export interface PersistedUpload {
  id: string;
  file: File;
  fileName: string;
  fileSize: number;
  mimeType: string;
  folderId: string | null;
  progress: number;
  status: PersistedUploadStatus;
  currentChunk?: number;
  totalChunks?: number;
  speed?: number;
  error?: string;
  sessionId?: string | null;
  telegramFileIds?: string[];
  telegramMessageIds?: number[];
  createdAt: number;
  updatedAt: number;
}

const DB_NAME = 'cloudsnap-upload-queue';
const STORE_NAME = 'uploads';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openUploadDb() {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not available'));
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Failed to open upload queue'));
    });
  }

  return dbPromise;
}

async function withUploadStore<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T> | void,
) {
  const db = await openUploadDb();

  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const request = callback(store);
    let result: T;

    if (request) {
      request.onsuccess = () => {
        result = request.result;
      };
      request.onerror = () => reject(request.error ?? new Error('Upload queue request failed'));
    }

    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error ?? new Error('Upload queue transaction failed'));
    tx.onabort = () => reject(tx.error ?? new Error('Upload queue transaction aborted'));
  });
}

export async function savePersistedUpload(upload: PersistedUpload) {
  await withUploadStore('readwrite', store => store.put({
    ...upload,
    updatedAt: Date.now(),
  }));
}

export async function updatePersistedUpload(id: string, patch: Partial<PersistedUpload>) {
  const existing = await getPersistedUpload(id);
  if (!existing) return;

  await savePersistedUpload({
    ...existing,
    ...patch,
    id,
    updatedAt: Date.now(),
  });
}

export async function getPersistedUpload(id: string) {
  return withUploadStore<PersistedUpload | undefined>('readonly', store => store.get(id));
}

export async function listPersistedUploads() {
  return withUploadStore<PersistedUpload[]>('readonly', store => store.getAll());
}

export async function deletePersistedUpload(id: string) {
  await withUploadStore('readwrite', store => store.delete(id));
}

export async function clearPersistedUploads() {
  await withUploadStore('readwrite', store => store.clear());
}
