/**
 * @description Where a student is in each course's videos, kept on the server
 * so it follows them between devices. One row per student and course: the
 * lesson that was open, and the position reached in each lesson's video.
 *
 * `at` is the client's clock when it saved, not the server's: a phone and a
 * laptop each compare their own copy against this one, and the later save
 * wins. The browser keeps the same copy in localStorage for the offline case.
 */
const mongoose = require('mongoose');

const positionSchema = new mongoose.Schema({
    seconds: { type: Number, required: true, min: 0 },
    at: { type: Date, required: true }
}, { _id: false });

const playbackSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    courseId: {
        type: String,
        ref: 'Course',
        required: true
    },
    activeLessonId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lesson',
        default: null
    },
    activeLessonAt: {
        type: Date,
        default: null
    },
    // Keyed by lesson id.
    positions: {
        type: Map,
        of: positionSchema,
        default: () => new Map()
    }
}, { timestamps: true });

playbackSchema.index({ userId: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.model('Playback', playbackSchema);
