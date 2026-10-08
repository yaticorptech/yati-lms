/**
 * @author Preethesh Kulal
 * @description Student password reset via email token and authenticated password change
 */
const crypto = require('crypto');
const User = require('../models/User');
const { sendEmail } = require('../utils/emailService');
const { findUserByCardNumber } = require('../utils/cardNumber');
const { validatePasswordStrength } = require('../middleware/validatePassword');

/**
 * Only the SHA-256 of a reset token is stored (as in services/adminPasswordReset.js),
 * so a copy of the database does not hand anyone a working link. The emailed
 * link carries the token itself; it is hashed again when it comes back.
 *
 * Links emailed before this change stored the token as typed and no longer
 * match. They lasted an hour, so at most the hour before a deploy is affected,
 * and the page already tells the student to ask for a new one.
 */
const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

/** The same answer whether or not the card exists, so it cannot be used to find out. */
const FORGOT_REPLY = 'If this card number exists, a reset link has been sent to the associated email.';

// @desc    Request a password reset link
// @route   POST /api/user/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
    try {
        const { cardNumber } = req.body;
        if (!cardNumber) {
            return res.status(400).json({ message: 'Card number is required' });
        }

        // The shared lookup: matches a card stored as text or as a number, and
        // never passes an object from the body into the query.
        const user = await findUserByCardNumber(cardNumber);
        if (!user || !user.email) {
            if (user) console.warn(`[auth] password reset asked for student ${user._id}, who has no email on file`);
            return res.json({ message: FORGOT_REPLY });
        }

        // Generate a secure token; only its hash is kept. A targeted update
        // rather than save(), so an older record that fails today's
        // validation can still ask for a link. A new link replaces any earlier one.
        const token = crypto.randomBytes(32).toString('hex');
        await User.updateOne(
            { _id: user._id },
            { $set: { resetPasswordToken: hashToken(token), resetPasswordExpiry: new Date(Date.now() + 60 * 60 * 1000) } } // 1 hour
        );

        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

        await sendEmail({
            to: user.email,
            toName: user.name,
            subject: 'Reset Your YATICORP LMS Password',
            htmlContent: `
                <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 12px;">
                    <h2 style="color: #4f46e5; margin-bottom: 8px;">Password Reset Request</h2>
                    <p style="color: #475569;">Hi ${user.name},</p>
                    <p style="color: #475569;">We received a request to reset your password for your YATICORP LMS account. Click the button below to set a new password.</p>
                    <a href="${resetUrl}" style="display: inline-block; margin: 24px 0; padding: 14px 28px; background: #4f46e5; color: white; font-weight: bold; text-decoration: none; border-radius: 8px;">Reset My Password</a>
                    <p style="color: #94a3b8; font-size: 13px;">This link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.</p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                    <p style="color: #94a3b8; font-size: 12px;">YATICORP Learning Management System</p>
                </div>
            `
        });

        res.json({ message: FORGOT_REPLY });
    } catch (error) {
        console.error('Forgot Password Error:', error);
        res.status(500).json({ message: 'Failed to send reset email. Please try again later.' });
    }
};

// @desc    Reset password using token
// @route   POST /api/user/reset-password
// @access  Public
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body || {};
        if (typeof token !== 'string' || !token || typeof newPassword !== 'string' || !newPassword) {
            return res.status(400).json({ message: 'Token and new password are required' });
        }
        // The same rules the reset page already checks; checked before the
        // link is used up, so a weak first try does not cost the student the link.
        const strengthError = validatePasswordStrength(newPassword);
        if (strengthError) return res.status(400).json({ message: strengthError });

        // Claiming the link, clearing it and setting the password are one
        // atomic update, so a link works once even if it is sent twice at
        // the same moment. A targeted update rather than save(), so an older
        // record that fails today's validation can still be reset. The User
        // model's update hook bcrypt-hashes the password on the way in.
        const user = await User.findOneAndUpdate(
            { resetPasswordToken: hashToken(token), resetPasswordExpiry: { $gt: new Date() } },
            {
                $set: { password: newPassword },
                $unset: { resetPasswordToken: '', resetPasswordExpiry: '' }
            },
            { projection: { name: 1, email: 1 } }
        );

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset link. Please request a new one.' });
        }

        // Send confirmation email
        await sendEmail({
            to: user.email,
            toName: user.name,
            subject: 'Your YATICORP LMS Password Was Changed',
            htmlContent: `
                <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 12px;">
                    <h2 style="color: #4f46e5; margin-bottom: 8px;">Password Changed Successfully</h2>
                    <p style="color: #475569;">Hi ${user.name},</p>
                    <p style="color: #475569;">Your YATICORP LMS password has been changed successfully. You can now log in with your new password.</p>
                    <p style="color: #94a3b8; font-size: 13px;">If you did not make this change, please contact administration immediately.</p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                    <p style="color: #94a3b8; font-size: 12px;">YATICORP Learning Management System</p>
                </div>
            `
        });

        res.json({ message: 'Password reset successful. You can now log in.' });
    } catch (error) {
        console.error('Reset Password Error:', error);
        res.status(500).json({ message: 'Failed to reset password. Please try again.' });
    }
};

// @desc    Update password (logged in)
// @route   PUT /api/user/update-password
// @access  Private/User
const updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user._id);

        if (!(await user.matchPassword(currentPassword))) {
            return res.status(401).json({ message: 'Invalid current password' });
        }

        user.password = newPassword;
        await user.save();

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Update Password Error:', error);
        res.status(500).json({ message: 'Failed to update password' });
    }
};

module.exports = { forgotPassword, resetPassword, updatePassword };
