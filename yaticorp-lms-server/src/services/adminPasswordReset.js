/**
 * @description Forgotten-password links for organization administrators.
 *
 * The same shape as the student flow (controllers/userPasswordController.js):
 * a random token, emailed as a link, valid for an hour and good for one use.
 * Unlike the student flow, only the token's SHA-256 is stored, so a copy of the
 * database does not hand anyone a working link.
 *
 * Organization admins only. Platform admins and the superadmin are left out on
 * purpose: their accounts reach every organization and every student, so a
 * mailbox alone should not be enough to take one over. They are reset by a
 * superadmin in Settings, or with scripts/resetAdminPassword.js.
 *
 * Used by the public "Forgot password?" form and by a superadmin's "Send reset
 * link" button. Neither ever sees or sets the password — the link goes to the
 * account's own sign-in address and the organization chooses the new one.
 */
const crypto = require('crypto');
const mailer = require('../utils/emailService');

/** How long an emailed link stays usable. */
const RESET_TTL_MS = 60 * 60 * 1000;

/** Roles that may recover a password by email. */
const RECOVERABLE_ROLES = ['orgadmin'];

const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

const { escapeHtml, plainHeader } = require('../utils/escapeHtml');

/**
 * The admin app's address. ADMIN_URL is already what CORS and the other admin
 * emails use; the fallback is the Vite dev server the admin app runs on when
 * started second, next to the student app on 5173.
 */
const adminAppUrl = () => String(process.env.ADMIN_URL || 'http://localhost:5174').trim().replace(/\/+$/, '');

/**
 * Give this admin a fresh reset link and email it to their sign-in address.
 *
 * Any earlier link stops working, because only the newest hash is kept.
 * Throws if the email cannot be sent; callers decide what to tell whom.
 */
const issueAdminPasswordReset = async (admin) => {
    const Admin = admin.constructor;
    const token = crypto.randomBytes(32).toString('hex');
    await Admin.updateOne(
        { _id: admin._id },
        { $set: { resetPasswordTokenHash: hashToken(token), resetPasswordExpiry: new Date(Date.now() + RESET_TTL_MS) } }
    );

    const resetUrl = `${adminAppUrl()}/reset-password?token=${token}`;
    await mailer.sendEmail({
        to: admin.email,
        toName: plainHeader(admin.name),
        subject: 'Reset your YATICORP LMS organization password',
        htmlContent: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 12px;">
                <h2 style="color: #4f46e5; margin-bottom: 8px;">Password Reset Request</h2>
                <p style="color: #475569;">Hi ${escapeHtml(admin.name)},</p>
                <p style="color: #475569;">We received a request to reset the password your organization signs in to YATICORP LMS with. Click the button below to choose a new one.</p>
                <a href="${resetUrl}" style="display: inline-block; margin: 24px 0; padding: 14px 28px; background: #4f46e5; color: white; font-weight: bold; text-decoration: none; border-radius: 8px;">Reset My Password</a>
                <p style="color: #94a3b8; font-size: 13px;">This link will expire in 1 hour and works once. If you did not ask for it, you can safely ignore this email — your password has not changed.</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                <p style="color: #94a3b8; font-size: 12px;">YATICORP Learning Management System</p>
            </div>
        `
    });
    return { expiresInMinutes: RESET_TTL_MS / 60000 };
};

module.exports = { issueAdminPasswordReset, hashToken, RECOVERABLE_ROLES, RESET_TTL_MS, adminAppUrl };
