/**
 * @author Preethesh Kulal
 * @description Mongoose schema for activation cards with QR code, CVV and status lifecycle
 */
const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
    CardNumber: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    CVV: {
        type: String,
        required: true
    },
    qrCodeNumber: {
        type: String,
        required: true
    },
    SerialNumber: {
        type: String
    },
    /**
     * 'unactivated' and 'activated' both mean free to sign up with: nothing
     * activates a card by hand (the old verify-card step flipped it on the
     * way through), and deleting a student puts their card back to
     * 'unactivated'. Registration accepts either and marks the card 'used';
     * 'inactive' is a card an administrator has withdrawn.
     */
    status: {
        type: String,
        enum: ['unactivated', 'activated', 'used', 'inactive'],
        default: 'unactivated'
    },
    /**
     * A super admin's say-so that the card may be registered (Admin → Verify
     * cards). A free card that is not verified cannot open an account, except
     * when a platform admin adds the student or teacher, which verifies it.
     * Every card not yet registered waits for this — including cards that
     * were in the system before verification began (the user's rule,
     * 2026-10-23). Registered ('used') cards are never touched.
     */
    verified: { type: Boolean, default: false },
    verifiedAt: { type: Date, default: null },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    // 'admin' (Verify cards, or added there), 'account' (verified by an admin
    // adding its holder), 'passport' (its AI Passport book was scanned with it).
    verifiedVia: { type: String, enum: ['admin', 'account', 'passport', null], default: null },
    // The AI Passport book linked to this card (models/Passport.js), once scanned.
    passportCode: { type: String, default: null, index: true },
    // An organization's card (Students → Scan cards): whoever registers with
    // it joins that organization at once (organizations/services/cardLink.js).
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null, index: true },
    organizationLinkedAt: { type: Date, default: null },
    // A presentation (demo) card an administrator scanned in (Admin → Demo cards): its scan opens
    // the student dashboard with no password, and it sees everything (services/fullAccess.js).
    demo: { type: Boolean, default: false, index: true },
    demoAddedAt: { type: Date, default: null },
    // A parent's account (2026-11-19, src/parent): kept on the parent's own card, not in a collection of its
    // own (the database is at its collection limit). The card is 'used', like a student's or a teacher's.
    // `children`: the students whose activity the parent sees, added by their card numbers.
    parent: {
        type: new mongoose.Schema({
            name: { type: String, trim: true },
            phone: { type: String, trim: true, default: '' },
            email: { type: String, trim: true, lowercase: true, default: '' },
            password: { type: String },
            passwordChangedAt: { type: Date, default: null },
            createdAt: { type: Date, default: Date.now },
            lastLoginAt: { type: Date, default: null },
            loginCount: { type: Number, default: 0 },
            active: { type: Boolean, default: true },
            children: [{ _id: false, userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, addedAt: { type: Date, default: Date.now } }]
        }, { _id: false }),
        default: undefined
    }
}, { timestamps: true });

cardSchema.index({ 'parent.children.userId': 1 }, { sparse: true });

module.exports = mongoose.model('Card', cardSchema);
