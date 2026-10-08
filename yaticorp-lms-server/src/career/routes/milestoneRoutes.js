/** Authenticated milestone-badge routes, mounted under /api/career/milestones. */
const express = require('express');
const router = express.Router();

const { issuePhaseBadge, getMyBadges } = require('../controllers/milestoneBadgeController');
const { protect } = require('../middleware/authMiddleware');
const { xpOnSuccess } = require('../../rewards/services/xpHooks');

router.get('/', protect, getMyBadges);
router.post('/badge', protect, xpOnSuccess('roadmap_milestone', (req) => (Number.isInteger(Number(req.body?.index)) ? `phase:${Number(req.body.index)}` : null)), issuePhaseBadge);

module.exports = router;
