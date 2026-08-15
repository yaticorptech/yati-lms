/**
 * @author Preethesh Kulal
 * @description Mongoose schema for platform announcements sent to students
 */
const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    },

    // ✅ FIXED (no ref to avoid issue)
    readBy: [
        {
            type: mongoose.Schema.Types.ObjectId
        }
    ]

}, { timestamps: true });

module.exports = mongoose.model('Announcement', announcementSchema);