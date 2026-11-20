/**
 * Records a course's letters with care (2026-11-19, the owner: "the Kannada letters' voice is not correct … 'aa'
 * still sounds odd"): several takes of each letter, and the plainest one a speech recogniser hears as that letter
 * is kept — yaticorp-lms-tts/letter_studio.py, which this runs, has the how and the why.
 *
 *   node scripts/recordLetters.js kn            the letters page's letters (vowels, consonants, joined letters)
 *   node scripts/recordLetters.js kn --table    …and the whole table of letter combinations (hundreds: hours)
 *   node scripts/recordLetters.js kn --again    every letter again, the ones already recorded too
 *   node scripts/recordLetters.js kn --unverified   again only those no take of which was heard right (marked ? in the list)
 *
 * The clips go where the server keeps its own (src/tts/store.js), so they are served at once; what was recorded is
 * listed in <cache>/letters.<lang>.json, and the app asks for the letters afresh whenever that file changes
 * (store.js letterRev). Needs yaticorp-lms-tts set up (its .venv); the voice service need not be running.
 */
require('dotenv').config();
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const store = require('../src/tts/store');
const { groupsOf, kagunita } = require('../src/linguistic/content/letters');

const args = process.argv.slice(2);
const lang = args.find((a) => !a.startsWith('--')) || 'kn';
if (!store.LANGUAGES.includes(lang)) { console.error(`No voice for '${lang}'.`); process.exit(1); }
// The voice of each language, as the service names it (yaticorp-lms-tts/app.py SPEAKERS).
const SPEAKER = { as: 'Sita', bn: 'Aditi', gu: 'Neha', hi: 'Divya', kn: 'Anu', ml: 'Anjali', mr: 'Sunita', ne: 'Amrita', or: 'Debjani', pa: 'Gurpreet', sa: 'Aryan', ta: 'Jaya', te: 'Lalitha' };

const seen = new Set(); const letters = [];
const add = (text) => {
    const clip = store.clean(text, lang, 'f');
    if (clip.error || [...clip.text].length > 3 || seen.has(clip.text)) return;
    seen.add(clip.text);
    letters.push({ text: clip.text, file: store.fileOf(clip) });
};
for (const g of groupsOf(lang)) for (const l of g.letters || []) add(l.speak || l.char);
if (args.includes('--table')) {
    const walk = (x) => { if (!x || typeof x !== 'object') return; if (Array.isArray(x)) { x.forEach(walk); return; } if (typeof x.char === 'string') add(x.speak || x.char); Object.values(x).forEach(walk); };
    walk(require('../src/linguistic/alphabet').chartOf(lang)?.table);
    void kagunita;
}
if (!letters.length) { console.error(`No letters for '${lang}'.`); process.exit(1); }

const TTS = path.join(__dirname, '..', '..', 'yaticorp-lms-tts');
const python = path.join(TTS, '.venv', 'bin', 'python');
if (!fs.existsSync(python)) { console.error(`yaticorp-lms-tts is not set up (${python} is missing): see its README.`); process.exit(1); }
const job = path.join(os.tmpdir(), `letters-${lang}-${process.pid}.json`);
fs.writeFileSync(job, JSON.stringify({ lang, speaker: SPEAKER[lang] || '', cache: store.CACHE, manifest: store.lettersManifest(lang), letters }));
console.log(`${lang}: ${letters.length} letters.`);
const run = spawnSync(python, ['letter_studio.py', job, ...args.filter((a) => ['--again', '--unverified'].includes(a))], { cwd: TTS, stdio: 'inherit' });
fs.rmSync(job, { force: true });
process.exit(run.status || 0);
