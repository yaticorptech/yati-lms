const express = require('express');
const router = express.Router();
const { chargeWallet } = require('../../rewards/services/walletRuleService');
const {
  generateRecommendations,
  getRecommendations,
  deleteRecommendations
} = require('../controllers/recommendationController');
const { protect } = require('../middleware/authMiddleware');

// Optional wallet rule 'generate_ideas' (free unless the admin adds it).
router.post('/generate', protect, chargeWallet('generate_ideas'), generateRecommendations);
router.route('/')
  .get(protect, getRecommendations)
  .delete(protect, deleteRecommendations);

module.exports = router;
