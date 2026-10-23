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
    // The other languages' courses (courses.js) and every level's review lessons (reviews.js): their stubs, once each, by seedKey.
    const courseStubs = [...require('./courses').stubs(), ...require('./reviews').stubs()];
    const haveStub = new Set((await LinguisticLesson.find({ seedKey: { $in: courseStubs.map((x) => x.seedKey) } }).select('seedKey').lean()).map((l) => l.seedKey));
    for (const stub of courseStubs) {
        if (haveStub.has(stub.seedKey)) continue;
        const r = await LinguisticLesson.updateOne({ seedKey: stub.seedKey }, { $setOnInsert: stub }, { upsert: true });
        if (r.upsertedCount) added++;
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
