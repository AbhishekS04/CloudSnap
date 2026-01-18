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
        if (!file.type.startsWith('image/')) {
            setError('Only image files are allowed');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setError('File size must be less than 10MB');
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

    return {
        uploadFile,
        isUploading,
        progress,
        error,
        resetError: () => setError(null)
    };
}
