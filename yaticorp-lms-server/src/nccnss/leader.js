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
 *   POST   /:id/events                      schedule one { kind, title, date, hours, place }
 *   PUT    /:id/events/:eventId/attendance  { presentMemberIds: [] }
 *   DELETE /:id/events/:eventId
 *   POST   /:id/members/:memberId/awards   propose a rank, badge or training { type, name, date, examiner, certificateNo, note }:
 *                                          the organization approves it before it is on their record
 *   DELETE /:id/awards/:awardId             withdraw a proposal of mine not decided yet
 *
 * A unit is mine only while I lead it, it is active, and I am still in its organization.
 */
const express = require('express');
const mongoose = require('mongoose');
const { ScoutUnit, ScoutAward, NccNssMember, NccNssEvent, SCOUT_SECTION_LABELS, CLOSED_STATUSES, eventKind } = require('./models');
const { summarise } = require('./progress');
const { awardFields, newAward, withRanks } = require('./awards');
const { RANKS } = require('./bsg');
const { noticesFor } = require('./notices');
const Organization = require('../organizations/models/Organization');

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
        res.json({ message: status === 'active' ? 'Approved — they are in the unit.' : 'Rejected.' });
    } catch (error) { fail(res, error, 'save the decision'); }
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

router.post('/:id/members/:memberId/awards', async (req, res) => {
    try {
        const unit = await myUnit(req);
        if (!unit || !validId(req.params.memberId)) return notFound(res);
        const member = await NccNssMember.findOne({ _id: req.params.memberId, ...inUnit(unit), status: 'active' }).lean();
        if (!member) return notFound(res, 'member');
        const { fields, error } = awardFields(req.body, member.section || unit.section);
        if (error) return res.status(400).json({ message: error });
        const award = await newAward({ ...member, section: member.section || unit.section }, fields, { status: 'pending', proposedByTeacherId: req.teacher._id });
        res.status(201).json({ message: `${fields.name} sent to your organization to approve.`, award });
    } catch (error) { fail(res, error, 'record it'); }
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
