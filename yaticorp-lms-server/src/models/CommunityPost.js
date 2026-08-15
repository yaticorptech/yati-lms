/**
 * @author Preethesh Kulal
 * @description Mongoose schema for student community forum posts
 */
const mongoose = require('mongoose');

const communityPostSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    content: {
        type: String,
        required: true
    },
    // We can allow posts optionally linked to courses later if the user requests it. 
    // Right now, this acts as a global community forum.
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        default: null
    },
    comments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CommunityComment'
    }],
    upvotes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, { timestamps: true });

module.exports = mongoose.model('CommunityPost', communityPostSchema);
