const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ICON_DIR = path.join(process.cwd(), 'public', 'icons');

if (!fs.existsSync(ICON_DIR)) {
    fs.mkdirSync(ICON_DIR, { recursive: true });
}

// Create a simple SVG buffer for the icon
const svgBuffer = Buffer.from(`
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4f46e5;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#06b6d4;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="100" fill="url(#grad1)" />
  <path d="M140 260 C140 200 180 160 240 160 C280 160 310 180 330 210 C360 210 390 230 390 270 C390 310 360 340 320 340 L160 340 C120 340 100 310 100 270 C100 240 120 260 140 260 Z" fill="white" />
</svg>
`);

async function generateIcons() {
    console.log('Generating PWA icons...');

    try {
        await sharp(svgBuffer)
            .resize(192, 192)
            .toFile(path.join(ICON_DIR, 'android-chrome-192x192.png'));

        await sharp(svgBuffer)
            .resize(512, 512)
            .toFile(path.join(ICON_DIR, 'android-chrome-512x512.png'));

        console.log('Icons generated successfully!');
    } catch (err) {
        console.error('Error generating icons:', err);
    }
}

generateIcons();
