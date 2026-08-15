/**
 * @author Preethesh Kulal
 * @description Email sending utility using Brevo/SendinBlue SMTP
 */
const SibApiV3Sdk = require('sib-api-v3-sdk');

/**
 * Send a transactional email via Brevo API
 * Requires in .env:
 *   BREVO_API_KEY      - from Brevo → Settings → API Keys
 *   BREVO_SENDER_EMAIL - a verified sender in Brevo
 *   ADMIN_EMAIL        - fallback sender / admin recipient
 */
const sendEmail = async ({ to, toName, subject, htmlContent }) => {
    const apiKeyVal = process.env.BREVO_API_KEY;
    if (!apiKeyVal) throw new Error('BREVO_API_KEY is not set in .env');

    const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.ADMIN_EMAIL;
    if (!senderEmail) throw new Error('No sender email configured. Set BREVO_SENDER_EMAIL in .env');

    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    defaultClient.authentications['api-key'].apiKey = apiKeyVal;

    const transacApi = new SibApiV3Sdk.TransactionalEmailsApi();
    const mail = new SibApiV3Sdk.SendSmtpEmail();

    mail.sender = { name: 'YATICORP LMS', email: senderEmail };
    mail.to = [{ email: to, name: toName || to }];
    mail.subject = subject;
    mail.htmlContent = htmlContent;

    console.log(`[Email] → "${subject}" to ${to} (from: ${senderEmail})`);
    try {
        const result = await transacApi.sendTransacEmail(mail);
        console.log(`[Email] ✅ Accepted by Brevo | MessageId: ${result?.messageId || 'n/a'}`);
        return result;
    } catch (err) {
        const errBody = err?.response?.body || err?.response?.text || err.message;
        console.error(`[Email] ❌ Brevo rejected:`, errBody);
        throw err;
    }
};

module.exports = { sendEmail };
