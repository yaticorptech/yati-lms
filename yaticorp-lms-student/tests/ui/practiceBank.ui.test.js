/**
 * The practice bank card, on a narrow screen.
 *
 * The wording and the "Practise the next one" button shared one line at every
 * width. The button kept its size and the wording collapsed into a column
 * about three words across, reading straight down the card. The wording asks
 * for a minimum now, so on a phone the button drops below it instead.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles } from './harness.js';
import { apiModule } from './fixtures.js';

const QUESTIONS = Array.from({ length: 21 }, (_, i) => ({
    id: `q${i + 1}`, category: 'hr', difficulty: 'medium',
    question: `Tell me about a time you handled situation number ${i + 1}.`,
    tips: ['Use the STAR shape.'], practised: i < 3
}));
const api = apiModule({ '/questions': { questions: QUESTIONS, practiced: ['q1', 'q2', 'q3'] } });

const entry = (width) => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PracticePage from '${srcFile('interview/PracticePage.jsx')}';
createRoot(document.getElementById('root')).render(
  <MemoryRouter initialEntries={['/interview/practice']}>
    <div id="box" style={{ width: ${width} }}>
      <Routes><Route path="/interview/practice" element={<PracticePage />} /></Routes>
    </div>
  </MemoryRouter>);`;

const MEASURE = `
    await sleep(1200);
    const blurb = $$('p').find((p) => /think your answer through out loud/i.test(p.innerText));
    if (!blurb) return { noBlurb: true };
    const card = blurb.closest('div.relative.overflow-hidden') || blurb.parentElement.parentElement;
    const cta = $$('button').find((b) => /Practise the next one/i.test(b.innerText));
    const t = blurb.getBoundingClientRect();
    const c = cta ? cta.getBoundingClientRect() : null;
    const lh = parseFloat(getComputedStyle(blurb).lineHeight);
    return {
        cardWidth: Math.round(card.getBoundingClientRect().width),
        textWidth: Math.round(t.width),
        lines: Math.round(t.height / lh),
        ctaBelow: !!(c && c.top >= t.bottom - 1),
        ctaBeside: !!(c && c.left > t.right - 1)
    };`;

/** Open the first question, then measure the row under it. */
const ROW = `
    await sleep(1200);
    const q = $$('button').find((b) => /handled situation number 4/i.test(b.innerText));
    if (q) q.click();
    await sleep(500);
    // Collapse keeps closed questions in the DOM, so a note and a button found
    // separately can belong to different rows. Take the visible pair.
    const cta = $$('button').filter((b) => /I practised this/i.test(b.innerText))
        .find((b) => b.getBoundingClientRect().height > 0);
    if (!cta) return { noNote: true };
    const row = cta.parentElement;
    const note = Array.from(row.children).find((c) => /best rehearsal/i.test(c.innerText || ''));
    if (!note) return { noNote: true };
    const n = note.getBoundingClientRect(), c = cta.getBoundingClientRect(), r = row.getBoundingClientRect();
    const lh = parseFloat(getComputedStyle(cta).lineHeight);
    return {
        rowWidth: Math.round(r.width),
        noteWidth: Math.round(n.width),
        ctaLines: Math.round((c.height - 16) / lh),
        ctaBelow: c.top >= n.bottom - 1,
        ctaBeside: c.left > n.right - 1
    };`;

describe('the practice bank card', { skip: skipWithoutStyles }, () => {
    test('the practised button keeps its label on one line', async () => {
        // It sat beside the note in a row that could not wrap, so the note
        // shrank and "I practised this (+5 XP)" broke across three lines.
        const { result, errors } = await screen({
            entry: entry(360), api, width: 500, height: 900, styles: true, budget: 20_000, script: ROW });
        assert.deepEqual(errors, []);
        assert.equal(result.noNote, undefined, 'the question opened');
        assert.equal(result.ctaLines, 1, `the button's label ran to ${result.ctaLines} lines`);
        assert.ok(result.ctaBelow, 'and it took its own line under the note');
    });

    test('on a wide screen the practised button sits beside the note', async () => {
        const { result } = await screen({
            entry: entry(900), api, width: 1280, height: 900, styles: true, budget: 20_000, script: ROW });
        assert.ok(result.ctaBeside, 'still alongside where there is room');
        assert.equal(result.ctaLines, 1, 'and still on one line');
    });

    test('on a phone the wording gets the width, and the button drops below it', async () => {
        const { result, errors } = await screen({
            entry: entry(360), api, width: 500, height: 900, styles: true, budget: 20_000, script: MEASURE });
        assert.deepEqual(errors, []);
        assert.equal(result.noBlurb, undefined, 'the card is on screen');
        assert.ok(result.textWidth >= result.cardWidth * 0.7,
            `the wording got ${result.textWidth}px of a ${result.cardWidth}px card`);
        assert.ok(result.lines <= 4, `it ran to ${result.lines} lines`);
        assert.ok(result.ctaBelow, 'the button dropped below the wording rather than squeezing it');
    });

    test('on a wide screen the button sits beside the wording', async () => {
        const { result } = await screen({
            entry: entry(900), api, width: 1280, height: 900, styles: true, budget: 20_000, script: MEASURE });
        assert.ok(result.ctaBeside, 'the button is still alongside on a wide card');
        assert.ok(result.lines <= 3, `the wording ran to ${result.lines} lines`);
    });
});
