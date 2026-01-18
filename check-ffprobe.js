const ffprobe = require('@ffprobe-installer/ffprobe');
console.log('Path:', ffprobe.path);
console.log('Version:', ffprobe.version);
const fs = require('fs');
console.log('Exists:', fs.existsSync(ffprobe.path));
