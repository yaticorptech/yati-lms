const express = require('express');
const router = express.Router();
const { getProgress, saveProgress, getLeaderboard, getPlayTime, recordPlayTime } = require('../controllers/gameController');
const { protect } = require('../middleware/authMiddleware');

router.route('/progress').get(protect, getProgress).post(protect, saveProgress);
router.get('/leaderboard', protect, getLeaderboard);
// Today's play time against the admin's daily limit; POST is the heartbeat.
router.route('/time').get(protect, getPlayTime).post(protect, recordPlayTime);

module.exports = router;
