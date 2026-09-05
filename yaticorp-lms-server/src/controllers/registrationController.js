/**
 * @author Preethesh Kulal
 * @description Student registration flow: QR validation, card verification and account creation
 */
const User = require('../models/User');
const Card = require('../models/Card');
const Course = require('../models/Course');
const Bundle = require('../models/Bundle');
const Enrollment = require('../models/Enrollment');
const generateToken = require('../utils/generateToken');
const { validatePasswordStrength } = require('../middleware/validatePassword');

// @desc    Validate QR Code and return card details (read-only)
// @route   POST /api/auth/validate-qr
// @access  Public
const validateQR = async (req, res) => {
    try {
        const { qrCodeNumber } = req.body;

        if (!qrCodeNumber || !qrCodeNumber.trim()) {
            return res.status(400).json({ message: 'QR Code is required.' });
        }

        const card = await Card.findOne({ qrCodeNumber: qrCodeNumber.trim().toUpperCase() });

        if (!card) {
            return res.status(404).json({ message: 'Invalid QR Code. No card found.' });
        }
        if (card.status === 'used') {
            return res.status(400).json({ message: 'This QR Code has already been used to register an account.' });
        }
        if (card.status === 'inactive') {
            return res.status(400).json({ message: 'This QR Code is inactive and cannot be used.' });
        }

        res.json({
            valid: true,
            message: 'QR Code is valid.',
            cardNumber: card.CardNumber,
            cvv: card.CVV
        });

    } catch (error) {
        res.status(500).json({ message: 'Server error during QR validation', error: error.message });
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

        // A QR may carry the code alone, or a URL with it on the end. Take the
        // last path segment or query value, then keep only card characters.
        const tail = raw.split(/[?#/=]/).filter(Boolean).pop() || raw;
        const code = tail.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (!code) return res.status(400).json({ message: "That code isn't readable. Try scanning again." });

        // The QR normally holds the card's QR number; some cards encode the
        // card number itself, so both are accepted.
        const card = await Card.findOne({ $or: [{ qrCodeNumber: code }, { CardNumber: code }] }).lean();
        if (!card) return res.status(404).json({ message: 'That card was not recognised. Check the card, or type the number instead.' });
        if (card.status === 'inactive') return res.status(400).json({ message: 'This card is inactive. Contact your administrator.' });

        const User = require('../models/User');
        const user = await User.findOne({ cardNumber: card.CardNumber }).select('_id status').lean();
        if (!user) {
            return res.status(404).json({
                code: 'NOT_REGISTERED',
                message: 'This card has no account yet. Sign up first, then come back and scan to sign in.'
            });
        }
        if (user.status !== 'active') {
            return res.status(403).json({ message: 'This account is not active. Contact your administrator.' });
        }

        res.json({ cardNumber: card.CardNumber });
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
        const courses = await Course.find({ isPublished: true }).select('_id title thumbnail');
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
        const { name, email, phone, CardNumber, CVV, qrCodeNumber, password, courseId, contentType } = req.body;

        // courseId/contentType are optional: a student may register before any
        // content is published and enrol later from the dashboard.
        if (!name || !email || !phone || !CardNumber || !CVV || !qrCodeNumber || !password) {
            return res.status(400).json({ message: 'All required fields must be provided' });
        }

        if (courseId && contentType !== 'Course' && contentType !== 'Bundle') {
            return res.status(400).json({ message: 'Invalid content selection.' });
        }

        // Password strength validation
        const pwError = validatePasswordStrength(password);
        if (pwError) {
            return res.status(400).json({ message: pwError });
        }

        // Re-verify the card strictly
        const card = await Card.findOne({ CardNumber, CVV, qrCodeNumber, status: 'activated' });

        if (!card) {
            return res.status(400).json({ message: 'Invalid or already used Card Credentials' });
        }

        // Check if user already exists
        const userExists = await User.findOne({ $or: [{ email }, { cardNumber: CardNumber }] });
        if (userExists) {
            return res.status(400).json({ message: 'A user with this email or card number already exists' });
        }

        const user = await User.create({
            name,
            email,
            phone: phone || '',
            cardNumber: CardNumber,
            serialNumber: card.SerialNumber || '',
            qrNumber: card.qrCodeNumber || '',
            courseId: contentType === 'Course' ? courseId : undefined,
            bundleId: contentType === 'Bundle' ? courseId : undefined,
            password
        });

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

        card.status = 'used';
        await card.save();

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            cardNumber: user.cardNumber,
            token: generateToken(user._id)
        });

    } catch (error) {
        res.status(500).json({ message: 'Server error during registration', error: error.message });
    }
};

module.exports = {
    scanCard,
    validateQR,
    verifyCard,
    registerStudent,
    getPublishedContent
};
