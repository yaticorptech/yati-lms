const Notification = require('../models/Notification');
const releases = require('../data/featureReleases');

/**
 * Tell this student about every feature release they have not heard of.
 *
 * Runs on every notification fetch and is idempotent: a release is written
 * once per user, keyed by `featureKey`, so refreshing the bell cannot repeat
 * it. Releases older than the account are skipped — a student who signed up
 * after a feature shipped has only ever known it.
 *
 * Never throws. A failure here must not take the bell down with it.
 */
async function syncFeatureNotifications(user) {
  if (!user?._id) return 0;
  try {
    const signedUp = user.createdAt ? new Date(user.createdAt) : new Date(0);
    const due = releases.filter((r) => new Date(r.releasedAt) > signedUp);
    if (due.length === 0) return 0;

    const told = await Notification.find(
      { userId: user._id, featureKey: { $in: due.map((r) => r.key) } },
      { featureKey: 1 }
    ).lean();
    const toldKeys = new Set(told.map((n) => n.featureKey));

    const missing = due.filter((r) => !toldKeys.has(r.key));
    if (missing.length === 0) return 0;

    await Notification.insertMany(
      missing.map((r) => ({
        userId: user._id,
        title: r.title,
        message: r.message,
        type: 'feature',
        featureKey: r.key,
        link: r.path
      })),
      { ordered: false }
    );
    return missing.length;
  } catch (err) {
    console.error('featureReleaseService: could not sync feature notifications', err.message);
    return 0;
  }
}

/** The registry, newest first, for the in-app "What's new" card. */
function listFeatureReleases() {
  return [...releases].sort((a, b) => new Date(b.releasedAt) - new Date(a.releasedAt));
}

module.exports = { syncFeatureNotifications, listFeatureReleases };
