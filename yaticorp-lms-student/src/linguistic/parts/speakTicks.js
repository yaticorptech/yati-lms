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

// Writing's own checks (2026-11-07, server writeChecks.js): its sentences, how each starts and ends, a subject line, its
// length, the verb after "should".
const sentencesOf = (text) => String(text || '').split(/(?<=[.!?]["'”’)]*)\s+|\n+/).map((s) => s.trim()).filter((s) => /\p{L}/u.test(s));
const subjectOf = (text) => (String(text || '').match(/^\s*subject\s*[:\-–]\s*(.+)$/imu) || [])[1] || '';
const STILL_PLAIN = ['need', 'feed', 'bleed', 'speed', 'proceed', 'succeed', 'exceed', 'breed', 'shed', 'is', 'has', 'was', 'does', 'this', 'yes', 'always', 'access', 'focus'];
const notPlain = (w) => !STILL_PLAIN.includes(w) && (w === 'to' || /ing$/.test(w) || /ed$/.test(w) || /[^su]s$/.test(w));
const capitalStart = (s) => { const c = (s.match(/\p{L}/u) || [''])[0]; return c === c.toUpperCase() || c === c.toLowerCase() && c === c.toUpperCase(); };

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
    if (check.sentences && sentencesOf(said).length < check.sentences) return false;
    if (check.capitals && (!sentencesOf(said).length || !sentencesOf(said).every(capitalStart))) return false;
    if (check.stops && (!sentencesOf(said).length || !sentencesOf(said).every((s) => /[.!?]["'”’)]*$/.test(s)))) return false;
    if (check.subject) {
        const sub = subjectOf(said);
        if (wordCount(sub) < 2 || (Array.isArray(check.subject) && timesSaid(clean(sub), check.subject) < 1)) return false;
    }
    if (check.most && n > check.most) return false;
    if (check.afterShould) {
        const after = [...text.matchAll(/(?<= )should(?: not)? (\p{L}[\p{L}']*)(?= )/gu)].map((m) => m[1]);
        if (!after.length || after.some(notPlain)) return false;
    }
    if (check.seconds && (seconds < check.seconds[0] || seconds > check.seconds[1])) return false;
    if (check.pace) {
        if (n < 10 || seconds <= 0) return false;
        const perMinute = n / (seconds / 60);
        if (perMinute < 35 || perMinute > 190) return false;
    }
    return !!(check.words || check.groups?.length || check.none?.length || check.passive || check.seconds || check.pace
        || check.sentences || check.capitals || check.stops || check.subject || check.most || check.afterShould);
};

/** Each point of a writing task's checklist: whether what is written passes its check (2026-11-07). */
export const writeTicksOf = (task, written) => (task?.checklist || []).map((_, i) => !!task.checks?.[i] && passes(task.checks[i], written));

/** Each point of the checklist: whether what was said passes its check. */
export const ticksOf = (speaking, said, seconds = 0) => (speaking?.checklist || []).map((_, i) => !!speaking.checks?.[i] && passes(speaking.checks[i], said, seconds));

/** Whether the browser can write down speech (not Firefox): with none, the student types what they said, after recording. */
export const canTranscribe = () => typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

/** How many points must be heard to go on (the server says; half, rounded up). */
export const needOf = (speaking) => speaking?.need ?? Math.ceil((speaking?.checklist || []).length / 2);
