/**
 * The learning plan (asked 2026-10-24): "when the user enters, ask how much
 * time they need to learn the language, and generate their roadmap from it".
 * A short time keeps the main lessons and leaves the extra practice out; a
 * long one has every lesson. The roadmap spreads what is left over the days
 * left.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, startApp, cleanup } = require('../helpers');
const { LinguisticLesson } = require('../../src/linguistic/models');
const svc = require('../../src/linguistic/service');

const typesOf = (path) => path.levels.flatMap((l) => l.units.flatMap((u) => u.lessons.map((x) => x.type)));

describe('the learning plan', () => {
    let app, ravi, maya, api, mayaApi;
    before(async () => {
        await connect();
        app = startApp({ mount: '/api/linguistic', router: require('../../src/linguistic') });
        ravi = await makeUser('Ling Plan Ravi'); maya = await makeUser('Ling Plan Maya');
        api = app.call(ravi.token); mayaApi = app.call(maya.token);
        await require('../../src/linguistic/seed').ensureSeeded();
    });
    after(async () => { await cleanup([ravi.user, maya.user], app.server); });

    test('the choices: 2 weeks to 6 months; a short time has the main lessons, a long one every lesson', async () => {
        const r = await api('GET', '/plan/options?course=en&language=kn&level=beginner');
        assert.equal(r.status, 200);
        const o = r.body.options;
        assert.deepEqual(o.map((x) => x.days), [14, 30, 60, 90, 180]);
        assert.deepEqual(o.map((x) => x.tier), ['main', 'main', 'full', 'full', 'full']);
        assert.ok(o[0].lessons < o[4].lessons, 'fewer lessons in the short plan');
        assert.ok(o[0].perDay > o[2].perDay && o[0].minutes >= o[2].minutes);
        const adv = (await api('GET', '/plan/options?course=en&language=kn&level=advanced')).body.options;
        assert.ok(adv[1].lessons < o[1].lessons, 'from Advanced, fewer lessons to plan');
    });

    test('a 2-week plan: the roadmap is 14 days of the main lessons; the extra practice is left out of the path', async () => {
        await api('POST', '/level', { level: 'beginner' });
        const r = await api('POST', '/plan', { days: 14 });
        assert.equal(r.status, 200);
        const p = r.body.plan;
        assert.deepEqual([p.days, p.tier, p.day, p.daysLeft, p.done, p.behind], [14, 'main', 1, 14, 0, 0]);
        assert.equal(p.schedule.length, 14);
        assert.equal(p.schedule.reduce((n, d) => n + d.lessons.length, 0), p.total, 'every lesson has its day');
        assert.ok(p.schedule[0].today && p.schedule[0].lessons.length >= 4, 'today: four or five lessons');
        assert.equal(p.schedule[0].lessons[0].title, 'Family', 'starting with the first unit');

        const path = (await api('GET', '/path')).body;
        const types = typesOf(path);
        assert.ok(!types.includes('listening') && types.includes('checkpoint') && types.includes('talk'), 'no listening or unit reviews; checkpoints and talks stay');
        assert.ok(!path.levels[0].units[0].lessons.some((x) => x.review === 'unit'));
        const hear = await LinguisticLesson.findOne({ seedKey: 'review-hear-beginner-1' }).lean();
        assert.equal((await api('GET', `/lessons/${hear._id}`)).status, 404, 'not part of this roadmap');

        const d = (await api('GET', '/')).body;
        assert.equal(d.plan.today.lessons.length, p.schedule[0].lessons.length, 'today\'s lessons on the dashboard');
        assert.ok(d.dailyGoal >= 30, 'the daily goal to match');
    });

    test('a lesson done today is ticked in today\'s place, and the rest stay shared out', async () => {
        const first = (await api('GET', '/plan')).body.plan.schedule[0].lessons[0];
        const lesson = svc.serve(await LinguisticLesson.findById(first.id).lean(), {});
        const answers = Object.fromEntries(svc.quizOf(lesson).map((q) => [q.id, q.answer]));
        assert.equal((await api('POST', `/lessons/${first.id}/quiz`, { answers })).body.passed, true);
        const p = (await api('GET', '/plan')).body.plan;
        assert.equal(p.done, 1);
        assert.deepEqual([p.schedule[0].lessons[0].id, p.schedule[0].lessons[0].status], [first.id, 'completed']);
        assert.equal(p.schedule.reduce((n, d) => n + d.lessons.length, 0), p.total);
    });

    test('a longer plan brings every lesson back; a time not offered is refused; no plan, every lesson', async () => {
        const p = (await api('POST', '/plan', { days: 90 })).body.plan;
        assert.equal(p.tier, 'full');
        assert.ok(typesOf((await api('GET', '/path')).body).includes('listening'));
        assert.equal((await api('POST', '/plan', { days: 7 })).status, 400);
        const none = (await api('POST', '/plan', { days: null })).body;
        assert.equal(none.plan, null);
        assert.equal(none.options.length, 5, 'the choices to make one again');
    });

    test('a second language course takes the time already chosen, from today: the question is not asked again (2026-10-26)', async () => {
        await api('POST', '/plan', { days: 30 });
        await api('POST', '/language', { language: 'kn' });
        assert.equal((await api('POST', '/course', { course: 'hi', start: 'beginner' })).status, 200);
        const p = (await api('GET', '/plan')).body.plan;
        assert.deepEqual([p.days, p.day, (await api('GET', '/')).body.course.code], [30, 1, 'hi']);
        await api('POST', '/course', { course: 'en' });
        assert.equal((await api('GET', '/plan')).body.plan.days, 30, 'the English plan as it was');
    });

    test('placed at Advanced after making the plan: the roadmap is made again from there', async () => {
        await mayaApi('POST', '/level', { level: 'beginner' });
        assert.equal((await mayaApi('POST', '/plan', { days: 30 })).body.plan.tier, 'main');
        const right = Object.fromEntries(require('../../src/linguistic/content/placement').map((q) => [q.id, q.answer]));
        await mayaApi('POST', '/placement', { answers: right });
        const p = (await mayaApi('GET', '/plan')).body.plan;
        assert.equal(p.tier, 'full', 'only Advanced is left: every lesson fits in a month');
        assert.ok(p.schedule[0].lessons.every((x) => x.level === 'advanced'));
    });
});
