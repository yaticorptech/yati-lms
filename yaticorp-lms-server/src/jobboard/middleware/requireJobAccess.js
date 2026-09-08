/** The guard on the board: listings and bookmarks need Aadhaar verified and LinkedIn added. 403 with a code the UI recognises. */
const { canAccessJobs } = require('../services/jobVerificationService');
const requireJobAccess = async (req, res, next) => {
    try { if (await canAccessJobs(req.user._id)) return next(); return res.status(403).json({ code: 'JOB_VERIFICATION_REQUIRED', error: 'Verify your Aadhaar and add your LinkedIn profile to access jobs.' }); } catch (err) { next(err); }
};
module.exports = { requireJobAccess };
