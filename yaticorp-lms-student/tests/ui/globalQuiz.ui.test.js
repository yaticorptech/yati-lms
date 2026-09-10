/** The Global Quiz tab, taken end to end in a real browser. */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutChrome } from './harness.js';
import { paper, markGlobal, apiModule } from './fixtures.js';

const api = apiModule({ '/quizzes/global': paper }, markGlobal);
const entry = `
import { createRoot } from 'react-dom/client';
import GlobalQuiz from '${srcFile('components/GlobalQuiz.jsx')}';
createRoot(document.getElementById('root')).render(<GlobalQuiz />);`;

// Only one question is on screen, so an answer is always given to `li` zero.
// Question 1's right answer is Mercury (index 1); question 2's is 30 (index 1).
const answer = (option) => `$$('li')[0].querySelectorAll('button')[${option}].click(); await sleep(250);`;
const nextQuestion = `click(/Next question/); await sleep(250);`;

describe('the global quiz', { skip: skipWithoutChrome }, () => {
    test('draws a paper of general questions with their categories', async () => {
        const { result, errors } = await screen({
            entry, api, script: `
                await sleep(700);
                return {
                    header: text($$('p').find((p) => /general question/.test(p.innerText))),
                    questions: $$('li p').filter((p) => /\\?$/.test(p.innerText.trim())).map(text),
                    categories: $$('p').filter((p) => /^(General Knowledge|Aptitude)$/i.test(p.innerText.trim())).map((p) => p.innerText.trim()),
                    noCourseWords: /course|lesson/i.test(text(document.body)),
                    limits: $$('button').filter((b) => /Qs$/.test(b.innerText)).map((b) => b.innerText.trim())
                };` });
        assert.deepEqual(errors, []);
        assert.match(result.header, /24 general questions across 2 categories/);
        assert.deepEqual(result.questions, ['Which planet is closest to the Sun?'], 'only the first question is on screen');
        assert.deepEqual(result.categories, ['General Knowledge']);
        assert.equal(result.noCourseWords, false, 'nothing ties these questions to a course any more');
        assert.deepEqual(result.limits, ['5 Qs', '10 Qs', '15 Qs']);
    });

    test('says how far through the paper the student is, before they start', async () => {
        const { result } = await screen({
            entry, api, script: `
                await sleep(700);
                return { counter: text($$('p').find((p) => /answered/.test(p.innerText))) };` });
        assert.equal(result.counter, '0 of 2 answered');
    });

    test('marks an answer the moment it is given, without waiting for the rest', async () => {
        const { result, errors } = await screen({
            entry, api, script: `
                await sleep(700);
                ${answer(1)}
                return {
                    body: text(document.body),
                    posted: window.__calls.filter((c) => c[0] === 'POST').map((c) => c[2].answers),
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
                ${answer(1)}
                ${answer(0)}
                return { posted: window.__calls.filter((c) => c[0] === 'POST').length, body: text(document.body) };` });
        assert.equal(result.posted, 1, 'the second click on the same question does nothing');
        assert.match(result.body, /Correct!/);
    });

    test('the score arrives once every question has been answered', async () => {
        const { result } = await screen({
            entry, api, script: `
                await sleep(700);
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
                    practice: /This was practice/.test(body)
                };` });
        assert.equal(result.hadScoreEarly, false, 'the score waits to be asked for');
        assert.equal(result.counter, '2 of 2 answered');
        assert.equal(result.score, '50%');
        assert.ok(result.correct, 'the tally is shown');
        assert.ok(result.practice, 'it says plainly that nothing was recorded');
    });

    test('Skip and Next give way to the score button on the last question', async () => {
        const { result } = await screen({
            entry, api, script: `
                await sleep(700);
                const labels = () => $$('button').map((b) => b.innerText.trim());
                const start = labels();
                ${answer(1)}
                ${nextQuestion}
                return { start, end: labels() };` });
        assert.ok(result.start.some((l) => /Skip question/.test(l)));
        assert.ok(result.start.some((l) => /Next question/.test(l)));
        assert.ok(!result.end.some((l) => /Skip question/.test(l)), 'there is nothing after the last question');
        assert.ok(!result.end.some((l) => /Next question/.test(l)));
        assert.ok(result.end.some((l) => /See your score/.test(l)));
    });

    test('Next waits for an answer, and Skip does not', async () => {
        const { result } = await screen({
            entry, api, script: `
                await sleep(700);
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

    test('the whole paper comes back once the score is in', async () => {
        const { result } = await screen({
            entry, api, script: `
                await sleep(700);
                ${answer(1)}
                ${nextQuestion}
                ${answer(0)}
                click(/See your score/); await sleep(400);
                return {
                    cards: $$('li').length,
                    body: text(document.body),
                    locked: $$('li')[1].querySelectorAll('button')[1].disabled
                };` });
        assert.equal(result.cards, 2, 'both questions are there to look back over');
        assert.match(result.body, /Mercury orbits closest/);
        assert.match(result.body, /Ten per cent is 20/);
        assert.equal(result.locked, true, 'nothing can be answered after the score');
    });

    test('an answer that cannot be marked is handed back rather than swallowed', async () => {
        const failing = apiModule({ '/quizzes/global': paper }, `(url, body) => { throw { response: { data: { message: 'Could not mark that answer.' } } }; }`);
        const { result } = await screen({
            entry, api: failing, script: `
                await sleep(700);
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
            entry, api: apiModule({ '/quizzes/global': { available: 0, categories: [], questions: [] } }),
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
        assert.ok(result.tabs.some((t) => /My Courses/.test(t)), 'the others stay');
    });
});
