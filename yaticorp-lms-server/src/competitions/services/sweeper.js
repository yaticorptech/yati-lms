/**
 * Keeps games moving when nobody is looking: every few seconds, applies the
 * timeouts that are due (a turn timing out, a match's join window closing, a
 * Group Brain room nobody started) and
 * opens matches whose time has come. Players' own polls do the same for the
 * games they are in; this covers the ones left alone.
 *
 * Started from server.js unless NODE_ENV=test or GAMES_SWEEP=off.
 */
const PlayGame = require('../models/PlayGame');
const Match = require('../models/Match');

let timer = null;
let running = false;
// From here on an organizer publishes a competition's results; before it, they were shown as soon as it ended.
const PUBLISHING_FROM = new Date('2026-10-27T17:00:00+05:30');

const sweepOnce = async () => {
    const now = new Date();
    const { catchUp } = require('./gameService');
    const due = await PlayGame.find({
        $or: [
            { status: 'active', nextDeadline: { $ne: null, $lte: now } },
            { status: 'waiting', kind: { $in: ['match', 'room'] }, joinDeadline: { $ne: null, $lte: now } }
        ]
    }).limit(100);
    for (const g of due) {
        try { await catchUp(g); } catch (err) { console.warn('[games] sweep failed for', String(g._id), err.message); }
    }
    // Quizzes and hackathons whose time has come go live; quizzes that have closed are decided.
    try { await require('./challengeService').advanceDue(); } catch (err) { console.warn('[competitions] sweep of quizzes and hackathons failed:', err.message); }
    // Group Brain: results any restart left unwritten, and tournaments that have closed.
    try { await require('../groupbrain/results').backfill(); await require('../groupbrain/tournaments').finalizeDue(); } catch (err) { console.warn('[group brain] sweep failed:', err.message); }
    // Competitions finished before results needed publishing (2026-10-27): theirs count as published.
    try { await require('../models/Competition').updateMany({ status: 'completed', resultsPublishedAt: null, completedAt: { $ne: null, $lt: PUBLISHING_FROM } }, [{ $set: { resultsPublishedAt: '$completedAt' } }], { updatePipeline: true }); } catch (err) { console.warn('[competitions] publishing past results failed:', err.message); }
    // A scheduled match waits for the admin's Start: it never opens by itself.
    // A rematch after a draw does, 5 minutes on.
    await require('./bracketService').openDueReplays();
    return due.length;
};

const start = (seconds = 5) => {
    if (timer || String(process.env.GAMES_SWEEP || '').toLowerCase() === 'off') return false;
    const run = () => {
        if (running) return;
        running = true;
        sweepOnce().catch((err) => console.warn('[games] sweep failed:', err.message)).finally(() => { running = false; });
    };
    timer = setInterval(run, seconds * 1000);
    timer.unref?.();
    // TEMPORARY: the online tables' test players play (./testBots.js).
    require('./testBots').start();
    return true;
};
const stop = () => { if (timer) clearInterval(timer); timer = null; };

module.exports = { sweepOnce, start, stop };
