/** The admin Global Quiz page: the bank it lists, and the form that writes to it. */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, wrap, skipWithoutChrome } from './harness.js';

const question = (id, q, category, isPublished = true) => ({
    _id: id, question: q, options: ['Venus', 'Mercury', 'Mars'], correctAnswerIndex: 1,
    explanation: 'Mercury orbits closest.', category, difficulty: 'easy', isPublished
});
const bank = {
    totals: { questions: 3, published: 2, drafts: 1, categories: 2 },
    questions: [
        question('a1', 'Which planet is closest to the Sun?', 'General Knowledge'),
        question('a2', 'What is 15% of 200?', 'Aptitude'),
        question('a3', 'A question held back', 'General Knowledge', false)
    ]
};
const settings = { globalQuiz: { enabled: true, defaultLength: 10 } };

const api = (over = {}) => `
const bank = ${JSON.stringify(bank)};
const settings = ${JSON.stringify({ ...settings, ...over })};
window.__calls = [];
const reply = (data) => Promise.resolve({ data });
export default {
  get: (url) => { window.__calls.push(['GET', url]); return reply(url.includes('/settings') ? settings : bank); },
  post: (url, body) => { window.__calls.push(['POST', url, body]); return reply({ ...body, _id: 'new' }); },
  put: (url, body) => { window.__calls.push(['PUT', url, body]); return reply(url.includes('/settings') ? { ...settings, ...body } : { ...body, _id: url.split('/').pop() }); },
  delete: (url) => { window.__calls.push(['DELETE', url]); return reply({ ok: true }); }
};`;
const entry = wrap('pages/GlobalQuiz.jsx', 'GlobalQuiz', { route: '/global-quiz', path: '/global-quiz' });

describe('the admin global quiz page', { skip: skipWithoutChrome }, () => {
    test('shows what the bank holds and every question in it', async () => {
        const { result, errors } = await screen({
            entry, api: api(), script: `
                await sleep(700);
                return {
                    stats: $$('p').filter((p) => /^\\d+$/.test(p.innerText.trim())).map((p) => p.innerText.trim()),
                    questions: $$('li p').filter((p) => /\\?|held back/.test(p.innerText)).map(text),
                    draftMarked: /Draft/.test(text(document.body)),
                    correctShown: /Mercury/.test(text(document.body)),
                    noCourseTable: !/Where the questions come from|Lessons/.test(text(document.body))
                };` });
        assert.deepEqual(errors, []);
        assert.deepEqual(result.stats.slice(0, 3), ['2', '1', '2'], 'published, drafts, categories');
        assert.equal(result.questions.length, 3);
        assert.ok(result.draftMarked, 'the held-back one is marked a draft');
        assert.ok(result.correctShown, 'an administrator sees which answer is right');
        assert.ok(result.noCourseTable, 'nothing about courses: the bank is its own');
    });

    test('warns when the bank cannot fill a paper', async () => {
        const { result } = await screen({
            entry, api: api({ globalQuiz: { enabled: true, defaultLength: 20 } }),
            script: `await sleep(700); return { body: text(document.body) };` });
        assert.match(result.body, /bank holds 2 published questions but a paper asks for 20/);
    });

    test('writing a question sends it, with the answer marked', async () => {
        const { result } = await screen({
            entry, api: api(), script: `
                await sleep(700);
                click(/Add question/); await sleep(200);
                const set = (el, v) => { const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement : HTMLInputElement;
                    Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, v);
                    el.dispatchEvent(new Event('input', { bubbles: true })); };
                set($('textarea'), 'Which gas do plants absorb?');
                const inputs = $$('form input[type=text], form input:not([type])');
                set(inputs[0], 'Oxygen'); set(inputs[1], 'Carbon dioxide');
                $$('form button[aria-label^="Mark answer 2"]')[0].click();
                await sleep(120);
                click(/Add to the bank/); await sleep(400);
                const posted = window.__calls.find((c) => c[0] === 'POST');
                return { posted: posted && posted[2], formClosed: !$('form') };` });
        assert.equal(result.posted.question, 'Which gas do plants absorb?');
        assert.deepEqual(result.posted.options.slice(0, 2), ['Oxygen', 'Carbon dioxide']);
        assert.equal(result.posted.correctAnswerIndex, 1, 'the answer marked is the one sent');
        assert.ok(result.formClosed, 'the form closes once it is saved');
    });

    test('editing a question loads it into the form and saves to its own id', async () => {
        const { result } = await screen({
            entry, api: api(), script: `
                await sleep(700);
                $$('button[aria-label="Edit question"]')[0].click(); await sleep(250);
                const loaded = $('textarea').value;
                click(/Save changes/); await sleep(400);
                const put = window.__calls.find((c) => c[0] === 'PUT' && !c[1].includes('/settings'));
                return { loaded, url: put && put[1] };` });
        assert.equal(result.loaded, 'Which planet is closest to the Sun?');
        assert.equal(result.url, '/admin/global-quiz/a1');
    });

    test('deleting asks first, and only then removes it', async () => {
        const { result } = await screen({
            entry, api: api(), script: `
                await sleep(700);
                $$('button[aria-label="Delete question"]')[0].click(); await sleep(250);
                const asked = /Delete this question/.test(text(document.body));
                const beforeConfirm = window.__calls.some((c) => c[0] === 'DELETE');
                click(/Delete Permanently/); await sleep(400);
                const del = window.__calls.find((c) => c[0] === 'DELETE');
                return { asked, beforeConfirm, url: del && del[1] };` });
        assert.ok(result.asked, 'it asks before removing anything');
        assert.equal(result.beforeConfirm, false, 'nothing is deleted until the question is answered');
        assert.equal(result.url, '/admin/global-quiz/a1');
    });

    test('the search narrows the bank', async () => {
        const { result } = await screen({
            entry, api: api(), script: `
                await sleep(700);
                const box = $$('input').find((i) => /Search/.test(i.getAttribute('placeholder') || ''));
                Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(box, 'aptitude');
                box.dispatchEvent(new Event('input', { bubbles: true })); await sleep(250);
                return { shown: $$('li').length, body: text(document.body) };` });
        assert.equal(result.shown, 1, 'only the Aptitude question is left');
        assert.match(result.body, /15% of 200/);
    });

    test('the two settings save one at a time', async () => {
        const { result } = await screen({
            entry, api: api(), script: `
                await sleep(700);
                $('button[role=switch]').click(); await sleep(300);
                find(/^5$/).click(); await sleep(300);
                return { sent: window.__calls.filter((c) => c[0] === 'PUT' && c[1].includes('/settings')).map((c) => c[2]) };` });
        assert.deepEqual(result.sent, [{ globalQuiz: { enabled: false } }, { globalQuiz: { defaultLength: 5 } }],
            'each control sends only its own setting, so it cannot clobber the other');
    });
});
