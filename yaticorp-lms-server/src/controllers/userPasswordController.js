/**
 * @author Preethesh Kulal
 * @description Student password reset via email token and authenticated password change
 */
const crypto = require('crypto');
const User = require('../models/User');
const { sendEmail } = require('../utils/emailService');

// @desc    Request a password reset link
// @route   POST /api/user/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
    try {
        const { cardNumber } = req.body;
        if (!cardNumber) {
            return res.status(400).json({ message: 'Card number is required' });
        }

        const user = await User.findOne({ cardNumber });
        if (!user) {
            // Return generic message to avoid card number enumeration
            return res.json({ message: 'If this card number exists, a reset link has been sent to the associated email.' });
        }

        if (!user.email) {
            return res.status(400).json({ message: 'No email found for this account. Please contact support.' });
        }

        // Generate a secure token
        const token = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = token;
        user.resetPasswordExpiry = Date.now() + 60 * 60 * 1000; // 1 hour
        await user.save();

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

        res.json({ message: 'If this card number exists, a reset link has been sent to the associated email.' });
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
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({ message: 'Token and new password are required' });
        }

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpiry: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset link. Please request a new one.' });
        }

        // Update password directly using findOneAndUpdate to bypass any pre-save hooks
        await User.findOneAndUpdate(
            { _id: user._id },
            {
                $set: { password: newPassword },
                $unset: { resetPasswordToken: '', resetPasswordExpiry: '' }
            }
        );

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
