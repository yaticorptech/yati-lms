/**
 * Aptitude practice in Interview Prep (asked 2026-10-22): "IQ & Reasoning" for
 * a Class 10 student — the sections, Start, a set answered one question at a
 * time with each answer's feedback, the score and the review — on a phone and
 * a laptop, inside the app's own frame. The server is stood in for.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles, DEVICES } from './harness.js';
import { apiModule } from './fixtures.js';

const QS = [
    { id: 'q1', section: 'maths', topic: 'Percentages', question: 'What is 25% of 80?', options: ['15', '20', '25', '30'], difficulty: 'easy', answer: 1, explanation: '25 ÷ 100 × 80 = 20.' },
    { id: 'q2', section: 'asked', topic: 'Thinking it through', question: 'If 5 machines take 5 minutes to make 5 toys, how long would 100 machines take to make 100 toys?', options: ['100 minutes', '5 minutes', '20 minutes', '1 minute'], difficulty: 'medium', faq: true, answer: 1, explanation: 'Each machine makes 1 toy in 5 minutes.' },
    { id: 'q3', section: 'words', topic: 'Word pairs', question: 'Bird is to fly as fish is to …', options: ['Walk', 'Swim', 'Jump', 'Sing'], difficulty: 'medium', answer: 1, explanation: 'A bird flies; a fish swims.' }
];
const SECTIONS = [
    { id: 'mixed', label: 'Mixed', hint: 'A bit of everything.' }, { id: 'asked', label: 'Most asked puzzles', hint: 'The famous puzzles quizzes and interviews love to ask.' }, { id: 'maths', label: 'Maths puzzles', hint: 'Numbers, sums and word problems.' },
    { id: 'patterns', label: 'Patterns', hint: 'What comes next, and the odd one out.' }, { id: 'reasoning', label: 'Logic', hint: 'Directions, codes, days and comparing.' },
    { id: 'words', label: 'Words', hint: 'Word pairs, meanings and grammar.' }
];
const HOME = { title: 'IQ & Reasoning', school: true, level: 'Class 10', placed: true, sections: SECTIONS, setSize: 10, stats: { sets: 2, best: 80, last: { correct: 6, total: 10, percent: 60 }, recent: [{ id: 'old1', section: 'maths', correct: 8, total: 10, percent: 80, completedAt: '2026-10-21T10:00:00Z' }] }, open: null };

// The server, as far as a set goes: answers are revealed only once chosen.
const server = `(() => {
  const QS = ${JSON.stringify(QS)}; const chosen = {};
  const pub = (id) => {
    const qs = QS.map((q) => { const c = chosen[q.id] ?? null; const b = { id: q.id, section: q.section, topic: q.topic, question: q.question, options: q.options, difficulty: q.difficulty, faq: !!q.faq, chosen: c };
      return c === null ? b : { ...b, answer: q.answer, explanation: q.explanation, right: c === q.answer }; });
    const correct = qs.filter((q) => q.right).length, answered = qs.filter((q) => q.chosen !== null).length;
    return { id, title: 'IQ & Reasoning', section: 'mixed', sectionLabel: 'Mixed', status: answered === QS.length ? 'completed' : 'open', total: QS.length, answered, correct, percent: Math.round((correct / QS.length) * 100), questions: qs };
  };
  return (url, body) => {
    if (/\\/answer$/.test(url)) { if (chosen[body.id] === undefined) chosen[body.id] = body.choice; const q = QS.find((x) => x.id === body.id); return { result: { right: chosen[body.id] === q.answer, answer: q.answer, explanation: q.explanation }, set: pub('s1') }; }
    if (/aptitude\\/sets$/.test(url)) return pub('s2');
    return {};
  };
})()`;
const fresh = (id) => ({ id, title: 'IQ & Reasoning', section: 'mixed', sectionLabel: 'Mixed', status: 'open', total: 3, answered: 0, correct: 0, percent: 0,
    questions: QS.map((q) => ({ id: q.id, section: q.section, topic: q.topic, question: q.question, options: q.options, difficulty: q.difficulty, faq: !!q.faq, chosen: null })) });
// Key order matters: the first key the address contains wins.
const api = (home = HOME) => apiModule({ '/aptitude/sets/s1': fresh('s1'), '/aptitude/sets/s2': fresh('s2'), '/aptitude': home }, server);

/** The page at `route`, in the app's frame (the page scrolls inside <main>). */
const entry = (route) => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import AptitudePage from '${srcFile('interview/AptitudePage.jsx')}';
const Where = () => <p id="where">{useLocation().pathname}</p>;
createRoot(document.getElementById('root')).render(
  <MemoryRouter initialEntries={['${route}']}>
    <div className="flex h-dvh"><main className="relative flex-1 overflow-auto"><div className="mx-auto p-4 pb-[7.5rem]">
      <Routes><Route path="/interview/aptitude" element={<AptitudePage />} /><Route path="/interview/aptitude/:id" element={<AptitudePage />} /><Route path="*" element={null} /></Routes>
      <Where />
    </div></main></div>
  </MemoryRouter>);`;
// How far the page runs past the screen. Phone emulation widens the window
// to fit a page that is too wide, so there it is measured against the screen;
// a laptop-sized window keeps headless Chrome's own screen width (800).
const WIDE = `const main = $('main'); return main.scrollWidth - main.clientWidth + (matchMedia('(pointer: coarse)').matches ? Math.max(0, innerWidth - screen.width) : 0);`;

describe('aptitude practice', { skip: skipWithoutStyles }, () => {
    for (const [name, size] of [['phone', { device: DEVICES.galaxyZFold6Folded }], ['laptop', { width: 1366, height: 900 }]]) {
        test(`on a ${name}: "IQ & Reasoning" for Class 10, the sections, and Start opens a set of the chosen kind`, async () => {
            const { result, errors } = await screen({ entry: entry('/interview/aptitude'), api: api(), styles: true, ...size, script: `
                await sleep(900);
                const wide = (() => { ${WIDE} })();
                const before = { title: text($('h1')), level: text($('[data-level]')), sections: $$('[data-section]').map((b) => b.dataset.section), pressed: $('[data-section][aria-pressed="true"]').dataset.section, recent: $$('li').map(text) };
                $('[data-section="words"]').click(); await sleep(150);
                $$('button').find((b) => /Start 10 questions/.test(b.innerText)).click(); await sleep(600);
                return { ...before, wide, posted: window.__calls.filter((c) => c[0] === 'POST').map((c) => [c[1], c[2]]), where: text($('#where')) };` });
            assert.deepEqual(errors, []);
            assert.equal(result.__error, undefined, result.__error);
            assert.equal(result.title, 'IQ & Reasoning');
            assert.match(result.level, /10 quick questions at a time, picked for Class 10/);
            assert.deepEqual(result.sections, ['mixed', 'asked', 'maths', 'patterns', 'reasoning', 'words']);
            assert.equal(result.pressed, 'mixed', 'Mixed is chosen to begin with');
            assert.match(result.recent[0], /Maths puzzles.*8\/10/s);
            assert.deepEqual(result.posted, [['/interview/aptitude/sets', { section: 'words' }]]);
            assert.equal(result.where, '/interview/aptitude/s2');
            assert.ok(result.wide <= 1, `nothing wider than the screen (${result.wide}px)`);
        });

        test(`on a ${name}: a set, one question at a time — right, wrong, why — then the score and the review`, async () => {
            const { result, errors } = await screen({ entry: entry('/interview/aptitude/s1'), api: api(), styles: true, ...size, script: `
                await sleep(900);
                const opt = (i) => $('[data-option="' + i + '"]');
                const next = () => $$('button').find((b) => /Next question|See your score/.test(b.innerText));
                const first = { progress: text($('[data-progress]')), feedback: !!$('[data-feedback]'), next: !!next(), tag: !!$('[data-often-asked]') };
                opt(0).click(); await sleep(400);                                   // wrong
                const wrong = { feedback: $('[data-feedback]').dataset.feedback, says: text($('[data-feedback] p')), marked: opt(1).getAttribute('aria-label'), picked: opt(0).getAttribute('aria-label'), locked: opt(2).disabled, wide: (() => { ${WIDE} })() };
                opt(1).click(); await sleep(300);                                   // a second tap changes nothing
                const answersSent = window.__calls.filter((c) => c[0] === 'POST').length;
                next().click(); await sleep(300);
                const second = text($('[data-progress]'));
                const tagged = !!$('[data-often-asked]');
                opt(1).click(); await sleep(400);                                   // right
                const right = { feedback: $('[data-feedback]').dataset.feedback, says: text($('[data-feedback] p')) };
                next().click(); await sleep(300);
                opt(1).click(); await sleep(400);
                const lastButton = text(next());
                next().click(); await sleep(700);
                return { first, wrong, answersSent, second, tagged, right, lastButton, reviewTags: $$('[data-review]').map((li) => !!li.querySelector('[data-often-asked]')),
                    result: text($('[data-result]')), review: $$('[data-review]').map((li) => li.dataset.review), wide: (() => { ${WIDE} })(),
                    posted: window.__calls.filter((c) => c[0] === 'POST').map((c) => c[2]) };` });
            assert.deepEqual(errors, []);
            assert.equal(result.__error, undefined, result.__error);
            assert.deepEqual(result.first, { progress: 'Question 1 of 3', feedback: false, next: false, tag: false }, 'no answer shown before choosing, and no tag on an ordinary question');
            assert.equal(result.wrong.feedback, 'wrong');
            assert.equal(result.wrong.says, 'Not quite. The answer is B: 20.');
            assert.match(result.wrong.marked, /right answer/); assert.match(result.wrong.picked, /your answer, wrong/);
            assert.equal(result.wrong.locked, true, 'the options lock once answered');
            assert.equal(result.answersSent, 1, 'a second tap sends nothing');
            assert.equal(result.second, 'Question 2 of 3');
            assert.equal(result.tagged, true, 'the often-asked question is tagged');
            assert.deepEqual(result.reviewTags, [false, true, false], 'and tagged in the review');
            assert.equal(result.right.feedback, 'right'); assert.match(result.right.says, /Correct!/);
            assert.match(result.lastButton, /See your score/);
            assert.match(result.result, /Good effort!/); assert.match(result.result, /You got 2 of 3 right in Mixed/);
            assert.deepEqual(result.review, ['wrong', 'right', 'right']);
            assert.deepEqual(result.posted, [{ id: 'q1', choice: 0 }, { id: 'q2', choice: 1 }, { id: 'q3', choice: 1 }]);
            assert.ok(result.wrong.wide <= 1 && result.wide <= 1, 'nothing wider than the screen');
        });
    }

    test('a student the app cannot place is told how to get questions for their level', async () => {
        const { result, errors } = await screen({ entry: entry('/interview/aptitude'), api: api({ ...HOME, title: 'Aptitude Practice', school: false, level: '', placed: false, stats: { sets: 0, best: null, last: null, recent: [] } }), styles: true, script: `
            await sleep(800);
            return { title: text($('h1')), level: text($('[data-level]')), unplaced: text($('[data-unplaced]') || document.body), recent: $$('li').length };` });
        assert.deepEqual(errors, []);
        assert.equal(result.title, 'Aptitude Practice');
        assert.equal(result.level, '10 quick questions at a time.');
        assert.match(result.unplaced, /Add your class or course to your Career Path profile/);
        assert.equal(result.recent, 0, 'no recent sets yet');
    });

    test('the Interview dashboard card: its name for the student, the best score, and the way in', async () => {
        const card = (aptitude) => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AptitudeCard } from '${srcFile('interview/DashboardCards.jsx')}';
createRoot(document.getElementById('root')).render(<MemoryRouter><AptitudeCard aptitude={${JSON.stringify(aptitude)}} /></MemoryRouter>);`;
        const read = `await sleep(300); const c = $('[data-aptitude-card]'); return { title: text(c.querySelector('h2')), body: text(c), link: c.querySelector('a').getAttribute('href') };`;
        const fresh = await screen({ entry: card({ title: 'IQ & Reasoning', school: true, sets: 0, best: null }), api: apiModule({}), styles: true, script: read });
        const played = await screen({ entry: card({ title: 'Aptitude Practice', school: false, sets: 3, best: 90 }), api: apiModule({}), styles: true, script: read });
        assert.equal(fresh.result.title, 'IQ & Reasoning'); assert.match(fresh.result.body, /made for your class/); assert.match(fresh.result.body, /Start practising/); assert.doesNotMatch(fresh.result.body, /Best/);
        assert.equal(fresh.result.link, '/interview/aptitude');
        assert.equal(played.result.title, 'Aptitude Practice'); assert.match(played.result.body, /Best 90% · 3 sets/); assert.match(played.result.body, /Practise again/);
    });
});
