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
const LEVEL_REVIEWS = ['words', 'listen', 'sentences', 'checkpoint', 'assessment'];
const WARMUP_WORDS = 4;
// The warm-up of 2026-10-24, off since 2026-10-29 (pairs once a unit, in its Words lesson): true brings it back.
const WARMUP_ON = false;

const topicOf = (title) => String(title || '').split(':')[0].trim();

/**
 * Advanced practised by skill (2026-10-29, the user chose "Skill practice (Duolingo style)": "don't give the same
 * pattern for basic and advanced"): its lessons in a track for each skill instead of topic units — the student
 * picks any track and works through it, each lesson after the one before in the same track. Beginner keeps its
 * topic units.
 */
const TRACK_LEVELS = ['advanced'];
const TRACKS = [
    // With its picture stories (comics.js, 2026-10-31), each after its topic's article.
    { id: 'stories', title: 'Stories', note: 'Picture stories and articles to read, with questions on them.', has: (l) => l.module === 'reading' && (!l.review || l.review === 'comic') },
    { id: 'listening', title: 'Listening', note: 'Conversations to listen to, with questions and a role-play.', has: (l) => l.module === 'speaking' && !l.review },
    { id: 'speaking', title: 'Speaking', note: 'Speak on a topic: every sentence corrected, with the reason.', has: (l) => l.review === 'talk' },
    { id: 'writing', title: 'Writing', note: 'Letters, emails and paragraphs, checked here.', has: (l) => l.review === 'write' },
    { id: 'translation', title: 'Translation', note: 'Passages and sentences, both ways.', has: (l) => l.module === 'translation' },
    { id: 'words', title: 'Words & grammar', note: 'The section’s words and grammar, and their reviews.', has: (l) => ['vocabulary', 'grammar'].includes(l.module) }
];
const isTracked = (level) => TRACK_LEVELS.includes(level);

/**
 * A level's lessons in units, in path order: [{ index, order, part, kind:
 * 'topic'|'review', title, lessons }]. `lessons` are the level's lessons as
 * the student has them.
 */
const unitsOf = (levelLessons) => {
    const topics = topicUnitsOf(levelLessons);
    if (!levelLessons.length || !isTracked(levelLessons[0].level)) return topics;
    // A track's lessons in the order the topic units had them (topic by topic), its level reviews last.
    const all = topics.flatMap((u) => u.lessons);
    return TRACKS.map((t) => ({ order: null, kind: 'track', track: t.id, title: t.title, note: t.note, lessons: all.filter(t.has) }))
        .filter((u) => u.lessons.length).map((u, i) => ({ index: i + 1, ...u }));
};

/** A level's lessons in topic units (Beginner's way, and Advanced's before 2026-10-29). */
const topicUnitsOf = (levelLessons) => {
    const byUnit = new Map();
    const levelReviews = [];
    for (const l of levelLessons) {
        if (l.review && LEVEL_REVIEWS.includes(l.review)) { levelReviews.push(l); continue; }
        // The Letters unit (alphabet.js) is unit 0, before the topics'.
        const order = l.review === 'letters' ? 0 : Number(l.order) || 1, part = parts.partOf(l), key = `${order}:${part}`;
        if (!byUnit.has(key)) byUnit.set(key, { order, part, lessons: [] });
        byUnit.get(key).lessons.push(l);
    }
    // A talk (talks.js) comes after the unit's Speaking lesson.
    // A section's assessment (2026-10-29) is its very last stop.
    // The Letters lessons (alphabet.js, 2026-10-31) in their groups' order.
    const rank = (l) => (l.review === 'letters' ? (Number(String(l.seedKey || '').split('-').pop()) || 0) / 100 : l.review === 'assessment' ? 100 : l.review === 'unit' ? 99 : l.review === 'hear' ? 50 : l.review === 'talk' ? 3.5 : l.review === 'comic' ? MODULE_ORDER.indexOf('reading') + 0.5 : MODULE_ORDER.indexOf(l.module));
    const units = [...byUnit.values()].sort((a, b) => a.order - b.order || a.part - b.part).map(({ order, part, lessons: ls }, i) => {
        const sorted = ls.sort((a, b) => rank(a) - rank(b) || String(a.direction || '').localeCompare(String(b.direction || '')));
        const words = sorted.find((l) => l.module === 'vocabulary' && !l.review);
        const title = sorted.every((l) => l.review === 'letters') ? 'Letters' : parts.unitName(sorted[0].level, order, part) || (words ? topicOf(words.title) : topicOf(sorted.find((l) => !l.review)?.title)) || `Unit ${i + 1}`;
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
    // A Letters lesson (alphabet.js) is a review's cup: the "Aa" stop of 2026-10-31 was undone on 2026-11-02 (user: "make it like before").
    if (l.review === 'hear' || l.review === 'listen') return 'listening';
    if (l.review === 'checkpoint' || l.review === 'assessment') return 'checkpoint';
    if (l.review === 'write') return 'writing';
    // A picture story (comics.js, 2026-10-31).
    if (l.review === 'comic') return 'comic';
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
/**
 * The words of a lesson's own unit of its topic (parts.js), from the topic's Words lesson as the student has it — in
 * their language, or the course's: `word` the one learnt, `kannada` its meaning. With the unit's locale.
 */
const unitWordsOf = (doc, helper) => {
    if (!doc) return null;
    const { localize } = require('./languages');
    const courses = require('./courses');
    const base = CONTENT.find((l) => l.module === 'vocabulary' && l.level === doc.level && (Number(l.order) || 1) === (Number(doc.order) || 1));
    if (!base) return null;
    const stub = doc.course ? courses.stubOf(doc.course, base) : base;
    const unit = parts.cut(doc.course ? courses.build(stub, helper) : localize(base, helper), { ...stub, part: parts.partOf(doc) });
    return { words: (unit?.words || []).filter((w) => w.word && w.kannada), locale: unit?.targetLocale || 'en-IN' };
};

/**
 * The sentences of a lesson's own unit of its topic (2026-11-05, for a Words lesson's blanks): the topic's translation
 * lesson as the student has it, cut to the unit's share — its items and its direction. Null without one.
 */
const unitSentencesOf = (doc, helper) => {
    if (!doc) return null;
    const { localize } = require('./languages');
    const courses = require('./courses');
    const base = CONTENT.find((l) => l.module === 'translation' && l.level === doc.level && (Number(l.order) || 1) === (Number(doc.order) || 1));
    if (!base) return null;
    const stub = doc.course ? courses.stubOf(doc.course, base) : base;
    const unit = parts.cut(doc.course ? courses.build(stub, helper) : localize(base, helper), { ...stub, part: parts.partOf(doc) });
    return unit ? { items: unit.items || [], direction: unit.direction } : null;
};

const warmupFor = (doc, helper) => {
    if (!doc || doc.module === 'vocabulary' || doc.review) return null;
    // Matching pairs once a unit (2026-10-29, the user: "why ask this question for every step?" — chose "once per
    // unit"): the unit's Words lesson has them; no other lesson starts with them any more.
    if (!WARMUP_ON) return null;
    const unit = unitWordsOf(doc, helper);
    const words = unit?.words || [];
    if (words.length < 2) return null;
    return shuffle(words, seeded(`${doc.seedKey || doc._id}:warmup`)).slice(0, WARMUP_WORDS)
        .map((w) => ({ word: w.word, kannada: w.kannada, audio: w.audio || null, locale: unit.locale, say: w.say || null }));
};

module.exports = { MODULE_ORDER, LEVEL_REVIEWS, TRACKS, TRACK_LEVELS, isTracked, unitsOf, pathOrder, warmupFor, unitWordsOf, unitSentencesOf, topicOf, typeOf };
