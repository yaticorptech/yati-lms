/**
 * @author Preethesh Kulal
 * @description Public authentication routes: student/admin login, registration, QR validation
 */
const express = require('express');
const router = express.Router();
const { authLimiter, cardLookupLimiter, loginLimiter, loginCardLimiter } = require('../middleware/rateLimiter');

// ── Registration & Card Validation ──────────────────────────────────────────
const { validateQR, verifyCard, registerStudent, getPublishedContent, scanCard } = require('../controllers/registrationController');

router.get('/published-content', getPublishedContent);
// Reading a card has its own, roomier limit (see rateLimiter.js): a whole
// classroom does it from one IP.
router.post('/validate-qr', cardLookupLimiter, validateQR);
// Scanning the card at sign-in: the QR resolves to the card number to log in with.
router.post('/card-scan', cardLookupLimiter, scanCard);
router.post('/verify-card', authLimiter, verifyCard);
router.post('/register', authLimiter, registerStudent);

// ── Student Login ────────────────────────────────────────────────────────────
// Failed attempts only, counted per IP and per card (see rateLimiter.js).
const { loginUser } = require('../controllers/userAuthController');
router.post('/student/login', loginLimiter, loginCardLimiter, loginUser);

// ── Admin view-as-student ────────────────────────────────────────────────────
// The admin panel opens the student app with a short-lived, single-use code
// (adminUserController.openStudentDashboard); the student app trades it here
// for the two-hour session. Public, because the tab it lands in has no session.
const { exchangeAdminAccess } = require('../controllers/adminUserController');
router.post('/admin-access/exchange', authLimiter, exchangeAdminAccess);

// ── Student Password Reset ───────────────────────────────────────────────────
const { forgotPassword, forgotPasswordPreview, resetPassword } = require('../controllers/userPasswordController');
router.post('/student/forgot-password/preview', cardLookupLimiter, forgotPasswordPreview);
router.post('/student/forgot-password', authLimiter, forgotPassword);
router.post('/student/reset-password', authLimiter, resetPassword);

// ── Admin Login ──────────────────────────────────────────────────────────────
const { loginAdmin, verify2FA, setup2FA, enable2FA } = require('../controllers/adminAuthController');
const { protectAdmin } = require('../middleware/authMiddleware');

router.post('/admin/login', authLimiter, loginAdmin);

// ── Admin Password Reset (organization admins; see services/adminPasswordReset.js)
const { forgotAdminPassword, resetAdminPassword } = require('../controllers/adminAuthController');
router.post('/admin/forgot-password', authLimiter, forgotAdminPassword);
router.post('/admin/reset-password', authLimiter, resetAdminPassword);
router.post('/admin/verify-2fa', authLimiter, verify2FA);
router.post('/admin/setup-2fa', protectAdmin, setup2FA);
router.post('/admin/enable-2fa', protectAdmin, enable2FA);

module.exports = router;
