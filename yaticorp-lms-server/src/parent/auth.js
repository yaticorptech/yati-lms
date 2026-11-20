/**
 * Parent accounts (2026-11-19, the user: "create a dashboard for parents … they will login using card and they will
 * add their child's card number and they will get all the activities of students").
 *
 * A parent registers their OWN card (its number, typed or scanned — no CVV since 2026-11-19, the user's ask) — one card, one account, as for students
 * and teachers: the card is marked 'used'. The account is kept on that card (Card.parent), since the database takes no
 * new collections. They sign in with the card number (or the mobile number they gave) and their password, at the same
 * sign-in box as everyone: the student sign-in answers PARENT_CARD for a parent's card, and the app finishes here.
 */
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Card = require('../models/Card');
const generateToken = require('../utils/generateToken');
const { normaliseCardNumber, findUserByCardNumber } = require('../utils/cardNumber');
const { validatePasswordStrength } = require('../middleware/validatePassword');

const AVAILABLE_CARD = ['unactivated', 'activated'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The card a number names, matched as digits (a few older ones carry spaces). */
const cardByNumber = (raw) => {
    const digits = normaliseCardNumber(raw);
    if (!digits || digits.length !== 12) return null;
    return Card.findOne({ CardNumber: { $in: [digits, digits.replace(/(\d{4})(?=\d)/g, '$1 ')] } });
};
/** The parent account on this card number, or null. */
const findParentByCard = async (raw) => {
    const card = await cardByNumber(raw);
    return card?.parent?.password ? card : null;
};

/** What the parent's own screens get: never the password. */
const view = (card) => ({
    _id: card._id,
    role: 'parent',
    name: card.parent.name,
    phone: card.parent.phone || '',
    email: card.parent.email || '',
    cardNumber: normaliseCardNumber(card.CardNumber),
    children: (card.parent.children || []).map((c) => String(c.userId)),
    createdAt: card.parent.createdAt
});

/** Every parent route: a parent's token (role 'parent', the card's id), for an account still on. */
const protectParent = async (req, res, next) => {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) return res.status(401).json({ message: 'Not authorized, no token' });
    try {
        const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET);
        if (decoded.role !== 'parent') return res.status(401).json({ message: 'Not authorized as a parent' });
        const card = await Card.findById(decoded.id);
        if (!card?.parent?.password || card.parent.active === false || card.status === 'inactive') return res.status(401).json({ message: 'Not authorized or account inactive' });
        const changed = card.parent.passwordChangedAt;
        if (changed && typeof decoded.iat === 'number' && decoded.iat * 1000 < changed.getTime() - 1000) {
            return res.status(401).json({ code: 'PASSWORD_CHANGED', message: 'Your password was changed. Please sign in again.' });
        }
        req.parentCard = card;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') return res.status(401).json({ message: 'Session expired' });
        return res.status(401).json({ message: 'Not authorized, token invalid' });
    }
};

const welcome = async (res, card) => {
    if (card.parent.active === false || card.status === 'inactive') return res.status(403).json({ code: 'ACCOUNT_INACTIVE', message: 'This parent account is not active. Contact support.' });
    await Card.updateOne({ _id: card._id }, { $inc: { 'parent.loginCount': 1 }, $set: { 'parent.lastLoginAt': new Date() } });
    return res.json({ ...view(card), token: generateToken(card._id, 'parent') });
};

/**
 * Registering: { cardNumber, name, phone, email?, password }. The card must exist, be free (not used, not inactive)
 * and verified by a super admin — the same rules as a student's sign-up, which needs no CVV either.
 */
const register = async (req, res) => {
    try {
        const b = req.body || {};
        const name = String(b.name ?? '').trim();
        const phone = String(b.phone ?? '').trim();
        const email = String(b.email ?? '').trim().toLowerCase();
        const password = typeof b.password === 'string' ? b.password : '';
        const digits = normaliseCardNumber(b.cardNumber);
        if (!digits || digits.length !== 12) return res.status(400).json({ field: 'cardNumber', message: 'A card number has 12 digits.' });
        if (name.length < 2 || name.length > 80) return res.status(400).json({ field: 'name', message: 'Please enter your full name.' });
        const phoneDigits = phone.replace(/\D/g, '');
        if (!/^\+?[\d\s().-]+$/.test(phone) || phoneDigits.length < 10 || phoneDigits.length > 15) return res.status(400).json({ field: 'phone', message: 'Please enter a valid mobile number.' });
        if (email && (!EMAIL_PATTERN.test(email) || email.length > 254)) return res.status(400).json({ field: 'email', message: 'Enter a valid email address, or leave it empty.' });
        if (!password) return res.status(400).json({ field: 'password', message: 'Please choose a password.' });
        const weak = validatePasswordStrength(password);
        if (weak) return res.status(400).json({ field: 'password', message: weak });

        const card = await cardByNumber(digits);
        if (!card) return res.status(400).json({ field: 'card', code: 'CARD_INVALID', message: 'No card has that number. Check the number printed on your card.' });
        if (card.status === 'used' || card.parent?.password) return res.status(400).json({ field: 'card', code: 'CARD_USED', message: 'This card already has an account. Sign in instead.' });
        if (!AVAILABLE_CARD.includes(card.status)) return res.status(400).json({ field: 'card', code: 'CARD_INACTIVE', message: 'This card is inactive and cannot be used.' });
        const { isVerified, NOT_VERIFIED } = require('../services/cardVerification');
        if (!isVerified(card)) return res.status(400).json({ field: 'card', ...NOT_VERIFIED });
        if (await findUserByCardNumber(digits) || await require('../teacher/accounts').findTeacherByCard(digits)) {
            return res.status(400).json({ field: 'card', code: 'CARD_USED', message: 'This card already has an account. Sign in instead.' });
        }
        const hash = await bcrypt.hash(password, await bcrypt.genSalt(10));
        // Claimed in one step: two people can never register the same card.
        const claimed = await Card.findOneAndUpdate(
            { _id: card._id, status: { $in: AVAILABLE_CARD }, 'parent.password': { $exists: false } },
            { $set: { status: 'used', parent: { name, phone, email, password: hash, createdAt: new Date(), lastLoginAt: new Date(), loginCount: 1, active: true, children: [] } } },
            { new: true }
        );
        if (!claimed) return res.status(400).json({ field: 'card', code: 'CARD_USED', message: 'This card already has an account. Sign in instead.' });
        res.status(201).json({ ...view(claimed), token: generateToken(claimed._id, 'parent') });
    } catch (error) {
        console.error('[parent] registration failed:', error.message);
        res.status(500).json({ message: 'Your account could not be created just now. Please try again.' });
    }
};

/** Signing in: { login (card or mobile number), password }. */
const login = async (req, res) => {
    try {
        const { password } = req.body || {};
        const typed = String(req.body?.login ?? req.body?.cardNumber ?? '').trim();
        if (!typed || typeof password !== 'string' || !password) return res.status(400).json({ message: 'Enter your card number or mobile number, and your password.' });
        let card = await findParentByCard(typed);
        if (!card) {
            // A mobile number: the parent account (or accounts) that gave it, told apart by the password.
            const digits = typed.replace(/\D/g, '');
            if (digits.length >= 10) {
                const last10 = digits.slice(-10);
                const all = await Card.find({ 'parent.password': { $exists: true }, 'parent.phone': { $regex: `${last10.split('').join('\\D*')}$` } });
                const matching = [];
                for (const c of all) if (await bcrypt.compare(password, c.parent.password)) matching.push(c);
                if (matching.length === 1) return welcome(res, matching[0]);
                if (matching.length > 1) return res.status(409).json({ code: 'PHONE_SHARED', message: 'More than one parent account uses this number. Sign in with your card number.' });
                if (all.length) return res.status(401).json({ code: 'WRONG_PASSWORD', message: 'Wrong password. Try again.' });
            }
            return res.status(401).json({ code: 'NO_ACCOUNT', message: 'No parent account found with this card number or mobile number.' });
        }
        if (!(await bcrypt.compare(password, card.parent.password))) return res.status(401).json({ code: 'WRONG_PASSWORD', message: 'Wrong password. Try again.' });
        return welcome(res, card);
    } catch (error) {
        console.error('[parent] sign-in failed:', error.message);
        res.status(500).json({ message: 'Could not sign you in just now. Please try again.' });
    }
};

/** Changing the password, signed in: { current, password }. Older sessions end. */
const changePassword = async (req, res) => {
    try {
        const { current, password } = req.body || {};
        const card = req.parentCard;
        if (typeof current !== 'string' || !(await bcrypt.compare(current, card.parent.password))) return res.status(400).json({ field: 'current', message: 'Your current password is not right.' });
        const weak = typeof password === 'string' && password ? validatePasswordStrength(password) : 'Please choose a new password.';
        if (weak) return res.status(400).json({ field: 'password', message: weak });
        const hash = await bcrypt.hash(password, await bcrypt.genSalt(10));
        await Card.updateOne({ _id: card._id }, { $set: { 'parent.password': hash, 'parent.passwordChangedAt': new Date() } });
        res.json({ message: 'Password changed.', token: generateToken(card._id, 'parent') });
    } catch (error) {
        console.error('[parent] password change failed:', error.message);
        res.status(500).json({ message: 'Could not change your password just now.' });
    }
};

module.exports = { register, login, changePassword, protectParent, view, findParentByCard, cardByNumber };
