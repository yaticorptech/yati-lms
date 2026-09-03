/**
 * @description Career Path (FuturePath) — the AI career-roadmap section of the
 *              student panel, mounted under /api/career.
 *
 * Ported from the standalone FuturePath app. Two things were deliberately left
 * behind: its sign-in (the LMS student token is the only identity here — see
 * ./middleware/authMiddleware.js) and its admin panel (this is a student-only
 * section). Everything else keeps the paths the original used, one level down,
 * so /api/roadmap became /api/career/roadmap.
 *
 * Every model in this module registers as Career* over a career_* collection so
 * that generic names — Task, Badge, Notification — cannot collide with an LMS
 * model added later.
 */
const express = require('express');

/**
 * Say at startup what this section cannot do, rather than letting it be
 * discovered one broken lesson at a time.
 *
 * Both of these degrade quietly by design — Career Path keeps working without
 * them — and quiet degradation is exactly what goes unnoticed for months.
 */
const reportConfig = () => {
  if (!process.env.GEMINI_API_KEY) {
    console.error(
      '[career] GEMINI_API_KEY is not set — roadmaps, daily tasks, lessons and ' +
      'the mentor will all fail. Career Path is effectively read-only.'
    );
  }
  if (!process.env.YOUTUBE_API_KEY?.trim()) {
    console.warn(
      '[career] YOUTUBE_API_KEY is not set — task lessons will link out to a ' +
      'YouTube search instead of embedding a video the student can watch in ' +
      'place. Get a key from https://console.cloud.google.com/apis/library/youtube.googleapis.com'
    );
  }
  if (!process.env.PUBLIC_API_URL) {
    console.warn(
      '[career] PUBLIC_API_URL is not set — milestone-badge share links will be ' +
      "built from the request's own host. Fine locally; set it in production, " +
      'because a link a student has already posted cannot be corrected.'
    );
  }
};
reportConfig();

const router = express.Router();

// Every Gemini call this section makes is metered against the student who
// caused it. The router opens a request-scoped store here so geminiService can
// find out whose call it is without a userId being threaded through fourteen
// generator signatures. See services/aiContext.js.
router.use(require('./services/aiContext').withAiContext);

// Read-only reporting for administrators. Mounted FIRST, ahead of the lock
// below, so that closing the section to students does not also blind the
// operator who closed it. Student-only stays true — nothing here writes, and no
// endpoint returns a named student's roadmap or mentor conversation. It lives
// inside this module so the admin side of the LMS does not have to reach into
// career_* itself.
router.use('/admin', require('./routes/adminRoutes'));

// Everything below is the student section, and an administrator can lock it
// from Platform Settings. The gate is here rather than only in the student app
// because a hidden tab is not a closed door.
router.use(require('./middleware/featureGate').requireCareerPathEnabled);

router.use('/goals', require('./routes/goalRoutes'));
router.use('/roadmap', require('./routes/roadmapRoutes'));
router.use('/tasks', require('./routes/taskRoutes'));
// Read-only summary for the LMS dashboard's welcome panel. Mounted at the top
// level rather than under /tasks so it cannot collide with /tasks/:id.
router.use('/today', require('./routes/todayRoutes'));
router.use('/activity', require('./routes/activityRoutes'));
router.use('/skills', require('./routes/skillRoutes'));
router.use('/achievements', require('./routes/achievementRoutes'));
router.use('/badges', require('./routes/badgeRoutes'));
router.use('/recommendations', require('./routes/recommendationRoutes'));
router.use('/chat', require('./routes/chatRoutes'));
router.use('/notifications', require('./routes/notificationRoutes'));
router.use('/study', require('./routes/studyRoutes'));
router.use('/profile', require('./routes/profileRoutes'));
// The student's own exams and events, typed in by hand.
router.use('/events', require('./routes/calendarEventRoutes'));
// Searched alongside the LMS's own course/lesson search by the sidebar, which
// merges the two. Kept separate so the LMS never has to read career_* data.
router.use('/search', require('./routes/searchRoutes'));
// Shareable badges for completed roadmap phases. The public half of this —
// the page a shared link opens and the image social crawlers fetch — is
// mounted at /b in server.js, outside this router and outside its auth.
router.use('/milestones', require('./routes/milestoneRoutes'));
// What is left of this student's daily AI allowance, so the UI can say so
// before they spend it rather than only when it runs out.
router.use('/ai-usage', require('./routes/aiUsageRoutes'));
// An unknown path under /api/career is a client mistake, and should be answered
// in the language the client speaks rather than with Express's HTML error page.
router.use((req, res) => {
  res.status(404).json({ message: `No such endpoint: ${req.method} ${req.originalUrl}` });
});

module.exports = router;
