/**
 * The one-time check a student completes before searching for jobs:
 * Aadhaar number, LinkedIn profile, a photo and date of birth.
 *
 * GET  /api/jobs/verification  — whether it is done, plus what the form can
 *                                prefill (the profile photo, if there is one).
 * POST /api/jobs/verification  — validate and record it. The photo is the
 *                                student's profile picture, uploaded through
 *                                the existing /user/profile/picture route, so
 *                                nothing here handles files.
 */
const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const JobVerification = require('../models/JobVerification');
const User = require('../../models/User');
const { normaliseAadhaar } = require('../utils/aadhaar');
const { sendSms, normaliseIndianMobile, maskMobile } = require('../../services/smsService');

const LINKEDIN = /^(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/in\/[A-Za-z0-9\-_%]{3,100}\/?$/i;
/** Whatever the student pasted — with or without https:// or www — as one canonical link. */
const normaliseLinkedin = (raw) => {
    const t = String(raw || '').trim();
    if (!LINKEDIN.test(t)) return null;
    const handle = t.replace(/^(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/in\//i, '').replace(/\/$/, '');
    return `https://www.linkedin.com/in/${handle}`;
};
const MIN_AGE = 14;
const MAX_AGE = 100;

const hashAadhaar = (digits) =>
    crypto.createHash('sha256').update(`${process.env.AADHAAR_SALT || process.env.JWT_SECRET || 'yati'}:${digits}`).digest('hex');

const ageAt = (dob, now = new Date()) => {
    let age = now.getFullYear() - dob.getFullYear();
    const m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
    return age;
};

const publicShape = (row) => ({
    aadhaarLast4: row.aadhaarLast4,
    linkedinUrl: row.linkedinUrl,
    mobile: maskMobile(row.mobile),
    photoUrl: row.photoUrl,
    dateOfBirth: row.dateOfBirth,
    verifiedAt: row.verifiedAt
});

router.get('/', async (req, res, next) => {
    try {
        const [row, user] = await Promise.all([
            JobVerification.findOne({ userId: req.user._id }).lean(),
            User.findById(req.user._id).select('profilePicture phone').lean()
        ]);
        res.json({
            complete: !!row,
            verification: row ? publicShape(row) : null,
            profilePhoto: user?.profilePicture || null,
            profilePhone: user?.phone || null
        });
    } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
    try {
        const { aadhaar, linkedinUrl, dateOfBirth, mobile } = req.body || {};
        const problems = {};

        const digits = normaliseAadhaar(aadhaar);
        if (!digits) problems.aadhaar = 'Enter a valid 12-digit Aadhaar number.';

        const linkedin = normaliseLinkedin(linkedinUrl);
        if (!linkedin) problems.linkedinUrl = 'Enter your LinkedIn profile link, like linkedin.com/in/your-name';

        const phone = normaliseIndianMobile(mobile);
        if (!phone) problems.mobile = 'Enter a 10-digit Indian mobile number.';

        const dob = new Date(dateOfBirth);
        if (!dateOfBirth || Number.isNaN(dob.getTime())) problems.dateOfBirth = 'Enter your date of birth.';
        else {
            const age = ageAt(dob);
            if (age < MIN_AGE) problems.dateOfBirth = `You need to be at least ${MIN_AGE} to use the job board.`;
            else if (age > MAX_AGE) problems.dateOfBirth = 'Check your date of birth.';
        }

        const user = await User.findById(req.user._id).select('profilePicture').lean();
        const photoUrl = user?.profilePicture || '';
        if (!photoUrl) problems.photo = 'Add a photo to continue.';

        if (Object.keys(problems).length) return res.status(400).json({ error: 'Check the highlighted fields.', problems });

        const aadhaarHash = hashAadhaar(digits);
        const taken = await JobVerification.findOne({ aadhaarHash, userId: { $ne: req.user._id } }).select('_id').lean();
        if (taken) return res.status(409).json({ error: 'This Aadhaar number is already linked to another account.', problems: { aadhaar: 'Already linked to another account.' } });

        const row = await JobVerification.findOneAndUpdate(
            { userId: req.user._id },
            { $set: { aadhaarLast4: digits.slice(-4), aadhaarHash, linkedinUrl: linkedin, mobile: phone, photoUrl, dateOfBirth: dob, verifiedAt: new Date() } },
            { upsert: true, returnDocument: 'after' }
        );
        // The confirmation the student asked for, to the number they gave. A
        // provider outage must not undo a verification that already saved.
        const sms = await sendSms(phone,
            `YATICORP LMS: your job board verification is complete. Aadhaar ending ${digits.slice(-4)} and your LinkedIn profile are linked. You can now search for jobs.`);
        res.json({ complete: true, verification: publicShape(row), sms: { sent: sms.sent, simulated: !!sms.simulated, to: maskMobile(phone) } });
    } catch (err) { next(err); }
});

module.exports = router;
