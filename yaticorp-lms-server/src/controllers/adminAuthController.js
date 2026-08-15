/**
 * @author Preethesh Kulal
 * @description Handles admin login, 2FA setup and verification
 */
const Admin = require('../models/Admin');
const generateToken = require('../utils/generateToken');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { validatePasswordStrength } = require('../middleware/validatePassword');

// @desc    Auth admin & get 2FA prompt or token
// @route   POST /api/admin/login
// @access  Public
const loginAdmin = async (req, res) => {
    const { email, password } = req.body;

    try {
        const admin = await Admin.findOne({ email });

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

module.exports = {
    loginAdmin,
    verify2FA,
    setup2FA,
    enable2FA
};
