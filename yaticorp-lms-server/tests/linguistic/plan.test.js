/**
 * The learning plan (asked 2026-10-24): "when the user enters, ask how much
 * time they need to learn the language, and generate their roadmap from it".
 * A short time keeps the main lessons and leaves the extra practice out; a
 * long one has every lesson. The roadmap spreads what is left over the days
 * left. Since 2026-11-04 the days are set by itself ("don't give the learning
 * days to choose"): 90 for a Beginner, 60 of the Advanced lessons for one who
 * passed the Advanced entry test; a plan chosen before then keeps its days
 * (made here with svc.setPlan, as the student can no longer send them).
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, startApp, cleanup } = require('../helpers');
const { LinguisticLesson } = require('../../src/linguistic/models');
const svc = require('../../src/linguistic/service');
const { LinguisticLesson: Lessons } = require('../../src/linguistic/models');

const typesOf = (path) => path.levels.flatMap((l) => l.units.flatMap((u) => u.lessons.map((x) => x.type)));

describe('the learning plan', () => {
    let app, ravi, maya, asha, dev, api, mayaApi;
    before(async () => {
        await connect();
        app = startApp({ mount: '/api/linguistic', router: require('../../src/linguistic') });
        ravi = await makeUser('Ling Plan Ravi'); maya = await makeUser('Ling Plan Maya');
        asha = await makeUser('Ling Plan Auto Beginner'); dev = await makeUser('Ling Plan Auto Advanced');
        api = app.call(ravi.token); mayaApi = app.call(maya.token);
        await require('../../src/linguistic/seed').ensureSeeded();
    });
    after(async () => { await cleanup([ravi.user, maya.user, asha.user, dev.user], app.server); });

    // The Advanced entry test, every answer right, or the Advanced half wrong.
    const takeEntry = async (s, pass) => {
        const call = app.call(s.token);
        assert.equal((await call('POST', '/jump', { level: 'advanced' })).status, 200);
        const entry = await Lessons.findOne({ seedKey: 'review-entry-advanced' }).lean();
        const answers = Object.fromEntries(svc.quizOf(svc.serve(entry, await svc.progressOf(s.user._id))).map((q) => [q.id, pass || q.id.startsWith('h0~') ? q.answer : 'not this']));
        return (await call('POST', `/lessons/${entry._id}/quiz`, { answers })).body;
    };

    test('the time set by itself (2026-11-04): a Beginner gets 90 days from the letters; days sent are not used; made once', async () => {
        const call = app.call(asha.token);
        await call('POST', '/level', { level: 'beginner' });
        const r = await call('POST', '/plan', { days: 14 });
        assert.equal(r.status, 200);
        const p = r.body.plan;
        assert.deepEqual([p.days, p.day, p.schedule.length], [90, 1, 90], '90 days, not the 14 sent');
        assert.equal(p.schedule[0].lessons[0].title, 'Letters A–I', 'from Section 1, Unit 1');
        assert.equal(p.schedule.reduce((n, d) => n + d.lessons.length, 0), p.total, 'every lesson has its day');
        assert.equal((await svc.progressOf(asha.user._id)).plans[0].auto, true);
        assert.equal((await call('POST', '/plan', { days: 180 })).body.plan.days, 90, 'made once: asked again, it stays');
    });

    test('the Advanced entry test (2026-11-04): passed, the plan is 60 days of the Advanced lessons from today; not passed, the 90 days of Beginner stay', async () => {
        const call = app.call(dev.token);
        await call('POST', '/level', { level: 'beginner' });
        assert.equal((await call('POST', '/plan')).body.plan.days, 90);
        assert.equal((await takeEntry(dev, true)).passed, true);
        const p = (await call('GET', '/plan')).body.plan;
        assert.deepEqual([p.days, p.day], [60, 1]);
        assert.ok(p.schedule.every((d) => d.lessons.every((x) => x.level === 'advanced')), 'only the Advanced lessons');
        assert.ok(p.total > 0 && p.schedule.reduce((n, d) => n + d.lessons.length, 0) === p.total);

        assert.equal((await takeEntry(asha, false)).passed, false);
        const b = (await app.call(asha.token)('GET', '/plan')).body.plan;
        assert.deepEqual([b.days, b.schedule[0].lessons[0].level], [90, 'beginner'], 'not passed: Beginner, as set');
    });

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
        const p = (await svc.setPlan(ravi.user, 14)).plan;
        assert.deepEqual([p.days, p.tier, p.day, p.daysLeft, p.done, p.behind], [14, 'main', 1, 14, 0, 0]);
        assert.equal(p.schedule.length, 14);
        assert.equal(p.schedule.reduce((n, d) => n + d.lessons.length, 0), p.total, 'every lesson has its day');
        assert.ok(p.schedule[0].today && p.schedule[0].lessons.length >= 4, 'today: four or five lessons');
        assert.equal(p.schedule[0].lessons[0].title, 'Letters A–I', 'starting with the letters (2026-10-31)');

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

    test('a plan chosen before (2026-11-04) keeps its days: making the plan again leaves it', async () => {
        await svc.setPlan(ravi.user, 14);
        assert.equal((await api('POST', '/plan')).body.plan.days, 14);
    });

    test('a longer plan brings every lesson back; a time not offered is refused; no plan, every lesson', async () => {
        const p = (await svc.setPlan(ravi.user, 90)).plan;
        assert.equal(p.tier, 'full');
        assert.ok(typesOf((await api('GET', '/path')).body).includes('listening'));
        assert.ok((await svc.setPlan(ravi.user, 7)).error);
        const none = await svc.setPlan(ravi.user, null);
        assert.equal(none.plan, null);
        assert.equal(none.options.length, 5, 'the choices to make one again');
    });

    test('one language only (2026-10-27): a second course is refused, and the plan stays as it was', async () => {
        await svc.setPlan(ravi.user, 30);
        await api('POST', '/language', { language: 'kn' });
        const r = await api('POST', '/course', { course: 'hi', start: 'beginner' });
        assert.equal(r.status, 400);
        assert.match(r.body.message, /You are learning English\. Finish all its sections, then choose your next language\./);
        assert.equal((await api('GET', '/')).body.course.code, 'en');
        assert.equal((await api('GET', '/plan')).body.plan.days, 30, 'the English plan as it was');
    });

    test('the level test after making the plan: Advanced found, but the roadmap still starts at Beginner (2026-10-28)', async () => {
        await mayaApi('POST', '/level', { level: 'beginner' });
        assert.equal((await svc.setPlan(maya.user, 30)).plan.tier, 'main');
        const right = Object.fromEntries(require('../../src/linguistic/content/placement').map((q) => [q.id, q.answer]));
        assert.equal((await mayaApi('POST', '/placement', { answers: right })).body.level, 'advanced');
        const p = (await mayaApi('GET', '/plan')).body.plan;
        assert.equal(p.tier, 'main', 'every level still to do');
        assert.ok(p.schedule[0].lessons.every((x) => x.level === 'beginner'), 'from the first unit');
    });
});
