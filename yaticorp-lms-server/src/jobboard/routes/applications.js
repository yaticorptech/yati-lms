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

const HOURS = { '1-2': '1–2 hrs/day', '2-4': '4 hrs/day', '4+': '4+ hrs/day' };

/** Where the guardian's page lives, as an address they can tap in a message. */
const siteUrl = () => String(process.env.FRONTEND_URL || process.env.CLIENT_URL || '').replace(/\/$/, '');

/** A plain, readable line for the email body. */
const field = (label, value) => (value
    ? `<tr><td style="padding:6px 0;color:#64748b;font-size:13px;width:110px">${label}</td><td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600">${value}</td></tr>`
    : '');

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
const emailGuardian = async (application) => {
    const link = `${siteUrl()}/jobs/guardian/${application.linkToken}`;
    const who = application.student?.name || 'A student';
    const job = application.job || {};
    const subject = `${who} needs your permission for a part-time job`;
    const htmlContent = `
<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">
  <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#4f46e5">Guardian permission</p>
  <h1 style="margin:0 0 12px;font-size:22px">Part-time job permission</h1>
  <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#475569">
    ${who} has asked to apply for a part-time job. Nothing is arranged until you answer.
  </p>
  <table style="width:100%;border-collapse:collapse;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:8px 16px">
    ${field('Job', job.title)}${field('Company', job.company)}${field('Hours', job.hours)}
    ${field('Dates', job.duration)}${field('Location', job.location)}${field('Pay', job.pay)}
  </table>
  <p style="margin:24px 0 10px;font-size:15px;font-weight:700">Do you give permission?</p>
  <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0 10px;width:100%">
    <tr><td>
      <a href="${link}?answer=approve" style="display:block;background:#059669;color:#fff;text-align:center;text-decoration:none;font-weight:700;font-size:16px;padding:16px 24px;border-radius:12px">
        &#10003;&nbsp; Yes, I approve
      </a>
    </td></tr>
    <tr><td>
      <a href="${link}?answer=decline" style="display:block;background:#fff;color:#be123c;border:2px solid #fecdd3;text-align:center;text-decoration:none;font-weight:700;font-size:16px;padding:14px 24px;border-radius:12px">
        &#10007;&nbsp; No, I do not approve
      </a>
    </td></tr>
  </table>
  <p style="margin:14px 0 8px;font-size:13px;line-height:1.6;color:#64748b">
    Either button opens the request, where you confirm your answer with one tap. Nothing is
    recorded until you confirm, so opening this email changes nothing.
  </p>
  <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#64748b">
    Only you can answer this. Nobody at the school or the LMS can approve it for you.
  </p>
  <p style="margin:0;font-size:12px;color:#94a3b8;word-break:break-all">If the buttons do not work, open: ${link}</p>
</div>`;

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

/* ── Start, or pick up where it was left ──────────────────────────────── */

/**
 * POST / { opportunityId } — the age check happens here, on the server. A
 * student of fifteen or over goes straight on; anyone younger lands on the
 * guardian step and cannot leave it until a guardian answers.
 */
router.post('/', async (req, res, next) => {
    try {
        const opportunityId = String(req.body?.opportunityId || '').trim();
        if (!opportunityId) return res.status(400).json({ error: 'Which job is this for?' });

        const existing = await Application.findOne({ userId: req.user._id, opportunityId });
        if (existing) return res.json({ application: studentView(existing) });

        const opp = await Opportunity.findById(opportunityId).lean().catch(() => null);
        if (!opp) return res.status(404).json({ error: 'That job is no longer listed.' });

        const [profile, user] = await Promise.all([
            OpportunityProfile.findOne({ userId: req.user._id }).lean(),
            User.findById(req.user._id).select('name').lean()
        ]);
        if (!profile) return res.status(400).json({ error: 'Tell us your dates and date of birth first.' });

        const age = ageFrom(profile.dateOfBirth);
        const row = await Application.create({
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
        res.status(201).json({ application: studentView(row) });
    } catch (err) { next(err); }
});

/** GET /:id — the application as it stands. */
router.get('/:id', async (req, res, next) => {
    try {
        const row = await mine(req, req.params.id);
        if (!row) return res.status(404).json({ error: 'Application not found.' });
        res.json({ application: studentView(row) });
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

        const mail = await emailGuardian(row);
        if (mail.sent) {
            row.mailSentAt = new Date();
            await row.save();
        }
        // Why it failed is for the server log; a student can do nothing with
        // a provider's error string.
        res.json({ application: studentView(row), mail: { sent: mail.sent, to: mail.to, link: mail.link } });
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
