/**
 * __   __                                 _            _ _ _   _   _        _                 
 * \ \ / /                                | |          | (_) | | | | |      | |                
 *  \ V /___  _   _   ___ _ __   ___  __ _| | ___   _  | |_| |_| |_| | ___  | |__   ___  _   _ 
 *   \ // _ \| | | | / __| '_ \ / _ \/ _` | |/ / | | | | | | __| __| |/ _ \ | '_ \ / _ \| | | |
 *   | | (_) | |_| | \__ \ | | |  __/ (_| |   <| |_| | | | | |_| |_| |  __/ | |_) | (_) | |_| |
 *   \_/\___/ \__,_| |___/_| |_|\___|\__,_|_|\_\\__, | |_|_|\__|\__|_|\___| |_.__/ \___/ \__, |
 *                                               __/ |                                    __/ |
 *                                              |___/                                    |___/ 
 */

export type ImageSize = 'thumb' | 'sm' | 'md' | 'lg';

export interface OptimizedUrls {
  thumb: string;
  sm: string;
  md: string;
  lg: string;
}

export interface OptimizedSizes {
  thumb: number;
  sm: number;
  md: number;
  lg: number;
}

export interface UploadResponse {
  id: string;
  original: {
    url: string;
    size: number;
    width: number;
    height: number;
    duration?: number; // Added for video
  };
  optimized: {
    format: string; // Changed from 'webp' to string
    urls: OptimizedUrls;
    sizes: OptimizedSizes; // For video: thumb=poster, md=compressed, others unused?
  };
}

export interface ImageRecord {
  id: string;
  original_name: string;
  original_ext: string;
  original_url: string;
  mime_type: string;
  width: number;
  height: number;
  duration?: number; // Added for video
  original_size: number;
  optimized_format: string;
  thumb_url: string;
  sm_url: string;
  md_url: string;
  lg_url: string;
  thumb_size: number;
  sm_size: number;
  md_size: number;
  lg_size: number;
  created_at: string;
  folder_id?: string | null;
  user_id?: string | null;
}


export interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
}

// ─────────────────────────────────────────────
// New: Telegram-backed Asset (replaces ImageRecord for new uploads)
// ─────────────────────────────────────────────

export interface Asset {
  id: string;
  original_name: string;
  mime_type: string;
  width: number | null;
  height: number | null;
  duration: number | null;
  original_size: number;
  telegram_file_ids: string[];
  telegram_chat_id: string;
  is_chunked: boolean;
  chunk_count: number;
  folder_id: string | null;
  user_id?: string | null;
  created_at: string;
  
  // AI Metadata
  ai_description?: string | null;
  ai_tags?: string[] | null;

  // Derived CDN URL helpers (not stored in DB)
  cdnUrl?: string;
}

export interface UploadAssetResponse {
  id: string;
  cdnUrl: string;
  urls: {
    original: string;
    thumb: string;
    sm: string;
    md: string;
    lg: string;
  };
  meta: {
    originalName: string;
    mimeType: string;
    width: number;
    height: number;
    duration: number | null;
    originalSize: number;
    isChunked: boolean;
    chunkCount: number;
  };
}
