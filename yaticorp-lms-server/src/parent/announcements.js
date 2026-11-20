/**
 * Announcements to parents (2026-11-19, the user: "add an announcement option in the parent's sidebar and in the
 * organization dashboard — parent announcement — from that organization, the parents who added its students get that
 * announcement"). Kept on the organization (Organization.parentAnnouncements): the database takes no new collections.
 *
 *   Organization dashboard, mounted at /api/organizations/me/parent-announcements (an organization's admin; not staff):
 *     GET    /          its announcements, newest first (pinned on top), and how many parents they reach
 *     POST   /          { title, body, pinned }
 *     PUT    /:id       the same fields
 *     DELETE /:id
 *   Parent dashboard: GET /api/parent/announcements (forParent, below) — every announcement of each of their
 *   children's organizations, saying which of their children it is for.
 */
const express = require('express');
const mongoose = require('mongoose');
const Organization = require('../organizations/models/Organization');
const Card = require('../models/Card');
const User = require('../models/User');

const view = (a) => ({ _id: a._id, title: a.title, body: a.body || '', pinned: Boolean(a.pinned), by: a.by || '', createdAt: a.createdAt, updatedAt: a.updatedAt });
const order = (x, y) => (Number(y.pinned) - Number(x.pinned)) || (new Date(y.createdAt) - new Date(x.createdAt));
const fieldsOf = (b = {}) => {
    const title = String(b.title ?? '').trim();
    const body = String(b.body ?? '').trim();
    if (!title) return { error: 'Give the announcement a title.' };
    if (title.length > 140) return { error: 'Keep the title under 140 characters.' };
    if (body.length > 4000) return { error: 'Keep the message under 4000 characters.' };
    return { fields: { title, body, pinned: Boolean(b.pinned) } };
};

/** How many parents an organization reaches: those who added at least one of its students. */
const parentsReached = async (orgId) => {
    const students = await User.find({ organizationId: orgId }).distinct('_id');
    if (!students.length) return 0;
    return Card.countDocuments({ 'parent.password': { $exists: true }, 'parent.children.userId': { $in: students } });
};

const orgAdmin = express.Router();
const fail = (res, what, error) => { console.error(`[parent] announcements ${what} failed:`, error.message); res.status(500).json({ message: `Could not ${what}. Please try again.` }); };

orgAdmin.get('/', async (req, res) => {
    try {
        const org = await Organization.findById(req.organization._id).select('parentAnnouncements').lean();
        res.json({ announcements: (org?.parentAnnouncements || []).map(view).sort(order), parents: await parentsReached(req.organization._id) });
    } catch (error) { fail(res, 'load the announcements', error); }
});

orgAdmin.post('/', async (req, res) => {
    try {
        const { fields, error } = fieldsOf(req.body);
        if (error) return res.status(400).json({ message: error });
        const item = { _id: new mongoose.Types.ObjectId(), ...fields, by: String(req.admin?.name || '').slice(0, 80), createdAt: new Date(), updatedAt: new Date() };
        await Organization.updateOne({ _id: req.organization._id }, { $push: { parentAnnouncements: { $each: [item], $slice: -200 } } });
        res.status(201).json({ announcement: view(item), message: 'Announcement sent to parents.' });
    } catch (error) { fail(res, 'send the announcement', error); }
});

orgAdmin.put('/:id', async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'No such announcement.' });
        const { fields, error } = fieldsOf(req.body);
        if (error) return res.status(400).json({ message: error });
        const r = await Organization.updateOne({ _id: req.organization._id, 'parentAnnouncements._id': req.params.id }, {
            $set: { 'parentAnnouncements.$.title': fields.title, 'parentAnnouncements.$.body': fields.body, 'parentAnnouncements.$.pinned': fields.pinned, 'parentAnnouncements.$.updatedAt': new Date() }
        });
        if (!r.matchedCount) return res.status(404).json({ message: 'No such announcement.' });
        res.json({ message: 'Announcement updated.' });
    } catch (error) { fail(res, 'update the announcement', error); }
});

orgAdmin.delete('/:id', async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'No such announcement.' });
        await Organization.updateOne({ _id: req.organization._id }, { $pull: { parentAnnouncements: { _id: req.params.id } } });
        res.json({ message: 'Announcement deleted.' });
    } catch (error) { fail(res, 'delete the announcement', error); }
});

/**
 * A parent's announcements: each child's organization (a demo card's, the demo institution), every announcement once,
 * with the organization and the children it is for.
 */
const forParent = async (childIds) => {
    const { orgIdFor } = require('../services/demoInstitution');
    const children = await User.find({ _id: { $in: childIds } }).select('name organizationId cardNumber').lean();
    const byOrg = new Map();
    for (const c of children) {
        const orgId = c.organizationId || await orgIdFor(c._id).catch(() => null);
        if (!orgId) continue;
        const key = String(orgId);
        if (!byOrg.has(key)) byOrg.set(key, []);
        byOrg.get(key).push({ _id: String(c._id), name: c.name });
    }
    if (!byOrg.size) return [];
    const orgs = await Organization.find({ _id: { $in: [...byOrg.keys()] } }).select('name logo parentAnnouncements').lean();
    // `for`: the children it is for, by name; `forIds`, by id — the page shows the child chosen in the switcher (2026-11-19).
    return orgs.flatMap((o) => (o.parentAnnouncements || []).map((a) => ({ ...view(a), organization: o.name, logo: o.logo || '', for: (byOrg.get(String(o._id)) || []).map((c) => c.name), forIds: (byOrg.get(String(o._id)) || []).map((c) => c._id) })))
        .sort(order).slice(0, 200);
};

module.exports = { orgAdmin, forParent, parentsReached };
