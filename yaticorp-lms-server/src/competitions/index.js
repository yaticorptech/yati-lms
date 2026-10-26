/**
 * Games & Competitions, mounted at /api/competitions.
 *
 *   /admin/*  the platform admin creates and runs inter-college competitions
 *             (routes/admin.js; superadmin only)
 *   /org/host/arena/*  a hosting college's own Quiz Arena: question bank and
 *             contests, the same routes as /arena/admin limited to its own
 *   /org/host/*  an organization admin hosting its own competitions — the
 *             same management routes, limited to its own (routes/admin.js);
 *             only once the platform admin has let it host
 *   /org/*    a college's organization admin — its coordinator — registers a
 *             team and picks players (routes/org.js)
 *   /arena/* Quiz Arena: the admin's question bank and contests (/arena/admin),
 *             and students' registration, live quiz and results (arena/)
 *   /*        students: the games (Chess, Rapid Fire, Code Clash, Brain
 *             Sprint), live match play, their
 *             competitions, matches, leaderboard, history and certificates
 *             (routes/student.js)
 *
 * The games themselves are in games/ (one rules engine each, see
 * games/contract.js) and are played over HTTP polling — see
 * services/gameService.js.
 */
const express = require('express');
const { protectAdmin, superAdminOnly, protectUser } = require('../middleware/authMiddleware');
const { protectOrgAdmin, requireActiveOrganization } = require('../organizations/middleware/authMiddleware');

const router = express.Router();

const manage = require('./routes/admin');

// A college's own competition has several teams of that college: the old
// one-team-per-college index goes (see models/Team.js).
require('./models/Team').dropOldIndex();

/** Hosting is the platform admin's to give: off for an organization until they switch it on. */
const requireHosting = (req, res, next) => {
    if (req.organization?.canHostCompetitions) return next();
    return res.status(403).json({
        code: 'HOSTING_DISABLED',
        message: 'Your organization cannot host competitions. The platform administrator can switch it on.'
    });
};

// Quiz Arena: an individual quiz contest, its own models and rules (arena/).
// Before /admin and the student routes, whose /:id would take "arena".
router.use('/arena/admin', protectAdmin, superAdminOnly, require('./arena/admin')('platform'));
router.use('/arena', protectUser, require('./arena/student'));
router.use('/admin', protectAdmin, superAdminOnly, manage('platform'));
// An organization hosting its own competitions: the same management routes,
// limited to what its organization created. Before /org, whose /:id would
// otherwise take "host" for a competition id.
// A college hosting its own Quiz Arena: its own question bank and contests.
router.use('/org/host/arena', protectOrgAdmin, requireActiveOrganization, requireHosting, require('./arena/admin')('organization'));
router.use('/org/host', protectOrgAdmin, requireActiveOrganization, requireHosting, manage('organization'));
router.use('/org/arena', protectOrgAdmin, requireActiveOrganization, require('./arena/org'));
router.use('/org', protectOrgAdmin, requireActiveOrganization, require('./routes/org'));
router.use('/', protectUser, require('./routes/student'));

module.exports = router;
