/**
 * Which verification steps an administrator currently requires (Platform
 * Settings → Job Verification). Cached the same way as the section lock; the
 * admin save path clears it so a change reaches students at once.
 */
const Setting = require('../../models/Setting');
const DEFAULTS = Object.freeze({ requireAadhaar: true, requireLinkedin: true, requireResume: false, requireLocation: true, requireSkills: true });
const TTL_MS = 30 * 1000;
let cached = null, cachedAt = 0;
const invalidateRequirements = () => { cached = null; cachedAt = 0; };
const getRequirements = async () => {
    if (cached && Date.now() - cachedAt < TTL_MS) return cached;
    let stored = null;
    try { stored = (await Setting.findOne().select('jobVerification').lean())?.jobVerification || null; } catch (e) { console.warn('[jobs:verification] requirements read failed, using defaults:', e.message); }
    cached = { ...DEFAULTS };
    for (const k of Object.keys(DEFAULTS)) if (stored && typeof stored[k] === 'boolean') cached[k] = stored[k];
    cachedAt = Date.now();
    return cached;
};
module.exports = { DEFAULTS, getRequirements, invalidateRequirements };
