/**
 * The Scouts & Guides units a teacher leads — mounted at /api/teacher/scout-units,
 * behind protectTeacher. The organization makes a teacher a unit's leader
 * (nccnss/units.js); the leader then runs the unit day to day here: approves
 * students asking to join it, schedules its events and marks who came.
 * Creating units, choosing leaders and moving members stay with the organization.
 *
 *   GET    /                                my units, with member counts and the next event, and the BSG notices
 *                                          (national, and my organization's state) for them
 *   GET    /:id                             one unit: its members (with progress) and requests, and its events
 *   PUT    /:id/members/:memberId           { status: 'active' | 'rejected' } for a student asking to join
 *   GET    /:id/members/:memberId           one member's profile: contact, progress, rank, awards, attendance and activities
 *   DELETE /:id/members/:memberId           take them out of the unit (closed as left, their record kept)
 *   GET    /:id/candidates?search=          my organization's students, marked when already in a Scouts unit
 *   POST   /:id/members                     add one of them { userId }: in at once, and told so
 *   POST   /:id/events                      schedule one { kind, title, date, hours, place }
 *   PUT    /:id/events/:eventId/attendance  { presentMemberIds: [] }
 *   DELETE /:id/events/:eventId
 *   POST   /:id/members/:memberId/awards   record a rank (a promotion), badge or training { type, name, date, examiner, certificateNo, note }
 *                                          (multipart, optional "certificate" image): on their record at once, and they are told
 *   PUT    /:id/awards/:awardId             { decision: 'approve' | 'reject', reason? } for one a student asked for, after checking
 *                                          their certificate: approved, a rank is their new rank
 *   DELETE /:id/awards/:awardId             withdraw a proposal of mine not decided yet
 *
 * A unit is mine only while I lead it, it is active, and I am still in its organization.
 */
const express = require('express');
const mongoose = require('mongoose');
const { ScoutUnit, ScoutAward, NccNssMember, NccNssEvent, NccNssActivity, SCOUT_SECTION_LABELS, CLOSED_STATUSES, eventKind } = require('./models');
const { summarise } = require('./progress');
const { awardFields, newAward, withRanks } = require('./awards');
const { RANKS } = require('./bsg');
const { noticesFor } = require('./notices');
const Organization = require('../organizations/models/Organization');
const User = require('../models/User');
const Notification = require('../career/models/Notification');
const { closeMemberships, lastClosed } = require('./membership');
const { upload } = require('../middleware/uploadMiddleware');
const { isRasterImage } = require('../organizations/controllers/orgAdminController');

const router = express.Router();
const validId = (id) => mongoose.isValidObjectId(id);
const toNumber = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
const fail = (res, error, what) => {
    console.error(`[nccnss] leader ${what} failed:`, error.message);
    res.status(500).json({ message: `Could not ${what}. Please try again.` });
};
const notFound = (res, what = 'unit') => res.status(404).json({ message: `No such ${what} in your units.` });

const mine = (req) => ({ leaderTeacherIds: req.teacher._id, organizationId: req.teacher.organizationId || null, status: 'active' });
const myUnit = (req) => (validId(req.params.id) && req.teacher.organizationId
    ? ScoutUnit.findOne({ _id: req.params.id, ...mine(req) }).lean()
    : null);
const inUnit = (unit) => ({ organizationId: unit.organizationId, scheme: 'SCOUTS', unitId: unit._id });
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// What a member of each section is called: "joined … as a Bulbul".
const ONE_OF = { cubs: 'Cub', bulbuls: 'Bulbul', scouts: 'Scout', guides: 'Guide', rovers: 'Rover', rangers: 'Ranger' };

/** Tell the student they are in, on the bell. Never blocks the change itself. */
const tellJoined = (req, unit, member) => Notification.create({
    userId: member.userId,
    type: 'system',
    title: `You joined ${unit.name}`,
    message: `${req.teacher.name || 'Your unit leader'} added you to ${unit.name} as a ${ONE_OF[unit.section] || 'member'} (Scouts & Guides). See its events and your progress on your Extra Curricular page.`,
    link: `/extracurricular/${member._id}`
}).catch((e) => console.error('[nccnss] leader notify failed:', e.message));

/** Tell the student a rank, badge or training is on their record — or why a request of theirs was not. */
const tellAward = (req, award, member, approved, reason = '') => Notification.create({
    userId: award.userId,
    type: 'system',
    title: !approved ? `${award.name} not approved` : award.type === 'rank' ? `Promoted to ${award.name}` : `${award.name} added to your record`,
    message: !approved
        ? `${req.teacher.name || 'Your unit leader'} could not approve your ${award.name} request${reason ? `: ${reason}` : '.'}`
        : award.type === 'rank'
            ? `Congratulations! ${req.teacher.name || 'Your unit leader'} verified it — your rank is now ${award.name}.`
            : `${req.teacher.name || 'Your unit leader'} added ${award.name} to your Scouts & Guides record.`,
    link: `/extracurricular/${member._id}`
}).catch((e) => console.error('[nccnss] leader notify failed:', e.message));

router.get('/', async (req, res) => {
    try {
        if (!req.teacher.organizationId) return res.json({ units: [], notices: [] });
        const units = await ScoutUnit.find(mine(req)).sort({ name: 1 }).lean();
        const ids = units.map((u) => u._id);
        const [counts, next] = await Promise.all([
            NccNssMember.aggregate([
                { $match: { unitId: { $in: ids }, scheme: 'SCOUTS', status: { $in: ['active', 'pending'] } } },
                { $group: { _id: { unitId: '$unitId', status: '$status' }, n: { $sum: 1 } } }
            ]),
            NccNssEvent.find({ unitId: { $in: ids }, date: { $gte: new Date() } }).sort({ date: 1 }).lean()
        ]);
        const count = (u, status) => counts.find((c) => String(c._id.unitId) === String(u._id) && c._id.status === status)?.n || 0;
        const org = units.length ? await Organization.findById(req.teacher.organizationId).select('state').lean() : null;
        res.json({
            notices: org ? await noticesFor(org.state) : [],
            units: units.map((u) => ({
                ...u,
                sectionLabel: SCOUT_SECTION_LABELS[u.section],
                members: count(u, 'active'),
                pending: count(u, 'pending'),
                nextEvent: next.find((e) => String(e.unitId) === String(u._id)) || null
            }))
        });
    } catch (error) { fail(res, error, 'load your units'); }
});

router.get('/:id', async (req, res) => {
    try {
        const unit = await myUnit(req);
        if (!unit) return notFound(res);
        const [members, events] = await Promise.all([
            NccNssMember.find({ ...inUnit(unit), status: { $in: ['active', 'pending'] } }).populate('userId', 'name cardNumber profilePicture').sort({ createdAt: 1 }).lean(),
            NccNssEvent.find(inUnit(unit)).sort({ date: -1 }).limit(200).lean()
        ]);
        const shown = await withRanks(members.filter((m) => m.userId), { full: true });
        const active = shown.filter((m) => m.status === 'active');
        const summaries = await summarise(active, unit.organizationId);
        res.json({
            unit: { ...unit, sectionLabel: SCOUT_SECTION_LABELS[unit.section] },
            ranks: RANKS[unit.section] || [],
            members: shown.map((m) => {
                const i = active.indexOf(m);
                return {
                    _id: m._id, status: m.status, year: m.year, enrolmentNo: m.enrolmentNo, note: m.note, student: m.userId, summary: i >= 0 ? summaries[i] : null,
                    rank: m.rank, awards: (m.awards || []).map((a) => ({ ...a, mine: String(a.proposedByTeacherId || '') === String(req.teacher._id) && a.status === 'pending' }))
                };
            }),
            events: events.map((e) => ({ ...e, presentCount: e.presentMemberIds.length }))
        });
    } catch (error) { fail(res, error, 'load the unit'); }
});

router.put('/:id/members/:memberId', async (req, res) => {
    try {
        const unit = await myUnit(req);
        if (!unit || !validId(req.params.memberId)) return notFound(res);
        const status = req.body?.status;
        if (!['active', 'rejected'].includes(status)) return res.status(400).json({ message: 'Approve or reject.' });
        // Only a request: removing or moving a member is the organization's.
        const member = await NccNssMember.findOneAndUpdate({ _id: req.params.memberId, ...inUnit(unit), status: 'pending' }, { $set: { status } }, { new: true });
        if (!member) return notFound(res, 'request');
        if (status === 'active') tellJoined(req, unit, member);
        res.json({ message: status === 'active' ? 'Approved — they are in the unit.' : 'Rejected.' });
    } catch (error) { fail(res, error, 'save the decision'); }
});

router.get('/:id/members/:memberId', async (req, res) => {
    try {
        const unit = await myUnit(req);
        if (!unit || !validId(req.params.memberId)) return notFound(res);
        const member = await NccNssMember.findOne({ _id: req.params.memberId, ...inUnit(unit), status: { $in: ['active', 'pending'] } })
            .populate('userId', 'name email phone cardNumber profilePicture className createdAt').lean();
        if (!member?.userId) return notFound(res, 'member');
        const [[ranked], events, activities] = await Promise.all([
            withRanks([member], { full: true }),
            NccNssEvent.find({ ...inUnit(unit), attendanceTaken: true, date: { $gte: member.createdAt } }).sort({ date: -1 }).limit(50).lean(),
            NccNssActivity.find({ memberId: member._id }).sort({ date: -1 }).limit(50).lean()
        ]);
        const [summary] = member.status === 'active' ? await summarise([member], unit.organizationId) : [null];
        res.json({
            member: {
                _id: member._id, status: member.status, year: member.year, enrolmentNo: member.enrolmentNo, joinedAt: member.createdAt,
                section: member.section || unit.section, sectionLabel: SCOUT_SECTION_LABELS[member.section || unit.section],
                student: member.userId, rank: ranked.rank, awards: ranked.awards || [], summary
            },
            ranks: RANKS[member.section || unit.section] || [],
            attendance: events.map((e) => ({ _id: e._id, title: e.title, kind: e.kind, date: e.date, present: e.presentMemberIds.some((x) => String(x) === String(member._id)) })),
            activities: activities.map((a) => ({ _id: a._id, title: a.title, kind: a.kind, date: a.date, hours: a.hours, status: a.status, proofUrl: a.proofUrl }))
        });
    } catch (error) { fail(res, error, 'load the member'); }
});

router.delete('/:id/members/:memberId', async (req, res) => {
    try {
        const unit = await myUnit(req);
        if (!unit || !validId(req.params.memberId)) return notFound(res);
        const member = await NccNssMember.findOneAndUpdate(
            { _id: req.params.memberId, ...inUnit(unit), status: 'active' },
            { $set: { status: 'left', endedAt: new Date(), endReason: `Removed from ${unit.name} by the unit leader` } },
            { new: true }
        ).populate('userId', 'name');
        if (!member) return notFound(res, 'member');
        Notification.create({
            userId: member.userId._id, type: 'system', title: `You left ${unit.name}`,
            message: `${req.teacher.name || 'Your unit leader'} took you out of ${unit.name}. Your ranks, badges and record are kept.`,
            link: '/extracurricular'
        }).catch(() => {});
        res.json({ message: `${member.userId.name} removed from ${unit.name} — their record is kept.` });
    } catch (error) { fail(res, error, 'remove the member'); }
});

router.get('/:id/candidates', async (req, res) => {
    try {
        const unit = await myUnit(req);
        if (!unit) return notFound(res);
        const filter = { organizationId: unit.organizationId };
        const search = String(req.query.search || '').trim().slice(0, 100);
        if (search) filter.$or = ['name', 'email', 'cardNumber'].map((k) => ({ [k]: new RegExp(escapeRegExp(search), 'i') }));
        const students = await User.find(filter).select('name email cardNumber').sort({ name: 1 }).limit(500).lean();
        // One Scouts unit at a time: show where each already is.
        const live = await NccNssMember.find({ userId: { $in: students.map((s) => s._id) }, organizationId: unit.organizationId, scheme: 'SCOUTS', status: { $in: ['active', 'pending'] } })
            .select('userId unit unitId status').lean();
        res.json({
            students: students.map((s) => {
                const m = live.find((x) => String(x.userId) === String(s._id));
                return { ...s, inUnit: m ? (String(m.unitId) === String(unit._id) ? 'this' : m.unit || 'another unit') : null, pending: m?.status === 'pending' };
            })
        });
    } catch (error) { fail(res, error, 'search your students'); }
});

router.post('/:id/members', async (req, res) => {
    try {
        const unit = await myUnit(req);
        if (!unit) return notFound(res);
        const { userId } = req.body || {};
        if (!validId(userId)) return res.status(400).json({ message: 'Choose a student.' });
        const student = await User.findOne({ _id: userId, organizationId: unit.organizationId }).select('_id name').lean();
        if (!student) return res.status(404).json({ message: 'That student is not in your organization.' });
        await closeMemberships({ userId, notIn: unit.organizationId, reason: 'No longer in that organization' });
        const rows = await NccNssMember.find({ userId, scheme: 'SCOUTS', clubId: null, organizationId: unit.organizationId, status: { $in: ['active', 'pending', 'completed', 'rejected'] } }).sort({ createdAt: -1 });
        const open = rows.find((r) => r.status !== 'rejected');
        // Their own request to this unit: adding them is approving it.
        if (open && open.status === 'pending' && String(open.unitId) === String(unit._id)) {
            open.status = 'active';
            await open.save();
            tellJoined(req, unit, open);
            return res.json({ message: `${student.name} is in ${unit.name} — they have been told.` });
        }
        if (open) return res.status(409).json({ message: String(open.unitId) === String(unit._id) ? `${student.name} is already in this unit.` : `${student.name} is already in ${open.unit || 'another Scouts unit'}. Ask your organization to transfer them.` });
        const fields = {
            organizationId: unit.organizationId, unit: unit.name, unitId: unit._id, section: unit.section,
            status: 'active', addedBy: 'organization', endedAt: null, endReason: '', note: ''
        };
        const member = rows[0]
            ? await Object.assign(rows[0], fields).save()
            : await NccNssMember.create({ ...fields, userId, scheme: 'SCOUTS', clubId: null, transferredFrom: (await lastClosed(userId, 'SCOUTS', null))?._id || null });
        tellJoined(req, unit, member);
        res.status(201).json({ message: `${student.name} added to ${unit.name} as a ${ONE_OF[unit.section] || 'member'} — they have been told.` });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ message: 'That student is already in a Scouts unit.' });
        fail(res, error, 'add the student');
    }
});

router.post('/:id/events', async (req, res) => {
    try {
        const unit = await myUnit(req);
        if (!unit) return notFound(res);
        const b = req.body || {};
        if (!String(b.title || '').trim()) return res.status(400).json({ message: 'Give the event a title.' });
        if (!b.date || Number.isNaN(new Date(b.date).getTime())) return res.status(400).json({ message: 'Choose a date.' });
        const event = await NccNssEvent.create({
            ...inUnit(unit), unit: unit.name,
            kind: eventKind(b.kind, 'meeting'),
            title: String(b.title).trim().slice(0, 120),
            date: new Date(b.date),
            hours: Math.min(240, Math.max(0, toNumber(b.hours))),
            place: String(b.place || '').trim().slice(0, 120)
        });
        res.status(201).json({ message: 'Event added — the unit\'s members see it on their calendar.', event });
    } catch (error) { fail(res, error, 'add the event'); }
});

router.put('/:id/events/:eventId/attendance', async (req, res) => {
    try {
        const unit = await myUnit(req);
        if (!unit || !validId(req.params.eventId)) return notFound(res);
        const event = await NccNssEvent.findOne({ _id: req.params.eventId, ...inUnit(unit) });
        if (!event) return notFound(res, 'event');
        const asked = (Array.isArray(req.body?.presentMemberIds) ? req.body.presentMemberIds : []).filter(validId);
        const valid = await NccNssMember.find({ _id: { $in: asked }, ...inUnit(unit), status: 'active' }).distinct('_id');
        // Anyone marked before who has since left or moved keeps their mark: it is their history.
        const kept = await NccNssMember.find({ _id: { $in: event.presentMemberIds }, status: { $in: CLOSED_STATUSES } }).distinct('_id');
        event.presentMemberIds = [...valid, ...kept];
        event.attendanceTaken = true;
        await event.save();
        res.json({ message: `Attendance saved — ${valid.length} present.` });
    } catch (error) { fail(res, error, 'save the attendance'); }
});

router.delete('/:id/events/:eventId', async (req, res) => {
    try {
        const unit = await myUnit(req);
        if (!unit || !validId(req.params.eventId)) return notFound(res);
        const gone = await NccNssEvent.findOneAndDelete({ _id: req.params.eventId, ...inUnit(unit) });
        if (!gone) return notFound(res, 'event');
        res.json({ message: 'Event deleted.' });
    } catch (error) { fail(res, error, 'delete the event'); }
});

router.post('/:id/members/:memberId/awards', upload.single('certificate'), async (req, res) => {
    try {
        const unit = await myUnit(req);
        if (!unit || !validId(req.params.memberId)) return notFound(res);
        const member = await NccNssMember.findOne({ _id: req.params.memberId, ...inUnit(unit), status: 'active' }).lean();
        if (!member) return notFound(res, 'member');
        const { fields, error } = awardFields(req.body, member.section || unit.section);
        if (error) return res.status(400).json({ message: error });
        if (req.file) {
            if (!isRasterImage(req.file.buffer)) return res.status(400).json({ message: 'Upload the certificate as a PNG, JPEG or WebP image.' });
            const { uploadToBunny } = require('../utils/bunnyStorage');
            fields.certificateUrl = await uploadToBunny(req.file.buffer, 'certificate', 'nccnss-proofs');
        }
        // The leader tested them: it counts now.
        const award = await newAward({ ...member, section: member.section || unit.section }, fields, {
            status: 'approved', proposedByTeacherId: req.teacher._id, decidedByTeacherId: req.teacher._id, decidedAt: new Date()
        });
        tellAward(req, award, member, true);
        res.status(201).json({ message: fields.type === 'rank' ? `Promoted to ${fields.name} — they have been told.` : `${fields.name} recorded — they have been told.`, award });
    } catch (error) { fail(res, error, 'record it'); }
});

router.put('/:id/awards/:awardId', async (req, res) => {
    try {
        const unit = await myUnit(req);
        if (!unit || !validId(req.params.awardId)) return notFound(res);
        const { decision, reason = '' } = req.body || {};
        if (!['approve', 'reject'].includes(decision)) return res.status(400).json({ message: 'Approve or reject.' });
        const award = await ScoutAward.findOne({ _id: req.params.awardId, status: 'pending' });
        if (!award) return notFound(res, 'request');
        // Theirs to decide while the student is in this unit.
        const member = await NccNssMember.findOne({ userId: award.userId, ...inUnit(unit), status: 'active' }).lean();
        if (!member) return notFound(res, 'request');
        award.status = decision === 'approve' ? 'approved' : 'rejected';
        award.reason = decision === 'reject' ? String(reason).trim().slice(0, 300) : '';
        award.decidedByTeacherId = req.teacher._id;
        award.decidedAt = new Date();
        await award.save();
        tellAward(req, award, member, decision === 'approve', award.reason);
        res.json({ message: decision === 'approve' ? (award.type === 'rank' ? `Approved — their rank is now ${award.name}.` : 'Approved — on their record.') : 'Rejected — they have been told.' });
    } catch (error) { fail(res, error, 'save the decision'); }
});

router.delete('/:id/awards/:awardId', async (req, res) => {
    try {
        const unit = await myUnit(req);
        if (!unit || !validId(req.params.awardId)) return notFound(res);
        const gone = await ScoutAward.findOneAndDelete({ _id: req.params.awardId, unitId: unit._id, proposedByTeacherId: req.teacher._id, status: 'pending' });
        if (!gone) return notFound(res, 'proposal');
        res.json({ message: 'Withdrawn.' });
    } catch (error) { fail(res, error, 'withdraw it'); }
});

module.exports = router;
