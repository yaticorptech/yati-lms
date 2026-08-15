/**
 * @author Preethesh Kulal
 * @description Routes for Bunny.net CDN video integration
 */
const express = require('express');
const router = express.Router();
const bunnyController = require('../controllers/bunnyController');
const { protectAdmin } = require('../middleware/authMiddleware');

// All routes are prefixed with /api/bunny (configured in server.js)
router.post('/create-video', protectAdmin, bunnyController.createVideo);

module.exports = router;
