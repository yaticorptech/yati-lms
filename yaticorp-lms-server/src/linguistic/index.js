/**
 * Linguistic Ability (English learning) — /api/linguistic.
 *
 *   /admin   platform administrators: content, settings, progress, reviews (adminRoutes.js)
 *   /org     college coordinators: their students' progress and reviews (orgRoutes.js)
 *   /        students, behind sign-in and the section's switch (routes.js)
 *
 * The admin and coordinator routes come first and have their own sign-in, so
 * locking the section for students does not shut out the people running it.
 */
const express = require('express');
const { protectUser } = require('../middleware/authMiddleware');
const { requireLinguisticEnabled } = require('./config');

const router = express.Router();
router.use('/admin', require('./adminRoutes'));
router.use('/org', require('./orgRoutes'));
router.use(protectUser, requireLinguisticEnabled, require('./routes'));

module.exports = router;
