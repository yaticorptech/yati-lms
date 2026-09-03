/**
 * @description Jobs (CareerCompass) — the job board of the student panel,
 *              mounted under /api/jobs.
 *
 * Ported from the standalone CareerCompass app. Three things were left behind:
 * its own Express server (this is a router inside the LMS), its own database
 * connection (the LMS owns one, see ./config/db.js) and its anonymous
 * sessionId identity — every caller here is a signed-in student, so searches
 * are keyed on the real user.
 *
 * Every model registers as JobBoard* over a jobboard_* collection so that
 * generic names — Job, Role, Search — cannot collide with an LMS model added
 * later. Same arrangement as the career module next door.
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
// IPv6 addresses have to be normalised before use as a key; the library refuses
// a raw req.ip fallback without this.
const { ipKeyGenerator } = require('express-rate-limit');

const { protectUser } = require('../middleware/authMiddleware');
const { requireJobsEnabled } = require('./middleware/featureGate');

/**
 * Say at startup what this section cannot do, rather than letting it be
 * discovered one empty search at a time. Both of these degrade quietly by
 * design — the board keeps working without them — and quiet degradation is
 * what goes unnoticed for months.
 */
const reportConfig = () => {
  if (!process.env.JSEARCH_RAPIDAPI_KEY?.trim() && !process.env.ADZUNA_APP_ID?.trim()) {
    console.warn(
      '[jobs] Neither JSEARCH_RAPIDAPI_KEY nor ADZUNA_APP_ID is set — the index ' +
      'will only cover the employer boards in data/companies.js, which publish ' +
      'in tier-1 cities. Searches for smaller towns will look broken rather ' +
      'than empty. See .env.example.'
    );
  }
  if (!process.env.GEMINI_API_KEY?.trim()) {
    console.warn(
      '[jobs] GEMINI_API_KEY is not set — semantic matching is off and the four ' +
      'deterministic signals are reweighted. Results stay correct, just more literal.'
    );
  }
};
reportConfig();

const router = express.Router();

// Administrator endpoints — ingestion and reporting. Mounted FIRST, ahead of
// both the lock and the student guard: an admin holds an admin token, not a
// student one, and locking the section for students must not stop an operator
// refreshing the index or reading what students are looking for.
router.use('/admin', require('./routes/admin'));

// Everything below is the student section.
router.use(requireJobsEnabled);
router.use(protectUser);

// Searching hits external APIs and does real scoring work — keep it bounded.
// Per student rather than per IP: a college behind one NAT would otherwise
// share a single allowance between everybody in the building.
router.use(rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.user?._id ? String(req.user._id) : ipKeyGenerator(req.ip)),
  message: { error: 'Too many requests — slow down a moment.' }
}));

router.use('/roles', require('./routes/roles'));
router.use('/meta', require('./routes/meta'));
router.use('/notifications', require('./routes/notifications'));
router.use('/saved', require('./routes/saved'));
router.use('/resume', require('./routes/resume'));
// Age-aware local opportunities — the part of the section a school student
// may use. Own profile, own index, own rules; see routes/opportunities.js.
router.use('/opportunities', require('./routes/opportunities'));
// Last: this one owns "/" and "/:id", so it would otherwise swallow the two
// above as job ids.
router.use('/', require('./routes/jobs'));

// An unknown path under /api/jobs is a client mistake, and should be answered
// in the language the client speaks rather than with Express's HTML error page.
router.use((req, res) => {
  res.status(404).json({ error: `No such endpoint: ${req.method} ${req.originalUrl}` });
});

// The ported routes call next(err); without this they would fall through to the
// LMS's own handler, which answers {message} where this section's client reads
// {error}.
// eslint-disable-next-line no-unused-vars
router.use((err, _req, res, _next) => {
  console.error('[jobs]', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error.' : err.message
  });
});

module.exports = router;
