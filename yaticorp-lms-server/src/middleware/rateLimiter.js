/**
 * @author Preethesh Kulal
 * @description Express rate limiting middleware to prevent brute force on auth endpoints
 */
const rateLimit = require('express-rate-limit');

/**
 * Global rate limiter for all API requests
 * Limits each IP to 100 requests per 15 minutes window
 */
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10000, // Limit each IP to 100 requests per windowMs
    message: {
        status: 429,
        success: false,
        message: 'Too many requests from this IP, please try again after 15 minutes'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/**
 * Stricter rate limiter for authentication-sensitive routes
 * (login, verify card, register, password reset)
 * Limits each IP to 100 requests per 15 minutes window
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 attempts per window
    message: {
        status: 429,
        success: false,
        message: 'Too many authentication attempts from this IP, please try again after 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Lookups that answer "does this organization ID exist?" — the public
 * /api/organizations/code-available and the student's /student/lookup/:code.
 *
 * Each is asked once per keystroke-pause, so a person never comes near 60 a
 * minute; a script walking the ID space does. Its own counter rather than
 * authLimiter's, so typing an ID cannot use up someone's sign-in attempts.
 */
const lookupLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 lookups per IP per minute
    message: {
        status: 429,
        success: false,
        message: 'Too many lookups from this IP, please wait a minute and try again'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    globalLimiter,
    authLimiter,
    lookupLimiter
};
