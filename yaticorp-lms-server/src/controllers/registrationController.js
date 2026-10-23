/**
 * @author Preethesh Kulal
 * @description Student registration flow: QR validation, card verification, account
 *              creation and an optional organization join request
 */
const User = require('../models/User');
const Card = require('../models/Card');
const { NOT_VERIFIED, isVerified, fromPlatformAdmin } = require('../services/cardVerification');
const { normaliseCardNumber } = require('../utils/cardNumber');
const Course = require('../models/Course');
const Bundle = require('../models/Bundle');
const Enrollment = require('../models/Enrollment');
const generateToken = require('../utils/generateToken');
const { validatePasswordStrength } = require('../middleware/validatePassword');
const { findUserByCardNumber } = require('../utils/cardNumber');
const Organization = require('../organizations/models/Organization');
const OrgJoinRequest = require('../organizations/models/JoinRequest');
const { normalizeOrgCode, isValidOrgCodeFormat } = require('../organizations/services/orgCode');

/**
 * The optional Organization ID a student may type while signing up.
 *
 * Handled here rather than by the student calling the organization API, because
 * at this point there is no account and therefore no token. It is the only place
 * a join request is created without a signed-in student, and it still creates
 * nothing more than a request — the organization's own admin decides, exactly as
 * it does from the dashboard.
 *
 * Every failure is soft and reported rather than thrown. The field is optional,
 * so a mistyped or unrecognised code must never cost someone their account; they
 * are told what happened and can try again from My Profile → Personal
 * Information ("Organization/College"), where the join form now lives.
 */
// `reason` says which of these it was, for the dashboard's one-time banner:
// 'requested', 'invalid' (not shaped like an ID), 'not_found' (no active
// organization has it) or 'error' (ours). Only the middle two are about the
// ID the student typed, so only they should suggest trying another one.
const requestOrganizationAtSignup = async (userId, rawCode) => {
    const orgCode = normalizeOrgCode(rawCode);
    if (!orgCode) return null;

    if (!isValidOrgCodeFormat(orgCode)) {
        return { requested: false, reason: 'invalid', orgCode, message: `"${rawCode}" does not look like an Organization ID (like xxx_college). You can add yours later in My Profile → Personal Information, under "Organization/College".` };
    }

    try {
        const organization = await Organization.findOne({ orgCode, status: 'active' }).select('name orgCode').lean();
        if (!organization) {
            return { requested: false, reason: 'not_found', orgCode, message: `We could not find an active organization with the ID ${orgCode}. Your account is ready — you can add the right ID later in My Profile → Personal Information, under "Organization/College".` };
        }

        await OrgJoinRequest.create({ userId, organizationId: organization._id, status: 'pending' });
        return {
            requested: true,
            reason: 'requested',
            orgCode: organization.orgCode,
            name: organization.name,
            message: `Your request to join ${organization.name} has been sent. They will be asked to approve you.`
        };
    } catch (error) {
        console.error('[registration] could not record the organization request:', error.message);
        return { requested: false, reason: 'error', orgCode, message: 'Your account is ready, but we could not send your organization request. You can try again in My Profile → Personal Information, under "Organization/College".' };
    }
};

/**
 * What a scanned card might hold, for looking the card up.
 *
 * A QR may carry the code alone, or a URL with it on the end, and a code may
 * be stored with or without its punctuation. So: the text as scanned, the
 * same stripped to card characters (what the admin app does), and the last
 * path segment or query value, both ways — whichever layout the card uses
 * reads. Shared by signing in (scanCard) and signing up (validateQR); signing
 * up used to strip everything but letters and digits in the browser and match
 * the QR code only, so a card that worked at the sign-in camera failed here.
 */
const scanCandidates = (raw) => {
    const text = String(raw || '').trim();
    const clean = (s) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const tail = text.split(/[?#/=]/).filter(Boolean).pop() || text;
    return [...new Set([text, text.toUpperCase(), clean(text), tail, tail.toUpperCase(), clean(tail)].filter(Boolean))];
};

/** The card a scan names: by its QR code, or by the card number some cards encode. */
const findScannedCard = (candidates) =>
    Card.findOne({ $or: [{ qrCodeNumber: { $in: candidates } }, { CardNumber: { $in: candidates } }] });

/**
 * A card nobody has registered with. Nothing in the admin panel activates a
 * card by hand: cards are loaded as 'unactivated', the old verify-card step
 * flipped them to 'activated' on the way through, and deleting a student puts
 * theirs back to 'unactivated' for reuse. So both mean "free to sign up with";
 * only 'used' and 'inactive' close a card.
 */
const AVAILABLE_CARD = ['unactivated', 'activated'];

// @desc    Validate a card — by its QR code (scanned) or its card number
//          (typed) — and return the card's details (read-only)
// @route   POST /api/auth/validate-qr
// @access  Public
const validateQR = async (req, res) => {
    try {
        // The scanned text exactly as the camera read it (the app no longer
        // tidies it first), or a card number typed by hand.
        const scanned = typeof req.body?.qrCodeNumber === 'string' ? req.body.qrCodeNumber.trim() : '';
        const cardNumber = normaliseCardNumber(req.body?.cardNumber);
        const typed = !scanned;

        if (!scanned && !cardNumber) {
            return res.status(400).json({ message: 'Please enter your card number.' });
        }
        if (typed && cardNumber.length !== 12) {
            return res.status(400).json({ message: 'A card number has 12 digits.' });
        }

        // Card numbers are stored as digits; a few older ones carry spaces.
        const candidates = typed ? [] : scanCandidates(scanned);
        if (!typed && !candidates.length) return res.status(400).json({ message: "That code isn't readable. Try scanning again." });
        const card = typed
            ? await Card.findOne({ CardNumber: { $in: [cardNumber, cardNumber.replace(/(\d{4})(?=\d)/g, '$1 ')] } })
            : await findScannedCard(candidates);

        const what = typed ? 'card number' : 'QR Code';
        if (!card) {
            return res.status(404).json({ message: typed ? 'No card has that number. Check the number printed on your card.' : 'Invalid QR Code. No card found.' });
        }
        // Codes the app reads to say the right thing: a used card belongs to
        // an account already, so the student is pointed at signing in.
        if (card.status === 'used') {
            return res.status(400).json({ code: 'CARD_USED', message: `This ${what} has already been used to register an account.` });
        }
        if (card.status === 'inactive') {
            return res.status(400).json({ code: 'CARD_INACTIVE', message: `This ${what} is inactive and cannot be used.` });
        }
        // Not verified by a super admin yet: only a platform admin adding its
        // holder may go on (adding them verifies it). Everyone else is told.
        if (!isVerified(card) && !(await fromPlatformAdmin(req))) {
            return res.status(400).json(NOT_VERIFIED);
        }

        res.json({
            valid: true,
            verified: isVerified(card),
            message: 'Card is valid.',
            cardNumber: card.CardNumber,
            cvv: card.CVV,
            qrCodeNumber: card.qrCodeNumber
        });

    } catch (error) {
        res.status(500).json({ message: 'Server error during card validation', error: error.message });
    }
};

// @desc    Resolve a scanned card into the card number used to sign in
// @route   POST /api/auth/card-scan
// @access  Public
//
// Registration's validateQR refuses a card whose status is 'used', which is
// exactly the state every registered student's card is in — so signing in
// needs its own lookup. It answers with the card number and nothing else:
// never the CVV, and never anything about the account beyond whether one
// exists, because the reply is only as trustworthy as whoever is holding the
// card up to the camera. The number is printed on that same card, so this
// tells the scanner nothing it could not already read.
const scanCard = async (req, res) => {
    try {
        const raw = String(req.body?.code || '').trim();
        if (!raw) return res.status(400).json({ message: 'Nothing was scanned. Try again.' });

        // A QR may carry the code alone, or a URL with it on the end; see
        // scanCandidates. The QR normally holds the card's QR number; some
        // cards encode the card number itself, so both are accepted.
        const candidates = scanCandidates(raw);
        if (!candidates.length) return res.status(400).json({ message: "That code isn't readable. Try scanning again." });
        const card = await findScannedCard(candidates).lean();
        if (!card) return res.status(404).json({ message: 'That card was not recognised. Check the card, or type the number instead.' });
        if (card.status === 'inactive') return res.status(400).json({ message: 'This card is inactive. Contact your administrator.' });

        // Imported students hold the card number as a number and the QR code
        // on the record, so match on either — a text-only lookup missed them.
        const user = (await findUserByCardNumber(card.CardNumber))
            || (card.qrCodeNumber ? await User.findOne({ qrNumber: card.qrCodeNumber }).select('_id status cardNumber') : null);
        if (!user) {
            // A teacher's card, at the student sign-in: say where it belongs.
            if (await require('../teacher/auth').findTeacherByCard(card.CardNumber)) {
                return res.status(404).json({ code: 'TEACHER_CARD', message: 'This card is registered to a teacher account. Choose Teacher to sign in.' });
            }
            return res.status(404).json({
                code: 'NOT_REGISTERED',
                message: 'This card has no account yet. Sign up first, then come back and scan to sign in.'
            });
        }
        if (user.status !== 'active') {
            return res.status(403).json({ message: 'This account is not active. Contact your administrator.' });
        }

        // The number as the account knows it, as text, which is what login reads.
        res.json({ cardNumber: String(user.cardNumber || card.CardNumber) });
    } catch (error) {
        res.status(500).json({ message: 'Server error while reading that card', error: error.message });
    }
};

// @desc    Step 1: Verify Activation Card (legacy — kept for backward compat)
// @route   POST /api/auth/verify-card
// @access  Public
const verifyCard = async (req, res) => {
    try {
        const { CardNumber, CVV, qrCodeNumber } = req.body;

        if (!CardNumber || !CVV || !qrCodeNumber) {
            return res.status(400).json({ message: 'Card Number, CVV, and QR Code Number are required' });
        }

        const card = await Card.findOne({ CardNumber, CVV, qrCodeNumber });

        if (!card) {
            return res.status(404).json({ message: 'Invalid Card Credentials or Card does not exist' });
        }

        if (card.status === 'used') {
            return res.status(400).json({ message: 'This Card has already been used to register an account' });
        }

        if (card.status === 'inactive') {
            return res.status(400).json({ message: 'This Card is marked as inactive and restricted from use' });
        }
        if (!isVerified(card)) return res.status(400).json(NOT_VERIFIED);

        if (card.status === 'unactivated') {
            card.status = 'activated';
            await card.save();
        } else if (card.status !== 'activated') {
            return res.status(400).json({ message: 'This Card is not valid for use' });
        }

        res.json({ message: 'Card verified successfully', valid: true });

    } catch (error) {
        res.status(500).json({ message: 'Server error during card verification', error: error.message });
    }
};

// @desc    Get Published Content (Courses and Bundles)
// @route   GET /api/auth/published-content
// @access  Public
const getPublishedContent = async (req, res) => {
    try {
        // Public, so platform courses only — an organization's own are for its members.
        const courses = await Course.find({ isPublished: true, organizationId: null }).select('_id title thumbnail');
        const bundles = await Bundle.find({ isPublished: true }).select('_id title thumbnail');

        res.json({ courses, bundles });
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching published content', error: error.message });
    }
};

// @desc    Step 2: Complete Registration & Create User
// @route   POST /api/auth/register-student
// @access  Public
const registerStudent = async (req, res) => {
    try {
        const { name, email, phone, CardNumber, CVV, qrCodeNumber, password, courseId, contentType, orgCode } = req.body;

        // courseId/contentType are optional: a student may register before any
        // content is published and enrol later from the dashboard.
        // Every detail is required — blanks and whitespace alike. `field` names
        // the step of the form that owns the problem, so the app can go back to
        // that one instead of starting the student over.
        if (!String(name || '').trim()) return res.status(400).json({ field: 'name', message: 'Please enter your full name.' });
        if (!String(email || '').trim()) return res.status(400).json({ field: 'email', message: 'Please enter your email address.' });
        if (!String(phone || '').replace(/\D/g, '')) return res.status(400).json({ field: 'phone', message: 'Please enter your phone number.' });
        if (!CardNumber || !CVV || !qrCodeNumber) {
            return res.status(400).json({ field: 'card', message: 'Please verify your card again.' });
        }
        if (!password) return res.status(400).json({ field: 'password', message: 'Please choose a password.' });

        if (courseId && contentType !== 'Course' && contentType !== 'Bundle') {
            return res.status(400).json({ message: 'Invalid content selection.' });
        }

        // Password strength validation
        const pwError = validatePasswordStrength(password);
        if (pwError) {
            return res.status(400).json({ field: 'password', message: pwError });
        }

        // Re-verify the card strictly: the three values together, as text (an
        // object from the body must never reach the query).
        const cardKey = { CardNumber: String(CardNumber), CVV: String(CVV), qrCodeNumber: String(qrCodeNumber) };
        const card = await Card.findOne(cardKey);
        if (!card) {
            return res.status(400).json({ field: 'card', code: 'CARD_INVALID', message: 'Those card details did not match. Please verify your card again.' });
        }
        if (card.status === 'used') {
            return res.status(400).json({ field: 'card', code: 'CARD_USED', message: 'This card already has an account. Sign in instead.' });
        }
        if (!AVAILABLE_CARD.includes(card.status)) {
            return res.status(400).json({ field: 'card', code: 'CARD_INACTIVE', message: 'This card is inactive and cannot be used.' });
        }
        if (!isVerified(card)) return res.status(400).json({ field: 'card', ...NOT_VERIFIED });

        // Check if user already exists. The email is compared case-insensitively
        // (a few older accounts were stored with capitals) and stored trimmed and
        // lower-case, so "Asha@X.com" cannot register beside "asha@x.com".
        const cleanEmail = String(email).trim().toLowerCase();
        const escapedEmail = cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const emailPattern = new RegExp('^' + escapedEmail + '$', 'i');
        const userExists = await User.findOne({ $or: [{ email: emailPattern }, { cardNumber: cardKey.CardNumber }] }).select('cardNumber').lean();
        if (userExists) {
            return String(userExists.cardNumber) === cardKey.CardNumber
                ? res.status(400).json({ field: 'card', code: 'CARD_USED', message: 'This card already has an account. Sign in instead.' })
                : res.status(400).json({ field: 'email', code: 'EMAIL_TAKEN', message: 'An account already uses this email address. Use another one, or sign in.' });
        }

        // Claim the card before the account exists, in one step, so two sign-ups
        // with the same card at the same moment cannot both get through. If the
        // account then cannot be made, the card is put back as it was.
        const claimed = await Card.findOneAndUpdate(
            { _id: card._id, status: { $in: AVAILABLE_CARD } },
            { $set: { status: 'used' } }
        );
        if (!claimed) {
            return res.status(400).json({ field: 'card', code: 'CARD_USED', message: 'This card already has an account. Sign in instead.' });
        }

        let user;
        try {
            user = await User.create({
                name,
                email: cleanEmail,
                phone: phone || '',
                cardNumber: cardKey.CardNumber,
                serialNumber: card.SerialNumber || '',
                qrNumber: card.qrCodeNumber || '',
                courseId: contentType === 'Course' ? courseId : undefined,
                bundleId: contentType === 'Bundle' ? courseId : undefined,
                password
            });
        } catch (error) {
            await Card.updateOne({ _id: card._id, status: 'used' }, { $set: { status: claimed.status } }).catch(() => {});
            throw error;
        }

        // Only create an enrolment if the student actually picked content.
        if (courseId && contentType) {
            await Enrollment.create({
                userId: user._id,
                courseId: contentType === 'Course' ? courseId : undefined,
                bundleId: contentType === 'Bundle' ? courseId : undefined,
                type: contentType,
                assignedBy: 'system'
            });
        }

        // Optional, and last, so nothing about it can affect the account that has
        // just been created. `organization` is null when the field was left blank.
        const organization = await requestOrganizationAtSignup(user._id, orgCode);

        // The same shape as signing in, so the dashboard and My Profile have
        // the phone, picture, XP and level from the first screen — a new
        // account showed "Not added yet" for the phone it had just been given,
        // and Edit Profile could not save until the student signed in again.
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            cardNumber: user.cardNumber,
            profilePicture: user.profilePicture || '',
            credits: user.credits || 0,
            xp: user.xp || 0,
            level: user.level || 1,
            loginCount: user.loginCount || 0,
            role: 'student',
            organization,
            token: generateToken(user._id, 'student')
        });

    } catch (error) {
        res.status(500).json({ message: 'Server error during registration', error: error.message });
    }
};

module.exports = {
    // Shared with the teacher sign-in's card scan (src/teacher/auth.js).
    scanCandidates,
    findScannedCard,
    scanCard,
    validateQR,
    verifyCard,
    registerStudent,
    getPublishedContent
};
