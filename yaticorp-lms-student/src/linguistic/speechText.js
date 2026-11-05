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
/** Texts read aloud one after another, as [[sentence, lang], …]. */
export const readingSpeech = (texts, lang = 'en-IN') => texts.flatMap(sentencesOf).map((t) => [t, lang]);

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
        case 'comic': out.push(...readingSpeech(comicWords(step.comic), step.comic?.locale || 'en-IN')); break;
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
    return out;
};

/** The letters page's sounds (LettersChart.jsx): every letter, as it is tapped. */
export const chartSpeech = (chart) => {
    if (!chart) return [];
    const out = [];
    const walk = (x) => { if (!x || typeof x !== 'object') return; if (Array.isArray(x)) { x.forEach(walk); return; } if (typeof x.char === 'string') out.push([x.speak || x.char, chart.locale]); Object.values(x).forEach(walk); };
    walk(chart.groups); walk(chart.table);
    return out;
};
