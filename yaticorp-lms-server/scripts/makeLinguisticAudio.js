/**
 * Makes the recordings for the seeded Linguistic Ability lessons: every line
 * of every conversation and every vocabulary word, as small M4A files in
 * public/linguistic/audio (served by the API's static files).
 *
 * Uses the computer's own text-to-speech — macOS `say` and `afconvert` — so
 * no outside service is involved. Run on a Mac, after changing the seeded
 * dialogues or words:   node scripts/makeLinguisticAudio.js [--force]
 * Existing files are kept unless --force is given.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { lessons } = require('../src/linguistic/content');

const OUT = path.join(__dirname, '..', 'public', 'linguistic', 'audio');
const FORCE = process.argv.includes('--force');
const VOICE = { m: 'Rishi', f: 'Samantha' };          // Indian-English and US-English voices
const RATE = { beginner: 150, intermediate: 165, advanced: 175 }; // words a minute: slower for beginners

fs.mkdirSync(OUT, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'linguistic-audio-'));
let made = 0, kept = 0;

const record = (text, voice, rate, file) => {
    const target = path.join(OUT, file);
    if (fs.existsSync(target) && !FORCE) { kept++; return; }
    const aiff = path.join(tmp, 'line.aiff');
    execFileSync('say', ['-v', voice, '-r', String(rate), '-o', aiff, text]);
    execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '48000', aiff, target]);
    made++;
};

for (const lesson of lessons) {
    if (lesson.module === 'speaking') {
        const voices = Object.fromEntries((lesson.learn.dialogue.speakers || []).map((s) => [s.name, VOICE[s.voice] || VOICE.m]));
        for (const line of lesson.learn.dialogue.lines) record(line.text, voices[line.speaker] || VOICE.m, RATE[lesson.level], path.basename(line.audio));
    }
    if (lesson.module === 'vocabulary') {
        for (const w of lesson.words) if (w.audio) record(w.word, VOICE.m, 140, path.basename(w.audio));
    }
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`Recordings made: ${made}; already there: ${kept}. Folder: ${OUT}`);
