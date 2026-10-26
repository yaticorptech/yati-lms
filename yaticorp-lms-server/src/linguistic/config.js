/**
 * Linguistic Ability — the settings an administrator can change, kept on the
 * platform's one Setting document (Setting.linguistic) beside the other
 * section switches, rather than in a table of their own.
 *
 *   passingScore         the quiz score (%) that completes a lesson, per level
 *   certificateMinAverage the average best score (%) over a level's lessons
 *                         needed for its certificate, once every lesson is done
 *   dailyChallengeSize   how many questions the daily vocabulary challenge asks
 *
 * Points are not here: they are Reward rules (the linguistic_* activities),
 * set on the admin Rewards page like every other activity's XP.
 */
const Setting = require('../models/Setting');

const DEFAULTS = Object.freeze({
    passingScore: { beginner: 60, intermediate: 70, advanced: 75 },
    certificateMinAverage: 70,
    dailyChallengeSize: 5
});

const TTL_MS = 30 * 1000;
let cached = null;
let cachedAt = 0;
const invalidate = () => { cached = null; cachedAt = 0; };

const merge = (stored = {}) => ({
    passingScore: { ...DEFAULTS.passingScore, ...(stored.passingScore || {}) },
    certificateMinAverage: stored.certificateMinAverage ?? DEFAULTS.certificateMinAverage,
    dailyChallengeSize: stored.dailyChallengeSize ?? DEFAULTS.dailyChallengeSize
});

const getConfig = async () => {
    if (cached && Date.now() - cachedAt < TTL_MS) return cached;
    const s = await Setting.findOne().select('linguistic').lean();
    cached = merge(s?.linguistic || {});
    cachedAt = Date.now();
    return cached;
};

/** Check and save a change; returns { config } or { error }. */
const updateConfig = async (body = {}) => {
    const next = merge((await Setting.findOne().select('linguistic').lean())?.linguistic || {});
    const pct = (v) => { const n = Number(v); return Number.isFinite(n) && n >= 0 && n <= 100 ? Math.round(n) : null; };
    if (body.passingScore && typeof body.passingScore === 'object') {
        for (const level of Object.keys(DEFAULTS.passingScore)) {
            if (body.passingScore[level] === undefined) continue;
            const n = pct(body.passingScore[level]);
            if (n === null || n < 30) return { error: 'A passing score must be between 30% and 100%.' };
            next.passingScore[level] = n;
        }
    }
    if (body.certificateMinAverage !== undefined) {
        const n = pct(body.certificateMinAverage);
        if (n === null) return { error: 'The certificate average must be between 0% and 100%.' };
        next.certificateMinAverage = n;
    }
    if (body.dailyChallengeSize !== undefined) {
        const n = Math.round(Number(body.dailyChallengeSize));
        if (!Number.isFinite(n) || n < 3 || n > 15) return { error: 'The daily challenge must ask between 3 and 15 questions.' };
        next.dailyChallengeSize = n;
    }
    await Setting.updateOne({}, { $set: { linguistic: next } }, { upsert: true });
    invalidate();
    return { config: next };
};

/* ── The section's on/off switch (Setting.isLinguisticEnabled) ────────── */

let gateCached = null;
let gateAt = 0;
const invalidateLinguisticSetting = () => { gateCached = null; gateAt = 0; };
const isLinguisticEnabled = async () => {
    if (gateCached !== null && Date.now() - gateAt < TTL_MS) return gateCached;
    const s = await Setting.findOne().select('isLinguisticEnabled').lean();
    gateCached = s ? s.isLinguisticEnabled !== false : true;
    gateAt = Date.now();
    return gateCached;
};
/** In front of every student route: a locked section answers 403, like Career Path's. */
const requireLinguisticEnabled = async (req, res, next) => {
    try {
        if (await isLinguisticEnabled()) return next();
        if (await require('../services/fullAccess').fullAccessFromRequest(req)) return next();
        return res.status(403).json({ code: 'LINGUISTIC_LOCKED', message: 'Language Learning is currently unavailable. Please check back later.' });
    } catch (error) { next(error); }
};

module.exports = { DEFAULTS, getConfig, updateConfig, invalidate, isLinguisticEnabled, requireLinguisticEnabled, invalidateLinguisticSetting };
