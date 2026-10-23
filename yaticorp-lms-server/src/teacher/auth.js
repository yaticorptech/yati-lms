/**
 * Teacher accounts: registering a card, signing in, and the guard on every
 * teacher route.
 *
 * The cards are the same cards students use. A teacher picks "Teacher" on the
 * sign-in page, registers their card once (card number, CVV, QR — checked
 * together, as student sign-up does) and from then on signs in with card
 * number + password. One card, one account, student or teacher: the card is
 * marked 'used' either way, so it can never open a second account of either
 * kind.
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const generateToken = require('../utils/generateToken');
const { findUserByCardNumber } = require('../utils/cardNumber');
const { validatePasswordStrength } = require('../middleware/validatePassword');
const { Teacher } = require('./models');
const { AccountError, createTeacher, findTeacherByCard, EMAIL_PATTERN, escapeRegExp } = require('./accounts');

const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

const PENDING_MESSAGE = 'Your teacher account is waiting for approval by the administrator. You can sign in once it is approved.';
/** Why a teacher who is not active cannot sign in: waiting, or switched off. */
const notActive = (teacher) => (teacher.status === 'pending'
    ? { code: 'PENDING_APPROVAL', message: PENDING_MESSAGE }
    : { code: 'ACCOUNT_INACTIVE', message: 'This teacher account is not active. Contact your administrator.' });

/** What a teacher's own screens get: never the password or reset fields. */
const view = (t) => ({
    _id: t._id,
    name: t.name,
    email: t.email,
    phone: t.phone,
    cardNumber: t.cardNumber,
    institution: t.institution || '',
    department: t.department || '',
    designation: t.designation || '',
    researchArea: t.researchArea || '',
    dailyWordGoal: t.dailyWordGoal || 500,
    organizationId: t.organizationId || null,
    role: 'teacher',
    createdAt: t.createdAt
});

/* ── The guard ─────────────────────────────────────────────────────────── */

/**
 * Every teacher route. A student's token is refused: it names a student, and
 * the role written into it is checked as well as the account it points at.
 */
const protectTeacher = async (req, res, next) => {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) return res.status(401).json({ message: 'Not authorized, no token' });
    try {
        const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET);
        if (decoded.role !== 'teacher') return res.status(401).json({ message: 'Not authorized as a teacher' });
        const teacher = await Teacher.findById(decoded.id);
        if (!teacher || teacher.status !== 'active') return res.status(401).json({ message: 'Not authorized or account inactive' });
        if (teacher.tokenPredatesPassword(decoded.iat)) {
            return res.status(401).json({ code: 'PASSWORD_CHANGED', message: 'Your password was changed. Please sign in again.' });
        }
        req.teacher = teacher;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') return res.status(401).json({ message: 'Session expired' });
        return res.status(401).json({ message: 'Not authorized, token invalid' });
    }
};

/* ── Registering a card ────────────────────────────────────────────────── */

const register = async (req, res) => {
    try {
        const body = req.body || {};
        if (!body.CardNumber || !body.CVV || !body.qrCodeNumber) return res.status(400).json({ field: 'card', message: 'Please verify your card again.' });
        const teacher = await createTeacher(body, { by: 'self' });
        // The admin has switched approval on: the account waits, with no session yet.
        if (teacher.status === 'pending') {
            return res.status(202).json({ pending: true, code: 'PENDING_APPROVAL', name: teacher.name, message: PENDING_MESSAGE });
        }
        res.status(201).json({ ...view(teacher), token: generateToken(teacher._id, 'teacher') });
    } catch (error) {
        if (error instanceof AccountError) {
            // At sign-up a used card means "you already have an account".
            const message = error.code === 'CARD_USED' ? 'This card already has an account. Sign in instead.'
                : error.code === 'CARD_INVALID' ? 'Those card details did not match. Please verify your card again.'
                    : error.code === 'EMAIL_TAKEN' ? 'A teacher account already uses this email address. Use another one, or sign in.'
                        : error.message;
            return res.status(400).json({ field: error.field, ...(error.code ? { code: error.code } : {}), message });
        }
        console.error('[teacher] registration failed:', error.message);
        res.status(500).json({ message: 'Your account could not be created just now. Please try again.' });
    }
};

/* ── Signing in ────────────────────────────────────────────────────────── */

const login = async (req, res) => {
    try {
        const { cardNumber, password } = req.body || {};
        if (!cardNumber || typeof password !== 'string' || !password) {
            return res.status(400).json({ message: 'Enter your card number and password.' });
        }
        const teacher = await findTeacherByCard(cardNumber);
        if (!teacher) {
            // A student's card, at the teacher sign-in: say where it belongs.
            if (await findUserByCardNumber(cardNumber)) {
                return res.status(401).json({ code: 'STUDENT_CARD', message: 'This card is registered to a student account. Choose Student to sign in.' });
            }
            return res.status(401).json({ message: 'Invalid card number or password' });
        }
        if (!(await teacher.matchPassword(password))) return res.status(401).json({ message: 'Invalid card number or password' });
        if (teacher.status !== 'active') return res.status(403).json(notActive(teacher));

        await Teacher.updateOne({ _id: teacher._id }, { $inc: { loginCount: 1 }, $set: { lastLoginAt: new Date() } });
        res.json({ ...view(teacher), token: generateToken(teacher._id, 'teacher') });
    } catch (error) {
        console.error('[teacher] sign-in failed:', error.message);
        res.status(500).json({ message: 'Could not sign you in just now. Please try again.' });
    }
};

/**
 * A scanned card, turned into the number to sign in with. The same lookup as
 * the student scan (registrationController.scanCard), answering for teacher
 * accounts: never the CVV, only the number printed on the card held up.
 */
const cardScan = async (req, res) => {
    try {
        const { scanCandidates, findScannedCard } = require('../controllers/registrationController');
        const raw = String(req.body?.code || '').trim();
        if (!raw) return res.status(400).json({ message: 'Nothing was scanned. Try again.' });
        const candidates = scanCandidates(raw);
        if (!candidates.length) return res.status(400).json({ message: "That code isn't readable. Try scanning again." });
        const card = await findScannedCard(candidates).lean();
        if (!card) return res.status(404).json({ message: 'That card was not recognised. Check the card, or type the number instead.' });
        if (card.status === 'inactive') return res.status(400).json({ message: 'This card is inactive. Contact your administrator.' });
        const teacher = await findTeacherByCard(card.CardNumber);
        if (!teacher) {
            if (await findUserByCardNumber(card.CardNumber)) {
                return res.status(404).json({ code: 'STUDENT_CARD', message: 'This card is registered to a student account. Choose Student to sign in.' });
            }
            return res.status(404).json({ code: 'NOT_REGISTERED', message: 'This card has no teacher account yet. Register your card first.' });
        }
        if (teacher.status !== 'active') return res.status(403).json(notActive(teacher));
        res.json({ cardNumber: String(teacher.cardNumber) });
    } catch (error) {
        console.error('[teacher] card scan failed:', error.message);
        res.status(500).json({ message: 'Server error while reading that card' });
    }
};

/* ── Forgotten password ────────────────────────────────────────────────── */

const FORGOT_REPLY = 'If this card number has a teacher account, a reset link has been sent to its email.';

const forgotPassword = async (req, res) => {
    try {
        const cardNumber = req.body?.cardNumber;
        if (!cardNumber) return res.status(400).json({ message: 'Card number is required' });
        const teacher = await findTeacherByCard(cardNumber);
        if (!teacher) return res.json({ message: FORGOT_REPLY });
        const token = crypto.randomBytes(32).toString('hex');
        await Teacher.updateOne({ _id: teacher._id }, { $set: { resetPasswordToken: hashToken(token), resetPasswordExpiry: new Date(Date.now() + 60 * 60 * 1000) } });
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?as=teacher&token=${token}`;
        // Looked up at call time, so a test can stand in for the mailer.
        await require('../utils/emailService').sendEmail({
            to: teacher.email,
            toName: teacher.name,
            subject: 'Reset your YATICORP teacher password',
            htmlContent: `
                <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 12px;">
                    <h2 style="color: #4f46e5; margin-bottom: 8px;">Password reset</h2>
                    <p style="color: #475569;">Hi ${teacher.name.replace(/[<>&"]/g, '')},</p>
                    <p style="color: #475569;">We received a request to reset the password of your YATICORP teacher account.</p>
                    <a href="${resetUrl}" style="display: inline-block; margin: 24px 0; padding: 14px 28px; background: #4f46e5; color: white; font-weight: bold; text-decoration: none; border-radius: 8px;">Reset my password</a>
                    <p style="color: #94a3b8; font-size: 13px;">This link expires in 1 hour. If you did not ask for it, you can ignore this email.</p>
                </div>`
        });
        res.json({ message: FORGOT_REPLY });
    } catch (error) {
        console.error('[teacher] forgot password failed:', error.message);
        res.status(500).json({ message: 'Failed to send the reset email. Please try again later.' });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body || {};
        if (typeof token !== 'string' || !token || typeof newPassword !== 'string' || !newPassword) {
            return res.status(400).json({ message: 'Token and new password are required' });
        }
        const weak = validatePasswordStrength(newPassword);
        if (weak) return res.status(400).json({ message: weak });
        // Claimed, cleared and set in one update, so a link works once.
        const teacher = await Teacher.findOneAndUpdate(
            { resetPasswordToken: hashToken(token), resetPasswordExpiry: { $gt: new Date() } },
            { $set: { password: await Teacher.hashPassword(newPassword), passwordChangedAt: new Date() }, $unset: { resetPasswordToken: '', resetPasswordExpiry: '' } }
        );
        if (!teacher) return res.status(400).json({ message: 'Invalid or expired reset link. Please request a new one.' });
        res.json({ message: 'Password reset successful. You can now sign in.' });
    } catch (error) {
        console.error('[teacher] reset password failed:', error.message);
        res.status(500).json({ message: 'Could not reset the password just now. Please try again.' });
    }
};

/* ── Their own account ─────────────────────────────────────────────────── */

const me = (req, res) => res.json(view(req.teacher));

const updateMe = async (req, res) => {
    try {
        const body = req.body || {};
        const changes = {};
        const errors = {};
        if (body.name !== undefined) {
            const name = String(body.name || '').trim();
            if (name.length < 2 || name.length > 80) errors.name = 'Name must be 2–80 characters';
            else changes.name = name;
        }
        if (body.email !== undefined) {
            const email = String(body.email || '').trim().toLowerCase();
            if (!EMAIL_PATTERN.test(email) || email.length > 254) errors.email = 'Enter a valid email address';
            else changes.email = email;
        }
        if (body.phone !== undefined) {
            const phone = String(body.phone || '').trim();
            const digits = phone.replace(/\D/g, '').length;
            if (!/^\+?[\d\s().-]+$/.test(phone) || digits < 7 || digits > 15) errors.phone = 'Phone must be 7–15 digits';
            else changes.phone = phone;
        }
        for (const [key, max] of [['institution', 200], ['department', 200], ['designation', 100], ['researchArea', 300]]) {
            if (body[key] !== undefined) changes[key] = String(body[key] || '').trim().slice(0, max);
        }
        if (body.dailyWordGoal !== undefined) {
            const goal = Math.round(Number(body.dailyWordGoal));
            if (!Number.isFinite(goal) || goal < 50 || goal > 20000) errors.dailyWordGoal = 'Daily goal must be between 50 and 20,000 words';
            else changes.dailyWordGoal = goal;
        }
        const wrong = Object.keys(errors);
        if (wrong.length) return res.status(400).json({ field: wrong[0], message: errors[wrong[0]], errors });
        if (changes.email && changes.email !== req.teacher.email
            && await Teacher.exists({ email: new RegExp(`^\\s*${escapeRegExp(changes.email)}\\s*$`, 'i'), _id: { $ne: req.teacher._id } })) {
            return res.status(400).json({ field: 'email', code: 'EMAIL_TAKEN', message: 'A teacher account already uses this email address. Use another one.' });
        }
        const updated = await Teacher.findByIdAndUpdate(req.teacher._id, { $set: changes }, { returnDocument: 'after' });
        res.json(view(updated));
    } catch (error) {
        if (error?.code === 11000 && error.keyPattern?.email) {
            return res.status(400).json({ field: 'email', code: 'EMAIL_TAKEN', message: 'A teacher account already uses this email address. Use another one.' });
        }
        console.error('[teacher] profile update failed:', error.message);
        res.status(500).json({ message: 'Your details could not be saved just now. Please try again.' });
    }
};

const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body || {};
        if (typeof currentPassword !== 'string' || !currentPassword) return res.status(400).json({ field: 'currentPassword', message: 'Enter your current password.' });
        if (typeof newPassword !== 'string' || !newPassword) return res.status(400).json({ field: 'newPassword', message: 'Choose a new password.' });
        if (!(await req.teacher.matchPassword(currentPassword))) {
            // 400, not 401: a wrong current password is a form mistake, not a lost session.
            return res.status(400).json({ field: 'currentPassword', code: 'WRONG_CURRENT_PASSWORD', message: 'That is not your current password.' });
        }
        const weak = validatePasswordStrength(newPassword);
        if (weak) return res.status(400).json({ field: 'newPassword', message: weak });
        await Teacher.updateOne({ _id: req.teacher._id }, { $set: { password: await Teacher.hashPassword(newPassword), passwordChangedAt: new Date(Date.now() - 1500) } });
        // A fresh token for this device; every other session ends.
        res.json({ message: 'Password changed.', token: generateToken(req.teacher._id, 'teacher') });
    } catch (error) {
        console.error('[teacher] password change failed:', error.message);
        res.status(500).json({ message: 'Could not change the password just now. Please try again.' });
    }
};

module.exports = { protectTeacher, register, login, cardScan, forgotPassword, resetPassword, me, updateMe, changePassword, findTeacherByCard, view };
