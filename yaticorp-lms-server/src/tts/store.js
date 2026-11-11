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

/** The clip asked for, cleaned as the route cleans it: { text, lang, voice }, or { error }. */
const clean = (text, lang, voice) => {
    const t = String(text || '').normalize('NFC').trim();
    const l = String(lang || '').toLowerCase().replace('_', '-').split('-')[0];
    if (!t) return { error: 'Nothing to read.', status: 400 };
    if ([...t].length > MAX_CHARS) return { error: `Up to ${MAX_CHARS} characters at a time.`, status: 413 };
    if (!LANGUAGES.includes(l)) return { error: `No voice for '${l}'.`, status: 422, code: 'TTS_LANG' };
    return { text: t, lang: l, voice: voice === 'm' ? 'm' : 'f' };
};
const keyOf = ({ text, lang, voice }) => crypto.createHash('sha256').update(`v1|${lang}|${voice}|${text}`).digest('hex');
const fileOf = (clip) => path.join(CACHE, `${keyOf(clip)}.wav`);
const has = (clip) => fs.existsSync(fileOf(clip));

const pending = new Map(); // the same clip asked twice at once is made once
/** The clip's file, made by the voice service first when it is not on disk yet. */
const make = async (clip) => {
    const file = fileOf(clip);
    if (fs.existsSync(file)) return file;
    if (pending.has(file)) return pending.get(file);
    const job = (async () => {
        const r = await axios.post(`${URL_BASE()}/tts`, clip, {
            responseType: 'arraybuffer',
            timeout: 600000,
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
