/**
 * Linguistic Ability — shorter units (asked 2026-10-24: "make more units in
 * each section for each language"). Each topic of a level is cut in two
 * units, so a section has four short units and its review where it had two
 * long ones:
 *
 *   Home and family   →  Unit 1 · Family                   Words (4) · Grammar · Translation (3) · Listening · Unit review
 *                        Unit 2 · Food, size and feelings  Words (4) · Story · Speaking · Translation (3) · Listening · Unit review
 *
 * Nothing new is written or translated: a topic's Words and Translation
 * lessons are shared out between its two units (the first half of the words
 * and sentences in the first, the rest in the second), and its Grammar,
 * Story and Speaking lessons each sit in one of them. So every language's
 * course gets the same units at once.
 *
 * The topic's own lessons stay as they are (with the students' progress on
 * them) and become the first unit's; the second unit's are stubs, kept like
 * any course or review lesson (seedKey "vocab-beginner-1~2",
 * "hi:vocab-beginner-1~2", "review-unit-beginner-1~2") and made whole when
 * served, from the seeded lessons.
 */
const { lessons: CONTENT } = require('./content');

const PARTS = [1, 2];
// A topic's whole lessons: the unit of the two they sit in. The rest are cut in two.
const PLACE = { grammar: 1, reading: 2, speaking: 2 };
const CUT = ['vocabulary', 'translation'];

// Each topic's two units, by its Words lesson.
const NAMES = {
    'vocab-beginner-1': ['Family', 'Food, size and feelings'],
    'vocab-beginner-2': ['School and friends', 'Read and write'],
    'vocab-intermediate-1': ['Character', 'Feelings'],
    'vocab-intermediate-2': ['Plans and goals', 'Teamwork and results'],
    'vocab-advanced-1': ['Working together', 'Making your case'],
    'vocab-advanced-2': ['Big ideas', 'Values and society'],
    ...require('./content/topics').names
};

const orderOf = (l) => Number(l.order) || 1;
const byKey = new Map(CONTENT.map((l) => [l.seedKey, l]));
const keyOf = (part) => (part > 1 ? `~${part}` : '');

/** The unit of its topic a lesson sits in: 1 or 2. */
const partOf = (l) => Number(l.part) || PLACE[l.module] || 1;

/** A topic's Words lesson, as seeded: the level's vocabulary lesson of that order. */
const topicWords = (level, order) => CONTENT.find((l) => l.module === 'vocabulary' && l.level === level && orderOf(l) === order) || null;

/** A unit's name: the topic's own name for it, else the topic and the unit's number. */
const unitName = (level, order, part) => {
    const words = topicWords(level, order);
    if (!words) return null;
    return NAMES[words.seedKey]?.[part - 1] || `${String(words.title).split(':')[0].trim()} ${part}`;
};

/**
 * The seeded lesson a lesson's words or sentences are cut from: its own (an
 * English lesson, by its seedKey; a course or second-unit lesson, by its
 * base), or for a unit's review and listening, the topic's Words lesson.
 * None for a lesson that is not cut (grammar, an administrator's own…).
 */
const sourceOf = (doc) => {
    if (!doc) return null;
    if (doc.review === 'unit' || doc.review === 'hear') return topicWords(doc.level, orderOf(doc));
    if (doc.review || !CUT.includes(doc.module)) return null;
    const l = byKey.get(doc.base || doc.seedKey);
    return l && CUT.includes(l.module) ? l : null;
};

/** What a topic's second unit takes from a seeded lesson: its English words, or its sentences' ids. */
const halfOf = (list) => list.slice(Math.ceil(list.length / 2));
const secondOf = (source) => ({
    words: new Set(halfOf(source.words || []).map((w) => w.word)),
    items: new Set(halfOf(source.items || []).map((x) => x.id)),
    quiz: new Set(halfOf(source.quiz || []).map((x) => x.id))
});

/** A lesson's title in its unit: a Words lesson is named after its unit; a translation numbered ("Daily conversation 2: …"). */
const titleOf = (doc) => {
    const source = sourceOf(doc);
    if (!source || doc.review) return doc.title;
    const part = partOf(doc);
    // An English lesson an administrator has renamed keeps their name.
    if (!doc.course && part === 1 && doc.title !== source.title) return doc.title;
    if (doc.module === 'vocabulary') return unitName(doc.level, orderOf(doc), part) || doc.title;
    const base = doc.course ? require('./courses').stubOf(doc.course, source).title : source.title;
    const at = base.indexOf(':');
    return at > 0 ? `${base.slice(0, at)} ${part}${base.slice(at)}` : `${base} ${part}`;
};

/**
 * A served lesson (`out`, made from `doc`) cut to its unit's share: the words
 * (an English lesson's by the word, a course's by the English word they come
 * from) or the sentences. A lesson that is not cut comes back as it is.
 */
const cut = (out, doc) => {
    const source = out && sourceOf(doc);
    if (!source) return out;
    const second = secondOf(source);
    const mine = (inSecond) => (partOf(doc) > 1 ? inSecond : !inSecond);
    const res = { ...out, title: titleOf(doc) };
    if (out.words) res.words = out.words.filter((w) => mine(second.words.has(w.en || w.word)));
    if (out.items && doc.module === 'translation') res.items = out.items.filter((x) => mine(second.items.has(x.id)));
    if (out.quiz && doc.module === 'translation') res.quiz = out.quiz.filter((x) => mine(second.quiz.has(x.id)));
    return res;
};

/** The second units' stubs of the English course's Words and Translation lessons. */
const stubs = () => CONTENT.filter((l) => CUT.includes(l.module)).flatMap((l) => PARTS.slice(1).map((part) => {
    const stub = {
        seedKey: `${l.seedKey}${keyOf(part)}`, course: null, base: l.seedKey, part, module: l.module, level: l.level, order: l.order,
        title: l.title, summary: l.summary, status: 'published', updatedBy: 'Course content', direction: l.direction || null, learn: {}
    };
    return { ...stub, title: titleOf(stub) };
}));

/** A course lesson's stub (courses.stubOf) for the second unit of its topic. */
const courseStub = (stub, part) => {
    const s = { ...stub, seedKey: `${stub.seedKey}${keyOf(part)}`, part };
    return { ...s, title: titleOf(s) };
};

module.exports = { PARTS, PLACE, NAMES, partOf, unitName, sourceOf, titleOf, cut, stubs, courseStub, keyOf };
