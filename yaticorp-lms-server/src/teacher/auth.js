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
    profilePicture: t.profilePicture || '',
    dailyWordGoal: t.dailyWordGoal || 500,
    organizationId: t.organizationId || null,
    // An AI card opens the research tools; without one, only clubs and units.
    research: Boolean(t.cardNumber),
    // What their organization turned on for them: 360 (they land there) and
    // Scouts & Guides — only with an organization, which makes unit leaders.
    mentor360: Boolean(t.mentor360) && Boolean(t.organizationId),
    scouts: t.scouts !== false && Boolean(t.organizationId),
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

/**
 * The card-less teacher account with this email. A teacher with a card always
 * signs in with it, so an email never opens a carded account.
 */
const withoutCard = (email) => {
    const e = String(email || '').trim().toLowerCase();
    return e ? Teacher.findOne({ email: e, cardNumber: { $in: [null, ''] } }) : null;
};

/** Signed in: counted, stamped and answered with the session. */
const welcome = async (res, teacher) => {
    if (teacher.status !== 'active') return res.status(403).json(notActive(teacher));
    await Teacher.updateOne({ _id: teacher._id }, { $inc: { loginCount: 1 }, $set: { lastLoginAt: new Date() } });
    return res.json({ ...view(teacher), token: generateToken(teacher._id, 'teacher') });
};

// { login, password } — the one sign-in box (2026-10-30): a card number, a
// mobile number or an email (utils/signInLookup) — or the older
// { cardNumber | email, password }.
const login = async (req, res) => {
    try {
        const body = req.body || {};
        const { password } = body;
        let { cardNumber, email } = body;
        if (body.login !== undefined && !cardNumber && !email) {
            const { kindOf, byPhone, SHARED_PHONE, TOO_MANY_ON_PHONE, PASSWORD_NOT_SET } = require('../utils/signInLookup');
            const k = kindOf(body.login);
            if (typeof password !== 'string' || !password || k.kind === 'empty') return res.status(400).json({ message: 'Enter your card number or mobile number, and your password.' });
            if (k.kind === 'email') email = k.value;
            else if (k.kind === 'card' || (k.kind === 'card-or-phone' && (await findTeacherByCard(k.value)))) cardNumber = k.value;
            else {
                const found = await byPhone(Teacher, k.digits, password);
                if (found.account) return welcome(res, found.account);
                if (found.shared) return res.status(409).json({ code: 'PHONE_SHARED', message: SHARED_PHONE });
                if (found.tooMany) return res.status(409).json({ code: 'PHONE_SHARED', message: TOO_MANY_ON_PHONE });
                if (found.pending && !found.wrongPassword) return res.status(401).json({ code: 'PASSWORD_NOT_SET', message: PASSWORD_NOT_SET });
                if (found.wrongPassword) return res.status(401).json({ code: 'WRONG_PASSWORD', message: 'Wrong password. Try again, or use Forgot password.' });
                return res.status(401).json({ code: 'NO_ACCOUNT', message: 'No account found with this mobile number. Check the number, use your card number, or sign up.' });
            }
        }
        // No sign-in by email (2026-10-31): a teacher without a card signs in with
        // the mobile number their organization added them with; one with a card,
        // with the card (or their mobile number).
        if (!cardNumber && email) {
            return res.status(401).json({ code: 'USE_CARD_OR_PHONE', message: 'Sign in with your card number or mobile number, not your email.' });
        }
        if (!cardNumber || typeof password !== 'string' || !password) {
            return res.status(400).json({ message: 'Enter your card number and password.' });
        }
        const teacher = await findTeacherByCard(cardNumber);
        if (!teacher) {
            // A student's card, at the teacher sign-in: say where it belongs.
            if (await findUserByCardNumber(cardNumber)) {
                return res.status(401).json({ code: 'STUDENT_CARD', message: 'This card is registered to a student account.' });
            }
            return res.status(401).json({ code: 'NO_ACCOUNT', message: 'No teacher account found with this card number.' });
        }
        if (!(await teacher.matchPassword(password))) return res.status(401).json({ code: 'WRONG_PASSWORD', message: 'Wrong password. Try again, or use Forgot password.' });
        return welcome(res, teacher);
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

/** Who the card's teacher account is, partly hidden, to confirm before the link is sent. */
const forgotPasswordPreview = async (req, res) => {
    try {
        const { cardNumber, email } = req.body || {};
        if (!cardNumber && !email) return res.status(400).json({ message: 'Card number is required' });
        const teacher = cardNumber ? await findTeacherByCard(cardNumber) : await withoutCard(email);
        if (!teacher) return res.status(404).json({ message: cardNumber ? 'No teacher account was found for this card number.' : 'No teacher account without a card uses this email.' });
        const preview = require('../utils/accountPreview').accountPreview(teacher);
        if (!preview) return res.status(409).json({ message: 'This account has no email on file. Ask your administrator to reset your password.' });
        res.json(preview);
    } catch (error) {
        console.error('[teacher] forgot password preview failed:', error.message);
        res.status(500).json({ message: 'Could not look up that card. Please try again.' });
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { cardNumber, email } = req.body || {};
        if (!cardNumber && !email) return res.status(400).json({ message: 'Card number is required' });
        const teacher = cardNumber ? await findTeacherByCard(cardNumber) : await withoutCard(email);
        if (!teacher) return res.json({ message: FORGOT_REPLY });
        const token = crypto.randomBytes(32).toString('hex');
        await Teacher.updateOne({ _id: teacher._id }, { $set: { resetPasswordToken: hashToken(token), resetPasswordExpiry: new Date(Date.now() + 60 * 60 * 1000) } });
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?as=teacher&token=${token}`;
        // Looked up at call time, so a test can stand in for the mailer. A
        // mail that fails is logged, and the answer stays the same as for a
        // card with no account: "Failed to send" only for real accounts told
        // anyone which cards have one (found in the 2026-10-27 test).
        try {
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
        } catch (mailError) {
            console.error('[teacher] reset email not sent:', mailError.message);
        }
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
            { $set: { password: await Teacher.hashPassword(newPassword), passwordChangedAt: new Date(), passwordPending: false }, $unset: { resetPasswordToken: '', resetPasswordExpiry: '' } }
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
        // A ready-made avatar, or '' to go back to initials. Only the app's own
        // avatars and pictures we hold: never a link to any image online.
        if (body.profilePicture !== undefined) {
            const { normalizePictureUrl } = require('../controllers/userAuthController');
            const picture = normalizePictureUrl(String(body.profilePicture || '').trim());
            if (picture === null) errors.profilePicture = 'Choose one of the pictures shown, or upload a photo.';
            else changes.profilePicture = picture;
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

/** POST /me/picture: a cropped photo (multipart "profilePicture"), stored like a student's. */
const uploadPicture = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'Choose a photo first.' });
        // Looked up at call time, so a test can stand in for the storage.
        const { uploadToBunny } = require('../utils/bunnyStorage');
        const profilePicture = await uploadToBunny(req.file.buffer, 'profile.jpg', 'teacher-pictures');
        const updated = await Teacher.findByIdAndUpdate(req.teacher._id, { $set: { profilePicture } }, { returnDocument: 'after' });
        res.json(view(updated));
    } catch (error) {
        console.error('[teacher] picture upload failed:', error.message);
        res.status(502).json({ message: 'Your photo could not be saved just now. Please try again, or pick an avatar.' });
    }
};

/**
 * "Verify as your organization's teacher" on the sign-up page (2026-10-30):
 * a teacher with no AI card is added by their organization with their name
 * and mobile number only. Given the number, this says whether an
 * organization has added them. One who has not set up their account yet
 * (needsPassword) gets their name and number back, for "Is this you?", and
 * sets it up with orgSetup below; one who has, only their first name and
 * organization, and is sent to sign in. It never reveals a password.
 */
const orgCheck = async (req, res) => {
    try {
        const { kindOf, phonePattern } = require('../utils/signInLookup');
        const k = kindOf(req.body?.phone);
        if (k.kind !== 'phone' && k.kind !== 'card-or-phone') return res.status(400).json({ field: 'phone', message: 'Enter the mobile number your organization added you with.' });
        const found = await Teacher.find({ phone: { $regex: phonePattern(k.digits) }, cardNumber: { $in: [null, ''] }, organizationId: { $ne: null } })
            .select('name phone organizationId status passwordPending').limit(5).lean();
        if (!found.length) {
            return res.status(404).json({ code: 'NOT_ADDED', message: 'No organization has added a teacher with this mobile number yet. Ask your organization to add you, then try again.' });
        }
        const Organization = require('../organizations/models/Organization');
        const orgs = await Organization.find({ _id: { $in: found.map((t) => t.organizationId) } }).select('name three60.programs.name').lean();
        const names = Object.fromEntries(orgs.map((o) => [String(o._id), o.name]));
        // The courses the organization lists (Teachers → Courses & sections), offered as the department.
        const courses = Object.fromEntries(orgs.map((o) => [String(o._id), (o.three60?.programs || []).map((p) => p.name).filter(Boolean)]));
        res.json({
            verified: true,
            teachers: found.map((t) => ({
                firstName: String(t.name || '').trim().split(/\s+/)[0],
                organization: names[String(t.organizationId)] || 'your organization',
                active: t.status === 'active',
                needsPassword: Boolean(t.passwordPending),
                // For "Is this you?": only while the account is still to be set up.
                ...(t.passwordPending ? { id: t._id, name: t.name, phone: t.phone, courses: courses[String(t.organizationId)] || [] } : {})
            }))
        });
    } catch (error) {
        console.error('[teacher] organization check failed:', error.message);
        res.status(500).json({ message: 'Could not check just now. Please try again.' });
    }
};

/**
 * { phone, teacherId?, password, email, designation?, department?, researchArea? }:
 * the account their organization added, set up by the teacher on the sign-up
 * page — their password, then their email and details — and signed in. Only
 * while it waits (passwordPending); after that it is a normal account, signed
 * in with the mobile number and password. `teacherId` picks one when two
 * organizations added the same number.
 */
const orgSetup = async (req, res) => {
    try {
        const body = req.body || {};
        const { kindOf, phonePattern } = require('../utils/signInLookup');
        const k = kindOf(body.phone);
        if (k.kind !== 'phone' && k.kind !== 'card-or-phone') return res.status(400).json({ field: 'phone', message: 'Enter the mobile number your organization added you with.' });
        const filter = { phone: { $regex: phonePattern(k.digits) }, cardNumber: { $in: [null, ''] }, organizationId: { $ne: null }, passwordPending: true };
        if (body.teacherId !== undefined) {
            if (!require('mongoose').isValidObjectId(body.teacherId)) return res.status(400).json({ message: 'Choose your account again.' });
            filter._id = body.teacherId;
        }
        const found = await Teacher.find(filter).limit(2);
        if (!found.length) return res.status(404).json({ code: 'NOT_PENDING', message: 'This account is already set up. Sign in with your mobile number and password.' });
        if (found.length > 1) return res.status(409).json({ code: 'CHOOSE', message: 'More than one organization added this mobile number. Choose which one is you.' });
        const teacher = found[0];
        if (teacher.status !== 'active') return res.status(403).json(notActive(teacher));

        const password = typeof body.password === 'string' ? body.password : '';
        const weak = validatePasswordStrength(password);
        if (weak) return res.status(400).json({ field: 'password', message: weak });
        const email = String(body.email || '').trim().toLowerCase();
        if (!EMAIL_PATTERN.test(email) || email.length > 254) return res.status(400).json({ field: 'email', message: 'Enter a valid email address.' });
        if (await Teacher.exists({ email: new RegExp(`^\\s*${escapeRegExp(email)}\\s*$`, 'i'), _id: { $ne: teacher._id } })) {
            return res.status(400).json({ field: 'email', code: 'EMAIL_TAKEN', message: 'Another teacher account already uses this email address.' });
        }
        if (!String(body.designation || '').trim()) return res.status(400).json({ field: 'designation', message: 'Enter your designation.' });
        if (!String(body.department || '').trim()) return res.status(400).json({ field: 'department', message: 'Choose or enter your department.' });
        teacher.password = password;
        teacher.passwordPending = false;
        teacher.email = email;
        for (const [key, max] of [['designation', 100], ['department', 200], ['researchArea', 300]]) {
            if (body[key] !== undefined) teacher[key] = String(body[key] || '').trim().slice(0, max);
        }
        try {
            await teacher.save();
        } catch (error) {
            if (error?.code === 11000 && error.keyPattern?.email) return res.status(400).json({ field: 'email', code: 'EMAIL_TAKEN', message: 'Another teacher account already uses this email address.' });
            throw error;
        }
        return welcome(res, teacher);
    } catch (error) {
        console.error('[teacher] account set-up failed:', error.message);
        res.status(500).json({ message: 'Could not set up your account just now. Please try again.' });
    }
};

module.exports = { protectTeacher, register, login, orgCheck, orgSetup, cardScan, forgotPassword, forgotPasswordPreview, resetPassword, me, updateMe, changePassword, uploadPicture, findTeacherByCard, view };
