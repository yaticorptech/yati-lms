/**
 * @author Preethesh Kulal
 * @description Mongoose schema for course lessons supporting video, PDF, quiz and assignment types
 */
const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
    moduleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Module',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['video', 'pdf', 'quiz', 'assignment', 'generic'],
        default: 'video'
    },
    videoUrl: {
        type: String // Legacy URL
    },
    videoSource: {
        type: String,
        enum: ['youtube', 'vdocipher', 'bunny', 'generic', 'aws'],
        default: 'youtube'
    },
    videoId: {
        type: String // Use for VdoCipher ID, YouTube ID, or Bunny ID
    },
    libraryId: {
        type: String // Required for Bunny.net Stream
    },
    vdocipherStatus: {
        type: String,
        default: 'pre-upload' // Options: pre-upload, queued, processing, ready, error
    },
    pdfUrl: {
        type: String
    },
    attachments: [{
        _id: false,
        name: { type: String, required: true },
        url: { type: String, required: true }
    }],
    quizId: {
        type: String
    },
    assignmentId: {
        type: String
    },
    order: {
        type: Number,
        required: true,
        default: 0
    },
    isPublished: {
        type: Boolean,
        default: true
    },
    allowDownload: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('Lesson', lessonSchema);
