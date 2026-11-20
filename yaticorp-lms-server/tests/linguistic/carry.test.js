/**
 * A lesson added behind a student counts as done for them (2026-11-19, the user: lessons added to Beginner after a
 * student had finished it showed as not done — the section not complete, its chests shut, the path back at Section 1).
 */
const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { connect, makeUser, startApp, cleanup } = require('../helpers');
const svc = require('../../src/linguistic/service');
const { LinguisticLesson } = require('../../src/linguistic/models');

describe('lessons added behind a student', () => {
    let app, s, api;
    before(async () => {
        await connect();
        await require('../../src/linguistic/seed').ensureSeeded();
        app = startApp({ mount: '/api/linguistic', router: require('../../src/linguistic') });
        s = await makeUser('Ling Carried');
        api = app.call(s.token);
        await api('POST', '/language', { language: 'en' });
        await api('POST', '/course', { course: 'ta', start: 'beginner' });
    });
    after(async () => { await cleanup([s.user], app.server); await mongoose.disconnect().catch(() => {}); });

    test('Section 1 finished before its new lessons came: they count as done, its chests open, it stays complete; they can still be taken', async () => {
        const nodes = (await api('GET', '/path')).body.levels[0].units.flatMap((u) => u.lessons);
        const added = nodes.filter((x) => !x.stop && x.review === 'more');
        const old = nodes.filter((x) => !x.stop && x.review !== 'more');
        assert.ok(added.length > 0 && old.length > 0);
        // Finished the day before the newest of them was added.
        const newest = Math.max(...(await LinguisticLesson.find({ _id: { $in: added.map((x) => x.id) } }).select('createdAt').lean()).map((d) => +d.createdAt));
        const when = new Date(newest - 24 * 3600 * 1000);
        await LinguisticLesson.updateMany({ _id: { $in: added.map((x) => x.id) } }, { $max: { createdAt: new Date(newest) } });
        const p = await svc.progressOf(s.user._id);
        for (const l of old) p.lessons.push({ lessonId: l.id, module: l.module, level: 'beginner', status: 'completed', step: 'done', bestScore: 90, attempts: 1, completedAt: when });
        p.levelsCompleted.push({ level: 'beginner', completedAt: when, average: 90, course: 'ta' });
        await p.save();
        const s1 = (await api('GET', '/path')).body.levels[0];
        const now = s1.units.flatMap((u) => u.lessons);
        assert.equal(now.filter((x) => !x.stop && x.review === 'more' && x.status === 'completed').length, added.length, 'the new lessons count as done');
        assert.ok(now.filter((x) => x.stop === 'chest').every((c) => c.open), 'every chest of the section opens');
        assert.deepEqual([s1.complete, s1.completed], [true, s1.total]);
        assert.equal((await api('GET', `/lessons/${added[0].id}`)).status, 200, 'and one can still be taken');
    });
});
