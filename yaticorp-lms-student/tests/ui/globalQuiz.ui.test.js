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
const api = apiModule({ '/quizzes/global': timed }, posts);
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
                await sleep(700);
                return {
                    title: text($('h3')),
                    header: text($$('p').find((p) => /general question/.test(p.innerText))),
                    body: text(document.body),
                    cards: $$('li').length,
                    sizes: $$('button').filter((b) => /Qs$/.test(b.innerText)).length,
                    startButton: $$('button').some((b) => /Start quiz/.test(b.innerText)),
                    clock: !!$('[role=timer]'),
                    started: ${posted('/start')}.length
                };` });
        assert.deepEqual(errors, []);
        assert.equal(result.title, 'Weekly GK', 'the paper is called what the administrator called it');
        assert.match(result.header, /24 general questions across 2 categories/);
        assert.match(result.body, /Time limit\s*10 minutes/);
        assert.match(result.body, /One attempt each/);
        assert.match(result.body, /Ready when you are/);
        assert.equal(result.cards, 0, 'no question is shown before Start');
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
            entry, api: apiModule({ '/quizzes/global': { ...paper, attempt: null } }, posts), script: `
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
        // A limit of 0.03 minutes is 1.8 s: the server only ever sends whole
        // minutes, but the clock does not care, and a test cannot wait a minute.
        const quick = apiModule({ '/quizzes/global': { ...paper, quiz: { title: 'Quick', description: '', timeLimitMinutes: 0.03 }, attempt: null } }, posts);
        const { result, errors } = await screen({
            entry, api: quick, script: `
                await sleep(700);
                ${start}
                ${answer(1)}
                await sleep(2600);
                return {
                    body: text(document.body),
                    clock: ${timer},
                    cards: $$('li').length,
                    locked: $$('li')[1].querySelectorAll('button')[1].disabled,
                    finished: ${posted('/finish')}.map((c) => c[2])
                };` });
        assert.deepEqual(errors, []);
        assert.match(result.body, /Time’s up! 1 of 2 correct/);
        assert.match(result.body, /1 question was left unanswered/);
        assert.equal(result.clock, '0:00');
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
                    buttons: $$('button').map((b) => b.innerText.trim()).filter(Boolean),
                    finished: ${posted('/finish')}.map((c) => c[2])
                };` });
        assert.equal(result.hadScoreEarly, false, 'the score waits to be asked for');
        assert.equal(result.counter, null, 'the progress strip gives way to the score');
        assert.equal(result.score, '50%');
        assert.ok(result.correct, 'the tally is shown');
        assert.equal(result.timedOut, false, 'finishing in time is not a time-out');
        assert.ok(result.once, 'it says this was the one attempt');
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
                click(/See your score/); await sleep(400);
                const dialog = $('[role=dialog]');
                const shown = dialog ? text(dialog) : '';
                click(/Review answers/); await sleep(250);
                return { shown, closed: !$('[role=dialog]'), cards: $$('li').length };` });
        assert.match(result.shown, /Quiz completed!/);
        assert.match(result.shown, /50%/);
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
        const { result, errors } = await screen({
            entry, api: apiModule({ '/quizzes/global': done }, posts), script: `
                await sleep(700);
                return {
                    body: text(document.body),
                    score: text($$('span').find((s) => /^\\d+%$/.test(s.innerText.trim()))),
                    cards: $$('li').length,
                    dialog: !!$('[role=dialog]'),
                    buttons: $$('button').map((b) => b.innerText.trim()).filter(Boolean),
                    clock: ${timer},
                    posts: window.__calls.filter((c) => c[0] === 'POST').length
                };` });
        assert.deepEqual(errors, []);
        assert.equal(result.score, '50%');
        assert.match(result.body, /1 of 2 correct/);
        assert.match(result.body, /Quiz completed/);
        assert.match(result.body, /1\s*Correct/);
        assert.match(result.body, /1\s*Wrong/);
        assert.doesNotMatch(result.body, /Mercury orbits closest|The answer is 30/, 'the questions are not shown again');
        assert.equal(result.cards, 0, 'no question cards on a later visit');
        assert.equal(result.dialog, false, 'no popup on a later visit');
        assert.ok(!result.buttons.some((l) => /Start quiz|again/i.test(l)), `no Start and no retake, but found ${JSON.stringify(result.buttons)}`);
        assert.equal(result.clock, '1:35', 'the time the attempt took');
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
            entry, api: apiModule({ '/quizzes/global': open }, posts), script: `
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
  get: (url) => { window.__calls.push(['GET', url]); gets += 1; return Promise.resolve({ data: gets === 1 ? routes.fresh : routes.done }); },
  post: (url, body) => { window.__calls.push(['POST', url, body]); return Promise.reject({ response: { status: 409, data: { code: 'ALREADY_ATTEMPTED', message: 'You have already taken this quiz.' } } }); },
  put: () => Promise.resolve({ data: {} }), delete: () => Promise.resolve({ data: {} })
};`;
        const { result, errors } = await screen({
            entry, api: refusing, script: `
                await sleep(700);
                ${start}
                await sleep(500);
                return { body: text(document.body), startButton: $$('button').some((b) => /Start quiz/.test(b.innerText)), gets: window.__calls.filter((c) => c[0] === 'GET').length };` });
        assert.deepEqual(errors, []);
        assert.equal(result.gets, 2, 'the paper is fetched again to show the server\'s result');
        assert.match(result.body, /2 of 2 correct/);
        assert.equal(result.startButton, false);
    });

    test('an answer that cannot be marked is handed back rather than swallowed', async () => {
        const failing = apiModule({ '/quizzes/global': timed }, `(url, body) => { if (url.endsWith('/start')) return { attempt: { status: 'open', elapsedMs: 0, answers: {} }, questions: ${JSON.stringify(paper.questions)} }; throw { response: { data: { message: 'Could not mark that answer.' } } }; }`);
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

    test('an empty bank is explained rather than left blank', async () => {
        const { result } = await screen({
            entry, api: apiModule({ '/quizzes/global': { available: 0, categories: [], questions: [], quiz: null, attempt: null } }),
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
