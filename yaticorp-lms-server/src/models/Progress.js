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

module.exports = mongoose.model('Progress', progressSchema);
