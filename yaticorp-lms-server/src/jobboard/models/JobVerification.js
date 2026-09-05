/**
 * What a student confirmed before the job board opened to them: identity,
 * a professional profile, a photo and their date of birth.
 *
 * The Aadhaar number itself is never stored. Only its last four digits (for
 * the student to recognise their own entry) and a salted hash (so the same
 * number cannot be reused on a second account) are kept.
 */
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    aadhaarLast4: { type: String, required: true },
    aadhaarHash: { type: String, required: true, unique: true, index: true },
    linkedinUrl: { type: String, required: true },
    mobile: { type: String, required: true },
    photoUrl: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    verifiedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('JobVerification', schema, 'jobboard_verifications');
