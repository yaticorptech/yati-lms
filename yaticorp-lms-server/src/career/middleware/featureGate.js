/**
 * The lock on Career Path as a whole.
 *
 * An administrator can close this section from Platform Settings. Hiding the
 * tab in the student app is not enough on its own — the endpoints stay reachable
 * to anyone holding a student token and a URL — so the gate lives here, in front
 * of every student route in the module.
 *
 * Admin reporting is mounted ahead of this deliberately: locking the section
 * stops students using it, and does not blind the operator who locked it.
 */
const Setting = require('../../models/Setting');

// Every career request would otherwise cost an extra findOne. The value changes
// only when an admin flips it, and that path clears this cache directly, so the
// TTL is just a backstop for a second server process holding a stale copy.
const TTL_MS = 30 * 1000;
let cached = null;
let cachedAt = 0;

const invalidateCareerSetting = () => {
    cached = null;
    cachedAt = 0;
};

const isCareerPathEnabled = async () => {
    if (cached !== null && Date.now() - cachedAt < TTL_MS) return cached;
    const settings = await Setting.findOne().select('isCareerPathEnabled').lean();
    // No settings document yet means nothing has ever been configured, and the
    // section ships open — same default as the schema.
    cached = settings ? settings.isCareerPathEnabled !== false : true;
    cachedAt = Date.now();
    return cached;
};

const requireCareerPathEnabled = async (req, res, next) => {
    try {
        if (await isCareerPathEnabled()) return next();
        // 403, not 404: the section exists and the student's token is fine. The
        // student app reads this to fall back to its "locked" screen.
        return res.status(403).json({
            code: 'CAREER_PATH_LOCKED',
            message: 'Career Path is currently unavailable. Please check back later.'
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { requireCareerPathEnabled, isCareerPathEnabled, invalidateCareerSetting };
