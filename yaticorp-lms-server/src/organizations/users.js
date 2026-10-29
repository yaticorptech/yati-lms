/**
 * An organization's own users and its audit log — mounted under
 * /api/organizations/me, behind protectOrgAdmin and requireActiveOrganization.
 *
 *   GET    /users            the accounts that sign in to this panel with full rights
 *   POST   /users            add one { name, email, password }
 *   PUT    /users/:id        rename, or set a new password { name?, password? }
 *   DELETE /users/:id        take one away (never your own, never the owner)
 *   GET    /audit            who did what here, newest first (?adminId=&page=)
 *
 * A user here is an ordinary orgadmin Admin — the same sign-in as the
 * organization's own, with every right it has. The owner is the account the
 * organization registered with (its oldest); only the owner changes the owner.
 * Teachers with a limited panel sign-in (Admin.staff) are managed under
 * Teachers, not here, and a staff sign-in cannot reach these routes at all
 * (staffMay in ./middleware/authMiddleware.js).
 */
const express = require('express');
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const OrgAuditLog = require('./models/OrgAuditLog');
const { validatePasswordStrength } = require('../middleware/validatePassword');

const router = express.Router();
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PAGE = 50;
const fail = (res, error, what) => {
    console.error(`[organizations] users ${what} failed:`, error.message);
    res.status(500).json({ message: `Could not ${what}. Please try again.` });
};
const notFound = (res) => res.status(404).json({ message: 'No such user in your organization.' });

/** This organization's full-rights accounts, oldest (the owner) first. */
const usersOf = (organizationId) => Admin.find({ role: 'orgadmin', organizationId, staff: { $ne: true } })
    .select('name email createdAt isTwoFactorEnabled').sort({ createdAt: 1, _id: 1 }).lean();

/** The user a request names, with whether they are the owner; null if not this organization's. */
const userFor = async (req) => {
    if (!mongoose.isValidObjectId(req.params.id)) return null;
    const users = await usersOf(req.organization._id);
    const i = users.findIndex((u) => String(u._id) === String(req.params.id));
    return i < 0 ? null : { user: users[i], owner: i === 0, ownerId: String(users[0]._id) };
};

router.get('/users', async (req, res) => {
    try {
        const users = await usersOf(req.organization._id);
        const lastSeen = await OrgAuditLog.aggregate([
            { $match: { orgId: req.organization._id, action: 'Signed in', adminId: { $in: users.map((u) => u._id) } } },
            { $group: { _id: '$adminId', at: { $max: '$at' } } }
        ]);
        res.json({
            users: users.map((u, i) => ({
                _id: u._id, name: u.name, email: u.email, createdAt: u.createdAt, twoFactor: Boolean(u.isTwoFactorEnabled),
                owner: i === 0, you: String(u._id) === String(req.admin._id),
                lastSignIn: lastSeen.find((x) => String(x._id) === String(u._id))?.at || null
            }))
        });
    } catch (error) { fail(res, error, 'load your users'); }
});

router.post('/users', async (req, res) => {
    try {
        const b = req.body || {};
        const name = String(b.name || '').trim().slice(0, 100);
        const email = String(b.email || '').trim().toLowerCase();
        const password = typeof b.password === 'string' ? b.password : '';
        if (!name) return res.status(400).json({ field: 'name', message: 'Enter their name.' });
        if (!EMAIL_PATTERN.test(email) || email.length > 254) return res.status(400).json({ field: 'email', message: 'Enter a valid email address.' });
        if (!password) return res.status(400).json({ field: 'password', message: 'Set a first password.' });
        const weak = validatePasswordStrength(password);
        if (weak) return res.status(400).json({ field: 'password', message: weak });
        if (await Admin.findByLoginEmail(email)) return res.status(400).json({ field: 'email', message: 'This email already signs in to an administrator panel. Use another.' });
        const user = await Admin.create({ name, email, password, role: 'orgadmin', organizationId: req.organization._id });
        res.status(201).json({ message: `${user.name} can now sign in to this dashboard with ${user.email} and the password you set.`, user: { _id: user._id, name: user.name, email: user.email } });
    } catch (error) {
        if (error?.code === 11000) return res.status(400).json({ field: 'email', message: 'This email already signs in to an administrator panel. Use another.' });
        fail(res, error, 'add the user');
    }
});

router.put('/users/:id', async (req, res) => {
    try {
        const found = await userFor(req);
        if (!found) return notFound(res);
        if (found.owner && String(req.admin._id) !== found.ownerId) return res.status(403).json({ message: 'Only the owner can change the owner\'s account.' });
        const user = await Admin.findById(found.user._id);
        const b = req.body || {};
        if (b.name !== undefined) {
            const name = String(b.name).trim().slice(0, 100);
            if (!name) return res.status(400).json({ field: 'name', message: 'Enter their name.' });
            user.name = name;
        }
        if (b.password) {
            const weak = validatePasswordStrength(String(b.password));
            if (weak) return res.status(400).json({ field: 'password', message: weak });
            // The save hook hashes it and ends their other sessions (passwordChangedAt).
            user.password = String(b.password);
        }
        await user.save();
        res.json({ message: b.password ? `${user.name}'s details and password were saved. They sign in again with the new password.` : `${user.name} saved.` });
    } catch (error) { fail(res, error, 'save the user'); }
});

router.delete('/users/:id', async (req, res) => {
    try {
        const found = await userFor(req);
        if (!found) return notFound(res);
        if (String(found.user._id) === String(req.admin._id)) return res.status(400).json({ message: 'You cannot remove your own account.' });
        if (found.owner) return res.status(403).json({ message: 'The owner\'s account cannot be removed.' });
        await Admin.deleteOne({ _id: found.user._id, organizationId: req.organization._id, role: 'orgadmin' });
        res.json({ message: `${found.user.name} can no longer sign in to this dashboard.` });
    } catch (error) { fail(res, error, 'remove the user'); }
});

router.get('/audit', async (req, res) => {
    try {
        const filter = { orgId: req.organization._id };
        if (mongoose.isValidObjectId(req.query.adminId)) filter.adminId = new mongoose.Types.ObjectId(String(req.query.adminId));
        const page = Math.max(1, Math.min(1000, Number(req.query.page) || 1));
        const [rows, total, people, ours] = await Promise.all([
            OrgAuditLog.find(filter).sort({ at: -1 }).skip((page - 1) * PAGE).limit(PAGE).lean(),
            OrgAuditLog.countDocuments(filter),
            OrgAuditLog.aggregate([
                { $match: { orgId: req.organization._id, adminId: { $ne: null } } },
                { $group: { _id: '$adminId', name: { $last: '$adminName' } } },
                { $sort: { name: 1 } }
            ]),
            Admin.find({ organizationId: req.organization._id }).distinct('_id')
        ]);
        const own = new Set(ours.map(String));
        res.json({
            rows: rows.map((r) => ({
                _id: r._id, at: r.at, who: r.adminName || 'Someone', adminId: r.adminId,
                // Anyone not one of this organization's accounts is YATICORP's (a superadmin).
                platform: !own.has(String(r.adminId)),
                action: r.action === 'view-mode-write' ? 'Made a change in this dashboard' : r.action,
                method: r.method, path: r.path
            })),
            total, page, pages: Math.max(1, Math.ceil(total / PAGE)),
            people: people.map((p) => ({ _id: p._id, name: p.name }))
        });
    } catch (error) { fail(res, error, 'load the audit log'); }
});

module.exports = router;
