/**
 * Language Learning — the speaking task's checklist ticked from what the
 * student says (asked 2026-10-28: "it will automatically tick based on his
 * voice, don't give a tick option manually"). The checks come with the lesson
 * (server src/linguistic/speakChecks.js, which says what each kind means);
 * this runs them as the student speaks, the same way the server does when the
 * answer is saved — keep the two alike.
 */

const clean = (said) => ` ${String(said || '').toLowerCase().replace(/[’‘`]/g, "'").replace(/[^\p{L}\p{N}'\s]+/gu, ' ').replace(/\s+/g, ' ').trim()} `;
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const patternOf = (phrase) => (phrase === '#' ? '\\p{N}+' : escape(phrase).replace(/\\\*/g, "[\\p{L}']*"));
const timesSaid = (text, phrases) => phrases.reduce((n, ph) => n + (text.match(new RegExp(`(?<= )${patternOf(ph)}(?= )`, 'gu')) || []).length, 0);
export const wordCount = (said) => (String(said || '').match(/[\p{L}\p{N}'’-]+/gu) || []).length;
const PASSIVE = /(?<= )(is|are|was|were|be|been|being)( not| also| all| always| often| then| now)? (\p{L}+ed|put|set|cut|shut|done|paid|made|kept|built|sent|given|taken|seen|shown|known|told|held|left|found|brought|bought|caught|taught|thrown|written|chosen|grown|spent|run)(?= )/u;

/** Whether what was said (and how long it took, in seconds) passes a check. */
const passes = (check, said, seconds = 0) => {
    const text = clean(said);
    const n = wordCount(said);
    if (check.words && n < check.words) return false;
    if (check.groups?.length) {
        const [first, ...rest] = check.groups;
        if (timesSaid(text, first) < (check.times || 1)) return false;
        if (rest.some((g) => timesSaid(text, g) < 1)) return false;
    }
    if (check.none?.length && timesSaid(text, check.none) > 0) return false;
    if (check.passive && !PASSIVE.test(text)) return false;
    if (check.seconds && (seconds < check.seconds[0] || seconds > check.seconds[1])) return false;
    if (check.pace) {
        if (n < 10 || seconds <= 0) return false;
        const perMinute = n / (seconds / 60);
        if (perMinute < 35 || perMinute > 190) return false;
    }
    return !!(check.words || check.groups?.length || check.none?.length || check.passive || check.seconds || check.pace);
};

/** Each point of the checklist: whether what was said passes its check. */
export const ticksOf = (speaking, said, seconds = 0) => (speaking?.checklist || []).map((_, i) => !!speaking.checks?.[i] && passes(speaking.checks[i], said, seconds));

/** Whether the browser can write down speech (not Firefox): with none, the student types what they said, after recording. */
export const canTranscribe = () => typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

/** How many points must be heard to go on (the server says; half, rounded up). */
export const needOf = (speaking) => speaking?.need ?? Math.ceil((speaking?.checklist || []).length / 2);
