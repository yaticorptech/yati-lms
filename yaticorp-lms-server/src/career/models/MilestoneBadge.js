const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * A shareable badge for finishing a phase of the career roadmap.
 *
 * Deliberately not a certificate. A certificate is an A4 PDF that lands in a
 * downloads folder and is never seen again; a badge is an image with a public
 * link, which is the thing a student actually posts. Everything here exists to
 * serve that link: the snapshot fields so the page can render without a
 * session, and `shareCode` so it can be fetched without one.
 *
 * Distinct from the XP badges in models/Badge.js, which are unlocked by
 * accumulating XP and live only inside the app. These mark roadmap milestones
 * and are meant to leave it.
 */
const milestoneBadgeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    // Position in roadmapData.educationRoadmap. Phases live inside the roadmap's
    // JSON blob and have no id of their own.
    phaseIndex: {
      type: Number,
      required: true,
      min: 0
    },

    // ── Snapshots ───────────────────────────────────────────────────────────
    // Copied at issue time rather than looked up when the badge is viewed. The
    // share link is public and permanent: it has to render for a stranger on
    // LinkedIn long after the student regenerated their roadmap, changed their
    // goal, or had their account deactivated. A badge that renamed itself after
    // being posted would be worse than no badge.
    phaseTitle: { type: String, required: true },
    studentName: { type: String, required: true },
    careerGoal: { type: String, default: '' },

    /**
     * The public identifier, and the only thing standing between the internet
     * and this badge. 16 hex characters from a CSPRNG — long enough that the
     * space cannot be walked, and it reveals nothing about the student, unlike
     * a user id or a sequential number would.
     */
    shareCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () => crypto.randomBytes(8).toString('hex')
    },

    issuedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// One badge per phase per student. Re-opening the share sheet reuses it rather
// than minting a second link to the same achievement.
milestoneBadgeSchema.index({ userId: 1, phaseIndex: 1 }, { unique: true });

module.exports = mongoose.model(
  'CareerMilestoneBadge',
  milestoneBadgeSchema,
  'career_milestone_badges'
);
