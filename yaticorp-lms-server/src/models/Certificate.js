/**
 * @author Preethesh Kulal
 * @description Mongoose schema for student course completion certificates
 */
const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
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
    pdfUrl: {
        type: String,
        required: true
    },
    certificateNumber: {
        type: String
    },
    issuedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Ensure a user only gets one certificate per course
certificateSchema.index({ userId: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.model('Certificate', certificateSchema);
