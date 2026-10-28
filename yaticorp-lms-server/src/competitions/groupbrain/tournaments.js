/**
 * Group Brain tournaments: an admin names a window of time (and a game, or
 * all of them). Every room game finished in it counts, ranked as the
 * leaderboard ranks (stats.board). Once the window has closed it is
 * finalised — by the sweeper, or by the admin — exactly once: its standings
 * are kept, the top three get their XP (the ledger's own key stops a second
 * payment) and, if it gives them, certificates.
 */
const { GroupBrainTournament } = require('./models');
const { board } = require('./stats');
const { audit } = require('./settings');
const certificates = require('./certificates');
const { ROOM_GAMES, engine } = require('../games');

const fail = (status, message) => Object.assign(new Error(message), { status });
const ORD = ['1st', '2nd', '3rd'];

const shape = (t) => ({
    id: String(t._id), name: t.name, game: t.game, gameLabel: t.game ? engine(t.game)?.label : 'All games',
    startsAt: t.startsAt, endsAt: t.endsAt, rewards: t.rewards, certificates: t.certificates,
    status: t.status === 'scheduled' ? (Date.now() < new Date(t.startsAt).getTime() ? 'upcoming' : Date.now() <= new Date(t.endsAt).getTime() ? 'live' : 'ended') : t.status,
    standings: t.standings, finalizedAt: t.finalizedAt
});

const list = async () => (await GroupBrainTournament.find({}).sort({ startsAt: -1 }).limit(100).lean()).map(shape);

/** The tournament with its live standings (kept ones once finalised). */
const one = async (id) => {
    const t = await GroupBrainTournament.findById(id).lean();
    if (!t) throw fail(404, 'Tournament not found.');
    const out = shape(t);
    if (t.status !== 'finalized') out.standings = (await board({ game: t.game, from: t.startsAt, to: t.endsAt, limit: 20 })).players;
    return out;
};

const create = async (body, admin) => {
    const name = String(body.name || '').trim().slice(0, 80);
    if (!name) throw fail(400, 'Name the tournament.');
    const game = body.game ? String(body.game) : null;
    if (game && !ROOM_GAMES.includes(game)) throw fail(400, 'Pick one of the Group Brain games, or all.');
    const startsAt = new Date(body.startsAt); const endsAt = new Date(body.endsAt);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) throw fail(400, 'It must end after it starts.');
    const rewards = (Array.isArray(body.rewards) ? body.rewards : [100, 60, 30]).slice(0, 3).map((x) => Math.max(0, Math.min(10000, Math.round(Number(x) || 0))));
    const t = await GroupBrainTournament.create({ name, game, startsAt, endsAt, rewards, certificates: body.certificates !== false, createdBy: admin?._id || null });
    await audit(admin, 'tournament.create', String(t._id), null, { name, game, startsAt, endsAt, rewards });
    return shape(t.toObject());
};

const cancel = async (id, admin, reason) => {
    const t = await GroupBrainTournament.findOneAndUpdate({ _id: id, status: 'scheduled' }, { $set: { status: 'cancelled' } }, { returnDocument: 'after' }).lean();
    if (!t) throw fail(409, 'Only a tournament not yet finalised can be cancelled.');
    await audit(admin, 'tournament.cancel', id, null, null, reason);
    return shape(t);
};

/** Finalise: once. `force` lets an admin close one early. */
const finalize = async (id, admin = null, { force = false } = {}) => {
    const t0 = await GroupBrainTournament.findById(id).lean();
    if (!t0) throw fail(404, 'Tournament not found.');
    if (!force && Date.now() < new Date(t0.endsAt).getTime()) throw fail(409, 'It has not ended yet.');
    const standings = (await board({ game: t0.game, from: t0.startsAt, to: force ? new Date() : t0.endsAt, limit: 50 })).players;
    const t = await GroupBrainTournament.findOneAndUpdate({ _id: id, status: 'scheduled' }, { $set: { status: 'finalized', finalizedAt: new Date(), standings } }, { returnDocument: 'after' }).lean();
    if (!t) throw fail(409, 'It is already finalised or cancelled.');
    const { addXp } = require('../../rewards/services/xpService');
    for (const p of standings.slice(0, 3)) {
        const i = p.rank - 1;
        if (t.rewards[i]) await addXp({ userId: p.userId, amount: t.rewards[i], source: 'group_brain_tournament', refId: `${id}:${p.rank}`, description: `for ${ORD[i]} place in ${t.name}` }).catch(() => {});
        if (t.certificates) {
            await certificates.issue({ userId: p.userId, name: p.name, title: `${ORD[i]} Place`, line: `in the Group Brain tournament ${t.name}`, eventName: t.name, rank: p.rank, ruleKey: `tournament:${id}` })
                .catch((err) => { if (err?.code !== 11000) throw err; });
        }
    }
    await audit(admin, 'tournament.finalize', id, null, { standings: standings.slice(0, 3).map((p) => ({ rank: p.rank, name: p.name, points: p.points })) });
    return shape(t);
};

/** Finalise every tournament whose window has closed (the sweeper). */
const finalizeDue = async () => {
    const due = await GroupBrainTournament.find({ status: 'scheduled', endsAt: { $lte: new Date() } }).select('_id').lean();
    for (const t of due) await finalize(t._id).catch((err) => { if (err.status !== 409) console.warn('[group brain] finalising a tournament failed:', err.message); });
    return due.length;
};

module.exports = { list, one, create, cancel, finalize, finalizeDue };
