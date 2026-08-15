/**
 * @author Preethesh Kulal
 * @description Mongoose schema for community post comments supporting both User and Admin authors
 */
const mongoose = require('mongoose');

const communityCommentSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'authorModel',
        required: true
    },
    authorModel: {
        type: String,
        enum: ['User', 'Admin'],
        default: 'User'
    },
    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CommunityPost',
        required: true
    },
    content: {
        type: String,
        required: true
    },
    isAdminReply: {
        type: Boolean,
        default: false
    },
    upvotes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, { timestamps: true });

module.exports = mongoose.model('CommunityComment', communityCommentSchema);
