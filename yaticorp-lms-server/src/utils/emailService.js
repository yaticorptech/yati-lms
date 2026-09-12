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

const FROM_NAME = () => process.env.SMTP_FROM_NAME || 'YATICORP LMS';

/** Which way out is available, or null when none is. */
const provider = () => {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) return 'smtp';
    if (process.env.BREVO_API_KEY) return 'brevo';
    return null;
};

/** Whether email can be sent at all, for callers that want to say so up front. */
const emailConfigured = () => provider() !== null;

// One transport for the process: nodemailer pools connections, and building a
// fresh one per message re-does the TLS handshake every time.
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
        pool: true,
        connectionTimeout: 15000,
        greetingTimeout: 10000
    });
    return transport;
};

const sendOverSmtp = async ({ to, toName, subject, htmlContent }) => {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    const info = await smtpTransport().sendMail({
        from: { name: FROM_NAME(), address: from },
        to: toName ? { name: toName, address: to } : to,
        subject,
        html: htmlContent
    });
    console.log(`[Email] ✅ SMTP accepted | ${info.messageId} | ${(info.accepted || []).length} recipient(s)`);
    return info;
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

module.exports = { sendEmail, emailConfigured, provider, closeEmailTransport };
