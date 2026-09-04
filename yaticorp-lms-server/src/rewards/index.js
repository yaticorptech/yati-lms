/**
 * Gamification, rewards and wallet — mounted under /api/rewards.
 *
 * Every model registers as Reward* over a rewards_* collection, following the
 * Career* / career_* and JobBoard* / jobboard_* discipline, so generic names like
 * Badge and Wallet cannot collide with anything the LMS adds later.
 *
 * The admin half is mounted first, ahead of the feature gate, so an
 * administrator who locks the section can still see and pay out what is in
 * it. Everything after the gate requires a student token.
 */
const express = require('express');
const router = express.Router();
const { protectUser } = require('../middleware/authMiddleware');
const { requireRewardsEnabled } = require('./middleware/featureGate');

router.use('/admin', require('./routes/adminRoutes'));

router.use(protectUser);
router.use(requireRewardsEnabled);
router.use('/', require('./routes/studentRoutes'));

router.use((req, res) => {
  res.status(404).json({ message: `No such endpoint: ${req.method} ${req.originalUrl}` });
});

module.exports = router;
