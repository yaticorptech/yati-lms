/**
 * @author Preethesh Kulal
 * @description Admin moderation of community posts: view all, delete, reply to posts
 */
const CommunityPost = require('../models/CommunityPost');
const CommunityComment = require('../models/CommunityComment');

// @desc    Get all community posts (Admin view)
// @route   GET /api/admin/community
// @access  Private/Admin
const getAdminPosts = async (req, res) => {
    try {
        const posts = await CommunityPost.find({})
            .populate('author', 'name email')
            .populate({
                path: 'comments',
                populate: { path: 'author', select: 'name email role' },
                options: { sort: { createdAt: 1 } }
            })
            .sort('-createdAt');

        const postsWithCounts = posts.map(post => ({
            ...post.toObject(),
            commentCount: post.comments ? post.comments.length : 0
        }));

        res.json({ posts: postsWithCounts });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Delete a community post
// @route   DELETE /api/admin/community/:id
// @access  Private/Admin
const deleteAdminPost = async (req, res) => {
    try {
        const post = await CommunityPost.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Delete all associated comments first
        await CommunityComment.deleteMany({ post: post._id });

        // Then delete the post
        await post.deleteOne();

        res.json({ message: 'Post and associated comments removed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Delete a specific comment
// @route   DELETE /api/admin/community/comments/:id
// @access  Private/Admin
const deleteAdminComment = async (req, res) => {
    try {
        const comment = await CommunityComment.findById(req.params.id);

        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        const postId = comment.post;

        // Remove from DB
        await comment.deleteOne();

        // Also rip it out of the Post's array, though Mongoose usually skips stale refs gracefully, this is cleaner
        await CommunityPost.findByIdAndUpdate(postId, {
            $pull: { comments: req.params.id }
        });

        res.json({ message: 'Comment removed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Admin reply to a community post
// @route   POST /api/community/admin/:id/reply
// @access  Private/Admin
const replyToPost = async (req, res) => {
    try {
        const { message } = req.body;
        if (!message || !message.trim()) {
            return res.status(400).json({ message: 'Reply message is required.' });
        }

        const post = await CommunityPost.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Create a comment attributed to admin
        const comment = await CommunityComment.create({
            post: post._id,
            author: req.admin._id,
            authorModel: 'Admin',
            content: message.trim(),
            isAdminReply: true
        });

        post.comments.push(comment._id);
        await post.save();

        res.status(201).json({ message: 'Reply posted successfully', comment });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    getAdminPosts,
    deleteAdminPost,
    deleteAdminComment,
    replyToPost
};
