/**
 * Linguistic Ability — review lessons in every level (asked 2026-10-23: "add
 * more task in each level"). Each level of every course gets four more
 * lessons, made from the level's own words and sentences, so nothing new is
 * written or translated:
 *
 *   Vocabulary unit    Word review       every word of the level: matching pairs, then a quiz
 *                      Listen and pick   hear a word, pick it (the browser speaks it, or its recording)
 *   Translation unit   Sentence review   the level's sentences again, both ways
 *                      Level checkpoint  a last test on the level's sentences, both ways
 *
 * They open once the unit's lessons of that level are done, and count towards
 * the level's certificate; they never lock the next level (service.js
 * `access`). Like a course lesson, a review is kept in the database as a stub
 * (seedKey "review-words-beginner", "hi:review-words-beginner") and made
 * whole when it is served — from the seeded lessons, so an administrator's
 * edits to a lesson do not reach its review.
 */
const { lessons: CONTENT } = require('./content');
const { LEVELS } = require('./models');
const { localize } = require('./languages');
const courses = require('./courses');
const parts = require('./parts');
const NOTES = require('./content/asks/notes');
const { nextShown, ASSESSMENT_PASS } = require('./levels');

/**
 * Advanced's Writing track (2026-10-29, units.js TRACKS): each Advanced article's writing tasks (a letter, an email,
 * a paragraph, sentences) as a lesson of their own; the article itself, in Stories, is read and asked about. English
 * only: the other courses have no articles. Done when every task is written (service.js submitQuiz).
 */
const writeLevels = () => require('./units').TRACK_LEVELS;
const readingAt = (level) => CONTENT.filter((l) => l.level === level && l.module === 'reading' && (l.writing || []).length);

const LEVEL_LABEL = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };
const KINDS = [
    { review: 'words', module: 'vocabulary', order: 101, title: 'Word review', summary: 'Every word of this level again: match the pairs, then a quiz.' },
    { review: 'listen', module: 'vocabulary', order: 102, title: 'Listen and pick', summary: 'Hear a word of this level and pick it.' },
    { review: 'sentences', module: 'translation', order: 101, title: 'Sentence review', summary: 'The sentences of this level again, both ways.' },
    { review: 'checkpoint', module: 'translation', order: 102, title: 'Level checkpoint', summary: 'A last test on this level’s sentences.' }
];

/**
 * A unit's own review (asked 2026-10-24, the path in topic units, units.js):
 * the unit's words again — matching pairs, then a quiz that mixes their
 * meaning, hearing them and using them. One per unit (a level's Words lessons
 * by their `order`), at the unit's end.
 */
const UNIT = { review: 'unit', module: 'vocabulary', title: 'Unit review', summary: 'This unit’s words again: match the pairs, then a quick quiz with listening.' };
// A unit's listening stop (2026-10-24, Duolingo's headphones): its words, heard and picked.
const HEAR = { review: 'hear', module: 'vocabulary', title: 'Listening', summary: 'Hear this unit’s words and pick each one.' };
const unitOrders = (level) => [...new Set(CONTENT.filter((l) => l.level === level && l.module === 'vocabulary').map((l) => Number(l.order) || 1))];

/**
 * A section's assessment (2026-10-29, user: "after finishing the basics, conduct one assessment that decides
 * whether the user is eligible for advanced"): the last stop of the section, 20 questions on the section's own
 * words, grammar and sentences; 50% or more (levels.js) opens the next section. Taken again as often as the student likes.
 * Only in a section with one shown after it (levels.js).
 */
const ASSESSMENT = { review: 'assessment', module: 'vocabulary', order: 103, summary: 'A test on this section. Pass it to open the next one.' };
const assessmentTitle = (level) => `${LEVEL_LABEL[level]} assessment`;

/** Every review's stub: four per level and one of each per unit, in the English course and in every other course. */
const stubs = () => courses.courseCodes().flatMap((code) => LEVELS.flatMap((level) => {
    const prefix = code === 'en' ? '' : `${code}:`;
    const base = { course: code === 'en' ? null : code, level, status: 'published', updatedBy: 'Course content', direction: null, learn: {} };
    return [
        ...KINDS.map((k) => ({ ...base, seedKey: `${prefix}review-${k.review}-${level}`, review: k.review, module: k.module, order: k.order, title: k.title, summary: k.summary })),
        ...(nextShown(level) ? [{ ...base, seedKey: `${prefix}review-assessment-${level}`, review: 'assessment', module: ASSESSMENT.module, order: ASSESSMENT.order, title: assessmentTitle(level), summary: ASSESSMENT.summary }] : []),
        ...(code === 'en' && writeLevels().includes(level) ? readingAt(level).map((r) => ({ ...base, seedKey: `review-write-${level}-${Number(r.order) || 1}`, review: 'write', module: 'reading', order: Number(r.order) || 1, part: 2, title: `Writing: ${r.title}`, summary: 'Write the letter, email or paragraph; it is checked here.' })) : []),
        // One of each per unit: a topic's two units (parts.js), the second's seedKey ending "~2".
        ...unitOrders(level).flatMap((order) => parts.PARTS.flatMap((part) => [UNIT, HEAR].map((k) => ({
            ...base, seedKey: `${prefix}review-${k.review}-${level}-${order}${parts.keyOf(part)}`, review: k.review, module: k.module, order, ...(part > 1 ? { part } : {}), title: k.title, summary: k.summary
        }))))
    ];
}));

/** The level's lessons of the review's unit, as the student sees them. */
const sourcesOf = (stub, helper) => CONTENT
    .filter((l) => l.level === stub.level && l.module === stub.module && (!['unit', 'hear'].includes(stub.review) || (Number(l.order) || 1) === stub.order))
    .map((l) => (stub.course ? courses.build(courses.stubOf(stub.course, l), helper) : localize(l, helper)))
    .filter((l) => !l.notForLanguage);

/**
 * A translation item of a source lesson, carrying that lesson's direction (a review mixes both). A later
 * topic's lesson goes the same way as the first ones, so its items carry its topic too (2026-10-28: with a
 * fourth topic, "en-kn~q1" stood for two sentences); the first lessons' ids stay as they were.
 */
const withDirection = (s, it) => {
    const order = Number(s.order) || 1;
    return { ...it, id: order > 1 ? `${s.direction}~${order}~${it.id}` : `${s.direction}~${it.id}`, direction: s.direction };
};

/** Lists taken in turn (one of each, then the next of each), so a review swaps direction as it goes. */
const interleave = (lists) => Array.from({ length: Math.max(0, ...lists.map((l) => l.length)) }, (_, i) => lists.map((l) => l[i]).filter(Boolean)).flat();

/**
 * A unit review's more (asked 2026-10-24: its questions not the same as the
 * unit's lessons'): the words of the unit before it (two are asked again),
 * and the unit's own sentences, to recognise — each sentence in the language
 * learnt (`target`) and the student's (`helper`), with the topic's other
 * sentences in the language learnt to choose from (`pool`).
 */
const moreFor = (stub, helper) => {
    const order = Number(stub.order) || 1, part = parts.partOf(stub);
    const make = (l) => (stub.course ? courses.build(courses.stubOf(stub.course, l), helper) : localize(l, helper));
    const as = (l, p) => ({ ...(stub.course ? courses.stubOf(stub.course, l) : l), part: p });
    const out = { earlier: [], sentences: [], pool: [] };
    const before = part > 1 ? { order, part: 1 } : order > 1 ? { order: order - 1, part: 2 } : null;
    const v = before && CONTENT.find((l) => l.module === 'vocabulary' && l.level === stub.level && (Number(l.order) || 1) === before.order);
    if (v) out.earlier = parts.cut(make(v), as(v, before.part)).words || [];
    const t = CONTENT.find((l) => l.module === 'translation' && l.level === stub.level && (Number(l.order) || 1) === order);
    const built = t && make(t);
    if (!built || built.notForLanguage || built.languageFallback) return out;
    const pair = (it) => (built.direction === 'kn-en' ? { target: it.model, helper: it.source } : { target: it.source, helper: it.model });
    const usable = (it) => !it.open && it.source && it.model;
    out.pool = [...(built.items || []), ...(built.quiz || [])].filter(usable).map((it) => pair(it).target);
    const mine = parts.cut(built, as(t, part));
    out.sentences = [...(mine.items || []), ...(mine.quiz || [])].filter(usable).slice(0, 2).map((it) => ({ ...pair(it), lang: built.languageName }));
    return out;
};

/** The stub made whole, for a student whose own language is `helper`. */
const build = (stub, helper) => {
    const sources = sourcesOf(stub, helper);
    const first = sources[0] || {};
    const out = {
        ...stub, language: first.language || helper, languageName: first.languageName,
        ...(first.target ? { target: first.target, targetName: first.targetName, targetLocale: first.targetLocale } : {}),
        ...(sources.some((s) => s.languageFallback) ? { languageFallback: sources.find((s) => s.languageFallback).languageFallback } : {})
    };
    const level = LEVEL_LABEL[stub.level];
    if (stub.review === 'assessment') return assessmentOf(stub, helper, out, level);
    if (stub.review === 'write') {
        const src = readingAt(stub.level).find((l) => (Number(l.order) || 1) === stub.order);
        const own = src && localize(src, helper);
        out.writing = own?.writing || [];
        out.quiz = [];
        out.learn = { intro: `Write about “${src?.title || ''}”. A long piece needs three sentences or more, each ending with a full stop; your grammar is checked here, sentence by sentence.` };
        return out;
    }
    if (stub.module === 'vocabulary') {
        out.words = sources.flatMap((s) => (s.words || []).map((w) => ({ locale: s.targetLocale || 'en-IN', ...w })));
        // A unit's review and listening: the words of its own unit of the topic.
        if (stub.review === 'unit' || stub.review === 'hear') out.words = parts.cut(out, stub).words;
        if (stub.review === 'unit') Object.assign(out, moreFor(stub, helper));
        const N = NOTES[out.language];
        out.learn = N ? { intro: stub.review === 'listen' || stub.review === 'hear' ? N.hear : stub.review === 'unit' ? N.unit(out.words.length) : N.words(out.words.length) }
            : stub.review === 'listen' || stub.review === 'hear'
            ? { intro: `Turn your sound on: you will hear words from ${stub.review === 'hear' ? 'this unit' : level}, and pick the one you hear. Tap the speaker to hear it again.` }
            : stub.review === 'unit'
                ? { intro: `The ${out.words.length} words of this unit again. Match the pairs, then a quick quiz: their meaning, hearing them, and using them.` }
                : { intro: `All ${out.words.length} words of ${level} again. Match the pairs, then take the quiz.` };
        return out;
    }
    const items = interleave(sources.map((s) => (s.items || []).filter((it) => !it.open).map((it) => withDirection(s, it))));
    if (stub.review === 'sentences') {
        out.items = items;
        out.quiz = items.filter((_, i) => i % 2 === 0).slice(0, 6);
        out.learn = { intro: NOTES[out.language]?.sentences || `The sentences of ${level} again, in both directions. Read the label on each to see which way to translate.` };
    } else {
        // The checkpoint: every quiz sentence of the level, and the first practice sentence of each lesson.
        out.items = [];
        out.quiz = [
            ...interleave(sources.map((s) => (s.quiz || []).map((it) => withDirection(s, it)))),
            ...sources.flatMap((s) => { const it = (s.items || []).find((x) => !x.open); return it ? [withDirection(s, it)] : []; })
        ];
        out.learn = { intro: NOTES[out.language]?.checkpoint(out.quiz.length) || `A last test on ${level}: ${out.quiz.length} sentences, both ways. Pass it to finish the level.` };
    }
    return out;
};

/**
 * The assessment made whole: the section's words (asked in the quiz, not shown first), its grammar questions
 * (those that stand alone, with no passage or conversation to read), and its sentences, each in the language learnt
 * and the student's, with the section's other sentences to choose from. The quiz is put together from these
 * (service.js quizOf).
 */
function assessmentOf(stub, helper, out, level) {
    const make = (l) => (stub.course ? courses.build(courses.stubOf(stub.course, l), helper) : localize(l, helper));
    const at = (module) => CONTENT.filter((l) => l.level === stub.level && l.module === module);
    out.words = at('vocabulary').map(make).filter((l) => !l.notForLanguage).flatMap((l) => (l.words || []).map((w) => ({ locale: l.targetLocale || 'en-IN', ...w })));
    const ALONE = ['mcq', 'fill', 'rearrange', 'correction', 'truefalse'];
    out.grammar = stub.course ? [] : at('grammar').map(make).flatMap((l) => (l.quiz || []).filter((q) => ALONE.includes(q.type)).map((q) => ({ ...q, id: `g~${l.seedKey}~${q.id}` })));
    const pairs = [];
    const pool = [];
    for (const t of at('translation').map(make)) {
        if (!t || t.notForLanguage || t.languageFallback) continue;
        const pair = (it) => (t.direction === 'kn-en' ? { target: it.model, helper: it.source } : { target: it.source, helper: it.model });
        for (const it of [...(t.items || []), ...(t.quiz || [])].filter((x) => !x.open && x.source && x.model)) {
            const p = pair(it);
            pool.push(p.target);
            pairs.push({ ...p, lang: t.languageName });
        }
    }
    out.sentences = pairs;
    out.pool = [...new Set(pool)];
    out.passingScore = ASSESSMENT_PASS;
    out.learn = { intro: `The ${level} assessment: 20 questions on the words, grammar and sentences of ${level}. Get ${ASSESSMENT_PASS}% or more to open the next section. You can take it again as many times as you like.` };
    return out;
}

module.exports = { KINDS, UNIT, HEAR, ASSESSMENT, stubs, build };
