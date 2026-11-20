/**
 * A clip ends where its text ends (src/tts/tidy.js; 2026-11-19, the owner: "after a word it feels odd, like 'aah' —
 * in the last presentation everyone laughed"): whatever the voice model adds after the words, past a long silence,
 * is cut off; a pause the text asks for (a comma) is kept; a sentence said in one go is left as it is.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { tidy, readWav } = require('../../src/tts/tidy');

const RATE = 44100;
/** A WAV from parts: [seconds, loudness 0–1] — a tone for speech, nothing for silence. */
const wav = (parts) => {
    const n = Math.round(parts.reduce((t, [s]) => t + s, 0) * RATE);
    const buf = Buffer.alloc(44 + n * 2);
    buf.write('RIFF', 0, 'latin1'); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8, 'latin1'); buf.write('fmt ', 12, 'latin1');
    buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(RATE, 24); buf.writeUInt32LE(RATE * 2, 28);
    buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36, 'latin1'); buf.writeUInt32LE(n * 2, 40);
    let i = 0;
    for (const [secs, level] of parts) for (let k = 0, m = Math.round(secs * RATE); k < m && i < n; k += 1, i += 1) buf.writeInt16LE(Math.round(Math.sin(i / 20) * 20000 * level), 44 + i * 2);
    return buf;
};
const secs = (buf) => readWav(buf).data.length / RATE;
const near = (a, b, by = 0.08) => assert.ok(Math.abs(a - b) <= by, `${a.toFixed(2)}s, expected about ${b}s`);

test('a word, then a silence, then a stray sound: only the word is kept', () => {
    const out = tidy(wav([[0.5, 1], [0.6, 0], [0.4, 0.8]]), 'ದೊಡ್ಡ');
    near(secs(out), 0.5 + 0.12);
});

test('a quiet stray sound after the word goes too, and the quiet before the word', () => {
    const out = tidy(wav([[0.4, 0], [0.5, 1], [0.7, 0], [0.2, 0.15]]), 'ತಂದೆ');
    near(secs(out), 0.04 + 0.5 + 0.12);
});

test('a letter is said once: its first burst', () => {
    near(secs(tidy(wav([[0.35, 1], [0.2, 0], [0.4, 1]]), 'ಅ')), 0.35 + 0.12);
});

test('a pause the text asks for is kept: two words with a comma between', () => {
    const made = wav([[0.5, 1], [0.5, 0], [0.5, 1]]);
    near(secs(tidy(made, 'ಆಹಾರ, ಊಟ')), 1.5 + 0.0, 0.15);
    // …and what comes after the second is still cut.
    near(secs(tidy(wav([[0.5, 1], [0.5, 0], [0.5, 1], [0.6, 0], [0.3, 0.7]]), 'ಆಹಾರ, ಊಟ')), 1.5 + 0.12, 0.1);
});

test('a short break inside a word (ಕ್ಕ, ಟ್ಟ) is part of it', () => {
    near(secs(tidy(wav([[0.2, 1], [0.14, 0], [0.25, 1]]), 'ಚಿಕ್ಕಮ್ಮ')), 0.59 + 0.0, 0.14);
});

test('a sentence is not cut at a breath before enough of it has been said', () => {
    const text = 'ಸಭೆಯನ್ನು ಸೋಮವಾರಕ್ಕೆ ಮುಂದೂಡಲಾಗಿದೆ';   // about thirty letters: under 1.5 s of speech cannot be all of it
    const made = wav([[0.8, 1], [0.5, 0], [1.6, 1]]);
    near(secs(tidy(made, text)), 2.9, 0.15);
});

test('a clean clip, or something that is not a WAV, comes back as it was', () => {
    const clean = wav([[0.6, 1], [0.1, 0]]);
    assert.equal(tidy(clean, 'ಮನೆಗೆ'), clean);
    const other = Buffer.from('not a sound');
    assert.equal(tidy(other, 'ಮನೆ'), other);
});
