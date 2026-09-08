const express = require('express');
const router = express.Router();
const { getScholarships, generateScholarships } = require('../controllers/scholarshipController');
const { protect } = require('../middleware/authMiddleware');

router.post('/generate', protect, generateScholarships);
router.get('/', protect, getScholarships);

module.exports = router;
