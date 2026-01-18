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
  };
  optimized: {
    format: 'webp'; // Hardcoded for now as it's the default
    urls: OptimizedUrls;
    sizes: OptimizedSizes;
  };
}

export interface ImageRecord {
  id: string;
  original_name: string;
  original_ext: string;
  mime_type: string;
  width: number;
  height: number;
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
}
