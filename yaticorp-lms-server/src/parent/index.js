/**
 * The parent dashboard's API, at /api/parent (2026-11-19). A parent signs in with their own card (auth.js), adds
 * their child by the child's card number, and sees everything the child does (activity.js) — read only: a parent
 * never changes anything in the child's account.
 *
 * The child is linked with the card number alone (the user's choice, 2026-11-19); the student is told in their
 * notifications that a parent now follows their activity.
 */
const express = require('express');
const Card = require('../models/Card');
const User = require('../models/User');
const { findUserByCardNumber, normaliseCardNumber } = require('../utils/cardNumber');
const auth = require('./auth');
const { childSummary, childActivity } = require('./activity');

const router = express.Router();
const MAX_CHILDREN = 6;

router.post('/auth/register', auth.register);
router.post('/auth/login', auth.login);

router.use(auth.protectParent);

const idOf = (x) => String(x?._id ?? x);
const childIds = (card) => (card.parent.children || []).map((c) => idOf(c.userId));

router.get('/me', async (req, res, next) => {
    try {
        const card = req.parentCard;
        const ids = childIds(card);
        const users = await User.find({ _id: { $in: ids } }).select('name cardNumber profilePicture organizationId lastLogin lastActive updatedAt status').lean();
        const children = [];
        for (const id of ids) {
            const u = users.find((x) => idOf(x) === id);
            // A child whose account was deleted: dropped from the list.
            if (u) children.push(await childSummary(u));
        }
        res.json({ ...auth.view(card), children });
    } catch (err) { next(err); }
});

router.post('/me/password', auth.changePassword);

/** Announcements from the organizations of the parent's children (2026-11-19, announcements.js). */
router.get('/announcements', async (req, res, next) => {
    try { res.json({ announcements: await require('./announcements').forParent(childIds(req.parentCard)) }); } catch (err) { next(err); }
});

/** Adding a child: { cardNumber } typed, or { code } — the QR code scanned from the child's card (2026-11-19). */
router.post('/children', async (req, res, next) => {
    try {
        const card = req.parentCard;
        let typed = req.body?.cardNumber;
        if (req.body?.code && !typed) {
            const { scanCandidates, findScannedCard } = require('../controllers/registrationController');
            const candidates = scanCandidates(String(req.body.code).trim());
            const scanned = candidates.length ? await findScannedCard(candidates).lean() : null;
            if (!scanned) return res.status(404).json({ field: 'cardNumber', message: 'That card was not recognised. Scan it again, or type its number.' });
            typed = scanned.CardNumber;
        }
        const digits = normaliseCardNumber(typed);
        if (!digits || digits.length !== 12) return res.status(400).json({ field: 'cardNumber', message: 'A card number has 12 digits.' });
        if (digits === normaliseCardNumber(card.CardNumber)) return res.status(400).json({ field: 'cardNumber', message: 'That is your own card. Enter your child’s card number.' });
        const child = await findUserByCardNumber(digits);
        if (!child) {
            if (await auth.findParentByCard(digits)) return res.status(400).json({ field: 'cardNumber', message: 'That card is a parent’s card. Enter your child’s card number.' });
            if (await require('../teacher/accounts').findTeacherByCard(digits)) return res.status(400).json({ field: 'cardNumber', message: 'That card is a teacher’s card. Enter your child’s card number.' });
            return res.status(404).json({ field: 'cardNumber', message: 'No student uses this card number. Check the number on your child’s card.' });
        }
        if (childIds(card).includes(idOf(child._id))) return res.status(409).json({ field: 'cardNumber', message: `${child.name} is already on your dashboard.` });
        if (childIds(card).length >= MAX_CHILDREN) return res.status(400).json({ field: 'cardNumber', message: `You can follow up to ${MAX_CHILDREN} children.` });
        const updated = await Card.findOneAndUpdate(
            { _id: card._id, 'parent.children.userId': { $ne: child._id }, [`parent.children.${MAX_CHILDREN - 1}`]: { $exists: false } },
            { $push: { 'parent.children': { userId: child._id, addedAt: new Date() } } },
            { new: true }
        );
        if (!updated) return res.status(409).json({ field: 'cardNumber', message: `${child.name} is already on your dashboard.` });
        require('./notify').tellChild(child, card.parent.name).catch(() => {});
        res.status(201).json({ child: await childSummary(child.toObject ? child.toObject() : child) });
    } catch (err) { next(err); }
});

router.delete('/children/:id', async (req, res, next) => {
    try {
        await Card.updateOne({ _id: req.parentCard._id }, { $pull: { 'parent.children': { userId: req.params.id } } });
        res.json({ removed: true });
    } catch (err) { next(err); }
});

/** Everything one child has done: only a child on this parent's list. */
router.get('/children/:id', async (req, res, next) => {
    try {
        if (!childIds(req.parentCard).includes(String(req.params.id))) return res.status(404).json({ message: 'This child is not on your dashboard.' });
        const user = await User.findById(req.params.id).lean();
        if (!user) return res.status(404).json({ message: 'This student’s account no longer exists.' });
        res.json(await childActivity(user));
    } catch (err) { next(err); }
});

// eslint-disable-next-line no-unused-vars
router.use((err, req, res, _next) => {
    console.error('[parent]', err.message);
    if (err.name === 'CastError') return res.status(404).json({ message: 'Not found.' });
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
});

module.exports = router;
