const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function reproduceIssue() {
    console.log('--- Starting Reproduction Script ---');

    console.log('Creating 50MB dummy video file...');
    const filePath = path.join(__dirname, 'repro-video.mp4');

    // Create a sparse file is faster, but we want actual data to force buffering/streaming issues
    const stream = fs.createWriteStream(filePath);
    const chunkSize = 1024 * 1024; // 1MB
    const buffer = Buffer.alloc(chunkSize, 'a');

    for (let i = 0; i < 50; i++) {
        if (!stream.write(buffer)) {
            await new Promise(resolve => stream.once('drain', resolve));
        }
    }
    stream.end();

    await new Promise(resolve => stream.on('finish', resolve));
    console.log('50MB file created.');

    console.log('Uploading using fetch...');
    // We use a custom script with fetch because standard 'FormData' in Node might buffer? 
    // Actually modern node has fetch/FormData built-in.

    try {
        const { Blob } = require('buffer');
        const fileBuffer = fs.readFileSync(filePath);
        const blob = new Blob([fileBuffer], { type: 'video/mp4' });
        const formData = new FormData();
        formData.append('file', blob, 'video.mp4');
        formData.append('folderId', 'null');

        const response = await fetch('http://localhost:3000/api/upload', {
            method: 'POST',
            body: formData,
            // Duplex is needed for streaming bodies in Node fetch? 
            // Node 18+ fetch might need duplex: 'half' for streams, but FormData isn't a stream usually.
        });

        const text = await response.text();
        console.log(`Status: ${response.status}`);
        console.log(`Response Preview: ${text.substring(0, 300)}...`);

        if (response.status === 200) {
            console.log('SUCCESS: Upload worked.');
        } else {
            console.error('FAILURE: Upload failed.');
        }

    } catch (err) {
        console.error('ERROR during fetch:', err);
    } finally {
        // Cleanup
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
}

reproduceIssue();
