/**
 * Every Hindi story voiced with Kokoro (2026-11-18, the user: "use Kokoro for the Hindi stories section completely").
 *
 *   node scripts/storyHindiKokoro.mjs jobs <out.json>     list every line to record: [{ id, text, voice, speed, keys }]
 *   node scripts/storyHindiKokoro.mjs record <jobs.json> <done.json> [limit]   record them (m4a), noting each file
 *   node scripts/storyHindiKokoro.mjs index <done.json>   write public/linguistic/story-hi/index.json from the results
 *
 * kokoro-js lists English voices only, but its model is Kokoro v1.0, which has Hindi voices (hf_alpha, hf_beta,
 * hm_omega, hm_psi — in node_modules/kokoro-js/voices). The words are turned into sounds by espeak-ng's Hindi
 * (the phonemizer package), as Kokoro's own Hindi does, then spoken with generate_from_ids, which takes any voice.
 *
 * Each person in their own voice: the narrator hf_alpha, women hf_beta, men hm_omega, an older or bigger man hm_psi
 * a little slower, an older woman hf_beta a little slower, a child a little faster. In the film: Arjun hm_omega,
 * Ravi (old) hm_psi slower, the interviewer hm_psi.
 *
 * What is recorded is exactly what the app asks to hear (meta.js play / readAloud, via speechText.js): each line whole
 * (a tap on a person, a narration's speaker) and each of its sentences (Read aloud), after courseSpeech — keyed
 * "<text>|<voice spec>" so the player finds them (meta.js storyClip). The film's lines go in its own folder
 * (public/linguistic/film/stranger/hi/<scene>-<line>.m4a) and its manifest, as the film plays them.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { comicSpeech, courseSpeech, filmVoice, sentencesOf, voiceSpec } from '../src/linguistic/speechText.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const require = createRequire(import.meta.url);
const comics = require(path.join(ROOT, '..', 'yaticorp-lms-server', 'src', 'linguistic', 'comics.js'));

/** A voice spec ('f', 'm:pitch-low,pace-slow' …) as a Kokoro Hindi voice and speed. */
/*
 * Feelings (2026-11-18, the user: "happy and all should be there"): Kokoro has no emotion control, so a mood is
 * heard through the pace and through how the line ends — happy and excited a little quicker and ending "!", a
 * surprise quicker still, sad slower and trailing off "…", kind a touch slower, a question ending "?".
 */
const MOOD = { happy: [1.07, '!'], excited: [1.08, '!'], surprise: [1.1, '!'], sad: [0.85, '…'], kind: [0.94, ''], question: [1, '?'], story: [0.96, ''] };
export const moodOf = (spec) => (String(spec || '').match(/mood-(\w+)/) || [])[1] || null;
const round2 = (x) => Math.round(x * 100) / 100;
export const kokoroHindi = (spec) => {
    const s = String(spec || 'f');
    const man = s.startsWith('m'), low = s.includes('pitch-low');
    const slow = s.includes('pace-slow'), fast = s.includes('pace-fast');
    const mood = moodOf(s);
    const pace = (slow ? 0.88 : fast ? 1.08 : 1) * (MOOD[mood]?.[0] || 1);
    if (s === 'f:mood-story' || s === 'f') return { voice: 'hf_alpha', speed: 0.96, mood: 'story' };
    if (man) return { voice: low ? 'hm_psi' : 'hm_omega', speed: round2(pace), mood };
    return { voice: 'hf_beta', speed: round2(pace), mood };
};
const FILM = { narrator: { voice: 'hf_alpha', speed: 0.98 }, arjun: { voice: 'hm_omega', speed: 1 }, ravi: { voice: 'hm_psi', speed: 0.86 }, interviewer: { voice: 'hm_psi', speed: 1.02 } };

const [mode, file] = process.argv.slice(2);

if (mode === 'jobs') {
    const jobs = [];
    const byKey = new Map();
    const add = (text, spec, keyText = text) => {
        const r = courseSpeech(text, 'hi-IN', 'hi');
        if (!r) return;
        const spoken = r[0];
        const v = kokoroHindi(spec);
        const id = `${v.voice}|${v.speed}|${spoken}`;
        if (!byKey.has(id)) { byKey.set(id, { id: `c${byKey.size + 1}`, text: spoken, ...v, keys: [] }); jobs.push(byKey.get(id)); }
        const key = `${spoken}|${spec || 'f'}`;
        if (!byKey.get(id).keys.includes(key)) byKey.get(id).keys.push(key);
    };
    for (const order of [1, 2, 3, 4]) {
        const built = comics.build({ order, course: 'hi', seedKey: `hi:comic-advanced-${order}` }, 'en');
        const comic = built.comic;
        if (!comic) continue;
        if (comic.film) {
            comic.scenes.forEach((sc, i) => sc.lines.forEach((ln, k) => {
                const who = FILM[ln.who] || FILM.narrator;
                const mood = ln.who === 'narrator' ? 'story' : moodOf(filmVoice(comic, ln));
                jobs.push({ id: `film-${i + 1}-${k}`, film: `${i + 1}-${k}`, text: ln.text, voice: who.voice, speed: round2(who.speed * (MOOD[mood]?.[0] || 1)), mood, keys: [] });
                add(ln.text, filmVoice(comic, ln));
            }));
            if (comic.moral) {
                const moral = `${comic.moralLabel || 'The moral of the story:'} ${comic.moral}`;
                jobs.push({ id: 'film-moral', film: 'moral', text: courseSpeech(moral, 'hi-IN', 'hi')?.[0] || comic.moral, ...FILM.narrator, mood: 'story', keys: [] });
                add(moral, voiceSpec(null));
            }
            continue;
        }
        // Read aloud: every sentence; a tap: the whole line; the narration's own speaker: the whole narration (voice 'f').
        for (const [text, , spec] of comicSpeech(comic)) {
            add(text, spec);
            sentencesOf(text).forEach((x) => add(x, spec));
        }
        for (const p of comic.panels) if (p.narration) add(p.narration, 'f');
    }
    fs.writeFileSync(file, JSON.stringify(jobs, null, 1));
    console.log(`${jobs.length} recordings (${jobs.filter((j) => j.film).length} for the film)`);
}

if (mode === 'record') {
    const { KokoroTTS } = await import('kokoro-js');
    const outFile = process.argv[4];
    const max = Number(process.argv[5]) || Infinity;
    const jobs = JSON.parse(fs.readFileSync(file, 'utf8')).slice(0, max);
    // espeak-ng's Hindi (the npm phonemizer has English only): @echogarden/espeak-ng-emscripten, its path in ESPEAK
    // (npm i it anywhere). Punctuation kept between the pieces, so Kokoro pauses where the sentence does.
    const { default: espeakInit } = await import(process.env.ESPEAK || '@echogarden/espeak-ng-emscripten');
    const espeak = new (await espeakInit()).eSpeakNGWorker();
    espeak.set_voice('hi');
    const PUNCT = /([,.;:!?।॥—…"“”'‘’()]+)/;
    /*
     * Hindi as espeak hears it, put right where it goes wrong (2026-11-18, "not pronouncing Hindi words correctly"):
     * ड़ / ढ़ come out "r." / "r.h" — the dot a full stop in the middle of the word — they are ɽ / ɽʰ; ँ came out as
     * an n, so it is read as ं (a nasal vowel); च्छ "cʰcʰ" is ccʰ; क्या "kːj" is kj.
     */
    const fix = (ipa) => ipa.normalize('NFD').replace(/_/g, '').replace(/\n/g, ' ')
        .replace(/r\.h/g, 'ɽʰ').replace(/r\./g, 'ɽ').replace(/r/g, 'ɾ')          // र is a tap, never a rolled r
        .replace(/ɪ(ˈ|ˌ)?(eː|ẽː)/g, 'ɪj$1$2')                                  // लिए, किए, पिएँगे: li-ye, not li-e
        .replace(/x/g, 'kʰ').replace(/ɣ/g, 'ɡ').replace(/q/g, 'k')               // ख़ुद, ग़रीब, क़: as most people say them
        /*
         * Nasal vowels (2026-11-18, checked by ear with Whisper: Kokoro's ã is heard as nothing — चाँदी "चिदी", कुआँ
         * "कोई", नहीं "नहु"): inside a word the vowel and then the nasal of the next sound (चाँदी → caːndi); a long
         * ī / ā / ū at a word's end with an n (नहीं → nəhiːn, कुआँ → kʊaːŋ). में, हैं, हूँ-like short ones work as they are.
         */
        .replace(/([aeiouɛɔəʊɪʌ])\u0303(ː?)(?=ˈ|ˌ)?(?=[ˈˌ]?([pbmkɡʈɖtdcɟsʃʋɾɽlhjnzf]))/g, (m, v, long, next) => {
            const nasal = /[pbm]/.test(next) ? 'm' : /[kɡ]/.test(next) ? 'ŋ' : /[ʈɖ]/.test(next) ? 'ɳ' : 'n';
            return `${v}${long || (/[aiu]/.test(v) ? 'ː' : '')}${nasal}`;
        })
        .replace(/([aiu])\u0303ː?(?=$|[\s,.;:!?…—])/g, (m, v) => `${v}ː${v === 'a' ? 'ŋ' : 'n'}`)
        .replace(/([a-zɟʈɖɡ])ʰ\1ʰ/g, '$1$1ʰ').replace(/kːj/g, 'kj').replace(/ʲ/g, '').trim();
    /*
     * Words said as they are spoken (2026-11-18, "pronunciation is not correct"). espeak keeps the "a" at the end of a
     * stem before an ending — मिलकर "mil-a-kar", बहता "bah-a-ta" — where Hindi drops it: a halant there (मिल्कर,
     * बह्ता). Only for a stem of two or more letters ending in a bare consonant. WORDS respells any word by hand.
     */
    const WORDS = { 'लिए': 'लिये', 'किए': 'किये', 'दिए': 'दिये', 'गए': 'गये', 'हुए': 'हुये' };
    const ENDINGS = ['ता', 'ती', 'ते', 'तीं', 'कर', 'ना', 'नी', 'ने'];
    const dropSchwa = (word) => {
        if (WORDS[word]) return WORDS[word];
        for (const end of ENDINGS) {
            if (!word.endsWith(end)) continue;
            const stem = word.slice(0, -end.length);
            // A stem of two or more letters ending in a bare consonant (a nukta allowed): मिल, बह, समझ, चमक.
            if (stem.length >= 2 && /[\u0915-\u0939\u0958-\u095F]\u093C?$/.test(stem)) return `${stem}\u094D${end}`;
        }
        return word;
    };
    const respell = (text) => String(text).replace(/[\u0900-\u097F]+/g, dropSchwa);
    /*
     * A breath at each phrase (2026-11-18, the user: "आज से — हर घड़े पानी का — एक चाँदी का सिक्का"): a comma after
     * से, में, को, ने, पर, तक, का, के, की once two or more words have been said since the last pause and two or more
     * are still to come — Kokoro pauses briefly at a comma and keeps the sentence's tune.
     */
    const PHRASE_END = new Set(['से', 'में', 'को', 'ने', 'पर', 'तक', 'का', 'के', 'की']);
    const phrased = (sentence) => {
        const words = String(sentence).split(/\s+/).filter(Boolean);
        let since = 0;
        return words.map((w, i) => {
            since += 1;
            const bare = w.replace(/[^\u0900-\u097F]/g, '');
            const left = words.slice(i + 1).filter((x) => /[\u0900-\u097F]/.test(x)).length;
            // का / के / की join two nouns ("कल्पुर के दोनों कुएँ"): a pause there only when a new phrase clearly starts.
            const next = (words[i + 1] || '').replace(/[^\u0900-\u097F]/g, '');
            const link = ['का', 'के', 'की'].includes(bare);
            const opens = /^(एक|हर|सब|कोई|यह|वह|ये|वे|इस|उस|इन|उन|अपना|अपनी|अपने|मेरा|मेरी|मेरे|तुम्हारा|हमारा|हमारे)$/.test(next);
            // Never before a verb or a helping word ("डॉक्टर को दिखाने", "महीनों से कर रहा", "मिनट में शुरू होने"), nor
            // after an adverb's से ("छोटे से", "तेज़ी से", "पास से", "ख़ुद से").
            const verbNext = /(ने|ना|ता|ती|ते)$/.test(next) || /^(कर|हो|शुरू|निकल|जा|आ|रह|बैठ|दे|ले|वादा|मिल|बात|मदद)$/.test(next);
            const prev = (words[i - 1] || '').replace(/[^\u0900-\u097F]/g, '');
            const adverb = bare === 'से' && /^(छोटे|बड़े|तेज़ी|पास|ख़ुद|दूर|प्यार|ध्यान|ज़ोर|धीरे|जल्दी|अच्छे)$/.test(prev);
            if (PHRASE_END.has(bare) && w === bare && since >= 2 && left >= 3 && (!link || opens) && !verbNext && !adverb) { since = 0; return `${w},`; }
            if (/[,;:—–…]$/.test(w)) since = 0;
            return w;
        }).join(' ');
    };
    const sounds = (text) => respell(phrased(String(text))).replace(/ँ/g, 'ं').replace(/॥|।/g, '.').split(PUNCT).map((part) => {
        if (!part.trim()) return ' ';
        if (PUNCT.test(part) && !/[\u0900-\u097F]/.test(part)) return part.replace(/[“”"'‘’()]/g, '').trim() + ' ';
        return fix(espeak.synthesize_ipa(part).ipa);
    }).join('').replace(/\s+/g, ' ').replace(/\s+([,.;:!?…])/g, '$1').trim();
    // How the line ends for its mood: "!", "?" or a trailing "…" in place of the full stop.
    // Only where the words allow it: a question ends "?" only if it is one, a sad line trails off only from a full stop.
    const ending = (ph, mood, text) => {
        const t = String(text).trim();
        const end = { happy: '!', excited: '!', surprise: '!', sad: '…', question: '?' }[mood];
        if (!end || (end === '?' && !/[?？]$/.test(t)) || (end !== '?' && /[?？]$/.test(t))) return ph;
        return ph.replace(/[.!?…]*$/, '') + end;
    };
    const RATE = 24000;
    const silence = (sec) => new Float32Array(Math.round(sec * RATE));
    const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'fp32', device: 'cpu' });
    const storyDir = path.join(ROOT, 'public', 'linguistic', 'story-hi');
    const filmDir = path.join(ROOT, 'public', 'linguistic', 'film', 'stranger', 'hi');
    fs.mkdirSync(storyDir, { recursive: true });
    const done = [];
    for (const j of jobs) {
        // Sentence by sentence, a pause between them (2026-11-18, "it must take pauses"), a breath before and after.
        const parts = sentencesOf(j.text);
        const pieces = [silence(0.12)];
        let ph = '';
        let audio = null;
        for (let k = 0; k < parts.length; k += 1) {
            const p = k === parts.length - 1 ? ending(sounds(parts[k]), j.mood, parts[k]) : sounds(parts[k]);
            ph += `${p} `;
            const { input_ids } = tts.tokenizer(p, { truncation: true });
            audio = await tts.generate_from_ids(input_ids, { voice: j.voice, speed: j.speed });
            pieces.push(audio.audio);
            pieces.push(silence(k === parts.length - 1 ? 0.3 : 0.38));
        }
        const all = new Float32Array(pieces.reduce((n, x) => n + x.length, 0));
        pieces.reduce((at, x) => { all.set(x, at); return at + x.length; }, 0);
        audio = new audio.constructor(all, RATE);
        // Never clipped: the loudest moment brought down to 0.92 when it would crackle.
        let peak = 0;
        for (const x of audio.audio) peak = Math.max(peak, Math.abs(x));
        if (peak > 0.92) for (let i = 0; i < audio.audio.length; i += 1) audio.audio[i] *= 0.92 / peak;
        const dir = j.film ? filmDir : storyDir;
        const name = j.film ? j.film : j.id;
        const wav = path.join(dir, `${name}.wav`);
        await audio.save(wav);
        execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '64000', wav, path.join(dir, `${name}.m4a`)]);
        fs.unlinkSync(wav);
        const seconds = Math.round((audio.audio.length / audio.sampling_rate) * 100) / 100;
        done.push({ ...j, file: j.film ? null : `${name}.m4a`, seconds });
        fs.writeFileSync(outFile, JSON.stringify(done, null, 1));
        console.log(`${name.padEnd(9)} ${j.voice.padEnd(9)} ${seconds}s  ${j.text.slice(0, 50)}  [${ph.slice(0, 40)}]`);
    }
}

if (mode === 'index') {
    const done = JSON.parse(fs.readFileSync(file, 'utf8'));
    const index = {};
    const filmDir = path.join(ROOT, 'public', 'linguistic', 'film', 'stranger');
    const manifest = JSON.parse(fs.readFileSync(path.join(filmDir, 'manifest.json'), 'utf8'));
    manifest.hi = {};
    for (const j of done) {
        if (j.film) { manifest.hi[j.film] = j.seconds; continue; }
        for (const k of j.keys) index[k] = j.file;
    }
    // The film's Hindi is Kokoro's now: no longer listed as Parler's.
    if (manifest.parler) delete manifest.parler.hi;
    manifest.kokoro = { ...(manifest.kokoro || {}), hi: Object.keys(manifest.hi) };
    fs.writeFileSync(path.join(filmDir, 'manifest.json'), JSON.stringify(manifest));
    fs.writeFileSync(path.join(ROOT, 'public', 'linguistic', 'story-hi', 'index.json'), JSON.stringify(index));
    console.log(`index: ${Object.keys(index).length} keys · film: ${Object.keys(manifest.hi).length} lines`);
}
