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
        // 403, not 404: the section exists and the student's token is fine.
        return res.status(403).json({
            code: 'JOBS_LOCKED',
            error: 'Jobs is currently unavailable. Please check back later.'
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { requireJobsEnabled, isJobsEnabled, invalidateJobsSetting };
