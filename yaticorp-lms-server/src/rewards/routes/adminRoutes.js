/**
 * Rewards administration. Guarded by the LMS admin middleware; mounted ahead
 * of the student feature gate so locking the section never blinds the admin.
 */
const express = require('express');
const router = express.Router();
const { protectAdmin } = require('../../middleware/authMiddleware');
const c = require('../controllers/adminController');

router.use(protectAdmin);

router.get('/overview', c.getOverview);
router.route('/config').get(c.getConfig).put(c.updateConfig);
router.route('/badges').get(c.listBadges).post(c.createBadge);
router.route('/badges/:id').put(c.updateBadge).delete(c.deleteBadge);
router.get('/wallets', c.listWallets);
router.get('/transactions', c.listTransactions);
router.get('/withdrawals', c.listWithdrawals);
router.put('/withdrawals/:id', c.decideWithdrawal);
router.get('/users/:id', c.getUserHistory);
router.post('/users/:id/adjust', c.adjustUser);
router.get('/audit', c.runAudit);
router.post('/jobs/run', c.runJobsNow);

module.exports = router;
