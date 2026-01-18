import sharp from 'sharp';

// Configuration constants
export const QUALITY_SETTINGS = {
    webp: {
        quality: 100, // Lossless-like
        smartSubsample: true,
        effort: 6,
        lossless: false,
    },
    avif: {
        quality: 90, // High quality
        effort: 6,
        lossless: false,
    },
    jpeg: {
        quality: 95, // Very high quality
        mozjpeg: true,
    },
    png: {
        quality: 100,
        compressionLevel: 9,
        palette: false, // True color
    }
};

export const SIZES = {
    thumb: 200,
    sm: 600,
    md: 1200,
    lg: 2000,
};

export interface ProcessedImage {
    buffer: Buffer;
    width: number;
    height: number;
    size: number;
}

/**
 * processImage
 * Optimizes and resizes an image buffer to WebP/AVIF/JPEG/PNG format.
 * - Always maintains aspect ratio.
 * - Never upscales
 */
export async function processImage(
    originalBuffer: Buffer,
    targetWidth: number,
    format: 'webp' | 'avif' | 'jpeg' | 'png' = 'webp'
): Promise<ProcessedImage> {
    const metadata = await sharp(originalBuffer).metadata();
    const inputWidth = metadata.width || 0;

    // Do not upscale
    const finalWidth = inputWidth < targetWidth ? inputWidth : targetWidth;

    let pipeline = sharp(originalBuffer)
        .resize({ width: finalWidth, withoutEnlargement: true });

    if (format === 'avif') {
        pipeline = pipeline.avif(QUALITY_SETTINGS.avif);
    } else if (format === 'jpeg') {
        pipeline = pipeline.jpeg(QUALITY_SETTINGS.jpeg);
    } else if (format === 'png') {
        pipeline = pipeline.png(QUALITY_SETTINGS.png);
    } else {
        // WebP
        pipeline = pipeline.webp(QUALITY_SETTINGS.webp);
    }

    const buffer = await pipeline.toBuffer();
    const info = await sharp(buffer).metadata();

    return {
        buffer,
        width: info.width || finalWidth,
        height: info.height || 0,
        size: info.size || 0,
    };
}

/**
 * getMetadata
 * Helper to get basic info of the original file
 */
export async function getMetadata(buffer: Buffer) {
    const metadata = await sharp(buffer).metadata();
    return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format,
        size: metadata.size, // Note: metadata.size might be undefined for input buffers, usually buffer.length is better for original size
    };
}
