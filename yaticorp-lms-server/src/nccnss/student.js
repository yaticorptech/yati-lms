/**
 * A student's own extra-curricular record (NCC, NSS, Scouts & Guides, and the
 * organization's clubs) — mounted at /api/organizations/student/nccnss, behind protectUser.
 *
 *   GET    /                  my memberships, progress, activities and upcoming events, and the clubs and Scouts units I can join
 *   POST   /join              ask to join { scheme, clubId?, unitId? (Scouts), unit, enrolmentNo, year, certStage, note } — the organization approves
 *   POST   /activities        log an activity { memberId, … } (multipart, optional "proof" photo) — the organization approves
 *   DELETE /activities/:id    withdraw one that has not been decided yet
 *   GET    /calendar?from=&to=&memberId=  the events of everything I am an active member of (or of one), between two dates
 *   POST   /calendar           a club president adds an event { memberId, kind, title, date, hours, place }
 *   DELETE /calendar/:id       …and takes back one they added
 *
 * Only a member of an organization can join: the units and clubs belong to it.
 */
const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Organization = require('../organizations/models/Organization');
const { upload } = require('../middleware/uploadMiddleware');
const { isRasterImage, rasterExtension } = require('../organizations/controllers/orgAdminController');
const { NccNssClub, NccNssMember, NccNssActivity, NccNssEvent, ScoutUnit, SCHEMES, ACTIVITY_KINDS, EVENT_KINDS, SCOUT_SECTION_LABELS, schemeName, eventKind, scoutUnitFor } = require('./models');
const { targetsFor, summarise } = require('./progress');

const router = express.Router();
const fail = (res, error, what) => {
    console.error(`[nccnss] student ${what} failed:`, error.message);
    res.status(500).json({ message: `Could not ${what}. Please try again.` });
};

/** The student's organization, if they belong to an active one. */
const myOrganization = async (userId) => {
    const user = await User.findById(userId).select('organizationId').lean();
    if (!user?.organizationId) return null;
    return Organization.findOne({ _id: user.organizationId, status: 'active' }).select('name logo').lean();
};

router.get('/', async (req, res) => {
    try {
        const organization = await myOrganization(req.user._id);
        if (!organization) return res.json({ organization: null, memberships: [], clubs: [], scoutUnits: [] });
        const [members, clubs, units] = await Promise.all([
            NccNssMember.find({ userId: req.user._id, organizationId: organization._id }).populate('clubId', 'name category description').sort({ createdAt: 1 }).lean(),
            NccNssClub.find({ organizationId: organization._id }).select('name category description').sort({ name: 1 }).lean(),
            ScoutUnit.find({ organizationId: organization._id, status: 'active' }).select('name section').sort({ name: 1 }).lean()
        ]);
        const scoutUnits = units.map((u) => ({ ...u, sectionLabel: SCOUT_SECTION_LABELS[u.section] }));
        const targets = await targetsFor(organization._id);
        const active = members.filter((m) => m.status === 'active' || m.status === 'completed');
        const summaries = await summarise(active, organization._id, targets);

        const memberships = await Promise.all(members.map(async (m) => {
            const i = active.findIndex((a) => String(a._id) === String(m._id));
            const mine = { organizationId: organization._id, scheme: m.scheme, clubId: m.clubId?._id || null, unit: { $in: ['', m.unit] } };
            const [activities, upcoming, past] = await Promise.all([
                NccNssActivity.find({ memberId: m._id }).sort({ date: -1 }).limit(100).lean(),
                NccNssEvent.find({ ...mine, date: { $gte: new Date() } }).sort({ date: 1 }).limit(10).lean(),
                NccNssEvent.find({ ...mine, attendanceTaken: true }).sort({ date: -1 }).limit(30).lean()
            ]);
            return {
                ...m,
                name: schemeName(m),
                summary: i >= 0 ? summaries[i] : null,
                activities,
                upcoming: upcoming.map(({ presentMemberIds, ...e }) => e),
                attendance: past.map((e) => ({
                    _id: e._id, title: e.title, kind: e.kind, date: e.date, hours: e.hours,
                    present: e.presentMemberIds.some((id) => String(id) === String(m._id))
                }))
            };
        }));
        res.json({ organization, memberships, clubs, scoutUnits, targets });
    } catch (error) { fail(res, error, 'load your record'); }
});

router.get('/calendar', async (req, res) => {
    try {
        const organization = await myOrganization(req.user._id);
        if (!organization) return res.json({ events: [] });
        const from = new Date(req.query.from || Date.now());
        const to = new Date(req.query.to || Date.now() + 31 * 86400000);
        if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to - from > 100 * 86400000) {
            return res.status(400).json({ message: 'Choose a range of at most three months.' });
        }
        const members = await NccNssMember.find({
            userId: req.user._id, organizationId: organization._id, status: 'active',
            ...(mongoose.isValidObjectId(req.query.memberId) ? { _id: req.query.memberId } : {})
        }).populate('clubId', 'name').lean();
        if (!members.length) return res.json({ events: [] });
        // An event is mine when it is for my scheme (my club, for a club) and my unit or every unit.
        const events = await NccNssEvent.find({
            organizationId: organization._id, date: { $gte: from, $lte: to },
            $or: members.map((m) => ({ scheme: m.scheme, clubId: m.clubId?._id || null, unit: { $in: ['', m.unit] } }))
        }).populate('clubId', 'name').sort({ date: 1 }).limit(300).lean();
        res.json({
            events: events.map((e) => {
                const m = members.find((x) => x.scheme === e.scheme && String(x.clubId?._id || '') === String(e.clubId?._id || ''));
                return {
                    _id: e._id, title: e.title, kind: e.kind, date: e.date, hours: e.hours, place: e.place,
                    scheme: e.scheme, name: schemeName(e), memberId: m?._id || null,
                    mine: String(e.addedByUserId || '') === String(req.user._id),
                    present: e.attendanceTaken ? e.presentMemberIds.some((id) => String(id) === String(m?._id)) : null
                };
            })
        });
    } catch (error) { fail(res, error, 'load your calendar'); }
});

// Only a club's president adds events from the student side.
const presidentOf = (req, memberId) => (mongoose.isValidObjectId(memberId)
    ? NccNssMember.findOne({ _id: memberId, userId: req.user._id, scheme: 'CLUB', role: 'president', status: 'active' }).lean()
    : null);

router.post('/calendar', async (req, res) => {
    try {
        const b = req.body || {};
        const member = await presidentOf(req, b.memberId);
        if (!member) return res.status(403).json({ message: 'Only the club\'s president can add events.' });
        if (!String(b.title || '').trim()) return res.status(400).json({ message: 'Give the event a title.' });
        if (!b.date || Number.isNaN(new Date(b.date).getTime())) return res.status(400).json({ message: 'Choose a date.' });
        await NccNssEvent.create({
            organizationId: member.organizationId, scheme: 'CLUB', clubId: member.clubId,
            kind: eventKind(b.kind, 'meeting'),
            title: String(b.title).trim().slice(0, 120),
            date: new Date(b.date),
            hours: Math.min(240, Math.max(0, Number(b.hours) || 0)),
            place: String(b.place || '').trim().slice(0, 120),
            addedByUserId: req.user._id
        });
        res.status(201).json({ message: 'Event added — every member sees it on the club calendar.' });
    } catch (error) { fail(res, error, 'add the event'); }
});

router.delete('/calendar/:id', async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'No such event.' });
        const gone = await NccNssEvent.findOneAndDelete({ _id: req.params.id, addedByUserId: req.user._id, attendanceTaken: false });
        if (!gone) return res.status(404).json({ message: 'Only an event you added, before attendance is taken, can be deleted.' });
        res.json({ message: 'Event deleted.' });
    } catch (error) { fail(res, error, 'delete the event'); }
});

router.post('/join', async (req, res) => {
    try {
        const organization = await myOrganization(req.user._id);
        if (!organization) return res.status(409).json({ message: 'Join your school or college on the platform first (My Profile → Organization).' });
        const b = req.body || {};
        if (!SCHEMES.includes(b.scheme)) return res.status(400).json({ message: 'Choose what to join.' });
        let club = null;
        if (b.scheme === 'CLUB') {
            club = mongoose.isValidObjectId(b.clubId) ? await NccNssClub.findOne({ _id: b.clubId, organizationId: organization._id }).lean() : null;
            if (!club) return res.status(400).json({ message: 'Choose one of your organization\'s clubs.' });
        }
        const { unit, error: unitError } = await scoutUnitFor(organization._id, b.scheme, b.unitId);
        if (unitError) return res.status(400).json({ message: unitError });
        const name = club ? club.name : schemeName({ scheme: b.scheme });
        const existing = await NccNssMember.findOne({ userId: req.user._id, scheme: b.scheme, clubId: club?._id || null });
        if (existing && existing.status !== 'rejected') {
            return res.status(409).json({ message: existing.status === 'pending' ? 'Your request is waiting for your organization.' : `You are already in ${name}.` });
        }
        const fields = {
            organizationId: organization._id,
            unit: unit ? unit.name : String(b.unit || '').trim().slice(0, 80),
            unitId: unit?._id || null,
            section: unit?.section || '',
            enrolmentNo: String(b.enrolmentNo || '').trim().slice(0, 40),
            year: Math.min(3, Math.max(1, Number(b.year) || 1)),
            certStage: b.scheme === 'NCC' && ['A', 'B', 'C'].includes(b.certStage) ? b.certStage : '',
            status: 'pending',
            addedBy: 'student',
            note: String(b.note || '').trim().slice(0, 300)
        };
        const member = existing
            ? await Object.assign(existing, fields).save()
            : await NccNssMember.create({ ...fields, userId: req.user._id, scheme: b.scheme, clubId: club?._id || null });
        res.status(201).json({ message: `Request sent — ${organization.name} will confirm your ${name} membership.`, memberId: member._id });
    } catch (error) { fail(res, error, 'send your request'); }
});

router.post('/activities', upload.single('proof'), async (req, res) => {
    try {
        const b = req.body || {};
        // By membership (one per club), or by scheme as the NCC/NSS page used to send it.
        const which = mongoose.isValidObjectId(b.memberId) ? { _id: b.memberId } : SCHEMES.includes(b.scheme) && b.scheme !== 'CLUB' ? { scheme: b.scheme } : null;
        if (!which) return res.status(400).json({ message: 'Choose what the activity was for.' });
        const member = await NccNssMember.findOne({ ...which, userId: req.user._id, status: 'active' }).populate('clubId', 'name').lean();
        if (!member) return res.status(403).json({ message: 'You are not an active member there yet.' });
        if (!String(b.title || '').trim()) return res.status(400).json({ message: 'Say what the activity was.' });
        const date = b.date ? new Date(b.date) : new Date();
        if (Number.isNaN(date.getTime()) || date > new Date(Date.now() + 86400000)) {
            return res.status(400).json({ message: 'Choose the date it happened.' });
        }

        let proofUrl = '';
        if (req.file) {
            if (!isRasterImage(req.file.buffer)) return res.status(400).json({ message: 'Upload the photo as a PNG, JPEG or WebP image.' });
            const { uploadToBunny } = require('../utils/bunnyStorage');
            proofUrl = await uploadToBunny(req.file.buffer, `proof${rasterExtension(req.file.buffer)}`, 'nccnss-proofs');
        }

        await NccNssActivity.create({
            organizationId: member.organizationId, memberId: member._id, userId: req.user._id, scheme: member.scheme,
            kind: ACTIVITY_KINDS.includes(b.kind) ? b.kind : 'other',
            title: String(b.title).trim().slice(0, 120),
            date,
            hours: Math.min(240, Math.max(0, Number(b.hours) || 0)),
            place: String(b.place || '').trim().slice(0, 120),
            proofUrl,
            source: 'student'
        });
        res.status(201).json({ message: 'Logged — your officer will approve it, then the hours count.' });
    } catch (error) { fail(res, error, 'log the activity'); }
});

router.delete('/activities/:id', async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'No such activity.' });
        const gone = await NccNssActivity.findOneAndDelete({ _id: req.params.id, userId: req.user._id, status: 'pending' });
        if (!gone) return res.status(404).json({ message: 'Only an activity still waiting for approval can be withdrawn.' });
        res.json({ message: 'Withdrawn.' });
    } catch (error) { fail(res, error, 'withdraw the activity'); }
});

module.exports = router;
