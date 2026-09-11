/**
 * The part-time details popup, at viewports it does not comfortably fit.
 *
 * Two things went wrong here and both are easy to reintroduce: a close button
 * offset outside the card's own edge is the first thing a viewport clips, and
 * a flex item centred inside a scroll container overflows equally top and
 * bottom, so the top half can never be scrolled back to.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles } from './harness.js';
import { apiModule } from './fixtures.js';

// A long interest list, so the card is genuinely taller than a short screen.
const INTERESTS = ['catering', 'events', 'decoration', 'packing', 'photography', 'promotion', 'shop',
    'setup', 'tutoring', 'housework', 'cooking', 'babysitting', 'eldercare', 'petcare', 'gardening',
    'farm', 'carwash', 'laundry', 'tailoring', 'salon', 'bakery', 'canteen', 'market', 'newspaper',
    'xerox', 'repair', 'painting', 'construction', 'loading', 'tent', 'temple', 'security', 'parking',
    'survey', 'dataentry', 'sports', 'other']
    .map((id) => ({ id, label: `${id[0].toUpperCase()}${id.slice(1)} & helpers`, icon: '*' }));

const api = apiModule({ '/opportunities': { total: 0, results: [], categories: [], window: {}, web: { allowed: false, count: 0, searchLinks: [] } } });

const entry = `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import OpportunitiesTab from '${srcFile('opportunities/OpportunitiesTab.jsx')}';
const data = { band: 'teen',
  profile: { dateOfBirth: '2012-02-13', wantFrom: '2026-09-11', wantTo: '2026-09-11', interests: ['catering'], guardianName: 'Radhika', guardianPhone: '+917899324577' },
  vocab: { interests: ${JSON.stringify(INTERESTS)}, categories: [], types: [] }, rules: {}, guardian: null };
createRoot(document.getElementById('root')).render(
  <MemoryRouter><OpportunitiesTab data={data} onData={() => {}} careerPathEnabled location="Bengaluru" onLocation={() => {}} /></MemoryRouter>);`;

/** Open the form the way a student does, then measure it. */
const MEASURE = `
    await sleep(1000);
    const open = $$('button').find((b) => /dates|Edit|Change/i.test(b.innerText));
    if (open) open.click();
    await sleep(600);
    const dialog = $('[role="dialog"]');
    const close = dialog.querySelector('button[aria-label="Close"]');
    const card = dialog.querySelector('form');
    const box = (el) => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right }; };
    const c = box(close), f = box(card);
    const result = {
        vw: window.innerWidth, vh: window.innerHeight,
        closeTop: Math.round(c.top), closeRight: Math.round(c.right),
        cardTop: Math.round(f.top), cardRight: Math.round(f.right),
        // Inside the card on every side, not hanging off it.
        insideCard: c.top >= f.top - 0.5 && c.right <= f.right + 0.5 && c.left >= f.left - 0.5,
        // Reachable: nothing above the top of the scroll area.
        aboveViewport: Math.min(c.top, f.top) < 0,
        scrollable: dialog.scrollHeight > dialog.clientHeight
    };`;

describe('the part-time details popup', { skip: skipWithoutStyles }, () => {
    for (const [w, h] of [[1400, 900], [1200, 620], [1000, 560], [760, 560]]) {
        test(`nothing is cut off at ${w} by ${h}`, async () => {
            const { result, errors } = await screen({
                entry, api, width: w, height: h, styles: true, budget: 20_000,
                script: `${MEASURE} return result;` });
            assert.deepEqual(errors, []);
            assert.equal(result.aboveViewport, false,
                `the popup starts ${Math.min(result.closeTop, result.cardTop)}px above the top, where it cannot be scrolled back to`);
            assert.ok(result.closeRight <= result.vw, 'the close button is inside the screen');
        });
    }

    test('the close button sits inside the card, not hanging off its corner', async () => {
        const { result } = await screen({
            entry, api, width: 1200, height: 900, styles: true, budget: 20_000,
            script: `${MEASURE} return result;` });
        assert.ok(result.insideCard,
            `close at top ${result.closeTop} right ${result.closeRight}, card at top ${result.cardTop} right ${result.cardRight}`);
    });

    test('a card taller than the screen scrolls rather than losing its top', async () => {
        const { result } = await screen({
            entry, api, width: 1000, height: 560, styles: true, budget: 20_000,
            script: `${MEASURE} return result;` });
        assert.ok(result.scrollable, 'this viewport really is too short for the form');
        assert.equal(result.aboveViewport, false);
        assert.ok(result.cardTop >= 0, 'and the top of it is still reachable');
    });
});
