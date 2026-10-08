/**
 * Applying for a part-time job, and the guardian permission a young student
 * needs first.
 *
 * Mounted behind the section's own sign-in, so every route here is the
 * student's own application. The guardian's half lives in guardianLink.js and
 * is reached without a login, because a parent does not have one.
 */
const express = require('express');
const router = express.Router();

const Application = require('../models/JobApplication');
const { chargeWallet } = require('../../rewards/services/walletRuleService');
const { xpOnSuccess } = require('../../rewards/services/xpHooks');
const Opportunity = require('../models/Opportunity');
const OpportunityProfile = require('../models/OpportunityProfile');
const User = require('../../models/User');
const { ageFrom } = require('../services/eligibilityRules');
const { studentView, GUARDIAN_AGE } = require('../services/applicationService');
const { normaliseIndianMobile } = require('../../services/smsService');
// Held as the module rather than destructured, so the mail this builds can be
// read back in a test without standing a mail server up.
const mailer = require('../../utils/emailService');
const { maskEmail } = require('../services/applicationService');
const { guardianMail } = require('../services/guardianMail');

const HOURS = { '1-2': '1–2 hrs/day', '2-4': '4 hrs/day', '4+': '4+ hrs/day' };

/**
 * Where the guardian's page lives, as an address they can tap in a message.
 *
 * The site the student is using right now, when it is one of ours: a student
 * on learn.yaticorp.com gets links to learn.yaticorp.com, and a developer on
 * localhost gets localhost. FRONTEND_URL alone was set to localhost on the
 * machine that sent real requests, and every button in those emails opened
 * nothing on the parent's phone.
 */
const ownSites = () => new Set([process.env.FRONTEND_URL, process.env.CLIENT_URL, process.env.PUBLIC_APP_URL,
    ...String(process.env.ALLOWED_ORIGINS || '').split(',')].map((s) => String(s || '').trim().replace(/\/$/, '')).filter(Boolean));
const siteUrl = (req) => {
    const origin = String(req?.get?.('origin') || '').replace(/\/$/, '');
    if (origin && (ownSites().has(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))) return origin;
    return String(process.env.FRONTEND_URL || process.env.CLIENT_URL || '').replace(/\/$/, '');
};

/**
 * Email the guardian their link.
 *
 * The two buttons carry the guardian's answer to the page rather than
 * recording it themselves. A link that decided on being fetched would be
 * pressed by every mail scanner and link preview between here and their
 * inbox — the parent's answer has to come from a tap they made.
 *
 * Never throws and never blocks the request: the record is already saved, and
 * the mail provider having a bad minute must not read as a failed application.
 * What comes back says whether it truly went, so the student's screen can tell
 * them the truth rather than claiming a message that was never accepted.
 */
const emailGuardian = async (application, req) => {
    const link = `${siteUrl(req)}/jobs/guardian/${application.linkToken}`;
    const { subject, htmlContent } = guardianMail(application, link);
    try {
        await mailer.sendEmail({ to: application.guardian.email, toName: application.guardian.name, subject, htmlContent });
        return { sent: true, to: maskEmail(application.guardian.email), link };
    } catch (err) {
        console.error('[applications] guardian email failed:', err.message);
        return { sent: false, to: maskEmail(application.guardian.email), link, reason: err.message };
    }
};

const day = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

/** The job as the guardian will read it, copied off the listing. */
const jobSnapshot = (opp) => ({
    title: opp.title || '',
    company: opp.organization?.name || '',
    hours: HOURS[opp.hoursPerSession] || opp.hoursPerSession || '',
    duration: opp.startsAt && opp.endsAt && new Date(opp.startsAt).toDateString() !== new Date(opp.endsAt).toDateString()
        ? `${day(opp.startsAt)} – ${day(opp.endsAt)}`
        : day(opp.startsAt),
    location: [opp.location?.area, opp.location?.city].filter(Boolean).join(', '),
    pay: opp.compensation?.label || '',
    safety: [
        opp.organization?.verified ? 'The organisation has been verified by the LMS.' : '',
        opp.safetyNotes || '',
        'The LMS passes on interest. The organisation never receives your contact details.',
        'Report anything that looks unsafe, asks for money, or asks to talk outside the LMS.'
    ].filter(Boolean)
});

/** The student's record, or null. */
const mine = (req, id) => Application.findOne({ _id: id, userId: req.user._id });

/**
 * An application that has not gone anywhere yet follows the profile.
 *
 * The age and the guardian's details are copied onto the application when it
 * is started, and a student who then corrects their date of birth found the
 * old age still on it — "You are 23" over a profile that said sixteen — with
 * the guardian step decided by the wrong number. Until a request has been
 * sent, nothing rests on the snapshot, so it is taken again from the profile
 * each time the application is opened. Once a parent has been asked, it is
 * left alone: their answer was to the application as it was sent.
 */
const refreshFromProfile = async (row, userId) => {
    // "Continued" without a request ever sent was a student going straight on
    // because the age at the time allowed it; if it no longer does, the parent
    // has to be asked after all.
    const untouched = row.status === 'ready' || row.status === 'needs-guardian' || (row.status === 'continued' && !row.requestedAt);
    if (!untouched) return row;
    const profile = await OpportunityProfile.findOne({ userId }).lean();
    if (!profile) return row;
    const age = ageFrom(profile.dateOfBirth);
    const guardian = {
        name: row.guardian?.name || profile.guardian?.guardianName || '',
        email: row.guardian?.email || profile.guardian?.email || '',
        phone: row.guardian?.phone || profile.guardian?.phone || ''
    };
    const status = age != null && age >= GUARDIAN_AGE ? (row.status === 'continued' ? 'continued' : 'ready') : 'needs-guardian';
    const changed = age !== row.student?.age || status !== row.status
        || ['name', 'email', 'phone'].some((k) => guardian[k] !== (row.guardian?.[k] || ''));
    if (!changed) return row;
    row.student = { ...(row.student || {}), age };
    row.status = status;
    row.guardian = guardian;
    await row.save();
    return row;
};

/* ── Start, or pick up where it was left ──────────────────────────────── */

/**
 * POST / { opportunityId } — the age check happens here, on the server. A
 * student of eighteen or over goes straight on; anyone younger lands on the
 * guardian step and cannot leave it until a guardian answers.
 */
// Wallet rules: applying is priced once per job; reopening the same application is not.
const newApplication = async (req) => {
    const id = String(req.body?.opportunityId || '').trim();
    return !!id && !(await Application.exists({ userId: req.user._id, opportunityId: id }));
};
router.post('/', chargeWallet('apply_part_time', { when: newApplication, ref: (req) => String(req.body.opportunityId).trim() }), xpOnSuccess('part_time_apply', (req) => `apply:${String(req.body?.opportunityId || '').trim()}`), async (req, res, next) => {
    try {
        const opportunityId = String(req.body?.opportunityId || '').trim();
        if (!opportunityId) return res.status(400).json({ error: 'Which job is this for?' });

        const existing = await Application.findOne({ userId: req.user._id, opportunityId });
        if (existing) return res.json({ application: studentView(await refreshFromProfile(existing, req.user._id)) });

        const opp = await Opportunity.findById(opportunityId).lean().catch(() => null);
        if (!opp) return res.status(404).json({ error: 'That job is no longer listed.' });

        const [profile, user] = await Promise.all([
            OpportunityProfile.findOne({ userId: req.user._id }).lean(),
            User.findById(req.user._id).select('name').lean()
        ]);
        if (!profile) return res.status(400).json({ error: 'Tell us your dates and date of birth first.' });

        const age = ageFrom(profile.dateOfBirth);
        let row;
        try {
            row = await Application.create({
                userId: req.user._id,
                opportunityId,
                student: { name: user?.name || 'Student', age },
                job: jobSnapshot(opp),
                guardian: {
                    name: profile.guardian?.guardianName || '',
                    email: profile.guardian?.email || '',
                    phone: profile.guardian?.phone || ''
                },
                status: age != null && age >= GUARDIAN_AGE ? 'ready' : 'needs-guardian'
            });
        } catch (err) {
            // One student, one application per job — a unique index says so.
            // The check above misses the case where a second press arrives
            // while the first is still inserting: both find nothing, both
            // insert, and the loser was handing the driver's own words to a
            // student. Pressing Apply twice means the same thing as pressing
            // it once, so answer with the application that won.
            if (err?.code !== 11000) throw err;
            const won = await Application.findOne({ userId: req.user._id, opportunityId });
            if (!won) throw err;
            return res.json({ application: studentView(won) });
        }
        res.status(201).json({ application: studentView(row) });
    } catch (err) { next(err); }
});

/** GET /:id — the application as it stands. */
router.get('/:id', async (req, res, next) => {
    try {
        const row = await mine(req, req.params.id);
        if (!row) return res.status(404).json({ error: 'Application not found.' });
        res.json({ application: studentView(await refreshFromProfile(row, req.user._id)) });
    } catch (err) { next(err); }
});

/* ── The guardian step ────────────────────────────────────────────────── */

/** PUT /:id/guardian { name, phone } — name a different guardian. */
router.put('/:id/guardian', async (req, res, next) => {
    try {
        const row = await mine(req, req.params.id);
        if (!row) return res.status(404).json({ error: 'Application not found.' });
        if (row.status === 'approved' || row.status === 'declined' || row.status === 'continued') {
            return res.status(409).json({ error: 'This request has already been answered.' });
        }
        const name = String(req.body?.name || '').trim().slice(0, 80);
        const email = String(req.body?.email || '').trim().toLowerCase().slice(0, 160);
        const phone = req.body?.phone ? normaliseIndianMobile(String(req.body.phone)) : (row.guardian?.phone || '');
        if (!name) return res.status(400).json({ error: "Enter your parent or guardian's name." });
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return res.status(400).json({ error: "Enter your parent or guardian's email address." });
        // Caught here rather than as a bounce nobody reads: see recipientProblem.
        const why = await mailer.recipientProblem(email, { own: req.user?.email });
        if (why) return res.status(400).json({ error: why });
        row.guardian = { name, email, phone };
        await row.save();
        res.json({ application: studentView(row) });
    } catch (err) { next(err); }
});

/**
 * POST /:id/request — send the permission request, once.
 *
 * The link the guardian follows is minted here; until this is called there is
 * nothing to follow. Calling it again does not mail again — a parent gets one
 * message about one job, not a copy every time a student presses a button.
 */
router.post('/:id/request', async (req, res, next) => {
    try {
        const row = await mine(req, req.params.id);
        if (!row) return res.status(404).json({ error: 'Application not found.' });
        if (row.status === 'ready') return res.status(400).json({ error: 'This application does not need guardian permission.' });
        if (row.status === 'approved' || row.status === 'declined') {
            return res.status(409).json({ error: 'This request has already been answered.' });
        }
        if (!row.guardian?.name || !row.guardian?.email) {
            return res.status(400).json({ error: "Add your parent or guardian's name and email address first." });
        }
        // One request, one message. A request already sitting in a parent's
        // inbox is not sent again: pressing the button twice used to mail them
        // twice, which is noise to the parent and tells the student nothing.
        if (row.status === 'awaiting-guardian' && row.mailSentAt) {
            return res.status(409).json({
                error: `The request was already sent to ${maskEmail(row.guardian.email)}. They still have it.`,
                application: studentView(row)
            });
        }

        // A send the provider refused left nothing in any inbox, so that one
        // may be tried again — the only case where this route mails twice.
        if (row.status !== 'awaiting-guardian') {
            row.issueLink();
            row.requestedAt = new Date();
            row.status = 'awaiting-guardian';
        }
        await row.save();

        const mail = await emailGuardian(row, req);
        // What happened is kept on the record — the time it went, or the
        // provider's reason it did not — so a failure can be looked into
        // later rather than only in a console that has since scrolled away.
        row.mailSentAt = mail.sent ? new Date() : null;
        row.mailError = mail.sent ? '' : String(mail.reason || 'unknown').slice(0, 300);
        await row.save();
        // Why it failed is for the server log and the record; a student can
        // do nothing with a provider's error string.
        res.json({ application: studentView(row), mail: { sent: mail.sent, to: mail.to, link: mail.link } });
    } catch (err) { next(err); }
});

/**
 * POST /:id/resend — send the same request again, while it waits on the parent.
 *
 * For a parent who has not answered (the account owner's instruction,
 * 2026-09-30). It goes to the guardian as they stand now, so after Change
 * guardian the new address gets it; the link inside is the same one, so an
 * older copy still works too. A minute must pass between sends, so a double
 * press does not mail a parent twice.
 */
const RESEND_GAP_MS = 60 * 1000;
router.post('/:id/resend', async (req, res, next) => {
    try {
        const row = await mine(req, req.params.id);
        if (!row) return res.status(404).json({ error: 'Application not found.' });
        if (row.status !== 'awaiting-guardian') {
            return res.status(409).json({ error: 'This request is not waiting for the parent any more.', application: studentView(row) });
        }
        if (!row.guardian?.email) return res.status(400).json({ error: "Add your parent or guardian's email address first." });
        const last = row.mailSentAt || row.requestedAt;
        if (last && Date.now() - new Date(last).getTime() < RESEND_GAP_MS) {
            return res.status(429).json({ error: 'It was sent just now. Wait a minute before sending it again.', application: studentView(row) });
        }
        const why = await mailer.recipientProblem(row.guardian.email, { own: req.user?.email });
        if (why) return res.status(400).json({ error: why, application: studentView(row) });

        const mail = await emailGuardian(row, req);
        if (mail.sent) {
            row.mailSentAt = new Date();
            // A fresh send: an earlier bounce says nothing about this one.
            row.mailBouncedAt = null; row.fallbackSentAt = null; row.mailError = '';
        } else {
            row.mailError = String(mail.reason || 'unknown').slice(0, 300);
        }
        await row.save();
        res.json({ application: studentView(row), mail: { sent: mail.sent, to: mail.to, link: mail.link, again: true } });
    } catch (err) { next(err); }
});

/* ── After the answer ─────────────────────────────────────────────────── */

/** POST /:id/continue — only once there is nothing left to wait for. */
router.post('/:id/continue', async (req, res, next) => {
    try {
        const row = await mine(req, req.params.id);
        if (!row) return res.status(404).json({ error: 'Application not found.' });
        if (row.status !== 'ready' && row.status !== 'approved') {
            return res.status(409).json({ error: 'This application cannot continue yet.' });
        }
        row.status = 'continued';
        row.continuedAt = new Date();
        await row.save();
        res.json({ application: studentView(row) });
    } catch (err) { next(err); }
});

module.exports = router;
