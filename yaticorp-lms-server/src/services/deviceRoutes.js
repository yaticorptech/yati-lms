/**
 * @description An administrator's controls for a student's devices (services/deviceGuard.js),
 * mounted for the super admin (/api/admin/users/:id/devices) and for the student's own
 * organization (/api/organizations/me/students/:id/devices):
 *
 *   GET    /                 the devices, the limits, the residential card, and when they may next remove one
 *   PUT    /residential      { enabled } — a residential card allows a second computer (lab and home)
 *   DELETE /                 reset: every device off, the yearly removal given back
 *
 * `findStudent(req)` returns the student this administrator may manage, or null.
 */
const express = require('express');
const { limitsFor, nextRemovalAt, resetDevices, view, devicesChanged } = require('./deviceGuard');
const User = require('../models/User');

module.exports = (findStudent) => {
    const router = express.Router({ mergeParams: true });
    const load = async (req, res) => {
        const student = await findStudent(req).catch(() => null);
        if (!student) { res.status(404).json({ message: 'No such student.' }); return null; }
        return User.findById(student._id).select('name devices deviceRemovedAt residentialCard').lean();
    };
    const answer = (u) => ({
        devices: (u.devices || []).map(view),
        residentialCard: !!u.residentialCard,
        limits: limitsFor(u),
        canRemoveAt: nextRemovalAt(u)
    });

    router.get('/', async (req, res) => {
        try { const u = await load(req, res); if (u) res.json(answer(u)); }
        catch (e) { res.status(500).json({ message: 'Could not load the devices.' }); }
    });
    router.put('/residential', async (req, res) => {
        try {
            const u = await load(req, res); if (!u) return;
            await User.updateOne({ _id: u._id }, { $set: { residentialCard: !!req.body?.enabled } });
            devicesChanged(u._id);
            const next = await User.findById(u._id).select('devices deviceRemovedAt residentialCard').lean();
            res.json({ ...answer(next), message: req.body?.enabled ? `Residential card on — ${u.name} may use 2 computers and 1 mobile.` : `Residential card off — ${u.name} may use 1 computer and 1 mobile.` });
        } catch (e) { res.status(500).json({ message: 'Could not change the residential card.' }); }
    });
    router.delete('/', async (req, res) => {
        try {
            const u = await load(req, res); if (!u) return;
            await resetDevices(u._id);
            res.json({ devices: [], residentialCard: !!u.residentialCard, limits: limitsFor(u), canRemoveAt: null, message: `Devices reset — ${u.name} can sign in on new devices now.` });
        } catch (e) { res.status(500).json({ message: 'Could not reset the devices.' }); }
    });
    return router;
};
