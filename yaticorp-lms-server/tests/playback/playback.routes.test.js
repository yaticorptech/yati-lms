/**
 * The playback endpoints, against a real database: a student's positions are
 * theirs alone, a save is read back, a finished video is forgotten, and the
 * open lesson is remembered.
 *
 * Needs a database this test may write to (MONGO_URI); it makes two throwaway
 * students, a module and two lessons, and removes them afterwards.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, startApp, cleanup } = require('../helpers');

let app, me, api, other, otherApi, courseId, moduleRow, lessons;

before(async () => {
    await connect();
    app = startApp({ mount: '/api/user', router: require('../../src/routes/userRoutes') });
    me = await makeUser('Playback'); api = app.call(me.token);
    other = await makeUser('Other'); otherApi = app.call(other.token);
    const Module = require('../../src/models/Module');
    const Lesson = require('../../src/models/Lesson');
    courseId = `playback-test-${Date.now()}`;
    moduleRow = await Module.create({ courseId, title: 'Playback test module', order: 0 });
    lessons = await Lesson.insertMany([
        { moduleId: moduleRow._id, title: 'One', order: 0, videoSource: 'generic', videoUrl: 'https://example.test/one.mp4' },
        { moduleId: moduleRow._id, title: 'Two', order: 1, videoSource: 'generic', videoUrl: 'https://example.test/two.mp4' }
    ]);
});

after(async () => {
    await require('../../src/models/Lesson').deleteMany({ moduleId: moduleRow._id });
    await require('../../src/models/Module').deleteOne({ _id: moduleRow._id });
    await cleanup([me.user, other.user], app.server);
});

const path = () => `/courses/${courseId}/playback`;
const id = (i) => String(lessons[i]._id);

describe('the playback endpoints', () => {
    test('need a student', async () => {
        assert.equal((await app.call(null)('GET', path())).status, 401);
        assert.equal((await app.call(null)('PUT', path(), { lessonId: id(0), seconds: 1 })).status, 401);
    });

    test('start empty', async () => {
        const r = await api('GET', path());
        assert.equal(r.status, 200);
        assert.deepEqual(r.body, { activeLessonId: null, activeLessonAt: null, positions: {} });
    });

    test('a saved position is read back, with the client\'s time', async () => {
        const at = Date.now() - 5000;
        const r = await api('PUT', path(), { lessonId: id(0), seconds: 42.5, at });
        assert.equal(r.status, 200, r.body.message);
        assert.deepEqual(r.body.positions, { [id(0)]: { seconds: 42.5, at } });

        const g = await api('GET', path());
        assert.deepEqual(g.body.positions, { [id(0)]: { seconds: 42.5, at } });
    });

    test('a later save replaces it; another lesson sits beside it', async () => {
        await api('PUT', path(), { lessonId: id(0), seconds: 60 });
        const r = await api('PUT', path(), { lessonId: id(1), seconds: 7 });
        assert.equal(r.body.positions[id(0)].seconds, 60);
        assert.equal(r.body.positions[id(1)].seconds, 7);
    });

    test('zero forgets a lesson: the video was finished', async () => {
        const r = await api('PUT', path(), { lessonId: id(1), seconds: 0 });
        assert.equal(r.status, 200);
        assert.equal(r.body.positions[id(1)], undefined);
        assert.equal(r.body.positions[id(0)].seconds, 60, 'the other lesson is untouched');
    });

    test('the open lesson is remembered, on its own or with a position', async () => {
        const at = Date.now() - 1000;
        const r = await api('PUT', path(), { activeLessonId: id(1), at });
        assert.equal(r.body.activeLessonId, id(1));
        assert.equal(r.body.activeLessonAt, at);
        const both = await api('PUT', path(), { lessonId: id(0), seconds: 61, activeLessonId: id(0) });
        assert.equal(both.body.activeLessonId, id(0));
        assert.equal(both.body.positions[id(0)].seconds, 61);
    });

    test('another student sees none of it', async () => {
        const r = await otherApi('GET', path());
        assert.deepEqual(r.body, { activeLessonId: null, activeLessonAt: null, positions: {} });
    });

    test('a bad body is refused before anything is written', async () => {
        assert.equal((await api('PUT', path(), {})).status, 400);
        assert.equal((await api('PUT', path(), { lessonId: 'L1', seconds: 1 })).status, 400);
        assert.equal((await api('PUT', path(), { lessonId: id(0), seconds: -3 })).status, 400);
    });

    test('a lesson that does not exist is refused', async () => {
        const r = await api('PUT', path(), { lessonId: '64b7f0c2a1d2e3f4a5b6c7d8', seconds: 1 });
        assert.equal(r.status, 404);
        const r2 = await api('PUT', path(), { activeLessonId: '64b7f0c2a1d2e3f4a5b6c7d8' });
        assert.equal(r2.status, 404);
    });

    test('a clock far in the future is not trusted', async () => {
        const before = Date.now();
        const r = await api('PUT', path(), { lessonId: id(0), seconds: 70, at: before + 3600 * 1000 });
        const at = r.body.positions[id(0)].at;
        assert.ok(at >= before && at <= Date.now() + 1000, 'stamped with the server\'s time instead');
    });
});
