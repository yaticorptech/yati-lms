/*
 * Plain JavaScript, no imports: the student app (meta.js, the session's audio made ahead) and the server's
 * script that makes every lesson's audio in advance (yaticorp-lms-server/scripts/makeIndicAudio.js) both use
 * it, so the clips made ahead are exactly the ones the app plays.
 */
/**
 * What a lesson screen can read aloud, as [[text, lang], …] (the same texts its speakers and taps play), so the
 * session can fetch a screen's clips before the student reaches it.
 */
/** A text to read aloud cut into sentences (each one clip: the first plays while the rest are made), none over ~280 characters. */
export const sentencesOf = (text) => String(text || '').split(/(?<=[.!?।॥])\s+|\n+/).map((x) => x.trim()).filter(Boolean)
    .flatMap((x) => (x.length <= 280 ? [x] : x.split(/(?<=[,;:])\s+/).reduce((out, part) => {
        if (out.length && (out[out.length - 1] + ' ' + part).length <= 280) out[out.length - 1] += ` ${part}`; else out.push(part);
        return out;
    }, [])));
/** A story's words in reading order, as Read aloud reads them: its title, panels, then its moral (Comic.jsx). */
export const comicWords = (comic) => (!comic?.panels ? [] : [comic.title, ...comic.panels.flatMap((p) => [p.caption, ...(p.say || []).map((b) => (b.name ? `${b.name.replace(/^the /, 'The ')} says: ${b.text}` : b.text)), p.narration]),
    comic.moral && (comic.moralLabel ? `${comic.moralLabel} ${comic.moral}` : `The moral of the story: ${comic.moral}`)].filter(Boolean));
/**
 * How a line in a story is said (2026-11-12, "every emotion should be perfect, voice variations and all"): the voice
 * spec the AI voice is asked for — 'f' or 'm', then after a colon the feeling, pitch and pace (the server's
 * tts/store.js keeps only those it knows). `person` is the story's person (none: the narrator); `pose` how they
 * stand in that picture (cheer, sad, surprise…); `text` their words.
 *   A child: high-pitched. Someone old (grey hair, a beard): low and slow. A big man: low.
 *   The feeling from the pose, else from the words: "!" excited, "?" a question; the narrator tells it as a story.
 */
const POSE_MOOD = { cheer: 'happy', give: 'kind', sad: 'sad', surprise: 'surprise' };
export const voiceSpec = (person, pose, text) => {
    if (!person) return 'f:mood-story';
    const t = String(text || '').trim();
    const mood = POSE_MOOD[pose] || (/[!！]\s*$/.test(t) ? 'excited' : /[?？]\s*$/.test(t) ? 'question' : null);
    const old = ['grey', 'greybun'].includes(person.hair) || person.beard;
    const pitch = person.child ? 'high' : old || person.big ? 'low' : null;
    const pace = old ? 'slow' : person.child ? 'fast' : null;
    const style = [mood && `mood-${mood}`, pitch && `pitch-${pitch}`, pace && `pace-${pace}`].filter(Boolean).join(',');
    const v = person.woman ? 'f' : 'm';
    return style ? `${v}:${style}` : v;
};
/** The voice of a film's line: its speaker, and how they stand while saying it. */
export const filmVoice = (film, line) => (line.who === 'narrator' ? voiceSpec(null) : voiceSpec(film.people?.[line.who] || {}, line.at?.[line.who]?.pose, line.text));

/**
 * A story read as a conversation (2026-11-12, "it must feel like a conversation, their voices"): [[text, lang, voice], …]
 * in reading order — the title, captions, narration and moral by the narrator (a woman's voice, 'f'), and each
 * person's words, without "X says:", in their own voice: a man's ('m') or a woman's.
 */
export const comicSpeech = (comic) => {
    if (!comic?.panels) return [];
    const l = comic.locale || 'en-IN';
    const people = comic.people || {};
    const out = [];
    const put = (text, voice = 'f') => { if (text) out.push([text, l, voice]); };
    const story = voiceSpec(null);
    put(comic.title, story);
    for (const p of comic.panels) {
        put(p.caption, story);
        (p.say || []).forEach((b) => put(b.text, voiceSpec(people[b.who] || {}, p.cast?.find((c) => c.who === b.who)?.pose, b.text)));
        put(p.narration, story);
    }
    if (comic.moral) put(comic.moralLabel ? `${comic.moralLabel} ${comic.moral}` : `The moral of the story: ${comic.moral}`, story);
    return out;
};
/** Texts read aloud one after another, as [[sentence, lang], …]. */
export const readingSpeech = (texts, lang = 'en-IN') => texts.flatMap(sentencesOf).map((t) => [t, lang]);

/*
 * A course in an Indian language reads only that language (2026-11-11, user: "read only Kannada, the supporting
 * English don't read"): a text with none of its letters (an English meaning, an instruction) is not read, and
 * English words inside one are left out. Every text is read in the course's own voice.
 */
const SCRIPT_OF = {
    kn: /[\u0C80-\u0CFF]/, te: /[\u0C00-\u0C7F]/, ta: /[\u0B80-\u0BFF]/, ml: /[\u0D00-\u0D7F]/,
    hi: /[\u0900-\u097F]/, mr: /[\u0900-\u097F]/, ne: /[\u0900-\u097F]/, sa: /[\u0900-\u097F]/,
    bn: /[\u0980-\u09FF]/, as: /[\u0980-\u09FF]/, gu: /[\u0A80-\u0AFF]/, pa: /[\u0A00-\u0A7F]/,
    or: /[\u0B00-\u0B7F]/, ur: /[\u0600-\u06FF]/
};
/** [text, lang] as a course reads it, or null when it is not read. Courses not listed read everything as given. */
export const courseSpeech = (text, lang, target) => {
    const t = String(text || '').trim();
    const script = SCRIPT_OF[String(target || '').split('-')[0]];
    if (!t) return null;
    if (!script) return [t, lang];
    if (!script.test(t)) return null;
    const only = t.replace(/[A-Za-z][A-Za-z'’-]*/g, ' ')
        .replace(/\(\s*[^\p{L}]*\)|“\s*[^\p{L}]*”|"\s*[^\p{L}]*"/gu, ' ') // brackets and quotes left empty
        .replace(/\s+([,.;:!?।])/g, '$1').replace(/([,;:])(\s*[,;:])+/g, '$1')
        .replace(/^[\s,.;:\-–—=]+|[\s,;:\-–—=]+$/g, '').replace(/\s{2,}/g, ' ').trim();
    return only && script.test(only) ? [only, `${String(target).split('-')[0]}-IN`] : null;
};

export const stepSpeech = (step) => {
    if (!step) return [];
    const out = [];
    const put = (text, lang = 'en-IN') => { if (text) out.push([text, lang]); };
    const words = step.words || [];
    switch (step.kind) {
        case 'notes': (step.learn?.examples || []).forEach((e) => put(e)); break;
        case 'words': words.filter((w) => !w.audio).forEach((w) => put(w.speak || w.word, step.targetLocale || 'en-IN')); break;
        case 'letterWords': words.forEach((w) => put([w.forSay || `${w.word} for ${w.for}`, w.sentence].filter(Boolean).join('. '), w.locale || 'en-IN')); break;
        case 'pairs': words.filter((w) => !w.audio).forEach((w) => put(w.speak || w.word, w.locale || step.targetLocale || 'en-IN')); break;
        case 'dialogue':
            (step.dialogue?.lines || []).filter((l) => !l.audio).forEach((l) => put(l.text));
            (step.phrases || []).forEach((p) => put(p));
            break;
        case 'passage': out.push(...readingSpeech([step.passage?.text])); break;
        case 'comic':
            // A story film (2026-11-12): each line whole, as StoryFilm.jsx asks the AI voice for it, and the moral.
            if (step.comic?.film) {
                const c = step.comic, l = c.locale || 'en-IN';
                (c.scenes || []).forEach((sc) => (sc.lines || []).forEach((ln) => out.push([ln.text, l, filmVoice(c, ln)])));
                if (c.moral) out.push([`${c.moralLabel || 'The moral of the story:'} ${c.moral}`, l, voiceSpec(null)]);
            } else comicSpeech(step.comic).forEach(([t, l, v]) => sentencesOf(t).forEach((x) => out.push([x, l, v])));
            break;
        case 'speak': put(step.speaking?.sample); break;
        case 'question': {
            const q = step.q || {};
            if (!q.audio) put(q.say, q.sayLang || 'en-IN');
            if (q.promptSay) put(q.promptSay.text, q.promptSay.locale);
            if (q.kannada && !q.audio) put(step.word?.word);
            break;
        }
        default: break;
    }
    return out.map(([t, l, v]) => { const r = courseSpeech(t, l, step.target); return r && (v ? [...r, v] : r); }).filter(Boolean);
};

/** The letters page's sounds (LettersChart.jsx): every letter, as it is tapped. */
// `table: false` (2026-11-13): only the letters themselves, not the big table of combinations (hundreds of sounds).
export const chartSpeech = (chart, { table = true } = {}) => {
    if (!chart) return [];
    const out = [];
    // English letters by the letter itself, as the chart says them (LettersChart.jsx), not their spelling.
    const english = chart.course?.code === 'en';
    const walk = (x) => { if (!x || typeof x !== 'object') return; if (Array.isArray(x)) { x.forEach(walk); return; } if (typeof x.char === 'string') out.push([english ? x.char : x.speak || x.char, chart.locale]); Object.values(x).forEach(walk); };
    walk(chart.groups); if (table) walk(chart.table);
    return out;
};
