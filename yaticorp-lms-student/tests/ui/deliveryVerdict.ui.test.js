/**
 * The "How you sounded" card: its overall word agrees with the notes under
 * it, and on a phone the title is not squeezed by the badge.
 *
 * It used to count problems — two or fewer was "Good" — so a very slow pace
 * and four-word answers, two of only three things measured, read "Good".
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles } from './harness.js';

const good = (kind, text) => ({ kind, tone: 'good', text });
const warn = (kind, text) => ({ kind, tone: 'warn', text });
const CASES = {
    screenshot: [good('fillers', 'Very few filler words — your answers sounded clean.'),
        warn('pace', 'You spoke slowly, around 26 words a minute. A little more pace will sound more confident.'),
        warn('length', 'Your answers were short, about 4 words on average. Aim for 60 to 120 words with one concrete example.')],
    allGood: [good('fillers', 'Clean.'), good('pace', 'Comfortable pace.'), good('length', 'Good length.')],
    oneOfThree: [good('fillers', 'Clean.'), warn('pace', 'Slow.'), good('length', 'Good length.')],
    half: [good('fillers', 'Clean.'), warn('pace', 'Slow.')],
    typed: [{ kind: 'voice', tone: 'info', text: 'These answers were typed. Speak next time.' }]
};

const entry = (notes) => `
import { createRoot } from 'react-dom/client';
import { DeliveryCard } from '${srcFile('interview/ReportCards.jsx')}';
createRoot(document.getElementById('root')).render(<div style={{ padding: 16 }}><DeliveryCard communication={${JSON.stringify({ notes })}} /></div>);`;

const READ = `
    await sleep(400);
    const card = $('section');
    const badge = Array.from(card.querySelectorAll('span')).find((el) => /^Overall:/.test(el.innerText.trim()));
    const title = card.querySelector('h2').getBoundingClientRect();
    const blurb = card.querySelector('h2 + p').getBoundingClientRect();
    const box = card.getBoundingClientRect();
    return { verdict: badge ? text(badge) : null, titleLines: Math.round(title.height / parseFloat(getComputedStyle(card.querySelector('h2')).lineHeight)), blurbShare: blurb.width / box.width };`;

describe('the delivery verdict', { skip: skipWithoutStyles }, () => {
    const expect = { screenshot: 'Overall: Needs work', allGood: 'Overall: Excellent', oneOfThree: 'Overall: Good', half: 'Overall: Fair', typed: null };
    for (const [name, notes] of Object.entries(CASES)) {
        test(`${name} → ${expect[name] || 'no verdict'}`, async () => {
            const { result, errors } = await screen({ entry: entry(notes), api: 'export default {}', width: 1280, height: 800, styles: true, script: READ });
            assert.deepEqual(errors, []);
            assert.equal(result.verdict, expect[name]);
        });
    }

    test('on a phone the title keeps one line and the description the card width', async () => {
        const { result } = await screen({ entry: entry(CASES.screenshot), api: 'export default {}', width: 390, height: 800, styles: true, script: READ });
        assert.equal(result.titleLines, 1, '"How you sounded" on one line');
        assert.ok(result.blurbShare > 0.6, `the description gets most of the card, not ${Math.round(result.blurbShare * 100)}%`);
    });
});
