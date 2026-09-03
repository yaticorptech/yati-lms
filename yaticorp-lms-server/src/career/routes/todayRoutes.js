const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getToday } = require('../controllers/todayController');

router.get('/', protect, getToday);

module.exports = router;
