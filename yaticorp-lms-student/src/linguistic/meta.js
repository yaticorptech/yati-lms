/**
 * Linguistic Ability — what the pages share that is not a component: the
 * colours (one per module, as units on the path), the levels, sound, and
 * playback of recordings.
 */
import { useEffect } from 'react';
import { previousPage } from '../hooks/useGoBack';
import { BookA, PenLine, BookOpen, Mic, Languages } from 'lucide-react';
import { mediaUrl } from './api';
import client from '../utils/api';
import { kokoroBlob, kokoroSupported } from '../lib/kokoro';

/** Bright flat colours: a face, the darker edge a button stands on, and a light tint. */
export const COLORS = {
    green: { face: '#58CC02', edge: '#58A700', light: '#D7FFB8', ink: '#58A700' },
    blue: { face: '#1CB0F6', edge: '#1899D6', light: '#DDF4FF', ink: '#1899D6' },
    red: { face: '#FF4B4B', edge: '#EA2B2B', light: '#FFDFE0', ink: '#EA2B2B' },
    gold: { face: '#FFC800', edge: '#E5A000', light: '#FFF5D3', ink: '#CD7900' },
    purple: { face: '#CE82FF', edge: '#A568CC', light: '#F4E5FF', ink: '#A568CC' },
    orange: { face: '#FF9600', edge: '#E08600', light: '#FFEAD2', ink: '#E08600' },
    grey: { face: '#E5E5E5', edge: '#B7B7B7', light: '#F7F7F7', ink: '#AFAFAF' }
};

export const MODULES = {
    vocabulary: { label: 'Vocabulary Builder', short: 'Vocabulary', icon: BookA, color: 'green', mascot: 'wave-hi', blurb: 'Words with Kannada meanings, matching pairs and spelling.', blurbIn: (l) => `Words with ${l} meanings, matching pairs and spelling.` },
    grammar: { label: 'Grammar Practice', short: 'Grammar', icon: PenLine, color: 'purple', mascot: 'thinking', blurb: 'Tenses, articles, pronouns, prepositions and sentences.' },
    reading: { label: 'Reading and Writing', short: 'Reading', icon: BookOpen, color: 'blue', mascot: 'presenting', blurb: 'Stories and articles to read, then sentences, emails and letters to write.' },
    speaking: { label: 'Speaking and Listening', short: 'Speaking', icon: Mic, color: 'orange', mascot: 'point-right', blurb: 'Everyday conversations to listen to, then record yourself.' },
    translation: { label: 'Translation Practice', short: 'Translation', icon: Languages, color: 'red', mascot: 'thumbs-up', blurb: 'Kannada → English and English → Kannada.', blurbIn: (l) => `${l} → English and English → ${l}.` }
};
export const MODULE_ORDER = ['vocabulary', 'grammar', 'reading', 'speaking', 'translation'];
// Each level is a section of the path, named the Duolingo way with its CEFR level (asked 2026-10-24).
export const LEVELS = [
    { id: 'beginner', label: 'Beginner', section: 'Rookie', cefr: 'A1', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
    // Hidden (2026-10-29, the server's levels.js): its lessons and old certificates are still named by it.
    { id: 'intermediate', label: 'Intermediate', section: 'Explorer', cefr: 'A2–B1', chip: 'bg-amber-50 text-amber-700 ring-amber-200', hidden: true },
    { id: 'advanced', label: 'Advanced', section: 'Achiever', cefr: 'B2', chip: 'bg-rose-50 text-rose-700 ring-rose-200' }
];
export const levelOf = (id) => LEVELS.find((l) => l.id === id) || LEVELS[0];
/** The sections a course shows: Beginner and Advanced (Intermediate hidden, 2026-10-29). */
export const SHOWN_LEVELS = LEVELS.filter((l) => !l.hidden);
/** Whether a section of the path ends with an assessment that opens the next (2026-10-29). */
export const hasAssessment = (section) => !!section?.units?.some((u) => u.lessons?.some((l) => l.review === 'assessment'));
/* ── The student's own language ───────────────────────────────────────── */

/**
 * The languages a student can learn English from (asked 2026-10-23): the
 * letter shown for each, what the answer box says, and the browser's code for
 * it. Kannada is the original and the default.
 */
export const LANGS = {
    kn: { name: 'Kannada', native: 'ಕನ್ನಡ', mark: 'ಕ', placeholder: 'ಕನ್ನಡದಲ್ಲಿ ಬರೆಯಿರಿ…' },
    hi: { name: 'Hindi', native: 'हिन्दी', mark: 'हि', placeholder: 'हिन्दी में लिखिए…' },
    ta: { name: 'Tamil', native: 'தமிழ்', mark: 'த', placeholder: 'தமிழில் எழுதுங்கள்…' },
    te: { name: 'Telugu', native: 'తెలుగు', mark: 'తె', placeholder: 'తెలుగులో రాయండి…' },
    ml: { name: 'Malayalam', native: 'മലയാളം', mark: 'മ', placeholder: 'മലയാളത്തിൽ എഴുതുക…' },
    mr: { name: 'Marathi', native: 'मराठी', mark: 'म', placeholder: 'मराठीत लिहा…' },
    bn: { name: 'Bengali', native: 'বাংলা', mark: 'বা', placeholder: 'বাংলায় লিখুন…' },
    gu: { name: 'Gujarati', native: 'ગુજરાતી', mark: 'ગુ', placeholder: 'ગુજરાતીમાં લખો…' },
    pa: { name: 'Punjabi', native: 'ਪੰਜਾਬੀ', mark: 'ਪੰ', placeholder: 'ਪੰਜਾਬੀ ਵਿੱਚ ਲਿਖੋ…' },
    or: { name: 'Odia', native: 'ଓଡ଼ିଆ', mark: 'ଓ', placeholder: 'ଓଡ଼ିଆରେ ଲେଖନ୍ତୁ…' },
    ur: { name: 'Urdu', native: 'اردو', mark: 'ار', placeholder: 'اردو میں لکھیں…', rtl: true },
    en: { name: 'English', native: 'English', mark: 'En', placeholder: 'Type in English…' },
    es: { name: 'Spanish', native: 'Español', mark: 'Es', placeholder: 'Escribe en español…' },
    fr: { name: 'French', native: 'Français', mark: 'Fr', placeholder: 'Écrivez en français…' },
    de: { name: 'German', native: 'Deutsch', mark: 'De', placeholder: 'Schreib auf Deutsch…' },
    pt: { name: 'Portuguese', native: 'Português', mark: 'Pt', placeholder: 'Escreva em português…' },
    ru: { name: 'Russian', native: 'Русский', mark: 'Ру', placeholder: 'Пишите по-русски…' },
    ar: { name: 'Arabic', native: 'العربية', mark: 'ع', placeholder: 'اكتب بالعربية…', rtl: true },
    zh: { name: 'Chinese', native: '中文', mark: '中', placeholder: '用中文写…' },
    ja: { name: 'Japanese', native: '日本語', mark: '日', placeholder: '日本語で書いてください…' },
    ko: { name: 'Korean', native: '한국어', mark: '한', placeholder: '한국어로 쓰세요…' }
};
export const langOf = (code) => LANGS[code] || LANGS.kn;
/**
 * 'kn-en' is always "the student's language → the language learnt" (and
 * 'en-kn' the other way), whichever they are: English, or another course's.
 */
export const directionLabel = (dir, code = 'kn', target = 'en') => (dir === 'kn-en' ? `${langOf(code).name} → ${langOf(target).name}` : `${langOf(target).name} → ${langOf(code).name}`);
export const markOf = (code) => (code === 'en' ? 'EN' : langOf(code).mark);
export const shortDirection = (dir, code = 'kn', target = 'en') => (dir === 'kn-en' ? `${langOf(code).mark} → ${markOf(target)}` : `${markOf(target)} → ${langOf(code).mark}`);
/** A module's one-line description, naming the student's language (and the course's, for a course other than English). */
export const blurbOf = (module, code = 'kn', target = 'en') => {
    if (target !== 'en') {
        const [Y, X] = [langOf(code).name, langOf(target).name];
        return module === 'vocabulary' ? `${X} words with ${Y} meanings, and matching pairs.` : `${Y} → ${X} and ${X} → ${Y}.`;
    }
    return code !== 'kn' && MODULES[module]?.blurbIn ? MODULES[module].blurbIn(langOf(code).name) : MODULES[module]?.blurb;
};
/** The language a piece of text is written in, by its letters (for the right font); undefined for Latin letters. */
const SCRIPTS = [
    ['kn', /[ಀ-೿]/], ['hi', /[ऀ-ॿ]/], ['ta', /[஀-௿]/], ['te', /[ఀ-౿]/], ['ml', /[ഀ-ൿ]/],
    ['bn', /[ঀ-৿]/], ['gu', /[઀-૿]/], ['pa', /[਀-੿]/], ['or', /[଀-୿]/], ['ar', /[؀-ۿ]/],
    ['ru', /[Ѐ-ӿ]/], ['ja', /[぀-ヿ]/], ['zh', /[一-鿿]/], ['ko', /[가-힣㄰-㆏]/]
];
export const scriptOf = (text) => SCRIPTS.find(([, re]) => re.test(String(text || '')))?.[0];
/** The `lang` for text that may be in the student's language: theirs when its letters are theirs (Devanagari may be Marathi, Han Japanese). */
export const langFor = (text, code) => {
    const s = scriptOf(text);
    if (!s) return undefined;
    return code && (s === code || (s === 'hi' && code === 'mr') || (s === 'ar' && code === 'ur') || (s === 'zh' && code === 'ja')) ? code : s;
};
export const isRtl = (code) => !!LANGS[code]?.rtl;
/** The voice to read a language with ('ja' → 'ja-JP'): the same as each course's (the server's courses.js). */
const LOCALES = { en: 'en-IN', kn: 'kn-IN', hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN', ml: 'ml-IN', mr: 'mr-IN', bn: 'bn-IN', gu: 'gu-IN', pa: 'pa-IN', or: 'or-IN', ur: 'ur-PK', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', pt: 'pt-BR', ru: 'ru-RU', ar: 'ar-SA', zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR' };
export const localeOf = (code) => LOCALES[code] || 'en-IN';
const LATIN = ['en', 'es', 'fr', 'de', 'pt'];
/** The voice for a word: by its letters (Kannada, Japanese…), else the language it is in when that is written in Latin letters, else English. */
export const tileVoice = (word, code) => localeOf(langFor(word, code) || (LATIN.includes(code) ? code : 'en'));
/** The device's language, when it is one the section offers (a phone set to Japanese suggests Japanese). */
export const deviceLanguage = (codes) => {
    try {
        const prefs = (typeof navigator !== 'undefined' && (navigator.languages?.length ? navigator.languages : [navigator.language])) || [];
        return prefs.map((l) => String(l || '').slice(0, 2).toLowerCase()).find((c) => codes.includes(c)) || null;
    } catch { return null; }
};
const ASKED_KEY = 'lingo:language-asked';
export const languageAsked = () => { try { return localStorage.getItem(ASKED_KEY) === '1'; } catch { return false; } };
export const markLanguageAsked = () => { try { localStorage.setItem(ASKED_KEY, '1'); } catch { /* private mode: asked again next visit */ } };

/* ── Sound ────────────────────────────────────────────────────────────── */

const SOUND_KEY = 'lingo:sound';
export const soundOn = () => { try { return localStorage.getItem(SOUND_KEY) !== 'off'; } catch { return true; } };
export const setSoundOn = (on) => { try { localStorage.setItem(SOUND_KEY, on ? 'on' : 'off'); } catch { /* private mode: the choice lasts this visit */ } };

let audio = null;
/**
 * A short chime made by the browser itself (Web Audio): two rising notes for a
 * right answer, one low note for a wrong one, a little run for a finished
 * lesson. No sound files and nothing fetched.
 */
export const chime = (kind) => {
    if (!soundOn() || typeof window === 'undefined') return;
    try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        audio = audio || new Ctx();
        const notes = kind === 'right' ? [[784, 0], [1047, 0.09]] : kind === 'wrong' ? [[220, 0], [196, 0.12]] : [[523, 0], [659, 0.1], [784, 0.2], [1047, 0.3]];
        for (const [freq, at] of notes) {
            const o = audio.createOscillator(); const g = audio.createGain();
            o.type = kind === 'wrong' ? 'triangle' : 'sine';
            o.frequency.value = freq;
            const t = audio.currentTime + at;
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, t + (kind === 'wrong' ? 0.28 : 0.22));
            o.connect(g).connect(audio.destination);
            o.start(t); o.stop(t + 0.3);
        }
    } catch { /* no audio on this device */ }
};

/* ── Recordings ───────────────────────────────────────────────────────── */

/*
 * The device's voices. The browser lists them a moment after the page opens
 * (Chrome only after 'voiceschanged'), so the list is read again then.
 */
let voices = [];
const readVoices = () => { try { voices = window.speechSynthesis.getVoices() || []; } catch { voices = []; } };
if (typeof window !== 'undefined' && window.speechSynthesis) {
    readVoices();
    window.speechSynthesis.addEventListener?.('voiceschanged', readVoices);
}
const norm = (l) => String(l || '').toLowerCase().replace('_', '-');
/*
 * A woman's or a man's voice (2026-11-07, the user: "a woman's picture, a woman's voice; a man's picture, a man's
 * voice"). Browsers do not say which a voice is; its name does (Google UK English Female, Microsoft Heera, Rishi…).
 */
const FEMALE = /female|woman|girl|zira|hazel|susan|samantha|victoria|karen|moira|tessa|fiona|serena|veena|heera|kalpana|lekha|swara|neerja|aditi|raveena|kajal|sangeeta|shreya|pallavi|vani|monica|paulina|marisol|elvira|helena|laura|amelie|amélie|audrey|aurelie|denise|julie|hedda|katja|anna|alice|elsa|ellen|joana|luciana|francisca|milena|katya|irina|svetlana|kyoko|nanami|haruka|ayumi|ting-?ting|mei-?jia|sin-?ji|xiaoxiao|huihui|yaoyao|yuna|sunhi|heami|salma|zariyah|hoda|laila|dalia/i;
const MALE = /\bmale\b|\bman\b|david|mark|george|james|daniel|\balex\b|fred|\btom\b|oliver|arthur|aaron|rishi|ravi|hemant|prabhat|madhur|aarav|kumar|mohan|gagan|valluvar|jorge|diego|juan|pablo|thomas|yannick|henri|paul|markus|conrad|stefan|felipe|antonio|duarte|yuri|maxim|pavel|dmitri|otoya|ichiro|keita|kangkang|yunjian|yunxi|injoon|hamed|naayf|maged|tarik/i;
/** 'f' or 'm' by a voice's name; null when its name does not tell. */
export const genderOf = (v) => (FEMALE.test(v?.name || '') ? 'f' : MALE.test(v?.name || '') ? 'm' : null);
/** The device's voice for a language ('kn-IN': a Kannada voice), or null; a woman's or a man's first, when asked (`gender`). */
const voiceFor = (lang, gender = null) => {
    if (!voices.length) readVoices();
    const want = norm(lang), base = want.split('-')[0];
    const same = voices.filter((v) => norm(v.lang) === want), near = voices.filter((v) => norm(v.lang).split('-')[0] === base);
    return (gender && (same.find((v) => genderOf(v) === gender) || near.find((v) => genderOf(v) === gender))) || same[0] || near[0] || null;
};
/*
 * Kannada on a device with no Kannada voice (2026-10-31, "the Kannada voice is not audible"; most computers and
 * many phones have none): Kannada, Telugu and Devanagari sit in Unicode in the same order, so a Kannada word
 * written in Telugu or in Devanagari letters says the same, and the device's Telugu voice reads it — or else its
 * Hindi or Marathi one. All on the device: nothing is sent anywhere.
 */
const KN_FROM = 0x0c80, KN_TO = 0x0cff;
const STAND_INS = { kn: [{ lang: 'te-IN', base: 0x0c00 }, { lang: 'hi-IN', base: 0x0900, hindi: true }, { lang: 'mr-IN', base: 0x0900 }] };
// Devanagari reads the short e and o (ಎ ಒ, ೆ ೊ) best as its own e and o.
const DEVANAGARI_SHORT = { 'ऎ': 'ए', 'ऒ': 'ओ', 'ॆ': 'े', 'ॊ': 'ो' };
// A Hindi voice has no ḷa, ṟa or ḻa (Marathi's does): the nearest sound it says (2026-10-31, "the correct pronunciation").
const HINDI_NEAREST = { 'ळ': 'ल', 'ऱ': 'र', 'ऴ': 'ल', 'ऩ': 'न' };
/** Kannada text in another script of the family (`base`: that script's first code point); other letters kept. */
export const kannadaIn = (text, base, hindi = false) => [...String(text || '')].map((c) => {
    const n = c.codePointAt(0);
    if (n < KN_FROM || n > KN_TO) return c;
    const out = String.fromCodePoint(n - KN_FROM + base);
    if (base !== 0x0900) return out;
    const d = DEVANAGARI_SHORT[out] || out;
    return hindi ? HINDI_NEAREST[d] || d : d;
}).join('');
/** The voice to read `lang` with: its own, or a stand-in reading it in that one's letters; null when there is neither. */
const readerFor = (lang, gender = null) => {
    const own = voiceFor(lang, gender);
    if (own) return { voice: own, lang, map: (t) => t };
    for (const s of STAND_INS[norm(lang).split('-')[0]] || []) {
        const v = voiceFor(s.lang, gender);
        if (v) return { voice: v, lang: s.lang, map: (t) => kannadaIn(t, s.base, !!s.hindi) };
    }
    return null;
};
/**
 * Whether the browser can read text in `lang` (2026-10-26: Kannada was silent
 * on a computer with no Kannada voice, with nothing said). While the voices
 * are not listed yet, it is given the benefit of the doubt.
 */
export const canSpeakIn = (lang) => usesServerVoice(lang) || (typeof window !== 'undefined' && !!window.speechSynthesis && (!voices.length || !!readerFor(lang)));

/*
 * Every language AI4Bharat's Indic Parler-TTS speaks — English and the Indian languages — is read by it, on the
 * server (/api/tts), and only by it (2026-11-05, user: "don't use device audio at all, use this only"). Each clip
 * is kept for the visit, and on the server for everyone. The device's voice is left only for the languages the
 * model has no voice for (Spanish, Japanese, …), which would otherwise be silent.
 */
const SERVER_LANGS = new Set(['as', 'bn', 'en', 'gu', 'hi', 'kn', 'ml', 'mr', 'ne', 'or', 'pa', 'sa', 'ta', 'te', 'ur']);
const clips = new Map(); // key → Promise of the clip's object URL (made, or being made)
let playing = null; let asked = 0;
// On (2026-11-06, user: "use the tts inside this project"). Set false to fall back to the device voice.
const SERVER_VOICE_ON = true;
const usesServerVoice = (lang) => SERVER_VOICE_ON && SERVER_LANGS.has(norm(lang).split('-')[0]);
const base = (lang) => norm(lang).split('-')[0];
/*
 * English is spoken by Kokoro-82M in the browser itself (2026-11-07): the model is downloaded once, kept on the
 * device, and makes each clip locally, with no call to the server. If it cannot load, the server voice reads it.
 */
const KOKORO_ON = true;
const usesKokoro = (lang) => KOKORO_ON && base(lang) === 'en' && kokoroSupported();
const clipKey = (text, lang) => `${usesKokoro(lang) ? 'kokoro:' : ''}${base(lang)}|${String(text).trim()}`;
const fromServer = (text, lang) => client.get('/tts', { params: { text: String(text).trim(), lang: base(lang), v: 2 }, responseType: 'blob', timeout: 600000 }).then((r) => r.data);
const makeClip = (text, lang) => (usesKokoro(lang) ? kokoroBlob(text).catch((e) => { console.warn("[kokoro] falling back to server voice:", e); return fromServer(text, lang); }) : fromServer(text, lang));
/*
 * Clips are kept on the device too (2026-11-06, the audio pack): in the browser's Cache Storage, so a unit's
 * audio downloaded once plays at once on every later visit, with no wait on the voice service.
 */
const VOICE_CACHE = 'lingo-voice-v2'; // v2 (2026-11-11): v1 held clips with made-up speech after short words
const cacheReq = (key) => new Request(`/__lingo-voice/${encodeURIComponent(key)}`);
// Device storage can hang (seen in Incognito, 2026-11-06): every call gives up after 2 s and the clip comes from the server.
const within = (p, ms = 2000) => Promise.race([Promise.resolve(p).catch(() => null), new Promise((r) => setTimeout(() => r(null), ms))]);
let cacheP = null;
const openCache = () => {
    if (typeof caches === 'undefined') return Promise.resolve(null);
    if (!cacheP) cacheP = within(caches.open(VOICE_CACHE)).then((c) => { if (!c) cacheP = null; return c; });
    return cacheP;
};
const fromDevice = async (key) => {
    const c = await openCache();
    const hit = c ? await within(c.match(cacheReq(key))) : null;
    return hit ? within(hit.blob(), 5000) : null;
};
const toDevice = async (key, blob) => {
    const c = await openCache();
    if (c) await within(c.put(cacheReq(key), new Response(blob, { headers: { 'Content-Type': blob.type || 'audio/wav' } })), 5000);
};
const serverClip = (text, lang) => {
    const key = clipKey(text, lang);
    if (!clips.has(key)) {
        const job = fromDevice(key).then((kept) => kept || makeClip(text, lang)
            .then((blob) => { toDevice(key, blob); return blob; }))
            .then((blob) => URL.createObjectURL(blob));
        job.catch(() => clips.delete(key)); // a failed clip is asked for again next time
        clips.set(key, job);
    }
    return clips.get(key);
};
/** Whether lessons are read by the AI voice (and so need their audio downloaded first). */
export const aiVoiceOn = () => SERVER_VOICE_ON;
/** A clip the server has already made, or null (204) without waiting for the voice model. */
const keptOnServer = (text, lang) => client.get('/tts', { params: { text: String(text).trim(), lang: base(lang), v: 2, cached: 1 }, responseType: 'blob', timeout: 60000 })
    .then((r) => (r.status === 204 || !r.data?.size ? null : r.data));
/**
 * Download clips to the device: `items` [[text, lang], …]; those already on the device are skipped.
 * First every clip the server has already made is fetched (fast, eight at a time); then every clip still
 * missing is made — by the voice service, eight at once so it makes them in one batch, and English by Kokoro
 * on the device — and kept (2026-11-11, user: "before a lesson opens make sure the voices are ready").
 * on: { onProgress(done, total), signal: { stopped } }. Resolves to { total, failed }.
 */
export const downloadClips = async (items, on = {}) => {
    const seen = new Set(); const todo = [];
    for (const [text, lang = 'en-IN'] of items || []) {
        if (!text || !String(text).trim() || !usesServerVoice(lang)) continue;
        const key = clipKey(text, lang);
        if (!seen.has(key)) { seen.add(key); todo.push([text, lang, key]); }
    }
    let done = 0, failed = 0; const missing = [];
    on.onProgress?.(0, todo.length);
    const tick = () => { done++; on.onProgress?.(done, todo.length); };
    const run = async (list, n, fn) => {
        let next = 0;
        const worker = async () => {
            while (next < list.length && !on.signal?.stopped) {
                const item = list[next++];
                try { await fn(...item); } catch (e) { failed++; tick(); console.error("[voice] clip failed:", item[1], JSON.stringify(item[0]), e); }
            }
        };
        await Promise.all(Array.from({ length: n }, worker));
    };
    // 1. Already made: on the device, or on the server.
    await run(todo, 8, async (text, lang, key) => {
        if (clips.has(key)) { await clips.get(key); return tick(); }
        if (await fromDevice(key)) return tick();
        const blob = usesKokoro(lang) ? null : await keptOnServer(text, lang);
        if (!blob) { missing.push([text, lang, key]); return; }
        await toDevice(key, blob);
        if (!clips.has(key)) clips.set(key, Promise.resolve(URL.createObjectURL(blob)));
        tick();
    });
    // 2. Not made yet: made now, and kept on the server and the device.
    await run(missing, 8, async (text, lang) => { await serverClip(text, lang); tick(); });
    return { total: todo.length, failed };
};

/*
 * Made ahead (2026-11-05, user: "when the page is open convert all text into audio, don't wait for the click"):
 * every text a page can read is queued as the page opens, one at a time in page order, so a tap plays at once.
 * A tap on one not made yet asks for it straight away, ahead of the queue. Leaving the page drops what it queued
 * and has not started.
 */
const queue = [];
let fetching = false;
const pump = () => {
    if (fetching) return;
    const job = queue.shift();
    if (!job) return;
    fetching = true;
    serverClip(job.text, job.lang).catch(() => {}).finally(() => { fetching = false; pump(); });
};
/** Queue clips to be made: `items` is [[text, lang], …]. Returns a function that drops those not started. */
export const prefetch = (items) => {
    const mine = [];
    for (const [text, lang = 'en-IN'] of items || []) {
        if (!text || !String(text).trim() || !usesServerVoice(lang)) continue;
        const key = clipKey(text, lang);
        if (clips.has(key) || queue.some((q) => q.key === key)) continue;
        const job = { key, text, lang };
        queue.push(job); mine.push(job);
    }
    pump();
    return () => { for (const j of mine) { const i = queue.indexOf(j); if (i >= 0) queue.splice(i, 1); } };
};
// What a lesson screen can read aloud: speechText.js (pure, so the server's audio script uses it too).
export { stepSpeech, readingSpeech, comicWords } from './speechText';
import { sentencesOf, courseSpeech } from './speechText';
/** The course being learnt ('kn', 'en', …): a course in an Indian language reads only its own language. */
let voiceCourse = 'en';
export const setVoiceCourse = (target) => { voiceCourse = target || 'en'; };
/** In a component: make its clips ahead while it is open. `items` as prefetch; re-queued when `deps` change. */
export const usePrefetch = (items, deps) => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => prefetch(items), deps);
};
const stopAll = () => {
    try { playing?.pause(); } catch { /* already stopped */ }
    playing = null;
    try { window.speechSynthesis?.cancel(); } catch { /* no voices */ }
};

/*
 * The mascot speaking (2026-11-07, the user: "the mascot's lips moving when the voice is heard, like Duolingo — for a
 * sentence, its words"): what the app's own voice is saying now — on from its start, a count of the words said so far
 * (the browser tells each word as it is reached), off at its end. A recording playing counts too. A woman or a man
 * speaking (`gender`: the conversation's people) is not the mascot.
 */
let talk = { on: false, word: 0, id: 0 };
let talkIds = 0;
const talkers = new Set();
/** Called with { on, word } whenever the mascot starts or stops speaking or reaches a word; returns how to stop listening. */
export const onTalk = (fn) => { talkers.add(fn); return () => { talkers.delete(fn); }; };
export const talkNow = () => talk;
const tell = (next) => { talk = { ...talk, ...next }; talkers.forEach((f) => f(talk)); };
/** A new voice: the mascot's (its start, words and end told), or a person's (the mascot quiet). */
const voiceOf = (gender, text) => {
    const id = ++talkIds;
    if (gender) { if (talk.on) tell({ on: false, id }); return null; }
    const off = () => { if (talk.id === id && talk.on) tell({ on: false }); };
    // Should the browser never say it ended (a voice cut off), quiet again after about as long as the text takes.
    setTimeout(off, 1500 + [...String(text || '')].length * 120);
    return { start: () => tell({ on: true, word: 0, id }), word: () => { if (talk.id === id && talk.on) tell({ word: talk.word + 1 }); }, off };
};
/** A clip playing (a recording or an AI voice's): the mascot's mouth moves from its start to its end. */
const talkWith = (a, gender, text) => {
    const v = voiceOf(gender, text);
    if (v) { a.addEventListener('playing', v.start); for (const e of ['ended', 'pause', 'error']) a.addEventListener(e, v.off); }
};

/**
 * Play a recording; with none, Indic Parler-TTS reads the text (the languages
 * it speaks), or else the device's voice. `on` tells the caller when the clip
 * is being made, playing, done, or could not be made:
 * { onLoading(bool), onError(message) }. Returns the Audio element or null.
 */
export const play = (src, text, lang = 'en-IN', on = {}) => {
    // Slowly (2026-11-06, tap what you hear: the turtle) and a woman's or a man's voice (2026-11-07, the conversation's
    // two people) — kept in the merge with the AI voices (2026-11-11): a person speaking is the device's woman or man.
    const { rate = null, gender = null } = on;
    const me = ++asked;
    // English text is read by Kokoro even when an older recording exists (2026-11-07).
    if (src && !(text && usesKokoro(lang))) {
        stopAll();
        const a = new Audio(mediaUrl(src));
        playing = a;
        if (rate) a.playbackRate = rate;
        talkWith(a, gender, text || 'a recording');
        a.play().catch(() => {});
        return a;
    }
    if (text) {
        const r = courseSpeech(text, lang, voiceCourse);
        if (!r) return null; // English beside a Kannada word, say: not read
        [text, lang] = r;
    }
    // A woman or a man speaking (the conversation's people): the device's voice of theirs — the AI voice has one voice.
    if (text && usesServerVoice(lang) && !gender) {
        stopAll();
        on.onLoading?.(true);
        serverClip(text, lang).then((url) => {
            on.onLoading?.(false);
            if (me !== asked) return; // tapped something else meanwhile
            const a = new Audio(url);
            playing = a;
            if (rate) a.playbackRate = rate;
            talkWith(a, gender, text);
            a.play().catch(() => {});
        }).catch((e) => {
            on.onLoading?.(false);
            if (me !== asked) return;
            // The voice service is down or slow (2026-11-11): the device's voice reads it rather than nothing.
            if (typeof window !== 'undefined' && window.speechSynthesis && readerFor(lang)) { deviceSay(text, lang, null, { rate, gender }); return; }
            on.onError?.(e?.response?.status === 503 ? 'The voice service is not set up.' : 'The voice could not be made. Try again.');
        });
        return null;
    }
    deviceSay(text, lang, null, { rate, gender });
    return null;
};
/**
 * Read texts aloud one sentence after another (a story, a passage, a conversation), each sentence a clip: the
 * first plays as soon as it is made while the rest are made, so a long story starts at once (2026-11-05: the
 * stories were read by the device's voice). `texts` may be a list of [text, lang] (a conversation's lines) or of
 * texts in `lang`. on: { onLoading(bool), onLine(i) the text being read, onEnd() }. Returns stop().
 */
export const readAloud = (texts, lang = 'en-IN', on = {}) => {
    stopAll();
    const me = ++asked;
    let stopped = false;
    const items = texts.map((t) => (Array.isArray(t) ? t : [t, lang]));
    const parts = items.flatMap(([t, l], i) => sentencesOf(t).map((x) => { const r = courseSpeech(x, l, voiceCourse); return r && { text: r[0], lang: r[1], line: i }; }).filter(Boolean));
    const done = () => on.onEnd?.();
    const drop = prefetch(parts.map((x) => [x.text, x.lang]));
    (async () => {
        for (const part of parts) {
            if (stopped || me !== asked) return;
            on.onLine?.(part.line);
            if (usesServerVoice(part.lang)) {
                on.onLoading?.(true);
                let url = null;
                try { url = await serverClip(part.text, part.lang); } catch { /* this sentence could not be made: the next */ }
                on.onLoading?.(false);
                if (stopped || me !== asked) return;
                if (url) await new Promise((resolve) => { const a = new Audio(url); playing = a; a.onended = resolve; a.onerror = resolve; a.play().catch(resolve); });
                else await new Promise((resolve) => deviceSay(part.text, part.lang, resolve)); // service down: the device reads it
            } else await new Promise((resolve) => deviceSay(part.text, part.lang, resolve));
        }
        if (!stopped && me === asked) done();
    })();
    return () => { stopped = true; drop(); if (me === asked) stopAll(); on.onLoading?.(false); };
};
/** The device's own voice, only for languages Indic Parler-TTS has no voice for. */
const deviceSay = (text, lang, onEnd, { rate = null, gender = null } = {}) => {
    if (text && typeof window !== 'undefined' && window.speechSynthesis) {
        stopAll();
        // Its own voice, or for Kannada a Telugu, Hindi or Marathi one reading it in those letters (2026-10-31).
        const r = readerFor(lang, gender);
        const u = new SpeechSynthesisUtterance(r ? r.map(text) : text);
        u.lang = r ? r.lang : lang;
        try { if (r) u.voice = r.voice; } catch { /* not one of this browser's voices: its own pick */ }
        // A woman or a man speaking (2026-11-07): with no voice of theirs on the device, the one there higher or lower.
        if (gender && genderOf(r?.voice) !== gender) u.pitch = gender === 'f' ? (genderOf(r?.voice) === 'm' ? 1.5 : 1.2) : (genderOf(r?.voice) === 'f' ? 0.6 : 0.7);
        // A letter or a short word said slowly, to be heard clearly (2026-10-31).
        if ([...String(text)].length <= 3) u.rate = 0.75;
        // Slowly, when asked (2026-11-06: tap what you hear, its turtle button).
        if (rate) u.rate = rate;
        // The mascot's mouth moves with it, word by word (2026-11-07); then `onEnd` (a story read sentence by sentence).
        const v = voiceOf(gender, text);
        if (v) { u.onstart = v.start; u.onboundary = (e) => { if (!e?.name || e.name === 'word') v.word(); }; }
        const end = () => { v?.off(); onEnd?.(); };
        u.onend = end; u.onerror = end;
        window.speechSynthesis.speak(u);
    } else onEnd?.();
};
// The server's voice needs nothing on the device: any text can be read.
export const canSpeak = (src) => !!src || (typeof window !== 'undefined' && (SERVER_VOICE_ON || !!window.speechSynthesis));

/** Words of praise for a right answer, chosen by its place so they vary. */
export const PRAISE = ['Nicely done!', 'Great job!', 'Excellent!', 'You got it!', 'Amazing!', 'Correct!', 'Well done!', 'Brilliant!'];

/** Back to the page before (2026-10-29: "always where they were"); opened straight here, `fallback`. */
export const backOr = (navigate, fallback) => () => { const prev = previousPage(); return prev ? navigate(prev) : navigate(fallback, { replace: true }); };

/*
 * The last lesson the student was in, on this device (2026-11-05: "back from a quiz, or anywhere, went to Section 1,
 * Unit 1"): the learning path opens at its unit — or, that unit finished, the next — not at the first lesson left
 * anywhere in the course (one who can open every lesson may have left one in Unit 1).
 */
const lastKey = () => { try { return `lingo:last:${JSON.parse(localStorage.getItem('studentData') || '{}')._id || 'me'}`; } catch { return 'lingo:last:me'; } };
export const rememberLesson = (id) => { try { if (id) localStorage.setItem(lastKey(), String(id)); } catch { /* storage off */ } };
export const lastLesson = () => { try { return localStorage.getItem(lastKey()); } catch { return null; } };
/**
 * Out of a lesson: the page it was opened from (the roadmap, the notes…); from the path, or straight here, the path at its
 * unit (`?from=`) — at `nextId`, the lesson its result said is next (`&next=`, 2026-11-07: "Next up said one lesson, the
 * path opened another").
 */
export const backToPath = (navigate, lessonId, nextId = null) => () => {
    const prev = previousPage();
    if (prev && !/^\/linguistic\/?(\?|$)/.test(prev)) return navigate(prev);
    return navigate(`/linguistic?from=${encodeURIComponent(lessonId)}${nextId ? `&next=${encodeURIComponent(nextId)}` : ''}`);
};
