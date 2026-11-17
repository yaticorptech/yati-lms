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
// A clip with no style keeps the key it always had.
const keyOf = ({ text, lang, voice, style }) => crypto.createHash('sha256').update(`v1|${lang}|${voice}|${style ? `${style}|` : ''}${text}`).digest('hex');
const fileOf = (clip) => path.join(CACHE, `${keyOf(clip)}.wav`);
const has = (clip) => fs.existsSync(fileOf(clip));

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
        const r = await axios.post(`${URL_BASE()}/tts`, background ? { ...clip, priority: 1 } : clip, {
            responseType: 'arraybuffer',
            // 30 min (2026-11-12): a batch with a long story sentence can take over 10 on a CPU. The batch script
            // waits as long as it takes (TTS_TIMEOUT_MS=0), so a clip the service made is never thrown away.
            timeout: process.env.TTS_TIMEOUT_MS != null ? Number(process.env.TTS_TIMEOUT_MS) : 1800000,
            headers: TOKEN() ? { Authorization: `Bearer ${TOKEN()}` } : {}
        });
        const tmp = `${file}.${process.pid}.tmp`;
        await fs.promises.writeFile(tmp, Buffer.from(r.data));
        await fs.promises.rename(tmp, file);
        return file;
    })().finally(() => pending.delete(file));
    pending.set(file, job);
    return job;
};

module.exports = { URL_BASE, CACHE, LANGUAGES, clean, keyOf, fileOf, has, make };
