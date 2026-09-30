/**
 * Bounces: what the mail provider says after "sent".
 *
 * A message to an address that does not exist is accepted by the sending
 * server and fails later, as a "Delivery Status Notification" back to the
 * LMS's own mailbox — where nobody was looking, while the student's screen
 * said "Email sent". This reads that mailbox over IMAP every minute for
 * notices from the mail daemon, takes the failed address from the
 * X-Failed-Recipients header Gmail puts on them, and for any guardian request
 * still waiting on that address:
 *
 *   - records the bounce on the application, so the student is told the
 *     address could not be found and may correct it and send again;
 *   - sends the same request to the sending mailbox itself (or
 *     GUARDIAN_FALLBACK_EMAIL), where the bounce notice already is, so the
 *     request is in front of someone who can reach the parent another way.
 *
 * Settings: IMAP_HOST (default imap.gmail.com), IMAP_PORT (993), the same
 * SMTP_USER / SMTP_PASS as sending, BOUNCE_CHECK_MINUTES (1),
 * BOUNCE_WATCH=off to disable. Nothing runs without SMTP credentials.
 */
const mailer = require('./emailService');

const FAILED = /^x-failed-recipients:\s*(.+)$/im;

/** The addresses a bounce notice names, from its headers. */
const failedRecipients = (headers) => {
    const text = Buffer.isBuffer(headers) ? headers.toString() : String(headers || '');
    const m = text.match(FAILED);
    if (!m) return [];
    return m[1].split(/[,\s]+/).map((a) => a.trim().toLowerCase()).filter((a) => a.includes('@'));
};

/**
 * A request to `address` was reported undeliverable: mark every application
 * still waiting on it, and send the request on to the school instead.
 * Returns how many applications were affected.
 */
const handleBounce = async (address, { now = new Date(), bouncedAt = now } = {}) => {
    const Application = require('../jobboard/models/JobApplication');
    const { guardianMail, defaultSiteUrl, fallbackAddress } = require('../jobboard/services/guardianMail');
    // Only a request sent before the bounce came back: a notice about an
    // earlier send must not mark a fresh one (Send again) as undelivered.
    const rows = await Application.find({ 'guardian.email': address, status: 'awaiting-guardian', mailSentAt: { $ne: null, $lte: new Date(new Date(bouncedAt).getTime() + 60 * 1000) }, mailBouncedAt: null });
    for (const row of rows) {
        row.mailBouncedAt = now;
        row.mailError = `The parent's address ${address} could not be found: the email bounced.`;
        // The message never reached anyone, so it may be sent again once the
        // address is corrected; the "already sent" guard keys on mailSentAt.
        row.mailSentAt = null;
        const to = fallbackAddress();
        if (to && to.toLowerCase() !== address) {
            const link = `${defaultSiteUrl()}/jobs/guardian/${row.linkToken}`;
            const note = `Address not found: this request was addressed to ${row.guardian?.name || 'the parent'} at ${address}, and that address does not exist. ` +
                'It has come here instead. Pressing Approve or Decline records the parent\'s answer and opens the application in the admin panel for the final decision.';
            const { subject, htmlContent } = guardianMail(row, link, { note });
            try {
                await mailer.sendEmail({ to, subject: `Address not found — ${subject}`, htmlContent });
                row.fallbackSentAt = now;
            } catch (err) {
                console.error('[bounces] fallback send failed:', err.message);
            }
        }
        await row.save();
    }
    if (rows.length) console.log(`[bounces] ${address}: ${rows.length} request(s) marked undeliverable`);
    return rows.length;
};

const configured = () => !!(process.env.SMTP_USER && process.env.SMTP_PASS) && String(process.env.BOUNCE_WATCH || '').toLowerCase() !== 'off';

/**
 * One pass over the mailbox for bounce notices from the last two days.
 *
 * Read or unread makes no difference, and nothing is marked: bhagya's inbox is
 * watched by a person too, and a bounce they had already opened used to be
 * skipped here for good. All Mail and Trash are both looked at, so archiving or
 * deleting a notice does not hide it either. Handling is idempotent — see
 * handleBounce — so seeing the same notice every minute changes nothing.
 */
const checkOnce = async () => {
    if (!configured()) return 0;
    const { ImapFlow } = require('imapflow');
    const client = new ImapFlow({
        host: process.env.IMAP_HOST || 'imap.gmail.com',
        port: Number(process.env.IMAP_PORT || 993),
        secure: String(process.env.IMAP_SECURE || 'true').toLowerCase() !== 'false',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        logger: false
    });
    // A dropped connection is reported as an 'error' event. With nobody
    // listening, Node treats that as fatal and the whole server stopped —
    // every page then showed "Network Error" until it was restarted by hand
    // (2026-09-30). The pass fails, is logged, and the next minute tries again.
    client.on('error', (err) => console.warn('[bounces] mailbox connection error:', err.message));
    let handled = 0;
    await client.connect();
    try {
        const boxes = await client.list();
        const paths = ['\\All', '\\Trash'].map((use) => boxes.find((b) => b.specialUse === use)?.path).filter(Boolean);
        if (!paths.length) paths.push('INBOX');
        const since = new Date(Date.now() - 2 * 86400e3);
        for (const path of paths) {
            const lock = await client.getMailboxLock(path);
            try {
                const uids = await client.search({ since, from: 'mailer-daemon' }, { uid: true });
                if (!uids?.length) continue;
                // One request for all of them, not one per message: a folder of
                // old notices took half a minute fetched one at a time.
                const found = [];
                for await (const msg of client.fetch(uids, { envelope: true, headers: ['x-failed-recipients'] }, { uid: true })) {
                    found.push({ bouncedAt: msg?.envelope?.date || new Date(), addresses: failedRecipients(msg?.headers) });
                }
                for (const { bouncedAt, addresses } of found) {
                    for (const address of addresses) handled += await handleBounce(address, { bouncedAt });
                }
            } finally { lock.release(); }
        }
    } finally {
        await client.logout().catch(() => {});
    }
    return handled;
};

let timer = null;
/** Start checking every few minutes. Safe to call when nothing is configured. */
const start = () => {
    if (!configured() || timer) return false;
    const minutes = Math.max(1, Number(process.env.BOUNCE_CHECK_MINUTES || 1));
    let running = false;
    // One pass at a time: a slow mailbox must not stack passes on top of each other.
    const run = () => {
        if (running) return;
        running = true;
        checkOnce().catch((err) => console.warn('[bounces] check failed:', err.message)).finally(() => { running = false; });
    };
    timer = setInterval(run, minutes * 60 * 1000);
    timer.unref?.();
    setTimeout(run, 10 * 1000).unref?.();     // a first look shortly after start-up
    console.log(`[bounces] watching ${process.env.SMTP_USER} for undeliverable guardian requests every ${minutes} min`);
    return true;
};
const stop = () => { if (timer) clearInterval(timer); timer = null; };

module.exports = { failedRecipients, handleBounce, checkOnce, start, stop, configured };
