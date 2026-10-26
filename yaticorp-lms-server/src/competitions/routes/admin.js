/**
 * Running competitions: creating them, approving teams, drawing and deciding
 * matches. One set of routes, mounted twice:
 *
 *   /admin       the platform admin (superadmin) — every competition
 *   /org/host    an organization admin hosting its own — only the
 *                competitions their organization created (hostOrganizationId)
 *
 *   GET    /                               my competitions (all, for the platform), with counts
 *   POST   /                               create one (a draft, or published with { open: true })
 *   POST   /banner                         upload a banner image → { url }
 *   GET    /:id                            in full: all teams (any status, with contacts) and every match
 *   PUT    /:id                            edit (the game and the format only until the matches are drawn)
 *   POST   /:id/status                     { status: 'registration' | 'closed' | 'cancelled' | 'draft' }
 *   DELETE /:id                            delete it for good, with its teams, matches and games
 *   PUT    /:id/teams/:teamId              { status: 'approved' | 'rejected', note }
 *
 *   A college's own competition (hostOrganizationId) is for its students
 *   only; nobody registers — the college makes the teams, until the draw:
 *   GET    /:id/students                   the college's students, to pick from
 *   POST   /:id/teams                      a team { teamName, players: [userId] }, approved as made
 *   PATCH  /:id/teams/:teamId              change its name or players
 *   DELETE /:id/teams/:teamId              take it out
 *
 *   POST   /:id/draw                       draw round 1 { firstMatchAt?, gapMinutes? }
 *   PUT    /:id/matches/:matchId           { scheduledAt }
 *   POST   /:id/matches/:matchId/start     open the match's game now
 *   POST   /:id/matches/:matchId/result    decide it { winnerTeamId, order?, note? }
 *   POST   /:id/award                      issue the prizes again (safe to repeat)
 *
 *   A quiz or a hackathon (services/challengeService.js) has no draw or matches:
 *   POST   /:id/finish                     decide it now: a quiz closes; a hackathon publishes its results
 *   PUT    /:id/submissions/:subId         a hackathon project's marks { score (0–100), feedback }
 */
const express = require('express');
const mongoose = require('mongoose');
const Competition = require('../models/Competition');
const Team = require('../models/Team');
const Match = require('../models/Match');
const User = require('../../models/User');
const views = require('../services/views');
const bracket = require('../services/bracketService');
const { gameOptions } = require('../services/gameService');
const { upload: imageUpload } = require('../../middleware/uploadMiddleware');
const challenge = require('../services/challengeService');

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch((err) => {
    if (err?.status) return res.status(err.status).json({ message: err.message });
    if (err?.name === 'ValidationError') return res.status(400).json({ message: Object.values(err.errors)[0]?.message || 'Check the details.' });
    next(err);
});
const fail = (status, message) => Object.assign(new Error(message), { status });
const num = (v, lo, hi, dflt) => (v == null || v === '' || Number.isNaN(Number(v)) ? dflt : Math.max(lo, Math.min(hi, Math.round(Number(v)))));

/** The competition fields from a form, checked and made to fit its game. */
const fromBody = (body, current = null) => {
    const b = body || {};
    const game = String(b.game ?? current?.game ?? '');
    // UNO, Ludo and Carrom are no longer offered (2026-10-23); one made before then can still be edited.
    const quizOrHackathon = challenge.CHALLENGES.includes(game);
    if (!require('../games').IDS.includes(game) && !quizOrHackathon && !(current && game === current.game)) throw fail(400, 'Choose the game: Chess, a Quiz or a Hackathon (Ludo and Carrom are no longer offered).');
    const name = String(b.name ?? current?.name ?? '').trim();
    if (!name) throw fail(400, 'Give the competition a name.');
    const startsAt = new Date(b.startsAt ?? current?.startsAt);
    const registrationDeadline = new Date(b.registrationDeadline ?? current?.registrationDeadline);
    if (Number.isNaN(startsAt.getTime())) throw fail(400, 'Set the date and time it starts.');
    if (Number.isNaN(registrationDeadline.getTime())) throw fail(400, 'Set the registration deadline.');
    if (registrationDeadline > startsAt) throw fail(400, 'Registration has to close before the competition starts.');
    const opensRaw = b.registrationOpensAt !== undefined ? b.registrationOpensAt : current?.registrationOpensAt;
    const registrationOpensAt = opensRaw ? new Date(opensRaw) : null;
    if (registrationOpensAt && Number.isNaN(registrationOpensAt.getTime())) throw fail(400, 'That registration start is not a date.');
    if (registrationOpensAt && registrationOpensAt > registrationDeadline) throw fail(400, 'Registration has to open before it closes.');
    const bannerUrl = String(b.bannerUrl ?? current?.bannerUrl ?? '').trim();
    if (bannerUrl && !/^https?:\/\//.test(bannerUrl)) throw fail(400, 'The banner must be an uploaded image.');

    // A quiz or a hackathon: when it closes, who enters, and its questions or problem.
    const extra = quizOrHackathon ? challenge.fieldsFrom(game, b, current, startsAt) : { entry: 'team', endsAt: null };
    const solo = extra.entry === 'individual';
    // What each game allows: two teams a match for chess and carrom, up to
    // four for ludo; doubles only in carrom.
    const teamsPerMatch = ['chess', 'carrom'].includes(game) || quizOrHackathon ? 2 : num(b.teamsPerMatch ?? current?.teamsPerMatch, 2, 4, 4);
    const playersPerSide = game === 'carrom' ? num(b.playersPerSide ?? current?.playersPerSide, 1, 2, 1) : 1;
    const playersPerTeam = solo ? 1 : Math.max(playersPerSide, num(b.playersPerTeam ?? current?.playersPerTeam, 1, 10, playersPerSide));
    const prizes = (Array.isArray(b.prizes) ? b.prizes : current?.prizes || [])
        .filter((p) => [1, 2, 3].includes(Number(p?.place)))
        .map((p) => ({ place: Number(p.place), title: String(p.title || '').slice(0, 120), xp: num(p.xp, 0, 100000, 0), rewardPoints: num(p.rewardPoints, 0, 100000, 0), description: String(p.description || '').slice(0, 300) }));
    return {
        name: name.slice(0, 140),
        organizedBy: String(b.organizedBy ?? current?.organizedBy ?? 'YATICORP').trim().slice(0, 140) || 'YATICORP',
        description: String(b.description ?? current?.description ?? '').slice(0, 2000),
        game,
        startsAt,
        registrationOpensAt,
        registrationDeadline,
        bannerUrl: bannerUrl.slice(0, 600),
        // Students on their own: up to 5,000 may sign up.
        maxTeams: solo ? num(b.maxTeams ?? current?.maxTeams, 2, 5000, 500) : num(b.maxTeams ?? current?.maxTeams, 2, 256, 16),
        ...extra,
        playersPerTeam,
        playersPerSide,
        teamsPerMatch,
        gameOptions: gameOptions(game, b.gameOptions ?? current?.gameOptions ?? {}),
        rules: String(b.rules ?? current?.rules ?? '').slice(0, 5000),
        prizes: [...new Map(prizes.map((p) => [p.place, p])).values()].sort((x, y) => x.place - y.place),
        prizeDetails: String(b.prizeDetails ?? current?.prizeDetails ?? '').trim().slice(0, 600),
        participationXp: num(b.participationXp ?? current?.participationXp, 0, 10000, 0),
        certificates: b.certificates == null ? current?.certificates !== false : !!b.certificates,
        participationCertificates: b.participationCertificates == null ? current?.participationCertificates !== false : !!b.participationCertificates
    };
};

/**
 * The routes, for `scope` 'platform' (every competition) or 'organization'
 * (the caller's organization's own, req.organization).
 */
const manage = (scope = 'platform') => {
    const router = express.Router();

    /** The competitions this caller may run: all of them, or their organization's. */
    const filterFor = (req) => (scope === 'organization' ? { hostOrganizationId: req.organization._id } : {});

    const find = async (id, req) => {
        if (!mongoose.isValidObjectId(id)) throw fail(404, 'Competition not found.');
        const c = await Competition.findOne({ _id: id, ...filterFor(req) });
        if (!c) throw fail(404, 'Competition not found.');
        return c;
    };

    router.get('/', wrap(async (req, res) => {
        await challenge.advanceDue();
        const comps = await Competition.find(filterFor(req)).sort({ createdAt: -1 }).lean();
        const [teams, matches] = await Promise.all([
            Team.find({ competitionId: { $in: comps.map((c) => c._id) } }).select('competitionId status teamName collegeName players').lean(),
            Match.find({ competitionId: { $in: comps.map((c) => c._id) } }).select('competitionId status needsDecision').lean()
        ]);
        res.json({
            competitions: comps.map((c) => {
                const t = teams.filter((x) => String(x.competitionId) === String(c._id));
                const m = matches.filter((x) => String(x.competitionId) === String(c._id));
                return {
                    ...views.competitionView(c, { teams: t }),
                    counts: {
                        pending: t.filter((x) => x.status === 'pending').length,
                        approved: t.filter((x) => x.status === 'approved').length,
                        live: m.filter((x) => x.status === 'live').length,
                        needsDecision: m.filter((x) => x.needsDecision).length
                    }
                };
            })
        });
    }));

    router.post('/', wrap(async (req, res) => {
        const fields = fromBody(req.body);
        // An organization hosts its own: it is named as the organizer unless it
        // says otherwise, and it alone (with the platform admin) can run it.
        const host = scope === 'organization'
            ? { hostOrganizationId: req.organization._id, organizedBy: String(req.body?.organizedBy || '').trim() ? fields.organizedBy : req.organization.name }
            : {};
        const c = await Competition.create({ ...fields, ...host, status: req.body?.open ? 'registration' : 'draft', createdBy: req.admin?._id || null });
        res.status(201).json(await views.detail(c._id, { admin: true }));
    }));

    router.post('/banner', imageUpload.single('image'), wrap(async (req, res) => {
        if (!req.file) throw fail(400, 'Choose an image for the banner.');
        const { uploadToBunny } = require('../../utils/bunnyStorage');
        const url = await uploadToBunny(req.file.buffer, req.file.originalname, 'competition-banners');
        res.json({ url });
    }));

    router.get('/:id', wrap(async (req, res) => {
        await challenge.advanceDue();
        const c = await find(req.params.id, req);
        if (c.status === 'live' && !challenge.isChallenge(c)) await bracket.openDue(c._id);
        res.json(await views.detail(c._id, { admin: true }));
    }));

    router.put('/:id', wrap(async (req, res) => {
        const c = await find(req.params.id, req);
        if (['completed', 'cancelled'].includes(c.status)) throw fail(409, 'A finished or cancelled competition cannot be edited.');
        const fields = fromBody(req.body, c.toObject());
        // Once teams are in, who enters stays; once anyone has started the quiz, its questions stay.
        if (fields.entry !== (c.entry || 'team') && await Team.exists({ competitionId: c._id, status: { $ne: 'withdrawn' } })) throw fail(409, 'Entries have come in, so who enters can no longer change.');
        if (c.game === 'quiz' && fields.game === 'quiz' && await require('../models/QuizAttempt').exists({ competitionId: c._id })) {
            const plain = (qs) => JSON.stringify((qs || []).map((q) => [q.prompt, q.options, q.answer, q.points || 1]));
            if (plain(fields.quiz.questions) !== plain(c.quiz?.questions)) throw fail(409, 'Players have started the quiz, so its questions can no longer change.');
        }
        const drawn = await Match.exists({ competitionId: c._id });
        if (drawn) {
            for (const k of ['game', 'teamsPerMatch', 'playersPerSide', 'playersPerTeam']) {
                if (String(fields[k]) !== String(c[k])) throw fail(409, 'The game and the team format cannot change once the matches are drawn.');
            }
        }
        Object.assign(c, fields);
        await c.save();
        res.json(await views.detail(c._id, { admin: true }));
    }));

    router.post('/:id/status', wrap(async (req, res) => {
        const c = await find(req.params.id, req);
        const to = String(req.body?.status || '');
        const allowed = {
            draft: ['registration', 'cancelled'],
            registration: ['closed', 'draft', 'cancelled'],
            closed: ['registration', 'cancelled'],
            live: ['cancelled'],
            completed: [],
            cancelled: []
        }[c.status] || [];
        if (!allowed.includes(to)) throw fail(409, `A competition that is ${c.status} cannot be moved to ${to || 'that'}.`);
        if (to === 'draft' && await Team.exists({ competitionId: c._id, status: { $ne: 'withdrawn' } })) throw fail(409, 'Colleges have registered, so it cannot go back to draft.');
        if (to === 'registration' && await Match.exists({ competitionId: c._id })) throw fail(409, 'The matches are drawn; registration cannot reopen.');
        c.status = to;
        await c.save();
        if (to === 'cancelled') {
            await require('../models/PlayGame').updateMany({ competitionId: c._id, status: { $in: ['waiting', 'active'] } },
                { $set: { status: 'abandoned', finishedAt: new Date(), nextDeadline: null }, $inc: { version: 1 } });
            const entered = await Team.find({ competitionId: c._id, status: { $in: ['pending', 'approved'] } }).lean();
            await require('../services/notices').tellTeams(entered, c, 'Competition cancelled', `${c.name} has been cancelled by the organizer. Any games still running have ended.`);
        }
        res.json(await views.detail(c._id, { admin: true }));
    }));

    // Whatever its state: the organizer's page asks first, and says what goes
    // with it (registrations, results, certificates). Games in progress end;
    // prizes already given stay with the students.
    router.delete('/:id', wrap(async (req, res) => {
        const c = await find(req.params.id, req);
        const PlayGame = require('../models/PlayGame');
        // Its players are told before the teams go; the notice opens the
        // Games page, since the competition's own page is gone.
        const entered = await Team.find({ competitionId: c._id, status: { $in: ['pending', 'approved'] } }).lean();
        await Competition.deleteOne({ _id: c._id });
        await require('../services/notices').tellTeams(entered, c, 'Competition removed', `${c.name} has been removed by the organizer.`, { link: '/competitions' });
        await Promise.all([Team.deleteMany({ competitionId: c._id }), Match.deleteMany({ competitionId: c._id }), PlayGame.deleteMany({ competitionId: c._id })]);
        res.json({ deleted: true });
    }));

    router.put('/:id/teams/:teamId', wrap(async (req, res) => {
        const c = await find(req.params.id, req);
        if (!mongoose.isValidObjectId(req.params.teamId)) throw fail(404, 'Team not found.');
        if (await Match.exists({ competitionId: c._id })) throw fail(409, 'The matches are drawn; teams can no longer change.');
        const status = String(req.body?.status || '');
        if (!['approved', 'rejected'].includes(status)) throw fail(400, 'Approve or reject the team.');
        if (status === 'approved') {
            const approved = await Team.countDocuments({ competitionId: c._id, status: 'approved', _id: { $ne: req.params.teamId } });
            if (approved >= c.maxTeams) throw fail(409, `Already ${c.maxTeams} approved teams — the limit.`);
        }
        const team = await Team.findOneAndUpdate(
            { _id: req.params.teamId, competitionId: c._id, status: { $in: ['pending', 'approved', 'rejected'] } },
            { $set: { status, note: String(req.body?.note || '').slice(0, 500), reviewedAt: new Date() } },
            { returnDocument: 'after' }
        );
        if (!team) throw fail(404, 'Team not found.');
        const { tellTeams } = require('../services/notices');
        if (status === 'approved') {
            const { when } = require('../services/notices');
            await tellTeams([team], c, 'Your team is in', challenge.isChallenge(c)
                ? `${team.teamName} is approved for ${c.name}. It opens on ${when(c.startsAt)} in Competitions.`
                : `${team.teamName} is approved for ${c.name}. Your matches will appear in Competitions.`);
        } else {
            // A team turned down used to hear nothing at all.
            await tellTeams([team], c, 'Your team was not accepted', `${team.teamName} was not accepted for ${c.name}.${team.note ? ` Note from the organizer: ${team.note}` : ''}`);
        }
        res.json({ team: views.teamView(team, { admin: true }) });
    }));

    /* ── A college's own competition: the college makes the teams ── */

    const ownCompetition = async (req, { changing = true } = {}) => {
        const c = await find(req.params.id, req);
        if (!c.hostOrganizationId) throw fail(400, 'Colleges register their own teams for this competition.');
        if (c.entry === 'individual') throw fail(400, 'Students sign up for this competition themselves.');
        if (changing) {
            if (['completed', 'cancelled'].includes(c.status)) throw fail(409, 'A finished or cancelled competition cannot change.');
            if (await Match.exists({ competitionId: c._id })) throw fail(409, 'The matches are drawn; teams can no longer change.');
        }
        return c;
    };
    const teamName = (body) => {
        const name = String(body?.teamName || '').trim().slice(0, 80);
        if (!name) throw fail(400, 'Give the team a name.');
        return name;
    };
    /** The players picked: the college's own students, each in one team only. */
    const ownPlayers = async (c, body, exceptTeamId = null) => {
        const ids = [...new Set((Array.isArray(body?.players) ? body.players : []).map(String))];
        if (ids.length < c.playersPerSide) throw fail(400, `Pick at least ${c.playersPerSide} player${c.playersPerSide === 1 ? '' : 's'}.`);
        if (ids.length > c.playersPerTeam) throw fail(400, `A team has at most ${c.playersPerTeam} player${c.playersPerTeam === 1 ? '' : 's'}.`);
        if (!ids.every((x) => mongoose.isValidObjectId(x))) throw fail(400, 'Pick players from the college\'s own students.');
        const students = await User.find({ _id: { $in: ids }, organizationId: c.hostOrganizationId }).select('name').lean();
        if (students.length !== ids.length) throw fail(400, 'Every player must be one of the college\'s own students.');
        const clash = await Team.findOne({ competitionId: c._id, status: { $ne: 'withdrawn' }, 'players.userId': { $in: ids }, ...(exceptTeamId ? { _id: { $ne: exceptTeamId } } : {}) }).lean();
        if (clash) {
            const who = clash.players.find((p) => ids.includes(String(p.userId)));
            throw fail(409, `${who?.name || 'A player'} is already in ${clash.teamName}.`);
        }
        return ids.map((x) => ({ userId: x, name: students.find((st) => String(st._id) === x)?.name || 'Student' }));
    };
    const tellPlayers = async (c, team, userIds) => {
        const { tell } = require('../services/notices');
        await tell(userIds, c, 'You are in a team', `You play for ${team.teamName} in ${c.name}. Your matches will appear in Games & Competitions.`);
    };

    router.get('/:id/students', wrap(async (req, res) => {
        const c = await ownCompetition(req, { changing: false });
        const rows = await User.find({ organizationId: c.hostOrganizationId }).select('name email cardNumber').sort({ name: 1 }).lean();
        res.json({ students: rows.map((st) => ({ id: String(st._id), name: st.name, email: st.email, cardNumber: st.cardNumber || '' })) });
    }));

    router.post('/:id/teams', wrap(async (req, res) => {
        const c = await ownCompetition(req);
        const name = teamName(req.body);
        const players = await ownPlayers(c, req.body);
        if (await Team.countDocuments({ competitionId: c._id, status: 'approved' }) >= c.maxTeams) throw fail(409, `Already ${c.maxTeams} teams — the limit.`);
        await Team.dropOldIndex();
        const college = await require('../../organizations/models/Organization').findById(c.hostOrganizationId).select('name').lean();
        let team = null;
        // Numbered after the last one; two made at once take the next number.
        for (let tries = 0; tries < 5 && !team; tries++) {
            const last = await Team.findOne({ competitionId: c._id, organizationId: c.hostOrganizationId }).sort({ entry: -1 }).select('entry').lean();
            try {
                team = await Team.create({
                    competitionId: c._id, organizationId: c.hostOrganizationId, entry: (last?.entry || 0) + 1,
                    collegeName: college?.name || c.organizedBy, teamName: name, players, status: 'approved', reviewedAt: new Date(),
                    coordinator: { adminId: req.admin?._id || null, name: req.admin?.name || '', email: req.admin?.email || '' }
                });
            } catch (err) {
                if (err?.code !== 11000) throw err;
            }
        }
        if (!team) throw fail(409, 'Could not add the team just now. Try again.');
        await tellPlayers(c, team, players.map((p) => p.userId));
        res.status(201).json(await views.detail(c._id, { admin: true }));
    }));

    router.patch('/:id/teams/:teamId', wrap(async (req, res) => {
        const c = await ownCompetition(req);
        if (!mongoose.isValidObjectId(req.params.teamId)) throw fail(404, 'Team not found.');
        const team = await Team.findOne({ _id: req.params.teamId, competitionId: c._id });
        if (!team) throw fail(404, 'Team not found.');
        const before = team.players.map((p) => String(p.userId));
        team.teamName = teamName(req.body);
        team.players = await ownPlayers(c, req.body, team._id);
        await team.save();
        const after = team.players.map((p) => String(p.userId));
        await tellPlayers(c, team, after.filter((x) => !before.includes(x)));
        await require('../services/notices').tell(before.filter((x) => !after.includes(x)), c, 'You are no longer in a team', `You were taken off ${team.teamName} in ${c.name}.`);
        res.json(await views.detail(c._id, { admin: true }));
    }));

    router.delete('/:id/teams/:teamId', wrap(async (req, res) => {
        const c = await ownCompetition(req);
        if (!mongoose.isValidObjectId(req.params.teamId)) throw fail(404, 'Team not found.');
        const gone = await Team.findOneAndDelete({ _id: req.params.teamId, competitionId: c._id });
        if (!gone) throw fail(404, 'Team not found.');
        await require('../services/notices').tellTeams([gone], c, 'Your team was withdrawn', `${gone.teamName} is no longer in ${c.name}.`);
        res.json(await views.detail(c._id, { admin: true }));
    }));

    router.post('/:id/draw', wrap(async (req, res) => {
        const c = await find(req.params.id, req);
        if (challenge.isChallenge(c)) throw fail(409, 'A quiz or a hackathon has no matches to draw: it opens by itself when it starts.');
        if (!['registration', 'closed'].includes(c.status)) throw fail(409, 'Close registration first, then draw the matches.');
        if (c.status === 'registration') { c.status = 'closed'; await c.save(); }
        await bracket.drawBracket(c, { firstMatchAt: req.body?.firstMatchAt || null, gapMinutes: req.body?.gapMinutes || 0 });
        res.json(await views.detail(c._id, { admin: true }));
    }));

    const findMatch = async (c, matchId) => {
        if (!mongoose.isValidObjectId(matchId)) throw fail(404, 'Match not found.');
        const m = await Match.findOne({ _id: matchId, competitionId: c._id });
        if (!m) throw fail(404, 'Match not found.');
        return m;
    };

    router.put('/:id/matches/:matchId', wrap(async (req, res) => {
        const c = await find(req.params.id, req);
        const m = await findMatch(c, req.params.matchId);
        if (m.status !== 'scheduled') throw fail(409, 'Only a match that has not started can be rescheduled.');
        const at = req.body?.scheduledAt ? new Date(req.body.scheduledAt) : null;
        if (at && Number.isNaN(at.getTime())) throw fail(400, 'That is not a date and time.');
        const moved = String(m.scheduledAt || '') !== String(at || '');
        m.scheduledAt = at;
        await m.save();
        if (moved) {
            const { tellTeams, when } = require('../services/notices');
            const teams = await Team.find({ _id: { $in: m.sides.map((s) => s.teamId) } }).lean();
            await tellTeams(teams, c, 'Match time changed', at
                ? `${c.name}: your ${m.roundName || 'match'} is now on ${when(at)}.`
                : `${c.name}: your ${m.roundName || 'match'} no longer has a set time. The organizer will start it.`);
        }
        res.json(await views.detail(c._id, { admin: true }));
    }));

    router.post('/:id/matches/:matchId/start', wrap(async (req, res) => {
        const c = await find(req.params.id, req);
        if (c.status !== 'live') throw fail(409, 'The competition is not running.');
        const m = await findMatch(c, req.params.matchId);
        if (m.status !== 'scheduled') throw fail(409, 'This match has already started.');
        await bracket.openMatch(m);
        res.json(await views.detail(c._id, { admin: true }));
    }));

    router.post('/:id/matches/:matchId/result', wrap(async (req, res) => {
        const c = await find(req.params.id, req);
        if (c.status !== 'live') throw fail(409, 'The competition is not running.');
        const m = await findMatch(c, req.params.matchId);
        if (!['scheduled', 'live'].includes(m.status)) throw fail(409, 'This match has already been decided.');
        await bracket.adminResult(m, { winnerTeamId: req.body?.winnerTeamId, order: req.body?.order || [], note: String(req.body?.note || '').slice(0, 300) });
        res.json(await views.detail(c._id, { admin: true }));
    }));

    /* ── A quiz or a hackathon ── */

    router.post('/:id/finish', wrap(async (req, res) => {
        await challenge.advanceDue();
        const c = await find(req.params.id, req);
        await challenge.finish(c.toObject());
        res.json(await views.detail(c._id, { admin: true }));
    }));

    router.put('/:id/submissions/:subId', wrap(async (req, res) => {
        const c = await find(req.params.id, req);
        const project = await challenge.judge(c.toObject(), req.params.subId, req.body || {});
        res.json({ project });
    }));

    router.post('/:id/award', wrap(async (req, res) => {
        const c = await find(req.params.id, req);
        if (c.status !== 'completed') throw fail(409, 'Prizes go out once the competition is complete.');
        await require('../services/awardService').award(c);
        res.json(await views.detail(c._id, { admin: true }));
    }));

    return router;
};

module.exports = manage;
