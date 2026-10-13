/**
 * @author Preethesh Kulal
 * @description Student community: create posts, add comments, update and delete own posts
 */
const CommunityPost = require('../models/CommunityPost');
const CommunityComment = require('../models/CommunityComment');
const mongoose = require('mongoose');
const User = require('../models/User'); // Required for populate

// What every student may see of another: a name and a picture. Never the email
// address — the whole feed went to every student with each author's address,
// replies (and the admin's) included.
const AUTHOR = 'name profilePicture';

// Text with something in it: a title or reply of only spaces is empty.
const text = (value) => (typeof value === 'string' ? value.trim() : '');

// A post address that is not an id is a post that does not exist (404), not a
// "Server error" from the failed lookup.
const notAPost = (id) => !mongoose.isValidObjectId(id);

// @desc    Get all community posts
// @route   GET /api/user/community
// @access  Private/User
const getPosts = async (req, res) => {
    try {
        const posts = await CommunityPost.find({})
            .populate('author', AUTHOR)
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

// @desc    Get single community post with comments
// @route   GET /api/user/community/:id
// @access  Private/User
const getPostById = async (req, res) => {
    try {
        if (notAPost(req.params.id)) return res.status(404).json({ message: 'Post not found' });
        const post = await CommunityPost.findById(req.params.id)
            .populate('author', AUTHOR)
            .populate({
                path: 'comments',
                populate: { path: 'author', select: AUTHOR },
                options: { sort: { 'createdAt': 1 } } // Oldest comments first
            });

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        res.json({ post });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Create a new community post
// @route   POST /api/user/community
// @access  Private/User
const createPost = async (req, res) => {
    try {
        const title = text(req.body?.title);
        const content = text(req.body?.content);

        if (!title || !content) {
            return res.status(400).json({ message: 'Title and content are required' });
        }

        const newPost = await CommunityPost.create({
            author: req.user._id,
            title,
            content
        });

        const populatedPost = await CommunityPost.findById(newPost._id)
            .populate('author', AUTHOR);

        res.status(201).json({ post: populatedPost });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Add a comment to a post
// @route   POST /api/user/community/:id/comments
// @access  Private/User
const addComment = async (req, res) => {
    try {
        const content = text(req.body?.content);
        const postId = req.params.id;

        if (!content) {
            return res.status(400).json({ message: 'Comment content is required' });
        }
        if (notAPost(postId)) return res.status(404).json({ message: 'Post not found' });

        const post = await CommunityPost.findById(postId);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const newComment = await CommunityComment.create({
            author: req.user._id,
            post: postId,
            content
        });

        // Add to post array
        post.comments.push(newComment._id);
        await post.save();

        const populatedComment = await CommunityComment.findById(newComment._id)
            .populate('author', AUTHOR);

        res.status(201).json({ comment: populatedComment });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
// @desc    Update a community post
// @route   PUT /api/user/community/:id
// @access  Private/User
const updatePost = async (req, res) => {
    try {
        const { title, content } = req.body || {};
        const postId = req.params.id;
        if (notAPost(postId)) return res.status(404).json({ message: 'Post not found' });

        // A field that is sent must say something; one that is left out stays as it was.
        if ((title !== undefined && !text(title)) || (content !== undefined && !text(content))) {
            return res.status(400).json({ message: 'Title and content cannot be empty' });
        }

        const post = await CommunityPost.findById(postId);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // ✅ Only author can edit
        if (post.author.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        // Update fields
        if (title !== undefined) post.title = text(title);
        if (content !== undefined) post.content = text(content);

        await post.save();

        const updatedPost = await CommunityPost.findById(post._id)
            .populate('author', AUTHOR);

        res.json({ post: updatedPost });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
// @desc    Delete a community post
// @route   DELETE /api/user/community/:id
// @access  Private/User
const deletePost = async (req, res) => {
    try {
        const postId = req.params.id;
        if (notAPost(postId)) return res.status(404).json({ message: 'Post not found' });

        const post = await CommunityPost.findById(postId);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // ✅ Only author can delete
        if (post.author.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        // Optional: delete all comments also
        await CommunityComment.deleteMany({ post: postId });

        await post.deleteOne();

        res.json({ message: 'Post deleted successfully' });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    getPosts,
    getPostById,
    createPost,
    addComment,
     updatePost,     
    deletePost 
};
