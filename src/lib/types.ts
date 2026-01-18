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
}

export interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
}
