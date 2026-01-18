"use client";

import { ImageRecord } from '@/lib/types';
import { formatBytes } from '@/lib/utils';
import { Copy, Trash2, ExternalLink, Image as ImageIcon, Zap } from 'lucide-react';
import { useState } from 'react';

interface ImageGalleryProps {
    images: (ImageRecord & { avif?: any })[]; // Extend type loosely for now
    onDelete: (id: string) => void;
}

export function ImageGallery({ images, onDelete }: ImageGalleryProps) {
    const [copying, setCopying] = useState<string | null>(null);

    const copyToClipboard = async (text: string, id: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopying(id);
            setTimeout(() => setCopying(null), 2000);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    const calculateReduction = (original: number, optimized: number) => {
        const percent = ((original - optimized) / original) * 100;
        return Math.round(percent);
    };

    // Helper to generate AVIF url if not in DB but follows pattern
    const getAvifUrl = (image: ImageRecord, size: string) => {
        // Pattern: https://.../assets/avif/size/id.avif
        // We can deduce base from webp url
        // webp url: .../assets/webp/thumb/UUID.webp
        if (!image.thumb_url) return '';
        const baseUrl = image.thumb_url.split('/webp/')[0];
        return `${baseUrl}/avif/${size}/${image.id}.avif`;
    };

    if (images.length === 0) {
        return (
            <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-gray-900">No images yet</h3>
                <p className="text-xs text-gray-500 mt-1">Upload your first image to get started</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {images.map((image) => (
                <div key={image.id} className="bg-white border text-black border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                    {/* Preview Area */}
                    <div className="aspect-video relative bg-gray-100 flex items-center justify-center overflow-hidden border-b border-gray-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={image.md_url}
                            alt={image.original_name}
                            className="w-full h-full object-contain"
                            loading="lazy"
                        />

                        {/* Overlay Actions */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <a
                                href={image.md_url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
                                title="Open MD"
                            >
                                <ExternalLink className="w-4 h-4 text-gray-900" />
                            </a>
                            <button
                                onClick={() => onDelete(image.id)}
                                className="p-2 bg-white rounded-full hover:bg-red-50 text-red-600 transition-colors"
                                title="Delete"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Size Badge */}
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded font-medium backdrop-blur-sm">
                            -{calculateReduction(image.original_size, image.md_size)}% (MD)
                        </div>
                    </div>

                    {/* Info Area */}
                    <div className="p-4 space-y-4">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <h4 className="text-sm font-medium text-gray-900 truncate" title={image.original_name}>
                                    {image.original_name}
                                </h4>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {new Date(image.created_at).toLocaleDateString()} • WEBP + AVIF
                                </p>
                            </div>
                        </div>

                        {/* URL List */}
                        <div className="space-y-2">
                            <div className="grid grid-cols-5 gap-2 text-xs font-medium text-gray-500 mb-1">
                                <span>Size</span>
                                <span className="col-span-1 text-right">Width</span>
                                <span className="col-span-1 text-right">WebP</span>
                                <span className="col-span-1">AVIF</span>
                            </div>

                            {[
                                { label: 'Thumb', webp: image.thumb_url, width: 200, size: image.thumb_size },
                                { label: 'SM', webp: image.sm_url, width: 600, size: image.sm_size },
                                { label: 'MD', webp: image.md_url, width: 1200, size: image.md_size },
                                { label: 'LG', webp: image.lg_url, width: 2000, size: image.lg_size },
                            ].map((item) => (
                                <div key={item.label} className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded-lg group/item hover:bg-gray-100 transition-colors">
                                    <span className="font-semibold text-gray-700 w-10">{item.label}</span>
                                    <span className="text-gray-500 w-10 text-right">{item.width}w</span>

                                    {/* WebP Copy */}
                                    <button
                                        onClick={() => copyToClipboard(item.webp, `${image.id}-${item.label}-webp`)}
                                        className="flex items-center gap-1 px-2 py-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                        title="Copy WebP URL"
                                    >
                                        <span className="text-[10px]">WEBP</span>
                                        {copying === `${image.id}-${item.label}-webp` ? (
                                            <span className="text-green-600 font-bold">✓</span>
                                        ) : (
                                            <Copy className="w-3 h-3" />
                                        )}
                                    </button>

                                    {/* AVIF Copy - optimistically generated */}
                                    <button
                                        onClick={() => copyToClipboard(getAvifUrl(image, item.label.toLowerCase()), `${image.id}-${item.label}-avif`)}
                                        className="flex items-center gap-1 px-2 py-1 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                        title="Copy AVIF URL (Experimental)"
                                    >
                                        <span className="text-[10px] flex items-center gap-0.5"><Zap className="w-2 h-2" /> AVIF</span>
                                        {copying === `${image.id}-${item.label}-avif` ? (
                                            <span className="text-green-600 font-bold">✓</span>
                                        ) : (
                                            <Copy className="w-3 h-3" />
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
