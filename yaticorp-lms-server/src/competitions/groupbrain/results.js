/**
 * What a finished Group Brain room game leaves behind, written once.
 *
 * When a room's game finishes (gameService's `finished`), `record` claims it
 * (PlayGame.recordedAt, set only if unset, so two servers or two polls cannot
 * both record it) and writes one GroupBrainResult per player, from the
 * engine's own state — scores are never taken from a browser. Then:
 *
 *   chess rating   Elo (K 32) for both players, on the profile
 *   XP             from the settings, through the LMS's XP ledger (keyed by
 *                  game and player, so it can never be paid twice) — held
 *                  instead when the result is flagged, until an admin looks
 *   flags          answers faster than a person can, a Sudoku solved too
 *                  fast, the same players finishing too many rooms a day
 *
 * A game that finished while recording failed (a restart, a lost database
 * connection) is picked up again by `backfill`, from the sweeper.
 *
 * The Brain Performance Score each result feeds is a measure of how a
 * player does in these games, not an IQ score.
 */
const PlayGame = require('../models/PlayGame');
const { engine } = require('../games');
const { GroupBrainResult, GroupBrainProfile } = require('./models');
const { getSettings, audit } = require('./settings');

const SKILL = {
    memorymatrix: 'memory', sequence: 'memory',
    patternmaster: 'reasoning', numberlogic: 'reasoning', wordlogic: 'reasoning', deduction: 'reasoning', sudoku: 'reasoning',
    spatialiq: 'spatial',
    chess: 'strategy',
    finalvault: 'reasoning', lostkingdom: 'reasoning',
    // The solo games added as group games (2026-10-29): words and numbers, reasoning.
    ...Object.fromEntries(require('../games/soloquiz').SOLO_QUIZ.map((id) => [id, 'reasoning'])),
    ...Object.fromEntries(require('../games/race').RACE.map((id) => [id, id === 'memorymatch' ? 'memory' : 'reasoning'])),
    tictactoe: 'strategy', laststone: 'strategy'
};
const K = 32;

/** What one seat did, from the engine's state: score, right answers out of how many, time. */
const summarize = (game, seat) => {
    const s = game.state || {};
    if (game.game === 'chess') return { score: 0, correct: 0, total: 0, accuracy: null, timeMs: 0 };
    if (game.game === 'sudoku') {
        const empty = s.puzzle.filter((v) => !v).length;
        const filled = s.boards[seat].filter(Boolean).length - (81 - empty);
        const mistakes = s.mistakes[seat] || 0;
        return {
            score: s.scores[seat], correct: filled, total: empty,
            accuracy: empty ? (filled / empty) * (filled / Math.max(1, filled + mistakes)) : 0,
            timeMs: s.finishedAt[seat] != null ? s.finishedAt[seat] - s.startedAt : (s.finishedAtGame || 0) - s.startedAt
        };
    }
    // The adventure games: stages cleared of all, or tiles crossed of the corridor.
    if (s.shared && s.progress) {
        const p = s.progress[seat];
        const of = s.shared.stages ? s.shared.stages.length : s.shared.length;
        const at = s.shared.stages ? p.stage : p.at;
        return { score: s.scores[seat], correct: at, total: of, accuracy: of ? at / of : 0, timeMs: p.doneMs ?? s.runMs };
    }
    const total = Array.isArray(s.questions) ? s.questions.length : s.rounds || 0;
    const correct = s.correct?.[seat] || 0;
    return { score: s.scores?.[seat] || 0, correct, total, accuracy: total ? correct / total : 0, timeMs: s.fastMs?.[seat] ?? s.timeMs?.[seat] ?? 0 };
};

/** 0–100: how well a seat did — mostly what it got right, partly where it placed. */
const performanceOf = (game, sum, place, players, won, draw) => {
    if (game.game === 'chess') return won ? 100 : draw ? 50 : 0;
    const placeScore = players > 1 && place ? (players - place) / (players - 1) : 1;
    return Math.round(100 * (0.7 * (sum.accuracy || 0) + 0.3 * placeScore));
};

/** Why a seat's result looks wrong, if it does. */
const flagsOf = (game, seat, sum, rules) => {
    const s = game.state || {};
    const flags = [];
    if (Array.isArray(s.questions) && Array.isArray(s.answers)) {
        const tries = s.answers.map((q) => q?.[seat]?.[0]).filter(Boolean);
        if (tries.length >= 5 && tries.every((t) => t.correct && t.ms < rules.fastAnswerMs)) flags.push('answers-too-fast');
    }
    if (game.game === 'sequence' && Array.isArray(s.log)) {
        if (s.log.some((r) => r.results?.[seat]?.detail?.ms != null && r.results[seat].detail.ms < rules.reactionMs)) flags.push('reaction-too-fast');
    }
    if (game.game === 'sudoku' && s.finishedAt?.[seat] != null && s.finishedAt[seat] - s.startedAt < rules.sudokuSeconds * 1000) flags.push('sudoku-too-fast');
    return flags;
};

/** The same set of players finishing more rooms than allowed in a day: XP farming. */
const farming = async (game, limit) => {
    if (!limit) return false;
    const ids = game.seats.map((x) => x.userId);
    const n = await PlayGame.countDocuments({
        kind: 'room', status: 'finished', finishedAt: { $gte: new Date(Date.now() - 86400000) },
        seats: { $size: ids.length }, 'seats.userId': { $all: ids }
    });
    return n > limit;
};

const expected = (a, b) => 1 / (1 + 10 ** ((b - a) / 400));

/** Chess: both ratings, from the result. Returns { [userId]: [before, after] }. */
const rateChess = async (game, rows) => {
    if (game.game !== 'chess' || rows.length !== 2) return {};
    const profiles = await Promise.all(rows.map((r) => GroupBrainProfile.findOneAndUpdate({ userId: r.userId }, { $setOnInsert: { userId: r.userId } }, { upsert: true, returnDocument: 'after' }).lean()));
    const [a, b] = profiles.map((p) => p.chessRating);
    const scoreA = rows[0].won ? 1 : rows[0].draw ? 0.5 : 0;
    const da = Math.round(K * (scoreA - expected(a, b)));
    const deltas = [da, -da];
    const out = {};
    await Promise.all(rows.map((r, i) => {
        out[String(r.userId)] = [profiles[i].chessRating, profiles[i].chessRating + deltas[i]];
        return GroupBrainProfile.updateOne({ userId: r.userId }, { $inc: { chessRating: deltas[i], chessGames: 1 } });
    }));
    return out;
};

/** The XP a result earns, by the settings. */
/** XP for winning because everyone else left. */
const LEFT_WIN_XP = 100;
/** XP by finishing place: 1st most, then less (settings.xp); a player who resigned gets none. */
const xpFor = (row, xp) => (row.resigned ? 0 : [xp.first, xp.second, xp.third, xp.fourth][row.place - 1] || 0);

const pay = async (row, amount, label) => {
    const { addXp } = require('../../rewards/services/xpService');
    const r = await addXp({ userId: row.userId, amount, source: 'group_brain', refId: `${row.gameId}`, description: `in Group Brain (${label})`, silent: true });
    return !r.skipped;
};

/** Record one finished room game: once, whoever calls. */
const record = async (game) => {
    if (game?.kind !== 'room' || game.status !== 'finished') return null;
    const claimed = await PlayGame.findOneAndUpdate({ _id: game._id, recordedAt: null, status: 'finished' }, { $set: { recordedAt: new Date() } }, { returnDocument: 'after' });
    if (!claimed) return null;
    try {
        const settings = await getSettings();
        const places = claimed.outcome?.places || [];
        const players = claimed.seats.length;
        const label = engine(claimed.game)?.label || claimed.game;
        const farmed = await farming(claimed, settings.suspicious.sameOpponentsPerDay);
        let rows = claimed.seats.map((seat, i) => {
            const k = places.findIndex((g) => g.includes(seat.side));
            const place = k >= 0 ? k + 1 : players;
            const won = k === 0 && places[0].length === 1;
            const draw = k === 0 && places[0].length > 1;
            const sum = summarize(claimed, i);
            const flags = [...flagsOf(claimed, i, sum, settings.suspicious), ...(farmed ? ['repeated-opponents'] : [])];
            return {
                gameId: claimed._id, userId: seat.userId, name: seat.name, game: claimed.game,
                difficulty: claimed.options?.difficulty || 'medium', skill: SKILL[claimed.game], players,
                // Left the game: resigned (chess says so in its reason), or out of a game for many.
                place, won, draw, resigned: (claimed.state?.out || []).includes(i) || (claimed.game === 'chess' && !won && !draw && /resign/i.test(claimed.outcome?.reason || '')),
                score: sum.score, correct: sum.correct, total: sum.total, accuracy: sum.accuracy ?? 0, timeMs: Math.max(0, sum.timeMs || 0),
                performance: performanceOf(claimed, sum, place, players, won, draw),
                reason: claimed.outcome?.reason || '', flags,
                finishedAt: claimed.finishedAt || new Date()
            };
        });
        const ratings = await rateChess(claimed, rows);
        // Everyone else left the game (asked 2026-10-27): the winner gets 100 XP,
        // the ones who left none, and the reason says who left.
        const othersLeft = rows.some((r) => r.won) && rows.filter((r) => !r.won).every((r) => r.resigned);
        if (othersLeft) {
            const leavers = rows.filter((r) => r.resigned).map((r) => r.name).join(', ');
            const winner = rows.find((r) => r.won).name;
            rows = rows.map((r) => ({ ...r, reason: `${leavers} left the game, so ${winner} won.` }));
        }
        rows = rows.map((r) => {
            const xp = othersLeft ? (r.won ? LEFT_WIN_XP : 0) : xpFor(r, settings.xp);
            const rating = ratings[String(r.userId)];
            // A win because the others left is paid even against the same opponents again (asked); other flags still hold it.
            const holds = othersLeft ? r.flags.filter((f) => f !== 'repeated-opponents') : r.flags;
            return { ...r, xp, xpStatus: !xp ? 'none' : holds.length ? 'held' : 'paid', ratingBefore: rating?.[0] ?? null, ratingAfter: rating?.[1] ?? null };
        });
        try { await GroupBrainResult.insertMany(rows, { ordered: false }); }
        catch (err) { if (err?.code !== 11000 && !err?.writeErrors?.every((e) => e.code === 11000)) throw err; }
        for (const r of rows) {
            if (r.xpStatus === 'paid') await pay(r, r.xp, label).catch((err) => console.warn('[group brain] XP failed:', err.message));
        }
        return rows;
    } catch (err) {
        // Not recorded: free it for the next try (backfill).
        await PlayGame.updateOne({ _id: game._id }, { $set: { recordedAt: null } });
        throw err;
    }
};

/** Record any finished room game whose results were never written. */
const backfill = async (limit = 20) => {
    const due = await PlayGame.find({ kind: 'room', status: 'finished', recordedAt: null }).limit(limit);
    for (const g of due) await record(g).catch((err) => console.warn('[group brain] recording failed for', String(g._id), err.message));
    return due.length;
};

/** My result in one game, for the page's result card. */
const mine = (gameId, userId) => GroupBrainResult.findOne({ gameId, userId }).select('score correct total accuracy performance xp xpStatus ratingBefore ratingAfter place flags').lean();

/* ── An admin's corrections ───────────────────────────────────────────── */

const fail = (status, message) => Object.assign(new Error(message), { status });

const reverseXp = async (row) => {
    const { XpTransaction } = require('../../rewards/models');
    const User = require('../../models/User');
    try {
        await XpTransaction.create({ userId: row.userId, amount: -row.xp, source: 'group_brain_correction', refId: String(row._id), key: `group_brain_correction:${row._id}`, description: 'Group Brain result voided by an admin' });
        await User.updateOne({ _id: row.userId }, { $inc: { xp: -row.xp } });
    } catch (err) { if (err?.code !== 11000) throw err; }
};

/**
 * approve  the flags were looked at and are fine: held XP is paid
 * void     the result does not count: off every board, its XP and chess
 *          rating change taken back
 * adjust   a place or score put right ({ place, score })
 */
const correct = async (resultId, action, body, admin) => {
    const row = await GroupBrainResult.findById(resultId);
    if (!row) throw fail(404, 'Result not found.');
    const reason = String(body?.reason || '').trim();
    if (!reason) throw fail(400, 'Give a reason: it goes in the audit log.');
    const before = row.toObject();
    if (action === 'approve') {
        if (row.xpStatus === 'held') { await pay(row, row.xp, engine(row.game)?.label || row.game); row.xpStatus = 'paid'; }
        row.reviewed = true;
    } else if (action === 'void') {
        if (row.voided) throw fail(409, 'That result is already voided.');
        if (row.xpStatus === 'paid') { await reverseXp(row); row.xpStatus = 'reversed'; } else if (row.xpStatus === 'held') row.xpStatus = 'none';
        if (row.ratingBefore != null && row.ratingAfter != null) await GroupBrainProfile.updateOne({ userId: row.userId }, { $inc: { chessRating: row.ratingBefore - row.ratingAfter } });
        row.voided = true; row.reviewed = true;
    } else if (action === 'adjust') {
        const place = body.place != null ? Number(body.place) : row.place;
        if (!Number.isInteger(place) || place < 1 || place > row.players) throw fail(400, `The place is 1 to ${row.players}.`);
        if (body.score != null && !Number.isFinite(Number(body.score))) throw fail(400, 'The score must be a number.');
        row.place = place; row.won = place === 1; row.draw = false;
        if (body.score != null) row.score = Math.round(Number(body.score));
        row.performance = row.game === 'chess' ? (row.won ? 100 : 0) : Math.round(100 * (0.7 * row.accuracy + 0.3 * (row.players > 1 ? (row.players - place) / (row.players - 1) : 1)));
        row.reviewed = true;
    } else {
        throw fail(400, 'The action is approve, void or adjust.');
    }
    row.correctedBy = admin?._id || null;
    await row.save();
    await audit(admin, `result.${action}`, String(row._id), { place: before.place, score: before.score, voided: before.voided, xpStatus: before.xpStatus }, { place: row.place, score: row.score, voided: row.voided, xpStatus: row.xpStatus }, reason);
    return row.toObject();
};

module.exports = { record, backfill, mine, correct, summarize, performanceOf, flagsOf, SKILL, expected };
