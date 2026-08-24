const mongoose = require('mongoose');

const plannerContextSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      unique: true // A user has 1 active planner context
    },
    currentFocus: [{
      type: String
    }],
    skillsToDevelop: [{
      skillName: String,
      level: String,
      progress: Number
    }],
    learningResources: {
      courses: [String],
      books: [String]
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('CareerPlannerContext', plannerContextSchema, 'career_planner_contexts');
