const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputIds = [
    { size: 32, path: path.join(__dirname, '../src/app/favicon.ico') },
];

const inputFile = path.join(__dirname, '../public/icons/android-chrome-192x192.png');

async function generateFavicon() {
    try {
        console.log('Using input file:', inputFile);

        if (!fs.existsSync(inputFile)) {
            console.error('Error: Input file does not exist.');
            process.exit(1);
        }

        // Generate 32x32 favicon (technically a PNG but saving as .ico extension for simple replacement)
        // Note: For true .ico format, we'd need a plugin or specific handling, but widely supported browsers read png content in .ico files.
        // However, to be extra safe and correct, we can save as icon.png and delete favicon.ico if we wanted, but user asked to replace.
        // Let's stick to replacing the content.

        await sharp(inputFile)
            .resize(32, 32)
            .toFile(inputIds[0].path);

        console.log(`Generated ${inputIds[0].path}`);

    } catch (error) {
        console.error('Error generating favicon:', error);
    }
}

generateFavicon();
