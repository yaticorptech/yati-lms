/** Authenticated milestone-badge routes, mounted under /api/career/milestones. */
const express = require('express');
const router = express.Router();

const { issuePhaseBadge, getMyBadges } = require('../controllers/milestoneBadgeController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getMyBadges);
router.post('/badge', protect, issuePhaseBadge);

module.exports = router;
