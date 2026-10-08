/**
 * @author Preethesh Kulal
 * @description Handles admin login, 2FA setup and verification, for platform
 *              administrators and organization administrators alike
 */
const Admin = require('../models/Admin');
const generateToken = require('../utils/generateToken');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { validatePasswordStrength } = require('../middleware/validatePassword');

/**
 * What an organization administrator's sign-in has to carry beyond the usual
 * fields, so the admin app knows to send them to their own dashboard rather
 * than the platform one, and can show an application still under review.
 *
 * Returns {} for a platform admin, so the login response is byte-for-byte what
 * it was before organizations existed.
 */
const organizationContext = async (admin) => {
    if (admin.role !== 'orgadmin' || !admin.organizationId) return {};
    const Organization = require('../organizations/models/Organization');
    const organization = await Organization.findById(admin.organizationId)
        .select('name orgCode status statusReason')
        .lean();
    if (!organization) return { organizationStatus: 'missing' };
    return {
        organizationId: String(organization._id),
        organizationName: organization.name,
        orgCode: organization.orgCode,
        organizationStatus: organization.status,
        organizationStatusReason: organization.statusReason || ''
    };
};

// @desc    Auth admin & get 2FA prompt or token
// @route   POST /api/admin/login
// @access  Public
const loginAdmin = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Trimmed and lower-cased, as every admin email is stored, so the case
        // someone types their address in does not decide whether they get in.
        // Only a string is looked up — an object here would be a query operator.
        const admin = typeof password === 'string' ? await Admin.findByLoginEmail(email) : null;

        if (admin && (await admin.matchPassword(password))) {
            if (admin.isTwoFactorEnabled) {
                return res.json({
                    message: '2FA required',
                    requires2FA: true,
                    adminId: admin._id
                });
            }

            res.json({
                _id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
                requires2FA: false,
                ...(await organizationContext(admin)),
                token: generateToken(admin._id, admin.role)
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Verify 2FA TOTP code
// @route   POST /api/admin/verify-2fa
// @access  Public
const verify2FA = async (req, res) => {
    const { adminId, token } = req.body;

    try {
        const admin = await Admin.findById(adminId);

        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        const verified = speakeasy.totp.verify({
            secret: admin.twoFactorSecret,
            encoding: 'base32',
            token
        });

        if (verified) {
            res.json({
                _id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
                ...(await organizationContext(admin)),
                token: generateToken(admin._id, admin.role)
            });
        } else {
            res.status(401).json({ message: 'Invalid 2FA code' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Setup 2FA for logged in admin (or superadmin setting up for someone)
// @route   POST /api/admin/setup-2fa
// @access  Private/Admin
const setup2FA = async (req, res) => {
    try {
        console.log(`[2FA Setup] Initiating for admin: ${req.admin._id}`);
        const admin = await Admin.findById(req.admin._id);

        if (!admin) {
            console.error(`[2FA Setup] Admin not found for ID: ${req.admin._id}`);
            return res.status(404).json({ message: 'Admin not found' });
        }

        console.log(`[2FA Setup] Generating secret for ${admin.email}`);
        const secret = speakeasy.generateSecret({ 
            length: 20, 
            name: `YATICORP_LMS (${admin.email})`,
            otpauth_url: true 
        });

        if (!secret || !secret.base32) {
            console.error('[2FA Setup] Failed to generate secret');
            return res.status(500).json({ message: 'Failed to generate 2FA secret' });
        }

        admin.twoFactorSecret = secret.base32;
        admin.isTwoFactorEnabled = false;
        
        console.log('[2FA Setup] Saving admin document with new secret');
        await admin.save();

        if (!secret.otpauth_url) {
            console.error('[2FA Setup] No otpauth_url generated in secret');
            return res.status(500).json({ message: 'Failed to generate 2FA QR URL' });
        }

        console.log('[2FA Setup] Generating QR code URL');
        qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
            if (err) {
                console.error('[2FA Setup] QR Code generation error:', err);
                return res.status(500).json({ message: 'Error generating QR code', error: err.message });
            }
            console.log('[2FA Setup] Successfully generated QR code');
            res.json({
                message: 'Scan the QR code with Google Authenticator. Then call enable-2fa with a valid token to activate.',
                secret: secret.base32,
                qrCode: data_url
            });
        });
    } catch (error) {
        console.error('[2FA Setup] Internal Server Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Enable 2FA by verifying the first token after setup
// @route   POST /api/admin/enable-2fa
// @access  Private/Admin
const enable2FA = async (req, res) => {
    const { token } = req.body;
    try {
        const admin = await Admin.findById(req.admin._id);

        if (!admin || !admin.twoFactorSecret) {
            return res.status(400).json({ message: '2FA setup not initiated' });
        }

        const verified = speakeasy.totp.verify({
            secret: admin.twoFactorSecret,
            encoding: 'base32',
            token
        });

        if (verified) {
            admin.isTwoFactorEnabled = true;
            await admin.save();
            res.json({ message: '2FA successfully enabled' });
        } else {
            res.status(400).json({ message: 'Invalid 2FA code. Please try again.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/** Said whether or not the address belongs to anyone, so it cannot be used to find out. */
const FORGOT_REPLY = 'If that email belongs to an organization account, a link to reset its password has been sent to it.';

// @desc    Email an organization admin a link to choose a new password
// @route   POST /api/auth/admin/forgot-password
// @access  Public (rate limited)
const forgotAdminPassword = async (req, res) => {
    const { issueAdminPasswordReset, RECOVERABLE_ROLES } = require('../services/adminPasswordReset');
    try {
        const email = Admin.normalizeEmail(req.body?.email);
        if (!email) return res.status(400).json({ message: 'Enter your email address.' });

        const admin = await Admin.findByLoginEmail(email);
        if (admin && RECOVERABLE_ROLES.includes(admin.role)) {
            // Not awaited, and a failure is logged rather than reported: either
            // a slower or a different answer for a real account would tell a
            // stranger which addresses have one.
            issueAdminPasswordReset(admin).catch((error) => {
                console.error('[admin] password reset email failed:', error.message);
            });
        }
        res.json({ message: FORGOT_REPLY });
    } catch (error) {
        console.error('[admin] forgot password failed:', error.message);
        res.status(500).json({ message: 'Could not process the request. Please try again later.' });
    }
};

// @desc    Choose a new password with the emailed link
// @route   POST /api/auth/admin/reset-password
// @access  Public (rate limited)
const resetAdminPassword = async (req, res) => {
    const { hashToken, RECOVERABLE_ROLES } = require('../services/adminPasswordReset');
    try {
        const { token, newPassword, confirmPassword } = req.body || {};
        if (typeof token !== 'string' || !token || typeof newPassword !== 'string' || !newPassword) {
            return res.status(400).json({ message: 'The reset link and a new password are both needed.' });
        }
        if (confirmPassword !== undefined && newPassword !== confirmPassword) {
            return res.status(400).json({ message: 'The two new passwords do not match.' });
        }
        // Checked before the link is used up, so a weak first try does not
        // cost the organization its link.
        const strengthError = validatePasswordStrength(newPassword);
        if (strengthError) return res.status(400).json({ message: strengthError });

        // Claiming the token and clearing it is one atomic step, so the same
        // link used twice at once still changes the password only once.
        const admin = await Admin.findOneAndUpdate(
            {
                resetPasswordTokenHash: hashToken(token),
                resetPasswordExpiry: { $gt: new Date() },
                role: { $in: RECOVERABLE_ROLES }
            },
            { $unset: { resetPasswordTokenHash: '', resetPasswordExpiry: '' } },
            { new: true }
        );
        if (!admin) {
            return res.status(400).json({ message: 'This reset link is invalid or has expired. Please ask for a new one.' });
        }

        // save(), so the bcrypt pre-save hook hashes it like every other admin password.
        admin.password = newPassword;
        await admin.save();

        res.json({ message: 'Your password was changed. You can sign in with it now.' });
    } catch (error) {
        console.error('[admin] reset password failed:', error.message);
        res.status(500).json({ message: 'Could not reset the password. Please try again.' });
    }
};

module.exports = {
    forgotAdminPassword,
    resetAdminPassword,
    loginAdmin,
    verify2FA,
    setup2FA,
    enable2FA
};
