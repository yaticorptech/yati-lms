/**
 * Linguistic Ability — what the pages share that is not a component: the
 * colours (one per module, as units on the path), the levels, sound, and
 * playback of recordings.
 */
import { BookA, PenLine, BookOpen, Mic, Languages } from 'lucide-react';
import { mediaUrl } from './api';

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
    { id: 'intermediate', label: 'Intermediate', section: 'Explorer', cefr: 'A2–B1', chip: 'bg-amber-50 text-amber-700 ring-amber-200' },
    { id: 'advanced', label: 'Advanced', section: 'Achiever', cefr: 'B2', chip: 'bg-rose-50 text-rose-700 ring-rose-200' }
];
export const levelOf = (id) => LEVELS.find((l) => l.id === id) || LEVELS[0];
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
const markOf = (code) => (code === 'en' ? 'EN' : langOf(code).mark);
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

/**
 * Play a recording; with none, the browser's own voice reads the text, where
 * the browser has one. Returns the Audio element (to stop it) or null.
 */
export const play = (src, text, lang = 'en-IN') => {
    if (src) {
        const a = new Audio(mediaUrl(src));
        a.play().catch(() => {});
        return a;
    }
    if (text && typeof window !== 'undefined' && window.speechSynthesis) {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
    }
    return null;
};
export const canSpeak = (src) => !!src || (typeof window !== 'undefined' && !!window.speechSynthesis);

/** Words of praise for a right answer, chosen by its place so they vary. */
export const PRAISE = ['Nicely done!', 'Great job!', 'Excellent!', 'You got it!', 'Amazing!', 'Correct!', 'Well done!', 'Brilliant!'];
