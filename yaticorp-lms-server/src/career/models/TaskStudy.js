const mongoose = require('mongoose');

/**
 * One lesson attached to one planner task: a real YouTube video, notes written
 * about that video, and a quiz drawn from the same material.
 *
 * Distinct from StudyMaterial, which is keyed by skill and only ever holds
 * YouTube *search queries*. Here the video is resolved to a concrete videoId
 * first, and the notes and quiz are generated from it — so the three parts are
 * one lesson rather than three unrelated resources.
 *
 * Generating a pack costs one YouTube search plus one Gemini call, so packs are
 * cached here and reused until the student explicitly regenerates.
 */
const taskStudySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'CareerTask',
      index: true
    },

    // The specific video the notes and quiz were written about. videoId is a
    // real, embeddable ID from the YouTube Data API — not model-invented.
    video: {
      videoId: String,
      title: String,
      channel: String,
      thumbnail: String,
      duration: String,
      durationSeconds: Number,
      searchQuery: String
    },

    // How the student chose to learn this task.
    //
    // 'video' resolves a YouTube tutorial and writes notes about it; 'read' is a
    // self-contained written lesson with no video at all. The distinction has to
    // be stored rather than inferred from `video.videoId`, because a video
    // lesson whose lookup failed also has no videoId — and that is a lesson to
    // retry, not a reading lesson that worked exactly as asked.
    mode: {
      type: String,
      enum: ['video', 'read'],
      default: 'video'
    },

    notes: {
      summary: String,
      sections: [
        {
          heading: String,
          points: [String],
          // Worked example for reading lessons — the bit that makes a written
          // tutorial teachable rather than just a list of assertions. Free text
          // so it can hold a code snippet or a step-by-step walkthrough.
          example: String,
          exampleCaption: String
        }
      ],
      keyTerms: [
        {
          term: String,
          definition: String
        }
      ]
    },

    quiz: [
      {
        question: String,
        options: [String],
        correctIndex: Number,
        explanation: String
      }
    ],

    // How far through the lesson the student actually is. These are the gates
    // that complete the task automatically, so they are only ever set by the
    // server and only ever move forwards — see updateStudyProgress.
    progress: {
      videoWatched: { type: Boolean, default: false },
      videoWatchedAt: Date,
      // Furthest point reached, in seconds. Kept for the "resume"/debug story
      // and so a partial watch survives a page reload.
      watchedSeconds: { type: Number, default: 0 },
      notesRead: { type: Boolean, default: false },
      notesReadAt: Date
    },

    // Stamped when the three gates first all passed and the task was completed
    // without the student ticking anything. Distinct from the task's own
    // completedAt so we can tell an earned completion from a manual override.
    autoCompletedAt: Date,

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

// One lesson per task per user.
taskStudySchema.index({ userId: 1, taskId: 1 }, { unique: true });

module.exports = mongoose.model('CareerTaskStudy', taskStudySchema, 'career_task_studies');
