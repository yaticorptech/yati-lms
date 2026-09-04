const express = require('express');
const router = express.Router();
const c = require('../controllers/studentController');

router.get('/summary', c.getSummary);
router.get('/config', c.getPublicConfig);
router.get('/streak', c.getStreak);
router.get('/badges', c.getBadges);
router.get('/leaderboard', c.getLeaderboard);
router.get('/xp/history', c.getXpHistory);
router.get('/wallet', c.getWallet);
router.get('/wallet/transactions', c.getWalletTransactions);
router.get('/wallet/rewards', c.getRewardLedger);
router.get('/wallet/withdrawals', c.getWithdrawals);
router.post('/wallet/redeem', c.redeem);
router.post('/wallet/withdraw', c.withdraw);
router.get('/events/unseen', c.getUnseenEvents);
router.post('/events/seen', c.markEventsSeen);

module.exports = router;
