const express = require('express');
const router = express.Router();
const { getProgress, saveProgress, getLeaderboard } = require('../controllers/gameController');
const { protect } = require('../middleware/authMiddleware');

router.route('/progress').get(protect, getProgress).post(protect, saveProgress);
router.get('/leaderboard', protect, getLeaderboard);

module.exports = router;
