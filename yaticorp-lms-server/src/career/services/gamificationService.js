const User = require('../models/User');
const Badge = require('../models/Badge');
const UserBadge = require('../models/UserBadge');
const Notification = require('../models/Notification');

// Level thresholds now live in the admin-edited rewards rulebook; this keeps
// the old name for callers and answers from the defaults, which match the
// ladder the badge catalogue below was written against.
const { levelFor } = require('../../rewards/services/configService');
const calculateLevel = (xp) => levelFor(xp);

/**
 * Every badge in the game, in the order they are earned.
 *
 * "Reach Level N" badges name the level, not an XP figure. They used to carry
 * fixed numbers written against an old ladder — "Skill Master: Reach Level 5"
 * landed at 1500 XP while Level 5 starts at 1000 on the default ladder, and
 * any admin edit to the ladder (Rewards → Level thresholds) moved every one of
 * them further out of step. The XP a level takes is read from the admin's
 * ladder whenever a badge is checked (badgeTargets), so the badge lands the
 * moment the level does.
 *
 * "First Task Completed" is earned by a completed Career Path task. It used to
 * unlock at 10 XP of any kind, so a few brain-game points earned it without a
 * task in sight.
 *
 * Skill Master used to be the end of the road: a student who passed it had
 * nothing left to earn, ever. These continue the ladder.
 */
const BADGE_CATALOGUE = [
  { title: 'First Task Completed', description: 'Complete your very first Career Path task.', rule: 'first_task', icon: 'CheckCircle' },
  { title: 'Consistent Learner', description: 'Reach Level 2.', level: 2, icon: 'TrendingUp' },
  { title: 'Skill Master', description: 'Reach Level 5.', level: 5, icon: 'Award' },
  { title: 'Steady Climber', description: 'Reach Level 6.', level: 6, icon: 'Flame' },
  { title: 'Deep Focus', description: 'Reach Level 7.', level: 7, icon: 'Target' },
  { title: 'Relentless', description: 'Reach Level 8.', level: 8, icon: 'Zap' },
  { title: 'Trailblazer', description: 'Reach Level 9.', level: 9, icon: 'Rocket' },
  { title: 'Path Finder', description: 'Reach Level 10.', level: 10, icon: 'Crown' }
];

/**
 * The catalogue with what each badge takes on the admin's ladder as it stands:
 * `xpRequired` is where the named level starts, 0 for a badge earned by doing
 * something rather than by XP.
 */
const badgeTargets = async () => {
  const { getConfig, levelFloor } = require('../../rewards/services/configService');
  const thresholds = (await getConfig()).levelThresholds;
  return BADGE_CATALOGUE.map((badge) => ({
    ...badge,
    xpRequired: badge.level ? levelFloor(badge.level, thresholds) : 0
  }));
};

// Done once per process rather than on every call — the catalogue cannot change
// while the server is running, and this used to sit in the path of every badge
// read and every XP award.
let catalogueSynced = false;

/**
 * Make sure the database holds the catalogue.
 *
 * Upserted by title, not inserted only when the collection is empty. The old
 * version bailed out the moment a single badge existed, so any badge added to
 * the catalogue afterwards would never reach a database that had already been
 * seeded — which is every database except a brand new one.
 */
const seedBadges = async () => {
  if (catalogueSynced) return;
  const targets = await badgeTargets();
  await Promise.all(
    targets.map((badge) =>
      Badge.updateOne(
        { title: badge.title },
        {
          $set: {
            title: badge.title,
            description: badge.description,
            icon: badge.icon,
            xpRequired: badge.xpRequired,
            ...(badge.level ? { level: badge.level } : {}),
            ...(badge.rule ? { rule: badge.rule } : {})
          },
          $unset: { ...(badge.level ? {} : { level: 1 }), ...(badge.rule ? {} : { rule: 1 }) }
        },
        { upsert: true }
      )
    )
  );
  catalogueSynced = true;
};

/**
 * Whether this student has ever finished a Career Path task. A task counts
 * once it has been credited (creditedAt never clears, even on a reopen); the
 * "First Step" achievement covers students whose tasks were deleted by a
 * roadmap rebuild, since that does not touch achievements.
 */
const hasFinishedATask = async (userId) => {
  const Task = require('../models/Task');
  const Achievement = require('../models/Achievement');
  const [task, achievement] = await Promise.all([
    Task.exists({ userId, $or: [{ status: 'Completed' }, { creditedAt: { $ne: null } }] }),
    Achievement.exists({ userId, title: 'First Step' })
  ]);
  return !!(task || achievement);
};

/**
 * Bring a student's career badges in line with the rules above: award every
 * one they have earned and not been given, and take back a "First Task
 * Completed" handed out under the old any-10-XP rule to someone who has never
 * finished a task. Level badges are never taken back: a level once reached
 * stays reached, even if the ladder is raised later.
 *
 * Runs after XP is paid and whenever the badges are read, so badges awarded
 * under the old fixed numbers are put right the next time they are looked at.
 * `announce` posts the "Badge Unlocked!" notification for each new one.
 *
 * @returns {Promise<{badges: object[], earnedIds: Set<string>}>} the catalogue
 *   (with each badge's database id and current target) and what is now earned
 */
const evaluateBadges = async (userId, { announce = false } = {}) => {
  await seedBadges();
  const [targets, rows, user, finished, earnedRows] = await Promise.all([
    badgeTargets(),
    Badge.find({ title: { $in: BADGE_CATALOGUE.map((b) => b.title) } }).select('title').lean(),
    User.findById(userId).select('xp').lean(),
    hasFinishedATask(userId),
    UserBadge.find({ userId }).select('badgeId').lean()
  ]);
  const idByTitle = new Map(rows.map((row) => [row.title, String(row._id)]));
  const earnedIds = new Set(earnedRows.map((row) => String(row.badgeId)));
  const xp = Number(user?.xp) || 0;

  const badges = targets
    .map((badge) => ({ ...badge, _id: idByTitle.get(badge.title) }))
    .filter((badge) => badge._id);

  for (const badge of badges) {
    const deserved = badge.rule === 'first_task' ? finished : xp >= badge.xpRequired;
    const has = earnedIds.has(badge._id);

    if (deserved && !has) {
      // One atomic upsert rather than find-then-create: two payouts landing
      // together both saw "no badge" and both inserted, and with the unique
      // { userId, badgeId } index the loser would throw. Only the request that
      // actually inserted announces the badge.
      const awarded = await UserBadge.updateOne(
        { userId, badgeId: badge._id },
        { $setOnInsert: { userId, badgeId: badge._id } },
        { upsert: true }
      );
      earnedIds.add(badge._id);
      if (announce && awarded.upsertedCount === 1) {
        await Notification.create({
          userId,
          title: 'Badge Unlocked!',
          message: `You unlocked the ${badge.title} badge!`,
          type: 'achievement'
        });
      }
    } else if (!deserved && has && badge.rule === 'first_task') {
      await UserBadge.deleteOne({ userId, badgeId: badge._id });
      earnedIds.delete(badge._id);
    }
  }

  return { badges, earnedIds };
};

/**
 * Pay Career Path XP and check the XP badges.
 *
 * `refId` is the award's natural key ('task:<id>', 'taskquiz:<taskId>', …).
 * The ledger is unique per user on source + refId, so two requests racing to
 * pay the same thing — a double click, a second tab, a retried request — land
 * one row and the loser comes back as a duplicate instead of a second payout.
 * The in-document guards each caller keeps (creditedAt, bestScore, answeredAt)
 * still decide WHETHER to pay; this only makes paying idempotent.
 *
 * @returns {Promise<number>} the XP actually credited — 0 when nothing was
 *   paid, so callers can report what the student really got.
 */
const addXP = async (userId, amount, reason, { refId = null } = {}) => {
  await seedBadges();

  // The write itself goes through the rewards XP service, so Career Path XP
  // lands in the same ledger the leaderboard sums and levels come from the
  // same admin thresholds as course XP. It also posts the "XP earned" and
  // "Level up" notifications, which used to be created here.
  const { addXp } = require('../../rewards/services/xpService');
  const result = await addXp({ userId, amount, source: 'career', refId, description: `for ${reason}` });
  if (!result || result.duplicate || result.missingUser || result.skipped) return 0;

  // The XP is already in the ledger, so report it even if the badge check
  // cannot run.
  try {
    await evaluateBadges(userId, { announce: true });
  } catch (error) {
    console.error('[career] badge check failed:', error.message);
  }

  return result.amount || 0;
};

module.exports = { addXP, seedBadges, evaluateBadges, badgeTargets, calculateLevel, BADGE_CATALOGUE };
