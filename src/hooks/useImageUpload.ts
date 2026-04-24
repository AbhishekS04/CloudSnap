import { useState, useCallback } from 'react';
import { ImageRecord, UploadResponse } from '@/lib/types';

interface UseImageUploadProps {
    onUploadComplete?: (data: ImageRecord | UploadResponse) => void;
}

export function useImageUpload({ onUploadComplete }: UseImageUploadProps = {}) {
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [uploadedBytes, setUploadedBytes] = useState(0);
    const [totalBytes, setTotalBytes] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const uploadFile = useCallback(async (file: File, folderId?: string | null) => {
        // Allow any image and video mime type
        const isMedia = file.type.startsWith('image/') || file.type.startsWith('video/');
        // Also handle files where OS reports a blank type — fall back to extension check
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        const videoExts = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'wmv', 'm4v', '3gp', 'flv', 'mpeg', 'mpg', 'ogv'];
        const imageExts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'heic', 'heif', 'bmp', 'tiff', 'tif', 'svg', 'ico'];
        const isKnownExt = videoExts.includes(ext) || imageExts.includes(ext);

        if (!isMedia && !isKnownExt) {
            setError('Only image and video files are allowed');
            return;
        }

        // Client-side size guards — mirrored on the server.
        const isVideoFile = file.type.startsWith('video/') || videoExts.includes(ext);
        const MAX_IMAGE_MB = 50;
        const MAX_VIDEO_MB = 200;

        if (isVideoFile && file.size > MAX_VIDEO_MB * 1024 * 1024) {
            setError(`Video file size must be less than ${MAX_VIDEO_MB} MB`);
            return;
        }
        if (!isVideoFile && file.size > MAX_IMAGE_MB * 1024 * 1024) {
            setError(`Image file size must be less than ${MAX_IMAGE_MB} MB`);
            return;
        }

        setIsUploading(true);
        setError(null);
        setProgress(0);
        setUploadedBytes(0);
        setTotalBytes(file.size);

        try {
            const formData = new FormData();
            // IMPORTANT: Append fields BEFORE files for Busboy to process them correctly
            if (folderId) {
                console.log('[useImageUpload] Appending folderId:', folderId);
                formData.append('folderId', folderId);
            } else {
                console.log('[useImageUpload] No folderId provided');
            }
            formData.append('file', file);

            const uploadUrl = folderId ? `/api/upload?folderId=${folderId}` : '/api/upload';

            // Use XHR for real upload progress tracking
            const data = await new Promise<any>((resolve, reject) => {
                const xhr = new XMLHttpRequest();

                xhr.upload.addEventListener('progress', (event) => {
                    if (event.lengthComputable) {
                        const pct = Math.round((event.loaded / event.total) * 90); // up to 90% during upload
                        setProgress(pct);
                        setUploadedBytes(event.loaded);
                        setTotalBytes(event.total);
                    }
                });

                xhr.addEventListener('load', () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            resolve(JSON.parse(xhr.responseText));
                        } catch {
                            reject(new Error('Invalid server response'));
                        }
                    } else {
                        try {
                            const errData = JSON.parse(xhr.responseText);
                            reject(new Error(errData.error || 'Upload failed'));
                        } catch {
                            reject(new Error(`Upload failed with status ${xhr.status}`));
                        }
                    }
                });

                xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
                xhr.addEventListener('abort', () => reject(new Error('Upload was aborted')));

                xhr.open('POST', uploadUrl);
                xhr.send(formData);
            });

            setProgress(100);
            setUploadedBytes(file.size);
            onUploadComplete?.(data);
        } catch (err: any) {
            setError(err.message);
            setProgress(0);
            setUploadedBytes(0);
        } finally {
            setIsUploading(false);
            // Reset progress after delay
            setTimeout(() => {
                setProgress(0);
                setUploadedBytes(0);
                setTotalBytes(0);
            }, 1500);
        }
    }, [onUploadComplete]);

    const uploadUrl = useCallback(async (url: string, folderId?: string | null) => {
        setIsUploading(true);
        setError(null);
        setProgress(10); // Indeterminate start
        setUploadedBytes(0);
        setTotalBytes(0);

        try {
            // Simulate progress for URL uploads (no real upload progress available)
            const timer = setInterval(() => {
                setProgress((prev) => (prev < 90 ? prev + 5 : prev));
            }, 800);

            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url, folderId }),
            });

            clearInterval(timer);

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Upload failed');
            }

            const data = await response.json();
            setProgress(100);
            onUploadComplete?.(data);
        } catch (err: any) {
            setError(err.message);
            setProgress(0);
        } finally {
            setIsUploading(false);
            setTimeout(() => {
                setProgress(0);
                setUploadedBytes(0);
                setTotalBytes(0);
            }, 1500);
        }
    }, [onUploadComplete]);

    return {
        uploadFile,
        uploadUrl,
        isUploading,
        progress,
        uploadedBytes,
        totalBytes,
        error,
        resetError: () => setError(null)
    };
}
