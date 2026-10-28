/**
 * Units and sections in order (asked 2026-10-28: "when the user has not
 * completed a unit, don't allow the next unit or the next section"): the next
 * unit opens when the last lesson of the one before is done; the next section
 * when every lesson of the one before is — its unit reviews, listening and
 * level review too. The level found or said at the start still decides where a
 * student begins; once lessons are begun, a test or a level said no longer
 * moves them ahead.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, startApp, cleanup } = require('../helpers');
const svc = require('../../src/linguistic/service');
const { placement } = require('../../src/linguistic/content');

let app, s, api;
const others = [];
before(async () => {
    await connect();
    app = startApp({ mount: '/api/linguistic', router: require('../../src/linguistic') });
    await require('../../src/linguistic/seed').ensureSeeded();
    s = await makeUser('Ling In Order');
    api = app.call(s.token);
    assert.equal((await api('POST', '/level', { level: 'beginner' })).status, 200);
});
after(async () => { await cleanup([s.user, ...others], app.server); });

/** Marks lessons done, as a student who passed them. */
const finish = async (lessons) => {
    const progress = await svc.progressOf(s.user._id);
    for (const l of lessons) {
        const e = progress.lessons.find((x) => String(x.lessonId) === String(l._id));
        if (e) Object.assign(e, { status: 'completed', bestScore: 100, completedAt: new Date() });
        else progress.lessons.push({ lessonId: l._id, module: l.module, level: l.level, status: 'completed', step: 'quiz', bestScore: 100, completedAt: new Date() });
    }
    await progress.save();
};
const realLessons = (unit) => unit.lessons.filter((x) => !x.stop);

describe('units and sections in order', () => {
    test('the next unit opens only when the last lesson of the unit before is done', async () => {
        const path = (await api('GET', '/path')).body;
        const [one, two] = path.levels[0].units;
        const all = await svc.lessonsFor(await svc.progressOf(s.user._id));
        const byId = (id) => all.find((l) => String(l._id) === id);
        const first = realLessons(one).map((x) => byId(x.id));
        await finish(first.slice(0, -1));
        const shut = (await api('GET', '/path')).body.levels[0].units[1];
        assert.equal(realLessons(shut)[0].open, false, `${two.title} waits for the last lesson of ${one.title}`);
        await finish(first.slice(-1));
        assert.equal(realLessons((await api('GET', '/path')).body.levels[0].units[1])[0].open, true, `${two.title} opens`);
    });

    test('the next section opens only when every lesson of the section is done, its reviews too', async () => {
        const progress = await svc.progressOf(s.user._id);
        const beginner = (await svc.lessonsFor(progress)).filter((l) => l.level === 'beginner');
        await finish(beginner.filter((l) => !l.review));
        let path = (await api('GET', '/path')).body;
        assert.equal(path.levels[1].open, false, 'Intermediate stays shut while unit reviews, listening and the level review are left');
        await finish(beginner.filter((l) => l.review));
        path = (await api('GET', '/path')).body;
        assert.equal(path.levels[1].open, true, 'every Beginner lesson done: Intermediate opens');
        assert.equal(path.levels[2].open, false, 'Advanced still shut');
    });

    test('a student placed at Advanced before 2026-10-28, Advanced lessons begun and done: those sections stay shut until the ones before are finished', async () => {
        const old = await makeUser('Ling In Order Old');
        others.push(old.user);
        const oldApi = app.call(old.token);
        const { LinguisticLesson } = require('../../src/linguistic/models');
        const progress = await svc.progressOf(old.user._id);
        progress.placement = { level: 'advanced', score: 15, total: 15, bands: null, takenAt: new Date() };
        const adv = await LinguisticLesson.find({ seedKey: { $in: ['vocab-advanced-1', 'grammar-advanced-1'] } }).lean();
        progress.lessons.push({ lessonId: adv[0]._id, module: adv[0].module, level: 'advanced', status: 'completed', step: 'quiz', bestScore: 100, completedAt: new Date() });
        progress.lessons.push({ lessonId: adv[1]._id, module: adv[1].module, level: 'advanced', status: 'started', step: 'learn' });
        await progress.save();
        const path = (await oldApi('GET', '/path')).body;
        assert.deepEqual(path.levels.map((l) => l.open), [true, false, false], 'only Section 1 open');
        assert.equal(path.level, 'beginner', 'their level: Section 1, until it is finished');
        const shut = path.levels[2].units.flatMap((u) => u.lessons).filter((x) => !x.stop);
        assert.ok(shut.every((x) => !x.open), 'every Advanced lesson shut, the begun and the done too');
        assert.equal((await oldApi('GET', `/lessons/${adv[1]._id}`)).status, 403);
    });

    test('once begun, the level test is shown but does not move the student ahead, nor does a level said', async () => {
        const answers = Object.fromEntries(placement.map((q) => [q.id, q.answer]));
        const r = await api('POST', '/placement', { answers });
        assert.equal(r.status, 200);
        assert.deepEqual([r.body.level, r.body.kept], ['advanced', 'beginner'], 'every answer right: Advanced found, Beginner kept');
        assert.equal((await api('GET', '/path')).body.levels[2].open, false, 'Advanced not opened by the test');
        const said = await api('POST', '/level', { level: 'advanced' });
        assert.equal(said.status, 409);
        assert.match(said.body.message, /Finish your units and sections/);
    });
});
