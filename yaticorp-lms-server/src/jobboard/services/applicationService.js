/**
 * What an application looks like to each of the three people who see it —
 * the student, the guardian and an operator — and the four steps they all
 * watch it move through.
 *
 * One shape, built once. The student's screen, the guardian's link and the
 * admin list are three views of the same record, and a step that reads
 * "waiting" on one of them must read "waiting" on the others.
 */
const Application = require('../models/JobApplication');

const { GUARDIAN_AGE } = Application;

/** The four steps, and where this application has got to. */
const STEPS = ['Request sent', 'Guardian review', 'Approval', 'Application continues'];

/**
 * Each step as done / active / waiting / blocked, so every screen draws the
 * same tracker without working the rules out again.
 */
const stepsFor = (status) => {
    const at = {
        'needs-guardian': [0, 0, 0, 0],
        'awaiting-guardian': [1, 2, 0, 0],
        approved: [1, 1, 1, 2],
        declined: [1, 1, 3, 3],
        ready: [1, 1, 1, 2],
        continued: [1, 1, 1, 1]
    }[status] || [0, 0, 0, 0];
    const NAME = { 0: 'waiting', 1: 'done', 2: 'active', 3: 'blocked' };
    return STEPS.map((label, i) => ({ label, state: NAME[at[i]] }));
};

/**
 * An address reduced to what is safe to show back: enough to recognise it,
 * not enough to read it off someone's screen. "de••••@gmail.com".
 */
const maskEmail = (email) => {
    const [name, domain] = String(email || '').split('@');
    if (!name || !domain) return '';
    return `${name.slice(0, 2)}${'•'.repeat(Math.max(2, Math.min(6, name.length - 2)))}@${domain}`;
};

/** A phone reduced to what is safe to show back: the last two digits. */
const maskPhone = (phone) => {
    const digits = String(phone || '').replace(/\D/g, '');
    return digits.length >= 4 ? `+91 XXXXX XXX${digits.slice(-2)}` : '';
};

/** The student's own view: everything except the guardian's full number. */
const studentView = (row) => ({
    id: String(row._id),
    opportunityId: row.opportunityId,
    status: row.status,
    student: { name: row.student?.name || '', age: row.student?.age ?? null },
    job: {
        title: row.job?.title || '', company: row.job?.company || '',
        hours: row.job?.hours || '', duration: row.job?.duration || '',
        location: row.job?.location || '', pay: row.job?.pay || '',
        safety: row.job?.safety || []
    },
    guardian: {
        name: row.guardian?.name || '',
        email: maskEmail(row.guardian?.email),
        phone: maskPhone(row.guardian?.phone)
    },
    steps: stepsFor(row.status),
    guardianAge: GUARDIAN_AGE,
    requestedAt: row.requestedAt, remindedAt: row.remindedAt, reminders: row.reminders || 0,
    decidedAt: row.decidedAt, declineReason: row.declineReason || '',
    canContinue: row.status === 'ready' || row.status === 'approved' || row.status === 'continued',
    // Only the student may open their guardian's copy, to check what was sent.
    guardianLink: row.linkToken ? `/jobs/guardian/${row.linkToken}` : ''
});

/**
 * The guardian's view, reached by a link rather than a login: the job, the
 * child's name, and nothing else about the account.
 */
const guardianView = (row) => ({
    id: String(row._id),
    status: row.status,
    student: { name: row.student?.name || '', age: row.student?.age ?? null },
    job: studentView(row).job,
    guardian: { name: row.guardian?.name || '' },
    steps: stepsFor(row.status),
    requestedAt: row.requestedAt,
    decidedAt: row.decidedAt,
    declineReason: row.declineReason || '',
    expired: !!(row.linkExpiresAt && row.linkExpiresAt.getTime() < Date.now())
});

/** The operator's view: who, which job, and where the permission has got to. */
const adminView = (row) => ({
    id: String(row._id),
    userId: String(row.userId),
    student: { name: row.student?.name || '', age: row.student?.age ?? null },
    underAge: (row.student?.age ?? 99) < GUARDIAN_AGE,
    job: { title: row.job?.title || '', company: row.job?.company || '' },
    guardian: {
        name: row.guardian?.name || '',
        email: maskEmail(row.guardian?.email),
        phone: maskPhone(row.guardian?.phone)
    },
    status: row.status,
    steps: stepsFor(row.status),
    requestedAt: row.requestedAt, decidedAt: row.decidedAt,
    declineReason: row.declineReason || '',
    updatedAt: row.updatedAt
});

module.exports = { STEPS, stepsFor, studentView, guardianView, adminView, maskPhone, maskEmail, GUARDIAN_AGE };
