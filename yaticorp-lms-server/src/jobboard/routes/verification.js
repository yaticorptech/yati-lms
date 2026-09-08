/**
 * Job Access Verification — /api/jobs/verification
 *   GET  /                          where the student is
 *   POST /identity/start            open the Aadhaar step
 *   POST /identity/qr               { qrPayload }
 *   POST /identity/otp/send         { mobile? }
 *   POST /identity/otp/verify       { otp }
 *   POST /linkedin                  { profileUrl }
 *   POST /resume/confirm            the file went through POST /api/user/resume; tick the step
 *   POST /profile                   { location, coords?, skills, availability, jobTypes }
 *   POST /advance                   "Continue" from a finished step
 * Never logs request bodies — an OTP arrives in one of them.
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const V = require('../services/jobVerificationService');
const { ProviderError } = require('../services/aadhaar');
const router = express.Router();
const perUser = (req) => (req.user?._id ? String(req.user._id) : ipKeyGenerator(req.ip));
const limiter = (max, windowMs, error) => rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false, keyGenerator: perUser, message: { code: 'RATE_LIMITED', error } });
const otpSend = limiter(6, 10 * 60_000, 'Too many code requests. Try again in a few minutes.');
const otpVerify = limiter(12, 10 * 60_000, 'Too many attempts. Try again in a few minutes.');
const qr = limiter(20, 10 * 60_000, 'Too many scans. Try again in a few minutes.');
const reply = (res, next) => (err) => {
    if (err instanceof V.FlowError || err instanceof ProviderError) {
        const body = { code: err.code, error: err.message };
        for (const k of ['problems', 'attemptsLeft', 'retryAfter', 'state', 'nextStep']) if (err[k] !== undefined) body[k] = err[k];
        return res.status(err.status || 400).json(body);
    }
    next(err);
};
router.get('/', (req, res, next) => V.status(req.user._id).then((v) => res.json(v)).catch(next));
router.post('/identity/start', (req, res, next) => V.startIdentity(req.user._id, req).then((v) => res.json(v)).catch(reply(res, next)));
router.post('/identity/qr', qr, (req, res, next) => {
    const p = req.body?.qrPayload;
    if (typeof p !== 'string' || !p.trim()) return res.status(400).json({ code: 'QR_UNREADABLE', error: 'The QR code could not be read. Try again.' });
    if (p.length > 20000) return res.status(400).json({ code: 'INVALID_QR', error: 'That is not an Aadhaar QR code.' });
    V.validateQr(req.user._id, p, req).then((v) => res.json(v)).catch(reply(res, next));
});
router.post('/identity/otp/send', otpSend, (req, res, next) => V.sendOtp(req.user._id, req, req.body?.mobile).then((v) => res.json(v)).catch(reply(res, next)));
router.post('/identity/otp/verify', otpVerify, (req, res, next) => V.verifyOtp(req.user._id, req.body?.otp, req).then((v) => res.json(v)).catch(reply(res, next)));
router.post('/linkedin', (req, res, next) => V.addLinkedin(req.user._id, req.body?.profileUrl, req).then((v) => res.json(v)).catch(reply(res, next)));
router.post('/resume/confirm', (req, res, next) => V.confirmResume(req.user._id, req).then((v) => res.json(v)).catch(reply(res, next)));
router.post('/profile', (req, res, next) => V.saveProfile(req.user._id, req.body, req).then((v) => res.json(v)).catch(reply(res, next)));
router.post('/advance', (req, res, next) => V.advance(req.user._id, req).then((v) => res.json(v)).catch(reply(res, next)));
module.exports = router;
