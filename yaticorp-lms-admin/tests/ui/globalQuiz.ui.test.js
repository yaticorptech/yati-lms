/**
 * The admin Global Quiz page: quizzes of the size the admin chooses, the
 * questions inside each, and publishing one as the paper students get.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, wrap, skipWithoutChrome, skipWithoutStyles } from './harness.js';

const question = (id, quizId, q, category) => ({
    _id: id, quizId, question: q, options: ['Venus', 'Mercury', 'Mars'], correctAnswerIndex: 1,
    explanation: 'Mercury orbits closest.', category, difficulty: 'easy'
});
const QUIZZES = [
    { _id: 'live', title: 'Weekly GK', description: 'Five quick ones', size: 5, status: 'published', publishedAt: '2026-09-20T00:00:00.000Z', updatedAt: '2026-09-20T00:00:00.000Z', questionCount: 5, categories: ['General'] },
    { _id: 'full', title: 'Aptitude', description: '', size: 3, status: 'draft', publishedAt: null, updatedAt: '2026-09-21T00:00:00.000Z', questionCount: 3, categories: ['Aptitude', 'Maths'] },
    { _id: 'half', title: 'Science', description: 'Still being written', size: 10, status: 'draft', publishedAt: null, updatedAt: '2026-09-22T00:00:00.000Z', questionCount: 2, categories: ['Science'] }
];
const QUESTIONS = {
    live: Array.from({ length: 5 }, (_, i) => question(`l${i}`, 'live', `Live question ${i}?`, 'General')),
    full: [question('f1', 'full', 'What is 15% of 200?', 'Aptitude'), question('f2', 'full', 'Which planet is closest to the Sun?', 'Maths'), question('f3', 'full', 'What is 2 + 2?', 'Maths')],
    half: [question('h1', 'half', 'What is H2O?', 'Science'), question('h2', 'half', 'What is NaCl?', 'Science')]
};

const api = `
const QUIZZES = ${JSON.stringify(QUIZZES)};
const QUESTIONS = ${JSON.stringify(QUESTIONS)};
window.__calls = [];
const reply = (data) => Promise.resolve({ data });
const count = (id) => QUESTIONS[id] ? QUESTIONS[id].length : 0;
export default {
  get: (url) => {
    window.__calls.push(['GET', url]);
    if (url.includes('/settings')) return reply({ globalQuiz: { enabled: true, defaultLength: 10 } });
    const m = url.match(/quizzes\\/([^/]+)\\/questions$/);
    if (m) { const quiz = QUIZZES.find((q) => q._id === m[1]) || { _id: m[1], title: 'New one', size: 5, status: 'draft', questionCount: 0, categories: [] };
      return reply({ quiz: { ...quiz, questionCount: count(m[1]) }, questions: QUESTIONS[m[1]] || [] }); }
    return reply({ quizzes: QUIZZES, limits: { min: 3, max: 50 } });
  },
  post: (url, body) => { window.__calls.push(['POST', url, body]);
    if (url.endsWith('/global-quiz/quizzes')) return reply({ ...body, _id: 'made', status: 'draft', questionCount: 0, categories: [] });
    if (url.endsWith('/duplicate')) return reply({ _id: 'copy', title: 'Copy of Aptitude' });
    return reply({ ...body, _id: 'new' }); },
  put: (url, body) => { window.__calls.push(['PUT', url, body]); return reply(url.includes('/settings') ? { globalQuiz: { enabled: body.globalQuiz.enabled } } : { ...body }); },
  delete: (url, config) => { window.__calls.push(['DELETE', url, config && config.params]); return reply({ ok: true }); }
};`;
const at = (route) => wrap('pages/GlobalQuiz.jsx', 'GlobalQuiz', { route, path: '/global-quiz' });
const LIST = at('/global-quiz');

describe('the list of quizzes', { skip: skipWithoutChrome }, () => {
    test('shows every quiz with its status and how full it is, and what is live', async () => {
        const { result, errors } = await screen({ entry: LIST, api, script: `
            await sleep(700);
            return {
                cards: $$('li[aria-label^="Quiz: "]').map(text),
                banner: text($$('p').find((p) => /Live for students/.test(p.innerText)).closest('div').parentElement)
            };` });
        assert.deepEqual(errors, []);
        assert.equal(result.cards.length, 3);
        assert.match(result.cards[0], /Weekly GK.*Live.*5 of 5 added · full/);
        assert.match(result.cards[2], /Science.*Draft.*2 of 10 added · 8 left/);
        assert.match(result.banner, /Weekly GK/);
    });

    test('a quiz that is not full cannot be published, and says why', async () => {
        const { result } = await screen({ entry: LIST, api, script: `
            await sleep(700);
            const half = Array.from($$('li[aria-label="Quiz: Science"]')[0].querySelectorAll('button')).find((b) => /^\\s*Publish/.test(b.innerText));
            const full = Array.from($$('li[aria-label="Quiz: Aptitude"]')[0].querySelectorAll('button')).find((b) => /^\\s*Publish/.test(b.innerText));
            return { halfDisabled: half.disabled, halfWhy: half.title, fullDisabled: full.disabled };` });
        assert.equal(result.halfDisabled, true);
        assert.match(result.halfWhy, /Add 8 more questions/);
        assert.equal(result.fullDisabled, false);
    });

    test('publishing over the live quiz asks first, then publishes', async () => {
        const { result } = await screen({ entry: LIST, api, script: `
            await sleep(700);
            Array.from($$('li[aria-label="Quiz: Aptitude"]')[0].querySelectorAll('button')).find((b) => /^\\s*Publish/.test(b.innerText)).click();
            await sleep(250);
            const asked = text($('[role=dialog]'));
            const early = window.__calls.some((c) => c[0] === 'POST');
            click(/^\\s*Publish\\s*$/, '[role=dialog] button'); await sleep(400);
            return { asked, early, post: window.__calls.find((c) => c[0] === 'POST'), notice: text($('[role=status]')) };` });
        assert.match(result.asked, /Publish “Aptitude”\?/);
        assert.match(result.asked, /instead of “Weekly GK”/);
        assert.equal(result.early, false, 'nothing is published before the answer');
        assert.equal(result.post[1], '/admin/global-quiz/quizzes/full/publish');
        assert.match(result.notice, /now the quiz students take/);
    });

    test('a new quiz is made at the size chosen, then opened to be filled', async () => {
        const { result } = await screen({ entry: LIST, api, script: `
            await sleep(700);
            click(/New quiz/); await sleep(250);
            const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
            const name = $('[role=dialog] input');
            setter.call(name, 'Current affairs'); name.dispatchEvent(new Event('input', { bubbles: true }));
            click(/^5$/, '[role=dialog] button'); await sleep(100);
            click(/Create quiz/); await sleep(600);
            return { post: window.__calls.find((c) => c[0] === 'POST'), opened: window.__calls.some((c) => c[1] === '/admin/global-quiz/quizzes/made/questions') };` });
        assert.equal(result.post[1], '/admin/global-quiz/quizzes');
        assert.equal(result.post[2].title, 'Current affairs');
        assert.equal(result.post[2].size, 5);
        assert.ok(result.opened, 'straight into the new quiz');
    });

    test('duplicate and delete', async () => {
        const { result } = await screen({ entry: LIST, api, script: `
            await sleep(700);
            $('button[aria-label="Duplicate Aptitude"]').click(); await sleep(300);
            $('button[aria-label="Delete Science"]').click(); await sleep(250);
            const asked = text(document.body);
            click(/Delete Permanently/); await sleep(300);
            return { calls: window.__calls.filter((c) => c[0] !== 'GET').map((c) => c[0] + ' ' + c[1]), asked };` });
        assert.match(result.asked, /Delete this quiz\?/);
        assert.deepEqual(result.calls, ['POST /admin/global-quiz/quizzes/full/duplicate', 'DELETE /admin/global-quiz/quizzes/half']);
    });

    test('the on/off switch saves', async () => {
        const { result } = await screen({ entry: LIST, api, script: `
            await sleep(700);
            $('button[role=switch]').click(); await sleep(300);
            return window.__calls.find((c) => c[0] === 'PUT');` });
        assert.deepEqual(result, ['PUT', '/admin/settings', { globalQuiz: { enabled: false } }]);
    });
});

describe('inside a quiz', { skip: skipWithoutChrome }, () => {
    test('its questions are in sets, with the quiz and its fill shown', async () => {
        const { result, errors } = await screen({ entry: at('/global-quiz?quiz=full'), api, script: `
            await sleep(700);
            return {
                title: text($('h1')),
                meter: text($('[aria-label="3 of 3 questions added"]')),
                sets: $$('section[aria-label$=" questions"]').map((s) => s.getAttribute('aria-label')),
                full: text($('[role=status]')),
                addButton: !!$('button[aria-label="Add question at the end"]')
            };` });
        assert.deepEqual(errors, []);
        assert.equal(result.title, 'Aptitude');
        assert.match(result.meter, /3 of 3 added · full/);
        assert.deepEqual(result.sets, ['Aptitude questions', 'Maths questions']);
        assert.match(result.full, /All 3 questions are in/);
        assert.equal(result.addButton, false, 'a full quiz offers no Add');
    });

    test('a question is added to this quiz', async () => {
        const { result } = await screen({ entry: at('/global-quiz?quiz=half'), api, script: `
            await sleep(700);
            $('button[aria-label="Add question at the end"]').click(); await sleep(250);
            const setter = (el, v) => { Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
            setter($('[role=dialog] textarea'), 'What is the boiling point of water?');
            const answers = $$('[role=dialog] input').filter((i) => /Answer/.test(i.placeholder));
            setter(answers[0], '90 °C'); setter(answers[1], '100 °C');
            $('[role=dialog] button[aria-label="Mark answer 2 as correct"]').click(); await sleep(100);
            const pressed = $('[role=dialog] button[aria-label="Mark answer 2 as correct"]').getAttribute('aria-pressed');
            click(/Add to the quiz/); await sleep(400);
            return { pressed, post: window.__calls.find((c) => c[0] === 'POST') };` });
        assert.equal(result.pressed, 'true');
        const [, url, body] = result.post;
        assert.equal(url, '/admin/global-quiz/quizzes/half/questions');
        assert.equal(body.question, 'What is the boiling point of water?');
        assert.deepEqual(body.options, ['90 °C', '100 °C']);
        assert.equal(body.correctAnswerIndex, 1);
    });

    test('a question is edited and deleted by its own id', async () => {
        const { result } = await screen({ entry: at('/global-quiz?quiz=full'), api, script: `
            await sleep(700);
            const row = $$('li').find((li) => /closest to the Sun/.test(li.innerText));
            row.querySelector('button[aria-label="Edit question"]').click(); await sleep(250);
            const loaded = $('[role=dialog] textarea').value;
            click(/Save changes/); await sleep(400);
            row.querySelector('button[aria-label="Delete question"]').click(); await sleep(250);
            click(/Delete Permanently/); await sleep(400);
            return { loaded, calls: window.__calls.filter((c) => c[0] !== 'GET').map((c) => c[0] + ' ' + c[1]) };` });
        assert.equal(result.loaded, 'Which planet is closest to the Sun?');
        assert.deepEqual(result.calls, ['PUT /admin/global-quiz/f2', 'DELETE /admin/global-quiz/f2']);
    });

    test('a whole set, or the whole quiz, is removed after confirming', async () => {
        const { result } = await screen({ entry: at('/global-quiz?quiz=full'), api, script: `
            await sleep(700);
            $('button[aria-label="Delete the Maths category"]').click(); await sleep(250);
            const asked = text(document.body);
            click(/Delete Permanently/); await sleep(400);
            click(/Delete all questions/); await sleep(250);
            click(/Delete Permanently/); await sleep(400);
            return { asked, dels: window.__calls.filter((c) => c[0] === 'DELETE') };` });
        assert.match(result.asked, /Delete the “Maths” category\?/);
        assert.deepEqual(result.dels, [
            ['DELETE', '/admin/global-quiz/quizzes/full/questions', { category: 'Maths' }],
            ['DELETE', '/admin/global-quiz/quizzes/full/questions', { all: true }]
        ]);
    });

    test('Preview shows the questions with the right answers marked', async () => {
        const { result } = await screen({ entry: at('/global-quiz?quiz=full'), api, script: `
            await sleep(700);
            click(/Preview/); await sleep(250);
            const d = $('[role=dialog]');
            return { title: d.getAttribute('aria-label'), items: d.querySelectorAll('ol > li').length, correct: $$('[aria-label="Correct answer"]').length, body: text(d) };` });
        assert.equal(result.title, 'Preview: Aptitude');
        assert.equal(result.items, 3);
        assert.equal(result.correct, 3);
        assert.match(result.body, /shuffled order/);
    });

    test('a quiz that is not full cannot be published from inside it either', async () => {
        const { result } = await screen({ entry: at('/global-quiz?quiz=half'), api, script: `
            await sleep(700);
            const pub = $$('button').find((b) => /^\\s*Publish/.test(b.innerText));
            return { disabled: pub.disabled, note: text(document.body) };` });
        assert.equal(result.disabled, true);
        assert.match(result.note, /Add 8 more questions to publish/);
    });

    test('back goes to the list', async () => {
        const { result } = await screen({ entry: at('/global-quiz?quiz=full'), api, script: `
            await sleep(700);
            click(/All quizzes/); await sleep(400);
            return $$('li[aria-label^="Quiz: "]').length;` });
        assert.equal(result, 3);
    });
});

describe('on a phone', { skip: skipWithoutStyles }, () => {
    for (const [name, entry] of [['the list', LIST], ['a quiz', at('/global-quiz?quiz=full')]]) {
        test(`${name}: nothing runs off the side`, async () => {
            const { result } = await screen({ entry, api, styles: true, width: 390, height: 900, script: `
                await sleep(800);
                return document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;` });
            assert.equal(result, false);
        });
    }
});
