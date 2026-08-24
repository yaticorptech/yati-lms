const mongoose = require('mongoose');

/**
 * AI-generated study material for one skill: revision notes, video suggestions,
 * and a multiple-choice quiz.
 *
 * Generated on demand and cached here — each generation costs one call against
 * the Gemini free-tier daily quota, so material is reused until the student
 * explicitly regenerates it.
 */
const studyMaterialSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true
    },
    skillName: {
      type: String,
      required: true
    },

    notes: {
      summary: String,
      sections: [
        {
          heading: String,
          points: [String]
        }
      ],
      keyTerms: [
        {
          term: String,
          definition: String
        }
      ]
    },

    // No video IDs: the model invents plausible-looking ones that 404. A search
    // query always resolves to real, current results instead.
    videos: [
      {
        topic: String,
        searchQuery: String,
        channel: String,
        why: String
      }
    ],

    quiz: [
      {
        question: String,
        options: [String],
        correctIndex: Number,
        explanation: String
      }
    ],

    bestScore: {
      type: Number,
      default: 0
    },
    attempts: {
      type: Number,
      default: 0
    },
    lastAttemptAt: Date
  },
  {
    timestamps: true
  }
);

// One material set per skill per user.
studyMaterialSchema.index({ userId: 1, skillName: 1 }, { unique: true });

module.exports = mongoose.model('CareerStudyMaterial', studyMaterialSchema, 'career_study_materials');
