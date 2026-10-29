/**
 * College coordinators: a college's organization admin registers its team and
 * picks the players, from the college's own students. The college is always
 * the one the admin account belongs to (req.organization), never one named in
 * the request.
 *
 * A college's own competition (hostOrganizationId) is for its students only:
 * other colleges do not see it here or enter it, and the college itself runs
 * it — teams and all — from Host competitions (routes/admin.js).
 *
 *   GET    /                         competitions open for registration, and the ones we entered
 *   GET    /students                 our students, to pick players from
 *   GET    /hosting                  whether the platform admin lets us host { canHost }
 *   GET    /:id                      one competition, with our team and its matches
 *   PUT    /:id/team                 register or update our team { teamName, coordinatorName, coordinatorPhone, players: [userId] }
 *   DELETE /:id/team                 withdraw our team (before the deadline)
 *   PUT    /:id/matches/:matchId/lineup  who plays this match { players: [userId] }
 */
const express = require('express');
const mongoose = require('mongoose');
const Competition = require('../models/Competition');
const Team = require('../models/Team');
const Match = require('../models/Match');
const User = require('../../models/User');
const views = require('../services/views');

const router = express.Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch((err) => {
    if (err?.status) return res.status(err.status).json({ message: err.message });
    next(err);
});
const fail = (status, message) => Object.assign(new Error(message), { status });

const open = (c) => views.registration(c).open;

router.get('/', wrap(async (req, res) => {
    const orgId = req.organization._id;
    const ours = await Team.find({ organizationId: orgId }).lean();
    // Open inter-college competitions, and any we entered — but never our own,
    // which is run from Host competitions. (A team another college entered in
    // a college's competition before they became college-only still shows.)
    const comps = await Competition.find({
        game: { $nin: ['quiz', 'hackathon'] },  // Quiz and Hackathon removed 2026-10-28
        hostOrganizationId: { $ne: orgId },
        $or: [{ status: 'registration', hostOrganizationId: null }, { _id: { $in: ours.map((t) => t.competitionId) }, status: { $ne: 'draft' } }]
    }).sort({ startsAt: 1 }).lean();
    const allTeams = await Team.find({ competitionId: { $in: comps.map((c) => c._id) } }).lean();
    res.json({
        competitions: comps.map((c) => views.competitionView(c, {
            teams: allTeams.filter((t) => String(t.competitionId) === String(c._id)),
            myTeam: ours.find((t) => String(t.competitionId) === String(c._id)) || null
        }))
    });
}));

router.get('/students', wrap(async (req, res) => {
    const rows = await User.find({ organizationId: req.organization._id }).select('name email cardNumber').sort({ name: 1 }).lean();
    res.json({ students: rows.map((u) => ({ id: String(u._id), name: u.name, email: u.email, cardNumber: u.cardNumber || '' })) });
}));

router.get('/hosting', (req, res) => res.json({ canHost: Boolean(req.organization.canHostCompetitions) }));

const findCompetition = async (id, req) => {
    if (!mongoose.isValidObjectId(id)) throw fail(404, 'Competition not found.');
    const c = await Competition.findById(id);
    if (!c || c.status === 'draft') throw fail(404, 'Competition not found.');
    // Another college's own competition is not ours to see — unless we were
    // already in it from before (see the top); our own is run from Host.
    if (c.hostOrganizationId && (String(c.hostOrganizationId) === String(req.organization._id)
        || !await Team.exists({ competitionId: c._id, organizationId: req.organization._id }))) throw fail(404, 'Competition not found.');
    return c;
};

/**
 * Everyone taking part, for the competition's pop-up (asked 2026-10-28): each
 * player of each approved team — name, college, team, registration number —
 * and, once the results are published, the team's place and prize. Another
 * college's students' numbers are shown only by their last four digits.
 */
const ORD = { 1: '1st', 2: '2nd', 3: '3rd' };
const maskCard = (n) => (n ? `••••${String(n).slice(-4)}` : '');
router.get('/:id/participants', wrap(async (req, res) => {
    const c = await findCompetition(req.params.id, req);
    const teams = await Team.find({ competitionId: c._id, status: 'approved' }).lean();
    const users = await User.find({ _id: { $in: teams.flatMap((t) => t.players.map((p) => p.userId)) } }).select('name cardNumber').lean();
    const card = new Map(users.map((u) => [String(u._id), u.cardNumber || '']));
    const shown = !views.resultsHidden(c);
    const rows = teams.flatMap((t) => {
        const ours = String(t.organizationId) === String(req.organization._id);
        const place = shown ? t.place || null : null;
        const prize = place ? (c.prizes || []).find((p) => p.place === place) : null;
        return t.players.map((p) => ({
            name: p.name, college: t.collegeName, team: t.teamName, ours,
            cardNumber: ours ? card.get(String(p.userId)) || '' : maskCard(card.get(String(p.userId))),
            place, placeLabel: place ? ORD[place] : null,
            prize: prize ? [prize.title, prize.xp ? `${prize.xp} XP` : '', prize.rewardPoints ? `${prize.rewardPoints} pts` : ''].filter(Boolean).join(' · ') : null
        }));
    }).sort((a, b) => (a.place || 99) - (b.place || 99) || a.college.localeCompare(b.college) || a.name.localeCompare(b.name));
    res.json({
        dates: { registrationOpensAt: c.registrationOpensAt || c.createdAt || null, registrationDeadline: c.registrationDeadline, startsAt: c.startsAt, completedAt: c.completedAt || null },
        resultsPublished: shown,
        total: rows.length, colleges: new Set(rows.map((r) => r.college)).size,
        rows
    });
}));

router.get('/:id', wrap(async (req, res) => {
    const c = await findCompetition(req.params.id, req);
    const out = await views.detail(c._id, { organizationId: req.organization._id });
    const mine = await Team.findOne({ competitionId: c._id, organizationId: req.organization._id }).lean();
    // The coordinator sees their own team in full, whatever its status.
    out.myTeam = mine ? views.teamView(mine) : null;
    res.json(out);
}));

router.put('/:id/team', wrap(async (req, res) => {
    const c = await findCompetition(req.params.id, req);
    if (c.hostOrganizationId) throw fail(403, `${c.organizedBy}'s competition is for its own students.`);
    if (c.entry === 'individual') throw fail(409, 'Students sign up for this competition themselves, from Competitions in the student app.');
    if (!open(c)) {
        const soon = views.registration(c).phase === 'registration-soon';
        throw fail(409, soon ? `Registration opens on ${new Date(c.registrationOpensAt).toLocaleString('en-IN', { day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' })}.` : 'Registration for this competition is closed.');
    }
    const body = req.body || {};
    const teamName = String(body.teamName || '').trim().slice(0, 80);
    if (!teamName) throw fail(400, 'Give your team a name.');
    const ids = [...new Set((Array.isArray(body.players) ? body.players : []).map(String))];
    if (ids.length < c.playersPerSide) throw fail(400, `Pick at least ${c.playersPerSide} player${c.playersPerSide === 1 ? '' : 's'}.`);
    if (ids.length > c.playersPerTeam) throw fail(400, `A team has at most ${c.playersPerTeam} player${c.playersPerTeam === 1 ? '' : 's'}.`);
    if (!ids.every((id) => mongoose.isValidObjectId(id))) throw fail(400, 'Pick players from your own students.');
    const students = await User.find({ _id: { $in: ids }, organizationId: req.organization._id }).select('name').lean();
    if (students.length !== ids.length) throw fail(400, 'Every player must be one of your own students.');

    const phone = String(body.coordinatorPhone || '').trim();
    if (!/^\d{10}$/.test(phone)) throw fail(400, 'Enter the coordinator\'s 10-digit phone number.');
    const existing = await Team.findOne({ competitionId: c._id, organizationId: req.organization._id });
    if (!existing || existing.status === 'withdrawn' || existing.status === 'rejected') {
        const taken = await Team.countDocuments({ competitionId: c._id, status: { $in: ['pending', 'approved'] }, ...(existing ? { _id: { $ne: existing._id } } : {}) });
        if (taken >= c.maxTeams) throw fail(409, `This competition is full (${c.maxTeams} teams).`);
    }
    const players = ids.map((id) => ({ userId: id, name: students.find((s) => String(s._id) === id)?.name || 'Student' }));
    const fields = {
        collegeName: req.organization.name,
        teamName,
        players,
        coordinator: {
            adminId: req.admin?._id || null,
            name: String(body.coordinatorName || req.admin?.name || '').trim().slice(0, 80),
            email: req.admin?.email || '',
            phone
        },
        // Any change goes back to the platform admin to approve.
        status: 'pending',
        note: '',
        reviewedAt: null
    };
    const team = existing
        ? await Team.findByIdAndUpdate(existing._id, { $set: fields }, { returnDocument: 'after' })
        : await Team.create({ competitionId: c._id, organizationId: req.organization._id, ...fields });
    res.status(existing ? 200 : 201).json({ team: views.teamView(team) });
}));

router.delete('/:id/team', wrap(async (req, res) => {
    const c = await findCompetition(req.params.id, req);
    if (!open(c)) throw fail(409, 'Registration is closed, so the team can no longer be withdrawn here. Contact the organizer.');
    const team = await Team.findOneAndUpdate({ competitionId: c._id, organizationId: req.organization._id }, { $set: { status: 'withdrawn' } }, { returnDocument: 'after' });
    if (!team) throw fail(404, 'You have not registered a team.');
    res.json({ team: views.teamView(team) });
}));

router.put('/:id/matches/:matchId/lineup', wrap(async (req, res) => {
    const c = await findCompetition(req.params.id, req);
    if (!mongoose.isValidObjectId(req.params.matchId)) throw fail(404, 'Match not found.');
    const team = await Team.findOne({ competitionId: c._id, organizationId: req.organization._id, status: 'approved' }).lean();
    if (!team) throw fail(403, 'Your college has no approved team in this competition.');
    const match = await Match.findOne({ _id: req.params.matchId, competitionId: c._id });
    if (!match) throw fail(404, 'Match not found.');
    const side = match.sides.findIndex((s) => String(s.teamId) === String(team._id));
    if (side < 0) throw fail(403, 'Your team is not in this match.');
    if (match.status !== 'scheduled') throw fail(409, 'This match has already started.');
    const ids = [...new Set((req.body?.players || []).map(String))];
    if (ids.length !== c.playersPerSide) throw fail(400, `Choose ${c.playersPerSide} player${c.playersPerSide === 1 ? '' : 's'} for this match.`);
    if (!ids.every((id) => team.players.some((p) => String(p.userId) === id))) throw fail(400, 'Choose players from your team.');
    match.sides[side].lineup = ids;
    await match.save();
    const teams = await Team.find({ _id: { $in: match.sides.map((s) => s.teamId) } }).lean();
    res.json({ match: views.matchView(match.toObject(), teams) });
}));

module.exports = router;
