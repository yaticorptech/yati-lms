/**
 * Read-only Career Path reporting for administrators.
 *
 * Guarded by the LMS's own admin middleware, not by `protect` — an admin is not
 * a student and has no student token. Mounted inside the career router so the
 * LMS never has to require anything from career_*.
 */
const express = require('express');
const router = express.Router();

const { getOverview, getGoalBreakdown, getAiUsage } = require('../controllers/adminController');
const { protectAdmin } = require('../../middleware/authMiddleware');

router.use(protectAdmin);

router.get('/overview', getOverview);
router.get('/goals', getGoalBreakdown);
router.get('/ai-usage', getAiUsage);

module.exports = router;
