const express = require('express');
const router = express.Router();
const { getBadges } = require('../controllers/badgeController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getBadges);

module.exports = router;
