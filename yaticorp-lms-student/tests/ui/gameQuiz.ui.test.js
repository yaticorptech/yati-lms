/**
 * The brain games' table on its own (Rapid Fire, Code Clash, Brain Sprint), fed views shaped exactly like the server's quiz engine makes
 * them (competitions/games/quizCore.js). While a question is open the view
 * carries no answer, so everything the table colours has to come from the
 * reveal; every answer the student gives has to leave as one onAction() call.
 * Those calls are collected in window.__actions.
 *
 * Behaviour and DOM only, like the chess table's test: no app stylesheet.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutChrome, DEVICES } from './harness.js';

const NOW = Date.now();
const SEATS = [
    { name: 'Asha', side: 0, label: 'Player 1', color: '#6366f1' },
    { name: 'Ravi', side: 1, label: 'Player 2', color: '#f43f5e' }
];
const QUESTION = { topic: 'Aptitude', prompt: 'What is 20% of 250 plus 15% of 200?', code: null, lang: null, options: ['75', '80', '85', '70'] };

const view = (over = {}) => ({
    game: 'brainsprint', status: 'active', you: 0, turn: null, deadline: NOW + 15_000,
    seats: SEATS, message: 'Question 1 of 10.', outcome: null,
    mode: 'simultaneous', phase: 'question', serverNow: NOW, phaseStartedAt: NOW - 5_000, phaseEndsAt: NOW + 15_000, questionMs: 20_000,
    number: 1, total: 10, question: QUESTION, answer: null,
    answers: [null, null], scores: [0, 0], correct: [0, 0], out: [], canAnswer: true, recap: null,
    ...over
});

const entry = (v) => `
import { createRoot } from 'react-dom/client';
import QuizTable from '${srcFile('competitions/games/QuizTable.jsx')}';
window.__actions = [];
const onAction = (action) => { window.__actions.push(action); return Promise.resolve(); };
createRoot(document.getElementById('root')).render(
  <div style={{ maxWidth: 900, padding: 12 }}><QuizTable view={${JSON.stringify(v)}} onAction={onAction} busy={false} /></div>);`;

const render = (v, script, options = {}) => screen({ entry: entry(v), api: 'export default {};', script: `
    const opt = (i) => document.querySelector('[data-option="' + i + '"]');
    const marks = () => $$('[data-option]').map((b) => b.dataset.mark);
    await sleep(200);
    ${script}`, ...options });

describe('the brain games\' table', { skip: skipWithoutChrome }, () => {
    test('an open question: four answers, a clock, and a tap sends one answer', async () => {
        const { result, errors } = await render(view(), `
            const before = { prompt: text($('[data-prompt]')), options: $$('[data-option]').length, timer: Number($('[data-timer]').dataset.timer), marks: marks() };
            opt(1).click(); await sleep(80);
            opt(2).click(); await sleep(80);
            return { before, actions: window.__actions, after: marks(), status: text($('[data-status]')) };`);
        assert.deepEqual(errors, []);
        assert.match(result.before.prompt, /20% of 250/);
        assert.equal(result.before.options, 4);
        assert.ok(result.before.timer >= 13 && result.before.timer <= 15, `about 15 s left (${result.before.timer})`);
        assert.deepEqual(result.before.marks, ['open', 'open', 'open', 'open']);
        assert.deepEqual(result.actions, [{ type: 'answer', choice: 1 }], 'one answer, the second tap ignored');
        assert.deepEqual(result.after, ['dim', 'mine', 'dim', 'dim'], 'your pick stands out, not yet right or wrong');
        assert.match(result.status, /Locked in/);
    });

    test('keys 1–4 answer too', async () => {
        const { result, errors } = await render(view(), `
            window.dispatchEvent(new KeyboardEvent('keydown', { key: '3' })); await sleep(80);
            return { actions: window.__actions };`);
        assert.deepEqual(errors, []);
        assert.deepEqual(result.actions, [{ type: 'answer', choice: 2 }]);
    });

    test('the reveal: the right answer in green, your wrong one in red, the points', async () => {
        const revealed = view({
            phase: 'reveal', canAnswer: false, phaseStartedAt: NOW, phaseEndsAt: NOW + 4_000,
            answer: { index: 1, explain: '50 + 30 = 80.' },
            answers: [{ choice: 0, correct: false, points: 0, ms: 3000 }, { choice: 1, correct: true, points: 142, ms: 1500 }],
            scores: [0, 142], correct: [0, 1]
        });
        const { result, errors } = await render(revealed, `
            opt(1).click(); await sleep(60);
            return { marks: marks(), explain: text($('[data-explain]')), scores: $$('[data-score]').map((s) => s.dataset.score), actions: window.__actions,
                     gained: text($('[data-score-seat="1"]')) };`);
        assert.deepEqual(errors, []);
        assert.deepEqual(result.marks, ['wrong', 'right', 'dim', 'dim']);
        assert.match(result.explain, /Answer: 80\. 50 \+ 30 = 80\./);
        assert.deepEqual(result.scores, ['0', '142']);
        assert.match(result.gained, /\+142/);
        assert.deepEqual(result.actions, [], 'nothing to answer in the reveal');
    });

    test('Rapid Fire: a wrong buzz shows red at once and locks you out; the other player shows as locked out', async () => {
        const buzz = view({
            game: 'rapidfire', mode: 'buzzer', canAnswer: false,
            answers: [{ choice: 3, correct: false, points: -5, ms: 900 }, null], scores: [-5, 0]
        });
        const { result, errors } = await render(buzz, `return { marks: marks(), status: text($('[data-status]')) };`);
        assert.deepEqual(errors, []);
        assert.deepEqual(result.marks, ['dim', 'dim', 'dim', 'wrong']);
        assert.match(result.status, /locked out/);

        const other = view({ game: 'rapidfire', mode: 'buzzer', you: 1, answers: [{ locked: true }, null], scores: [-5, 0] });
        const seen = await render(other, `return { state: $('[data-score-seat="0"]').dataset.state };`);
        assert.equal(seen.result.state, 'locked');
    });

    test('Code Clash shows the code, and its outputs in a code font', async () => {
        const code = view({
            game: 'codeclash',
            question: { topic: 'Predict the output', prompt: 'What does this print?', code: "console.log('5' + 3);", lang: 'javascript', options: ['53', '8', 'NaN', '35'] }
        });
        const { result, errors } = await render(code, `return { code: text($('[data-code] pre')), mono: opt(0).querySelector('span:last-child').classList.contains('font-mono') };`);
        assert.deepEqual(errors, []);
        assert.equal(result.code, "console.log('5' + 3);");
        assert.equal(result.mono, true);
    });

    test('the countdown before the first question', async () => {
        const ready = view({ phase: 'ready', number: 0, question: null, canAnswer: false, phaseStartedAt: NOW, phaseEndsAt: NOW + 3_200 });
        const { result, errors } = await render(ready, `return { ready: text($('[data-ready]')), options: $$('[data-option]').length };`);
        assert.deepEqual(errors, []);
        assert.match(result.ready, /Get ready/);
        assert.match(result.ready, /10 puzzles · 20 s each/);
        assert.equal(result.options, 0);
    });

    test('over: Review the answers lists every question with yours', async () => {
        const done = view({
            status: 'finished', phase: 'over', deadline: null, question: null, canAnswer: false,
            scores: [142, 0], correct: [1, 0],
            outcome: { places: [[0], [1]], reason: 'Most points after 1 questions' },
            recap: [{ ...QUESTION, answer: 1, explain: '50 + 30 = 80.', answers: [{ choice: 1, correct: true, points: 142 }, null] }]
        });
        const { result, errors } = await render(done, `
            $('[data-recap] button').click(); await sleep(80);
            return { item: text($('[data-recap-item="0"]')) };`);
        assert.deepEqual(errors, []);
        assert.match(result.item, /20% of 250/);
        assert.match(result.item, /You: 80 \(\+142\)/);
    });

    test('on a phone nothing runs off the side', async () => {
        const long = view({ question: { ...QUESTION, prompt: 'Pointing to a man, Riya says, "He is the son of my grandfather\'s only son." The man is Riya\'s:', options: ['Brother', 'Cousin', 'Uncle', 'Father'] } });
        const { result, errors } = await render(long, `return { sideways: document.documentElement.scrollWidth > innerWidth + 1 };`, { device: DEVICES.galaxyA55 });
        assert.deepEqual(errors, []);
        assert.equal(result.sideways, false);
    });
});
