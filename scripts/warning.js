const fs = require('fs');
const path = require('path');

try {
    const warningPath = path.join(__dirname, '..', 'WARNING.txt');
    if (fs.existsSync(warningPath)) {
        const warning = fs.readFileSync(warningPath, 'utf8');
        // Print in Red (\x1b[31m) and Reset (\x1b[0m)
        console.log('\x1b[31m%s\x1b[0m', '\n' + warning + '\n');
        console.log('\x1b[33m%s\x1b[0m', '     >>> Private Repository - Play Nice! <<<     \n');
    }
} catch (e) {
    // Silent fail if something goes wrong, don't break install
}
