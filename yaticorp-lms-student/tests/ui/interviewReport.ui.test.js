/** The interview report and its question reviewer, in a real browser. */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, wrap, skipWithoutChrome } from './harness.js';
import { session, apiModule } from './fixtures.js';

const api = apiModule({ '/interview/sessions/': session });
const reportEntry = wrap('interview/InterviewReport.jsx', 'InterviewReport', {
    route: '/interview/report/r1', path: '/interview/report/:id'
});
const reviewEntry = wrap('interview/QuestionReview.jsx', 'QuestionReview', {
    route: '/interview/report/r1/questions', path: '/interview/report/:id/questions'
});

describe('the report', { skip: skipWithoutChrome }, () => {
    test('shows the score, the six dimensions and the interviewer\'s words', async () => {
        const { result, errors } = await screen({
            entry: reportEntry, api, script: `
                await sleep(700);
                return {
                    ring: $('[role=img]')?.getAttribute('aria-label'),
                    dimensions: $$('[role=progressbar]').map((b) => b.getAttribute('aria-label') + ' ' + b.getAttribute('aria-valuenow')),
                    feedback: text($('header p:nth-of-type(2)')),
                    xp: !!find(/XP earned/, 'span'),
                    body: text(document.body).slice(0, 4000)
                };` });
        assert.deepEqual(errors, [], 'the page threw nothing');
        assert.equal(result.ring, 'Score 35%');
        assert.deepEqual(result.dimensions, ['Communication 40', 'Technical Knowledge 30', 'Answer Quality 30', 'Problem Solving 35', 'Confidence 45', 'Relevance 35']);
        assert.match(result.feedback, /far too brief/);
        assert.ok(result.xp, 'the XP chip is shown');
        assert.match(result.body, /How you sounded/);
        assert.match(result.body, /AI recommendation/);
        assert.match(result.body, /Your next steps/);
    });

    test('the delivery card reads the note as a headline and an explanation', async () => {
        const { result } = await screen({
            entry: reportEntry, api, script: `
                await sleep(700);
                const card = $$('section').find((s) => /How you sounded/.test(s.innerText));
                const verdict = Array.from(card.querySelectorAll('span')).find((el) => /Overall:/.test(el.innerText));
                return { verdict: text(verdict), body: text(card) };` });
        assert.match(result.verdict, /Overall: (Excellent|Good|Fair|Needs work)/);
        assert.match(result.body, /You spoke slowly, around 96 words a minute\./);
        assert.match(result.body, /A little more pace will sound more confident\./);
        assert.match(result.body, /Tip:/);
    });

    test('the next steps are numbered, coloured and lead somewhere', async () => {
        const { result } = await screen({
            entry: reportEntry, api, script: `
                await sleep(700);
                const card = document.getElementById('next-steps');
                return {
                    titles: $$('#next-steps li').map((li) => text(li.querySelector('span.block'))),
                    ctas: $$('#next-steps li').map((li) => text(li.querySelector('a, button'))),
                    hrefs: $$('#next-steps a[href]').map((a) => a.getAttribute('href')),
                    removed: /Try Another Interview|You're doing great/.test(text(document.body))
                };` });
        assert.deepEqual(result.titles, ['Expand Technical Introductions', 'Practice Detailed Answer Structuring', 'Take another mock interview']);
        assert.deepEqual(result.ctas, ['Learn more', 'Open course', 'Start it']);
        assert.ok(result.hrefs.includes('/learn/c1'), 'the step with a course opens it');
        assert.equal(result.removed, false, 'the two removed pieces stay removed');
    });

    test('the question strip opens the reviewer instead of unfolding in place', async () => {
        const { result } = await screen({
            entry: reportEntry, api, script: `
                await sleep(700);
                const strip = $$('section').find((s) => /Question by question/.test(s.innerText));
                return { scores: $$('#question-by-question button').map(text), button: !!find(/Review question by question/) };` });
        assert.deepEqual(result.scores.slice(0, 3), ['4', '3', '2'], 'every answer scored, worst last');
        assert.ok(result.button);
    });
});

describe('the question reviewer', { skip: skipWithoutChrome }, () => {
    test('opens on the first answer with its score, feedback and time taken', async () => {
        const { result, errors } = await screen({
            entry: reviewEntry, api, script: `
                await sleep(700);
                return {
                    heading: text(find(/Question 1 of/, 'p')),
                    time: text($$('p').find((p) => /^\\d\\d:\\d\\d$/.test(p.innerText.trim()))),
                    body: text(document.body),
                    progress: $('[role=progressbar]')?.getAttribute('aria-valuenow')
                };` });
        assert.deepEqual(errors, []);
        assert.equal(result.heading, 'Question 1 of 3');
        assert.equal(result.time, '00:42', 'measured from asked to answered');
        assert.equal(result.progress, '1');
        assert.match(result.body, /Tell me about yourself/);
        assert.match(result.body, /4 \/ 10/);
        assert.match(result.body, /far too brief/);
        assert.match(result.body, /Suggested \/ Better Approach/);
    });

    test('Next and Previous move between answers, and the ends behave', async () => {
        const { result } = await screen({
            entry: reviewEntry, api, script: `
                await sleep(700);
                const heading = () => text(find(/Question \\d of/, 'p'));
                const prevDisabled = () => find(/Previous Question/).disabled;
                const first = { at: heading(), prevDisabled: prevDisabled() };
                click(/Next Question/); await sleep(250);
                const second = { at: heading(), score: /3 \\/ 10/.test(text(document.body)) };
                click(/Next Question/); await sleep(250);
                const third = { at: heading(), nextGone: !find(/Next Question/), backToReport: !!find(/Back to the report/) };
                click(/Previous Question/); await sleep(250);
                return { first, second, third, afterBack: heading() };` });
        assert.deepEqual(result.first, { at: 'Question 1 of 3', prevDisabled: true });
        assert.equal(result.second.at, 'Question 2 of 3');
        assert.ok(result.second.score, 'the second answer brings its own score');
        assert.equal(result.third.at, 'Question 3 of 3');
        assert.ok(result.third.nextGone && result.third.backToReport, 'the last answer offers the report rather than a dead end');
        assert.equal(result.afterBack, 'Question 2 of 3');
    });

    test('the jump row goes straight to any answer', async () => {
        const { result } = await screen({
            entry: reviewEntry, api, script: `
                await sleep(700);
                const jump = $$('button').filter((b) => /^[0-9]+$/.test(b.innerText.trim()));
                jump[2].click(); await sleep(250);
                return { count: jump.length, at: text(find(/Question \\d of/, 'p')), body: text(document.body) };` });
        assert.equal(result.count, 3, 'one button per answered question');
        assert.equal(result.at, 'Question 3 of 3');
        assert.match(result.body, /bcrypt/);
    });

    test('the arrow keys page through it', async () => {
        const { result } = await screen({
            entry: reviewEntry, api, script: `
                await sleep(700);
                const heading = () => text(find(/Question \\d of/, 'p'));
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' })); await sleep(200);
                const after = heading();
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' })); await sleep(200);
                return { after, back: heading() };` });
        assert.equal(result.after, 'Question 2 of 3');
        assert.equal(result.back, 'Question 1 of 3');
    });
});
