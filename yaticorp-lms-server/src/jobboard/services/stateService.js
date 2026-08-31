/**
 * The cooldowns, made honest across restarts and instances.
 *
 * The standalone app kept its ingest cooldowns in Maps, which worked because
 * there was exactly one process and it never redeployed mid-day. Neither is
 * true of a hosted LMS: an in-memory cooldown resets on every deploy, and on a
 * two-instance host each instance re-ingests independently — both failure
 * modes spend metered provider calls to re-fetch what was just fetched.
 *
 * `claimRun` is the atomic form: exactly one caller wins the right to run a
 * task per cooldown window, decided by the database. The unique index on
 * `key` is what makes the race safe — a second claimant's upsert collides and
 * comes back told to stand down.
 */
const State = require('../models/State');

/** When `key` last ran, or null. Never throws — a state hiccup is not news. */
const lastRun = async (key) => {
    try {
        const row = await State.findOne({ key }).select('lastRunAt').lean();
        return row?.lastRunAt ?? null;
    } catch {
        return null;
    }
};

/**
 * Try to claim the next run of `key`.
 *
 * Returns { claimed, prev }: claimed=true means this caller owns the run and
 * the timestamp is already stamped (claim BEFORE the slow work, so a second
 * instance arriving mid-run reads a fresh stamp and stands down); prev is the
 * previous run time, for "everything since last run" work. claimed=false on a
 * fresh stamp, a lost race, or a database error — all of which mean the same
 * thing to the caller: not yours to run.
 */
const claimRun = async (key, minGapMs) => {
    const now = new Date();
    const cutoff = new Date(now.getTime() - minGapMs);
    try {
        const prev = await State.findOneAndUpdate(
            { key, $or: [{ lastRunAt: null }, { lastRunAt: { $lt: cutoff } }] },
            { $set: { lastRunAt: now } },
            { upsert: true }
        ).lean();
        return { claimed: true, prev: prev?.lastRunAt ?? null };
    } catch (err) {
        // Duplicate key: the document exists with a fresh timestamp (the $or
        // filter matched nothing, so the upsert tried to insert) — someone ran
        // recently, or is running right now.
        if (err.code === 11000) return { claimed: false, prev: null };
        return { claimed: false, prev: null };
    }
};

/** Stamp `key` as having run now, unconditionally. */
const markRun = async (key) => {
    try {
        await State.updateOne({ key }, { $set: { lastRunAt: new Date() } }, { upsert: true });
    } catch {
        /* bookkeeping only */
    }
};

module.exports = { lastRun, claimRun, markRun };
