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
    const courseStubs = [...require('./courses').stubs(), ...require('./reviews').stubs(), ...require('./parts').stubs(), ...require('./talks').stubs(), ...require('./alphabet').stubs(), ...require('./comics').stubs()];
    const haveStub = new Set((await LinguisticLesson.find({ seedKey: { $in: courseStubs.map((x) => x.seedKey) } }).select('seedKey').lean()).map((l) => l.seedKey));
    for (const stub of courseStubs) {
        if (haveStub.has(stub.seedKey)) continue;
        const r = await LinguisticLesson.updateOne({ seedKey: stub.seedKey }, { $setOnInsert: stub }, { upsert: true });
        if (r.upsertedCount) added++;
    }
    // The Letters lessons' titles kept as alphabet.js names them (2026-10-31).
    for (const st of require('./alphabet').stubs()) await LinguisticLesson.updateOne({ seedKey: st.seedKey, title: { $ne: st.title } }, { $set: { title: st.title } });
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
    if (added) console.log(`[linguistic] seeded ${added} lesson${added === 1 ? '' : 's'}`);
    return added;
};

/** Seed once per process; a failure is retried on the next request. */
const ensureSeeded = () => {
    if (!done) done = seed().catch((err) => { done = null; console.error('[linguistic] seeding failed:', err.message); });
    return done;
};

module.exports = { ensureSeeded, seed };
