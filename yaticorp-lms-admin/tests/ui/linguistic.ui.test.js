/**
 * Linguistic Ability in the admin panel (asked 2026-10-22), with the server
 * stood in for: the lessons and their overview, the lesson editor (the
 * server's reasons shown when it refuses, questions built with their answers
 * and sent as such), and a teacher's review.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles } from './harness.js';

const grid = Object.fromEntries(['vocabulary', 'grammar', 'reading', 'speaking', 'translation'].map((m) => [m, { beginner: { published: 2, draft: 0 }, intermediate: { published: 2, draft: m === 'grammar' ? 1 : 0 }, advanced: { published: 2, draft: 0 } }]));
const LESSONS = [
    { id: 'l1', module: 'vocabulary', level: 'beginner', order: 1, title: 'Home and family', status: 'published', direction: null, counts: { words: 8, practice: 0, quiz: 0, writing: 0, items: 0, lines: 0 }, updatedAt: '2026-10-22', updatedBy: 'Seed content' },
    { id: 'l2', module: 'translation', level: 'beginner', order: 2, title: 'Everyday words', status: 'draft', direction: 'en-kn', counts: { words: 0, practice: 0, quiz: 4, writing: 0, items: 6, lines: 0 }, updatedAt: '2026-10-22', updatedBy: 'QA' }
];
const SUBMISSION = { id: 's1', student: { id: 'u1', name: 'Asha Rao', cardNumber: '2401' }, lesson: 'My Morning', module: 'reading', level: 'beginner', kind: 'writing', taskType: 'paragraph', prompt: 'Write about your morning.', answer: 'I wake up at six. I recieve the paper.', model: 'I wake up at half past six.', autoFeedback: [{ kind: 'tip', text: 'Check the spelling: "recieve" should be "receive".' }], status: 'pending', score: null, comment: '', submittedAt: '2026-10-22' };

const api = `
window.__calls = [];
const reply = (data) => Promise.resolve({ data });
const refuse = (status, data) => Promise.reject({ response: { status, data } });
export default {
  get: (url, config) => { window.__calls.push(['GET', url, config && config.params]);
    if (url === '/linguistic/admin/overview') return reply({ grid: ${JSON.stringify(grid)}, lessons: 31, students: 4, pendingReviews: 1 });
    if (url === '/linguistic/admin/lessons') return reply({ lessons: ${JSON.stringify(LESSONS)} });
    if (url === '/linguistic/admin/submissions') return reply({ total: 1, page: 1, pages: 1, submissions: [${JSON.stringify(SUBMISSION)}] });
    return reply({}); },
  post: (url, body) => { window.__calls.push(['POST', url, body]);
    if (url === '/linguistic/admin/lessons') {
      if (!body.quiz || body.quiz.length < 2) return refuse(400, { message: 'Quiz: add at least 2 questions.', errors: ['Practice: add at least 1 question.', 'Quiz: add at least 2 questions.'] });
      return reply({ id: 'new1', ...body });
    }
    return reply({}); },
  put: (url, body) => { window.__calls.push(['PUT', url, body]); return reply({ id: 's1', status: 'reviewed', score: Number(body.score), comment: body.comment, reviewedBy: 'QA Admin' }); },
  patch: (url, body) => { window.__calls.push(['PATCH', url, body]); return reply({}); },
  delete: (url) => { window.__calls.push(['DELETE', url]); return reply({}); }
};`;

const page = (route) => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Page from '${srcFile('pages/linguistic/LinguisticAdmin.jsx')}';
createRoot(document.getElementById('root')).render(<MemoryRouter initialEntries={['${route}']}><Routes><Route path="/linguistic" element={<Page />} /></Routes></MemoryRouter>);`;

// Set a React-controlled field: the native setter, then input and change.
const PUT = `const put = (el, v) => { const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
const section = (t) => [...document.querySelectorAll('[data-lesson-editor] section')].find((s) => s.querySelector('h2')?.innerText.trim() === t);
const field = (root, label) => [...root.querySelectorAll('label')].find((l) => l.innerText.trim().toLowerCase().startsWith(label.toLowerCase()))?.querySelector('input, textarea, select');`;

describe('Linguistic Ability in the admin panel', { skip: skipWithoutStyles }, () => {
    test('the lessons: an overview by module and level, and each lesson with its status and actions', async () => {
        const { result, errors } = await screen({ entry: page('/linguistic'), api, styles: true, script: `
            await sleep(800);
            const rows = $$('[data-lesson-row]').map((r) => [r.dataset.lessonRow, r.querySelector('[data-status]').innerText, !!r.querySelector('[aria-label^="Edit"]'), !!r.querySelector(r.querySelector('[data-status]').innerText === 'Published' ? '[aria-label^="Unpublish"]' : '[aria-label^="Publish"]'), !!r.querySelector('[aria-label^="Delete"]')]);
            return { overview: $$('[data-overview] tbody tr').map((tr) => tr.innerText.replace(/\\s+/g, ' ').trim()), rows, reviewsBadge: $$('button').find((b) => /^\\s*Reviews/.test(b.innerText))?.innerText.replace(/\\s+/g, ' ').trim(), direction: /English → Kannada/.test(document.body.innerText) };` });
        assert.deepEqual(errors, []);
        assert.equal(result.overview.length, 5);
        assert.match(result.overview[1], /Grammar Practice 2 published 2 published · 1 draft 2 published/);
        assert.deepEqual(result.rows, [['l1', 'Published', true, true, true], ['l2', 'Draft', true, true, true]]);
        assert.match(result.reviewsBadge, /Reviews\s*1/);
        assert.equal(result.direction, true);
    });

    test('the editor: the server\'s reasons when it refuses; questions sent with their options and answers', async () => {
        const { result, errors } = await screen({ entry: page('/linguistic?lesson=new'), api, styles: true, script: `
            ${PUT}
            await sleep(700);
            put(field(section('The lesson'), 'Module'), 'grammar'); await sleep(200);
            put(document.querySelector('[data-lesson-title]'), 'Test lesson'); await sleep(100);
            document.querySelector('[data-save-lesson]').click(); await sleep(400);
            const refused = [...document.querySelectorAll('[data-lesson-errors] li')].map((li) => li.innerText);
            [...section('Practice questions').querySelectorAll('button')].find((b) => /Multiple choice/.test(b.innerText)).click(); await sleep(150);
            put(field(section('Practice questions'), 'Question'), 'Pick yes'); put(field(section('Practice questions'), 'Options'), 'yes\\nno'); await sleep(150);
            const choices = [...field(section('Practice questions'), 'Correct option').options].map((o) => o.value);
            put(field(section('Practice questions'), 'Correct option'), 'yes'); await sleep(100);
            for (let i = 0; i < 2; i++) { [...section('Quiz').querySelectorAll('button')].find((b) => /Fill in the blank/.test(b.innerText)).click(); await sleep(150); }
            [...section('Quiz').querySelectorAll('.rounded-2xl.border')].forEach((r, i) => { put(field(r, 'Sentence with ___'), i ? 'She ___ here.' : 'I ___ fine.'); put(field(r, 'Correct answer'), i ? 'is' : 'am'); });
            await sleep(150);
            document.querySelector('[data-save-lesson]').click(); await sleep(500);
            const sent = window.__calls.filter((c) => c[0] === 'POST').pop()[2];
            return { refused, choices, module: sent.module, title: sent.title, practice: sent.practice.map((q) => [q.type, q.prompt, q.options, q.answer]), quiz: sent.quiz.map((q) => [q.type, q.prompt, q.answer]), created: /Lesson created/.test(document.body.innerText) };` });
        assert.deepEqual(errors, []);
        assert.deepEqual(result.refused, ['Practice: add at least 1 question.', 'Quiz: add at least 2 questions.']);
        assert.deepEqual(result.choices, ['', 'yes', 'no'], 'the correct option is picked from the options written');
        assert.equal(result.module, 'grammar'); assert.equal(result.title, 'Test lesson');
        assert.deepEqual(result.practice, [['mcq', 'Pick yes', ['yes', 'no'], 'yes']]);
        assert.deepEqual(result.quiz, [['fill', 'I ___ fine.', 'am'], ['fill', 'She ___ here.', 'is']]);
        assert.equal(result.created, true, '"Lesson created" stays in view');
    });

    test('a review: the answer with the tips the student saw, and a score and comment saved', async () => {
        const { result, errors } = await screen({ entry: page('/linguistic?tab=reviews'), api, styles: true, script: `
            ${PUT}
            await sleep(800);
            const card = $('[data-review="s1"]');
            const shown = { answer: text(card.querySelector('[data-answer]')), tips: /should be "receive"/.test(card.innerText) };
            put(card.querySelector('input[type=number]'), '85'); put(card.querySelector('input[placeholder^="What was good"]'), 'Well ordered.'); await sleep(100);
            [...card.querySelectorAll('button')].find((b) => /Save review/.test(b.innerText)).click(); await sleep(400);
            return { ...shown, sent: window.__calls.find((c) => c[0] === 'PUT')?.slice(1), saved: /Saved: 85\\/100/.test(document.body.innerText), gone: !$('[data-review="s1"]') };` });
        assert.deepEqual(errors, []);
        assert.match(result.answer, /I recieve the paper/); assert.equal(result.tips, true);
        assert.deepEqual(result.sent, ['/linguistic/admin/submissions/s1', { score: 85, comment: 'Well ordered.' }]);
        assert.equal(result.saved, true); assert.equal(result.gone, true, 'it leaves the waiting list');
    });
});
