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
    },
    // Set when the student deletes it from My Certificates. It is hidden from
    // their profile, never destroyed: the record is the course's completion,
    // which the school's dashboard, the ATS resume and the certificate's own
    // number all rest on. Downloading it again from the course clears this.
    hiddenAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

// Ensure a user only gets one certificate per course
certificateSchema.index({ userId: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.model('Certificate', certificateSchema);
