/**
 * The practice bank page, on a phone and on a laptop.
 *
 * Questions are no longer marked practised, so the page stopped keeping a
 * "1 of 20 practised" tally with a progress bar and a "Practise the next one"
 * button — none of which could move any more. The header now says what the
 * bank holds, the category tabs count every question, and a question linked
 * from the dashboard opens where it is.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles } from './harness.js';
import { apiModule } from './fixtures.js';

const CATS = ['hr', 'technical', 'technical', 'project', 'behavioral'];
const LEVELS = ['easy', 'medium', 'medium', 'hard'];
const QUESTIONS = Array.from({ length: 20 }, (_, i) => ({
    id: `q${i + 1}`, category: CATS[i % CATS.length], difficulty: LEVELS[i % LEVELS.length], topic: 'Aviation basics',
    question: `Tell me about a time you handled situation number ${i + 1}.`, hint: `Hint for number ${i + 1}.`
}));
// One question was practised before the button went; it keeps its tag.
const api = apiModule({ '/questions': { questions: QUESTIONS, practiced: ['q2'] } });

const entry = (hash = '') => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PracticePage from '${srcFile('interview/PracticePage.jsx')}';
createRoot(document.getElementById('root')).render(
  <MemoryRouter initialEntries={['/interview/practice${hash}']}>
    <Routes><Route path="/interview/practice" element={<PracticePage />} /></Routes>
  </MemoryRouter>);`;

const READ = `
    await sleep(1200);
    const banner = $$('p').find((p) => /Practice bank/i.test(p.innerText)).closest('div.relative.overflow-hidden');
    const firstRow = $$('li[id^="pq-"]')[0];
    return {
        banner: text(banner),
        progressBars: banner.querySelectorAll('[style*="width"]').length,
        nextButton: $$('button').some((b) => /Practise the next one/i.test(b.innerText)),
        practisedButton: $$('button').some((b) => /I practised this/i.test(b.innerText)),
        tabs: $$('button[aria-pressed]').map(text),
        firstRowNumber: text(firstRow.querySelector('button > span')),
        practisedTag: !!$('#pq-q2 [aria-label="Practised"]'),
        pageSideways: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    };`;

describe('the practice bank page', { skip: skipWithoutStyles }, () => {
    for (const [name, width] of [['phone', 390], ['laptop', 1280]]) {
        test(`on a ${name}: the header says what the bank holds, with no dead tally or next button`, async () => {
            const { result, errors } = await screen({ entry: entry(), api, width, height: 900, styles: true, budget: 20_000, script: READ });
            assert.deepEqual(errors, []);
            assert.match(result.banner, /20 questions to rehearse/);
            assert.doesNotMatch(result.banner, /\b(easy|medium|hard)\b/, 'no difficulty chips in the header');
            assert.doesNotMatch(result.banner, /practised/i, 'no "1 of 20 practised" tally');
            assert.equal(result.progressBars, 0, 'no progress bar that cannot move');
            assert.equal(result.nextButton, false, 'no "Practise the next one" button');
            assert.equal(result.practisedButton, false, 'and no "I practised this" button');
            assert.ok(!result.pageSideways, 'nothing runs off the side');
        });
    }

    test('the category tabs count every question, so All matches the header', async () => {
        const { result } = await screen({ entry: entry(), api, width: 1280, height: 900, styles: true, budget: 20_000, script: READ });
        assert.deepEqual(result.tabs, ['All20', 'HR4', 'Technical8', 'Projects4', 'Behavioural4'], 'Situational has no questions here, so no tab');
    });

    test('rows are numbered, and one practised earlier keeps its green tick', async () => {
        const { result } = await screen({ entry: entry(), api, width: 1280, height: 900, styles: true, budget: 20_000, script: READ });
        assert.equal(result.firstRowNumber, '1');
        assert.ok(result.practisedTag);
    });

    test('a question linked from the dashboard opens where it is', async () => {
        const { result, errors } = await screen({ entry: entry('#q-q7'), api, width: 390, height: 800, styles: true, budget: 20_000, script: `
            await sleep(3000);
            const row = $('#pq-q7');
            const r = row.getBoundingClientRect();
            return { expanded: row.querySelector('button').getAttribute('aria-expanded'), body: text(row), inView: r.top >= 0 && r.top < innerHeight, top: Math.round(r.top), vh: innerHeight, scrollY };` });
        assert.deepEqual(errors, []);
        assert.equal(result.expanded, 'true', 'it is open');
        assert.match(result.body, /Hint for number 7/);
        assert.ok(result.inView, `and scrolled into view (top ${result.top}, screen ${result.vh}, scrolled ${result.scrollY})`);
    });
});
