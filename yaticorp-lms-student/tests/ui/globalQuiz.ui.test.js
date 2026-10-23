/** The Global Quiz tab, taken end to end in a real browser. */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutChrome } from './harness.js';
import { paper, markGlobal, apiModule } from './fixtures.js';

// The paper as the server sends it: the published quiz's name and time limit
// travel with the questions, and `attempt` is the student's one attempt at
// it — null until Start. `paper` itself has no quiz, as a paper from before
// quizzes had names.
const timed = { ...paper, quiz: { title: 'Weekly GK', description: 'Five quick ones', timeLimitMinutes: 10 }, attempt: null };
/**
 * The POSTs the way the server answers them: Start opens an attempt and
 * fixes the paper's order, finish closes it, and anything else is marking.
 */
const posts = `(url, body) => {
  if (url.endsWith('/start')) return { attempt: { status: 'open', elapsedMs: 0, timedOut: false, answers: {} }, questions: ${JSON.stringify(paper.questions)} };
  if (url.endsWith('/finish')) return { attempt: { status: 'finished', elapsedMs: 1000, timedOut: !!body.timedOut, answers: {} } };
  return (${markGlobal})(url, body);
}`;
// The list of quizzes taken has its own route, named first: the stub answers a
// URL with the first route it contains, and the paper's would match it too.
const noHistory = { winScore: 60, attempts: [] };
const api = apiModule({ '/quizzes/global/history': noHistory, '/quizzes/global': timed }, posts);
const entry = `
import { createRoot } from 'react-dom/client';
import GlobalQuiz from '${srcFile('components/GlobalQuiz.jsx')}';
createRoot(document.getElementById('root')).render(<GlobalQuiz />);`;

const start = `click(/Start quiz/); await sleep(250);`;
// Only one question is on screen, so an answer is always given to `li` zero.
// Question 1's right answer is Mercury (index 1); question 2's is 30 (index 1).
const answer = (option) => `$$('li')[0].querySelectorAll('button')[${option}].click(); await sleep(250);`;
const nextQuestion = `click(/Next question/); await sleep(250);`;
const timer = `text($('[role=timer]'))`;
const posted = (path) => `window.__calls.filter((c) => c[0] === 'POST' && c[1].endsWith('${path}'))`;

describe('the global quiz', { skip: skipWithoutChrome }, () => {
    test('shows the published paper and a Start button, and asks nothing until it is pressed', async () => {
        const { result, errors } = await screen({
            entry, api, script: `
                await sleep(1200);
                const startRow = $$('button').find((b) => /Start quiz/.test(b.innerText))?.closest('.rounded-2xl');
                return {
                    row: text(startRow),
                    body: text(document.body),
                    questions: $$('li p').filter((p) => /\\?$/.test(p.innerText.trim())).length,
                    sizes: $$('button').filter((b) => /Qs$/.test(b.innerText)).length,
                    startButton: !!startRow,
                    clock: !!$('[role=timer]'),
                    started: ${posted('/start')}.length
                };` });
        assert.deepEqual(errors, []);
        // The banner says what the Global Quiz is; the quiz itself is the first
        // row of the list, with its own name, description and facts.
        assert.match(result.row, /^Weekly GK\s*New/, 'the paper is called what the administrator called it');
        assert.match(result.row, /Five quick ones/);
        assert.match(result.row, /2 questions · 10 minutes · One attempt/);
        assert.match(result.body, /Questions\s*2\s*Time\s*10 minutes\s*Attempts\s*One\s*Win XP at\s*60%\+/, 'until a quiz is taken, the banner says what one is');
        assert.match(result.body, /Your score will be listed here once you finish/);
        assert.equal(result.questions, 0, 'no question is shown before Start');
        assert.equal(result.sizes, 0, 'there is nothing to choose: the administrator sized the paper');
        assert.equal(result.startButton, true);
        assert.equal(result.clock, false, 'the clock is not running yet');
        assert.equal(result.started, 0, 'no attempt is opened until Start');
    });

    test('Start opens the attempt on the server, brings the first question and starts the clock', async () => {
        const { result, errors } = await screen({
            entry, api, script: `
                await sleep(700);
                ${start}
                return {
                    started: ${posted('/start')}.length,
                    questions: $$('li p').filter((p) => /\\?$/.test(p.innerText.trim())).map(text),
                    categories: $$('p').filter((p) => /^(General Knowledge|Aptitude)$/i.test(p.innerText.trim())).map((p) => p.innerText.trim()),
                    noCourseWords: /course|lesson/i.test(text(document.body)),
                    clock: ${timer},
                    label: $('[role=timer]').getAttribute('aria-label'),
                    counter: text($$('p').find((p) => /answered/.test(p.innerText)))
                };` });
        assert.deepEqual(errors, []);
        assert.equal(result.started, 1, 'Start is reported to the server, which keeps the attempt');
        assert.deepEqual(result.questions, ['Which planet is closest to the Sun?'], 'only the first question is on screen');
        assert.deepEqual(result.categories, ['General Knowledge']);
        assert.equal(result.noCourseWords, false, 'nothing ties these questions to a course any more');
        assert.match(result.clock, /^(10:00|9:5\d)$/, 'the clock counts down from the limit');
        assert.match(result.label, /^Time left/);
        assert.equal(result.counter, '0 of 2 answered');
    });

    test('with no time limit the clock counts up instead', async () => {
        const { result } = await screen({
            entry, api: apiModule({ '/quizzes/global/history': noHistory, '/quizzes/global': { ...paper, attempt: null } }, posts), script: `
                await sleep(700);
                const before = text(document.body);
                ${start}
                await sleep(1300);
                return { before, clock: ${timer}, label: $('[role=timer]').getAttribute('aria-label') };` });
        assert.match(result.before, /No time limit/);
        assert.match(result.clock, /^0:0[1-3]$/);
        assert.match(result.label, /^Time taken/);
    });

    test('when the time runs out the paper closes with the score so far, and the server is told', async () => {
        // A limit of 1/60 of a minute is 1 s: the server only ever sends whole
        // minutes, but the clock does not care, and a test cannot wait a minute.
        const quick = apiModule({ '/quizzes/global/history': noHistory, '/quizzes/global': { ...paper, quiz: { title: 'Quick', description: '', timeLimitMinutes: 1 / 60 }, attempt: null } }, posts);
        const { result, errors } = await screen({
            entry, api: quick, script: `
                await sleep(700);
                ${start}
                ${answer(1)}
                await sleep(2600);
                return {
                    body: text(document.body),
                    taken: $('[role=timer]').getAttribute('aria-label'),
                    clocks: $$('[role=timer]').length,
                    cards: $$('li').length,
                    locked: $$('li')[1].querySelectorAll('button')[1].disabled,
                    finished: ${posted('/finish')}.map((c) => c[2])
                };` });
        assert.deepEqual(errors, []);
        assert.match(result.body, /Time’s up! 1 of 2 correct/);
        assert.match(result.body, /1 question was left unanswered/);
        // The countdown goes with the paper; what stays is the time it took,
        // which is the limit itself. The tick that notices comes up to a
        // second late, and was counted: this paper read 0:02.
        assert.equal(result.clocks, 1, 'only the time taken is left');
        assert.equal(result.taken, 'Time taken 0:01');
        assert.equal(result.cards, 2, 'the whole paper comes back to look over');
        assert.equal(result.locked, true, 'nothing can be answered once the clock has run out');
        assert.deepEqual(result.finished, [{ timedOut: true }], 'the attempt is closed on the server as timed out');
    });

    test('marks an answer the moment it is given, without waiting for the rest', async () => {
        const { result, errors } = await screen({
            entry, api, script: `
                await sleep(700);
                ${start}
                ${answer(1)}
                return {
                    body: text(document.body),
                    posted: ${posted('/submit')}.map((c) => c[2].answers),
                    counter: text($$('p').find((p) => /answered/.test(p.innerText)))
                };` });
        assert.deepEqual(errors, []);
        assert.match(result.body, /Correct!/);
        assert.match(result.body, /Mercury orbits closest/);
        assert.equal(/Ten per cent is 20/.test(result.body), false, 'the second question keeps its answer to itself');
        assert.deepEqual(result.posted, [[{ questionId: 'q1', answer: 1 }]], 'one question is marked at a time, by question id');
        assert.equal(result.counter, '1 of 2 answered');
    });

    test('a wrong answer says so and names the right one', async () => {
        const { result } = await screen({
            entry, api, script: `
                await sleep(700);
                ${start}
                ${answer(1)}
                ${nextQuestion}
                ${answer(0)}
                return { body: text(document.body) };` });
        assert.match(result.body, /Not quite\./);
        assert.match(result.body, /The answer is 30/);
        assert.match(result.body, /Ten per cent is 20/);
    });

    test('an answer cannot be changed once it has been marked', async () => {
        const { result } = await screen({
            entry, api, script: `
                await sleep(700);
                ${start}
                ${answer(1)}
                ${answer(0)}
                return { posted: ${posted('/submit')}.length, body: text(document.body) };` });
        assert.equal(result.posted, 1, 'the second click on the same question does nothing');
        assert.match(result.body, /Correct!/);
    });

    test('the score arrives once every question has been answered, closes the attempt, and offers no second go', async () => {
        const { result } = await screen({
            entry, api, script: `
                await sleep(700);
                ${start}
                ${answer(1)}
                ${nextQuestion}
                ${answer(0)}
                const before = text(document.body);
                click(/See your score/); await sleep(400);
                const body = text(document.body);
                return {
                    hadScoreEarly: /of 2 correct/.test(before),
                    counter: text($$('p').find((p) => /answered/.test(p.innerText))),
                    score: text($$('span').find((s) => /^\\d+%$/.test(s.innerText.trim()))),
                    correct: /1 of 2 correct/.test(body),
                    timedOut: /Time’s up/.test(body),
                    once: /That was your one attempt/.test(body),
                    // A win pays XP (the admin's "Win the Global Quiz" rule), so
                    // the note must not say XP is unchanged.
                    xpUnchanged: /XP (are|is) unchanged/i.test(body),
                    courseOnly: /does not count towards your course progress/.test(body),
                    buttons: $$('button').map((b) => b.innerText.trim()).filter(Boolean),
                    finished: ${posted('/finish')}.map((c) => c[2])
                };` });
        assert.equal(result.hadScoreEarly, false, 'the score waits to be asked for');
        assert.equal(result.counter, null, 'the progress strip gives way to the score');
        assert.equal(result.score, '50%');
        assert.ok(result.correct, 'the tally is shown');
        assert.equal(result.timedOut, false, 'finishing in time is not a time-out');
        assert.ok(result.once, 'it says this was the one attempt');
        assert.equal(result.xpUnchanged, false, 'a win earns XP, so the note does not say XP is unchanged');
        assert.ok(result.courseOnly, 'it says the paper does not count towards course progress');
        assert.ok(!result.buttons.some((l) => /again|New questions|Start quiz/i.test(l)), `no way to retake, but found ${JSON.stringify(result.buttons)}`);
        assert.deepEqual(result.finished, [{ timedOut: false }], 'the attempt is closed on the server');
    });

    test('the score button only appears once every question is answered', async () => {
        const { result } = await screen({
            entry, api, script: `
                await sleep(700);
                ${start}
                const labels = () => $$('button').map((b) => b.innerText.trim());
                const first = labels();
                ${answer(1)}
                ${nextQuestion}
                const lastOpen = labels();
                const hint = /Choose an answer to finish/.test(text(document.body));
                ${answer(0)}
                return { first, lastOpen, hint, end: labels() };` });
        assert.ok(result.first.some((l) => /Skip question/.test(l)));
        assert.ok(result.first.some((l) => /Next question/.test(l)));
        assert.ok(!result.lastOpen.some((l) => /See your score/.test(l)), 'no end button while a question is unanswered');
        assert.ok(!result.lastOpen.some((l) => /Skip question/.test(l)), 'nothing left to skip to');
        assert.ok(result.hint, 'it says an answer is needed');
        assert.ok(result.end.some((l) => /See your score/.test(l)), 'the score is offered once all are answered');
        assert.ok(!result.end.some((l) => /Skip question|Next question/.test(l)));
    });

    test('finishing opens a Quiz completed popup with the score, which closes to the review', async () => {
        const { result } = await screen({
            entry, api, script: `
                await sleep(700);
                ${start}
                ${answer(1)}
                ${nextQuestion}
                ${answer(0)}
                click(/See your score/);
                // The score counts up to its figure (~1 s): read once it rests.
                await sleep(1300);
                const dialog = $('[role=dialog]');
                const shown = dialog ? text(dialog) : '';
                click(/Review answers/); await sleep(250);
                return { shown, closed: !$('[role=dialog]'), cards: $$('li').length };` });
        assert.match(result.shown, /Quiz completed!/);
        assert.match(result.shown, /(^|\D)50%/, 'the score, never below zero on the way (it read -2%)');
        assert.doesNotMatch(result.shown, /-\d+%/);
        assert.match(result.shown, /1\s*Correct/);
        assert.match(result.shown, /1\s*Wrong/);
        assert.equal(result.closed, true, 'Review answers closes it');
        assert.equal(result.cards, 2, 'the answers are there to review');
    });

    test('a skipped question comes back round before the score is offered', async () => {
        const { result } = await screen({
            entry, api, script: `
                await sleep(700);
                ${start}
                const firstQ = text($$('li')[0]);
                click(/Skip question/); await sleep(250);
                ${answer(0)}
                const labelsAfterLast = $$('button').map((b) => b.innerText.trim());
                ${nextQuestion}
                const backTo = text($$('li')[0]);
                return { labelsAfterLast, back: backTo === firstQ || backTo.startsWith(firstQ.slice(0, 20)) };` });
        assert.ok(!result.labelsAfterLast.some((l) => /See your score/.test(l)), 'the skipped question still needs an answer');
        assert.ok(result.labelsAfterLast.some((l) => /Next question/.test(l)));
        assert.ok(result.back, 'Next goes back to the skipped question');
    });

    test('Next waits for an answer, and Skip does not', async () => {
        const { result } = await screen({
            entry, api, script: `
                await sleep(700);
                ${start}
                const nextBtn = () => $$('button').find((b) => /Next question/.test(b.innerText));
                const question = () => text($$('li p').find((p) => /\\?$/.test(p.innerText.trim())));
                const lockedAtFirst = nextBtn().disabled;
                nextBtn().click(); await sleep(200);
                const afterBlockedNext = question();
                click(/Skip question/); await sleep(250);
                return { lockedAtFirst, afterBlockedNext, afterSkip: question(), answered: text($$('p').find((p) => /answered/.test(p.innerText))) };` });
        assert.equal(result.lockedAtFirst, true, 'Next is not offered until the question is answered');
        assert.match(result.afterBlockedNext, /Which planet is closest to the Sun\?/);
        assert.match(result.afterSkip, /What is 15% of 200\?/, 'Skip moves on regardless');
        assert.equal(result.answered, '0 of 2 answered', 'a skipped question is left unanswered');
    });

    test('Next brings the following question, and only that one', async () => {
        const { result } = await screen({
            entry, api, script: `
                await sleep(700);
                ${start}
                ${answer(1)}
                ${nextQuestion}
                return {
                    cards: $$('li').length,
                    questions: $$('li p').filter((p) => /\\?$/.test(p.innerText.trim())).map(text),
                    body: text(document.body)
                };` });
        assert.equal(result.cards, 1, 'the answered question is put away');
        assert.deepEqual(result.questions, ['What is 15% of 200?']);
        assert.equal(/Mercury orbits closest/.test(result.body), false, 'the previous explanation goes with it');
    });

    test('the whole paper comes back once the score is in, and the clock stops', async () => {
        const { result } = await screen({
            entry, api, script: `
                await sleep(700);
                ${start}
                ${answer(1)}
                ${nextQuestion}
                ${answer(0)}
                click(/See your score/); await sleep(400);
                const atScore = ${timer};
                await sleep(1200);
                return {
                    cards: $$('li').length,
                    body: text(document.body),
                    locked: $$('li')[1].querySelectorAll('button')[1].disabled,
                    atScore, later: ${timer}
                };` });
        assert.equal(result.cards, 2, 'both questions are there to look back over');
        assert.match(result.body, /Mercury orbits closest/);
        assert.match(result.body, /Ten per cent is 20/);
        assert.equal(result.locked, true, 'nothing can be answered after the score');
        assert.equal(result.later, result.atScore, 'the clock stops where the paper closed');
    });

    test('a finished attempt comes back as its score alone, with no review, no Start and no retake', async () => {
        const done = {
            ...timed,
            attempt: {
                status: 'finished', elapsedMs: 95_000, timedOut: false, score: 50, correctCount: 1, totalQuestions: 2,
                answers: {
                    q1: { questionId: 'q1', providedAnswer: 1, correctAnswer: 1, isCorrect: true, explanation: 'Mercury orbits closest.' },
                    q2: { questionId: 'q2', providedAnswer: 0, correctAnswer: 1, isCorrect: false, explanation: 'Ten per cent is 20, so fifteen is 30.' }
                }
            }
        };
        // The server lists the attempt among the quizzes taken, as it does once it is finished.
        const history = { winScore: 60, attempts: [{ id: 'a1', title: 'Weekly GK', finishedAt: '2026-10-12T09:00:00.000Z', elapsedMs: 95_000, timedOut: false, correctCount: 1, totalQuestions: 2, score: 50, won: false }] };
        const { result, errors } = await screen({
            entry, api: apiModule({ '/quizzes/global/history': history, '/quizzes/global': done }, posts), script: `
                await sleep(1500);
                return {
                    body: text(document.body),
                    score: text($$('span').find((s) => /^\\d+%$/.test(s.innerText.trim()))),
                    questions: $$('li p').filter((p) => /\\?$/.test(p.innerText.trim())).length,
                    dialog: !!$('[role=dialog]'),
                    buttons: $$('button').map((b) => b.innerText.trim()).filter(Boolean),
                    posts: window.__calls.filter((c) => c[0] === 'POST').length
                };` });
        assert.deepEqual(errors, []);
        // The result is a row of the list of quizzes taken, and the banner
        // counts it in the student's record.
        assert.equal(result.score, '50%');
        assert.match(result.body, /Weekly GK.*1 of 2 correct\s*1:35/s, 'the row: the quiz, the tally and the time it took');
        assert.match(result.body, /All caught up/);
        assert.match(result.body, /Quizzes taken\s*1\s*Average\s*50%\s*Best score\s*50%\s*Wins\s*0/, 'the record, counted up to its figures (it read 0, 1% and 1%)');
        assert.doesNotMatch(result.body, /Mercury orbits closest|The answer is 30/, 'the questions are not shown again');
        assert.equal(result.questions, 0, 'no question cards on a later visit');
        assert.equal(result.dialog, false, 'no popup on a later visit');
        assert.ok(!result.buttons.some((l) => /Start quiz|again/i.test(l)), `no Start and no retake, but found ${JSON.stringify(result.buttons)}`);
        assert.equal(result.posts, 0, 'nothing is started or re-closed');
    });

    test('an attempt under way is resumed at its first unanswered question, with its clock', async () => {
        const open = {
            ...timed,
            attempt: {
                status: 'open', elapsedMs: 30_000, timedOut: false,
                answers: { q1: { questionId: 'q1', providedAnswer: 1, correctAnswer: 1, isCorrect: true, explanation: 'Mercury orbits closest.' } }
            }
        };
        const { result, errors } = await screen({
            entry, api: apiModule({ '/quizzes/global/history': noHistory, '/quizzes/global': open }, posts), script: `
                await sleep(700);
                return {
                    questions: $$('li p').filter((p) => /\\?$/.test(p.innerText.trim())).map(text),
                    counter: text($$('p').find((p) => /answered/.test(p.innerText))),
                    clock: ${timer},
                    startButton: $$('button').some((b) => /Start quiz/.test(b.innerText)),
                    started: ${posted('/start')}.length
                };` });
        assert.deepEqual(errors, []);
        assert.deepEqual(result.questions, ['What is 15% of 200?'], 'straight to the question still open');
        assert.equal(result.counter, '1 of 2 answered');
        // A countdown rounds up, so 9:30 and a few milliseconds reads 9:31.
        assert.match(result.clock, /^9:(31|30|29)$/, 'the clock carries on from where the server has it');
        assert.equal(result.startButton, false);
        assert.equal(result.started, 0, 'no new attempt is asked for');
    });

    test('a Start the server refuses as already taken shows the result it has', async () => {
        // The server's figures are what is shown: a closed attempt's score comes from its record, not a recount here.
        const done = { ...timed, attempt: { status: 'finished', elapsedMs: 60_000, timedOut: false, score: 100, correctCount: 2, totalQuestions: 2, answers: {} } };
        const refusing = `
const routes = { fresh: ${JSON.stringify(timed)}, done: ${JSON.stringify(done)} };
window.__calls = []; let gets = 0;
export default {
  // The list of quizzes taken has the attempt in it once the server has it as taken, which is when it says so.
  get: (url) => { window.__calls.push(['GET', url]);
    if (url.endsWith('/history')) return Promise.resolve({ data: { winScore: 60, attempts: gets > 1 ? [{ id: 'a1', title: 'Weekly GK', finishedAt: '2026-10-12T09:00:00.000Z', elapsedMs: 60000, correctCount: 2, totalQuestions: 2, score: 100, won: true }] : [] } });
    gets += 1; return Promise.resolve({ data: gets === 1 ? routes.fresh : routes.done }); },
  post: (url, body) => { window.__calls.push(['POST', url, body]); return Promise.reject({ response: { status: 409, data: { code: 'ALREADY_ATTEMPTED', message: 'You have already taken this quiz.' } } }); },
  put: () => Promise.resolve({ data: {} }), delete: () => Promise.resolve({ data: {} })
};`;
        const { result, errors } = await screen({
            entry, api: refusing, script: `
                await sleep(700);
                ${start}
                await sleep(500);
                return { body: text(document.body), startButton: $$('button').some((b) => /Start quiz/.test(b.innerText)), gets: window.__calls.filter((c) => c[0] === 'GET' && c[1].endsWith('/quizzes/global')).length };` });
        assert.deepEqual(errors, []);
        assert.equal(result.gets, 2, 'the paper is fetched again to show the server\'s result');
        assert.match(result.body, /2 of 2 correct/);
        assert.equal(result.startButton, false);
    });

    test('an answer that cannot be marked is handed back rather than swallowed', async () => {
        const failing = apiModule({ '/quizzes/global/history': noHistory, '/quizzes/global': timed }, `(url, body) => { if (url.endsWith('/start')) return { attempt: { status: 'open', elapsedMs: 0, answers: {} }, questions: ${JSON.stringify(paper.questions)} }; throw { response: { data: { message: 'Could not mark that answer.' } } }; }`);
        const { result } = await screen({
            entry, api: failing, script: `
                await sleep(700);
                ${start}
                ${answer(1)}
                await sleep(250);
                return {
                    body: text(document.body),
                    counter: text($$('p').find((p) => /answered/.test(p.innerText))),
                    stillClickable: !$$('li')[0].querySelectorAll('button')[1].disabled
                };` });
        assert.match(result.body, /Could not mark that answer/);
        assert.equal(result.counter, '0 of 2 answered', 'the answer is rolled back');
        assert.ok(result.stillClickable, 'so they can try again');
    });

    test('an attempt resumed after a reload still runs its clock out and closes', async () => {
        // Half a second left on a one-minute paper. The clock's time-up only
        // looked at the working copy, which a reload left blank: it stood at
        // 0:00 and the paper never closed.
        const nearlyDone = { ...timed, quiz: { title: 'Weekly GK', description: '', timeLimitMinutes: 1 }, attempt: { status: 'open', elapsedMs: 59_500, timedOut: false, answers: {} } };
        const { result, errors } = await screen({
            entry, api: apiModule({ '/quizzes/global/history': noHistory, '/quizzes/global': nearlyDone }, posts), script: `
                await sleep(2600);
                return { body: text(document.body), finished: ${posted('/finish')}.map((c) => c[2]) };` });
        assert.deepEqual(errors, []);
        assert.match(result.body, /Time’s up!/);
        assert.deepEqual(result.finished, [{ timedOut: true }], 'the attempt is closed on the server as timed out');
    });

    test('when time runs out while an answer is being marked, that answer is waited for before closing', async () => {
        const slow = apiModule({ '/quizzes/global/history': noHistory, '/quizzes/global': { ...paper, quiz: { title: 'Quick', description: '', timeLimitMinutes: 1 / 60 }, attempt: null } }, `(url, body) => {
          if (url.endsWith('/start')) return { attempt: { status: 'open', elapsedMs: 0, timedOut: false, answers: {} }, questions: ${JSON.stringify(paper.questions)} };
          if (url.endsWith('/finish')) { window.__finishedBeforeMarked = !window.__marked; return { attempt: { status: 'finished', elapsedMs: 1000, timedOut: !!body.timedOut, answers: {} } }; }
          // Marking takes longer than the time left.
          return new Promise((ok) => setTimeout(() => { window.__marked = true; ok((${markGlobal})(url, body)); }, 1500));
        }`);
        const { result, errors } = await screen({
            entry, api: slow, script: `
                await sleep(700);
                ${start}
                $$('li')[0].querySelectorAll('button')[1].click();
                await sleep(3500);
                return { body: text(document.body), early: window.__finishedBeforeMarked, finished: ${posted('/finish')}.length };` });
        assert.deepEqual(errors, []);
        assert.equal(result.finished, 1, 'the attempt is closed once');
        assert.equal(result.early, false, 'not before the last answer was marked');
        assert.match(result.body, /1 of 2 correct/, 'the answer given in time counts');
    });

    test('a won quiz tells the header and the celebrations even if the student has already left the tab', async () => {
        const winning = apiModule({ '/quizzes/global/history': noHistory, '/quizzes/global': timed }, `(url, body) => {
          if (url.endsWith('/start')) return { attempt: { status: 'open', elapsedMs: 0, timedOut: false, answers: {} }, questions: ${JSON.stringify(paper.questions)} };
          if (url.endsWith('/finish')) return new Promise((ok) => setTimeout(() => ok({ attempt: { status: 'finished', elapsedMs: 1000, timedOut: false, score: 100, correctCount: 2, answers: {} }, win: { won: true, xp: 20 }, rewards: { events: [{ type: 'xp', amount: 20 }] } }), 800));
          return (${markGlobal})(url, body);
        }`);
        const leaving = `
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import GlobalQuiz from '${srcFile('components/GlobalQuiz.jsx')}';
function Tab() { const [on, setOn] = useState(true); window.__leave = () => setOn(false); return on ? <GlobalQuiz /> : <p>Another tab</p>; }
createRoot(document.getElementById('root')).render(<Tab />);`;
        const { result, errors } = await screen({
            entry: leaving, api: winning, script: `
                window.__heard = { progress: 0, rewards: [] };
                window.addEventListener('yati:progress-changed', () => { window.__heard.progress += 1; });
                window.addEventListener('yati:rewards', (e) => { window.__heard.rewards.push(e.detail); });
                await sleep(700);
                ${start}
                ${answer(1)}
                ${nextQuestion}
                ${answer(1)}
                click(/See your score/); await sleep(100);
                window.__leave();
                await sleep(1500);
                return window.__heard;` });
        assert.deepEqual(errors, []);
        assert.equal(result.progress, 1, 'the XP and wallet figures are told to re-read');
        assert.deepEqual(result.rewards, [[{ type: 'xp', amount: 20 }]], 'the reward events go to the celebrations');
    });

    test('an answer the server has no open attempt for brings the paper back as the server has it', async () => {
        const noAttempt = `
const fresh = ${JSON.stringify(timed)};
window.__calls = [];
export default {
  get: (url) => { window.__calls.push(['GET', url]);
    if (url.endsWith('/history')) return Promise.resolve({ data: ${JSON.stringify(noHistory)} });
    return Promise.resolve({ data: fresh }); },
  post: (url, body) => { window.__calls.push(['POST', url, body]);
    if (url.endsWith('/start')) return Promise.resolve({ data: { attempt: { status: 'open', elapsedMs: 0, answers: {} }, questions: fresh.questions } });
    return Promise.reject({ response: { status: 409, data: { code: 'NO_ATTEMPT', message: 'There is no attempt open.' } } }); },
  put: () => Promise.resolve({ data: {} }), delete: () => Promise.resolve({ data: {} })
};`;
        const { result, errors } = await screen({
            entry, api: noAttempt, script: `
                await sleep(700);
                ${start}
                ${answer(1)}
                await sleep(500);
                return { body: text(document.body), gets: window.__calls.filter((c) => c[0] === 'GET' && c[1].endsWith('/quizzes/global')).length };` });
        assert.deepEqual(errors, []);
        assert.equal(result.gets, 2, 'the paper is fetched again');
        assert.doesNotMatch(result.body, /There is no attempt open/, 'not left as an error under a question that can never be marked');
    });

    test('an empty bank is explained rather than left blank', async () => {
        const { result } = await screen({
            entry, api: apiModule({ '/quizzes/global/history': noHistory, '/quizzes/global': { available: 0, categories: [], questions: [], quiz: null, attempt: null } }),
            script: `await sleep(700); return { body: text(document.body) };` });
        assert.match(result.body, /No quiz questions yet/);
        assert.match(result.body, /general questions your institution writes/);
    });
});

describe('the dashboard tab', { skip: skipWithoutChrome }, () => {
    // The dashboard reads the rewards context as well as the auth one, so both
    // providers are mounted exactly as App.jsx mounts them.
    const dashboardEntry = (isGlobalQuizEnabled) => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '${srcFile('context/AuthContext.jsx')}';
import { RewardsProvider } from '${srcFile('context/RewardsContext.jsx')}';
import Dashboard from '${srcFile('pages/Dashboard.jsx')}';
createRoot(document.getElementById('root')).render(
  <AuthContext.Provider value={{ user: { name: 'Bhagyashree' }, isGlobalQuizEnabled: ${isGlobalQuizEnabled}, isCreditSystemEnabled: true, isCareerPathEnabled: true, isJobsEnabled: true, isRewardsEnabled: true }}>
    <RewardsProvider>
      <MemoryRouter>
        <Dashboard courses={[]} bundles={[]} availableCourses={[]} loading={false} error={null}
                   buyingCourseId={null} enrollCourse={() => {}} refresh={() => {}} weeklyActivity={<div />} />
      </MemoryRouter>
    </RewardsProvider>
  </AuthContext.Provider>);`;
    const dashApi = apiModule({ '/user/courses': { courses: [], bundles: [] }, '/user/settings': {}, '/rewards/summary': {}, '/user/available-courses': [] });

    test('is offered when the quiz is on', async () => {
        const { result } = await screen({
            entry: dashboardEntry(true), api: dashApi,
            script: `await sleep(1200); return { tabs: $$('button').map((b) => b.innerText.trim()).filter(Boolean), body: text(document.body).slice(0, 300), errors: window.__errors };` });
        assert.ok(result.tabs.some((t) => /Global Quiz/.test(t)), `tabs were ${JSON.stringify(result.tabs)} · page said ${JSON.stringify(result.body)}`);
    });

    test('disappears when an administrator switches it off', async () => {
        const { result } = await screen({
            entry: dashboardEntry(false), api: dashApi,
            script: `await sleep(1200); return { tabs: $$('button').map((b) => b.innerText.trim()).filter(Boolean) };` });
        assert.ok(!result.tabs.some((t) => /Global Quiz/.test(t)), 'the tab is gone');
        assert.ok(result.tabs.some((t) => /Available Courses/.test(t)), 'the others stay');
    });
});
