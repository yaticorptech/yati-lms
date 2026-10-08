/**
 * Keeps games moving when nobody is looking: every few seconds, applies the
 * timeouts that are due (a turn timing out, a match's join window closing) and
 * opens matches whose time has come. Players' own polls do the same for the
 * games they are in; this covers the ones left alone.
 *
 * Started from server.js unless NODE_ENV=test or GAMES_SWEEP=off.
 */
const PlayGame = require('../models/PlayGame');
const Match = require('../models/Match');

let timer = null;
let running = false;

const sweepOnce = async () => {
    const now = new Date();
    const { catchUp } = require('./gameService');
    const due = await PlayGame.find({
        $or: [
            { status: 'active', nextDeadline: { $ne: null, $lte: now } },
            { status: 'waiting', kind: 'match', joinDeadline: { $ne: null, $lte: now } }
        ]
    }).limit(100);
    for (const g of due) {
        try { await catchUp(g); } catch (err) { console.warn('[games] sweep failed for', String(g._id), err.message); }
    }
    const { openMatch } = require('./bracketService');
    const starting = await Match.find({ status: 'scheduled', scheduledAt: { $ne: null, $lte: now } }).limit(50);
    for (const m of starting) {
        try { await openMatch(m); } catch (err) { console.warn('[games] opening a match failed:', err.message); }
    }
    return due.length + starting.length;
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
    return true;
};
const stop = () => { if (timer) clearInterval(timer); timer = null; };

module.exports = { sweepOnce, start, stop };
