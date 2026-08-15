const fs = require('fs');
const path = require('path');

function searchForCommunity(dir, depth = 0) {
    if (depth > 5) return;
    try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'build') continue;
            
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                searchForCommunity(fullPath, depth + 1);
            } else if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.md')) {
                const content = fs.readFileSync(fullPath, 'utf8');
                if (content.toLowerCase().includes('community')) {
                    const lines = content.split('\n');
                    for (let i = 0; i < lines.length; i++) {
                        if (lines[i].toLowerCase().includes('community')) {
                            console.log(`[${fullPath}:${i+1}]: ${lines[i].trim()}`);
                        }
                    }
                }
            }
        }
    } catch (e) {
        // ignore
    }
}

searchForCommunity('./');
