/**
 * @author Preethesh Kulal
 * @description Sending email, over SMTP or through Brevo's API.
 *
 * Two ways out, tried in that order, because they fail for different reasons.
 * SMTP works with any mailbox that will hand out a password — a school's own
 * Google Workspace or Zoho account, say — and needs nothing enabled in a
 * third-party dashboard. Brevo's API stays as the fallback for deployments
 * already set up that way.
 *
 * SMTP (preferred when set):
 *   SMTP_HOST, SMTP_USER, SMTP_PASS   all three, or SMTP is skipped
 *   SMTP_PORT       optional, 587
 *   SMTP_SECURE     optional, "true" forces TLS; otherwise true only on 465
 *   SMTP_FROM       optional, defaults to SMTP_USER
 *   SMTP_FROM_NAME  optional, defaults to "YATICORP LMS"
 *
 * Brevo (fallback):
 *   BREVO_API_KEY       from Brevo → Settings → API Keys, and *enabled* there
 *   BREVO_SENDER_EMAIL  a verified sender in Brevo
 *   ADMIN_EMAIL         fallback sender
 *
 * With neither configured, sending throws rather than reporting success — a
 * caller that says "sent" over a message nobody received is the worst answer.
 */
const nodemailer = require('nodemailer');
const SibApiV3Sdk = require('sib-api-v3-sdk');
const dns = require('node:dns').promises;

/**
 * Why an address should not be written to, or '' when it may be.
 *
 * A message to an address that does not exist is not refused by the sending
 * server: it goes, and the failure comes back later as a bounce to the LMS's
 * own mailbox, where nobody is looking. The student was told "Email sent".
 * The checks that can be made before sending are made here: the domain must
 * run a mail server (a typo like gmial.com does not), and the address must
 * not be the student's own or the LMS's own mailbox, neither of which is a
 * parent. Whether the mailbox itself exists cannot be known in advance.
 *
 * When the lookup itself fails — no network — the address is allowed through:
 * a DNS outage must not stop every request in the LMS.
 */
const recipientProblem = async (email, { own = '' } = {}) => {
    const address = String(email || '').trim().toLowerCase();
    const ours = [process.env.SMTP_FROM, process.env.SMTP_USER, process.env.BREVO_SENDER_EMAIL, process.env.ADMIN_EMAIL]
        .map((a) => String(a || '').trim().toLowerCase()).filter(Boolean);
    if (own && address === String(own).trim().toLowerCase()) return "That is your own email address. Enter your parent or guardian's.";
    if (ours.includes(address)) return "That is the LMS's own mailbox, not a parent's. Enter your parent or guardian's address.";
    const domain = address.split('@')[1];
    if (!domain) return 'Enter a valid email address.';
    try {
        const mx = await dns.resolveMx(domain);
        if (!mx.length) return `We cannot find a mail server for "${domain}". Check the spelling of the address.`;
    } catch (err) {
        if (['ENODATA', 'ENOTFOUND', 'ESERVFAIL', 'EBADNAME'].includes(err.code)) return `We cannot find a mail server for "${domain}". Check the spelling of the address.`;
    }
    return '';
};

const FROM_NAME = () => process.env.SMTP_FROM_NAME || 'YATICORP LMS';

/** Which way out is available, or null when none is. */
const provider = () => {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) return 'smtp';
    if (process.env.BREVO_API_KEY) return 'brevo';
    return null;
};

/** Whether email can be sent at all, for callers that want to say so up front. */
const emailConfigured = () => provider() !== null;

// One transport for the process, but no connection pool. A pooled connection
// is kept open between messages, and this server sends a message every few
// hours at most: Gmail closes the idle socket long before the next one, and
// that next send failed with "Connection closed" while a fresh process sent
// the same message fine. A new connection per message costs one TLS
// handshake, which is nothing at this volume.
let transport = null;
const smtpTransport = () => {
    if (transport) return transport;
    const port = Number(process.env.SMTP_PORT || 587);
    transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        // Implicit TLS on 465; STARTTLS on 587 and everything else.
        secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        pool: false,
        connectionTimeout: 15000,
        greetingTimeout: 10000,
        socketTimeout: 30000
    });
    return transport;
};

/** A failure of the connection rather than of the message: worth one more go. */
const DROPPED = new Set(['ECONNECTION', 'ETIMEDOUT', 'ECONNRESET', 'EPIPE', 'ESOCKET']);
const dropped = (err) => DROPPED.has(err?.code) || /connection closed|socket close|unexpected socket close/i.test(err?.message || '');

const sendOverSmtp = async ({ to, toName, subject, htmlContent }, attempt = 1) => {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    try {
        const info = await smtpTransport().sendMail({
            from: { name: FROM_NAME(), address: from },
            to: toName ? { name: toName, address: to } : to,
            subject,
            html: htmlContent
        });
        console.log(`[Email] ✅ SMTP accepted | ${info.messageId} | ${(info.accepted || []).length} recipient(s)`);
        return info;
    } catch (err) {
        // The server refusing the message (a bad login, a bad address) is
        // final. A dropped connection is tried once more on a new socket.
        if (attempt === 1 && dropped(err)) {
            console.warn(`[Email] SMTP connection dropped (${err.code || err.message}); trying once more`);
            return sendOverSmtp({ to, toName, subject, htmlContent }, 2);
        }
        throw err;
    }
};

const sendOverBrevo = async ({ to, toName, subject, htmlContent }) => {
    const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.ADMIN_EMAIL;
    if (!senderEmail) throw new Error('No sender email configured. Set BREVO_SENDER_EMAIL in .env');

    SibApiV3Sdk.ApiClient.instance.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;
    const mail = new SibApiV3Sdk.SendSmtpEmail();
    mail.sender = { name: FROM_NAME(), email: senderEmail };
    mail.to = [{ email: to, name: toName || to }];
    mail.subject = subject;
    mail.htmlContent = htmlContent;

    const result = await new SibApiV3Sdk.TransactionalEmailsApi().sendTransacEmail(mail);
    console.log(`[Email] ✅ Accepted by Brevo | MessageId: ${result?.messageId || 'n/a'}`);
    return result;
};

/**
 * Send one email. Throws when nothing is configured or the send is refused,
 * so a caller can tell the difference between sent and not.
 */
const sendEmail = async ({ to, toName, subject, htmlContent }) => {
    const how = provider();
    if (!how) {
        throw new Error('No email provider configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS, or BREVO_API_KEY.');
    }
    console.log(`[Email] → "${subject}" to ${to} (via ${how})`);
    try {
        return how === 'smtp'
            ? await sendOverSmtp({ to, toName, subject, htmlContent })
            : await sendOverBrevo({ to, toName, subject, htmlContent });
    } catch (err) {
        const detail = err?.response?.body || err?.response?.text || err.message;
        console.error(`[Email] ❌ ${how} refused:`, detail);
        throw err;
    }
};

/**
 * Let go of the pooled SMTP connections.
 *
 * The pool keeps sockets open between messages, which is what you want in a
 * running server and what stops a short-lived process — a script, a test —
 * from ever exiting.
 */
const closeEmailTransport = () => {
    if (!transport) return;
    try { transport.close(); } catch { /* already gone */ }
    transport = null;
};

module.exports = { sendEmail, emailConfigured, provider, closeEmailTransport, recipientProblem };
