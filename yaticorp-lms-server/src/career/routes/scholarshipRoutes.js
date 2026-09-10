const express = require('express');
const router = express.Router();
const {
  getScholarships,
  generateScholarships,
  getProfile,
  saveProfile,
  getProfileOptions
} = require('../controllers/scholarshipController');
const { protect } = require('../middleware/authMiddleware');

// The eligibility details schemes ask for. Declared once, kept, and used to
// put reserved schemes at the top of the list.
router.get('/profile/options', protect, getProfileOptions);
router.route('/profile').get(protect, getProfile).put(protect, saveProfile);

router.post('/generate', protect, generateScholarships);
router.get('/', protect, getScholarships);

module.exports = router;
