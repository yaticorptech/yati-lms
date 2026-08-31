/**
 * The daily job-alert run: "N new jobs match your last search".
 *
 * The board only works when a student thinks to visit it. This closes that
 * loop: once a day, each student's most recent search is re-run against only
 * the listings that arrived since the last run, and a match becomes a
 * notification in the bell they already watch.
 *
 * Three deliberate boundaries:
 *
 *   - Only listings NEWER than the last run are considered. Ranking the whole
 *     index would announce the same 60 jobs every morning; announcing only
 *     arrivals means an alert always carries news.
 *   - The score bar is higher than the search page's (25 vs 15). A search can
 *     afford marginal results because the student is there to judge them; an
 *     interruption cannot.
 *   - At most one notification per student per run, and none while they still
 *     have an unread one — a bell that fills with near-identical rows teaches
 *     the student to ignore it.
 *
 * Scheduled from server.js the same way ticket cleanup is. The interval fires
 * more often than the run happens: the database-backed timestamp is what
 * decides, so redeploys and multiple instances cannot double-announce a day.
 */
const Job = require('../models/Job');
const Search = require('../models/Search');
const Notification = require('../models/Notification');
const { claimRun } = require('./stateService');
const { isConnected } = require('../config/db');
const { isJobsEnabled } = require('../middleware/featureGate');
const { rankJobs, resolveRole, locTokens } = require('./matchService');

const STATE_KEY = 'job-alerts';
// "Daily" with slack: 20h rather than 24 so the run drifts to whenever the
// interval happens to fire, instead of creeping later every day until it
// skips one.
const MIN_GAP_MS = 20 * 60 * 60 * 1000;
// A search older than this no longer describes what the student wants.
const SEARCH_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
const MAX_NEW_JOBS = 3000;
const MAX_USERS = 500;

/** The /jobs URL that re-runs the search this alert is about. */
const searchLink = (s) => {
    const q = new URLSearchParams();
    if (s.skills?.length) q.set('skills', s.skills.join(','));
    if (s.role) q.set('role', s.role);
    if (s.jobType && s.jobType !== 'Any') q.set('type', s.jobType);
    if (s.location) q.set('loc', s.location);
    if (s.remoteOnly) q.set('remote', '1');
    return `/jobs?${q.toString()}`;
};

const runJobAlerts = async () => {
    try {
        if (!isConnected()) return;
        // A locked section must not keep talking to students.
        if (!(await isJobsEnabled())) return;

        // Atomic: exactly one caller wins the day's run, and the timestamp
        // is stamped before the slow part so a second instance stands down.
        const { claimed, prev } = await claimRun(STATE_KEY, MIN_GAP_MS);
        if (!claimed) return;

        // First run has no baseline; a day back keeps it from announcing the
        // entire index as "new".
        const since = prev || new Date(Date.now() - 24 * 60 * 60 * 1000);

        const newJobs = await Job.find({ active: true, createdAt: { $gt: since } })
            .limit(MAX_NEW_JOBS)
            .lean();
        if (!newJobs.length) return;

        // rankJobs reads daysAgo off each job; .lean() loses the virtual.
        for (const j of newJobs) {
            j.daysAgo = j.postedAt
                ? Math.max(0, Math.round((Date.now() - new Date(j.postedAt).getTime()) / 86400000))
                : null;
        }

        // Each active student's single most recent search.
        const latest = await Search.aggregate([
            { $match: { userId: { $ne: null }, createdAt: { $gte: new Date(Date.now() - SEARCH_WINDOW_MS) } } },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: '$userId',
                    skills: { $first: '$skills' }, role: { $first: '$role' },
                    jobType: { $first: '$jobType' }, location: { $first: '$location' },
                    remoteOnly: { $first: '$remoteOnly' }
                }
            },
            { $limit: MAX_USERS }
        ]);
        if (!latest.length) return;

        // One unread alert at a time, per student.
        const unread = new Set(
            (await Notification.find({
                userId: { $in: latest.map((l) => l._id) }, isRead: false
            }).select('userId').lean()).map((n) => n.userId.toString())
        );

        let sent = 0;
        for (const s of latest) {
            if (unread.has(s._id.toString())) continue;

            const roleName = s.role ? resolveRole(s.role) : null;
            // The stored search has no resolved place, and re-geocoding 500 of
            // them nightly is not worth it: gating on the typed words keeps an
            // Indian search in India, which is the mistake that matters.
            const terms = locTokens(s.location || '');
            const profile = {
                skills: s.skills || [],
                roleName,
                roleText: s.role || '',
                jobType: s.jobType || 'Any',
                location: s.location || '',
                locationTerms: terms,
                cityTerms: terms,
                locationKnown: false,
                country: '', countryAliases: [], continent: null, coords: null,
                remoteOnly: !!s.remoteOnly
            };

            const { total } = rankJobs(newJobs, profile, { minScore: 25, limit: 5 });
            if (!total) continue;

            const label = s.role || (s.skills?.length ? s.skills.slice(0, 2).join(', ') : 'job');
            await Notification.create({
                userId: s._id,
                title: 'New job matches',
                message: `${total} new job${total === 1 ? '' : 's'} match your ${label} search.`,
                link: searchLink(s)
            });
            sent++;
        }

        if (sent) console.log(`[jobs] Alerts: ${sent} student(s) notified of new matches.`);
    } catch (err) {
        // A failed alert run costs a day's notifications, never anything else.
        console.error('[jobs] Alert run failed:', err.message);
    }
};

module.exports = { runJobAlerts };
