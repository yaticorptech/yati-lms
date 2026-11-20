/**
 * Records the story film's ENGLISH voices with Kokoro (2026-11-13: the old English recordings, Indic Parler's Indian
 * English, said "résumé" and "certificates" wrongly; and making each line live in the browser left pauses between
 * lines). One file a line into public/linguistic/film/stranger/en/<scene>-<line>.m4a, its length in manifest.json —
 * the film plays them back to back like a film, with nothing to make while it plays. Hindi and Kannada keep theirs.
 *
 * Each person in their own voice: the narrator af_heart, Arjun am_michael, Ravi (old) bm_george a little slower,
 * the interviewer am_fenrir.
 *
 *   node scripts/storyFilmKokoro.mjs          (macOS: needs afconvert; first run downloads the ~80 MB model)
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { KokoroTTS } from 'kokoro-js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'public', 'linguistic', 'film', 'stranger');
const require = createRequire(import.meta.url);
const comics = require(path.join(ROOT, '..', 'yaticorp-lms-server', 'src', 'linguistic', 'comics.js'));

const VOICE = {
    narrator: { voice: 'af_heart', speed: 1 },
    arjun: { voice: 'am_michael', speed: 1 },
    ravi: { voice: 'bm_george', speed: 0.9 },
    interviewer: { voice: 'am_fenrir', speed: 1 }
};

const film = comics.build({ order: 2, course: null, seedKey: 'x' }, 'en').comic;
// The same treatment as the Hindi film (2026-11-18, the user: "whatever changes in one language, the same in every
// language"): each line sentence by sentence with a breath between, a breath before and after, and its feeling heard
// in the pace — happy and excited quicker, a surprise quicker still, sad slower, kind a touch slower.
const { filmVoice, sentencesOf } = await import('../src/linguistic/speechText.js');
const MOOD = { happy: 1.07, excited: 1.08, surprise: 1.1, sad: 0.85, kind: 0.94, question: 1, story: 0.96 };
const moodOf = (ln) => (ln.who === 'narrator' ? 'story' : (String(filmVoice(film, ln)).match(/mood-(\w+)/) || [])[1] || null);
const jobs = [];
film.scenes.forEach((sc, i) => sc.lines.forEach((ln, k) => jobs.push([`${i + 1}-${k}`, ln.who, ln.text, moodOf(ln)])));
jobs.push(['moral', 'narrator', film.moral, 'story']);

const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' });
const dir = path.join(OUT, 'en');
fs.mkdirSync(dir, { recursive: true });
const file = path.join(OUT, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
manifest.en = manifest.en || {};
manifest.kokoro = { ...(manifest.kokoro || {}), en: [] };

const RATE = 24000;
const silence = (sec) => new Float32Array(Math.round(sec * RATE));
for (const [key, who, text, mood] of jobs) {
    const base = VOICE[who] || VOICE.narrator;
    const v = { voice: base.voice, speed: Math.round(base.speed * (MOOD[mood] || 1) * 100) / 100 };
    const pieces = [silence(0.12)];
    let audio = null;
    const parts = sentencesOf(text);
    for (let n = 0; n < parts.length; n += 1) {
        audio = await tts.generate(parts[n], v);
        pieces.push(audio.audio, silence(n === parts.length - 1 ? 0.3 : 0.38));
    }
    const all = new Float32Array(pieces.reduce((t, x) => t + x.length, 0));
    pieces.reduce((at, x) => { all.set(x, at); return at + x.length; }, 0);
    let peak = 0;
    for (const x of all) peak = Math.max(peak, Math.abs(x));
    if (peak > 0.92) for (let n = 0; n < all.length; n += 1) all[n] *= 0.92 / peak;
    audio = new audio.constructor(all, RATE);
    const wav = path.join(dir, `${key}.wav`);
    await audio.save(wav);
    const m4a = path.join(dir, `${key}.m4a`);
    execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '64000', wav, m4a]);
    fs.unlinkSync(wav);
    const seconds = Math.round((audio.audio.length / audio.sampling_rate) * 100) / 100;
    manifest.en[key] = seconds;
    manifest.kokoro.en.push(key);
    fs.writeFileSync(file, JSON.stringify(manifest, null, 1));
    console.log(`en ${key} ${who.padEnd(11)} ${seconds}s  ${text.slice(0, 60)}`);
}
console.log(`Done: ${jobs.length} English lines.`);
