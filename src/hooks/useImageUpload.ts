import { useState } from 'react';
import { ImageRecord, UploadResponse } from '@/lib/types';

interface UseImageUploadProps {
    onUploadComplete?: (data: ImageRecord | UploadResponse) => void;
}

export function useImageUpload({ onUploadComplete }: UseImageUploadProps = {}) {
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const uploadFile = async (file: File) => {
        // Allow image and video types
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
            setError('Only image and video files are allowed');
            return;
        }

        // Limit images to 10MB, unlimited/high limit for videos
        if (file.type.startsWith('image/') && file.size > 10 * 1024 * 1024) {
            setError('Image file size must be less than 10MB');
            return;
        }

        setIsUploading(true);
        setError(null);
        setProgress(10);

        try {
            const formData = new FormData();
            formData.append('file', file);

            // Simulate progress
            const timer = setInterval(() => {
                setProgress((prev) => (prev < 90 ? prev + 10 : prev));
            }, 500);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
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
            // Reset progress after delay
            setTimeout(() => setProgress(0), 1000);
        }
    };

    const uploadUrl = async (url: string) => {
        setIsUploading(true);
        setError(null);
        setProgress(10); // Indeterminate start

        try {
            // Simulate progress
            const timer = setInterval(() => {
                setProgress((prev) => (prev < 90 ? prev + 5 : prev));
            }, 800);

            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url }),
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
            setTimeout(() => setProgress(0), 1000);
        }
    };

    return {
        uploadFile,
        uploadUrl,
        isUploading,
        progress,
        error,
        resetError: () => setError(null)
    };
}
