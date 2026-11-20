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
// Date of birth and class, asked when Games opens (2026-11-17): GET → { dateOfBirth, level, classNumber, complete };
// POST saves them (models/GameProfile.js) and answers with the games zone they give.
router.get('/profile', protect, async (req, res, next) => {
    try {
        const p = await require('../models/GameProfile').findOne({ userId: req.user._id }).lean();
        res.json({ dateOfBirth: p?.dateOfBirth || null, level: p?.level || null, classNumber: p?.classNumber ?? null, complete: Boolean(p) });
    } catch (err) { next(err); }
});
router.post('/profile', protect, async (req, res, next) => {
    try {
        const { dateOfBirth, level = 'school', classNumber } = req.body || {};
        const dob = new Date(dateOfBirth);
        const years = (Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000);
        if (!dateOfBirth || Number.isNaN(dob.getTime()) || years < 4 || years > 60) return res.status(400).json({ message: 'Please enter a valid date of birth.' });
        if (!['school', 'college'].includes(level)) return res.status(400).json({ message: 'Please choose your class.' });
        const cls = level === 'school' ? Number(classNumber) : null;
        if (level === 'school' && !(Number.isInteger(cls) && cls >= 1 && cls <= 12)) return res.status(400).json({ message: 'Please choose your class (1–12).' });
        await require('../models/GameProfile').updateOne({ userId: req.user._id }, { $set: { dateOfBirth: dob, level, classNumber: cls } }, { upsert: true });
        res.json({ ok: true, zone: await require('../services/gameZone').effectiveZone(req.user._id) });
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

/* WORDCRAFT (2026-11-20, Master Minds · Vocabulary; individual play): the server deals each level, re-scores every
   challenge and keeps the progress — wordcraft/service.js. Same gates as saving any game: the organisation's games
   hours, and the age section (a section above the student's zone is refused). */
const wordcraftGate = async (req, res) => {
    if (await require('../../games/orgHours').refuseIfClosed(req, res)) return false;
    const { catalogGame } = require('../data/gameCatalog');
    const { effectiveZone } = require('../services/gameZone');
    const { accessFor, canPlay } = require('../../competitions/services/zoneAccess');
    const section = catalogGame('wordcraft')?.section;
    if (section) {
        const own = await effectiveZone(req.user._id);
        if (!canPlay(accessFor(own.zone, section))) { res.status(403).json({ message: 'WORDCRAFT is for Class 11 onwards.', zone: own.zone, section }); return false; }
    }
    return true;
};
const wordcraftReply = (res, next) => (err) => (err?.status ? res.status(err.status).json({ message: err.message, ...err.extra }) : next(err));
router.get('/wordcraft', protect, async (req, res, next) => {
    try { res.json(await require('../wordcraft/service').getState(req.user._id)); } catch (err) { wordcraftReply(res, next)(err); }
});
router.post('/wordcraft/start', protect, async (req, res, next) => {
    try {
        if (!(await wordcraftGate(req, res))) return;
        res.json(await require('../wordcraft/service').startLevel(req.user._id, req.body?.level));
    } catch (err) { wordcraftReply(res, next)(err); }
});
router.post('/wordcraft/submit', protect, async (req, res, next) => {
    try {
        if (!(await wordcraftGate(req, res))) return;
        res.json(await require('../wordcraft/service').submitChallenge(req.user._id, req.body || {}));
    } catch (err) { wordcraftReply(res, next)(err); }
});


module.exports = router;
