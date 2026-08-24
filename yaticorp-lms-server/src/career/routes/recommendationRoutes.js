const express = require('express');
const router = express.Router();
const {
  generateRecommendations,
  getRecommendations,
  deleteRecommendations
} = require('../controllers/recommendationController');
const { protect } = require('../middleware/authMiddleware');

router.post('/generate', protect, generateRecommendations);
router.route('/')
  .get(protect, getRecommendations)
  .delete(protect, deleteRecommendations);

module.exports = router;
