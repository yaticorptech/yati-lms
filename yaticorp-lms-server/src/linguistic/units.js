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
// How many Letters lessons a course's first unit shows (2026-11-14).
const LETTERS_KEEP = { kn: 5 };
/** A lesson a course hides (owner's call, 2026-11-14): Kannada's Letters lessons after its first 5. Not deleted. */
const isHidden = (l) => {
    if (l?.review !== 'letters') return false;
    const m = String(l.seedKey || '').match(/^([a-z]+):letters-beginner-(\d+)/);
    if (!(m && LETTERS_KEEP[m[1]] && Number(m[2]) > LETTERS_KEEP[m[1]])) return false;
    // A lesson given its own number (the joined letters, 17 and 18, 2026-11-14) is always shown (2026-11-16, chose when
    // merging test: "show joined letters too").
    return !require('./alphabet').groupAt(m[1], Number(m[2]))?.place;
};
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
    // And a unit's new lessons (more.js, 2026-11-14): a story, a conversation, a writing task, each in its skill.
    { id: 'stories', title: 'Stories', note: 'Picture stories and articles to read, with questions on them.', has: (l) => l.module === 'reading' && (!l.review || l.review === 'comic' || moreKind(l) === 'story') },
    { id: 'listening', title: 'Listening', note: 'Conversations to listen to, with questions and a role-play.', has: (l) => l.module === 'speaking' && (!l.review || moreKind(l) === 'listen') },
    { id: 'speaking', title: 'Speaking', note: 'Speak on a topic: every sentence corrected, with the reason.', has: (l) => l.review === 'talk' },
    { id: 'writing', title: 'Writing', note: 'Letters, emails and paragraphs, checked here.', has: (l) => l.review === 'write' || moreKind(l) === 'write' },
    { id: 'translation', title: 'Translation', note: 'Passages and sentences, both ways.', has: (l) => l.module === 'translation' },
    { id: 'words', title: 'Words & grammar', note: 'The section’s words and grammar, and their reviews.', has: (l) => ['vocabulary', 'grammar'].includes(l.module) }
];
const isTracked = (level) => TRACK_LEVELS.includes(level);
// A unit's new lesson's kind (more.js), read when asked (more.js needs this file's neighbours loaded first).
const moreKind = (l) => require('./more').moreKind(l);
// The lessons of a unit (2026-11-14, the user: "keep 6 lessons in each unit").
const UNIT_SIZE = 6;

/**
 * A level's lessons in units, in path order: [{ index, order, part, kind:
 * 'topic'|'review', title, lessons }]. `lessons` are the level's lessons as
 * the student has them.
 */
const unitsOf = (levelLessons) => {
    const topics = topicUnitsOf(levelLessons);
    if (!levelLessons.length || !isTracked(levelLessons[0].level)) return topics;
    // A track's lessons in the order the topic units had them (topic by topic), its level reviews last.
    // In units of six (2026-11-14, the user: "keep 6 lessons in each unit"; chose "split into units of 6"): "Words &
    // grammar 1", "Words & grammar 2"… — the same lessons, still one chain a skill (service.js `access`).
    const all = topics.flatMap((u) => u.lessons);
    const tracks = TRACKS.map((t) => ({ t, lessons: all.filter(t.has) })).filter((x) => x.lessons.length);
    return tracks.flatMap(({ t, lessons }, s) => {
        const n = Math.ceil(lessons.length / UNIT_SIZE);
        return Array.from({ length: n }, (_, k) => ({
            order: null, kind: 'track', track: t.id, skill: s + 1, skills: tracks.length, skillTitle: t.title, trackPart: k + 1, trackParts: n,
            title: n > 1 ? `${t.title} ${k + 1}` : t.title, note: t.note, lessons: lessons.slice(k * UNIT_SIZE, (k + 1) * UNIT_SIZE)
        }));
    }).map((u, i) => ({ index: i + 1, ...u }));
};

/** A level's lessons in topic units (Beginner's way, and Advanced's before 2026-10-29). */
const topicUnitsOf = (levelLessons) => {
    const byUnit = new Map();
    const levelReviews = [];
    for (const l of levelLessons) {
        // And the level review's new story (more.js, 2026-11-14).
        if (l.review && (LEVEL_REVIEWS.includes(l.review) || require('./more').inLevelReview(l))) { levelReviews.push(l); continue; }
        if (isHidden(l)) continue;
        // The Letters unit (alphabet.js) is unit 0, before the topics'.
        const order = l.review === 'letters' || l.review === 'lettersExam' ? 0 : Number(l.order) || 1, part = parts.partOf(l), key = `${order}:${part}`;
        if (!byUnit.has(key)) byUnit.set(key, { order, part, lessons: [] });
        byUnit.get(key).lessons.push(l);
    }
    // A talk (talks.js) comes after the unit's Speaking lesson.
    // A section's assessment (2026-10-29) is its very last stop.
    // The Letters lessons (alphabet.js, 2026-10-31) in their groups' order.
    // The letters test right after the All letters chart, before the Letters lessons (2026-11-13, user's choice).
    // A unit's new lessons (more.js) right after its Words lesson and its sentences.
    const rank = (l) => (l.review === 'lettersExam' ? -1 : l.review === 'more' ? require('./more').rankOf(l, MODULE_ORDER) : l.review === 'letters' ? (Number(String(l.seedKey || '').split('-').pop()) || 0) / 100 : l.review === 'assessment' ? 100 : l.review === 'unit' ? 99 : l.review === 'hear' ? 50 : l.review === 'talk' ? 3.5 : l.review === 'comic' ? MODULE_ORDER.indexOf('reading') + 0.5 : MODULE_ORDER.indexOf(l.module));
    const units = [...byUnit.values()].sort((a, b) => a.order - b.order || a.part - b.part).map(({ order, part, lessons: ls }, i) => {
        const sorted = ls.sort((a, b) => rank(a) - rank(b) || String(a.direction || '').localeCompare(String(b.direction || '')));
        const words = sorted.find((l) => l.module === 'vocabulary' && !l.review);
        // A new section's unit (2026-11-14): its own name ("At home").
        const title = sorted.every((l) => l.review === 'letters' || l.review === 'lettersExam') ? 'Letters' : parts.unitName(sorted[0].level, order, part) || require('./more').unitName(sorted[0].level, order, part) || (words ? topicOf(words.title) : topicOf(sorted.find((l) => !l.review)?.title)) || `Unit ${i + 1}`;
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
    if (l.review === 'checkpoint' || l.review === 'assessment' || l.review === 'lettersExam') return 'checkpoint';
    if (l.review === 'write') return 'writing';
    // A picture story (comics.js, 2026-10-31).
    if (l.review === 'comic') return 'comic';
    // A unit's new lesson (more.js, 2026-11-14): a lesson, not a review.
    if (l.review === 'more') return { story: 'story', listen: 'speaking', write: 'writing' }[moreKind(l)] || 'lesson';
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

/** All of its topic's sentences, both units' (2026-11-16, a short quiz made up to ten): as unitSentencesOf, not cut. */
const topicSentencesOf = (doc, helper) => {
    if (!doc) return null;
    const { localize } = require('./languages');
    const courses = require('./courses');
    const base = CONTENT.find((l) => l.module === 'translation' && l.level === doc.level && (Number(l.order) || 1) === (Number(doc.order) || 1));
    if (!base) return null;
    const unit = doc.course ? courses.build(courses.stubOf(doc.course, base), helper) : localize(base, helper);
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

module.exports = {
    isHidden, MODULE_ORDER, LEVEL_REVIEWS, TRACKS, TRACK_LEVELS, UNIT_SIZE, isTracked, unitsOf, pathOrder, warmupFor, unitWordsOf, unitSentencesOf, topicOf, typeOf, topicSentencesOf };
