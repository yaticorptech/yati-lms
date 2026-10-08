const express = require('express');
const router = express.Router();
const { chargeWallet } = require('../../rewards/services/walletRuleService');
const { xpOnSuccess, today } = require('../../rewards/services/xpHooks');
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

// Wallet rule 'find_scholarship' and the optional XP rule 'scholarship_search' (once a day).
router.post('/generate', protect, chargeWallet('find_scholarship'), xpOnSuccess('scholarship_search', () => `scholarships:${today()}`), generateScholarships);
router.get('/', protect, getScholarships);

module.exports = router;
