import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

// Configure ffmpeg path
if (ffmpegPath) {
    ffmpeg.setFfmpegPath(ffmpegPath);
}
if (ffprobeInstaller.path) {
    console.log('Setting ffprobe path to:', ffprobeInstaller.path);
    ffmpeg.setFfprobePath(ffprobeInstaller.path);
}

export interface VideoProcessResult {
    thumbnailPath: string;
    thumbnailBuffer: Buffer;
    optimizedOriginalPath: string;
    optimizedOriginalBuffer: Buffer;
    compressedPath: string;
    compressedBuffer: Buffer;
    metadata: {
        duration: number;
        width: number;
        height: number;
        format: string;
    };
}

export async function processVideo(fileBuffer: Buffer, originalName: string): Promise<VideoProcessResult> {
    const tempDir = os.tmpdir();
    const id = uuidv4();
    const inputPath = path.join(tempDir, `${id}_input${path.extname(originalName)}`);
    const thumbnailPath = path.join(tempDir, `${id}_thumb.jpg`);
    const optimizedPath = path.join(tempDir, `${id}_opt${path.extname(originalName)}`);
    const compressedPath = path.join(tempDir, `${id}_comp.mp4`);

    // Write input buffer to temp file
    await fs.promises.writeFile(inputPath, fileBuffer);

    try {
        // 1. Get Metadata
        const metadata = await new Promise<any>((resolve, reject) => {
            ffmpeg.ffprobe(inputPath, (err, metadata) => {
                if (err) reject(err);
                else resolve(metadata);
            });
        });

        const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
        const duration = metadata.format.duration || 0;
        const width = videoStream?.width || 0;
        const height = videoStream?.height || 0;

        // 2. Generate Thumbnail (Screenshot)
        await new Promise<void>((resolve, reject) => {
            ffmpeg(inputPath)
                .screenshots({
                    timestamps: ['1'], // Take at 1 second mark
                    filename: path.basename(thumbnailPath),
                    folder: tempDir,
                    size: '640x?' // Resize width to 640, keep aspect ratio
                })
                .on('end', () => resolve())
                .on('error', (err) => reject(err));
        });

        // 3. Optimized Original (Fast Start + Copy)
        // Moves metadata to start of file for web streaming, copies streams (no quality loss)
        await new Promise<void>((resolve, reject) => {
            ffmpeg(inputPath)
                .outputOptions(['-movflags +faststart', '-c copy']) // -c copy preserves exact quality
                .save(optimizedPath)
                .on('end', () => resolve())
                .on('error', (err) => reject(err));
        });

        // 4. Compressed Version (Web Optimized)
        // Standard H.264/AAC, scaled to 720p if larger
        await new Promise<void>((resolve, reject) => {
            ffmpeg(inputPath)
                .videoCodec('libx264')
                .audioCodec('aac')
                .size('?x720') // Resize height to 720p, keep aspect
                .outputOptions([
                    '-crf 23', // constant rate factor (quality)
                    '-preset medium',
                    '-movflags +faststart'
                ])
                .save(compressedPath)
                .on('end', () => resolve())
                .on('error', (err) => reject(err));
        });

        // Read all generated files back to buffers
        const [thumbBuf, optBuf, compBuf] = await Promise.all([
            fs.promises.readFile(thumbnailPath),
            fs.promises.readFile(optimizedPath),
            fs.promises.readFile(compressedPath)
        ]);

        return {
            thumbnailPath,
            thumbnailBuffer: thumbBuf,
            optimizedOriginalPath: optimizedPath,
            optimizedOriginalBuffer: optBuf,
            compressedPath: compressedPath,
            compressedBuffer: compBuf,
            metadata: {
                duration,
                width,
                height,
                format: metadata.format.format_name
            }
        };

    } finally {
        // Cleanup temp files (best effort)
        try {
            if (fs.existsSync(inputPath)) await fs.promises.unlink(inputPath);
            if (fs.existsSync(thumbnailPath)) await fs.promises.unlink(thumbnailPath);
            if (fs.existsSync(optimizedPath)) await fs.promises.unlink(optimizedPath);
            if (fs.existsSync(compressedPath)) await fs.promises.unlink(compressedPath);
        } catch (e) {
            console.error('Cleanup error:', e);
        }
    }
}
