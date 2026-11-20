/**
 * Career Path reporting for administrators (read-only, but for confirming a held games-zone change).
 *
 * Guarded by YATICORPX3's own admin middleware, not by `protect` — an admin is not
 * a student and has no student token. Mounted inside the career router so the
 * YATICORPX3 never has to require anything from career_*.
 */
const express = require('express');
const router = express.Router();

const { getOverview, getGoalBreakdown, getAiUsage } = require('../controllers/adminController');
const { protectAdmin } = require('../../middleware/authMiddleware');

router.use(protectAdmin);

router.get('/overview', getOverview);
router.get('/goals', getGoalBreakdown);
router.get('/ai-usage', getAiUsage);

// A student's games zone, and accepting a class change that was held (services/gameZone.js, 2026-11-14). The only
// write here: it moves the games zone the student's own class already asks for, nothing else.
router.get('/game-zone/:userId', async (req, res, next) => {
    try {
        if (!require('mongoose').isValidObjectId(req.params.userId)) return res.status(400).json({ message: 'Invalid student id' });
        const lock = await require('../models/GameZoneLock').findOne({ userId: req.params.userId }).lean();
        res.json({ zone: await require('../services/gameZone').effectiveZone(req.params.userId), history: lock?.history || [] });
    } catch (err) { next(err); }
});
router.post('/game-zone/:userId/confirm', async (req, res, next) => {
    try {
        if (!require('mongoose').isValidObjectId(req.params.userId)) return res.status(400).json({ message: 'Invalid student id' });
        const zone = await require('../services/gameZone').confirmPending(req.params.userId, req.admin?._id || req.user?._id || null);
        if (!zone) return res.status(404).json({ message: 'No class change is waiting for this student' });
        res.json({ zone });
    } catch (err) { next(err); }
});

module.exports = router;
