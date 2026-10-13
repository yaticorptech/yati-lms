/**
 * The lock on the Jobs section as a whole.
 *
 * Same shape as the Career Path gate: an administrator can close the section
 * from Platform Settings, and hiding the student tab is not enough on its own
 * because the endpoints stay reachable to anyone holding a student token and a
 * URL. Admin routes are mounted ahead of this, so locking the section does not
 * also stop an operator refreshing the index or reading the reporting.
 */
const Setting = require('../../models/Setting');

// The value changes only when an admin flips it, and that path clears this
// cache directly; the TTL is a backstop for a second server process holding a
// stale copy.
const TTL_MS = 30 * 1000;
let cached = null;
let cachedAt = 0;

const invalidateJobsSetting = () => {
    cached = null;
    cachedAt = 0;
};

const isJobsEnabled = async () => {
    if (cached !== null && Date.now() - cachedAt < TTL_MS) return cached;
    const settings = await Setting.findOne().select('isJobsEnabled').lean();
    // No settings document yet means nothing has been configured, and the
    // section ships open — same default as the schema.
    cached = settings ? settings.isJobsEnabled !== false : true;
    cachedAt = Date.now();
    return cached;
};

const requireJobsEnabled = async (req, res, next) => {
    try {
        if (await isJobsEnabled()) return next();
        // The demo cards see every section (services/fullAccess.js).
        if (await require('../../services/fullAccess').fullAccessFromRequest(req)) return next();
        // 403, not 404: the section exists and the student's token is fine.
        return res.status(403).json({
            code: 'JOBS_LOCKED',
            error: 'Jobs is currently unavailable. Please check back later.'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * The student's own lock: five Career Path skills at 25% or more, or an
 * exempt account (services/jobsAccess, the same answer the page gets from
 * GET /user/jobs-access). Mounted after protectUser.
 *
 * An open answer is remembered for a minute, so a page that makes a dozen
 * calls asks once; a locked one is asked again every time, so a student who
 * has just reached the fifth skill is let in at once.
 */
const OPEN_TTL_MS = 60 * 1000;
const openUntil = new Map();
const requireJobsAccess = async (req, res, next) => {
    try {
        const key = String(req.user?._id || '');
        if (key && (openUntil.get(key) || 0) > Date.now()) return next();
        const access = await require('../../services/jobsAccess').jobsAccessFor(req.user);
        if (access.open) {
            if (openUntil.size > 5000) openUntil.clear();
            openUntil.set(key, Date.now() + OPEN_TTL_MS);
            return next();
        }
        return res.status(403).json({
            code: 'JOBS_SKILLS_LOCKED',
            error: `Jobs opens once ${access.required.skills} of your Career Path skills are at ${access.required.percent}% or more. You have ${access.ready}.`,
            ready: access.ready,
            required: access.required
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { requireJobsEnabled, requireJobsAccess, isJobsEnabled, invalidateJobsSetting };
