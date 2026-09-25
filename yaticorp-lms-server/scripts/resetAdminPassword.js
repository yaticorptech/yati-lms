/**
 * Reset (or create) an admin account's password.
 *
 * Usage (from yaticorp-lms-server/):
 *   node scripts/resetAdminPassword.js --list                         # show existing admins, no writes
 *   node scripts/resetAdminPassword.js <email> <newPassword>          # reset password for an existing admin
 *   node scripts/resetAdminPassword.js <email> <newPassword> --create # create as superadmin if it doesn't exist
 *
 * The Admin schema's pre-save hook hashes the password with bcrypt, so the
 * plain-text value is never stored.
 */
const mongoose = require('mongoose');
require('dotenv').config();
const Admin = require('../src/models/Admin');

const LIST = process.argv.includes('--list');
const CREATE = process.argv.includes('--create');
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const [email, newPassword] = args;

(async () => {
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not set in .env');
    await mongoose.connect(process.env.MONGO_URI);

    if (LIST) {
        const admins = await Admin.find({}).select('name email role isTwoFactorEnabled updatedAt').lean();
        if (!admins.length) console.log('No admin accounts found.');
        for (const a of admins) {
            console.log(`${a.email}\t${a.role}\t2FA=${a.isTwoFactorEnabled ? 'on' : 'off'}\t${a.name}\tupdated ${a.updatedAt?.toISOString?.() || ''}`);
        }
        await mongoose.disconnect();
        return;
    }

    if (!email || !newPassword) {
        console.log('Usage: node scripts/resetAdminPassword.js <email> <newPassword> [--create]');
        console.log('       node scripts/resetAdminPassword.js --list');
        await mongoose.disconnect();
        process.exit(1);
    }
    if (newPassword.length < 8) throw new Error('Password must be at least 8 characters');

    let admin = await Admin.findOne({ email: email.toLowerCase().trim() }) || await Admin.findOne({ email });
    if (!admin) {
        if (!CREATE) throw new Error(`No admin with email ${email}. Add --create to create it as superadmin.`);
        admin = await Admin.create({ name: 'Super Admin', email, password: newPassword, role: 'superadmin' });
        console.log(`Created superadmin ${admin.email}`);
    } else {
        admin.password = newPassword;
        await admin.save();
        console.log(`Password updated for ${admin.email} (${admin.role})`);
    }

    const ok = await admin.matchPassword(newPassword);
    console.log(`Verification: ${ok ? 'OK' : 'FAILED'}`);
    if (admin.isTwoFactorEnabled) console.log('Note: 2FA is enabled on this account; you will still need the authenticator code to log in.');

    await mongoose.disconnect();
})().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
