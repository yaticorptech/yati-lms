/**
 * No question twice in a unit (2026-11-18, the user: "don't repeat the questions in the same unit").
 *
 * Each lesson's quiz is filled up to ten (service.js withQuizTopUp) from its unit's sentences — every lesson of a unit
 * from the same ones, so the same "Tap what you hear: My family is big." came in three lessons of one unit. Here a
 * unit's lessons are taken in path order, from the lessons as they are seeded (content/ and every stub, as seed.js
 * puts them in the database — so it is the same every time a lesson is shown and when its answers are checked): what
 * each asks is noted, and a later lesson asks none of it again (service.js `serveOwn`).
 */
let all = null;
/** Every seeded lesson (as seed.js), read once. */
const seeded = () => {
    if (all) return all;
    const content = require('./content').lessons.map((l) => ({ ...l, status: 'published' }));
    const stubs = [...require('./courses').stubs(), ...require('./reviews').stubs(), ...require('./parts').stubs(), ...require('./talks').stubs(),
        ...require('./alphabet').stubs(), ...require('./comics').stubs(), ...require('./more').stubs()];
    all = [...content, ...stubs];
    return all;
};
const byCourse = new Map();
/** A course's seeded lessons by level: { level: [lessons] }. */
const levelsOf = (course) => {
    const c = course || null;
    if (!byCourse.has(c)) {
        const out = {};
        for (const l of seeded()) if ((l.course || null) === c) (out[l.level] = out[l.level] || []).push(l);
        byCourse.set(c, out);
    }
    return byCourse.get(c);
};
const peerCache = new Map();
// Each seeded lesson's id in the database (seed.js, once seeded): a review draws its questions by it.
let ids = new Map(), version = 0;
const setIds = (rows) => { ids = new Map((rows || []).map((r) => [r.seedKey, r._id])); version += 1; peerCache.clear(); };
const idsVersion = () => version;
/**
 * The lessons of `doc`'s unit as a student speaking `helper` has them, in path order (seedKeys), or null (a lesson
 * not seeded, an administrator's own).
 */
const peersOf = (doc, helper) => {
    if (!doc?.seedKey || !doc.level) return null;
    const course = doc.course || null;
    const ck = `${course}|${doc.level}|${helper}`;
    if (!peerCache.has(ck)) {
        const units = require('./units');
        const alphabet = require('./alphabet');
        const more = require('./more');
        const skip = course ? [] : require('./languages').skipsOf(helper || 'kn');
        const level = (levelsOf(course)[doc.level] || []).filter((l) => l.review !== 'entry' && alphabet.inUse(l) && more.usable(l, helper) && !units.isHidden(l) && !skip.includes(l.module));
        const map = new Map();
        for (const u of units.unitsOf(level)) {
            const lessons = u.lessons.map((l) => (ids.has(l.seedKey) ? { ...l, _id: ids.get(l.seedKey) } : l));
            for (const l of lessons) map.set(l.seedKey, lessons);
        }
        peerCache.set(ck, map);
    }
    return peerCache.get(ck).get(doc.seedKey) || null;
};

module.exports = { peersOf, seeded, setIds, idsVersion };
