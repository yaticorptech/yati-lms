/**
 * The revision of each language's recorded letters (2026-11-19). The server records letters with care, and may
 * record one again (its scripts/recordLetters.js); it says which revision it has with the section's home and the
 * letters page (`letterVoice: { lang, rev }`). The letters' clips are kept under that revision (meta.js clipKey), so
 * when it changes they are asked for afresh — past the copies on the device and in the browser's cache — and a
 * letter recorded again reaches every device by itself. Remembered on the device, for the visit before the
 * server has answered.
 */
const KEY = 'lingo-letter-voice';
const base = (lang) => String(lang || '').toLowerCase().replace('_', '-').split('-')[0];
let revs = (() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; } })();

/** The revision of this language's letters, 0 until the server has said. */
export const letterRev = (lang) => Number(revs[base(lang)]) || 0;

/** Takes what the server said (a dashboard or a letters page) and hands the same thing back. */
export const noteLetterVoice = (payload) => {
    const v = payload?.letterVoice;
    const lang = base(v?.lang), rev = Number(v?.rev);
    if (lang && Number.isFinite(rev) && revs[lang] !== rev) {
        revs = { ...revs, [lang]: rev };
        try { localStorage.setItem(KEY, JSON.stringify(revs)); } catch { /* private window: this visit only */ }
    }
    return payload;
};
