/**
 * @author Preethesh Kulal
 * @description Mongoose schema for course modules (sections) containing lessons
 */
const mongoose = require('mongoose');

const moduleSchema = new mongoose.Schema({
    courseId: {
        type: String,
        ref: 'Course',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    order: {
        type: Number,
        required: true,
        default: 0
    },
    // Content dripping: unlock this module N days after the student enrolls.
    // 0 = available immediately.
    dripDays: {
        type: Number,
        default: 0,
        min: 0
    }
}, { timestamps: true });

module.exports = mongoose.model('Module', moduleSchema);
