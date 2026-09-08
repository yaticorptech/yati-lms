/**
 * What a student completes before the job board opens — Aadhaar identity, a
 * LinkedIn profile, a resume, and a job profile (location, skills,
 * availability, job types) — kept as a state machine the server owns. Which
 * of the four an administrator requires lives in Setting.jobVerification.
 * Never stored: the Aadhaar number (only the card's last four digits and the
 * printed name, so the student can recognise it), the OTP (only the session
 * metadata), the full mobile (only masked).
 */
const mongoose = require('mongoose');
const STATES = ['NOT_STARTED', 'AADHAAR_SCAN_PENDING', 'AADHAAR_QR_VALIDATED', 'OTP_SENT', 'AADHAAR_VERIFIED', 'LINKEDIN_PENDING', 'LINKEDIN_ADDED', 'RESUME_PENDING', 'RESUME_ADDED', 'PROFILE_PENDING', 'JOB_ACCESS_GRANTED'];
const schema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    state: { type: String, enum: STATES, default: 'NOT_STARTED', index: true },
    identity: {
        status: { type: String, enum: ['NOT_STARTED', 'PENDING', 'VERIFIED', 'FAILED', 'EXPIRED'], default: 'NOT_STARTED' },
        provider: { type: String, default: '' },
        reference: { type: String, default: '' },          // encrypted provider reference
        maskedMobile: { type: String, default: '' },
        card: { name: { type: String, default: '' }, last4: { type: String, default: '' }, mobileLinked: { type: Boolean, default: true } },
        verifiedAt: { type: Date, default: null },
        otp: { transactionId: { type: String, default: '' }, sentAt: { type: Date, default: null }, expiresAt: { type: Date, default: null }, attempts: { type: Number, default: 0 }, resends: { type: Number, default: 0 }, simulated: { type: Boolean, default: false } }
    },
    linkedin: { status: { type: String, enum: ['NOT_STARTED', 'PENDING', 'ADDED', 'FAILED'], default: 'NOT_STARTED' }, profileUrl: { type: String, default: '' }, method: { type: String, default: '' }, addedAt: { type: Date, default: null } },
    // The resume is the LMS's one ResumeProfile per student (uploaded on the
    // profile page or here); only its id and the moment it was confirmed live here.
    resume: { status: { type: String, enum: ['NOT_STARTED', 'PENDING', 'ADDED', 'FAILED'], default: 'NOT_STARTED' }, resumeId: { type: mongoose.Schema.Types.ObjectId, default: null }, filename: { type: String, default: '' }, addedAt: { type: Date, default: null } },
    profile: {
        status: { type: String, enum: ['NOT_STARTED', 'PENDING', 'COMPLETED'], default: 'NOT_STARTED' },
        location: { label: { type: String, default: '' }, coords: { type: [Number], default: undefined } },   // [lon, lat], as the board uses
        skills: { type: [String], default: [] },
        availability: { type: [String], default: [] },
        jobTypes: { type: [String], default: [] },
        savedAt: { type: Date, default: null }
    },
    completedAt: { type: Date, default: null }
}, { timestamps: true });
module.exports = mongoose.model('JobVerification', schema, 'jobboard_job_verifications');
module.exports.STATES = STATES;
