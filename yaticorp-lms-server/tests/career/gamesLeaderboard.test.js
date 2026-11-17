/**
 * GET /api/career/games/leaderboard — the fair board (2026-11-13), and GET /games/group-summary.
 *
 * Raw stars let a student who stayed on the easiest levels outrank one doing harder work. These pin the rules that
 * replaced it: points weigh every star by its difficulty and practice stage, students are ranked within their own
 * zone unless they ask for all zones, and the board shows first name and last initial only — no ids, no emails.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { connect, makeUser, startApp, cleanup } = require('../helpers');
const c = require('../../src/career/controllers/gameController');

describe('the weighting rules', () => {
    test('a level\'s band follows the ladder: low levels easy, high levels hard', () => {
        assert.equal(c.levelBand(1), 1);
        assert.equal(c.levelBand(500), 3);
        for (let l = 15; l <= 500; l += 15) assert.ok(c.levelBand(l) >= c.levelBand(l - 14), `band falls at ${l}`);
    });

    test('a harder star at a higher stage always outweighs an easier one', () => {
        assert.ok(c.starWeight(3, 'expert') > c.starWeight(1, 'easy'));
        assert.ok(c.starWeight(2, 'medium') > c.starWeight(1, 'medium'));
        assert.ok(c.starWeight(1, 'hard') > c.starWeight(1, 'easy'));
        assert.equal(c.starWeight(1, 'medium'), 1);
    });

    test('a star event takes the difficulty and stage of the session it came from', () => {
        const at = Date.now();
        const stats = { stage: 'easy', sessions: [{ at: at - 3600000, stars: 3, difficulty: 1, stage: 'easy' }, { at: at - 1000, stars: 3, difficulty: 3, stage: 'expert' }] };
        assert.equal(c.eventWeight({ level: 1, createdAt: new Date(at) }, stats), c.starWeight(3, 'expert'));
        // No session near it: the level's own band and the game's current stage.
        assert.equal(c.eventWeight({ level: 1, createdAt: new Date(at - 86400000) }, stats), c.starWeight(1, 'easy'));
    });

    test('many easy stars cannot beat fewer hard ones', () => {
        const easy = c.progressPoints(Object.fromEntries(Array.from({ length: 10 }, (_, i) => [String(i + 1), 3])), 'easy');   // 30 stars
        const hard = c.progressPoints(Object.fromEntries(Array.from({ length: 6 }, (_, i) => [String(400 + i), 3])), 'expert'); // 18 stars
        assert.ok(hard > easy, `${hard} should beat ${easy}`);
    });

    test('names are first name and last initial only', () => {
        assert.equal(c.publicName('asha devi rao'), 'Asha R.');
        assert.equal(c.publicName('Ravi'), 'Ravi');
        assert.equal(c.publicName(''), 'Student');
    });
});

describe('the board', () => {
    let app; const users = [];
    const stamp = `LB${Date.now()}`;
    const GameProgress = () => require('../../src/career/models/GameProgress');
    const GameStarEvent = () => require('../../src/career/models/GameStarEvent');
    const Goal = () => require('../../src/career/models/Goal');
    const User = () => require('../../src/models/User');

    const student = async (label, currentClass, educationLevel) => {
        const s = await makeUser(label);
        users.push(s.user);
        await User().updateOne({ _id: s.user._id }, { $set: { institution: stamp, className: 'C1' } });
        await Goal().collection.insertOne({ userId: s.user._id, educationLevel, currentClass });
        return { ...s, api: app.call(s.token) };
    };
    const progress = (userId, gameId, levels, stage) => GameProgress().create({
        userId, gameId, level: Math.max(...levels) + 1, stars: Object.fromEntries(levels.map((l) => [String(l), 3])),
        starTotal: levels.length * 3, cleared: levels.length, stats: { stage, sessions: [], best: null }
    });

    let easy, hard, young;
    before(async () => {
        await connect();
        const router = express.Router();
        // Mounted ahead of the Career Path section, whose lock answers anything under it the games routes do not.
        router.use('/games', require('../../src/career/routes/gameStatsRoutes'));
        router.use(require('../../src/career'));
        app = startApp({ mount: '/api/career', router });
        easy = await student('Easyplay', 'Class 7', 'Middle School (Class 6–8)');
        hard = await student('Hardplay', 'Class 8', 'Middle School (Class 6–8)');
        young = await student('Youngplay', 'Class 3', 'Primary School (Class 1–5)');
        await progress(easy.user._id, 'memory-match', Array.from({ length: 10 }, (_, i) => i + 1), 'easy');
        await progress(hard.user._id, 'mini-sudoku', [400, 401, 402, 403, 404, 405], 'expert');
        await progress(young.user._id, 'memory-match', Array.from({ length: 40 }, (_, i) => i + 1), 'medium');
    });
    after(async () => { await cleanup(users, app.server); });

    test('ranks by difficulty-weighted points, within the student\'s own zone', async () => {
        const r = await easy.api('GET', '/games/leaderboard?period=all&scope=class');
        assert.equal(r.status, 200);
        assert.equal(r.body.zone, 'smart');
        assert.equal(r.body.rankedBy, 'points');
        assert.deepEqual(r.body.entries.map((e) => e.name), ['Hardplay S.', 'Easyplay S.']);
        assert.ok(r.body.entries[0].stars < r.body.entries[1].stars, 'the winner has fewer, harder stars');
        assert.equal(r.body.me.rank, 2);
        assert.equal(r.body.me.isMe, true);
    });

    test('"all zones" brings in every zone', async () => {
        const r = await easy.api('GET', '/games/leaderboard?period=all&scope=class&zone=all');
        assert.equal(r.body.zone, null);
        assert.equal(r.body.total, 3);
        assert.ok(r.body.entries.some((e) => e.name === 'Youngplay S.'));
    });

    test('shows no ids, emails or other students\' pictures', async () => {
        const r = await hard.api('GET', '/games/leaderboard?period=all&scope=class&zone=all');
        const text = JSON.stringify(r.body.entries);
        for (const u of users) {
            assert.ok(!text.includes(String(u._id)), 'a user id leaked');
            assert.ok(!text.includes(u.email), 'an email leaked');
        }
        for (const e of r.body.entries) {
            assert.deepEqual(Object.keys(e).sort(), ['cleared', 'games', 'isMe', 'name', 'points', 'profilePicture', 'rank', 'stars']);
            if (!e.isMe) assert.equal(e.profilePicture, '');
        }
    });

    test('a period board says how the student moved since the last one', async () => {
        await GameStarEvent().create({ userId: easy.user._id, gameId: 'memory-match', level: 11, stars: 3, first: true });
        const r = await easy.api('GET', '/games/leaderboard?period=weekly&scope=class');
        assert.equal(r.body.me.rank, 1);
        assert.equal(r.body.me.points, Math.round(3 * c.starWeight(1, 'easy') * 10));
        assert.equal(r.body.me.improvement.previousPoints, 0);
        assert.equal(r.body.me.improvement.pointsChange, r.body.me.points);
        const all = await easy.api('GET', '/games/leaderboard?period=all&scope=class');
        assert.equal(all.body.me.improvement, null);
    });

    test('the group summary is the student\'s own Group Brain results, apart from solo', async () => {
        const r = await young.api('GET', '/games/group-summary');
        assert.equal(r.status, 200);
        assert.equal(r.body.played, 0);
        assert.equal(r.body.podiums, 0);
        assert.deepEqual(r.body.recent, []);
        assert.match(r.body.note, /not an IQ score/);
    });
});
