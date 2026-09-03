const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getTodaysActivity, answerTodaysActivity } = require('../controllers/activityController');

router.get('/', protect, getTodaysActivity);
router.post('/answer', protect, answerTodaysActivity);

module.exports = router;
