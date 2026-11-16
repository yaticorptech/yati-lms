const express = require('express');
const router = express.Router();
const { getProgress, saveProgress, getLeaderboard, getPlayTime, recordPlayTime, getGroupPlayTime, recordGroupPlayTime } = require('../controllers/gameController');
const { protect } = require('../middleware/authMiddleware');

router.route('/progress').get(protect, getProgress).post(protect, saveProgress);
router.get('/leaderboard', protect, getLeaderboard);
// Today's play time against the admin's daily limit; POST is the heartbeat.
router.route('/time').get(protect, getPlayTime).post(protect, recordPlayTime);
router.route('/group-time').get(protect, getGroupPlayTime).post(protect, recordGroupPlayTime);
// The student's games zone (Young Thinkers, Rising Brains, Master Minds) from their Career Path class (2026-11-13).
// Since 2026-11-14 the zone held on the account (services/gameZone.js effectiveZone): adds `held` (the zone is the
// account's, not the class just typed) and `pending` (a higher zone waiting for the next academic year or an admin).
router.get('/zone', protect, async (req, res, next) => {
    try {
        const { effectiveZone } = require('../services/gameZone');
        res.json(await effectiveZone(req.user._id));
    } catch (err) { next(err); }
});
// Game performance for My Progress (2026-11-14): individual (solo) and group kept apart, achievements from stored data.
router.get('/performance', protect, require('../controllers/gameController').getPerformance);

// What the student may play where (2026-11-13, age-based brain training part 3): their zone, each solo game's
// readiness (0 none, 1 one zone up, 2 two — informational since 2026-11-14: results no longer open a zone above, see
// competitions/services/zoneAccess.js) and which group games are played in each zone.
router.get('/access', protect, async (req, res, next) => {
    try {
        const zg = require('../../competitions/services/zoneGate');
        const { GROUP_ZONES } = require('../../competitions/games/zones');
        const { accessFor, canPlay } = require('../../competitions/services/zoneAccess');
        const [own, readiness] = await Promise.all([zg.zoneOfUser(req.user._id), zg.readinessByGame(req.user._id)]);
        // Each age section's status for this student (2026-11-14): own 'recommended', lower 'available', higher
        // 'preview' (not playable), all 'available' while the class is unknown. The same rule saveProgress enforces.
        const sections = Object.fromEntries(zg.ZONES.map((z) => {
            const status = accessFor(own.zone, z);
            return [z, { status, canPlay: canPlay(status) }];
        }));
        res.json({ zone: own.zone, band: own.band, source: own.source, held: !!own.held, pending: own.pending || null, sections, readiness, groupZones: GROUP_ZONES });
    } catch (err) { next(err); }
});

module.exports = router;
