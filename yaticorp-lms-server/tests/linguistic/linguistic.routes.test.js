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
const { LinguisticLesson, LinguisticSubmission, LinguisticProgress } = require('../../src/linguistic/models');
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
/**
 * Since 2026-10-24 the path opens one lesson after another (units.js); a
 * lesson once started stays open. Tests of what a lesson does start the
 * lessons they use, as a student who had reached them would have (unlock.js:
 * since 2026-10-28, with the sections before a later lesson finished).
 */
const { unlock } = require('./unlock');

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
    test('Beginner is open; the level above is closed; along the path, each lesson waits for the one before (2026-10-24)', async () => {
        const p = (await api('GET', '/path')).body;
        assert.deepEqual(p.levels.map((l) => l.open), [true, false]);
        const unit = p.levels[0].units[0];
        assert.equal(unit.title, 'Family', 'the first unit of the topic Home and family');
        assert.deepEqual(unit.lessons.map((l) => l.stop || l.review || l.module), ['vocabulary', 'grammar', 'chest', 'translation', 'hear', 'practice', 'unit'], 'words, grammar, a chest, sentences, listening, practice, then the unit review');
        assert.deepEqual(unit.lessons.map((l) => l.type), ['lesson', 'lesson', 'chest', 'lesson', 'listening', 'practice', 'review'], 'Duolingo\'s kinds of stop');
        const second = p.levels[0].units[1];
        assert.equal(second.title, 'Food, size and feelings', 'the topic\'s second unit');
        assert.deepEqual(second.lessons.map((l) => l.stop || l.review || l.module), ['vocabulary', 'reading', 'chest', 'speaking', 'translation', 'hear', 'practice', 'unit'], 'its own words, the story and a chest after it, speaking, sentences, listening, practice, review');
        assert.equal(second.id, 'beginner-1-2');
        const [first, next] = unit.lessons;
        assert.equal(first.open, true); assert.equal(next.open, false);
        const locked = await api('GET', `/lessons/${next.id}`);
        assert.equal(locked.status, 403); assert.equal(locked.body.code, 'LESSON_LOCKED');
        const higher = p.levels[1].units[0].lessons[0];
        assert.equal((await api('GET', `/lessons/${higher.id}`)).status, 403, 'nor a higher level');
    });
    test('a lesson is sent without a single answer', async () => {
        await unlock(asha.user, ['grammar-beginner-1', 'grammar-beginner-2', 'reading-beginner-1', 'speaking-beginner-1', 'translation-beginner-kn-en', 'translation-beginner-en-kn']);
        for (const key of ['grammar-beginner-1', 'vocab-beginner-1', 'reading-beginner-1', 'speaking-beginner-1', 'translation-beginner-kn-en']) {
            const l = await lessonBy(key);
            const r = await api('GET', `/lessons/${l._id}`); assert.equal(r.status, 200, key);
            assert.equal(hasKey({ practice: r.body.practice, quiz: r.body.quiz, writing: r.body.writing, items: r.body.items }, ['answer', 'accepted', 'explanation', 'model']), null, `${key}: no answers`);
            assert.ok(r.body.quiz.length >= 2, key);
        }
        const v = (await api('GET', `/lessons/${(await lessonBy('vocab-beginner-1'))._id}`)).body;
        assert.equal(v.words[0].kannada, 'ಕುಟುಂಬ', 'the words themselves are what is learnt');
        assert.deepEqual(v.words.map((w) => w.word), ['family', 'mother', 'father', 'house'], 'the first unit\'s half of the topic\'s words');
        await unlock(asha.user, ['vocab-beginner-1~2']);
        const v2 = (await api('GET', `/lessons/${(await lessonBy('vocab-beginner-1~2'))._id}`)).body;
        assert.deepEqual([v2.title, v2.words.map((w) => w.word)], ['Food, size and feelings', ['food', 'happy', 'big', 'small']], 'the second unit\'s, made from the same lesson');
        assert.ok(v2.words.every((w) => w.kannada) && v2.quiz.length >= 4);
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
        assert.equal(m[0].status, 'started'); assert.equal(m[0].bestScore, 0);
        const unit = (await api('GET', '/path')).body.levels[0].units[3].lessons;
        assert.equal(unit[0].open, false, 'a unit not reached still shut');
        assert.equal((await api('GET', '/review')).body.mistakes.length, Object.keys(quiz).length);
    });
    test('retried and passed: done, the next lesson on the path is offered, points recorded once', async () => {
        const r = await api('POST', `/lessons/${lesson._id}/quiz`, { answers: quiz });
        assert.equal(r.body.passed, true); assert.equal(r.body.percent, 100); assert.equal(r.body.firstPass, true);
        assert.equal(r.body.next.id, String((await lessonBy('translation-beginner-kn-en'))._id), 'the unit\'s Translation lesson comes after its Grammar');
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
        // The topic's last sentences are its second unit's (parts.js).
        assert.equal((await api('POST', `/lessons/${l._id}/check`, { section: 'items', id: 'i6', given: 'This is my house' })).status, 400, 'not this unit\'s sentence');
        await unlock(asha.user, ['translation-beginner-kn-en~2', 'translation-beginner-en-kn~2']);
        const l2 = await lessonBy('translation-beginner-kn-en~2');
        const wrong = await api('POST', `/lessons/${l2._id}/check`, { section: 'items', id: 'i6', given: 'My house is big' });
        assert.equal(wrong.body.correct, false);
        assert.ok(wrong.body.diff.length > 0);
        assert.ok((await api('GET', '/review')).body.mistakes.some((m) => m.question.type === 'translation' && m.question.source === 'ಇದು ನನ್ನ ಮನೆ.'), 'kept for revision, with its Kannada');
        const kn = await lessonBy('translation-beginner-en-kn~2');
        const typed = await api('POST', `/lessons/${kn._id}/check`, { section: 'items', id: 'i5', given: 'ನಿಮ್ಮ ಹೆಸರೇನು' });
        assert.equal(typed.body.correct, true, 'a Kannada alternative, without its question mark');
        assert.equal(await LearningActivity().countDocuments({ userId: asha.user._id, type: 'linguistic_translation' }), 2);
    });
    test('writing: a jumbled sentence and a sentence are checked; a paragraph is checked here, its grammar corrected, never sent to a teacher (2026-10-26)', async () => {
        const l = await lessonBy('reading-beginner-1');
        const jumbled = await api('POST', `/lessons/${l._id}/writing/w1`, { answer: 'I wake up at six o\'clock' });
        assert.equal(jumbled.body.correct, true);
        const sentence = await api('POST', `/lessons/${l._id}/writing/w3`, { answer: 'i am happy' });
        assert.equal(sentence.body.correct, false); assert.ok(sentence.body.findings.some((f) => /ದೊಡ್ಡ ಅಕ್ಷರ/.test(f.text)), "capital letter, in Kannada");
        const para = await api('POST', `/lessons/${l._id}/writing/w4`, { answer: 'I wake up at six. Then I brush my teeth and drink milk. After that he go to college by bus. I recieve my notes from Sneha. My mornings are happy and busy every day.' });
        assert.deepEqual([para.body.checked, para.body.review, para.body.correct], [true, undefined, null]);
        // In the student's language (Kannada, the default; 2026-10-27), the student's words kept.
        assert.ok(para.body.findings.some((f) => /ಕಾಗುಣಿತ ನೋಡಿ: "recieve" ಬದಲು "receive"/.test(f.text)), JSON.stringify(para.body.findings));
        const fixed = para.body.sentences.filter((x) => x.mistakes.length).map((x) => x.corrected);
        assert.deepEqual(fixed, ['After that he goes to college by bus.', 'I receive my notes from Sneha.'], 'the grammar (and the spelling), corrected here');
        assert.equal(para.body.total, 5); assert.equal(para.body.clean, 3);
        assert.equal(para.body.submission.status, 'checked', 'kept for the Writing tab, not sent to a teacher');
        const short = await api('POST', `/lessons/${l._id}/writing/w4`, { answer: 'Thankyou for the fever.' });
        assert.equal(short.status, 400, 'one sentence: not taken (2026-10-28)'); assert.match(short.body.message, /at least 3 sentences/);
        const noStops = await api('POST', `/lessons/${l._id}/writing/w4`, { answer: 'I wake up at six every morning and I help my mother and I take the bus' });
        assert.equal(noStops.status, 400, 'no full stops: no sentences');
        const again = await api('POST', `/lessons/${l._id}/writing/w4`, { answer: 'I wake up at six every morning. I help my mother before college. I take the bus with my friend Sneha.' });
        assert.equal(again.body.submission.id, para.body.submission.id, 'written again, the one checked before is replaced');
        const mine = (await api('GET', '/submissions')).body.submissions.find((x) => x.id === para.body.submission.id);
        assert.equal(mine.status, 'checked');
        assert.equal((await api('POST', `/lessons/${l._id}/writing/w9`, { answer: 'x' })).status, 400);
    });
    test('speaking (2026-10-28): the checklist is ticked from what was said, not by hand; saved with the sample answer', async () => {
        const l = await lessonBy('speaking-beginner-1');
        const said = 'Hello, my name is Asha. I am from Mysuru. I am studying in the first year of BCom. In my free time, I like reading stories. Nice to meet you.';
        const r = await api('POST', `/lessons/${l._id}/speaking`, { said, seconds: 15, recorded: true, checklist: [false, false, false, false, false, false] });
        assert.equal(r.status, 200);
        assert.deepEqual(r.body.ticks, [true, true, true, true, true, true], 'every point heard; the ticks sent are not taken');
        assert.deepEqual([r.body.ticked, r.body.total], [6, 6]); assert.match(r.body.sample, /Kiran/);
        const fast = await api('POST', `/lessons/${l._id}/speaking`, { said, seconds: 5, recorded: true });
        assert.deepEqual(fast.body.ticks, [true, true, true, true, true, false], 'too fast to be slow and clear');
        const seen = (await api('GET', `/lessons/${l._id}`)).body.speaking;
        assert.equal(seen.checks.length, 6, 'the page gets the checks, to tick as the student speaks');
        assert.equal(seen.need, 3);
    });
    test('speaking must be answered by voice (2026-10-28): not unrecorded, not under five words, not with under half the points heard', async () => {
        const l = await lessonBy('speaking-beginner-1');
        const none = await api('POST', `/lessons/${l._id}/speaking`, { said: 'Hello, my name is Asha and I study in Mysuru.', seconds: 6, recorded: false, checklist: [true, true, true, true, true, true] });
        assert.equal(none.status, 400); assert.match(none.body.message, /microphone/);
        const short = await api('POST', `/lessons/${l._id}/speaking`, { said: 'Hello I am', seconds: 3, recorded: true });
        assert.equal(short.status, 400, 'fewer than five words said');
        const off = await api('POST', `/lessons/${l._id}/speaking`, { said: 'The weather is very nice and cloudy.', seconds: 4, recorded: true, checklist: [true, true, true, true, true, true] });
        assert.equal(off.status, 400); assert.match(off.body.message, /0 of 6 heard, 3 needed/);
        const some = await api('POST', `/lessons/${l._id}/speaking`, { said: 'Hello, my name is Asha and I am from Mysuru. I study in college.', seconds: 30, recorded: true });
        assert.equal(some.status, 200); assert.equal(some.body.ticked, 3, 'name, place, studies; 14 words in 30 seconds is too slow for a steady pace');
    });
    test('resume: the dashboard offers the lesson where the student stopped', async () => {
        const l = await lessonBy('speaking-beginner-1');
        await api('POST', `/lessons/${l._id}/step`, { step: 'quiz' });
        const d = (await api('GET', '/')).body;
        assert.deepEqual([d.resume.id, d.resume.step], [String(l._id), 'quiz']);
    });
});

describe('the learning path and the step-by-step lesson', () => {
    test('the path: two sections (Intermediate hidden, 2026-10-29), topic units with a lesson of each kind, the level review with the assessment, and the lesson to take next', async () => {
        const p = (await api('GET', '/path')).body;
        assert.deepEqual(p.levels.map((l) => l.level), ['beginner', 'advanced']);
        assert.deepEqual(p.levels[0].units.map((u) => u.title), ['Family', 'Food, size and feelings', 'School and friends', 'Read and write', 'Getting around', 'Weather', 'Time and days', 'My day', 'Level review'], 'four topics (the third added 2026-10-24, the fourth 2026-10-28), each in two shorter units');
        assert.deepEqual(p.levels[0].units.map((u) => u.lessons.length), [7, 8, 7, 8, 7, 8, 7, 8, 5], 'each unit with its two stops; the level review, the assessment last');
        assert.equal(p.levels[0].units.at(-1).lessons.at(-1).title, 'Beginner assessment');
        assert.deepEqual(p.levels[0].units.map((u) => u.id), ['beginner-1', 'beginner-1-2', 'beginner-2', 'beginner-2-2', 'beginner-3', 'beginner-3-2', 'beginner-4', 'beginner-4-2', 'beginner-review']);
        assert.deepEqual(p.levels.map((l) => l.units.length), [9, 6], 'Beginner: eight units and the review; Advanced: a track for each skill (2026-10-29)');
        assert.deepEqual(p.levels[1].units.map((u) => [u.id, u.kind, u.title]), [['advanced-stories', 'track', 'Stories'], ['advanced-listening', 'track', 'Listening'], ['advanced-speaking', 'track', 'Speaking'], ['advanced-writing', 'track', 'Writing'], ['advanced-translation', 'track', 'Translation'], ['advanced-words', 'track', 'Words & grammar']]);
        assert.equal(p.levels[0].units[0].open, true);
        assert.equal(p.levels[1].open, false, 'Advanced is shut before Beginner is finished');
        const all = p.levels[0].units.flatMap((u) => u.lessons);
        const first = all.find((l) => !l.stop && l.open && l.status !== 'completed');
        assert.equal(p.current, first.id, 'the next lesson is the first open one not done (a chest is not a lesson)');
        assert.ok(all.some((l) => l.status === 'completed'), 'the grammar lesson passed above shows as done');
    });
    test('every lesson not about words starts with its unit\'s words to warm up on; a unit review asks its words new ways, and its sentences', async () => {
        const g = (await api('GET', `/lessons/${(await lessonBy('grammar-beginner-1'))._id}`)).body;
        const unitWords = (await lessonBy('vocab-beginner-1')).words.map((w) => w.word);
        assert.equal(g.warmup.length, 4);
        assert.ok(g.warmup.every((w) => unitWords.includes(w.word) && w.kannada), 'the unit\'s own words, with their meanings');
        const v = (await api('GET', `/lessons/${(await lessonBy('vocab-beginner-1'))._id}`)).body;
        assert.equal(v.warmup, undefined, 'not in a Words lesson');
        const review = await LinguisticLesson.findOne({ seedKey: 'review-unit-beginner-1' }).lean();
        // 2026-10-24: not the ways its Words lesson asked them (variety.test.js has every unit); listening has its own stop.
        const kinds = svc.quizOf(svc.serve(review, {})).map((q) => q.kind);
        const first = svc.quizOf(svc.serve(await lessonBy('vocab-beginner-1'), {})).map((q) => q.kind);
        assert.ok(kinds.slice(0, 4).every((k, i) => k !== first[i]), `${kinds.join()} / ${first.join()}`);
        assert.ok(kinds.includes('sentence') && kinds.includes('word'), kinds.join());
    });
    test('shorter units (2026-10-24) lock no one already past them: the lessons before the furthest started stay open; a finished level keeps the next open', async () => {
        await unlock(kiran.user, ['reading-beginner-1']);
        const units = (await kiranApi('GET', '/path')).body.levels[0].units;
        const [family, food] = units;
        assert.ok(family.lessons.filter((x) => !x.stop).every((x) => x.open), 'the whole first unit');
        assert.deepEqual(food.lessons.filter((x) => !x.stop).map((x) => x.open), [true, true, false, false, false, false], 'its new Words lesson, the story; not what comes after');
        assert.equal(units[2].lessons[0].open, false);
        assert.equal((await kiranApi('GET', '/path')).body.levels[1].open, false);
        await LinguisticProgress.updateOne({ userId: kiran.user._id }, { $push: { levelsCompleted: { level: 'beginner', completedAt: new Date(), average: 80, course: 'en' } } });
        assert.equal((await kiranApi('GET', '/path')).body.levels[1].open, false, 'Beginner finished before its new units came: Advanced waits for the assessment (2026-10-29)');
        const gate = await LinguisticLesson.findOne({ seedKey: 'review-assessment-beginner' }).lean();
        await LinguisticProgress.updateOne({ userId: kiran.user._id }, { $push: { lessons: { lessonId: gate._id, module: gate.module, level: 'beginner', status: 'completed', step: 'done', bestScore: 90, completedAt: new Date() } } });
        const p = (await kiranApi('GET', '/path')).body;
        assert.deepEqual([p.levels[1].open, p.levels[1].units[0].lessons[0].open], [true, true], 'and the assessment passed: open');
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
        const locked = await lessonBy('grammar-advanced-1');
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
    test('questions without answers; all right shows Advanced, but the student starts at Section 1 (2026-10-28)', async () => {
        const g = (await api('GET', '/placement')).body;
        assert.equal(g.questions.length, 15); assert.equal(hasKey(g.questions, ['answer', 'explanation']), null);
        const right = Object.fromEntries(require('../../src/linguistic/content/placement').map((q) => [q.id, q.answer]));
        const r = await api('POST', '/placement', { answers: right });
        assert.equal(r.body.level, 'advanced'); assert.equal(r.body.score, 15); assert.equal(r.body.kept, 'beginner', 'the level found, not where they start');
        assert.deepEqual((await api('GET', '/modules/translation')).body.levels.map((l) => l.open), [true, false], 'sections open by finishing the one before');
        const d = (await api('GET', '/')).body;
        assert.deepEqual([d.level, d.placement.found], ['beginner', 'advanced']); assert.equal(d.achievements.find((a) => a.key === 'first_step').earned, true);
    });
    test('a weak result recommends Beginner', async () => {
        const r = await raviApi('POST', '/placement', { answers: { b1: 'is', b2: 'small' } });
        assert.equal(r.body.level, 'beginner');
    });
    test('an open passage translation is compared with the model, its English grammar checked here, never marked wrong nor sent to a teacher', async () => {
        await unlock(asha.user, ['translation-advanced-kn-en~2']);
        const l = await lessonBy('translation-advanced-kn-en~2');
        const r = await api('POST', `/lessons/${l._id}/check`, { section: 'items', id: 'i5', given: 'I finished my degree last year. Now I am searching for a job in a software company. I like to learn new things.' });
        assert.equal(r.body.verdict, 'review'); assert.equal(r.body.correct, null);
        assert.ok(r.body.closeness > 50); assert.equal(r.body.submission.status, 'checked');
        assert.equal(r.body.total, 3); assert.equal(r.body.clean, 3, 'no grammar mistake in it');
    });
});

describe('a whole level: completion and its certificate', () => {
    test('every Beginner lesson passed: the level is complete, the certificate is issued and downloads, the level moves up', async () => {
        const beginner = (await svc.publishedLessons()).filter((l) => l.level === 'beginner');
        let rounds = 0, last;
        // Pass them in the order they open.
        while (rounds++ < 60) {
            const view = await Promise.all(['vocabulary', 'grammar', 'reading', 'speaking', 'translation'].map((m) => raviApi('GET', `/modules/${m}`)));
            const todo = view.flatMap((v) => v.body.levels[0].lessons).filter((l) => l.open && l.status !== 'completed');
            if (!todo.length) break;
            for (const l of todo) last = await raviApi('POST', `/lessons/${l.id}/quiz`, { answers: await rightAnswers(l.id) });
        }
        assert.equal(beginner.length, 49, 'twenty lessons (four topics), eight more for the topics\' second units, a listening stop and a review for each of the eight units, the level\'s four reviews, and its assessment (2026-10-29)');
        assert.equal(last.body.certificate?.level, 'beginner', 'the last lesson completes the level');
        const d = (await raviApi('GET', '/')).body;
        assert.equal(d.level, 'advanced', 'the assessment passed with the rest: on to Advanced (Intermediate hidden, 2026-10-29)');
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
        assert.deepEqual([list.students[0].level, list.students[0].completed, list.students[0].certificates], ['advanced', 49, ['beginner']]);
        const one = (await adminApi('GET', `/admin/students/${ravi.user._id}`)).body;
        assert.ok(one.attempts.some((a) => a.kind === 'quiz' && a.passed));
        assert.ok(one.lessons.filter((l) => l.status === 'completed').length === 49);
    });
    test('reviews: writing sent before 2026-10-26 waits; a score and comment reach the student, with points at the passing score; writing checked in a lesson never shows', async () => {
        // Since 2026-10-26 nothing new is sent to a teacher: these stand for writing sent before then.
        const reading = await lessonBy('reading-beginner-1'), passage = await lessonBy('translation-advanced-kn-en~2');
        await LinguisticSubmission.create({ userId: asha.user._id, organizationId: org._id, lessonId: reading._id, module: 'reading', level: 'beginner', taskId: 'w4', kind: 'writing', taskType: 'paragraph', answer: 'I wake up at six. I recieve my notes from Sneha.' });
        await LinguisticSubmission.create({ userId: asha.user._id, organizationId: org._id, lessonId: passage._id, module: 'translation', level: 'advanced', taskId: 'i5', kind: 'translation', taskType: 'paragraph translation', answer: 'I finished my degree last year.' });
        const all = (await adminApi('GET', '/admin/submissions?status=all')).body.submissions.filter((s) => s.student.id === String(asha.user._id));
        assert.ok(all.every((s) => s.status !== 'checked'), 'writing checked in a lesson is not a teacher\'s');
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
