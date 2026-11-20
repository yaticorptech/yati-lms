/**
 * Linguistic Ability — putting the predefined lessons (content/) into the
 * database, so the section works the first time it is opened.
 *
 * Each seeded lesson is added once, by its seedKey, and never again: an
 * administrator's edits stand, and a lesson they delete is kept hidden (its
 * deletedAt), so it is not brought back either. Every lesson passes the same
 * check an administrator's would (validate.js); one that fails is skipped
 * and logged rather than saved half-formed.
 *
 * ensureSeeded() runs once per server process, on the first request that
 * needs lessons.
 */
const { LinguisticLesson } = require('./models');
const { validateLesson } = require('./validate');
const { lessons } = require('./content');

let done = null;

const seed = async () => {
    const keys = lessons.map((l) => l.seedKey);
    const have = new Set((await LinguisticLesson.find({ seedKey: { $in: keys } }).select('seedKey').lean()).map((l) => l.seedKey));
    let added = 0;
    for (const lesson of lessons) {
        if (have.has(lesson.seedKey)) continue;
        const { value, errors } = validateLesson({ ...lesson, status: 'published' });
        if (errors.length) { console.warn(`[linguistic] seed lesson ${lesson.seedKey} skipped:`, errors.join(' ')); continue; }
        const r = await LinguisticLesson.updateOne({ seedKey: lesson.seedKey }, { $setOnInsert: { ...value, seedKey: lesson.seedKey, updatedBy: 'Seed content' } }, { upsert: true });
        if (r.upsertedCount) added++;
    }
    // The other languages' courses (courses.js), every level's review lessons (reviews.js), the topics' second units (parts.js)
    // and the Advanced talks (talks.js): their stubs, once each, by seedKey.
    // And every course's Letters unit (alphabet.js, 2026-10-31).
    const courseStubs = [...require('./courses').stubs(), ...require('./reviews').stubs(), ...require('./parts').stubs(), ...require('./talks').stubs(), ...require('./alphabet').stubs(), ...require('./comics').stubs(), ...require('./more').stubs()];
    const haveStub = new Set((await LinguisticLesson.find({ seedKey: { $in: courseStubs.map((x) => x.seedKey) } }).select('seedKey').lean()).map((l) => l.seedKey));
    for (const stub of courseStubs) {
        if (haveStub.has(stub.seedKey)) continue;
        const r = await LinguisticLesson.updateOne({ seedKey: stub.seedKey }, { $setOnInsert: stub }, { upsert: true });
        if (r.upsertedCount) added++;
    }
    // The assessments' and entry tests' titles as the sections are named now (2026-11-18: Beginner and Advanced only).
    for (const [level, label] of Object.entries(require('./levels').LEVEL_LABEL)) {
        for (const [review, title] of [['assessment', `${label} assessment`], ['entry', `${label} entry test`]]) await LinguisticLesson.updateMany({ review, level, seedKey: { $exists: true }, title: { $ne: title } }, { $set: { title } });
    }
    // The Letters lessons' titles kept as alphabet.js names them (2026-10-31).
    for (const st of require('./alphabet').stubs()) await LinguisticLesson.updateOne({ seedKey: st.seedKey, title: { $ne: st.title } }, { $set: { title: st.title } });
    // And the picture stories' (2026-11-07: story 2 became Meera's Kite; the courses still telling the old one keep its title).
    const { LANGS: COMIC_LANGS } = require('./content/comicLangs');
    for (const st of require('./comics').stubs()) {
        await LinguisticLesson.updateOne({ seedKey: st.seedKey, title: { $ne: st.title } }, { $set: { title: st.title } });
    }
    // A story film's summary as a film's (2026-11-20, the user: "that is a video"): where it still says "A story in pictures"
    // (an administrator's edit stands).
    const COMICS = require('./comics');
    await LinguisticLesson.updateMany({ review: 'comic', order: { $in: COMICS.STORIES.filter((x) => x.film).map((x) => x.order) }, summary: COMICS.SUMMARY }, { $set: { summary: COMICS.FILM_SUMMARY } });
    // Three Silver Coins removed (2026-11-12, user: "remove that silver coins story"): the courses that still told it as
    // story 2 have no story 2 now — their stored lessons taken off the path (kept as drafts, so progress records stay whole).
    const told = new Set(Object.keys(COMIC_LANGS[2] || {}).map((c) => `${c}:comic-advanced-2`));
    await LinguisticLesson.updateMany({ review: 'comic', order: 2, course: { $ne: null }, seedKey: { $regex: /:comic-advanced-2$/, $nin: [...told] }, status: 'published' }, { $set: { status: 'draft' } });
    // A unit review no longer starts with matching pairs (2026-10-29, pairs once a unit): its stubs' summary says so.
    const { UNIT } = require('./reviews');
    await LinguisticLesson.updateMany({ review: 'unit', summary: 'This unit’s words again: match the pairs, then a quick quiz with listening.' }, { $set: { summary: UNIT.summary } });
    // Section 1's two general translation lessons, now on their units' topics (2026-11-04, "the unit says Family, the
    // content inside is different"): replaced where the seeded lesson is as it was seeded (an administrator's edit stands).
    const WAS = { 'translation-beginner-kn-en': 'Daily conversation: Kannada → English', 'translation-beginner-en-kn': 'Everyday words: English → Kannada' };
    for (const lesson of lessons.filter((l) => WAS[l.seedKey])) {
        const { value, errors } = validateLesson({ ...lesson, status: 'published' });
        if (errors.length) continue;
        await LinguisticLesson.updateOne({ seedKey: lesson.seedKey, updatedBy: 'Seed content', title: WAS[lesson.seedKey] },
            { $set: { title: value.title, summary: value.summary, items: value.items, quiz: value.quiz } });
    }
    // The Beginner speaking tasks made easier (2026-11-18, the user: "don't make speaking difficult in Beginner — keep it, a
    // little easy"): where a lesson is as seeded, still asking for 4 or 5 sentences, its task as now written (an edit stands).
    const HARDER = {
        "speaking-beginner-1": "Introduce yourself in 4 or 5 sentences: your name, where you are from, what you study, and one hobby.",
        "speaking-beginner-2": "Imagine you are at a shop. Ask the price of two things, buy them, and say thank you.",
        "speaking-beginner-3": "Ask about a bus in 4 or 5 sentences: say \"Excuse me\", ask which bus goes to a place, when it leaves and how much the ticket is, and say thank you.",
        "speaking-beginner-4": "Make a plan with a friend in 4 or 5 sentences: ask if your friend is free, say where you want to go, suggest a time and a place to meet, and say goodbye."
    };
    for (const lesson of lessons.filter((l) => HARDER[l.seedKey])) {
        const { value, errors } = validateLesson({ ...lesson, status: 'published' });
        if (errors.length || !value.speaking) continue;
        await LinguisticLesson.updateOne({ seedKey: lesson.seedKey, updatedBy: 'Seed content', 'speaking.prompt': HARDER[lesson.seedKey] }, { $set: { speaking: value.speaking } });
    }
    // Asha's email on her interview (2026-11-19, the user: "one topic in a unit — ask on it"): where the lesson is as seeded
    // and still asks for a leave request to a teacher, its writing as now written (an administrator's edit stands).
    for (const lesson of lessons.filter((l) => l.seedKey === 'reading-intermediate-2')) {
        const { value, errors } = validateLesson({ ...lesson, status: 'published' });
        if (errors.length || !value.writing?.length) continue;
        const w2 = value.writing.find((t) => t.id === 'w2');
        await LinguisticLesson.updateOne({ seedKey: lesson.seedKey, updatedBy: 'Seed content', 'writing.prompt': /one day's leave because you are unwell|^Imagine you are Asha/, writing: { $not: { $elemMatch: { id: 'w2', model: w2.model } } } }, { $set: { writing: value.writing } });
    }
    // One short sentence to read in each Section 1 unit (2026-11-04): added to the four lessons as seeded (an edit stands).
    for (const lesson of lessons.filter((l) => ['translation-beginner-kn-en', 'translation-beginner-en-kn', 'translation-beginner-3', 'translation-beginner-4'].includes(l.seedKey))) {
        const { value, errors } = validateLesson({ ...lesson, status: 'published' });
        if (errors.length) continue;
        // Until its last one is there as written — with its own direction where it has one.
        const last = value.items.find((x) => x.id === 'i8');
        if (!last) continue;
        await LinguisticLesson.updateOne({ seedKey: lesson.seedKey, updatedBy: 'Seed content', items: { $not: { $elemMatch: { id: 'i8', model: last.model, ...(last.direction ? { direction: last.direction } : {}) } } } }, { $set: { items: value.items } });
    }
    // The interview's last question answered (2026-11-06, the user: "where is the answer for his question?"): the
    // conversation as now written, where it is as seeded and still ends on his question (an administrator's edit stands).
    for (const lesson of lessons.filter((l) => l.seedKey === 'speaking-advanced-1')) {
        const { value, errors } = validateLesson({ ...lesson, status: 'published' });
        if (errors.length || !value.learn?.dialogue?.lines?.length) continue;
        await LinguisticLesson.updateOne({ seedKey: lesson.seedKey, updatedBy: 'Seed content', 'learn.dialogue.lines.10': { $exists: false } }, { $set: { 'learn.dialogue': value.learn.dialogue } });
    }
    // Each seeded lesson's id, for its unit's plan (unitPlan.js: a review's questions are drawn by its id, 2026-11-18).
    require('./unitPlan').setIds(await LinguisticLesson.find({ seedKey: { $exists: true } }).select('seedKey').lean());
    if (added) console.log(`[linguistic] seeded ${added} lesson${added === 1 ? '' : 's'}`);
    return added;
};

/** Seed once per process; a failure is retried on the next request. */
const ensureSeeded = () => {
    if (!done) done = seed().catch((err) => { done = null; console.error('[linguistic] seeding failed:', err.message); });
    return done;
};

module.exports = { ensureSeeded, seed };
