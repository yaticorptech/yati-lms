/**
 * The English course's explanations in the student's own language (2026-11-18, the user, of a grammar lesson shown
 * in English: "the user is learning English — if they do not know English, how will they find what this is?").
 *
 * content/explain/<code>.js = { code, texts: { English text: its translation } }, one file per language a student can
 * speak, written by hand (no translation service — a native speaker should check them). A lesson of the English
 * course is shown with them: its intro, points and note, a grammar lesson's title, and the explanation after each
 * answer. The English examples inside them ("She walks to college every day.") stay in English. A text with no
 * translation stays as it is.
 */
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'content', 'explain');
const loaded = {};
/** A language's texts as a Map (NFC keys), read once; null when it has none. */
const textsOf = (code) => {
    if (code in loaded) return loaded[code];
    const file = path.join(DIR, `${code}.js`);
    let map = null;
    try {
        if (/^[a-z]{2}$/.test(code) && fs.existsSync(file)) {
            const texts = require(file).texts || {};
            map = new Map(Object.entries(texts).map(([en, t]) => [String(en).normalize('NFC'), String(t).normalize('NFC')]));
        }
    } catch { map = null; }
    return (loaded[code] = map);
};
/** One text in `code`, or the text itself. */
const say = (map, text) => (typeof text === 'string' && map.get(text.normalize('NFC'))) || text;

/** An English-course lesson with its explanations in the student's language `code` (the lesson unchanged otherwise). */
const inLanguage = (lesson, doc, code) => {
    if (!lesson || !code || code === 'en' || doc?.course) return lesson;
    const map = textsOf(code);
    if (!map || !map.size) return lesson;
    const out = { ...lesson };
    if (doc?.module === 'grammar' && lesson.title) out.title = say(map, lesson.title);
    if (lesson.learn) {
        out.learn = { ...lesson.learn };
        for (const k of ['intro', 'kannadaNote']) if (out.learn[k]) out.learn[k] = say(map, out.learn[k]);
        if (Array.isArray(out.learn.points)) out.learn.points = out.learn.points.map((p) => say(map, p));
    }
    // A speaking task (2026-11-18): what to say and its points, where its own language has none written (content/asks).
    if (lesson.speaking && !lesson.speaking.promptEn) {
        const sp = { ...lesson.speaking };
        const p = say(map, sp.prompt);
        if (p !== sp.prompt) { sp.promptEn = sp.prompt; sp.prompt = p; }
        if (Array.isArray(sp.checklist)) {
            const list = sp.checklist.map((x) => say(map, x));
            if (list.some((x, i) => x !== sp.checklist[i])) { sp.checklistEn = sp.checklist; sp.checklist = list; }
        }
        out.speaking = sp;
    }
    const each = (list) => (Array.isArray(list) ? list.map((q) => (q && q.explanation ? { ...q, explanation: say(map, q.explanation) } : q)) : list);
    if (lesson.practice) out.practice = each(lesson.practice);
    if (lesson.quiz) out.quiz = each(lesson.quiz);
    return out;
};

/** The languages with explanations of their own. */
const codes = () => { try { return fs.readdirSync(DIR).filter((f) => f.endsWith('.js')).map((f) => f.replace(/\.js$/, '')); } catch { return []; } };

module.exports = { inLanguage, textsOf, codes };
