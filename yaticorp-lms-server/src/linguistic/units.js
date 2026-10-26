/**
 * Linguistic Ability — the path in topic units, the Duolingo way (asked
 * 2026-10-24: "all the lessons, units and tasks for every language, the same
 * as Duolingo"). A level's lessons used to be grouped by skill (all its
 * Vocabulary, all its Grammar…); now each unit is a topic, and holds one
 * lesson of each kind on it, in this order:
 *
 *   Unit 1 · Home and family   Words → Grammar → Reading → Speaking → Translation → Listening → Unit review
 *   Unit 2 · At school …       …
 *   Level review               Word review · Listen and pick · Sentence review · Level checkpoint
 *
 * A topic is the lessons sharing an `order` (the content's first lessons are
 * the first topic, its second the second); since 2026-10-24 each topic is two
 * shorter units (parts.js), named by the topic, and a lesson's unit is its
 * topic and its `part` there. The
 * lessons open one after another along the path (service.js `access`), and
 * each lesson that is not about words starts with a warm-up of its unit's
 * words (`warmupFor`), so every lesson mixes words, listening and its own
 * tasks. Every language's course has the same units (courses.js), with
 * the lessons it has.
 *
 * Each stop on the path has a Duolingo kind (`typeOf`, asked 2026-10-24): a
 * lesson (star), a story (a Reading lesson), speaking, listening, the unit
 * review (trophy); and two stops that are not lessons, added by the path
 * (service.js pathView): a treasure chest of bonus XP after the story, and
 * practice of the student's own mistakes before the unit review.
 */
const { lessons: CONTENT } = require('./content');
const { shuffle, seeded } = require('./vocabQuiz');
const parts = require('./parts');

const MODULE_ORDER = ['vocabulary', 'grammar', 'reading', 'speaking', 'translation'];
const LEVEL_REVIEWS = ['words', 'listen', 'sentences', 'checkpoint'];
const WARMUP_WORDS = 4;

const topicOf = (title) => String(title || '').split(':')[0].trim();

/**
 * A level's lessons in units, in path order: [{ index, order, part, kind:
 * 'topic'|'review', title, lessons }]. `lessons` are the level's lessons as
 * the student has them.
 */
const unitsOf = (levelLessons) => {
    const byUnit = new Map();
    const levelReviews = [];
    for (const l of levelLessons) {
        if (l.review && LEVEL_REVIEWS.includes(l.review)) { levelReviews.push(l); continue; }
        const order = Number(l.order) || 1, part = parts.partOf(l), key = `${order}:${part}`;
        if (!byUnit.has(key)) byUnit.set(key, { order, part, lessons: [] });
        byUnit.get(key).lessons.push(l);
    }
    // A talk (talks.js) comes after the unit's Speaking lesson.
    const rank = (l) => (l.review === 'unit' ? 99 : l.review === 'hear' ? 50 : l.review === 'talk' ? 3.5 : MODULE_ORDER.indexOf(l.module));
    const units = [...byUnit.values()].sort((a, b) => a.order - b.order || a.part - b.part).map(({ order, part, lessons: ls }, i) => {
        const sorted = ls.sort((a, b) => rank(a) - rank(b) || String(a.direction || '').localeCompare(String(b.direction || '')));
        const words = sorted.find((l) => l.module === 'vocabulary' && !l.review);
        const title = parts.unitName(sorted[0].level, order, part) || (words ? topicOf(words.title) : topicOf(sorted.find((l) => !l.review)?.title)) || `Unit ${i + 1}`;
        return { index: i + 1, order, part, kind: 'topic', title, lessons: sorted };
    });
    if (levelReviews.length) {
        units.push({ index: units.length + 1, order: null, kind: 'review', title: 'Level review', lessons: levelReviews.sort((a, b) => rank(a) - rank(b) || (a.order || 0) - (b.order || 0)) });
    }
    return units;
};

/** A stop's Duolingo kind: 'lesson', 'story', 'speaking', 'listening', 'review' or 'checkpoint'. */
const typeOf = (l) => {
    // Speak on a topic, corrected (talks.js): an Advanced unit's own speaking task.
    if (l.review === 'talk') return 'talk';
    if (l.review === 'hear' || l.review === 'listen') return 'listening';
    if (l.review === 'checkpoint') return 'checkpoint';
    if (l.review) return 'review';
    return { reading: 'story', speaking: 'speaking' }[l.module] || 'lesson';
};

/** A level's lessons in the order the path walks them. */
const pathOrder = (levelLessons) => unitsOf(levelLessons).flatMap((u) => u.lessons);

/**
 * The warm-up at the start of a lesson that is not about words: a few of its
 * unit's words with their meanings, for matching pairs (heard as they are
 * tapped). From the unit's Words lesson as the student has it — in their
 * language, or the course's. None for a Words lesson or a review.
 */
const warmupFor = (doc, helper) => {
    if (!doc || doc.module === 'vocabulary' || doc.review) return null;
    const { localize } = require('./languages');
    const courses = require('./courses');
    const base = CONTENT.find((l) => l.module === 'vocabulary' && l.level === doc.level && (Number(l.order) || 1) === (Number(doc.order) || 1));
    if (!base) return null;
    // The words of the lesson's own unit of the topic (parts.js).
    const stub = doc.course ? courses.stubOf(doc.course, base) : base;
    const unit = parts.cut(doc.course ? courses.build(stub, helper) : localize(base, helper), { ...stub, part: parts.partOf(doc) });
    const words = (unit?.words || []).filter((w) => w.word && w.kannada);
    if (words.length < 2) return null;
    return shuffle(words, seeded(`${doc.seedKey || doc._id}:warmup`)).slice(0, WARMUP_WORDS)
        .map((w) => ({ word: w.word, kannada: w.kannada, audio: w.audio || null, locale: unit.targetLocale || 'en-IN' }));
};

module.exports = { MODULE_ORDER, LEVEL_REVIEWS, unitsOf, pathOrder, warmupFor, topicOf, typeOf };
