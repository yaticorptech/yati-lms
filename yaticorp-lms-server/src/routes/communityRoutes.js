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

// ================= USER ROUTES =================

// GET all posts + CREATE post
router.route('/')
    .get(protectUser, getPosts)
    .post(protectUser, createPost);

// GET single + UPDATE + DELETE post  ✅ UPDATED
router.route('/:id')
    .get(protectUser, getPostById)
    .put(protectUser, updatePost)      // ✅ ADD
    .delete(protectUser, deletePost);  // ✅ ADD

// Add comment
router.route('/:id/comments')
    .post(protectUser, addComment);


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