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
 * (registration, password reset, admin sign-in, the view-as-student exchange).
 *
 * Counted per IP — and a whole classroom signs in from one IP, behind the
 * school's router. At 100 a classroom locked itself out after about fifty
 * sign-ins (a scan and a login each). Card scans and student logins now have
 * limiters of their own below, so this one only sees the rarer requests, and
 * is raised to suit a shared connection.
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // 300 attempts per window, per IP
    message: {
        status: 429,
        success: false,
        message: 'Too many authentication attempts from this IP, please try again after 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Reading a card: the sign-in camera (/card-scan) and sign-up's first step
 * (/validate-qr). A lookup, not a password check — the answer is the number
 * printed on the card being held up — so it is generous: a class of sixty
 * scanning in, with a few retries each, is nowhere near it.
 */
const cardLookupLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 card reads per window, per IP
    message: {
        status: 429,
        success: false,
        message: 'Too many card checks from this network, please wait a few minutes and try again'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Student sign-in, per IP: only failed attempts count. A classroom signing in
 * correctly never touches it; someone trying passwords from one machine does.
 */
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // 200 failed sign-ins per window, per IP
    skipSuccessfulRequests: true,
    message: {
        status: 429,
        success: false,
        message: 'Too many failed sign-ins from this network, please try again after 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/** Just the digits of a card number, as the login reads it. */
const cardKey = (req) => String(req.body?.cardNumber ?? '').replace(/\D/g, '');

/**
 * Student sign-in, per card: ten wrong passwords for one card in fifteen
 * minutes, from anywhere. The per-IP limit cannot protect an account from
 * guesses spread over many addresses; this can, and it never slows down the
 * rest of a classroom that shares the guesser's connection. Successful
 * sign-ins do not count. A request without a card number is left to the
 * per-IP limiter.
 */
const loginCardLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 failed sign-ins per window, per card
    skipSuccessfulRequests: true,
    skip: (req) => !cardKey(req),
    keyGenerator: (req) => `card:${cardKey(req)}`,
    message: {
        status: 429,
        success: false,
        message: 'Too many wrong passwords for this card. Wait 15 minutes, or use "Forgot password?" to set a new one.'
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
    cardLookupLimiter,
    loginLimiter,
    loginCardLimiter,
    lookupLimiter
};
