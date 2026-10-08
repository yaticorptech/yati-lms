/**
 * @author Preethesh Kulal
 * @description Mongoose schema for tracking student lesson completion and quiz progress
 */
const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    courseId: {
        type: String,
        ref: 'Course',
        required: true,
        index: true
    },
    completedLessons: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lesson'
    }],
    percentage: {
        type: Number,
        default: 0
    },
    lastAccessedLesson: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lesson'
    },
    passedQuizzes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz'
    }],
    attemptedQuizzesForCredit: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz'
    }]
}, { timestamps: true });

// One progress record per student and course. Every write is an upsert on this
// pair, and the index makes two concurrent first visits collapse into one row
// instead of leaving duplicates that double-count in the organization views.
// A database that already holds duplicates refuses to build it (the server
// keeps running, without the index) — run `node scripts/dedupeProgress.js`
// (dry run) and then with --apply, which merges them and builds the index.
progressSchema.index({ userId: 1, courseId: 1 }, { unique: true });

/**
 * The student's progress document for this course, created empty if there is
 * none — in one atomic upsert, never find-then-create, so two tabs opening a
 * course at once cannot each insert a row. Returns a full document, so callers
 * may change it and save(). A duplicate-key error (two upserts racing on the
 * unique index) means the other one won, so its row is read back.
 */
progressSchema.statics.findOrCreate = async function (userId, courseId) {
    const filter = { userId, courseId };
    try {
        return await this.findOneAndUpdate(
            filter,
            { $setOnInsert: { percentage: 0 } },
            { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
        );
    } catch (error) {
        if (error.code === 11000) return this.findOne(filter);
        throw error;
    }
};

module.exports = mongoose.model('Progress', progressSchema);
