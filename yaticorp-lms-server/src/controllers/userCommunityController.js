/**
 * @author Preethesh Kulal
 * @description Student community: create posts, add comments, update and delete own posts
 */
const CommunityPost = require('../models/CommunityPost');
const CommunityComment = require('../models/CommunityComment');
const User = require('../models/User'); // Required for populate

// @desc    Get all community posts
// @route   GET /api/user/community
// @access  Private/User
const getPosts = async (req, res) => {
    try {
        const posts = await CommunityPost.find({})
            .populate('author', 'name email profilePicture')
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
        const post = await CommunityPost.findById(req.params.id)
            .populate('author', 'name email profilePicture')
            .populate({
                path: 'comments',
                populate: { path: 'author', select: 'name email profilePicture' },
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
        const { title, content } = req.body;

        if (!title || !content) {
            return res.status(400).json({ message: 'Title and content are required' });
        }

        const newPost = await CommunityPost.create({
            author: req.user._id,
            title,
            content
        });

        const populatedPost = await CommunityPost.findById(newPost._id)
            .populate('author', 'name email profilePicture');

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
        const { content } = req.body;
        const postId = req.params.id;

        if (!content) {
            return res.status(400).json({ message: 'Comment content is required' });
        }

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
            .populate('author', 'name email profilePicture');

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
        const { title, content } = req.body;
        const postId = req.params.id;

        const post = await CommunityPost.findById(postId);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // ✅ Only author can edit
        if (post.author.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        // Update fields
        if (title) post.title = title;
        if (content) post.content = content;

        await post.save();

        const updatedPost = await CommunityPost.findById(post._id)
            .populate('author', 'name email profilePicture');

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
