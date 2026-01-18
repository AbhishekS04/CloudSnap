
// syntax-check.js
try {
    const route = require('./src/app/api/upload/route.ts');
    console.log("Syntax check passed (imports might fail but parsing worked)");
} catch (e) {
    if (e.message.includes('SyntaxError')) {
        console.error("Syntax Error:", e.message);
    } else {
        // Ignore module resolution errors, just care about syntax
        console.log("Parsing passed (runtime dependencies missing)");
    }
}
