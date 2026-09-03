const mongoose = require('mongoose');

const roadmapSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      unique: true // A user has 1 roadmap for their active goal
    },
    goalId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'CareerGoal'
    },
    roadmapData: {
      type: Object, // To store the parsed JSON response from Gemini
      required: true
    },
    // Indices into roadmapData.educationRoadmap that the user has ticked off.
    // Stored as indices rather than phase titles so a phase can be reworded
    // without silently losing the user's progress.
    completedPhases: {
      type: [Number],
      default: []
    },
    generatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

/**
 * Education phases run in sequence, so "completed" is always a prefix of the
 * roadmap: you cannot have finished Class 12 while Class 11 is outstanding.
 *
 * Lives on the model because more than one place needs the rule — the roadmap
 * itself normalises progress with it, and the milestone list uses it to decide
 * which badges are still earned. Two copies would drift, and the drift would
 * show up as a badge for a phase the student had reopened.
 */
roadmapSchema.statics.completedPrefix = (completed = []) => {
  if (!completed || !completed.length) return [];
  const highest = Math.max(...completed);
  return Array.from({ length: highest + 1 }, (_, i) => i);
};

module.exports = mongoose.model('CareerRoadmap', roadmapSchema, 'career_roadmaps');
