/**
 * Scopes existing milestone badges to the roadmap they were earned on.
 * Idempotent — safe to re-run. Pass --dry to report without writing.
 *
 *   npm run career:migrate-badges
 *   npm run career:migrate-badges -- --dry
 *
 * Why this is needed
 * ------------------
 * Badges used to be keyed { userId, phaseIndex }. Regenerating a roadmap for a
 * new goal keeps the indices but changes what they mean, so a student who had
 * earned phase 0 as "High School: Class 9" was handed that same badge back when
 * they completed phase 0 of a brand new MCA roadmap.
 *
 * Two things have to happen, and the first is the one that cannot be skipped:
 * Mongoose creates the indexes a schema declares but never drops the ones it
 * no longer declares, so the old unique index keeps enforcing one-badge-per-
 * index long after the schema stopped asking for it.
 *
 * Legacy badges are adopted into the current roadmap only when their stored
 * phase title still matches that roadmap's phase at the same index — that is
 * the same achievement, so it keeps its existing link. Anything that does not
 * match belonged to a roadmap the student has since replaced; it is left
 * untouched and simply never reused. Its public link keeps working, because a
 * link that may already have been posted cannot be taken back.
 */
require('dotenv/config');
const mongoose = require('mongoose');
const { connectDB } = require('../../config/db');
const MilestoneBadge = require('../models/MilestoneBadge');
const Roadmap = require('../models/Roadmap');

const dryRun = process.argv.includes('--dry');

const OLD_INDEX = 'userId_1_phaseIndex_1';

/** The label a phase shows on the roadmap — must match milestoneBadgeController. */
const phaseTitleOf = (phase, index) =>
  phase?.phase || phase?.title || `Phase ${index + 1}`;

const dropLegacyIndex = async () => {
  const indexes = await MilestoneBadge.collection.indexes();
  if (!indexes.some((i) => i.name === OLD_INDEX)) {
    console.log(`• Legacy index ${OLD_INDEX} already gone.`);
    return;
  }
  if (dryRun) {
    console.log(`• Would drop legacy index ${OLD_INDEX}.`);
    return;
  }
  await MilestoneBadge.collection.dropIndex(OLD_INDEX);
  console.log(`• Dropped legacy index ${OLD_INDEX}.`);
};

const backfillRoadmapIds = async () => {
  const orphans = await MilestoneBadge.find({ roadmapId: { $exists: false } }).lean();
  if (!orphans.length) {
    console.log('• No badges without a roadmap. Nothing to backfill.');
    return;
  }

  // One roadmap lookup per student, not per badge.
  const roadmaps = new Map();
  const roadmapFor = async (userId) => {
    const key = String(userId);
    if (!roadmaps.has(key)) roadmaps.set(key, await Roadmap.findOne({ userId }).lean());
    return roadmaps.get(key);
  };

  let adopted = 0;
  let left = 0;

  for (const badge of orphans) {
    const roadmap = await roadmapFor(badge.userId);
    const phases = roadmap?.roadmapData?.educationRoadmap || [];
    const current = phases[badge.phaseIndex];
    const matches = current && phaseTitleOf(current, badge.phaseIndex) === badge.phaseTitle;

    if (!matches) {
      left += 1;
      console.log(
        `  ↷ left as-is: phase ${badge.phaseIndex} "${badge.phaseTitle}" ` +
        `(current roadmap has "${current ? phaseTitleOf(current, badge.phaseIndex) : 'no such phase'}")`
      );
      continue;
    }

    adopted += 1;
    if (!dryRun) {
      await MilestoneBadge.updateOne({ _id: badge._id }, { $set: { roadmapId: roadmap._id } });
    }
    console.log(`  ✓ adopted: phase ${badge.phaseIndex} "${badge.phaseTitle}"`);
  }

  console.log(
    `• ${adopted} badge(s) ${dryRun ? 'would be ' : ''}adopted into the current roadmap, ` +
    `${left} left for a roadmap the student has replaced.`
  );
};

async function main() {
  await connectDB();

  if (dryRun) console.log('\nDRY RUN — nothing will be written.\n');

  await backfillRoadmapIds();
  await dropLegacyIndex();

  // Declared by the schema; created here so the collection is correct the
  // moment this finishes rather than whenever a server next boots.
  if (!dryRun) {
    await MilestoneBadge.syncIndexes();
    console.log('• Indexes synced.');
  }

  console.log('\nDone.\n');
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('Milestone badge migration failed:', err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
