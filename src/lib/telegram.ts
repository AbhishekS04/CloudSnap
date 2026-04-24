/**
 * telegram.ts
 * CloudSnap — Telegram as Storage Engine
 *
 * Provides helpers for:
 * - Uploading files to a private Telegram channel (single or chunked)
 * - Downloading files from Telegram (single or chunked, rejoined)
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const CHAT_ID   = process.env.TELEGRAM_STORAGE_CHAT_ID!;

// Telegram Bot API base URL
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Telegram's getFile API can only serve files ≤ 20MB.
// We use 19MB chunks to stay safely under that hard limit.
export const CHUNK_SIZE = 19 * 1024 * 1024; // 19 MB

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface TelegramUploadResult {
  fileId: string;
  fileSize: number;
}

export interface TelegramChunkedUploadResult {
  fileIds: string[];
  isChunked: boolean;
  chunkCount: number;
}

// ─────────────────────────────────────────────
// Core: Get a direct download URL from a file_id
// ─────────────────────────────────────────────

/**
 * Resolves a Telegram file_id to a direct HTTPS download URL.
 * The URL is valid for ~1 hour (Telegram limitation).
 */
export async function getTelegramFileUrl(fileId: string): Promise<string> {
  const res = await fetch(`${TG_API}/getFile?file_id=${fileId}`);
  if (!res.ok) {
    throw new Error(`Telegram getFile failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Telegram getFile error: ${JSON.stringify(data)}`);
  }
  const filePath: string = data.result.file_path;
  return `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
}

// ─────────────────────────────────────────────
// Download: Single file
// ─────────────────────────────────────────────

/**
 * Downloads a single file from Telegram by file_id.
 * Returns the raw Buffer.
 */
export async function downloadFromTelegram(fileId: string): Promise<Buffer> {
  const url = await getTelegramFileUrl(fileId);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download from Telegram: ${res.status}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// ─────────────────────────────────────────────
// Download: Chunked (fetches all chunks in parallel and joins them)
// ─────────────────────────────────────────────

/**
 * Downloads multiple chunks from Telegram sequentially and
 * concatenates them into a single Buffer in the correct order.
 * Sequential (not parallel) to avoid Telegram rate limits on large files.
 */
export async function downloadChunkedFromTelegram(fileIds: string[]): Promise<Buffer> {
  const buffers: Buffer[] = [];
  for (const fileId of fileIds) {
    buffers.push(await downloadFromTelegram(fileId));
  }
  return Buffer.concat(buffers);
}

// ─────────────────────────────────────────────
// Upload: Single file (≤ 39MB)
// ─────────────────────────────────────────────

/**
 * Uploads a single file buffer to the configured Telegram channel.
 * Uses sendDocument so any file type is accepted.
 * Returns the Telegram file_id.
 */
export async function uploadToTelegram(
  buffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<TelegramUploadResult> {
  const formData = new FormData();
  formData.append('chat_id', CHAT_ID);
  formData.append(
    'document',
    new Blob([new Uint8Array(buffer)], { type: mimeType }),
    filename,
  );
  // Disable notifications — this is a silent storage channel
  formData.append('disable_notification', 'true');

  const res = await fetch(`${TG_API}/sendDocument`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Telegram sendDocument failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Telegram API error: ${JSON.stringify(data)}`);
  }

  // Telegram auto-classifies files: MP4→video, GIF→animation, images→photo, etc.
  // We must check all possible media fields to find the file_id.
  const result = data.result;
  const mediaObj =
    result.document   ??  // generic file / most formats
    result.video      ??  // MP4, MOV, MKV…
    result.animation  ??  // GIF, WebM animations
    result.audio      ??  // MP3, OGG audio
    result.voice      ??
    result.video_note ??
    result.sticker    ??
    (Array.isArray(result.photo)
      ? result.photo[result.photo.length - 1]  // photo → array, take largest
      : null);

  if (!mediaObj || !mediaObj.file_id) {
    // Log the full result for debugging
    console.error('[Telegram] Unexpected result shape:', JSON.stringify(result));
    throw new Error(`Telegram returned an unexpected result: no file_id found. Full result: ${JSON.stringify(result)}`);
  }

  return {
    fileId: mediaObj.file_id,
    fileSize: mediaObj.file_size ?? buffer.length,
  };
}

// ─────────────────────────────────────────────
// Upload: Chunked (> 39MB)
// ─────────────────────────────────────────────

/**
 * Splits a large buffer into 39MB chunks and uploads each chunk
 * to Telegram sequentially (to avoid rate limits).
 * Returns all file_ids in order.
 */
export async function uploadChunkedToTelegram(
  buffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<TelegramChunkedUploadResult> {
  const totalChunks = Math.ceil(buffer.length / CHUNK_SIZE);
  const fileIds: string[] = [];

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end   = Math.min(start + CHUNK_SIZE, buffer.length);
    const chunk = buffer.subarray(start, end);

    // Name each chunk clearly so they can be identified if needed
    const chunkName = `${filename}.part${String(i + 1).padStart(3, '0')}`;

    const result = await uploadToTelegram(chunk, chunkName, 'application/octet-stream');
    fileIds.push(result.fileId);

    console.log(`[Telegram] Uploaded chunk ${i + 1}/${totalChunks} → ${result.fileId}`);
  }

  return {
    fileIds,
    isChunked: true,
    chunkCount: totalChunks,
  };
}

// ─────────────────────────────────────────────
// Smart Upload: auto-decides single vs chunked
// ─────────────────────────────────────────────

/**
 * Main entry point for all CloudSnap uploads.
 * Automatically decides whether to chunk based on file size.
 */
export async function smartUploadToTelegram(
  buffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<TelegramChunkedUploadResult> {
  if (buffer.length > CHUNK_SIZE) {
    console.log(`[Telegram] File is ${(buffer.length / 1024 / 1024).toFixed(1)}MB — using chunked upload`);
    return uploadChunkedToTelegram(buffer, filename, mimeType);
  }

  console.log(`[Telegram] File is ${(buffer.length / 1024 / 1024).toFixed(1)}MB — using single upload`);
  const result = await uploadToTelegram(buffer, filename, mimeType);
  return {
    fileIds: [result.fileId],
    isChunked: false,
    chunkCount: 1,
  };
}
