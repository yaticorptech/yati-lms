const express = require('express');
const router = express.Router();

const { getMyAiUsage } = require('../controllers/aiUsageController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getMyAiUsage);

module.exports = router;
