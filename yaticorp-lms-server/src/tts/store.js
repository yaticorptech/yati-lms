/**
 * The Indic Parler-TTS clips on disk: one WAV per (language, voice, text),
 * named by a hash of them. Used by the /api/tts route (index.js) and by
 * scripts/makeIndicAudio.js, which makes every lesson's clips in advance, so
 * both find and keep them in the same place.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const URL_BASE = () => (process.env.INDIC_TTS_URL || '').replace(/\/+$/, '');
const TOKEN = () => process.env.INDIC_TTS_TOKEN || '';
const CACHE = process.env.INDIC_TTS_CACHE || path.join(__dirname, '..', '..', 'cache', 'tts');
const MAX_CHARS = 600;
const LANGUAGES = ['as', 'bn', 'brx', 'doi', 'en', 'gu', 'hi', 'kn', 'kok', 'mai', 'ml', 'mni', 'mr', 'ne', 'or', 'pa', 'sa', 'sat', 'sd', 'ta', 'te', 'ur'];

fs.mkdirSync(CACHE, { recursive: true });

/**
 * How it is said (2026-11-12): `voice` is 'f', 'm', or either with a style after a colon — 'm:mood-sad,pitch-low'.
 * Only known parts are kept, in one order, so the same style is always the same clip.
 */
const STYLE = { mood: ['story', 'happy', 'excited', 'sad', 'angry', 'fear', 'surprise', 'question', 'calm', 'kind'], pitch: ['low', 'high'], pace: ['slow', 'fast'] };
const styleOf = (s) => Object.keys(STYLE).map((k) => {
    const v = String(s || '').split(',').map((t) => t.trim().split('-')).find(([a]) => a === k)?.[1];
    return STYLE[k].includes(v) ? `${k}-${v}` : null;
}).filter(Boolean).join(',');
/** The clip asked for, cleaned as the route cleans it: { text, lang, voice, style? }, or { error }. */
const clean = (text, lang, spec) => {
    const [voice, st] = String(spec || '').split(':');
    const style = styleOf(st);
    const t = String(text || '').normalize('NFC').trim();
    const l = String(lang || '').toLowerCase().replace('_', '-').split('-')[0];
    if (!t) return { error: 'Nothing to read.', status: 400 };
    if ([...t].length > MAX_CHARS) return { error: `Up to ${MAX_CHARS} characters at a time.`, status: 413 };
    if (!LANGUAGES.includes(l)) return { error: `No voice for '${l}'.`, status: 422, code: 'TTS_LANG' };
    return { text: t, lang: l, voice: voice === 'm' ? 'm' : 'f', ...(style ? { style } : {}) };
};
/*
 * Clips are kept tidied (2026-11-19, tidy.js — the owner: "after a word it feels odd, like 'aah'"): each ends where
 * its text ends, with whatever the voice model added after it cut off. A tidied clip has a key of its own (v2); the
 * clips made before (v1) stay on disk untouched and are never served as they are — the first time one is asked for,
 * its tidied copy is made from it, in a few milliseconds and without the voice service. So nothing already recorded
 * is ever generated again, and a lesson's audio comes straight down from here.
 */
const { tidy } = require('./tidy');
const hashOf = (gen, { text, lang, voice, style }) => crypto.createHash('sha256').update(`${gen}|${lang}|${voice}|${style ? `${style}|` : ''}${text}`).digest('hex');
// A clip with no style keeps the key it always had.
const keyOf = (clip) => hashOf('v2', clip);
const fileOf = (clip) => path.join(CACHE, `${keyOf(clip)}.wav`);
/** The clip as it was first made (before clips were tidied), if it is still on disk. */
const legacyOf = (clip) => path.join(CACHE, `${hashOf('v1', clip)}.wav`);
const has = (clip) => fs.existsSync(fileOf(clip)) || fs.existsSync(legacyOf(clip));
/** Keep `audio` as this clip's file, tidied. Written whole, then moved into place. */
const keep = async (clip, audio) => {
    const file = fileOf(clip);
    let out = audio;
    try { out = tidy(audio, clip.text); } catch (e) { console.error('[tts] tidy failed, kept as made:', e.message); }
    const tmp = `${file}.${process.pid}.tmp`;
    await fs.promises.writeFile(tmp, out);
    await fs.promises.rename(tmp, file);
    return file;
};

/*
 * The letters recorded with care (scripts/recordLetters.js, 2026-11-19): what was recorded is listed in a file beside
 * the clips, and when it last changed is the letters' revision. The app is told it (linguistic/routes.js) and asks
 * for the letters afresh when it changes, so a letter recorded again reaches every device by itself.
 */
const lettersManifest = (lang) => path.join(CACHE, `letters.${String(lang || '').toLowerCase().split('-')[0]}.json`);
const letterRev = (lang) => { try { return Math.floor(fs.statSync(lettersManifest(lang)).mtimeMs / 1000); } catch { return 0; } };

const pending = new Map(); // the same clip asked twice at once is made once
/**
 * The clip's file, made by the voice service first when it is not on disk yet. `background` (2026-11-14): made ahead
 * by a script, so it waits behind any clip a student is waiting for.
 */
const make = async (clip, { background = false } = {}) => {
    const file = fileOf(clip);
    if (fs.existsSync(file)) return file;
    if (pending.has(file)) return pending.get(file);
    const job = (async () => {
        // Recorded before clips were tidied: its tidied copy, made from it now. No voice service, no wait.
        const legacy = legacyOf(clip);
        if (fs.existsSync(legacy)) return keep(clip, await fs.promises.readFile(legacy));
        const r = await axios.post(`${URL_BASE()}/tts`, background ? { ...clip, priority: 1 } : clip, {
            responseType: 'arraybuffer',
            // 30 min (2026-11-12): a batch with a long story sentence can take over 10 on a CPU. The batch script
            // waits as long as it takes (TTS_TIMEOUT_MS=0), so a clip the service made is never thrown away.
            timeout: process.env.TTS_TIMEOUT_MS != null ? Number(process.env.TTS_TIMEOUT_MS) : 1800000,
            headers: TOKEN() ? { Authorization: `Bearer ${TOKEN()}` } : {}
        });
        return keep(clip, Buffer.from(r.data));
    })().finally(() => pending.delete(file));
    pending.set(file, job);
    return job;
};

module.exports = { URL_BASE, CACHE, LANGUAGES, clean, keyOf, fileOf, legacyOf, has, make, lettersManifest, letterRev };
