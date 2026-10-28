/**
 * Live updates for the student app: competitions, games and leaderboards
 * refresh on every open page the moment something changes, without a reload.
 *
 * The database says what changed. One MongoDB change stream watches the
 * collections behind those pages (Atlas runs a replica set, which change
 * streams need), so every write is seen, whichever route or job made it, and
 * on whichever server instance. Each change becomes a topic —
 * 'competitions', 'arena', 'games', 'leaderboard' — sent to every connected
 * page over one server-sent event stream (GET /api/live/stream). A page
 * re-reads its own data when a topic it shows arrives; nothing else is sent.
 *
 * A topic goes out at most once every THROTTLE_MS, so a busy match or a burst
 * of XP is one refresh, not hundreds.
 */
const express = require('express');
const mongoose = require('mongoose');
const { EventEmitter } = require('events');
const { protectUser } = require('../middleware/authMiddleware');

const TOPIC_OF = {
    competitions: 'competitions',
    competition_teams: 'competitions',
    competition_matches: 'competitions',
    competition_submissions: 'competitions',
    competition_quiz_attempts: 'competitions',
    competition_games: 'competitions',
    arena_competitions: 'arena',
    arena_entries: 'arena',
    career_game_progress: 'games',
    career_game_star_events: 'games',
    rewards_xp_transactions: 'leaderboard',
    rewards_reward_transactions: 'leaderboard',
    rewards_leaderboard_snapshots: 'leaderboard',
    rewards_streaks: 'leaderboard'
};
// A star in a game also moves the games leaderboard; a finished match or quiz, the competition boards.
const ALSO = { games: ['leaderboard'], competitions: ['leaderboard'] };
const THROTTLE_MS = 3000;

const bus = new EventEmitter();
bus.setMaxListeners(0);

const last = new Map();
const queued = new Map();
const send = (topic) => {
    const wait = THROTTLE_MS - (Date.now() - (last.get(topic) || 0));
    if (wait <= 0) {
        last.set(topic, Date.now());
        bus.emit('topic', topic);
        return;
    }
    if (queued.has(topic)) return;
    queued.set(topic, setTimeout(() => { queued.delete(topic); last.set(topic, Date.now()); bus.emit('topic', topic); }, wait));
};

let stream = null;
const watch = () => {
    if (stream) return;
    try {
        stream = mongoose.connection.db.watch(
            [{ $match: { 'ns.coll': { $in: Object.keys(TOPIC_OF) } } }],
            { fullDocument: undefined }
        );
        stream.on('change', (change) => {
            const topic = TOPIC_OF[change.ns?.coll];
            if (!topic) return;
            send(topic);
            (ALSO[topic] || []).forEach(send);
        });
        stream.on('error', (err) => {
            console.warn('[live] change stream stopped:', err.message, '— retrying in 30 s');
            try { stream.close(); } catch { /* already closed */ }
            stream = null;
            setTimeout(watch, 30000);
        });
    } catch (err) {
        console.warn('[live] change streams unavailable:', err.message);
        stream = null;
    }
};
if (mongoose.connection.readyState === 1) watch();
else mongoose.connection.once('open', watch);

const router = express.Router();

// @route GET /api/live/stream — "event: live" with { topic } whenever one changes, and 'wallet' for this student's own wallet.
router.get('/stream', protectUser, (req, res) => {
    res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.flushHeaders?.();
    res.write('retry: 5000\n\n');
    const onTopic = (topic) => res.write(`event: live\ndata: ${JSON.stringify({ topic })}\n\n`);
    bus.on('topic', onTopic);
    // This student's own wallet rides the same stream ('wallet'), so a page holds one connection, not two.
    const offWallet = require('../rewards/services/walletEvents').onWalletChange(req.user._id, () => onTopic('wallet'));
    const ping = setInterval(() => res.write(': ping\n\n'), 25000);
    req.on('close', () => { clearInterval(ping); bus.off('topic', onTopic); offWallet(); });
});

module.exports = router;
