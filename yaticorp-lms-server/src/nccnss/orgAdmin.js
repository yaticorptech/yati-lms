/**
 * Extra-curricular tracking for an organization (NCC, NSS, Scouts & Guides and
 * its own clubs) — mounted at /api/organizations/me/nccnss, behind
 * protectOrgAdmin and requireActiveOrganization.
 *
 *   GET    /overview                 headline numbers and targets (?scheme=&clubId= to narrow them)
 *   GET    /clubs                    the organization's clubs, with member counts
 *   POST   /clubs                    add one { name, category, description, inchargeTeacherId }
 *   PUT    /clubs/:id                rename or describe it
 *   DELETE /clubs/:id                delete one with no members left
 *   GET    /teachers                 my organization's teachers, to put one in charge of a club
 *   *      /units/…                  Scouts & Guides units and their leaders (./units.js)
 *   GET    /members                  members with progress (?scheme=&clubId=&unitId=&status=|former&search=&filter=atRisk|eligible)
 *   GET    /members/export           the same list as CSV
 *   GET    /candidates?search=       my students, to add as members
 *   POST   /members                  add one of my students { userId, scheme, clubId?, unitId? (Scouts), unit, enrolmentNo, year, certStage }
 *   GET    /members/:id              one member, their activities and attendance, and their earlier memberships (history)
 *   PUT    /members/:id              edit (a club member's role too), or approve a self-enrolment { status: 'active' | 'rejected' }
 *   POST   /members/:id/transfer     move a Scouts member to another unit { unitId }: this row closes, a new one continues it
 *   DELETE /members/:id              remove: a Scouts member with history is closed as left and kept; anyone
 *                                    else (and a request) is deleted with their activity rows
 *   GET    /activities?status=       activities, pending first by default (?scheme=&clubId= to narrow them)
 *   POST   /activities               log one for a member, approved at once
 *   PUT    /activities/:id           { decision: 'approve' | 'reject', reason? }, or edit { kind, title, date, hours, place }
 *   DELETE /activities/:id           delete one; its hours stop counting
 *   GET    /events                   events, newest first (?scheme=&clubId=)
 *   POST   /events                   schedule one { scheme, clubId?, unitId? (Scouts), … }
 *   PUT    /events/:id/attendance    { presentMemberIds: [] }
 *   DELETE /events/:id
 *   PUT    /settings                 { scheme, requiredHours, requiredCamps, minAttendance }
 *   GET    /ranks                    the Scouts ranks of each section and the kinds of award (./bsg.js)
 *   GET    /awards?status=           Scouts ranks, badges and trainings, waiting ones first (?unitId=)
 *   POST   /members/:id/awards       record one for a Scouts member { type, name, date, examiner, certificateNo, note }, approved at once
 *   PUT    /awards/:id               { decision: 'approve' | 'reject', reason? }, or edit its details
 *   DELETE /awards/:id
 *
 * As everywhere in the organization panel, the organization is
 * req.organization; an id from another organization answers 404.
 *
 * A teacher with the organization dashboard (Admin.staff) reads everything
 * here, but changes Scouts & Guides only in the units they lead (and never
 * the units themselves or the Scouts targets). NCC, NSS and clubs are as before.
 */
const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const { Teacher } = require('../teacher/models');
const { NccNssClub, NccNssMember, NccNssActivity, NccNssEvent, NccNssSetting, ScoutUnit, ScoutAward, LIVE_STATUSES, CLOSED_STATUSES, SCHEMES, CLUB_CATEGORIES, CLUB_ROLES, ACTIVITY_KINDS, EVENT_KINDS, schemeName, eventKind, scoutUnitFor } = require('./models');
const { targetsFor, summarise } = require('./progress');
const { closeMemberships, lastClosed } = require('./membership');
const { awardFields, newAward, awardsByUser, withRanks } = require('./awards');
const { RANKS, AWARD_TYPE_LABELS } = require('./bsg');
const Organization = require('../organizations/models/Organization');

const router = express.Router();
const STUDENT_FIELDS = 'name email cardNumber profilePicture phone';
const notFound = (res, what = 'member') => res.status(404).json({ message: `No such ${what} in your organization.` });
const fail = (res, error, what) => {
    console.error(`[nccnss] ${what} failed:`, error.message);
    res.status(500).json({ message: `Could not ${what}. Please try again.` });
};

// The Scouts units a staff sign-in leads (through its teacher account), as
// strings; null for the organization's own sign-in and a viewing superadmin.
router.use(async (req, res, next) => {
    try {
        const teacherId = req.admin?.staff ? req.admin.staffTeacherId : null;
        req.staffUnitIds = !req.admin?.staff ? null : teacherId
            ? (await ScoutUnit.find({ organizationId: req.organization._id, leaderTeacherIds: teacherId }).distinct('_id')).map(String)
            : [];
        next();
    } catch (error) { fail(res, error, 'check your access'); }
});
/** Whether this sign-in may change a row of `scheme` in `unitId` (see req.staffUnitIds). */
const mayUnit = (req, scheme, unitId) => scheme !== 'SCOUTS' || !req.staffUnitIds || (!!unitId && req.staffUnitIds.includes(String(unitId)));
const forbidden = (res) => res.status(403).json({ code: 'STAFF_LIMITED', message: 'You can change Scouts & Guides only in the units you lead. Ask your organization\'s administrator.' });
/** The same for an activity, which carries its scheme but not its unit. */
const mayActivity = async (req, activity) => {
    if (activity.scheme !== 'SCOUTS' || !req.staffUnitIds) return true;
    const member = await NccNssMember.findById(activity.memberId).select('unitId').lean();
    return mayUnit(req, 'SCOUTS', member?.unitId);
};

router.use('/units', require('./units'));
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const validId = (id) => mongoose.isValidObjectId(id);
const toNumber = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
const CHOOSE = 'Choose NCC, NSS, Scouts & Guides or a club.';

/** ?scheme= and ?clubId=, as a filter on members, activities or events. */
const narrow = (query) => ({
    ...(SCHEMES.includes(query.scheme) ? { scheme: query.scheme } : {}),
    ...(validId(query.clubId) ? { clubId: new mongoose.Types.ObjectId(String(query.clubId)) } : {})
});

/** The same, for activities: they carry the scheme but not the club, so a club goes by its members. */
const activityScope = async (req) => {
    const { scheme, clubId } = narrow(req.query);
    if (!clubId) return scheme ? { scheme } : {};
    return { memberId: { $in: await NccNssMember.find({ organizationId: req.organization._id, clubId }).distinct('_id') } };
};

/** The club a request names, for scheme 'CLUB': one of this organization's, or null. */
const clubFor = async (req, scheme, clubId) => {
    if (scheme !== 'CLUB') return { club: null };
    const club = validId(clubId) ? await NccNssClub.findOne({ _id: clubId, organizationId: req.organization._id }).lean() : null;
    return club ? { club } : { error: 'Choose one of your clubs.' };
};

/** The member fields an admin may set. */
const memberFields = (body = {}) => {
    const out = {};
    if (body.unit !== undefined) out.unit = String(body.unit).trim().slice(0, 80);
    if (body.enrolmentNo !== undefined) out.enrolmentNo = String(body.enrolmentNo).trim().slice(0, 40);
    if (body.year !== undefined) out.year = Math.min(3, Math.max(1, toNumber(body.year, 1)));
    if (body.certStage !== undefined) out.certStage = ['A', 'B', 'C'].includes(body.certStage) ? body.certStage : '';
    if (body.note !== undefined) out.note = String(body.note).trim().slice(0, 300);
    if (CLUB_ROLES.includes(body.role)) out.role = body.role;
    return out;
};

/**
 * The unit fields for a Scouts member from body.unitId: the unit's name and
 * section with its id, blanks for '' or null (back to a typed unit), nothing
 * when unitId is absent. { error } for a unit that is not this organization's.
 */
const unitChoice = async (req, scheme, current = null) => {
    const asked = req.body?.unitId;
    // Unchanged is left alone, so a member of a since-retired unit can still be edited.
    if (scheme !== 'SCOUTS' || asked === undefined || (asked && String(asked) === String(current))) return {};
    if (!asked) return { fields: { unitId: null, section: '' } };
    const { unit, error } = await scoutUnitFor(req.organization._id, scheme, asked);
    if (error) return { error };
    return { fields: { unitId: unit._id, unit: unit.name, section: unit.section } };
};

/** Members with their students and progress, filtered as asked. */
const loadMembers = async (req) => {
    const orgId = req.organization._id;
    const filter = { organizationId: orgId };
    if (SCHEMES.includes(req.query.scheme)) filter.scheme = req.query.scheme;
    if (validId(req.query.clubId)) filter.clubId = req.query.clubId;
    if (validId(req.query.unitId)) filter.unitId = req.query.unitId;
    if (['pending', 'active', 'rejected', 'completed'].includes(req.query.status)) filter.status = req.query.status;
    else if (req.query.status === 'former') filter.status = { $in: CLOSED_STATUSES };
    else filter.status = { $in: ['active', 'completed', 'pending'] };

    let members = await NccNssMember.find(filter).populate('userId', STUDENT_FIELDS).populate('clubId', 'name').populate('unitId', 'name section status').sort({ createdAt: -1 }).lean();
    members = members.filter((m) => m.userId).map((m) => ({ ...m, name: schemeName(m) }));
    const search = String(req.query.search || '').trim().slice(0, 100).toLowerCase();
    if (search) {
        members = members.filter((m) => [m.userId.name, m.userId.email, m.userId.cardNumber, m.enrolmentNo, m.unit, m.name]
            .some((v) => String(v || '').toLowerCase().includes(search)));
    }
    const summaries = await summarise(members, orgId);
    members = await withRanks(members);
    let rows = members.map((m, i) => ({ ...m, student: m.userId, userId: m.userId._id, summary: summaries[i] }));
    if (req.query.filter === 'atRisk') rows = rows.filter((r) => r.summary.atRisk);
    if (req.query.filter === 'eligible') rows = rows.filter((r) => r.summary.eligible && r.status === 'active');
    return rows;
};

router.get('/overview', async (req, res) => {
    try {
        const orgId = req.organization._id;
        const [members, pendingActivities, upcomingEvents, targets, pendingAwards] = await Promise.all([
            NccNssMember.find({ organizationId: orgId, ...narrow(req.query), status: { $in: ['active', 'pending'] } }).populate('clubId', 'name').lean(),
            NccNssActivity.countDocuments({ organizationId: orgId, ...await activityScope(req), status: 'pending' }),
            NccNssEvent.countDocuments({ organizationId: orgId, ...narrow(req.query), date: { $gte: new Date() } }),
            targetsFor(orgId),
            req.query.scheme === 'SCOUTS' ? ScoutAward.countDocuments({ organizationId: orgId, status: 'pending' }) : 0
        ]);
        const active = members.filter((m) => m.status === 'active');
        const summaries = await summarise(active, orgId, targets);
        const withAttendance = summaries.filter((s) => s.attendance !== null);
        const units = {};
        active.forEach((m, i) => {
            const key = m.scheme === 'CLUB' ? schemeName(m) : `${schemeName(m)} · ${m.unit || 'No unit'}`;
            units[key] = units[key] || { name: key, members: 0, hours: 0 };
            units[key].members += 1;
            units[key].hours += summaries[i].hours;
        });
        res.json({
            totals: {
                ...Object.fromEntries(SCHEMES.map((sc) => [sc, active.filter((m) => m.scheme === sc).length])),
                members: active.length,
                pendingMembers: members.length - active.length,
                pendingActivities,
                pendingAwards,
                upcomingEvents,
                atRisk: summaries.filter((s) => s.atRisk).length,
                eligible: summaries.filter((s) => s.eligible).length,
                totalHours: summaries.reduce((s, x) => s + x.hours, 0),
                avgAttendance: withAttendance.length
                    ? Math.round(withAttendance.reduce((s, x) => s + x.attendance, 0) / withAttendance.length)
                    : null
            },
            units: Object.values(units).sort((a, b) => a.name.localeCompare(b.name)),
            targets
        });
    } catch (error) { fail(res, error, 'load the overview'); }
});

router.get('/clubs', async (req, res) => {
    try {
        const orgId = req.organization._id;
        const [clubs, counts] = await Promise.all([
            NccNssClub.find({ organizationId: orgId }).populate('inchargeTeacherId', 'name').sort({ name: 1 }).lean(),
            NccNssMember.aggregate([
                { $match: { organizationId: orgId, scheme: 'CLUB', status: { $in: ['active', 'pending'] } } },
                { $group: { _id: { clubId: '$clubId', status: '$status' }, n: { $sum: 1 } } }
            ])
        ]);
        const count = (club, status) => counts.find((c) => String(c._id.clubId) === String(club._id) && c._id.status === status)?.n || 0;
        res.json({ clubs: clubs.map((c) => ({ ...c, members: count(c, 'active'), pending: count(c, 'pending') })) });
    } catch (error) { fail(res, error, 'load the clubs'); }
});

const clubFields = async (req) => {
    const b = req.body || {};
    // Only a teacher of this organization can be put in charge; blank means none.
    const teacher = validId(b.inchargeTeacherId)
        ? await Teacher.findOne({ _id: b.inchargeTeacherId, organizationId: req.organization._id }).select('_id').lean()
        : null;
    return {
        name: String(b.name || '').trim().slice(0, 80),
        category: CLUB_CATEGORIES.includes(b.category) ? b.category : 'other',
        description: String(b.description || '').trim().slice(0, 300),
        inchargeTeacherId: teacher?._id || null
    };
};

router.get('/teachers', async (req, res) => {
    try {
        const teachers = await Teacher.find({ organizationId: req.organization._id }).select('name email designation department').sort({ name: 1 }).lean();
        res.json({ teachers });
    } catch (error) { fail(res, error, 'load your teachers'); }
});

router.post('/clubs', async (req, res) => {
    try {
        const fields = await clubFields(req);
        if (!fields.name) return res.status(400).json({ message: 'Give the club a name.' });
        const club = await NccNssClub.create({ ...fields, organizationId: req.organization._id });
        res.status(201).json({ message: `${club.name} added. Students can now ask to join it.`, club });
    } catch (error) { fail(res, error, 'add the club'); }
});

router.put('/clubs/:id', async (req, res) => {
    try {
        if (!validId(req.params.id)) return notFound(res, 'club');
        const fields = await clubFields(req);
        if (!fields.name) return res.status(400).json({ message: 'Give the club a name.' });
        const club = await NccNssClub.findOneAndUpdate({ _id: req.params.id, organizationId: req.organization._id }, fields, { new: true });
        if (!club) return notFound(res, 'club');
        res.json({ message: 'Club saved.', club });
    } catch (error) { fail(res, error, 'save the club'); }
});

router.delete('/clubs/:id', async (req, res) => {
    try {
        if (!validId(req.params.id)) return notFound(res, 'club');
        const orgId = req.organization._id;
        const left = await NccNssMember.countDocuments({ organizationId: orgId, clubId: req.params.id, status: { $in: ['active', 'pending'] } });
        if (left) return res.status(409).json({ message: `Remove its ${left} member${left > 1 ? 's' : ''} (and requests) first.` });
        const club = await NccNssClub.findOneAndDelete({ _id: req.params.id, organizationId: orgId });
        if (!club) return notFound(res, 'club');
        const gone = await NccNssMember.find({ organizationId: orgId, clubId: club._id }).distinct('_id');
        await Promise.all([
            NccNssMember.deleteMany({ _id: { $in: gone } }),
            NccNssActivity.deleteMany({ memberId: { $in: gone } }),
            NccNssEvent.deleteMany({ organizationId: orgId, clubId: club._id })
        ]);
        res.json({ message: `${club.name} deleted.` });
    } catch (error) { fail(res, error, 'delete the club'); }
});

router.get('/members', async (req, res) => {
    try { res.json({ members: await loadMembers(req) }); } catch (error) { fail(res, error, 'load the members'); }
});

router.get('/members/export', async (req, res) => {
    try {
        const rows = await loadMembers(req);
        const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const header = ['Name', 'Card', 'Email', 'Scheme', 'Unit', 'Section', 'Enrolment No', 'Year', 'Certificate', 'Status',
            'Hours', 'Required hours', 'Camps', 'Required camps', 'Attendance %', 'Awards', 'Eligible', 'At risk', 'Next'];
        const lines = rows.map((r) => [r.student.name, r.student.cardNumber, r.student.email, r.name, r.unit, r.section, r.enrolmentNo,
            r.year, r.certStage, r.status, r.summary.hours, r.summary.requiredHours, r.summary.camps, r.summary.requiredCamps,
            r.summary.attendance ?? '', r.summary.awards, r.summary.eligible ? 'Yes' : 'No', r.summary.atRisk ? 'Yes' : 'No',
            r.summary.next].map(cell).join(','));
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="extra-curricular-progress.csv"');
        res.send([header.map(cell).join(','), ...lines].join('\n'));
    } catch (error) { fail(res, error, 'export the members'); }
});

router.get('/candidates', async (req, res) => {
    try {
        const filter = { organizationId: req.organization._id };
        const search = String(req.query.search || '').trim().slice(0, 100);
        if (search) filter.$or = ['name', 'email', 'cardNumber'].map((k) => ({ [k]: new RegExp(escapeRegExp(search), 'i') }));
        // The whole list (the picker searches it as you type), capped for a very large organization.
        const students = await User.find(filter).select('name email cardNumber').sort({ name: 1 }).limit(1000).lean();
        res.json({ students });
    } catch (error) { fail(res, error, 'search your students'); }
});

router.post('/members', async (req, res) => {
    try {
        const { userId, scheme, clubId } = req.body || {};
        if (!SCHEMES.includes(scheme)) return res.status(400).json({ message: CHOOSE });
        if (!validId(userId)) return res.status(400).json({ message: 'Choose a student.' });
        const { club, error } = await clubFor(req, scheme, clubId);
        if (error) return res.status(400).json({ message: error });
        const name = club ? club.name : schemeName({ scheme });
        const student = await User.findOne({ _id: userId, organizationId: req.organization._id }).select('_id').lean();
        if (!student) return res.status(404).json({ message: 'That student is not in your organization.' });
        const chosen = await unitChoice(req, scheme);
        if (chosen.error) return res.status(400).json({ message: chosen.error });
        if (!mayUnit(req, scheme, chosen.fields?.unitId)) return forbidden(res);
        // A place still open at an organization they have since left (from
        // before such places were closed on leaving) ends here, kept as history.
        await closeMemberships({ userId, notIn: req.organization._id, reason: 'No longer in that organization' });
        const rows = await NccNssMember.find({ userId, scheme, clubId: club?._id || null, organizationId: req.organization._id, status: { $in: [...LIVE_STATUSES, 'completed', 'rejected'] } }).sort({ createdAt: -1 });
        if (rows.some((r) => r.status !== 'rejected')) return res.status(409).json({ message: `This student is already in ${name}.` });
        const existing = rows[0] || null;
        const fields = { ...memberFields(req.body), ...chosen.fields, status: 'active', addedBy: 'organization', organizationId: req.organization._id, endedAt: null, endReason: '' };
        const member = existing
            ? await Object.assign(existing, fields).save()
            : await NccNssMember.create({ ...fields, userId, scheme, clubId: club?._id || null, transferredFrom: (await lastClosed(userId, scheme, club?._id))?._id || null });
        res.status(201).json({ message: `Added to ${name}.`, member });
    } catch (error) { fail(res, error, 'add the member'); }
});

/**
 * The student's other memberships in the same scheme (and club), at any
 * organization, oldest first: where they were, when, and how far they got. So
 * a unit that receives a transfer sees the record it continues.
 */
const historyOf = async (member) => {
    const rows = await NccNssMember.find({ userId: member.userId._id, scheme: member.scheme, clubId: member.clubId?._id || null, _id: { $ne: member._id } })
        .sort({ createdAt: 1 }).lean();
    if (!rows.length) return [];
    const orgs = await Organization.find({ _id: { $in: rows.map((r) => r.organizationId) } }).select('name').lean();
    const summaries = await Promise.all(rows.map((r) => summarise([r], r.organizationId).then(([x]) => x)));
    return rows.map((r, i) => ({
        _id: r._id, status: r.status, unit: r.unit, section: r.section, startedAt: r.createdAt, endedAt: r.endedAt, endReason: r.endReason,
        organization: orgs.find((o) => String(o._id) === String(r.organizationId))?.name || 'An organization',
        hours: summaries[i].hours, camps: summaries[i].camps, attendance: summaries[i].attendance
    }));
};

router.get('/members/:id', async (req, res) => {
    try {
        if (!validId(req.params.id)) return notFound(res);
        const member = await NccNssMember.findOne({ _id: req.params.id, organizationId: req.organization._id })
            .populate('userId', STUDENT_FIELDS).populate('clubId', 'name').populate('unitId', 'name section status').lean();
        if (!member || !member.userId) return notFound(res);
        member.name = schemeName(member);
        const [summary] = await summarise([member], req.organization._id);
        const [activities, events] = await Promise.all([
            NccNssActivity.find({ memberId: member._id }).sort({ date: -1 }).lean(),
            NccNssEvent.find({
                organizationId: req.organization._id, scheme: member.scheme, clubId: member.clubId?._id || null,
                unit: { $in: ['', member.unit] }, attendanceTaken: true
            }).sort({ date: -1 }).limit(50).lean()
        ]);
        res.json({
            member: { ...member, student: member.userId, userId: member.userId._id },
            summary,
            history: await historyOf(member),
            ...(member.scheme === 'SCOUTS' ? await (async () => {
                const [ranked] = await withRanks([member], { full: true });
                return { rank: ranked.rank, awards: ranked.awards, ranks: RANKS[member.section] || [] };
            })() : {}),
            activities,
            attendance: events.map((e) => ({
                _id: e._id, title: e.title, kind: e.kind, date: e.date, hours: e.hours,
                present: e.presentMemberIds.some((id) => String(id) === String(member._id))
            }))
        });
    } catch (error) { fail(res, error, 'load the member'); }
});

router.put('/members/:id', async (req, res) => {
    try {
        if (!validId(req.params.id)) return notFound(res);
        const member = await NccNssMember.findOne({ _id: req.params.id, organizationId: req.organization._id });
        if (!member) return notFound(res);
        const chosen = await unitChoice(req, member.scheme, member.unitId);
        if (chosen.error) return res.status(400).json({ message: chosen.error });
        if (!mayUnit(req, member.scheme, member.unitId) || (chosen.fields && !mayUnit(req, member.scheme, chosen.fields.unitId))) return forbidden(res);
        const closed = CLOSED_STATUSES.includes(member.status);
        if (closed && req.body?.status) return res.status(409).json({ message: 'This membership has ended. Add the student again to start a new one.' });
        // Moving an active member between units is a transfer, so their record in the old unit stays whole.
        if (member.unitId && chosen.fields && String(chosen.fields.unitId) !== String(member.unitId) && ['active', 'completed'].includes(member.status)) {
            return res.status(409).json({ message: 'Use Transfer to move a member to another unit, so their record in this one is kept.' });
        }
        Object.assign(member, memberFields(req.body), closed ? {} : chosen.fields);
        if (['active', 'rejected', 'completed'].includes(req.body?.status)) member.status = req.body.status;
        await member.save();
        const message = req.body?.status === 'active' ? 'Approved.' : req.body?.status === 'rejected' ? 'Rejected.' : 'Saved.';
        res.json({ message, member });
    } catch (error) { fail(res, error, 'save the member'); }
});

router.post('/members/:id/transfer', async (req, res) => {
    try {
        if (!validId(req.params.id)) return notFound(res);
        const member = await NccNssMember.findOne({ _id: req.params.id, organizationId: req.organization._id, scheme: 'SCOUTS', status: 'active' });
        if (!member) return notFound(res, 'active Scouts & Guides member');
        const { unit, error } = await scoutUnitFor(req.organization._id, 'SCOUTS', req.body?.unitId);
        if (error || !unit) return res.status(400).json({ message: error || 'Choose the unit to move them to.' });
        if (String(unit._id) === String(member.unitId)) return res.status(400).json({ message: `They are already in ${unit.name}.` });
        if (!mayUnit(req, 'SCOUTS', member.unitId) || !mayUnit(req, 'SCOUTS', unit._id)) return forbidden(res);
        const now = new Date();
        const from = member.unit || 'no unit';
        // Close first: only one live row may exist, and the new one is live.
        member.status = 'transferred';
        member.endedAt = now;
        member.endReason = `Moved to ${unit.name}`;
        await member.save();
        let next;
        try {
            next = await NccNssMember.create({
                organizationId: member.organizationId, userId: member.userId, scheme: 'SCOUTS', clubId: null,
                unitId: unit._id, unit: unit.name, section: unit.section,
                enrolmentNo: member.enrolmentNo, year: member.year, note: member.note,
                status: 'active', addedBy: 'organization', transferredFrom: member._id
            });
        } catch (createError) {
            // Put the old row back as it was rather than leave the student in no unit.
            await NccNssMember.updateOne({ _id: member._id }, { $set: { status: 'active', endedAt: null, endReason: '' } });
            throw createError;
        }
        await NccNssMember.updateOne({ _id: member._id }, { $set: { transferredTo: next._id } });
        res.status(201).json({ message: `Moved from ${from} to ${unit.name}. Their record in ${from} is kept.`, member: next });
    } catch (error) { fail(res, error, 'transfer the member'); }
});

router.delete('/members/:id', async (req, res) => {
    try {
        if (!validId(req.params.id)) return notFound(res);
        const target = await NccNssMember.findOne({ _id: req.params.id, organizationId: req.organization._id }).select('scheme unitId status').lean();
        if (target && !mayUnit(req, target.scheme, target.unitId)) return forbidden(res);
        if (target && CLOSED_STATUSES.includes(target.status)) return res.status(409).json({ message: 'This membership has already ended; it is kept as their history.' });
        // A Scouts member who took part is closed, not deleted: their record stays.
        if (target && target.scheme === 'SCOUTS' && ['active', 'completed'].includes(target.status)) {
            const now = new Date();
            await Promise.all([
                NccNssMember.updateOne({ _id: target._id }, { $set: { status: 'left', endedAt: now, endReason: 'Removed from the unit' } }),
                NccNssActivity.updateMany({ memberId: target._id, status: 'pending' }, { $set: { status: 'rejected', reason: 'Removed from the unit', decidedAt: now } })
            ]);
            return res.json({ message: 'Removed from Scouts & Guides. Their record is kept under Former.' });
        }
        const member = await NccNssMember.findOneAndDelete({ _id: req.params.id, organizationId: req.organization._id }).populate('clubId', 'name');
        if (!member) return notFound(res);
        await Promise.all([
            NccNssActivity.deleteMany({ memberId: member._id }),
            NccNssEvent.updateMany({ organizationId: req.organization._id }, { $pull: { presentMemberIds: member._id } })
        ]);
        res.json({ message: `Removed from ${schemeName(member)}.` });
    } catch (error) { fail(res, error, 'remove the member'); }
});

router.get('/activities', async (req, res) => {
    try {
        const status = ['pending', 'approved', 'rejected'].includes(req.query.status) ? req.query.status : 'pending';
        const scope = await activityScope(req);
        const activities = await NccNssActivity.find({ organizationId: req.organization._id, ...scope, status })
            .populate('userId', 'name cardNumber profilePicture')
            .populate({ path: 'memberId', select: 'unit enrolmentNo scheme clubId', populate: { path: 'clubId', select: 'name' } })
            .sort(status === 'pending' ? { createdAt: 1 } : { decidedAt: -1 })
            .limit(200).lean();
        const pendingCount = status === 'pending'
            ? activities.length
            : await NccNssActivity.countDocuments({ organizationId: req.organization._id, ...scope, status: 'pending' });
        res.json({ activities: activities.filter((a) => a.userId && a.memberId).map((a) => ({ ...a, name: schemeName(a.memberId) })), pendingCount });
    } catch (error) { fail(res, error, 'load the activities'); }
});

router.post('/activities', async (req, res) => {
    try {
        const b = req.body || {};
        if (!validId(b.memberId)) return res.status(400).json({ message: 'Choose a member.' });
        const member = await NccNssMember.findOne({ _id: b.memberId, organizationId: req.organization._id }).lean();
        if (!member) return notFound(res);
        if (!mayUnit(req, member.scheme, member.unitId)) return forbidden(res);
        if (!String(b.title || '').trim()) return res.status(400).json({ message: 'Give the activity a title.' });
        const activity = await NccNssActivity.create({
            organizationId: req.organization._id, memberId: member._id, userId: member.userId, scheme: member.scheme,
            kind: ACTIVITY_KINDS.includes(b.kind) ? b.kind : 'other',
            title: String(b.title).trim().slice(0, 120),
            date: b.date ? new Date(b.date) : new Date(),
            hours: Math.min(240, Math.max(0, toNumber(b.hours))),
            place: String(b.place || '').trim().slice(0, 120),
            status: 'approved', decidedBy: req.admin._id, decidedAt: new Date(), source: 'organization'
        });
        res.status(201).json({ message: 'Activity added.', activity });
    } catch (error) { fail(res, error, 'add the activity'); }
});

router.put('/activities/:id', async (req, res) => {
    try {
        if (!validId(req.params.id)) return notFound(res, 'activity');
        const { decision, reason = '' } = req.body || {};
        const activity = await NccNssActivity.findOne({ _id: req.params.id, organizationId: req.organization._id });
        if (!activity) return notFound(res, 'activity');
        if (!await mayActivity(req, activity)) return forbidden(res);
        // No decision: an edit of the details. Its approval stands as it was.
        if (decision === undefined) {
            const b = req.body || {};
            if (b.title !== undefined) {
                if (!String(b.title).trim()) return res.status(400).json({ message: 'Give the activity a title.' });
                activity.title = String(b.title).trim().slice(0, 120);
            }
            if (ACTIVITY_KINDS.includes(b.kind)) activity.kind = b.kind;
            if (b.date !== undefined) {
                const date = new Date(b.date);
                if (Number.isNaN(date.getTime())) return res.status(400).json({ message: 'Choose a date.' });
                activity.date = date;
            }
            if (b.hours !== undefined) activity.hours = Math.min(240, Math.max(0, toNumber(b.hours)));
            if (b.place !== undefined) activity.place = String(b.place).trim().slice(0, 120);
            await activity.save();
            return res.json({ message: 'Activity saved.', activity });
        }
        if (!['approve', 'reject'].includes(decision)) return res.status(400).json({ message: 'Approve or reject.' });
        activity.status = decision === 'approve' ? 'approved' : 'rejected';
        activity.reason = decision === 'reject' ? String(reason).trim().slice(0, 300) : '';
        activity.decidedBy = req.admin._id;
        activity.decidedAt = new Date();
        await activity.save();
        res.json({ message: decision === 'approve' ? 'Approved — the hours now count.' : 'Rejected.', activity });
    } catch (error) { fail(res, error, 'save the decision'); }
});

router.delete('/activities/:id', async (req, res) => {
    try {
        if (!validId(req.params.id)) return notFound(res, 'activity');
        const target = await NccNssActivity.findOne({ _id: req.params.id, organizationId: req.organization._id }).select('scheme memberId').lean();
        if (target && !await mayActivity(req, target)) return forbidden(res);
        const gone = await NccNssActivity.findOneAndDelete({ _id: req.params.id, organizationId: req.organization._id });
        if (!gone) return notFound(res, 'activity');
        res.json({ message: 'Activity deleted.' });
    } catch (error) { fail(res, error, 'delete the activity'); }
});

router.get('/ranks', (req, res) => {
    res.json({ ranks: RANKS, types: Object.entries(AWARD_TYPE_LABELS).map(([value, label]) => ({ value, label })) });
});

router.get('/awards', async (req, res) => {
    try {
        const status = ['pending', 'approved', 'rejected'].includes(req.query.status) ? req.query.status : 'pending';
        const filter = { organizationId: req.organization._id, status, ...(validId(req.query.unitId) ? { unitId: req.query.unitId } : {}) };
        const awards = await ScoutAward.find(filter).populate('userId', 'name cardNumber profilePicture').populate('unitId', 'name section')
            .populate('proposedByTeacherId', 'name').sort(status === 'pending' ? { createdAt: 1 } : { decidedAt: -1 }).limit(200).lean();
        res.json({ awards: awards.filter((a) => a.userId), pendingCount: await ScoutAward.countDocuments({ organizationId: req.organization._id, status: 'pending' }) });
    } catch (error) { fail(res, error, 'load the ranks and badges'); }
});

router.post('/members/:id/awards', async (req, res) => {
    try {
        if (!validId(req.params.id)) return notFound(res);
        const member = await NccNssMember.findOne({ _id: req.params.id, organizationId: req.organization._id, scheme: 'SCOUTS', status: { $in: ['active', 'completed'] } }).lean();
        if (!member) return notFound(res, 'active Scouts & Guides member');
        if (!mayUnit(req, 'SCOUTS', member.unitId)) return forbidden(res);
        const { fields, error } = awardFields(req.body, member.section);
        if (error) return res.status(400).json({ message: error });
        const award = await newAward(member, fields, { status: 'approved', decidedBy: req.admin._id, decidedAt: new Date() });
        res.status(201).json({ message: `${fields.name} recorded.`, award });
    } catch (error) { fail(res, error, 'record it'); }
});

router.put('/awards/:id', async (req, res) => {
    try {
        if (!validId(req.params.id)) return notFound(res, 'award');
        const award = await ScoutAward.findOne({ _id: req.params.id, organizationId: req.organization._id });
        if (!award) return notFound(res, 'award');
        if (!mayUnit(req, 'SCOUTS', award.unitId)) return forbidden(res);
        const { decision, reason = '' } = req.body || {};
        if (decision === undefined) {
            const { fields, error } = awardFields({ ...award.toObject(), ...req.body, type: award.type }, award.section);
            if (error) return res.status(400).json({ message: error });
            Object.assign(award, fields);
            await award.save();
            return res.json({ message: 'Saved.', award });
        }
        if (!['approve', 'reject'].includes(decision)) return res.status(400).json({ message: 'Approve or reject.' });
        award.status = decision === 'approve' ? 'approved' : 'rejected';
        award.reason = decision === 'reject' ? String(reason).trim().slice(0, 300) : '';
        award.decidedBy = req.admin._id;
        award.decidedAt = new Date();
        await award.save();
        res.json({ message: decision === 'approve' ? `${award.name} approved — it is on their record.` : 'Rejected.', award });
    } catch (error) { fail(res, error, 'save the decision'); }
});

router.delete('/awards/:id', async (req, res) => {
    try {
        if (!validId(req.params.id)) return notFound(res, 'award');
        const award = await ScoutAward.findOne({ _id: req.params.id, organizationId: req.organization._id }).lean();
        if (!award) return notFound(res, 'award');
        if (!mayUnit(req, 'SCOUTS', award.unitId)) return forbidden(res);
        await ScoutAward.deleteOne({ _id: award._id });
        res.json({ message: `${award.name} removed from their record.` });
    } catch (error) { fail(res, error, 'remove it'); }
});

router.get('/events', async (req, res) => {
    try {
        const filter = { organizationId: req.organization._id, ...narrow(req.query) };
        const events = await NccNssEvent.find(filter).populate('clubId', 'name').sort({ date: -1 }).limit(200).lean();
        res.json({ events: events.map((e) => ({ ...e, name: schemeName(e), presentCount: e.presentMemberIds.length })) });
    } catch (error) { fail(res, error, 'load the events'); }
});

router.post('/events', async (req, res) => {
    try {
        const b = req.body || {};
        if (!SCHEMES.includes(b.scheme)) return res.status(400).json({ message: CHOOSE });
        const { club, error } = await clubFor(req, b.scheme, b.clubId);
        if (error) return res.status(400).json({ message: error });
        if (!String(b.title || '').trim()) return res.status(400).json({ message: 'Give the event a title.' });
        if (!b.date || Number.isNaN(new Date(b.date).getTime())) return res.status(400).json({ message: 'Choose a date.' });
        const { unit, error: unitError } = await scoutUnitFor(req.organization._id, b.scheme, b.unitId);
        if (unitError) return res.status(400).json({ message: unitError });
        if (!mayUnit(req, b.scheme, unit?._id)) return forbidden(res);
        const event = await NccNssEvent.create({
            organizationId: req.organization._id, scheme: b.scheme, clubId: club?._id || null,
            unit: unit ? unit.name : String(b.unit || '').trim().slice(0, 80),
            unitId: unit?._id || null,
            kind: eventKind(b.kind, 'parade'),
            title: String(b.title).trim().slice(0, 120),
            date: new Date(b.date),
            hours: Math.min(240, Math.max(0, toNumber(b.hours))),
            place: String(b.place || '').trim().slice(0, 120)
        });
        res.status(201).json({ message: 'Event scheduled.', event });
    } catch (error) { fail(res, error, 'schedule the event'); }
});

router.put('/events/:id/attendance', async (req, res) => {
    try {
        if (!validId(req.params.id)) return notFound(res, 'event');
        const event = await NccNssEvent.findOne({ _id: req.params.id, organizationId: req.organization._id });
        if (!event) return notFound(res, 'event');
        if (!mayUnit(req, event.scheme, event.unitId)) return forbidden(res);
        const asked = (Array.isArray(req.body?.presentMemberIds) ? req.body.presentMemberIds : []).filter(validId);
        // Only this organization's current members of the event's scheme (and club) can be marked.
        const valid = await NccNssMember.find({ _id: { $in: asked }, organizationId: req.organization._id, scheme: event.scheme, clubId: event.clubId || null, status: { $in: ['active', 'completed'] } }).distinct('_id');
        // Anyone marked before who has since left or moved keeps their mark: it is their history.
        const kept = await NccNssMember.find({ _id: { $in: event.presentMemberIds }, status: { $in: CLOSED_STATUSES } }).distinct('_id');
        event.presentMemberIds = [...valid, ...kept];
        event.attendanceTaken = true;
        await event.save();
        res.json({ message: `Attendance saved — ${valid.length} present.`, event });
    } catch (error) { fail(res, error, 'save the attendance'); }
});

router.delete('/events/:id', async (req, res) => {
    try {
        if (!validId(req.params.id)) return notFound(res, 'event');
        const target = await NccNssEvent.findOne({ _id: req.params.id, organizationId: req.organization._id }).select('scheme unitId').lean();
        if (target && !mayUnit(req, target.scheme, target.unitId)) return forbidden(res);
        const event = await NccNssEvent.findOneAndDelete({ _id: req.params.id, organizationId: req.organization._id });
        if (!event) return notFound(res, 'event');
        res.json({ message: 'Event deleted.' });
    } catch (error) { fail(res, error, 'delete the event'); }
});

router.put('/settings', async (req, res) => {
    try {
        const b = req.body || {};
        if (!SCHEMES.includes(b.scheme)) return res.status(400).json({ message: CHOOSE });
        if (!mayUnit(req, b.scheme, null)) return forbidden(res);
        await NccNssSetting.findOneAndUpdate(
            { organizationId: req.organization._id, scheme: b.scheme },
            {
                requiredHours: Math.min(2000, Math.max(0, toNumber(b.requiredHours))),
                requiredCamps: Math.min(20, Math.max(0, toNumber(b.requiredCamps))),
                minAttendance: Math.min(100, Math.max(0, toNumber(b.minAttendance, 75)))
            },
            { upsert: true, setDefaultsOnInsert: true }
        );
        res.json({ message: `${schemeName({ scheme: b.scheme })} targets saved.`, targets: await targetsFor(req.organization._id) });
    } catch (error) { fail(res, error, 'save the targets'); }
});

module.exports = router;
