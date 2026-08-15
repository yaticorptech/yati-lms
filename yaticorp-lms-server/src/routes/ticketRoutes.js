/**
 * @author Preethesh Kulal
 * @description Public and admin routes for support ticket management
 */
const express = require('express');
const router = express.Router();

const { createTicket, sendAdminMessage } = require('../controllers/ticketController');
const { protectAdmin } = require('../middleware/authMiddleware');

// Public on purpose: the support form is reachable from the login and signup
// pages, where the visitor has no account yet.
router.post('/', createTicket);

// ✅ Admin message route — sends email to the ticket reporter, so admin-only
router.post('/admin/:id/message', protectAdmin, sendAdminMessage);

module.exports = router;