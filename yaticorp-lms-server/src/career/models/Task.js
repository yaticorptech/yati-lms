const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User'
    },
    roadmapId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'CareerRoadmap'
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String
    },
    category: {
      type: String,
      enum: ['Daily', 'Weekly', 'Monthly'],
      default: 'Daily'
    },
    /**
     * What the student needs before they can do this task.
     *
     *   video — a concept best learned by watching someone do it
     *   read  — a concept a short written explanation covers
     *   none  — nothing to learn first; today is just doing it
     *
     * Decided when the task is generated, because only then is the reasoning
     * about the work itself. A task with 'none' gets no lesson at all and is
     * ticked off by hand — offering to build a tutorial for "push your code to
     * GitHub" wastes the student's time on something they already know.
     *
     * Defaults to 'video' so tasks created before this field existed behave
     * exactly as they did.
     */
    learning: {
      type: String,
      enum: ['video', 'read', 'none'],
      default: 'video'
    },
    /**
     * The steps for a task with nothing to learn first.
     *
     * Only ever populated when `learning` is 'none'. Those tasks get no video,
     * no notes and no quiz, so without this the student is handed a title, a
     * one-line description and a tick — and left to work out the rest. This is
     * the whole of the help they receive, so it carries the actual steps.
     */
    guidance: {
      type: [String],
      default: undefined
    },
    /**
     * The tracked skill this task moves forward, named exactly as the row in
     * SkillProgress.
     *
     * Completing a task used to advance EVERY skill the student had by the same
     * amount, so twenty tasks promoted the whole tracker at once and the Skills
     * page became a re-skinned task counter — every row showing an identical
     * percentage. Worse, that number is what decides which skills get sent to
     * the job matcher, so work never done was being advertised as experience.
     *
     * Chosen by the model at generation time, from the student's own tracked
     * skills, because that is the only point at which the reasoning is about
     * what the task actually teaches. Optional: tasks written before this field
     * existed carry nothing, and a task that genuinely advances no tracked
     * skill (attend a lecture, email a professor) should carry nothing either.
     */
    skill: {
      type: String,
      trim: true
    },
    duration: {
      type: String, // e.g., '45 mins', '2 hours'
      default: '30 mins'
    },
    dueDate: {
      type: Date
    },
    // The day this task belongs to, normalised to local midnight. This is what
    // makes the plan daily: today's tasks are the ones stamped with today, and
    // anything still Pending on an earlier day has been skipped.
    assignedDate: {
      type: Date,
      index: true
    },
    status: {
      type: String,
      enum: ['Pending', 'Completed', 'Skipped'],
      default: 'Pending'
    },
    // Stamped when the day rolled over with this task still Pending. Kept apart
    // from `status` so the profile can say *when* it was missed, not just that
    // it was.
    skippedAt: {
      type: Date
    },
    // Stamped the moment a task first flips to Completed. `updatedAt` cannot
    // stand in for this: any later edit would move it and silently rewrite the
    // user's streak history.
    completedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Fetching "today's plan" and sweeping "everything still pending before today"
// are the two hot queries; both filter on user + day.
taskSchema.index({ userId: 1, assignedDate: 1 });

module.exports = mongoose.model('CareerTask', taskSchema, 'career_tasks');
