/**
 * The demo cards' Career Path lesson videos come watched (services/fullAccess.js;
 * the account owner's rule, 2026-10-09): opening or building a task's lesson on
 * one of the ten cards counts its video as watched to the last second — the
 * watch bar at 100%, nothing to sit through or skip past. Read and Quiz stay
 * manual: the task completes once the card reads the notes and passes the quiz
 * itself — and for a demo card one right answer passes the quiz (every other
 * student needs them all). Every other student: unchanged.
 *
 * Gemini and YouTube are stubbed on their module exports before the
 * controller loads, so nothing here spends quota or needs a key.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { connect, makeUser, cleanup } = require('../helpers');
const { DEMO_CARDS } = require('../../src/services/fullAccess');
const { normaliseCardNumber } = require('../../src/utils/cardNumber');

const gemini = require('../../src/career/services/geminiService');
const youtube = require('../../src/career/services/youtubeService');
const QUIZ = Array.from({ length: 5 }, (_, i) => ({ question: `Question ${i + 1}?`, options: ['Right', 'Wrong'], correctIndex: 0, explanation: 'Because.' }));
gemini.generateVideoSearchQuery = async () => 'research questions tutorial';
gemini.chooseVideoForTask = async () => null;
gemini.generateTaskStudyFromVideo = async () => ({ notes: { summary: 'Narrow the topic.', sections: [{ heading: 'Scope', points: ['Pick one angle'] }] }, quiz: QUIZ });
youtube.findVideoForTopic = async () => ({ videoId: 'vid-new', title: 'New video', channel: 'Chan', durationSeconds: 420, language: 'en' });

const { getTaskStudy, generateTaskStudy, updateStudyProgress, submitTaskQuiz } = require('../../src/career/controllers/taskStudyController');
const { startOfDay } = require('../../src/career/services/dailyPlanService');
const { xpFor } = require('../../src/rewards/services/configService');
const Task = require('../../src/career/models/Task');
const TaskStudy = require('../../src/career/models/TaskStudy');
const XpTransaction = require('../../src/rewards/models/XpTransaction');

/** Call a controller the way Express would, and resolve with what it sent. */
const invoke = (handler, user, { params = {}, body = {} } = {}) =>
    new Promise((resolve, reject) => {
        const res = {
            statusCode: 200,
            status(code) { this.statusCode = code; return this; },
            json(payload) { resolve({ status: this.statusCode, body: payload }); return this; }
        };
        Promise.resolve(handler({ user, params, body, query: {} }, res)).catch(reject);
    });

/** Today's task with a built lesson: a 512s video, notes, a five-question quiz. */
const taskWithLesson = async (user, title, progress = {}, bestScore = 3) => {
    const task = await Task.create({ userId: user._id, roadmapId: new mongoose.Types.ObjectId(), title, assignedDate: startOfDay(), status: 'Pending' });
    await TaskStudy.create({
        userId: user._id, taskId: task._id, mode: 'video',
        video: { videoId: 'vid-one', title: 'Tutorial', durationSeconds: 512, searchQuery: title },
        notes: { summary: 'Narrow the topic.' }, quiz: QUIZ,
        bestScore, attempts: 1,
        progress: { videoWatched: false, watchedSeconds: 0, notesRead: false, ...progress }
    });
    return task;
};

let demo, plain, card;
before(async () => {
    await connect();
    demo = await makeUser('DemoLesson');
    plain = await makeUser('PlainLesson');
    card = normaliseCardNumber(demo.user.cardNumber);
    DEMO_CARDS.add(card);
});
after(async () => {
    DEMO_CARDS.delete(card);
    await cleanup([demo.user, plain.user]);
});

test('a demo card opens a lesson with the video watched to 100%; Read and Quiz are still its own to do', async () => {
    const task = await taskWithLesson(demo.user, 'Narrow broad IT topics', {}, 0);
    const id = String(task._id);
    const res = await invoke(getTaskStudy, demo.user, { params: { id } });
    assert.equal(res.status, 200);
    assert.equal(res.body.progress.videoWatched, true, 'the video counts as watched — the bar shows 100%');
    assert.equal(res.body.progress.watchedSeconds, 512, 'to its last second');
    assert.equal(res.body.gates.videoWatched, true);
    assert.equal(res.body.progress.notesRead, false, 'the notes are not read for it');
    assert.equal(res.body.bestScore, 0, 'nor the quiz passed');
    assert.equal(res.body.gates.quizPassed, false);
    assert.equal(res.body.gates.passMark, 1, 'one right answer will do');
    assert.equal(res.body.gates.allMet, false);
    assert.equal(res.body.autoCompleted, undefined);
    assert.equal((await Task.findById(task._id)).status, 'Pending', 'the task waits for Read and Quiz');

    // Then the card does the rest by hand, the usual way, and the task completes.
    const read = await invoke(updateStudyProgress, demo.user, { params: { id }, body: { notesRead: true } });
    assert.equal(read.body.autoCompleted, false, 'the quiz is still to do');
    const miss = await invoke(submitTaskQuiz, demo.user, { params: { id }, body: { answers: [1, 1, 1, 1, 1] } });
    assert.equal(miss.body.passed, false, 'none right does not pass');
    const quiz = await invoke(submitTaskQuiz, demo.user, { params: { id }, body: { answers: [0, 1, 1, 1, 1] } });
    assert.equal(quiz.body.score, 1);
    assert.equal(quiz.body.passed, true, 'one right answer passes a demo card\'s quiz');
    assert.equal(quiz.body.gates.passMark, 1);
    assert.equal(quiz.body.autoCompleted, true);
    assert.equal((await Task.findById(task._id)).status, 'Completed');

    // Opening it again changes nothing and pays nothing twice.
    const taskRule = await xpFor('career_task');
    const again = await invoke(getTaskStudy, demo.user, { params: { id } });
    assert.equal(again.body.autoCompleted, undefined);
    if (taskRule > 0) assert.equal(await XpTransaction.countDocuments({ userId: demo.user._id, key: `career:task:${task._id}` }), 1);
});

test('a lesson built on a demo card comes with its video watched, and nothing else done', async () => {
    const task = await Task.create({ userId: demo.user._id, roadmapId: new mongoose.Types.ObjectId(), title: 'Write a research question', assignedDate: startOfDay(), status: 'Pending' });
    const res = await invoke(generateTaskStudy, demo.user, { params: { id: String(task._id) }, body: { mode: 'video', lang: 'en' } });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.progress.videoWatched, true);
    assert.equal(res.body.progress.watchedSeconds, 420);
    assert.equal(res.body.progress.notesRead, false);
    assert.equal(res.body.bestScore, 0);
    assert.equal(res.body.autoCompleted, undefined);
    assert.equal((await Task.findById(task._id)).status, 'Pending');
});

test('when the video was the only step left, opening the lesson completes the task', async () => {
    const task = await taskWithLesson(demo.user, 'Pick one angle', { notesRead: true }, QUIZ.length);
    const res = await invoke(getTaskStudy, demo.user, { params: { id: String(task._id) } });
    assert.equal(res.body.gates.allMet, true);
    assert.equal(res.body.autoCompleted, true, 'the planner is told the task is done');
    assert.equal(res.body.task.status, 'Completed');
    assert.equal(res.body.quiz[0].correctIndex, undefined, 'the answer key still stays on the server');
});

test('any other student still needs every answer right', async () => {
    const task = await taskWithLesson(plain.user, 'Narrow broad IT topics', { videoWatched: true, notesRead: true }, 0);
    const id = String(task._id);
    const four = await invoke(submitTaskQuiz, plain.user, { params: { id }, body: { answers: [0, 0, 0, 0, 1] } });
    assert.equal(four.body.score, 4);
    assert.equal(four.body.passed, false, '4 of 5 is not a pass');
    assert.equal(four.body.gates.passMark, 5);
    assert.equal(four.body.autoCompleted, false);
    assert.equal((await Task.findById(task._id)).status, 'Pending');
    const all = await invoke(submitTaskQuiz, plain.user, { params: { id }, body: { answers: [0, 0, 0, 0, 0] } });
    assert.equal(all.body.passed, true);
    assert.equal(all.body.autoCompleted, true);
});

test('any other student\'s lesson is left exactly as it was', async () => {
    const task = await taskWithLesson(plain.user, 'Narrow broad IT topics');
    const res = await invoke(getTaskStudy, plain.user, { params: { id: String(task._id) } });
    assert.equal(res.status, 200);
    assert.equal(res.body.progress.videoWatched, false);
    assert.equal(res.body.progress.watchedSeconds, 0);
    assert.equal(res.body.progress.notesRead, false);
    assert.equal(res.body.bestScore, 3);
    assert.equal(res.body.gates.quizPassed, false, '3 of 5 is not a pass for them');
    assert.equal(res.body.autoCompleted, undefined);
    assert.equal((await Task.findById(task._id)).status, 'Pending');
});
