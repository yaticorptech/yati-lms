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

const LEVEL_LABEL = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };
const KINDS = [
    { review: 'words', module: 'vocabulary', order: 101, title: 'Word review', summary: 'Every word of this level again: match the pairs, then a quiz.' },
    { review: 'listen', module: 'vocabulary', order: 102, title: 'Listen and pick', summary: 'Hear a word of this level and pick it.' },
    { review: 'sentences', module: 'translation', order: 101, title: 'Sentence review', summary: 'The sentences of this level again, both ways.' },
    { review: 'checkpoint', module: 'translation', order: 102, title: 'Level checkpoint', summary: 'A last test on this level’s sentences.' }
];

/** Every review's stub: four per level, in the English course and in every other course. */
const stubs = () => courses.courseCodes().flatMap((code) => LEVELS.flatMap((level) => KINDS.map((k) => ({
    seedKey: `${code === 'en' ? '' : `${code}:`}review-${k.review}-${level}`, course: code === 'en' ? null : code, review: k.review,
    module: k.module, level, order: k.order, title: k.title, summary: k.summary, status: 'published', updatedBy: 'Course content', direction: null, learn: {}
}))));

/** The level's lessons of the review's unit, as the student sees them. */
const sourcesOf = (stub, helper) => CONTENT
    .filter((l) => l.level === stub.level && l.module === stub.module)
    .map((l) => (stub.course ? courses.build(courses.stubOf(stub.course, l), helper) : localize(l, helper)))
    .filter((l) => !l.notForLanguage);

/** A translation item of a source lesson, carrying that lesson's direction (a review mixes both). */
const withDirection = (s, it) => ({ ...it, id: `${s.direction}~${it.id}`, direction: s.direction });

/** Lists taken in turn (one of each, then the next of each), so a review swaps direction as it goes. */
const interleave = (lists) => Array.from({ length: Math.max(0, ...lists.map((l) => l.length)) }, (_, i) => lists.map((l) => l[i]).filter(Boolean)).flat();

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
    if (stub.module === 'vocabulary') {
        out.words = sources.flatMap((s) => (s.words || []).map((w) => ({ locale: s.targetLocale || 'en-IN', ...w })));
        out.learn = stub.review === 'listen'
            ? { intro: `Turn your sound on: you will hear words from ${level}, and pick the one you hear. Tap the speaker to hear it again.` }
            : { intro: `All ${out.words.length} words of ${level} again. Match the pairs, then take the quiz.` };
        return out;
    }
    const items = interleave(sources.map((s) => (s.items || []).filter((it) => !it.open).map((it) => withDirection(s, it))));
    if (stub.review === 'sentences') {
        out.items = items;
        out.quiz = items.filter((_, i) => i % 2 === 0).slice(0, 6);
        out.learn = { intro: `The sentences of ${level} again, in both directions. Read the label on each to see which way to translate.` };
    } else {
        // The checkpoint: every quiz sentence of the level, and the first practice sentence of each lesson.
        out.items = [];
        out.quiz = [
            ...interleave(sources.map((s) => (s.quiz || []).map((it) => withDirection(s, it)))),
            ...sources.flatMap((s) => { const it = (s.items || []).find((x) => !x.open); return it ? [withDirection(s, it)] : []; })
        ];
        out.learn = { intro: `A last test on ${level}: ${out.quiz.length} sentences, both ways. Pass it to finish the level.` };
    }
    return out;
};

module.exports = { KINDS, stubs, build };
