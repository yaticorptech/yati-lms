/**
 * Bharat Scouts & Guides notices — mounted at /api/organizations/me/bsg,
 * behind protectOrgAdmin and requireActiveOrganization.
 *
 *   A BSG office (Organization.bsgOffice 'national' or 'state'):
 *     GET    /overview         my Scouts & Guides: through institutions and direct, by section;
 *                              institutions and units; my upcoming notices
 *     GET    /notices          what I have published, newest first
 *     POST   /notices          publish one { kind, title, date, endDate, place, sections[], minRank, rules[], details }
 *     PUT    /notices/:id      edit it
 *     DELETE /notices/:id
 *     GET    /notices/:id/attendance?search=   who came, and Scouts & Guides I reach to mark
 *     PUT    /notices/:id/attendance           { presentMemberIds: [] }
 *
 *   Who an office reaches: the national office, every institution's Scouts &
 *   Guides and its own direct members (those with no institution, who join it);
 *   a state office, the institutions whose state is its own.
 *   Any organization:
 *     GET    /feed             the notices for my Scouts and Guides: the national
 *                              office's, and my state office's (Organization.state)
 *
 * Scouts and Guides only see notices (no registration): their unit's leader in
 * the teacher dashboard (nccnss/leader.js) and the student on their Scouts &
 * Guides page (nccnss/student.js) read the same feed through noticesFor().
 */
const express = require('express');
const mongoose = require('mongoose');
const { BsgNotice, NccNssMember, ScoutUnit, SCOUT_SECTIONS, SCOUT_SECTION_LABELS } = require('./models');
const { NOTICE_KINDS, INDIA_STATES } = require('./bsg');
const Organization = require('../organizations/models/Organization');

const router = express.Router();
const fail = (res, error, what) => {
    console.error(`[nccnss] notices ${what} failed:`, error.message);
    res.status(500).json({ message: `Could not ${what}. Please try again.` });
};
const notFound = (res) => res.status(404).json({ message: 'No such notice of yours.' });
// A notice stays in the feed for a month after it ends, then drops out.
const KEEP_MS = 30 * 86400000;

/**
 * The notices Scouts and Guides of an institution in `state` see: national,
 * and their state's — rules and regulations always, the rest until a month
 * after they end. With `memberIds` (a student's), each says whether they were
 * marked present; the attendance list itself never leaves the office.
 */
const noticesFor = (state, memberIds = []) => BsgNotice.find({
    $and: [
        { $or: [{ level: 'national' }, ...(state ? [{ level: 'state', state }] : [])] },
        { $or: [{ kind: 'rules' }, { $expr: { $gte: [{ $ifNull: ['$endDate', '$date'] }, new Date(Date.now() - KEEP_MS)] } }] }
    ]
}).sort({ date: 1 }).limit(100).lean()
    .then((rows) => rows.map(({ presentMemberIds = [], ...n }) => ({
        ...n,
        from: n.level === 'national' ? 'BSG National' : `BSG ${n.state}`,
        attended: n.attendanceTaken ? presentMemberIds.some((id) => memberIds.some((m) => String(m) === String(id))) : null
    })));

/** The organizations an office reaches (see the header). */
const reachOf = async (office) => {
    const institutions = office.bsgOffice === 'national'
        ? await Organization.find({ bsgOffice: { $in: ['', null] } }).distinct('_id')
        : await Organization.find({ bsgOffice: { $in: ['', null] }, state: office.state }).distinct('_id');
    return { institutions, all: office.bsgOffice === 'national' ? [...institutions, office._id] : institutions };
};

/** The notice a request describes, checked: { fields } or { error }. */
const noticeFields = (b = {}) => {
    const title = String(b.title || '').trim().slice(0, 140);
    if (!title) return { error: 'Give it a title.' };
    const kind = NOTICE_KINDS.includes(b.kind) ? b.kind : 'notice';
    // Rules and regulations have no date of their own: they stand from when they are published.
    const date = b.date ? new Date(b.date) : kind === 'rules' ? new Date() : null;
    if (!date || Number.isNaN(date.getTime())) return { error: 'Choose the date.' };
    const endDate = b.endDate ? new Date(b.endDate) : null;
    if (endDate && (Number.isNaN(endDate.getTime()) || endDate < date)) return { error: 'The end date must be on or after the start.' };
    const rules = (Array.isArray(b.rules) ? b.rules : String(b.rules || '').split('\n'))
        .map((r) => String(r).trim().slice(0, 200)).filter(Boolean).slice(0, 30);
    return {
        fields: {
            kind,
            title, date, endDate,
            place: String(b.place || '').trim().slice(0, 160),
            sections: (Array.isArray(b.sections) ? b.sections : []).filter((s) => SCOUT_SECTIONS.includes(s)),
            minRank: String(b.minRank || '').trim().slice(0, 60),
            rules,
            details: String(b.details || '').trim().slice(0, 2000)
        }
    };
};

/** Only a BSG office publishes. */
const officeOnly = (req, res, next) => (req.organization.bsgOffice
    ? next()
    : res.status(403).json({ message: 'Only a Bharat Scouts & Guides office publishes notices.' }));
const mine = (req) => ({ officeId: req.organization._id });

router.get('/feed', async (req, res) => {
    try { res.json({ notices: await noticesFor(req.organization.state) }); } catch (error) { fail(res, error, 'load the notices'); }
});

router.get('/overview', officeOnly, async (req, res) => {
    try {
        const office = req.organization;
        const { institutions } = await reachOf(office);
        const live = { scheme: 'SCOUTS', status: 'active' };
        const bySection = (orgIds) => NccNssMember.aggregate([
            { $match: { ...live, organizationId: { $in: orgIds } } },
            { $group: { _id: '$section', n: { $sum: 1 } } }
        ]);
        const [through, direct, withScouts, units, upcoming] = await Promise.all([
            bySection(institutions),
            office.bsgOffice === 'national' ? bySection([office._id]) : [],
            NccNssMember.distinct('organizationId', { ...live, organizationId: { $in: institutions } }),
            ScoutUnit.countDocuments({ organizationId: { $in: institutions }, status: 'active' }),
            BsgNotice.find({ officeId: office._id, kind: { $ne: 'rules' }, date: { $gte: new Date(Date.now() - 86400000) } }).sort({ date: 1 }).limit(5).lean()
        ]);
        const count = (rows, section) => rows.find((r) => (r._id || '') === section)?.n || 0;
        const total = (rows) => rows.reduce((n, r) => n + r.n, 0);
        res.json({
            office: { level: office.bsgOffice, state: office.state },
            totals: {
                throughInstitutions: total(through),
                direct: total(direct),
                institutions: withScouts.length,
                units
            },
            sections: [...SCOUT_SECTIONS, ''].map((s) => ({
                section: s, label: SCOUT_SECTION_LABELS[s] || 'No section yet',
                throughInstitutions: count(through, s), direct: count(direct, s)
            })).filter((r) => r.section || r.throughInstitutions || r.direct),
            upcoming: upcoming.map(({ presentMemberIds, ...n }) => n)
        });
    } catch (error) { fail(res, error, 'load the overview'); }
});

router.get('/notices/:id/attendance', officeOnly, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
        const notice = await BsgNotice.findOne({ _id: req.params.id, ...mine(req) }).lean();
        if (!notice) return notFound(res);
        const { all } = await reachOf(req.organization);
        const search = String(req.query.search || '').trim().slice(0, 80);
        // Who is marked, always; and up to 100 more of those I reach, by name or card when searched.
        const people = (ids) => NccNssMember.find({ _id: { $in: ids } }).populate('userId', 'name cardNumber').populate('organizationId', 'name').lean();
        let found = [];
        if (search) {
            const User = require('../models/User');
            const pattern = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            const users = await User.find({ $or: [{ name: pattern }, { cardNumber: pattern }] }).select('_id').limit(500).lean();
            found = await NccNssMember.find({ scheme: 'SCOUTS', status: 'active', organizationId: { $in: all }, userId: { $in: users.map((u) => u._id) } })
                .populate('userId', 'name cardNumber').populate('organizationId', 'name').limit(100).lean();
        }
        const marked = await people(notice.presentMemberIds || []);
        const row = (m) => ({ _id: m._id, name: m.userId?.name || '—', card: m.userId?.cardNumber || '', unit: m.unit, section: m.section, institution: m.organizationId?.name || '' });
        res.json({ present: marked.map(row), found: found.filter((m) => !marked.some((x) => String(x._id) === String(m._id))).map(row) });
    } catch (error) { fail(res, error, 'load the attendance'); }
});

router.put('/notices/:id/attendance', officeOnly, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
        const notice = await BsgNotice.findOne({ _id: req.params.id, ...mine(req) });
        if (!notice) return notFound(res);
        if (notice.kind === 'rules') return res.status(400).json({ message: 'Rules and regulations have no attendance.' });
        const asked = (Array.isArray(req.body?.presentMemberIds) ? req.body.presentMemberIds : []).filter((id) => mongoose.isValidObjectId(id));
        const { all } = await reachOf(req.organization);
        // Only Scouts & Guides I reach; anyone marked before who has since left or moved keeps their mark.
        const valid = await NccNssMember.find({ _id: { $in: asked }, scheme: 'SCOUTS', organizationId: { $in: all } }).distinct('_id');
        notice.presentMemberIds = valid;
        notice.attendanceTaken = true;
        await notice.save();
        res.json({ message: `Attendance saved — ${valid.length} present.` });
    } catch (error) { fail(res, error, 'save the attendance'); }
});

router.get('/notices', officeOnly, async (req, res) => {
    try {
        const notices = await BsgNotice.find(mine(req)).sort({ date: -1 }).limit(300).lean();
        res.json({ notices: notices.map(({ presentMemberIds = [], ...n }) => ({ ...n, presentCount: presentMemberIds.length })), office: { level: req.organization.bsgOffice, state: req.organization.state } });
    } catch (error) { fail(res, error, 'load your notices'); }
});

router.post('/notices', officeOnly, async (req, res) => {
    try {
        const { fields, error } = noticeFields(req.body);
        if (error) return res.status(400).json({ message: error });
        const notice = await BsgNotice.create({
            ...fields, ...mine(req), level: req.organization.bsgOffice,
            state: req.organization.bsgOffice === 'state' ? req.organization.state : '', createdBy: req.admin._id
        });
        res.status(201).json({ message: `Published. ${req.organization.bsgOffice === 'national' ? 'Every' : `${req.organization.state}'s`} Scouts and Guides see it now.`, notice });
    } catch (error) { fail(res, error, 'publish it'); }
});

router.put('/notices/:id', officeOnly, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
        const { fields, error } = noticeFields(req.body);
        if (error) return res.status(400).json({ message: error });
        const notice = await BsgNotice.findOneAndUpdate({ _id: req.params.id, ...mine(req) }, { $set: fields }, { new: true });
        if (!notice) return notFound(res);
        res.json({ message: 'Saved.', notice });
    } catch (error) { fail(res, error, 'save it'); }
});

router.delete('/notices/:id', officeOnly, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
        const gone = await BsgNotice.findOneAndDelete({ _id: req.params.id, ...mine(req) });
        if (!gone) return notFound(res);
        res.json({ message: `${gone.title} removed.` });
    } catch (error) { fail(res, error, 'remove it'); }
});

module.exports = router;
module.exports.noticesFor = noticesFor;
module.exports.INDIA_STATES = INDIA_STATES;
