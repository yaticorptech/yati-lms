/**
 * Brain games: the student's progress extras (2026-11-13). Mounted at /api/career/games beside gameRoutes.js.
 *
 *   GET /group-summary   the student's Group games (Group Brain results): played, wins, podiums, recent.
 *                        Separate from the solo records: group results never change a solo personal best.
 *
 * The fair leaderboard (difficulty-weighted points, own zone by default) is the existing GET /leaderboard in
 * gameRoutes.js, served by gameController.getLeaderboard.
 */
const express = require('express');
const { getGroupSummary } = require('../controllers/gameController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
router.get('/group-summary', protect, getGroupSummary);

module.exports = router;
