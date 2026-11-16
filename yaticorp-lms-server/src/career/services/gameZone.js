/**
 * The student's games zone (2026-11-13, age-based brain training): from the school class they gave in Career Path's
 * roadmap onboarding (career_goals: educationLevel + currentClass). Sign-up does not ask for a class, so this is the
 * one place it is known; nothing is asked again here.
 *
 *   Classes 1–5   → young  (Young Thinkers)   bands: foundation (1–2), developing (3–5)
 *   Classes 6–10  → smart  (Rising Brains)   bands: intermediate (6–8), analytical (9–10)
 *   Classes 11–12 → master (Master Minds)     band:  advanced
 *   Diploma, Undergraduate, Postgraduate, Working Professional → master / advanced (decided 2026-11-13)
 *
 * The class is kept apart from game difficulty: this only says which zone and band a student starts in. Pure, so it
 * is tested on its own (tests/career/gameZone.test.js).
 */

const ZONES = ['young', 'smart', 'master'];
const BEYOND_SCHOOL = ['Diploma', 'Undergraduate', 'Postgraduate', 'Working Professional'];

/** The class number in "Class 10", "10", "class 7th", "X"… or null. */
const classNumber = (value) => {
    const s = String(value || '').trim();
    const n = s.match(/\d{1,2}/);
    if (n) { const k = Number(n[0]); return k >= 1 && k <= 12 ? k : null; }
    const roman = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12 };
    const r = s.toLowerCase().replace(/^class\s*/, '').replace(/(st|nd|rd|th)$/, '');
    return roman[r] || null;
};

/** The class a level alone implies, when no class was given (its middle, so the band is a fair guess). */
const LEVEL_CLASS = {
    'Primary School (Class 1–5)': 3,
    'Middle School (Class 6–8)': 7,
    'High School (Class 9–10)': 9,
    'Higher Secondary (Class 11–12)': 11
};

const bandOf = (cls) => (cls <= 2 ? 'foundation' : cls <= 5 ? 'developing' : cls <= 8 ? 'intermediate' : cls <= 10 ? 'analytical' : 'advanced');
const zoneOfClass = (cls) => (cls <= 5 ? 'young' : cls <= 10 ? 'smart' : 'master');

/**
 * { zone, band, classNumber, educationLevel, source } — source: 'class' (the class given), 'level' (only the level),
 * 'beyond-school' (college or work), or 'unknown' (no roadmap onboarding yet: zone and band null).
 */
const zoneFor = (goal) => {
    const educationLevel = goal?.educationLevel || null;
    if (BEYOND_SCHOOL.includes(educationLevel)) return { zone: 'master', band: 'advanced', classNumber: null, educationLevel, source: 'beyond-school' };
    const given = classNumber(goal?.currentClass);
    if (given) return { zone: zoneOfClass(given), band: bandOf(given), classNumber: given, educationLevel, source: 'class' };
    const implied = LEVEL_CLASS[educationLevel];
    if (implied) return { zone: zoneOfClass(implied), band: bandOf(implied), classNumber: null, educationLevel, source: 'level' };
    return { zone: null, band: null, classNumber: null, educationLevel, source: 'unknown' };
};

/* ---- The zone held on the account (2026-11-14, class tampering) -----------------------------------------------
 *
 * zoneFor() reads the class as the student typed it, and the student can retype it whenever they like. The games
 * therefore use effectiveZone(): the zone held on the account (models/GameZoneLock.js), which follows the class
 * down or sideways at once, but up only one zone per academic year (April–March, the Indian school year) — a real
 * promotion, or a class mistyped at onboarding, fits; "Class 12 today, Class 4 tomorrow, Class 12 again" does not.
 * A blocked change is kept as `pending` for an administrator to confirm. The Career Path roadmap is not affected.
 */

/** The academic year a date falls in: '2026' for April 2026 – March 2027. */
const academicYear = (d = new Date()) => String(d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1);

const pick = (z) => ({ zone: z?.zone ?? null, band: z?.band ?? null, classNumber: z?.classNumber ?? null, educationLevel: z?.educationLevel ?? null, source: z?.source ?? 'unknown' });

/**
 * Pure: what the zone is, given the class's zone (`asked`, a zoneFor result) and the held record (`lock`, or null),
 * in academic year `year`. → { result: { zone, band, classNumber, educationLevel, source, held, pending }, change }
 * where `change` is null (nothing to write) or { kind: 'create'|'same'|'down'|'up'|'hold', ... }.
 */
const decide = (asked, lock, year) => {
    const view = (z, held = false, pending = null) => ({ ...pick(z), held, pending: pending ? pick(pending) : null });
    if (!lock?.zone) return { result: view(asked), change: asked.zone ? { kind: 'create' } : null };
    if (!asked.zone) return { result: view(lock, true, lock.pending), change: null };
    const gap = ZONES.indexOf(asked.zone) - ZONES.indexOf(lock.zone);
    if (gap === 0) {
        const same = ['band', 'classNumber', 'educationLevel', 'source'].every((k) => (lock[k] ?? null) === (asked[k] ?? null));
        return { result: view(asked), change: same && !lock.pending ? null : { kind: 'same' } };
    }
    if (gap < 0) return { result: view(asked), change: { kind: 'down' } };
    if (gap === 1 && lock.raisedInYear !== year) return { result: view(asked), change: { kind: 'up' } };
    const known = lock.pending && lock.pending.zone === asked.zone && (lock.pending.classNumber ?? null) === (asked.classNumber ?? null);
    return { result: view(lock, true, asked), change: known ? null : { kind: 'hold' } };
};

/**
 * The student's games zone, as the games enforce it: { zone, band, classNumber, educationLevel, source, held,
 * pending }. `held` true when the zone shown is the one on the account rather than the current class's; `pending`
 * the higher zone the class asks for, until it is allowed. Writes the held record as needed.
 */
const effectiveZone = async (userId, now = new Date(), attempt = 0) => {
    const Goal = require('../models/Goal');
    const Lock = require('../models/GameZoneLock');
    const [goal, lock] = await Promise.all([
        Goal.findOne({ userId }).select('educationLevel currentClass').lean(),
        Lock.findOne({ userId }).lean()
    ]);
    const asked = zoneFor(goal);
    const year = academicYear(now);
    const { result, change } = decide(asked, lock, year);
    if (!change) return result;

    const entry = (by) => ({ $push: { history: { $each: [{ from: lock?.zone ?? null, to: asked.zone, classNumber: asked.classNumber, at: now, by }], $slice: -20 } } });
    if (change.kind === 'create') {
        try {
            await Lock.updateOne({ userId }, { $setOnInsert: { ...pick(asked), pending: null, history: [{ from: null, to: asked.zone, classNumber: asked.classNumber, at: now, by: 'class' }] } }, { upsert: true });
        } catch (e) { if (e?.code !== 11000) throw e; }
        return result;
    }
    if (change.kind === 'hold') {
        await Lock.updateOne({ _id: lock._id }, { $set: { pending: { ...pick(asked), at: now } } });
        return result;
    }
    // same / down / up: the held zone follows the class. Conditional on the record not having moved meanwhile, so two
    // racing requests cannot both spend this year's one step up.
    const set = { ...pick(asked), pending: null, ...(change.kind === 'up' ? { raisedInYear: year } : {}) };
    const r = await Lock.updateOne(
        { _id: lock._id, zone: lock.zone, raisedInYear: lock.raisedInYear ?? null },
        { $set: set, ...(change.kind === 'same' ? {} : entry('class')) }
    );
    if (!r.modifiedCount && !r.matchedCount && attempt < 2) return effectiveZone(userId, now, attempt + 1);
    return result;
};

/** Each user's enforced zone without writing anything (leaderboards): Map(userId → zone or null). */
const effectiveZones = async (userIds, now = new Date()) => {
    const Goal = require('../models/Goal');
    const Lock = require('../models/GameZoneLock');
    const [goals, locks] = await Promise.all([
        Goal.find({ userId: { $in: userIds } }).select('userId educationLevel currentClass').lean(),
        Lock.find({ userId: { $in: userIds } }).lean()
    ]);
    const goalBy = new Map(goals.map((g) => [String(g.userId), g]));
    const lockBy = new Map(locks.map((l) => [String(l.userId), l]));
    const year = academicYear(now);
    return new Map(userIds.map((id) => [String(id), decide(zoneFor(goalBy.get(String(id))), lockBy.get(String(id)) || null, year).result.zone]));
};

/** An administrator accepts the pending zone (the class change that was held). → the new state, or null if none. */
const confirmPending = async (userId, adminId = null, now = new Date()) => {
    const Lock = require('../models/GameZoneLock');
    const lock = await Lock.findOne({ userId }).lean();
    if (!lock?.pending?.zone) return null;
    await Lock.updateOne({ _id: lock._id, 'pending.zone': lock.pending.zone }, {
        $set: { ...pick(lock.pending), pending: null },
        $push: { history: { $each: [{ from: lock.zone, to: lock.pending.zone, classNumber: lock.pending.classNumber ?? null, at: now, by: `admin${adminId ? `:${adminId}` : ''}` }], $slice: -20 } }
    });
    return effectiveZone(userId, now);
};

module.exports = { ZONES, zoneFor, classNumber, bandOf, academicYear, decide, effectiveZone, effectiveZones, confirmPending };
