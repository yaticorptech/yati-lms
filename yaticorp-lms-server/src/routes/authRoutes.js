/**
 * @author Preethesh Kulal
 * @description Public authentication routes: student/admin login, registration, QR validation
 */
const express = require('express');
const router = express.Router();
const { authLimiter } = require('../middleware/rateLimiter');

// ── Registration & Card Validation ──────────────────────────────────────────
const { validateQR, verifyCard, registerStudent, getPublishedContent } = require('../controllers/registrationController');

router.get('/published-content', getPublishedContent);
router.post('/validate-qr', authLimiter, validateQR);
router.post('/verify-card', authLimiter, verifyCard);
router.post('/register', authLimiter, registerStudent);

// ── Student Login ────────────────────────────────────────────────────────────
const { loginUser } = require('../controllers/userAuthController');
router.post('/student/login', authLimiter, loginUser);

// ── Student Password Reset ───────────────────────────────────────────────────
const { forgotPassword, resetPassword } = require('../controllers/userPasswordController');
router.post('/student/forgot-password', authLimiter, forgotPassword);
router.post('/student/reset-password', authLimiter, resetPassword);

// ── Admin Login ──────────────────────────────────────────────────────────────
const { loginAdmin, verify2FA, setup2FA, enable2FA } = require('../controllers/adminAuthController');
const { protectAdmin } = require('../middleware/authMiddleware');

router.post('/admin/login', authLimiter, loginAdmin);
router.post('/admin/verify-2fa', authLimiter, verify2FA);
router.post('/admin/setup-2fa', protectAdmin, setup2FA);
router.post('/admin/enable-2fa', protectAdmin, enable2FA);

module.exports = router;
