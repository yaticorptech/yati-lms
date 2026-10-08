/**
 * @author Preethesh Kulal
 * @description Routes for student community posts and admin moderation
 */
const express = require('express');
const router = express.Router();

const {
    getPosts,
    getPostById,
    createPost,
    addComment,
    updatePost,      // ✅ ADD
    deletePost       // ✅ ADD
} = require('../controllers/userCommunityController');

const {
    getAdminPosts,
    deleteAdminPost,
    deleteAdminComment,
    replyToPost
} = require('../controllers/adminCommunityController');

const { protectUser, protectAdmin } = require('../middleware/authMiddleware');
// Optional XP rules (Reward rules): a forum post / reply, once a day each.
const { xpOnSuccess, today } = require('../rewards/services/xpHooks');

// ================= USER ROUTES =================

// GET all posts + CREATE post
router.route('/')
    .get(protectUser, getPosts)
    .post(protectUser, xpOnSuccess('forum_post', () => `post:${today()}`), createPost);

// GET single + UPDATE + DELETE post  ✅ UPDATED
router.route('/:id')
    .get(protectUser, getPostById)
    .put(protectUser, updatePost)      // ✅ ADD
    .delete(protectUser, deletePost);  // ✅ ADD

// Add comment
router.route('/:id/comments')
    .post(protectUser, xpOnSuccess('forum_comment', () => `comment:${today()}`), addComment);


// ================= ADMIN ROUTES =================

router.route('/admin/all')
    .get(protectAdmin, getAdminPosts);

router.route('/admin/:id')
    .delete(protectAdmin, deleteAdminPost);

router.route('/admin/:id/reply')
    .post(protectAdmin, replyToPost);

router.route('/admin/comments/:id')
    .delete(protectAdmin, deleteAdminComment);

module.exports = router;