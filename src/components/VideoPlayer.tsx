import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Settings } from 'lucide-react';

interface VideoPlayerProps {
    src: string;
    poster?: string;
    className?: string;
    autoPlay?: boolean;
    isMuted?: boolean;
}

export function VideoPlayer({ src, poster, className = '', autoPlay = true, isMuted = true }: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [progress, setProgress] = useState(0);

    // Handling continuous play and dynamic muting
    useEffect(() => {
        if (videoRef.current) {
            // Always ensure it's playing
            videoRef.current.play().catch(() => { });

            // Toggle audio based on prop
            videoRef.current.muted = isMuted;
        }
    }, [src, isMuted]);

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
            setProgress(p);
        }
    };

    return (
        <div className={`relative group bg-black overflow-hidden ${className}`}>
            <video
                ref={videoRef}
                src={src}
                poster={poster}
                className="w-full h-full object-cover"
                onTimeUpdate={handleTimeUpdate}
                playsInline
                loop
            />

            {/* Custom Overlay - Minimal ambient background */}
            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
    );
}
