const express = require('express');
const router = express.Router();
const {
  requireRebuildConsent,
  generateRoadmap,
  getRoadmap,
  togglePhase
} = require('../controllers/roadmapController');
const { protect } = require('../middleware/authMiddleware');
const Roadmap = require('../models/Roadmap');
const { chargeWallet } = require('../../rewards/services/walletRuleService');
const { xpOnSuccess } = require('../../rewards/services/xpHooks');

// Wallet rules: rebuilding an existing roadmap is priced; the first one is free.
// Replacing one needs { rebuild: true }, checked before the charge so a refused
// rebuild is never billed.
// XP rule (optional): the first roadmap built, once ever; a rebuild pays nothing more.
router.post('/generate', protect, requireRebuildConsent, chargeWallet('rebuild_roadmap', { when: async (req) => !!(await Roadmap.exists({ userId: req.user._id })) }), xpOnSuccess('career_onboarding', () => 'onboarding'), generateRoadmap);
router.patch('/phase', protect, togglePhase);
// No DELETE: nothing in either app used it, and deleting a roadmap made the
// next build count as a free "first" one, so a rebuild could skip its price
// (removed 2026-10-10). Settings rebuilds it, at the rebuild price.
router.route('/')
  .get(protect, getRoadmap);

module.exports = router;
