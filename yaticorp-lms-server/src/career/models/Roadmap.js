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

module.exports = mongoose.model('CareerRoadmap', roadmapSchema, 'career_roadmaps');
