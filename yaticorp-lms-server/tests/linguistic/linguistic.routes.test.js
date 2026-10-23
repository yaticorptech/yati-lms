/**
 * Linguistic Ability through its real routes, on the test database: a
 * student's whole workflow (placement, locked and open lessons, practice,
 * quiz, retries, mistakes and revision, translation checking, writing and
 * speaking, the daily challenge, resuming, level completion and the
 * certificate), the administrators' content management, settings and
 * reviews, the college coordinator's scope, and the guards.
 *
 * One file on purpose: lessons are shared content, and these steps change
 * them, so they must not run beside another file doing the same.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { connect, makeUser, makeAdmin, startApp, cleanup } = require('../helpers');
const { LinguisticLesson, LinguisticSubmission } = require('../../src/linguistic/models');
const svc = require('../../src/linguistic/service');
const Setting = require('../../src/models/Setting');

const STAMP = `${Date.now()}`;
let app, asha, ravi, kiran, admin, orgAdmin, org, otherOrg;
let api, raviApi, kiranApi, adminApi, orgApi;
const created = [];
let settingBefore;

const LearningActivity = () => require('../../src/rewards/models/LearningActivity');
const lessonBy = (key) => LinguisticLesson.findOne({ seedKey: key }).lean();
/** The right answers to a lesson's quiz, read from the database as the server would. */
const rightAnswers = async (id) => {
    const lesson = svc.serve(await LinguisticLesson.findById(id).lean(), {});
    return Object.fromEntries(svc.quizOf(lesson).map((q) => [q.id, lesson.module === 'translation' ? q.model : q.answer]));
};
const hasKey = (obj, keys) => JSON.stringify(obj).match(new RegExp(`"(${keys.join('|')})":`));

before(async () => {
    await connect();
    app = startApp({ mount: '/api/linguistic', router: require('../../src/linguistic') });
    const Org = require('../../src/organizations/models/Organization');
    org = await Org.create({ orgCode: `TLA-${STAMP}`, name: `Test Ling College ${STAMP}`, organizationType: 'college', email: `ling-a-${STAMP}@example.com`, status: 'active' });
    otherOrg = await Org.create({ orgCode: `TLB-${STAMP}`, name: `Test Ling Other ${STAMP}`, organizationType: 'college', email: `ling-b-${STAMP}@example.com`, status: 'active' });
    asha = await makeUser('Ling Asha'); ravi = await makeUser('Ling Ravi'); kiran = await makeUser('Ling Kiran');
    const User = require('../../src/models/User');
    await User.updateOne({ _id: asha.user._id }, { $set: { organizationId: org._id } });
    asha.user.organizationId = org._id;
    await User.updateOne({ _id: kiran.user._id }, { $set: { organizationId: otherOrg._id } });
    admin = await makeAdmin('Ling');
    const Admin = require('../../src/models/Admin');
    const oa = await Admin.create({ name: 'Ling Coordinator', email: `ling-orgadmin-${STAMP}@example.com`, password: 'Passw0rd!x', role: 'orgadmin', organizationId: org._id });
    orgAdmin = { admin: oa, token: jwt.sign({ id: String(oa._id) }, process.env.JWT_SECRET, { expiresIn: '10m' }) };
    api = app.call(asha.token); raviApi = app.call(ravi.token); kiranApi = app.call(kiran.token); adminApi = app.call(admin.token); orgApi = app.call(orgAdmin.token);
    settingBefore = await Setting.findOne().select('isLinguisticEnabled linguistic').lean();
    await require('../../src/linguistic/seed').ensureSeeded();
});

after(async () => {
    await Setting.updateOne({}, { $set: { isLinguisticEnabled: settingBefore?.isLinguisticEnabled !== false }, ...(settingBefore?.linguistic ? { } : { $unset: { linguistic: 1 } }) });
    if (settingBefore?.linguistic) await Setting.updateOne({}, { $set: { linguistic: settingBefore.linguistic } });
    await LinguisticLesson.deleteMany({ _id: { $in: created } });
    await require('../../src/organizations/models/Organization').deleteMany({ _id: { $in: [org._id, otherOrg._id] } });
    await require('../../src/models/Admin').deleteMany({ _id: { $in: [admin.admin._id, orgAdmin.admin._id] } });
    await cleanup([asha.user, ravi.user, kiran.user], app.server);
});

describe('a new student', () => {
    test('the dashboard: Beginner, no placement yet, every module, nothing done', async () => {
        const r = await api('GET', '/'); assert.equal(r.status, 200);
        assert.equal(r.body.level, 'beginner'); assert.equal(r.body.placement, null);
        assert.deepEqual(r.body.modules.map((m) => m.id), ['vocabulary', 'grammar', 'reading', 'speaking', 'translation']);
        assert.ok(r.body.overall.total >= 30); assert.equal(r.body.overall.completed, 0);
        assert.equal(r.body.daily.done, false); assert.equal(r.body.resume, null);
        assert.equal(r.body.achievements.find((a) => a.key === 'first_step').earned, false);
    });
    test('Beginner is open; the level above is closed; the second lesson waits for the first', async () => {
        const m = (await api('GET', '/modules/grammar')).body;
        assert.deepEqual(m.levels.map((l) => l.open), [true, false, false]);
        const [first, second] = m.levels[0].lessons;
        assert.equal(first.open, true); assert.equal(second.open, false);
        const locked = await api('GET', `/lessons/${second.id}`);
        assert.equal(locked.status, 403); assert.equal(locked.body.code, 'LESSON_LOCKED');
        const higher = m.levels[1].lessons[0];
        assert.equal((await api('GET', `/lessons/${higher.id}`)).status, 403, 'nor a higher level');
    });
    test('a lesson is sent without a single answer', async () => {
        for (const key of ['grammar-beginner-1', 'vocab-beginner-1', 'reading-beginner-1', 'speaking-beginner-1', 'translation-beginner-kn-en']) {
            const l = await lessonBy(key);
            const r = await api('GET', `/lessons/${l._id}`); assert.equal(r.status, 200, key);
            assert.equal(hasKey({ practice: r.body.practice, quiz: r.body.quiz, writing: r.body.writing, items: r.body.items }, ['answer', 'accepted', 'explanation', 'model']), null, `${key}: no answers`);
            assert.ok(r.body.quiz.length >= 4, key);
        }
        const v = (await api('GET', `/lessons/${(await lessonBy('vocab-beginner-1'))._id}`)).body;
        assert.equal(v.words[0].kannada, 'ಕುಟುಂಬ', 'the words themselves are what is learnt');
    });
});

describe('a grammar lesson, start to finish', () => {
    let lesson, quiz;
    before(async () => { lesson = await lessonBy('grammar-beginner-1'); });
    test('practice: instant feedback with the answer and why; a wrong answer is kept for revision', async () => {
        const wrong = await api('POST', `/lessons/${lesson._id}/check`, { section: 'practice', id: 'p1', given: 'a' });
        assert.equal(wrong.status, 200);
        assert.equal(wrong.body.correct, false); assert.equal(wrong.body.answer, 'an'); assert.match(wrong.body.explanation, /vowel sound/);
        const right = await api('POST', `/lessons/${lesson._id}/check`, { section: 'practice', id: 'p1', given: 'An' });
        assert.equal(right.body.correct, true);
        const review = (await api('GET', '/review')).body.mistakes;
        assert.equal(review.length, 0, 'answered right, the mistake is cleared');
        assert.equal((await api('POST', `/lessons/${lesson._id}/check`, { section: 'practice', id: 'p1', given: ' ' })).status, 400);
        assert.equal((await api('POST', `/lessons/${lesson._id}/check`, { section: 'answers', id: 'p1', given: 'a' })).status, 400);
    });
    test('the quiz below the passing score: not done, the answers shown, mistakes kept, the next lesson still shut', async () => {
        quiz = await rightAnswers(lesson._id);
        const r = await api('POST', `/lessons/${lesson._id}/quiz`, { answers: Object.fromEntries(Object.keys(quiz).map((k) => [k, 'zzz'])) });
        assert.equal(r.status, 200);
        assert.equal(r.body.passed, false); assert.equal(r.body.percent, 0); assert.equal(r.body.passingScore, 60);
        assert.ok(r.body.results.every((x) => x.answer && x.correct === false));
        assert.equal(r.body.next, null);
        const m = (await api('GET', '/modules/grammar')).body.levels[0].lessons;
        assert.equal(m[0].status, 'started'); assert.equal(m[0].bestScore, 0); assert.equal(m[1].open, false);
        assert.equal((await api('GET', '/review')).body.mistakes.length, Object.keys(quiz).length);
    });
    test('retried and passed: done, the next lesson opens, points recorded once', async () => {
        const r = await api('POST', `/lessons/${lesson._id}/quiz`, { answers: quiz });
        assert.equal(r.body.passed, true); assert.equal(r.body.percent, 100); assert.equal(r.body.firstPass, true);
        const next = (await api('GET', '/modules/grammar')).body.levels[0].lessons[1];
        assert.equal(r.body.next.id, next.id); assert.equal(next.open, true);
        const again = await api('POST', `/lessons/${lesson._id}/quiz`, { answers: quiz });
        assert.equal(again.body.firstPass, false);
        const paid = await LearningActivity().countDocuments({ userId: asha.user._id, type: { $in: ['linguistic_lesson', 'linguistic_perfect'] } });
        assert.equal(paid, 2, 'the lesson and the perfect score, once each, however often it is passed');
        const entry = (await api('GET', '/modules/grammar')).body.levels[0].lessons[0];
        assert.deepEqual([entry.status, entry.bestScore, entry.attempts], ['completed', 100, 3]);
    });
    test('revision: the quiz mistakes are asked again; a right answer clears one', async () => {
        assert.equal((await api('GET', '/review')).body.mistakes.length, 0, 'the passed retry cleared them all');
        // One wrong answer in another try: that one goes on the list.
        const [firstId] = Object.keys(quiz);
        await api('POST', `/lessons/${lesson._id}/quiz`, { answers: { ...quiz, [firstId]: 'zzz' } });
        const list = (await api('GET', '/review')).body.mistakes;
        assert.equal(list.length, 1);
        assert.equal(hasKey(list, ['answer', 'accepted', 'explanation']), null, 'no answers in the list');
        const one = list[0];
        assert.ok(one.question.prompt);
        const wrong = await api('POST', `/review/${one.id}`, { given: 'still wrong' });
        assert.equal(wrong.body.resolved, false);
        const q = svc.findQuestion(await LinguisticLesson.findById(lesson._id).lean(), 'quiz', (await svc.progressOf(asha.user._id)).mistakes.find((m) => String(m._id) === one.id).qid);
        const right = await api('POST', `/review/${one.id}`, { given: q.answer });
        assert.equal(right.body.resolved, true);
    });
});

describe('vocabulary, translation, writing and speaking', () => {
    test('a vocabulary spelling drill and its quiz', async () => {
        const l = await lessonBy('vocab-beginner-1');
        const r = await api('POST', `/lessons/${l._id}/check`, { section: 'spell', id: 'spell:1', given: 'Mother' });
        assert.equal(r.body.correct, true);
        const bad = await api('POST', `/lessons/${l._id}/check`, { section: 'spell', id: 'spell:1', given: 'mothr' });
        assert.equal(bad.body.correct, false); assert.equal(bad.body.near, true);
        const quiz = await api('POST', `/lessons/${l._id}/quiz`, { answers: await rightAnswers(l._id) });
        assert.equal(quiz.body.passed, true);
    });
    test('translation: an accepted alternative is right; a close one counts; a wrong one is kept', async () => {
        const l = await lessonBy('translation-beginner-kn-en');
        const alt = await api('POST', `/lessons/${l._id}/check`, { section: 'items', id: 'i3', given: "I'm Rani" });
        assert.equal(alt.body.correct, true); assert.equal(alt.body.verdict, 'exact'); assert.equal(alt.body.answer, 'My name is Rani.');
        assert.ok(alt.body.accepted.includes('I am Rani.')); assert.match(alt.body.explanation, /ನನ್ನ/);
        const wrong = await api('POST', `/lessons/${l._id}/check`, { section: 'items', id: 'i6', given: 'My house is big' });
        assert.equal(wrong.body.correct, false);
        assert.ok(wrong.body.diff.length > 0);
        assert.ok((await api('GET', '/review')).body.mistakes.some((m) => m.question.type === 'translation' && m.question.source === 'ಇದು ನನ್ನ ಮನೆ.'), 'kept for revision, with its Kannada');
        const kn = await lessonBy('translation-beginner-en-kn');
        const typed = await api('POST', `/lessons/${kn._id}/check`, { section: 'items', id: 'i5', given: 'ನಿಮ್ಮ ಹೆಸರೇನು' });
        assert.equal(typed.body.correct, true, 'a Kannada alternative, without its question mark');
        assert.equal(await LearningActivity().countDocuments({ userId: asha.user._id, type: 'linguistic_translation' }), 2);
    });
    test('writing: a jumbled sentence and a sentence are checked; a paragraph gets feedback, the model and a teacher', async () => {
        const l = await lessonBy('reading-beginner-1');
        const jumbled = await api('POST', `/lessons/${l._id}/writing/w1`, { answer: 'I wake up at six o\'clock' });
        assert.equal(jumbled.body.correct, true);
        const sentence = await api('POST', `/lessons/${l._id}/writing/w3`, { answer: 'i am happy' });
        assert.equal(sentence.body.correct, false); assert.ok(sentence.body.findings.some((f) => /capital letter/.test(f.text)));
        const para = await api('POST', `/lessons/${l._id}/writing/w4`, { answer: 'I wake up at six. Then I brush my teeth and drink milk. After that I go to college by bus. I recieve my notes from Sneha. My mornings are happy and busy every day.' });
        assert.equal(para.body.review, true); assert.equal(para.body.correct, null);
        assert.match(para.body.model, /I wake up at half past six/);
        assert.ok(para.body.findings.some((f) => /"recieve" should be "receive"/.test(f.text)));
        assert.equal(para.body.submission.status, 'pending');
        const again = await api('POST', `/lessons/${l._id}/writing/w4`, { answer: 'I wake up at six every morning and help my mother before I take the bus to college with my friend Sneha.' });
        assert.equal(again.body.submission.id, para.body.submission.id, 'a new draft replaces the one still waiting');
        assert.equal((await api('POST', `/lessons/${l._id}/writing/w9`, { answer: 'x' })).status, 400);
    });
    test('speaking: the self-assessment is saved with the sample answer', async () => {
        const l = await lessonBy('speaking-beginner-1');
        const r = await api('POST', `/lessons/${l._id}/speaking`, { checklist: [true, true, false, true, true, true], recorded: true });
        assert.deepEqual([r.body.ticked, r.body.total], [5, 6]); assert.match(r.body.sample, /Kiran/);
    });
    test('resume: the dashboard offers the lesson where the student stopped', async () => {
        const l = await lessonBy('speaking-beginner-1');
        await api('POST', `/lessons/${l._id}/step`, { step: 'quiz' });
        const d = (await api('GET', '/')).body;
        assert.deepEqual([d.resume.id, d.resume.step], [String(l._id), 'quiz']);
    });
});

describe('the learning path and the step-by-step lesson', () => {
    test('the path: three levels as sections, the five modules as units, and the lesson to take next', async () => {
        const p = (await api('GET', '/path')).body;
        assert.deepEqual(p.levels.map((l) => l.level), ['beginner', 'intermediate', 'advanced']);
        assert.deepEqual(p.levels[0].units.map((u) => u.module), ['vocabulary', 'grammar', 'reading', 'speaking', 'translation']);
        assert.ok(p.levels[0].units.every((u) => u.open && u.lessons.length >= 2));
        assert.equal(p.levels[1].open, false, 'Intermediate is shut before placement');
        const all = p.levels[0].units.flatMap((u) => u.lessons);
        const first = all.find((l) => l.open && l.status !== 'completed');
        assert.equal(p.current, first.id, 'the next lesson is the first open one not done');
        assert.ok(all.some((l) => l.status === 'completed'), 'the grammar lesson passed above shows as done');
    });
    test('a quiz answer is checked as it is given, and nothing is saved until the quiz is submitted', async () => {
        const l = await lessonBy('grammar-beginner-2');
        const before = await require('../../src/linguistic/models').LinguisticAttempt.countDocuments({ userId: asha.user._id });
        const right = await api('POST', `/lessons/${l._id}/quiz/check`, { id: 'q1', given: 'We' });
        assert.equal(right.status, 200); assert.equal(right.body.correct, true); assert.equal(right.body.answer, 'We');
        const wrong = await api('POST', `/lessons/${l._id}/quiz/check`, { id: 'q1', given: 'Us' });
        assert.equal(wrong.body.correct, false); assert.match(wrong.body.explanation, /subject/);
        assert.equal(await require('../../src/linguistic/models').LinguisticAttempt.countDocuments({ userId: asha.user._id }), before, 'no attempt recorded');
        assert.equal((await api('POST', `/lessons/${l._id}/quiz/check`, { id: 'q99', given: 'x' })).status, 400);
        const locked = await lessonBy('grammar-intermediate-1');
        assert.equal((await api('POST', `/lessons/${locked._id}/quiz/check`, { id: 'q1', given: 'x' })).status, 403, 'not for a locked lesson');
    });
    test('translations come with a word bank: the answer\'s words and a few others; tapped in order, it is right', async () => {
        const l = await lessonBy('translation-beginner-kn-en');
        const page = (await api('GET', `/lessons/${l._id}`)).body;
        const i3 = page.items.find((x) => x.id === 'i3');
        for (const w of ['My', 'name', 'is', 'Rani']) assert.ok(i3.bank.includes(w), w);
        assert.ok(i3.bank.length > 4 && i3.bank.length <= 8, 'a few extra words');
        assert.notDeepEqual(i3.bank.slice(0, 4), ['My', 'name', 'is', 'Rani'], 'not in order');
        assert.ok(page.quiz.every((q) => Array.isArray(q.bank)));
        const r = await api('POST', `/lessons/${l._id}/check`, { section: 'items', id: 'i3', given: 'My name is Rani' });
        assert.equal(r.body.correct, true);
        const adv = await lessonBy('translation-advanced-kn-en');
        assert.equal(svc.bankFor(adv.items.find((x) => x.id === 'i5'), adv), null, 'a passage is typed');
    });
    test('out of hearts: the questions not reached count as wrong but are not kept as mistakes', async () => {
        const l = await lessonBy('grammar-beginner-2');
        const r = await api('POST', `/lessons/${l._id}/quiz`, { answers: { q1: 'Us' } });
        assert.equal(r.status, 200); assert.equal(r.body.passed, false); assert.equal(r.body.score, 0);
        assert.ok(r.body.total > 1);
        const kept = (await svc.progressOf(asha.user._id)).mistakes.filter((m) => !m.resolvedAt && String(m.lessonId) === String(l._id));
        assert.deepEqual(kept.map((m) => [m.qid, m.given]), [['q1', 'Us']], 'only the answer given');
    });
    test('today: XP earned here and lessons completed, for the daily quests', async () => {
        const d = (await api('GET', '/')).body;
        assert.equal(typeof d.today.xp, 'number');
        assert.ok(d.today.lessons >= 2, `${d.today.lessons} lessons today`);
    });
});

describe('the daily challenge', () => {
    test('today\'s questions, without answers; answered once; points once', async () => {
        const g = await api('GET', '/daily'); assert.equal(g.status, 200);
        assert.equal(g.body.questions.length, 5); assert.equal(g.body.done, null);
        assert.equal(hasKey(g.body.questions, ['answer', 'explanation']), null);
        const qs = await svc.dailyQuestions(String(asha.user._id), g.body.level, 5);
        const r = await api('POST', '/daily', { answers: Object.fromEntries(qs.map((q) => [q.id, q.answer])) });
        assert.deepEqual([r.body.score, r.body.total], [5, 5]);
        const twice = await api('POST', '/daily', { answers: {} });
        assert.equal(twice.status, 409);
        assert.equal((await api('GET', '/')).body.daily.done, true);
        assert.equal(await LearningActivity().countDocuments({ userId: asha.user._id, type: 'linguistic_daily' }), 1);
    });
});

describe('the placement test', () => {
    test('questions without answers; all right places the student at Advanced and opens every level', async () => {
        const g = (await api('GET', '/placement')).body;
        assert.equal(g.questions.length, 15); assert.equal(hasKey(g.questions, ['answer', 'explanation']), null);
        const right = Object.fromEntries(require('../../src/linguistic/content/placement').map((q) => [q.id, q.answer]));
        const r = await api('POST', '/placement', { answers: right });
        assert.equal(r.body.level, 'advanced'); assert.equal(r.body.score, 15);
        assert.deepEqual((await api('GET', '/modules/translation')).body.levels.map((l) => l.open), [true, true, true]);
        const d = (await api('GET', '/')).body;
        assert.equal(d.level, 'advanced'); assert.equal(d.achievements.find((a) => a.key === 'first_step').earned, true);
    });
    test('a weak result recommends Beginner', async () => {
        const r = await raviApi('POST', '/placement', { answers: { b1: 'is', b2: 'small' } });
        assert.equal(r.body.level, 'beginner');
    });
    test('an open passage translation is compared with the model and sent for review, never marked wrong', async () => {
        const l = await lessonBy('translation-advanced-kn-en');
        const r = await api('POST', `/lessons/${l._id}/check`, { section: 'items', id: 'i5', given: 'I finished my degree last year. Now I am searching for a job in a software company. I like to learn new things.' });
        assert.equal(r.body.verdict, 'review'); assert.equal(r.body.correct, null);
        assert.ok(r.body.closeness > 50); assert.equal(r.body.submission.status, 'pending');
    });
});

describe('a whole level: completion and its certificate', () => {
    test('every Beginner lesson passed: the level is complete, the certificate is issued and downloads, the level moves up', async () => {
        const beginner = (await svc.publishedLessons()).filter((l) => l.level === 'beginner');
        let rounds = 0, last;
        // Pass them in the order they open.
        while (rounds++ < 20) {
            const view = await Promise.all(['vocabulary', 'grammar', 'reading', 'speaking', 'translation'].map((m) => raviApi('GET', `/modules/${m}`)));
            const todo = view.flatMap((v) => v.body.levels[0].lessons).filter((l) => l.open && l.status !== 'completed');
            if (!todo.length) break;
            for (const l of todo) last = await raviApi('POST', `/lessons/${l.id}/quiz`, { answers: await rightAnswers(l.id) });
        }
        assert.equal(beginner.length, 14, 'ten lessons and four reviews (reviews.js)');
        assert.equal(last.body.certificate?.level, 'beginner', 'the last lesson completes the level');
        const d = (await raviApi('GET', '/')).body;
        assert.equal(d.level, 'intermediate');
        assert.equal(d.levels[0].complete, true); assert.match(d.levels[0].certificate.number, /^YATI-ENG-B-/);
        assert.equal(d.achievements.find((a) => a.key === 'level_beginner').earned, true);
        const certs = (await raviApi('GET', '/certificates')).body.certificates;
        assert.deepEqual(certs.map((c) => c.level), ['beginner']);
        const pdf = await fetch(`http://127.0.0.1:${app.server.address().port}/api/linguistic/certificates/beginner/pdf`, { headers: { Authorization: `Bearer ${ravi.token}` } });
        assert.equal(pdf.headers.get('content-type'), 'application/pdf');
        assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0, 4).toString(), '%PDF');
        assert.equal((await raviApi('GET', '/certificates/advanced/pdf')).status, 404, 'not one not earned');
        assert.equal(await LearningActivity().countDocuments({ userId: ravi.user._id, type: 'linguistic_level' }), 1);
        assert.equal((await raviApi('DELETE', '/certificates/beginner')).body.hidden, true);
        assert.equal((await raviApi('GET', '/certificates')).body.certificates.length, 0);
    });
});

describe('administrators', () => {
    let lessonId;
    const draft = { module: 'grammar', level: 'beginner', order: 99, title: `Test lesson ${STAMP}`, summary: 'A test', learn: { intro: 'Learn this.', points: ['One point.'] },
        practice: [{ type: 'mcq', prompt: 'Pick one', options: ['yes', 'no'], answer: 'yes', explanation: 'Because.' }],
        quiz: [{ type: 'fill', prompt: 'I ___ fine.', answer: 'am', explanation: 'I am.' }, { type: 'rearrange', words: ['am', 'I', 'fine'], answer: 'I am fine.', explanation: 'S V.' }] };
    test('students cannot reach the admin routes; admins cannot use a student\'s', async () => {
        assert.equal((await api('GET', '/admin/lessons')).status, 401);
        assert.equal((await api('POST', '/admin/lessons', draft)).status, 401);
        assert.equal((await api('PUT', '/admin/config', { passingScore: { beginner: 30 } })).status, 401);
        assert.equal((await adminApi('GET', '/')).status, 401);
        assert.equal((await orgApi('GET', '/admin/lessons')).status, 403, 'a college coordinator neither');
    });
    test('a lesson with mistakes is refused with plain reasons', async () => {
        const r = await adminApi('POST', '/admin/lessons', { ...draft, title: '', quiz: [{ type: 'mcq', prompt: 'Q', options: ['a', 'b'], answer: 'c' }] });
        assert.equal(r.status, 400);
        assert.ok(r.body.errors.includes('Give the lesson a title.'));
        assert.ok(r.body.errors.some((e) => /the correct answer must be one of the options/.test(e)));
    });
    test('create a draft: students do not see it; publish: they do; edit; unpublish; delete', async () => {
        const c = await adminApi('POST', '/admin/lessons', draft); assert.equal(c.status, 201);
        lessonId = c.body.id; created.push(lessonId);
        assert.equal(c.body.status, 'draft');
        const seen = async () => (await raviApi('GET', '/modules/grammar')).body.levels[0].lessons.some((l) => l.id === lessonId);
        assert.equal(await seen(), false);
        assert.equal((await adminApi('PATCH', `/admin/lessons/${lessonId}/status`, { status: 'published' })).body.status, 'published');
        assert.equal(await seen(), true);
        const full = (await adminApi('GET', `/admin/lessons/${lessonId}`)).body;
        assert.equal(full.quiz[1].answer, 'I am fine.', 'admins see the answers');
        const e = await adminApi('PUT', `/admin/lessons/${lessonId}`, { ...full, title: 'Edited title' });
        assert.equal(e.body.title, 'Edited title');
        assert.equal((await adminApi('PATCH', `/admin/lessons/${lessonId}/status`, { status: 'draft' })).body.status, 'draft');
        assert.equal(await seen(), false);
        assert.equal((await adminApi('DELETE', `/admin/lessons/${lessonId}`)).body.deleted, true);
        assert.equal((await adminApi('GET', `/admin/lessons/${lessonId}`)).status, 404);
        assert.ok(!(await adminApi('GET', '/admin/lessons?module=grammar')).body.lessons.some((l) => l.id === lessonId));
    });
    test('the overview counts lessons by module and level', async () => {
        const o = (await adminApi('GET', '/admin/overview')).body;
        assert.ok(o.grid.vocabulary.beginner.published >= 2); assert.ok(o.students >= 2);
    });
    test('settings: passing scores are checked and take effect', async () => {
        assert.equal((await adminApi('PUT', '/admin/config', { passingScore: { beginner: 10 } })).status, 400);
        assert.equal((await adminApi('PUT', '/admin/config', { dailyChallengeSize: 40 })).status, 400);
        const ok = await adminApi('PUT', '/admin/config', { passingScore: { beginner: 80 }, certificateMinAverage: 75 });
        assert.equal(ok.body.passingScore.beginner, 80); assert.equal(ok.body.passingScore.intermediate, 70);
        const l = await lessonBy('grammar-beginner-2');
        assert.equal((await raviApi('GET', `/lessons/${l._id}`)).body.passingScore, 80);
        await adminApi('PUT', '/admin/config', { passingScore: { beginner: 60 }, certificateMinAverage: 70 });
    });
    test('progress: every student, with their level and results', async () => {
        const list = (await adminApi('GET', `/admin/students?search=${encodeURIComponent('Ling Ravi')}`)).body;
        assert.equal(list.students.length, 1);
        assert.deepEqual([list.students[0].level, list.students[0].completed, list.students[0].certificates], ['intermediate', 14, ['beginner']]);
        const one = (await adminApi('GET', `/admin/students/${ravi.user._id}`)).body;
        assert.ok(one.attempts.some((a) => a.kind === 'quiz' && a.passed));
        assert.ok(one.lessons.filter((l) => l.status === 'completed').length === 14);
    });
    test('reviews: the writing waits; a score and comment reach the student, with points at the passing score', async () => {
        const list = (await adminApi('GET', '/admin/submissions?status=pending')).body.submissions.filter((s) => s.student.id === String(asha.user._id));
        assert.ok(list.length >= 2, 'the paragraph and the passage translation');
        const writing = list.find((s) => s.kind === 'writing');
        assert.equal((await adminApi('PUT', `/admin/submissions/${writing.id}`, { score: 120 })).status, 400);
        const r = await adminApi('PUT', `/admin/submissions/${writing.id}`, { score: 85, comment: 'Clear and well ordered. Watch the spelling of "receive".' });
        assert.equal(r.body.status, 'reviewed'); assert.equal(r.body.reviewedBy, admin.admin.name);
        const mine = (await api('GET', '/submissions')).body.submissions.find((s) => s.id === writing.id);
        assert.deepEqual([mine.status, mine.score, mine.reviewedBy], ['reviewed', 85, admin.admin.name]); assert.match(mine.comment, /receive/);
        assert.equal(await LearningActivity().countDocuments({ userId: asha.user._id, type: 'linguistic_writing' }), 1);
    });
});

describe('a college coordinator', () => {
    test('sees only their own college\'s students and work', async () => {
        await kiranApi('GET', '/');   // Kiran (another college) has progress too
        const list = (await orgApi('GET', '/org/students')).body;
        assert.deepEqual(list.students.map((s) => s.id), [String(asha.user._id)]);
        assert.equal((await orgApi('GET', `/org/students/${ravi.user._id}`)).status, 404, 'not a student of theirs');
        const subs = (await orgApi('GET', '/org/submissions?status=all')).body.submissions;
        assert.ok(subs.length && subs.every((s) => s.student.id === String(asha.user._id)));
    });
    test('reviews their student\'s translation, and cannot touch another college\'s', async () => {
        const pending = (await orgApi('GET', '/org/submissions')).body.submissions;
        const t = pending.find((s) => s.kind === 'translation');
        const r = await orgApi('PUT', `/org/submissions/${t.id}`, { score: 70, comment: 'Good tenses.' });
        assert.equal(r.body.reviewedBy, 'Ling Coordinator');
        const other = await LinguisticSubmission.create({ userId: kiran.user._id, organizationId: otherOrg._id, lessonId: t.id.length ? (await lessonBy('reading-beginner-1'))._id : null, taskId: 'w4', kind: 'writing', answer: 'Kiran\'s paragraph.' });
        assert.equal((await orgApi('PUT', `/org/submissions/${other._id}`, { score: 50 })).status, 404);
        assert.equal((await kiranApi('GET', '/submissions')).body.submissions[0].status, 'pending', 'untouched');
    });
});

describe('the section switch', () => {
    test('locked: students are turned away; administrators still work', async () => {
        await Setting.updateOne({}, { $set: { isLinguisticEnabled: false } }, { upsert: true });
        require('../../src/linguistic/config').invalidateLinguisticSetting();
        const r = await api('GET', '/');
        assert.equal(r.status, 403); assert.equal(r.body.code, 'LINGUISTIC_LOCKED');
        assert.equal((await adminApi('GET', '/admin/lessons')).status, 200);
        await Setting.updateOne({}, { $set: { isLinguisticEnabled: true } });
        require('../../src/linguistic/config').invalidateLinguisticSetting();
        assert.equal((await api('GET', '/')).status, 200);
    });
});
