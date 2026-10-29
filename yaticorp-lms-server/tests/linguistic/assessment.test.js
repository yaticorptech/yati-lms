/**
 * Two sections and the assessment between them (asked 2026-10-29: "remove the intermediate section, only keep
 * basic and advanced; after finishing the basics, conduct one assessment that decides whether the user is eligible
 * for advanced"): Intermediate is hidden; Beginner ends with an assessment of 20 questions on its own words, grammar
 * and sentences; 50% or more opens Advanced (80% at first, 50% the same day), and it can be taken again any time.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, startApp, cleanup } = require('../helpers');
const svc = require('../../src/linguistic/service');
const { LinguisticLesson } = require('../../src/linguistic/models');

let app, s, api, gate;
before(async () => {
    await connect();
    app = startApp({ mount: '/api/linguistic', router: require('../../src/linguistic') });
    await require('../../src/linguistic/seed').ensureSeeded();
    s = await makeUser('Ling Assessment');
    api = app.call(s.token);
    assert.equal((await api('POST', '/level', { level: 'beginner' })).status, 200);
    gate = await LinguisticLesson.findOne({ seedKey: 'review-assessment-beginner' }).lean();
});
after(async () => { await cleanup([s.user], app.server); });

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
const answersOf = (quiz) => Object.fromEntries(quiz.map((q) => [q.id, q.answer]));

describe('Beginner and Advanced, and the assessment between them', () => {
    test('two sections; Beginner ends with its assessment', async () => {
        const path = (await api('GET', '/path')).body;
        assert.deepEqual(path.levels.map((l) => l.level), ['beginner', 'advanced'], 'Intermediate hidden');
        const last = path.levels[0].units.at(-1).lessons.at(-1);
        assert.deepEqual([last.id, last.title, last.type, last.open], [String(gate._id), 'Beginner assessment', 'checkpoint', false], 'the very last stop of Beginner, shut until the lessons before it are done');
        assert.equal(path.levels[1].units.flatMap((u) => u.lessons).some((x) => x.title === 'Advanced assessment'), false, 'none after the last section');
        assert.equal((await svc.lessonsFor(await svc.progressOf(s.user._id))).some((l) => l.level === 'intermediate'), false, 'no Intermediate lesson in the student\'s course');
    });

    test('20 questions on Beginner, asked without the answers, 50% to pass', async () => {
        const all = (await svc.lessonsFor(await svc.progressOf(s.user._id))).filter((l) => l.level === 'beginner' && String(l._id) !== String(gate._id));
        await finish(all);
        const r = await api('GET', `/lessons/${gate._id}`);
        assert.equal(r.status, 200, 'open once every other Beginner lesson is done');
        assert.equal(r.body.passingScore, 50);
        assert.equal(r.body.quiz.length, 20);
        assert.deepEqual(r.body.words, [], 'its words are asked, not shown first');
        assert.ok(r.body.quiz.every((q) => q.answer === undefined), 'no answers sent');
        const kinds = svc.quizOf(svc.serve(gate, await svc.progressOf(s.user._id)));
        assert.ok(kinds.some((q) => q.id.startsWith('g~')), 'grammar'); assert.ok(kinds.some((q) => q.id.startsWith('s~')), 'sentences'); assert.ok(kinds.some((q) => q.kind && !q.id.includes('~')), 'words');
        assert.equal((await api('GET', '/path')).body.levels[1].open, false, 'Advanced waits for it');
    });

    test('below 50%: not passed, Advanced stays shut, the answers shown; taken again and passed with 50%: Advanced opens', async () => {
        const quiz = svc.quizOf(svc.serve(gate, await svc.progressOf(s.user._id)));
        const some = answersOf(quiz);
        for (const q of quiz.slice(0, 11)) some[q.id] = 'not this';
        const low = await api('POST', `/lessons/${gate._id}/quiz`, { answers: some });
        assert.deepEqual([low.body.percent, low.body.passed, low.body.passingScore], [45, false, 50], '9 of 20');
        assert.ok(low.body.results.filter((x) => !x.correct).every((x) => x.answer != null), 'each mistake with its right answer');
        assert.equal((await api('GET', '/path')).body.levels[1].open, false, 'still shut');
        const half = answersOf(quiz);
        for (const q of quiz.slice(0, 10)) half[q.id] = 'not this';
        const again = await api('POST', `/lessons/${gate._id}/quiz`, { answers: half });
        assert.deepEqual([again.body.percent, again.body.passed], [50, true], 'taken again, any time: 10 of 20 is enough');
        const path = (await api('GET', '/path')).body;
        assert.equal(path.levels[1].open, true, 'Advanced opens');
        assert.equal((await api('GET', '/')).body.level, 'advanced');
    });

    test('Bhagyashree\'s account 240100045056 (2026-10-29, for testing): every section and unit open from the start; no one else', async () => {
        const t = await makeUser('Ling Open All');
        const tApi = app.call(t.token);
        try {
            assert.equal((await tApi('POST', '/level', { level: 'beginner' })).status, 200);
            const shut = (await tApi('GET', '/path')).body;
            assert.deepEqual(shut.levels.map((l) => l.open), [true, false], 'an ordinary card: Advanced shut');
            // The same student, as that card (written with spaces, as some are stored).
            svc.noteOpenAll({ _id: t.user._id, cardNumber: '2401 0004 5056' });
            const path = (await tApi('GET', '/path')).body;
            assert.deepEqual(path.levels.map((l) => l.open), [true, true]);
            const lessons = path.levels.flatMap((l) => l.units.flatMap((u) => u.lessons)).filter((x) => !x.stop);
            assert.ok(lessons.every((x) => x.open), 'every unit\'s lessons, in both sections');
            const adv = lessons.find((x) => x.title !== 'Beginner assessment' && path.levels[1].units.some((u) => u.lessons.includes(x)));
            assert.equal((await tApi('GET', `/lessons/${adv.id}`)).status, 200, 'an Advanced lesson opens');
            assert.equal(svc.opensAll({ userId: s.user._id }), false, 'not for anyone else');
        } finally {
            await require('../../src/linguistic/models').LinguisticProgress.deleteMany({ userId: t.user._id });
            await require('../../src/models/User').deleteMany({ _id: t.user._id });
        }
    });
});
