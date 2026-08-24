const mongoose = require('mongoose');

const recommendationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      unique: true // A user has 1 active recommendation mapping
    },
    roadmapId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'CareerRoadmap'
    },
    // Courses from YATICORP's own catalogue that fit this student's goal, picked
    // by the model from a list of real ids and validated against it before it
    // gets here. Kept separate from `courses`, which is outside platforms.
    yaticorpCourses: { type: Array, default: [] },
    colleges: { type: Array, default: [] },
    internships: { type: Array, default: [] },
    courses: { type: Array, default: [] },
    certifications: { type: Array, default: [] },
    books: { type: Array, default: [] },
    scholarships: { type: Array, default: [] },
    youtubeChannels: { type: Array, default: [] },
    practiceResources: { type: Array, default: [] },
    competitions: { type: Array, default: [] },
    communities: { type: Array, default: [] },
    careerTips: { type: Array, default: [] },
    generatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('CareerRecommendation', recommendationSchema, 'career_recommendations');
