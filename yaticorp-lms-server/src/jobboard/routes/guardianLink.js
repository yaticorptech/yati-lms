/**
 * The guardian's half of a part-time job permission, reached by a link.
 *
 * A parent has no account here, so these three routes sit outside the
 * section's sign-in. What protects them is the link itself: 32 random bytes,
 * good for one application, expiring after a fortnight. An operator cannot
 * answer in the guardian's place — there is no route for it anywhere. What an
 * operator does get is the step after this one: once a parent agrees, the LMS
 * signs the application off separately.
 *
 * What the link gives up is deliberately thin: the child's name, the job they
 * were shown, and the two buttons. No account, no contact details, nothing
 * about any other application.
 */
const express = require('express');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const router = express.Router();

const Application = require('../models/JobApplication');
const { SETTLED } = Application;
const { guardianView } = require('../services/applicationService');

// Enough for a parent reading, deciding and pressing a button; not enough to
// work through the token space.
router.use(rateLimit({
    windowMs: 60_000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => ipKeyGenerator(req.ip),
    message: { error: 'Too many requests — try again in a minute.' }
}));

/** The application this link opens, or a clear reason why it does not. */
const byToken = async (token) => {
    const clean = String(token || '');
    if (clean.length < 20) return { error: 'That link is not valid.', status: 404 };
    const row = await Application.findOne({ linkToken: clean });
    if (!row) return { error: 'That link is not valid. Ask for a new one.', status: 404 };
    if (row.linkExpiresAt && row.linkExpiresAt.getTime() < Date.now()) {
        return { row, error: 'That link has expired. Your child can send a new request.', status: 410 };
    }
    return { row };
};

/** GET /:token — what the guardian is being asked to agree to. */
router.get('/:token', async (req, res, next) => {
    try {
        const { row, error, status } = await byToken(req.params.token);
        if (error) return res.status(status).json({ error, ...(row ? { request: guardianView(row) } : {}) });
        res.json({ request: guardianView(row) });
    } catch (err) { next(err); }
});

/** A decision can only be made once, and only while one is being asked for. */
const decide = (verb) => async (req, res, next) => {
    try {
        const { row, error, status } = await byToken(req.params.token);
        if (error) return res.status(status).json({ error });
        if (SETTLED.includes(row.status) || row.status === 'awaiting-admin') {
            return res.status(409).json({ error: 'This request has already been answered.', request: guardianView(row) });
        }
        if (row.status !== 'awaiting-guardian') {
            return res.status(409).json({ error: 'This request is not waiting for an answer.', request: guardianView(row) });
        }
        // A yes does not finish the application, it passes it on: the LMS still
        // has to sign it off. A no ends it here — nobody overrides a parent.
        row.status = verb === 'approve' ? 'awaiting-admin' : 'declined';
        row.decidedAt = new Date();
        if (verb === 'decline') row.declineReason = String(req.body?.reason || '').trim().slice(0, 300);
        await row.save();
        res.json({ request: guardianView(row) });
    } catch (err) { next(err); }
};

router.post('/:token/approve', decide('approve'));
router.post('/:token/decline', decide('decline'));

module.exports = router;
