/**
 * An organization's Scouts & Guides units — mounted at
 * /api/organizations/me/nccnss/units, behind protectOrgAdmin and
 * requireActiveOrganization.
 *
 *   GET    /                 my units, with their leaders and member counts (?status=active|inactive)
 *   POST   /                 add one { name, section, regNo, leaderTeacherIds[], note }
 *   PUT    /:id              edit it, or retire it { status: 'inactive' }; a rename is carried to its members and events
 *   DELETE /:id              delete one that never had members
 *
 * Leaders are teachers of this organization; any other id is dropped. As in
 * the rest of the panel, the organization is req.organization. A staff
 * sign-in (Admin.staff) may only read them.
 */
const express = require('express');
const mongoose = require('mongoose');
const { Teacher } = require('../teacher/models');
const { ScoutUnit, NccNssMember, NccNssEvent, SCOUT_SECTIONS, SCOUT_SECTION_LABELS, UNIT_STATUSES } = require('./models');

const router = express.Router();
const validId = (id) => mongoose.isValidObjectId(id);
const notFound = (res) => res.status(404).json({ message: 'No such unit in your organization.' });
const fail = (res, error, what) => {
    console.error(`[nccnss] units ${what} failed:`, error.message);
    res.status(500).json({ message: `Could not ${what}. Please try again.` });
};
// Units and their leaders are the organization's to set, not a staff sign-in's.
router.use((req, res, next) => (req.admin?.staff && req.method !== 'GET'
    ? res.status(403).json({ code: 'STAFF_LIMITED', message: 'Only your organization\'s administrator can change units.' })
    : next()));
const duplicate = (res) => res.status(409).json({ message: 'You already have a unit with that name.' });

/** The fields an admin may set; leaders narrowed to this organization's teachers. */
const unitFields = async (req) => {
    const b = req.body || {};
    const out = {};
    if (b.name !== undefined) out.name = String(b.name).trim().slice(0, 80);
    if (b.section !== undefined) out.section = SCOUT_SECTIONS.includes(b.section) ? b.section : '';
    if (b.regNo !== undefined) out.regNo = String(b.regNo).trim().slice(0, 40);
    if (b.note !== undefined) out.note = String(b.note).trim().slice(0, 300);
    if (UNIT_STATUSES.includes(b.status)) out.status = b.status;
    if (Array.isArray(b.leaderTeacherIds)) {
        const asked = b.leaderTeacherIds.filter(validId).slice(0, 10);
        out.leaderTeacherIds = await Teacher.find({ _id: { $in: asked }, organizationId: req.organization._id }).distinct('_id');
    }
    return out;
};

router.get('/', async (req, res) => {
    try {
        const orgId = req.organization._id;
        const filter = { organizationId: orgId, ...(UNIT_STATUSES.includes(req.query.status) ? { status: req.query.status } : {}) };
        const [units, counts] = await Promise.all([
            ScoutUnit.find(filter).populate('leaderTeacherIds', 'name designation').sort({ status: 1, name: 1 }).lean(),
            NccNssMember.aggregate([
                { $match: { organizationId: orgId, scheme: 'SCOUTS', unitId: { $ne: null }, status: { $in: ['active', 'pending'] } } },
                { $group: { _id: { unitId: '$unitId', status: '$status' }, n: { $sum: 1 } } }
            ])
        ]);
        const count = (u, status) => counts.find((c) => String(c._id.unitId) === String(u._id) && c._id.status === status)?.n || 0;
        res.json({
            units: units.map((u) => ({ ...u, sectionLabel: SCOUT_SECTION_LABELS[u.section], members: count(u, 'active'), pending: count(u, 'pending') })),
            sections: SCOUT_SECTIONS.map((s) => ({ value: s, label: SCOUT_SECTION_LABELS[s] }))
        });
    } catch (error) { fail(res, error, 'load the units'); }
});

router.post('/', async (req, res) => {
    try {
        const fields = await unitFields(req);
        if (!fields.name) return res.status(400).json({ message: 'Give the unit a name.' });
        if (!fields.section) return res.status(400).json({ message: 'Choose the unit\'s section.' });
        const unit = await ScoutUnit.create({ ...fields, status: 'active', organizationId: req.organization._id });
        res.status(201).json({ message: `${unit.name} added.`, unit });
    } catch (error) {
        if (error.code === 11000) return duplicate(res);
        fail(res, error, 'add the unit');
    }
});

router.put('/:id', async (req, res) => {
    try {
        if (!validId(req.params.id)) return notFound(res);
        const orgId = req.organization._id;
        const unit = await ScoutUnit.findOne({ _id: req.params.id, organizationId: orgId });
        if (!unit) return notFound(res);
        const fields = await unitFields(req);
        if (fields.name === '') return res.status(400).json({ message: 'Give the unit a name.' });
        if (fields.section === '') return res.status(400).json({ message: 'Choose the unit\'s section.' });
        const renamed = fields.name && fields.name !== unit.name;
        const resectioned = fields.section && fields.section !== unit.section;
        Object.assign(unit, fields);
        await unit.save();
        // Members and events carry the unit's name (and members its section); keep them in step.
        if (renamed || resectioned) {
            await Promise.all([
                NccNssMember.updateMany({ organizationId: orgId, unitId: unit._id }, { $set: { unit: unit.name, section: unit.section } }),
                renamed ? NccNssEvent.updateMany({ organizationId: orgId, unitId: unit._id }, { $set: { unit: unit.name } }) : null
            ]);
        }
        res.json({ message: unit.status === 'inactive' ? `${unit.name} retired.` : 'Unit saved.', unit });
    } catch (error) {
        if (error.code === 11000) return duplicate(res);
        fail(res, error, 'save the unit');
    }
});

router.delete('/:id', async (req, res) => {
    try {
        if (!validId(req.params.id)) return notFound(res);
        const orgId = req.organization._id;
        // Any member row, past or present, keeps the unit: its history points at it. Retire it instead.
        const used = await NccNssMember.countDocuments({ organizationId: orgId, unitId: req.params.id });
        if (used) return res.status(409).json({ message: 'This unit has members on record. Retire it instead of deleting it.' });
        const unit = await ScoutUnit.findOneAndDelete({ _id: req.params.id, organizationId: orgId });
        if (!unit) return notFound(res);
        // With no members ever, its events have no attendance worth keeping.
        await NccNssEvent.deleteMany({ organizationId: orgId, unitId: unit._id });
        res.json({ message: `${unit.name} deleted.` });
    } catch (error) { fail(res, error, 'delete the unit'); }
});

module.exports = router;
