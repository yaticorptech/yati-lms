/**
 * Copy WORDCRAFT's game logic from the student app into the server (2026-11-20).
 *
 * The student app scores WORDCRAFT in the browser; the server re-scores every submission with the exact same code so
 * a score cannot be made up in the browser. The files are ES modules with no outside imports
 * (yaticorp-lms-student/src/career/data/bands/wordcraft/*.js); they are copied byte for byte into
 * src/career/wordcraft/shared/ (marked "type": "module"). Run after changing them:
 *
 *   node scripts/syncWordcraft.js
 *
 * tests/career/wordcraft.test.js fails while the two copies differ.
 */
const fs = require('fs');
const path = require('path');

const FILES = ['content.js', 'select.js', 'score.js', 'text.js', 'rand.js'];
const FROM = path.join(__dirname, '..', '..', 'yaticorp-lms-student', 'src', 'career', 'data', 'bands', 'wordcraft');
const TO = path.join(__dirname, '..', 'src', 'career', 'wordcraft', 'shared');

if (require.main === module) {
    fs.mkdirSync(TO, { recursive: true });
    for (const f of FILES) fs.copyFileSync(path.join(FROM, f), path.join(TO, f));
    fs.writeFileSync(path.join(TO, 'package.json'), `${JSON.stringify({ type: 'module' }, null, 2)}\n`);
    console.log(`Copied ${FILES.length} WORDCRAFT files to ${path.relative(process.cwd(), TO)}`);
}

module.exports = { FILES, FROM, TO };
