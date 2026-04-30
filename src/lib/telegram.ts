/**
 * telegram.ts
 * CloudSnap - Telegram as Storage Engine
 *
 * Provides helpers for:
 * - Uploading files to a private Telegram channel (single or chunked)
 * - Downloading files from Telegram (single or chunked, rejoined)
 * 
 *  _____   _    _             _    _        _____      _              _   _ 
 * |_   _| | |  | |           | |  | |      |  __ \    | |            | \ | |
 *   | |   | |__| | __ _ _   _| |__| | __ _ | |  | | __| | __ _ _ __  |  \| |
 *   | |   |  __  |/ _` | \ / |  __  |/ _` || |  | |/ _` |/ _` | '_ \ | . ` |
 *  _| |_  | |  | | (_| |\ V /| |  | | (_| || |__| | (_| | (_| | | | || |\  |
 * |_____| |_|  |_|\__,_| \_/ |_|  |_|\__,_||_____/ \__,_|\__,_|_| |_||_| \_|
 * 
 * "I have a goddamn plan! I just need you to stop copying my code and have some FAITH!"
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const CHAT_ID   = process.env.TELEGRAM_STORAGE_CHAT_ID!;

// Telegram Bot API base URL
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Telegram's getFile API can only serve files <= 20MB.
// Vercel's Serverless Function limit is 4.5MB.
// We use 4MB chunks to stay safely under BOTH limits.
export const CHUNK_SIZE = 4 * 1024 * 1024; // 4 MB

// ---------------------------------------------
// Types
// ---------------------------------------------

export interface TelegramUploadResult {
  fileId: string;
  fileSize: number;
  messageId: number;
}

export interface TelegramChunkedUploadResult {
  fileIds: string[];
  messageIds: number[];
  isChunked: boolean;
  chunkCount: number;
}

// ---------------------------------------------
// Core: Get a direct download URL from a file_id
// ---------------------------------------------

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

/**
 * Deletes one or more messages from the Telegram storage channel.
 */
export async function deleteFromTelegram(messageIds: number[]): Promise<void> {
  if (!messageIds || messageIds.length === 0) return;

  try {
    // Telegram has a deleteMessages API for bulk deletion (up to 100 messages)
    const res = await fetch(`${TG_API}/deleteMessages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        message_ids: messageIds,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.warn(`[Telegram] Bulk delete failed, trying fallback: ${text}`);
      
      // Fallback: Delete one by one if bulk delete fails
      for (const id of messageIds) {
        await fetch(`${TG_API}/deleteMessage?chat_id=${CHAT_ID}&message_id=${id}`);
      }
    }
  } catch (err) {
    console.error('[Telegram] Deletion error:', err);
  }
}

// ---------------------------------------------
// Download: Single file
// ---------------------------------------------

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

/**
 * Returns a ReadableStream for a Telegram file.
 * Use this for "piping" data directly to the browser (Instant play).
 */
export async function getTelegramStream(fileId: string): Promise<ReadableStream<Uint8Array>> {
  const url = await getTelegramFileUrl(fileId);
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(`Telegram stream failed: ${res.status}`);
  }
  return res.body as ReadableStream<Uint8Array>;
}

// ---------------------------------------------
// Download: Chunked (fetches all chunks in parallel and joins them)
// ---------------------------------------------

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

// ---------------------------------------------
// Upload: Single file (<= 39MB)
// ---------------------------------------------

/**
 * Uploads a single file buffer to the configured Telegram channel.
 * Uses sendDocument so any file type is accepted.
 * Returns the Telegram file_id and message_id.
 */
export async function uploadToTelegram(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  caption?: string,
): Promise<TelegramUploadResult> {
  const formData = new FormData();
  formData.append('chat_id', CHAT_ID);
  formData.append(
    'document',
    new Blob([new Uint8Array(buffer)], { type: mimeType }),
    filename,
  );
  if (caption) {
    formData.append('caption', caption);
  }
  // Disable notifications - this is a silent storage channel
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

  const result = data.result;
  const mediaObj =
    result.document   ?? 
    result.video      ?? 
    result.animation  ?? 
    result.audio      ?? 
    result.voice      ??
    result.video_note ??
    result.sticker    ??
    (Array.isArray(result.photo)
      ? result.photo[result.photo.length - 1] 
      : null);

  if (!mediaObj || !mediaObj.file_id) {
    console.error('[Telegram] Unexpected result shape:', JSON.stringify(result));
    throw new Error(`Telegram returned an unexpected result: no file_id found.`);
  }

  return {
    fileId: mediaObj.file_id,
    fileSize: mediaObj.file_size ?? buffer.length,
    messageId: result.message_id,
  };
}

// ---------------------------------------------
// Upload: Chunked (> 39MB)
// ---------------------------------------------

/**
 * Splits a large buffer into chunks and uploads each chunk
 * to Telegram sequentially.
 * Returns all file_ids and message_ids in order.
 */
export async function uploadChunkedToTelegram(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  baseCaption?: string,
): Promise<TelegramChunkedUploadResult> {

  const totalChunks = Math.ceil(buffer.length / CHUNK_SIZE);
  const fileIds: string[] = [];
  const messageIds: number[] = [];

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end   = Math.min(start + CHUNK_SIZE, buffer.length);
    const chunk = buffer.subarray(start, end);

    const chunkName = `${filename}.part${String(i + 1).padStart(3, '0')}`;
    const chunkCaption = baseCaption 
      ? `${baseCaption}\n[Part ${i + 1}/${totalChunks}]`
      : `Part ${i + 1}/${totalChunks} of ${filename}`;

    const result = await uploadToTelegram(chunk, chunkName, 'application/octet-stream', chunkCaption);
    fileIds.push(result.fileId);
    messageIds.push(result.messageId);

    console.log(`[Telegram] Uploaded chunk ${i + 1}/${totalChunks} -> MSG:${result.messageId}`);
  }

  return {
    fileIds,
    messageIds,
    isChunked: true,
    chunkCount: totalChunks,
  };
}

// ---------------------------------------------
// Smart Upload: auto-decides single vs chunked
// ---------------------------------------------

/**
 * Main entry point for all CloudSnap uploads.
 */
export async function smartUploadToTelegram(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  caption?: string,
): Promise<TelegramChunkedUploadResult> {

  if (buffer.length > CHUNK_SIZE) {
    return uploadChunkedToTelegram(buffer, filename, mimeType, caption);
  }

  const result = await uploadToTelegram(buffer, filename, mimeType, caption);
  return {
    fileIds: [result.fileId],
    messageIds: [result.messageId],
    isChunked: false,
    chunkCount: 1,
  };
}
