const mongoose = require('mongoose');

const skillProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User'
    },
    skillName: {
      type: String,
      required: true
    },
    level: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
      default: 'Beginner'
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

const SkillProgress = mongoose.model(
  'CareerSkillProgress',
  skillProgressSchema,
  'career_skill_progress'
);

/**
 * How many skills a student is asked to carry at once.
 *
 * A tracker with twenty rows is a list, not a focus, and every row is another
 * thing showing 0%. The roadmap already honoured this when seeding; the older
 * task-generation path did not, so accounts drifted past the ceiling — eight
 * declared, eleven stored. Kept here so both writers read the same number.
 */
SkillProgress.MAX_TRACKED = 8;

module.exports = SkillProgress;
