/**
 * Starting Linguistic Ability the Duolingo way (asked 2026-10-23): a new
 * student first finds their level by the placement test or picks it
 * themselves, and sets a daily XP goal.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, startApp, cleanup } = require('../helpers');
const placement = require('../../src/linguistic/content/placement');

let app, me, api;
before(async () => {
    await connect();
    app = startApp({ mount: '/api/linguistic', router: require('../../src/linguistic') });
    me = await makeUser('Ling Starter');
    api = app.call(me.token);
    await require('../../src/linguistic/seed').ensureSeeded();
});
after(async () => { await cleanup([me.user], app.server); });

describe('starting out', () => {
    test('a new student has not started: no level yet, the goal not set (30 XP shown)', async () => {
        const d = (await api('GET', '/')).body;
        assert.deepEqual([d.started, d.placement, d.goalSet, d.dailyGoal], [false, null, false, 30]);
    });

    test('choosing a level: it opens that level as the test would, but is not the test', async () => {
        assert.equal((await api('POST', '/level', { level: 'expert' })).status, 400);
        const r = await api('POST', '/level', { level: 'intermediate' });
        assert.equal(r.status, 200); assert.equal(r.body.placement.chosen, true);
        const d = (await api('GET', '/')).body;
        assert.deepEqual([d.started, d.level], [true, 'intermediate']);
        const path = (await api('GET', '/path')).body;
        assert.equal(path.levels.find((l) => l.level === 'intermediate').open, true, 'Intermediate is open');
        assert.equal(path.levels.find((l) => l.level === 'advanced').open, false);
        assert.equal(d.achievements.find((a) => a.key === 'first_step').earned, false, '"Take the placement test" is for the test');
    });

    test('why they are learning, and how much English they know (0–4)', async () => {
        assert.equal((await api('POST', '/about', { reason: 'school', know: 9 })).status, 400);
        assert.equal((await api('POST', '/about', { reason: 'nope', know: 1 })).status, 400);
        assert.deepEqual((await api('POST', '/about', { reason: 'career', know: 2 })).body, { reason: 'career', selfRating: 2 });
    });

    test('the daily goal: one of 10, 20, 30, 50', async () => {
        assert.equal((await api('POST', '/goal', { xp: 7 })).status, 400);
        assert.deepEqual((await api('POST', '/goal', { xp: 20 })).body, { dailyGoal: 20 });
        const d = (await api('GET', '/')).body;
        assert.deepEqual([d.dailyGoal, d.goalSet], [20, true]);
    });

    test('the placement test afterwards replaces the chosen level, and earns First Step', async () => {
        const answers = Object.fromEntries(placement.map((q) => [q.id, q.band === 'beginner' ? q.answer : 'x']));
        const r = await api('POST', '/placement', { answers });
        assert.equal(r.body.level, 'beginner');
        const d = (await api('GET', '/')).body;
        assert.deepEqual([d.level, d.placement.chosen], ['beginner', false]);
        assert.equal(d.achievements.find((a) => a.key === 'first_step').earned, true);
    });
});
