/**
 * Advanced practised by skill (asked 2026-10-29: "don't give the same pattern for basic and advanced"; the user
 * chose "Skill practice (Duolingo style)"): Beginner keeps its topic units; Advanced has a track for each skill —
 * Stories, Listening, Speaking, Writing, Translation, Words & grammar — all open once the section is, each lesson
 * after the one before in its own track. An article is read and asked about in Stories; its writing is a lesson of
 * its own in Writing, done when every task is written.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, startApp, cleanup } = require('../helpers');
const { LinguisticLesson } = require('../../src/linguistic/models');
const { placeAt } = require('./unlock');

let app, s, api;
before(async () => {
    await connect();
    app = startApp({ mount: '/api/linguistic', router: require('../../src/linguistic') });
    await require('../../src/linguistic/seed').ensureSeeded();
    s = await makeUser('Ling Tracks');
    api = app.call(s.token);
    assert.equal((await api('POST', '/level', { level: 'beginner' })).status, 200);
    await placeAt(s.user, 'advanced');
});
after(async () => { await cleanup([s.user], app.server); });

const track = async (id) => (await api('GET', '/path')).body.levels.find((l) => l.level === 'advanced').units.find((u) => u.id === `advanced-${id}`);

describe('Advanced by skill', () => {
    test('Beginner keeps its topic units; Advanced has six tracks, every one open at its first lesson', async () => {
        const p = (await api('GET', '/path')).body;
        assert.ok(p.levels[0].units.slice(0, -1).every((u) => u.kind === 'topic'));
        const adv = p.levels.find((l) => l.level === 'advanced');
        assert.equal(adv.open, true);
        // Each skill in units of six (2026-11-14, the user: "keep 6 lessons in each unit"; chose "split into units of 6").
        assert.deepEqual([...new Set(adv.units.map((u) => u.skillTitle))], ['Stories', 'Listening', 'Speaking', 'Writing', 'Translation', 'Words & grammar']);
        assert.ok(adv.units.every((u) => u.lessons.length <= 6), adv.units.map((u) => `${u.title} ${u.lessons.length}`).join(', '));
        assert.deepEqual(adv.units.filter((u) => u.skillTitle === 'Words & grammar').map((u) => [u.id, u.title, u.lessons.length]).slice(0, 2), [['advanced-words', 'Words & grammar 1', 6], ['advanced-words-2', 'Words & grammar 2', 6]], 'the first unit keeps its id');
        for (const u of adv.units) {
            assert.ok(u.note, `${u.title}: what it is for`);
            assert.ok(!u.lessons.some((x) => x.stop), `${u.title}: no chests or practice stops`);
            // Each skill's first unit open at its first lesson; its later units wait for the one before (one chain a skill).
            if (u.trackPart === 1) {
                assert.equal(u.open, true, u.title);
                assert.deepEqual(u.lessons.slice(0, 2).map((x) => x.open), [true, false], `${u.title}: its first lesson open, the next after it`);
            } else assert.equal(u.open, false, `${u.title}: shut until ${u.skillTitle} ${u.trackPart - 1} is done`);
        }
        // Each article followed by its topic's picture story (comics.js, 2026-10-31).
        const stories = adv.units.filter((u) => u.skillTitle === 'Stories').flatMap((u) => u.lessons);
        assert.deepEqual(stories.map((x) => x.type), ['story', 'comic', 'story', 'comic', 'story', 'comic', 'story', 'comic', 'story', 'story', 'story', 'story'], 'the four articles, each with a picture story after it; then four new stories (2026-11-14)');
        assert.deepEqual((await track('listening')).lessons.map((x) => x.module), Array(6).fill('speaking'), 'the four conversations, and two new ones (2026-11-14)');
        assert.deepEqual((await track('writing')).lessons.map((x) => x.type), Array(6).fill('writing'), 'the four articles\' writing, and two new tasks (2026-11-14)');
    });

    test('a story is read and asked about, its writing kept for the Writing track', async () => {
        const story = (await track('stories')).lessons[0];
        const page = (await api('GET', `/lessons/${story.id}`)).body;
        assert.ok(page.learn.passage, 'the article'); assert.ok(page.quiz.length > 0, 'questions on it');
        assert.ok(!page.writing?.length, 'no writing here');
    });

    test('a writing lesson: its tasks, no quiz; done when every task is written; then the next writing lesson opens', async () => {
        const [first, second] = (await track('writing')).lessons;
        const page = (await api('GET', `/lessons/${first.id}`)).body;
        assert.deepEqual(page.writing.map((t) => t.type), ['sentence', 'letter']);
        assert.deepEqual(page.quiz, []);
        const early = (await api('POST', `/lessons/${first.id}/quiz`, { answers: {} })).body;
        assert.deepEqual([early.passed, early.percent], [false, 0], 'nothing written yet');
        const [t1, t2] = page.writing;
        assert.equal((await api('POST', `/lessons/${first.id}/writing/${t1.id}`, { answer: 'I would like to apply for the job of a trainee in your company.' })).status, 200);
        const half = (await api('POST', `/lessons/${first.id}/quiz`, { answers: {} })).body;
        assert.deepEqual([half.passed, half.percent], [false, 50]);
        const letter = 'To the Principal. I am writing to ask for one more computer lab for our college. Many students wait for a long time to use the computers. A new lab would help us finish our projects on time. Thank you for reading my letter. Yours faithfully, Asha.';
        assert.equal((await api('POST', `/lessons/${first.id}/writing/${t2.id}`, { answer: letter })).status, 200);
        const done = (await api('POST', `/lessons/${first.id}/quiz`, { answers: {} })).body;
        assert.deepEqual([done.passed, done.percent], [true, 100]);
        const after = (await track('writing')).lessons;
        assert.deepEqual([after[0].status, after.find((x) => x.id === second.id).open], ['completed', true]);
        assert.ok(await LinguisticLesson.exists({ seedKey: 'review-write-advanced-1' }));
    });
});
