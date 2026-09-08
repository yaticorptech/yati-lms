/**
 * Job Access Verification state machine:
 *   NOT_STARTED → AADHAAR_SCAN_PENDING → AADHAAR_QR_VALIDATED → OTP_SENT
 *     → AADHAAR_VERIFIED → LINKEDIN_PENDING → LINKEDIN_ADDED → RESUME_PENDING
 *     → RESUME_ADDED → PROFILE_PENDING → JOB_ACCESS_GRANTED
 * Every transition checks its evidence (the provider matched the OTP, the URL
 * validated, the resume record exists, the profile fields validated). Which
 * steps are required comes from Platform Settings (jobVerificationRequirements);
 * a step an admin switched off is simply skipped. userId always comes from
 * the token. No OTP or Aadhaar number is ever stored or logged.
 */
const JobVerification = require('../models/JobVerification');
const JobVerificationAudit = require('../models/JobVerificationAudit');
const ResumeProfile = require('../models/ResumeProfile');
const { getAadhaarProvider, ProviderError } = require('./aadhaar');
const { validateProfile } = require('./linkedinProfileService');
const { getRequirements } = require('./jobVerificationRequirements');
const { seal, open } = require('../utils/secretBox');

// The job-profile vocabulary the Profile step offers. Ids are stored; labels are the UI's.
const AVAILABILITY = Object.freeze([{ id: 'part-time', label: 'Part Time' }, { id: 'full-time', label: 'Full Time' }, { id: 'weekends', label: 'Weekends' }]);
const JOB_TYPES = Object.freeze([{ id: 'it', label: 'IT Jobs' }, { id: 'non-it', label: 'Non-IT Jobs' }, { id: 'local', label: 'Local Jobs' }, { id: 'part-time', label: 'Part-Time Jobs' }, { id: 'internship', label: 'Internships' }, { id: 'remote', label: 'Remote Jobs' }]);
const STEP_ORDER = ['identity', 'linkedin', 'resume', 'profile'];

const MAX_OTP_ATTEMPTS = 5, MAX_OTP_RESENDS = 5, RESEND_COOLDOWN_MS = 30_000, QR_SESSION_TTL_MS = 30 * 60_000;
class FlowError extends Error { constructor(code, message, status = 400, extra = {}) { super(message); this.code = code; this.status = status; Object.assign(this, extra); } }

/**
 * Rows written by the first cut of this model kept profile.location as a
 * string and used other names for two dates. Mongoose cannot set
 * profile.location.label on a string, so the row is reshaped in place (raw
 * collection, one indexed update) before it is loaded through the schema.
 */
const LEGACY = { 'profile.location': { $type: 'string' } };
const reshapeLegacy = (userId) => JobVerification.collection.updateOne({ userId, ...LEGACY }, [
    { $set: { 'profile.location': { label: '$profile.location' }, 'profile.savedAt': { $ifNull: ['$profile.savedAt', '$profile.completedAt'] }, 'resume.addedAt': { $ifNull: ['$resume.addedAt', '$resume.uploadedAt'] } } },
    { $unset: ['profile.completedAt', 'resume.uploadedAt'] }
]).catch((e) => console.warn('[jobs:verification] legacy reshape failed:', e.message));
const getOrCreate = async (userId) => { await reshapeLegacy(userId); return (await JobVerification.findOne({ userId })) || JobVerification.create({ userId }); };
const audit = (userId, event, { from = '', to = '', ok = true, detail = '', provider = '', req } = {}) =>
    JobVerificationAudit.create({ userId, event, fromState: from, toState: to, ok, detail, provider, ip: req?.ip || '', userAgent: String(req?.headers?.['user-agent'] || '').slice(0, 200) }).catch((e) => console.warn('[jobs:verification] audit failed:', e.message));

/** The steps this student still owes, in order, under the current requirements. */
const pending = (doc, reqs) => {
    const out = [];
    if (reqs.requireAadhaar && doc.identity.status !== 'VERIFIED') out.push('identity');
    if (reqs.requireLinkedin && doc.linkedin?.status !== 'ADDED') out.push('linkedin');
    if (reqs.requireResume && doc.resume?.status !== 'ADDED') out.push('resume');
    if ((reqs.requireLocation || reqs.requireSkills) && doc.profile?.status !== 'COMPLETED') out.push('profile');
    return out;
};
const nextStep = (doc, reqs) => pending(doc, reqs)[0] || null;
/** Move the coarse state to match the next owed step (never backwards inside the Aadhaar sub-flow). */
const settle = (doc, reqs) => {
    const n = nextStep(doc, reqs);
    if (!n) { if (doc.state !== 'JOB_ACCESS_GRANTED') { doc.state = 'JOB_ACCESS_GRANTED'; doc.completedAt = doc.completedAt || new Date(); } return doc; }
    if (n === 'identity') return doc;
    if (n === 'linkedin' && !['LINKEDIN_PENDING', 'LINKEDIN_ADDED'].includes(doc.state)) doc.state = 'LINKEDIN_PENDING';
    if (n === 'resume' && !['RESUME_PENDING', 'RESUME_ADDED'].includes(doc.state)) doc.state = 'RESUME_PENDING';
    if (n === 'profile' && doc.state !== 'PROFILE_PENDING') doc.state = 'PROFILE_PENDING';
    return doc;
};
/** Wrong-order guard: a step may only be taken once every required step before it is done. */
const requireReached = (doc, reqs, step) => {
    const owed = pending(doc, reqs).filter((s) => STEP_ORDER.indexOf(s) < STEP_ORDER.indexOf(step));
    if (owed.length) throw new FlowError('WRONG_STEP', owed[0] === 'identity' ? 'Verify your identity first.' : owed[0] === 'linkedin' ? 'Add your LinkedIn profile first.' : 'Add your resume first.', 409, { state: doc.state, nextStep: owed[0] });
};
/**
 * The resume is the LMS's one ResumeProfile per student. A student who
 * uploaded it on the profile page has done this step already; one who
 * deleted it since owes it again. Answers whether the doc changed.
 */
const syncResume = async (doc) => {
    const row = await ResumeProfile.findOne({ userId: doc.userId }).select('_id filename').lean().catch(() => null);
    if (row && (doc.resume.status !== 'ADDED' || String(doc.resume.resumeId) !== String(row._id))) { doc.resume = { status: 'ADDED', resumeId: row._id, filename: row.filename || '', addedAt: doc.resume.addedAt || new Date() }; return true; }
    if (!row && doc.resume.status === 'ADDED') { doc.resume = { status: 'NOT_STARTED', resumeId: null, filename: '', addedAt: null }; return true; }
    return false;
};

const view = (doc, provider, reqs) => {
    const otpActive = doc.state === 'OTP_SENT' && doc.identity.otp?.expiresAt && doc.identity.otp.expiresAt > new Date();
    const n = nextStep(doc, reqs);
    return {
        state: doc.state, canAccessJobs: !n, nextStep: n, completedAt: doc.completedAt,
        requirements: { ...reqs, requireProfile: !!(reqs.requireLocation || reqs.requireSkills) },
        options: { availability: AVAILABILITY, jobTypes: JOB_TYPES },
        steps: {
            identity: {
                status: doc.identity.status, provider: doc.identity.provider || provider.name, providerIsMock: provider.isMock,
                requiresMobile: !!provider.requiresMobile && doc.identity.status !== 'VERIFIED', maskedMobile: doc.identity.maskedMobile || '',
                card: doc.identity.card?.last4 ? { name: doc.identity.card.name, last4: doc.identity.card.last4, mobileLinked: doc.identity.card.mobileLinked !== false } : null,
                verifiedAt: doc.identity.verifiedAt,
                otp: otpActive ? { expiresAt: doc.identity.otp.expiresAt, attemptsLeft: Math.max(0, MAX_OTP_ATTEMPTS - (doc.identity.otp.attempts || 0)), resendsLeft: Math.max(0, MAX_OTP_RESENDS - (doc.identity.otp.resends || 0)), resendAvailableAt: new Date((doc.identity.otp.sentAt?.getTime() || 0) + RESEND_COOLDOWN_MS), simulated: !!doc.identity.otp.simulated } : null
            },
            linkedin: { status: doc.linkedin.status, profileUrl: doc.linkedin.profileUrl, method: doc.linkedin.method, addedAt: doc.linkedin.addedAt },
            resume: { status: doc.resume?.status || 'NOT_STARTED', filename: doc.resume?.filename || '', addedAt: doc.resume?.addedAt || null },
            profile: {
                status: doc.profile?.status || 'NOT_STARTED', savedAt: doc.profile?.savedAt || null,
                location: { label: doc.profile?.location?.label || '', coords: Array.isArray(doc.profile?.location?.coords) && doc.profile.location.coords.length === 2 ? doc.profile.location.coords : null },
                skills: doc.profile?.skills || [], availability: doc.profile?.availability || [], jobTypes: doc.profile?.jobTypes || []
            }
        }
    };
};

/** The Aadhaar sub-flow owns its own states; settle only touches the rest. */
const IN_AADHAAR = ['NOT_STARTED', 'AADHAAR_SCAN_PENDING', 'AADHAAR_QR_VALIDATED', 'OTP_SENT'];
const status = async (userId) => {
    const doc = await getOrCreate(userId); const reqs = await getRequirements(); const before = doc.state;
    let changed = reqs.requireResume ? await syncResume(doc) : false;
    // Identity not required (admin switched it off) or already done: the coarse state follows the next owed step.
    if (!IN_AADHAAR.includes(doc.state) || !reqs.requireAadhaar || doc.identity.status === 'VERIFIED') settle(doc, reqs);
    if (doc.state !== before) changed = true;
    if (changed) await doc.save();
    return view(doc, getAadhaarProvider(), reqs);
};
const canAccessJobs = async (userId) => {
    const reqs = await getRequirements();
    const doc = await JobVerification.findOne({ userId }).lean();
    if (!doc) return pending({ identity: {}, linkedin: {}, resume: {}, profile: {} }, reqs).length === 0;
    if (reqs.requireResume && doc.resume?.status !== 'ADDED') { const row = await ResumeProfile.exists({ userId }).catch(() => null); if (row) doc.resume = { status: 'ADDED' }; }
    return pending(doc, reqs).length === 0;
};
const requireState = (doc, allowed, message) => { if (!allowed.includes(doc.state)) throw new FlowError('WRONG_STEP', message, 409, { state: doc.state }); };

const startIdentity = async (userId, req) => {
    const doc = await getOrCreate(userId);
    if (doc.identity.status === 'VERIFIED') throw new FlowError('ALREADY_VERIFIED', 'Your identity is already verified.', 409);
    const provider = getAadhaarProvider(); await provider.startVerification({ userId: String(userId) });
    const from = doc.state; doc.state = 'AADHAAR_SCAN_PENDING'; doc.identity.status = 'PENDING'; doc.identity.provider = provider.name; await doc.save();
    await audit(userId, 'identity.start', { from, to: doc.state, provider: provider.name, req });
    return view(doc, provider, await getRequirements());
};

const validateQr = async (userId, qrPayload, req) => {
    const doc = await getOrCreate(userId);
    if (doc.identity.status === 'VERIFIED') throw new FlowError('ALREADY_VERIFIED', 'Your identity is already verified.', 409);
    requireState(doc, ['NOT_STARTED', 'AADHAAR_SCAN_PENDING', 'AADHAAR_QR_VALIDATED', 'OTP_SENT'], 'Start identity verification first.');
    const provider = getAadhaarProvider(); const from = doc.state;
    try {
        const r = await provider.validateQRCode({ qrPayload });
        doc.state = 'AADHAAR_QR_VALIDATED'; doc.identity.status = 'PENDING'; doc.identity.provider = provider.name; doc.identity.reference = seal(r.reference);
        doc.identity.maskedMobile = r.maskedMobile || ''; doc.identity.card = r.card ? { name: r.card.name || '', last4: r.card.last4 || '', mobileLinked: r.card.mobileLinked !== false } : undefined;
        doc.identity.otp = { transactionId: '', sentAt: null, expiresAt: null, attempts: 0, resends: 0, simulated: false };
        await doc.save(); await audit(userId, 'identity.qr_validated', { from, to: doc.state, provider: provider.name, detail: r.card?.format || '', req });
        return view(doc, provider, await getRequirements());
    } catch (err) { await audit(userId, 'identity.qr_rejected', { from, to: from, ok: false, detail: err.code || 'ERROR', provider: provider.name, req }); throw err; }
};

const sendOtp = async (userId, req, mobile) => {
    const doc = await getOrCreate(userId);
    if (doc.identity.status === 'VERIFIED') throw new FlowError('ALREADY_VERIFIED', 'Your identity is already verified.', 409);
    requireState(doc, ['AADHAAR_QR_VALIDATED', 'OTP_SENT'], 'Scan your Aadhaar QR first.');
    const provider = getAadhaarProvider(); const reference = open(doc.identity.reference);
    if (!reference) throw new FlowError('QR_EXPIRED', 'Scan your Aadhaar QR again.', 409);
    if (doc.state === 'AADHAAR_QR_VALIDATED' && doc.updatedAt && Date.now() - doc.updatedAt.getTime() > QR_SESSION_TTL_MS) { doc.state = 'AADHAAR_SCAN_PENDING'; doc.identity.reference = ''; await doc.save(); throw new FlowError('QR_EXPIRED', 'That scan has lapsed. Scan your Aadhaar QR again.', 409); }
    const otp = doc.identity.otp || {};
    if (otp.sentAt && Date.now() - otp.sentAt.getTime() < RESEND_COOLDOWN_MS) { const wait = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - otp.sentAt.getTime())) / 1000); throw new FlowError('RESEND_COOLDOWN', `Wait ${wait}s before requesting another code.`, 429, { retryAfter: wait }); }
    if ((otp.resends || 0) >= MAX_OTP_RESENDS) throw new FlowError('TOO_MANY_RESENDS', 'Too many codes requested. Scan your Aadhaar QR again to start over.', 429);
    const from = doc.state;
    try {
        const r = await provider.sendOTP({ reference, mobile }); const now = new Date();
        doc.state = 'OTP_SENT'; doc.identity.otp = { transactionId: seal(r.transactionId), sentAt: now, expiresAt: new Date(now.getTime() + (r.expiresInSeconds || 120) * 1000), attempts: 0, resends: (otp.resends || 0) + 1, simulated: !!r.delivery?.simulated };
        if (r.maskedMobile) doc.identity.maskedMobile = r.maskedMobile;
        await doc.save(); await audit(userId, 'identity.otp_sent', { from, to: doc.state, detail: `send ${doc.identity.otp.resends}${r.delivery?.simulated ? ' (simulated sms)' : ''}`, provider: provider.name, req });
        return view(doc, provider, await getRequirements());
    } catch (err) { await audit(userId, 'identity.otp_send_failed', { from, to: from, ok: false, detail: err.code || 'ERROR', provider: provider.name, req }); throw err; }
};

const verifyOtp = async (userId, code, req) => {
    const doc = await getOrCreate(userId);
    if (doc.identity.status === 'VERIFIED') throw new FlowError('ALREADY_VERIFIED', 'Your identity is already verified.', 409);
    requireState(doc, ['OTP_SENT'], 'Request a verification code first.');
    const provider = getAadhaarProvider(); const otpText = String(code || '').replace(/\D/g, '');
    if (otpText.length !== 6) throw new FlowError('INVALID_OTP', 'Enter the 6-digit code.');
    const session = doc.identity.otp || {};
    if (!session.expiresAt || session.expiresAt < new Date()) { await audit(userId, 'identity.otp_rejected', { from: doc.state, to: doc.state, ok: false, detail: 'OTP_EXPIRED', provider: provider.name, req }); throw new FlowError('OTP_EXPIRED', 'This code has expired. Request a new one.'); }
    if ((session.attempts || 0) >= MAX_OTP_ATTEMPTS) throw new FlowError('TOO_MANY_ATTEMPTS', 'Too many wrong codes. Request a new one.', 429, { attemptsLeft: 0 });
    const reference = open(doc.identity.reference), transactionId = open(session.transactionId);
    if (!reference || !transactionId) throw new FlowError('OTP_EXPIRED', 'Request a new code.');
    const from = doc.state;
    try {
        const r = await provider.verifyOTP({ reference, transactionId, otp: otpText, attempts: session.attempts || 0 });
        doc.identity.status = 'VERIFIED'; doc.identity.verifiedAt = r.verifiedAt || new Date(); if (r.mobileLinked === false && doc.identity.card) doc.identity.card.mobileLinked = false;
        doc.identity.otp = { transactionId: '', sentAt: null, expiresAt: null, attempts: 0, resends: 0, simulated: false }; doc.state = 'AADHAAR_VERIFIED';
        await doc.save(); await audit(userId, 'identity.verified', { from, to: doc.state, provider: provider.name, req });
        return view(doc, provider, await getRequirements());
    } catch (err) {
        doc.identity.otp.attempts = (session.attempts || 0) + 1; const attemptsLeft = Math.max(0, MAX_OTP_ATTEMPTS - doc.identity.otp.attempts);
        if (err.code === 'OTP_EXPIRED' || err.code === 'TOO_MANY_ATTEMPTS') doc.identity.otp.expiresAt = new Date(0);
        await doc.save(); await audit(userId, 'identity.otp_rejected', { from, to: doc.state, ok: false, detail: `${err.code || 'ERROR'}, attempt ${doc.identity.otp.attempts} of ${MAX_OTP_ATTEMPTS}`, provider: provider.name, req });
        if (err instanceof ProviderError && err.code === 'INVALID_OTP') { if (!attemptsLeft) throw new FlowError('TOO_MANY_ATTEMPTS', 'Too many wrong codes. Request a new one.', 429, { attemptsLeft: 0 }); throw new FlowError('INVALID_OTP', err.message, 400, { attemptsLeft }); }
        throw err;
    }
};

const advance = async (userId, req) => {
    const doc = await getOrCreate(userId); const reqs = await getRequirements(); const from = doc.state;
    if (!IN_AADHAAR.includes(doc.state) || !reqs.requireAadhaar || doc.identity.status === 'VERIFIED') { if (reqs.requireResume) await syncResume(doc); settle(doc, reqs); if (doc.state !== from) { await doc.save(); await audit(userId, 'flow.advance', { from, to: doc.state, req }); } }
    return view(doc, getAadhaarProvider(), reqs);
};

const addLinkedin = async (userId, url, req) => {
    const doc = await getOrCreate(userId); const reqs = await getRequirements();
    requireReached(doc, reqs, 'linkedin');
    const r = await validateProfile(url); const from = doc.state;
    if (!r.ok) { if (doc.linkedin.status !== 'ADDED') doc.linkedin.status = 'FAILED'; await doc.save(); await audit(userId, 'linkedin.rejected', { from, to: doc.state, ok: false, detail: r.code, req }); throw new FlowError(r.code, r.message, 400, { problems: { linkedinUrl: r.message } }); }
    doc.linkedin = { status: 'ADDED', profileUrl: r.profileUrl, method: r.method, addedAt: new Date() }; doc.state = 'LINKEDIN_ADDED';
    await doc.save(); await audit(userId, 'linkedin.added', { from, to: doc.state, detail: r.method, req });
    return view(doc, getAadhaarProvider(), reqs);
};

/**
 * Step 3. The file itself went through the LMS's resume endpoint
 * (POST /api/user/resume — PDF, DOC, DOCX or an image, 5 MB, stored on Bunny,
 * never public). This only confirms the record exists and ticks the step.
 */
const confirmResume = async (userId, req) => {
    const doc = await getOrCreate(userId); const reqs = await getRequirements();
    requireReached(doc, reqs, 'resume');
    const from = doc.state; await syncResume(doc);
    if (doc.resume.status !== 'ADDED') { doc.resume.status = 'PENDING'; doc.state = 'RESUME_PENDING'; await doc.save(); await audit(userId, 'resume.missing', { from, to: doc.state, ok: false, req }); throw new FlowError('RESUME_MISSING', 'Upload your resume first.', 409, { state: doc.state }); }
    doc.state = 'RESUME_ADDED'; await doc.save(); await audit(userId, 'resume.added', { from, to: doc.state, detail: doc.resume.filename ? 'file' : 'record', req });
    return view(doc, getAadhaarProvider(), reqs);
};

const cleanList = (v, max, len) => (Array.isArray(v) ? v : []).map((x) => String(x || '').trim()).filter(Boolean).filter((x, i, a) => a.findIndex((y) => y.toLowerCase() === x.toLowerCase()) === i).slice(0, max).map((x) => x.slice(0, len));
/** Step 4. Location, skills, availability and preferred job types; the first two are required only when the admin says so. */
const saveProfile = async (userId, body, req) => {
    const doc = await getOrCreate(userId); const reqs = await getRequirements();
    requireReached(doc, reqs, 'profile');
    const b = body && typeof body === 'object' ? body : {}; const problems = {};
    const label = String(b.location?.label ?? b.location ?? '').trim().slice(0, 120);
    let coords = null;
    if (Array.isArray(b.coords) && b.coords.length === 2 && b.coords.every((n) => Number.isFinite(Number(n)))) { const [lon, lat] = b.coords.map(Number); if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) coords = [lon, lat]; }
    const skills = cleanList(b.skills, 30, 40), availability = cleanList(b.availability, 3, 20).filter((a) => AVAILABILITY.some((o) => o.id === a)), jobTypes = cleanList(b.jobTypes, 6, 20).filter((t) => JOB_TYPES.some((o) => o.id === t));
    if (reqs.requireLocation && label.length < 2) problems.location = 'Enter the city or area where you want to work.';
    if (reqs.requireSkills && !skills.length) problems.skills = 'Add at least one skill.';
    if (Object.keys(problems).length) { await audit(userId, 'profile.rejected', { from: doc.state, to: doc.state, ok: false, detail: Object.keys(problems).join(','), req }); throw new FlowError('INVALID_PROFILE', Object.values(problems)[0], 400, { problems }); }
    const from = doc.state;
    doc.profile = { status: 'COMPLETED', location: { label, coords: coords || undefined }, skills, availability, jobTypes, savedAt: new Date() };
    settle(doc, reqs); await doc.save();
    await audit(userId, 'profile.saved', { from, to: doc.state, detail: `${skills.length} skills, ${label ? 'location' : 'no location'}`, req });
    return view(doc, getAadhaarProvider(), reqs);
};

module.exports = { FlowError, AVAILABILITY, JOB_TYPES, status, canAccessJobs, startIdentity, validateQr, sendOtp, verifyOtp, advance, addLinkedin, confirmResume, saveProfile };
