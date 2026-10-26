/**
 * The clubs a teacher is in charge of — mounted at /api/teacher/clubs, behind
 * protectTeacher. The organization puts a teacher in charge of a club; the
 * teacher schedules its events here, and marks who came. Members, roles and
 * approvals stay with the organization.
 *
 *   GET    /                               my clubs, with member counts and the next event
 *   GET    /:id                            one club: its members (and their posts) and its events
 *   POST   /:id/events                     schedule one { kind, title, date, hours, place }
 *   PUT    /:id/events/:eventId/attendance { presentMemberIds: [] }
 *   DELETE /:id/events/:eventId
 *
 * A club is mine only while I am in charge of it and still in its organization.
 */
const express = require('express');
const mongoose = require('mongoose');
const { NccNssClub, NccNssMember, NccNssEvent, eventKind } = require('./models');

const router = express.Router();
const validId = (id) => mongoose.isValidObjectId(id);
const toNumber = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
const fail = (res, error, what) => {
    console.error(`[nccnss] teacher ${what} failed:`, error.message);
    res.status(500).json({ message: `Could not ${what}. Please try again.` });
};
const notFound = (res, what = 'club') => res.status(404).json({ message: `No such ${what} in your charge.` });

const mine = (req) => ({ inchargeTeacherId: req.teacher._id, organizationId: req.teacher.organizationId || null });
const myClub = (req) => (validId(req.params.id) && req.teacher.organizationId
    ? NccNssClub.findOne({ _id: req.params.id, ...mine(req) }).lean()
    : null);

router.get('/', async (req, res) => {
    try {
        if (!req.teacher.organizationId) return res.json({ clubs: [] });
        const clubs = await NccNssClub.find(mine(req)).sort({ name: 1 }).lean();
        const ids = clubs.map((c) => c._id);
        const [counts, next] = await Promise.all([
            NccNssMember.aggregate([
                { $match: { clubId: { $in: ids }, status: 'active' } },
                { $group: { _id: '$clubId', n: { $sum: 1 } } }
            ]),
            NccNssEvent.find({ clubId: { $in: ids }, date: { $gte: new Date() } }).sort({ date: 1 }).lean()
        ]);
        res.json({
            clubs: clubs.map((c) => ({
                ...c,
                members: counts.find((x) => String(x._id) === String(c._id))?.n || 0,
                nextEvent: next.find((e) => String(e.clubId) === String(c._id)) || null
            }))
        });
    } catch (error) { fail(res, error, 'load your clubs'); }
});

router.get('/:id', async (req, res) => {
    try {
        const club = await myClub(req);
        if (!club) return notFound(res);
        const [members, events] = await Promise.all([
            NccNssMember.find({ clubId: club._id, status: 'active' }).populate('userId', 'name cardNumber profilePicture').lean(),
            NccNssEvent.find({ clubId: club._id }).sort({ date: -1 }).limit(200).lean()
        ]);
        res.json({
            club,
            members: members.filter((m) => m.userId).map((m) => ({ _id: m._id, role: m.role, year: m.year, student: m.userId })),
            events: events.map((e) => ({ ...e, presentCount: e.presentMemberIds.length }))
        });
    } catch (error) { fail(res, error, 'load the club'); }
});

router.post('/:id/events', async (req, res) => {
    try {
        const club = await myClub(req);
        if (!club) return notFound(res);
        const b = req.body || {};
        if (!String(b.title || '').trim()) return res.status(400).json({ message: 'Give the event a title.' });
        if (!b.date || Number.isNaN(new Date(b.date).getTime())) return res.status(400).json({ message: 'Choose a date.' });
        const event = await NccNssEvent.create({
            organizationId: club.organizationId, scheme: 'CLUB', clubId: club._id,
            kind: eventKind(b.kind, 'meeting'),
            title: String(b.title).trim().slice(0, 120),
            date: new Date(b.date),
            hours: Math.min(240, Math.max(0, toNumber(b.hours))),
            place: String(b.place || '').trim().slice(0, 120)
        });
        res.status(201).json({ message: 'Event added — the club\'s members see it on their calendar.', event });
    } catch (error) { fail(res, error, 'add the event'); }
});

router.put('/:id/events/:eventId/attendance', async (req, res) => {
    try {
        const club = await myClub(req);
        if (!club || !validId(req.params.eventId)) return notFound(res);
        const event = await NccNssEvent.findOne({ _id: req.params.eventId, clubId: club._id });
        if (!event) return notFound(res, 'event');
        const asked = (Array.isArray(req.body?.presentMemberIds) ? req.body.presentMemberIds : []).filter(validId);
        event.presentMemberIds = await NccNssMember.find({ _id: { $in: asked }, clubId: club._id }).distinct('_id');
        event.attendanceTaken = true;
        await event.save();
        res.json({ message: `Attendance saved — ${event.presentMemberIds.length} present.` });
    } catch (error) { fail(res, error, 'save the attendance'); }
});

router.delete('/:id/events/:eventId', async (req, res) => {
    try {
        const club = await myClub(req);
        if (!club || !validId(req.params.eventId)) return notFound(res);
        const gone = await NccNssEvent.findOneAndDelete({ _id: req.params.eventId, clubId: club._id });
        if (!gone) return notFound(res, 'event');
        res.json({ message: 'Event deleted.' });
    } catch (error) { fail(res, error, 'delete the event'); }
});

module.exports = router;
