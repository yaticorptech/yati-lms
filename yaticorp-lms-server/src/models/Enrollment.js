/**
 * @author Preethesh Kulal
 * @description Mongoose schema for student course and bundle enrollments
 */
const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    courseId: {
        type: String,
        ref: 'Course',
        index: true
    },
    bundleId: {
        type: String,
        ref: 'Bundle',
        index: true
    },
    type: {
        type: String,
        enum: ['Course', 'Bundle'],
        required: true
    },
    assignedBy: {
        type: String,
        enum: ['system', 'admin'],
        default: 'system'
    },
    assignedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('Enrollment', enrollmentSchema);
