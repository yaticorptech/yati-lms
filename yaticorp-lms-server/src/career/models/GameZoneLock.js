const mongoose = require('mongoose');

/**
 * The games zone held on a student's account (2026-11-14, class tampering). The zone is worked out from the Career
 * Path class (services/gameZone.js zoneFor), but the class is the student's own word and can be edited at any time
 * (PUT /api/career/goals) or dropped (DELETE, then a new goal). Without this record a student could set "Class 12",
 * play Master Minds, and set their real class back.
 *
 * The rule (services/gameZone.js effectiveZone):
 *   - the first zone worked out is held here;
 *   - a change to a LOWER zone, or within the same zone (a new band), follows at once — it opens nothing new;
 *   - a change to a HIGHER zone follows only one zone at a time and once per academic year (April–March: a real
 *     promotion, e.g. Class 5 → 6 or 10 → 11, or fixing a class entered wrongly at onboarding). Anything else is kept
 *     as `pending` and the zone stays where it was until an administrator confirms it
 *     (POST /api/career/admin/game-zone/:userId/confirm) or the next academic year allows the step;
 *   - with no class at all any more (goal deleted), the held zone stays.
 * The roadmap is never affected: Career Path keeps reading the class as the student gave it.
 */
const zoneShape = {
  zone: { type: String, enum: ['young', 'smart', 'master'] },
  band: String,
  classNumber: Number,
  educationLevel: String,
  source: String
};

const gameZoneLockSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    ...zoneShape,
    // The academic year ('2026' = April 2026 – March 2027) in which the zone last moved up, or null.
    raisedInYear: { type: String, default: null },
    // A higher zone the class now asks for that has not been allowed yet.
    pending: { type: new mongoose.Schema({ ...zoneShape, at: Date }, { _id: false }), default: null },
    // Every change of zone, newest last (capped at 20).
    history: {
      type: [new mongoose.Schema({ from: String, to: String, classNumber: Number, at: Date, by: String }, { _id: false })],
      default: []
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('CareerGameZoneLock', gameZoneLockSchema, 'career_game_zone_locks');
