/**
 * Every Career Path feature worth telling students about, newest last.
 *
 * This list IS the announcement. Adding an entry here is all a release has to
 * do: the next time any student's notifications are fetched, every entry they
 * have not yet been told about becomes a notification in their bell, and the
 * Career Path shell shows the same entries as a "What's new" card. No admin
 * has to remember to write an announcement, and no student is missed — the
 * catch-up runs per user, on their own next visit.
 *
 * Rules:
 *   • `key` is permanent and unique. It is how a user is marked as told, so
 *     renaming one re-announces the feature to everyone.
 *   • `releasedAt` gates who hears about it: accounts created after that date
 *     already see the feature and are not sent a backlog.
 *   • `path` is where the bell should send them. Relative to /career.
 */
// Empty on purpose: nothing is announced until a release is added. To announce
// one, add an entry shaped like the example below.
//
//   {
//     key: '2026-09-skills-tracker',           // permanent, unique
//     title: 'New: your skill map',
//     message: 'Skills has a fresh look — see which skills are moving and what today\'s task unlocks.',
//     path: '/career/skills',                  // where the bell sends them
//     releasedAt: '2026-09-04T00:00:00.000Z'   // accounts created after this are not told
//   }
module.exports = [];
