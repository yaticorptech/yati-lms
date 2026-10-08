const express = require('express');
const router = express.Router();
const {
  requireRebuildConsent,
  generateRoadmap,
  getRoadmap,
  togglePhase,
  deleteRoadmap
} = require('../controllers/roadmapController');
const { protect } = require('../middleware/authMiddleware');
const Roadmap = require('../models/Roadmap');
const { chargeWallet } = require('../../rewards/services/walletRuleService');

// Wallet rules: rebuilding an existing roadmap is priced; the first one is free.
// Replacing one needs { rebuild: true }, checked before the charge so a refused
// rebuild is never billed.
router.post('/generate', protect, requireRebuildConsent, chargeWallet('rebuild_roadmap', { when: async (req) => !!(await Roadmap.exists({ userId: req.user._id })) }), generateRoadmap);
router.patch('/phase', protect, togglePhase);
router.route('/')
  .get(protect, getRoadmap)
  .delete(protect, deleteRoadmap);

module.exports = router;
