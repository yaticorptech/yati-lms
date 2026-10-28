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

    test('the timeline: every lesson left, at the lessons a day the daily goal comes to; each level\'s day; the days at every goal', async () => {
        const d = (await api('GET', '/')).body;
        const t = d.timeline;
        const total = d.levels.reduce((n, l) => n + l.total, 0);
        assert.equal(t.remaining, total, 'nothing done yet: every lesson');
        // The lesson XP is the rewards setting in the database, which can be any number: rounded as the page shows it.
        const perDay = Math.max(0.5, t.goal / t.xpPerLesson);
        assert.equal(t.lessonsPerDay, Math.round(perDay * 10) / 10);
        assert.equal(t.days, Math.ceil(total / perDay));
        assert.deepEqual(t.levels.map((l) => l.level), ['beginner', 'intermediate', 'advanced']);
        assert.equal(t.levels[2].days, t.days, 'the last level finishes on the last day');
        assert.ok(t.levels[0].days < t.levels[1].days && t.levels[1].days < t.levels[2].days, 'one level after another');
        assert.equal(t.finishOn, new Date(Date.now() + t.days * 86400e3).toISOString().slice(0, 10));
        assert.deepEqual(t.goals.map((g) => g.xp), [10, 20, 30, 50]);
        assert.ok(t.goals[3].days < t.goals[0].days, 'a bigger goal, fewer days');
        assert.equal(t.pace, null, 'no pace before any lesson');
    });

    test('choosing a level: Beginner, where everyone starts; a later one is refused (2026-10-28), and it is not the test', async () => {
        assert.equal((await api('POST', '/level', { level: 'expert' })).status, 400);
        const later = await api('POST', '/level', { level: 'intermediate' });
        assert.equal(later.status, 409); assert.match(later.body.message, /Everyone starts at Section 1/);
        const r = await api('POST', '/level', { level: 'beginner' });
        assert.equal(r.status, 200); assert.equal(r.body.placement.chosen, true);
        const d = (await api('GET', '/')).body;
        assert.deepEqual([d.started, d.level], [true, 'beginner']);
        const path = (await api('GET', '/path')).body;
        assert.equal(path.levels.find((l) => l.level === 'intermediate').open, false, 'Intermediate waits for Beginner to be finished');
        assert.equal(path.levels.find((l) => l.level === 'advanced').open, false);
        assert.equal(d.achievements.find((a) => a.key === 'first_step').earned, false, '"Take the placement test" is for the test');
        assert.deepEqual([d.timeline.levels[0].skipped, d.timeline.levels[0].left], [false, d.levels[0].total], 'Beginner to do, from the first unit');
        assert.equal(d.timeline.remaining, d.levels[0].total + d.levels[1].total + d.levels[2].total);
    });

    test('why they are learning, and how much English they know (0–4)', async () => {
        assert.equal((await api('POST', '/about', { reason: 'school', know: 9 })).status, 400);
        assert.equal((await api('POST', '/about', { reason: 'nope', know: 1 })).status, 400);
        assert.deepEqual((await api('POST', '/about', { reason: 'career', know: 2 })).body, { reason: 'career', selfRating: 2, focus: [], topics: [], studyTime: null, aim: null, style: null, ageBand: null, practiceMinutes: null });
    });

    test('what they want to get better at, the topics they like, when they like to learn (2026-10-26) — and the roadmap says them back', async () => {
        assert.equal((await api('POST', '/about', { reason: 'career', know: 2, focus: [] })).status, 400, 'at least one skill');
        assert.equal((await api('POST', '/about', { reason: 'career', know: 2, focus: ['dancing'] })).status, 400);
        assert.equal((await api('POST', '/about', { reason: 'career', know: 2, studyTime: 'noon' })).status, 400);
        const r = await api('POST', '/about', { reason: 'career', know: 2, focus: ['speaking', 'vocabulary', 'speaking'], topics: ['work', 'travel'], studyTime: 'evening' });
        assert.deepEqual(r.body, { reason: 'career', selfRating: 2, focus: ['speaking', 'vocabulary'], topics: ['work', 'travel'], studyTime: 'evening', aim: null, style: null, ageBand: null, practiceMinutes: null });
        const kept = (await api('POST', '/about', { reason: 'school', know: 1 })).body;
        assert.deepEqual([kept.focus, kept.studyTime], [['speaking', 'vocabulary'], 'evening'], 'kept when not sent again');
        assert.deepEqual((await api('GET', '/plan')).body.about, { focus: ['speaking', 'vocabulary'], topics: ['work', 'travel'], studyTime: 'evening', aim: null, practiceMinutes: null });
    });

    test('what they want to achieve, their learning style, age, the minutes a day, and the new reasons (2026-10-26)', async () => {
        for (const bad of [{ aim: 'rich' }, { style: 'dancing' }, { ageBand: '12' }, { practiceMinutes: 7 }]) assert.equal((await api('POST', '/about', { reason: 'career', know: 2, ...bad })).status, 400, JSON.stringify(bad));
        const r = (await api('POST', '/about', { reason: 'abroad', know: 0, aim: 'speaking', style: 'reading', ageBand: '18-24', practiceMinutes: 15 })).body;
        assert.deepEqual([r.reason, r.aim, r.style, r.ageBand, r.practiceMinutes], ['abroad', 'speaking', 'reading', '18-24', 15]);
        assert.equal((await api('POST', '/about', { reason: 'research', know: 1, practiceMinutes: 0 })).body.practiceMinutes, 0, 'their own way');
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

    test('the languages they speak, write and read (2026-10-28): one or more of each, known codes only; on the dashboard', async () => {
        assert.equal((await api('GET', '/')).body.knows, null, 'not said yet');
        assert.equal((await api('POST', '/knows', { speak: ['kn'], write: [], read: ['kn'] })).status, 400, 'each needs one');
        assert.equal((await api('POST', '/knows', { speak: ['kn', 'tulu'], write: ['kn'], read: ['kn'] })).status, 400, 'a code the section does not know');
        const r = await api('POST', '/knows', { speak: ['kn', 'hi', 'en', 'kn'], write: ['kn', 'en'], read: ['kn', 'en', 'hi'] });
        assert.equal(r.status, 200);
        assert.deepEqual((await api('GET', '/')).body.knows, { speak: ['kn', 'hi', 'en'], write: ['kn', 'en'], read: ['kn', 'en', 'hi'] }, 'kept, each once');
    });
});
