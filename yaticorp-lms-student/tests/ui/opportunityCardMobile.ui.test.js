/**
 * A part-time opportunity card on a phone.
 *
 * The card lives in a grid. A grid item will not shrink below its own content
 * width unless it is told it may, so the longest word in a job title used to
 * set the card's width and push the match badge, the dates and the buttons off
 * the side of the screen.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles } from './harness.js';
import { apiModule } from './fixtures.js';

const PHONE_VIEWPORT = 500;
const api = apiModule({});

const OPP = {
    id: 'o1', icon: '📷', title: 'Photography assistant, engagement ceremony',
    organization: { name: 'Frame & Focus Studio', verified: true },
    matchScore: 100, opportunityType: 'event',
    startsAt: '2026-09-11T16:00:00.000Z', endsAt: '2026-09-11T20:00:00.000Z', timeLabel: '16:00–20:00',
    location: { area: 'Whitefield', city: 'Bengaluru' },
    hoursPerSession: '2-4', minimumAge: 16, maximumAge: null, slots: 1,
    compensation: { label: '₹800' },
    description: "Hand over lenses, hold the reflector and tag photos afterwards for the studio's lead photographer.",
    signals: { interests: ['photography', 'events'], date: 'in-window' },
    matchReasons: ['interests', 'date', 'similar'],
    guardianApprovalRequired: true, preference: null, verified: true
};
const VOCAB = {
    categories: [{ id: 'photography', label: 'Photography & media' }, { id: 'events', label: 'Events & functions' }],
    types: [{ id: 'event', label: 'Event' }], interests: []
};

/** The card in the grid the tab puts it in, inside a box the width of a phone. */
const entry = (box) => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import OpportunityCard from '${srcFile('opportunities/OpportunityCard.jsx')}';
createRoot(document.getElementById('root')).render(
  <MemoryRouter><div id="box" style={{ width: ${box}, padding: 8 }}>
    <div className="stagger grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <OpportunityCard opp={${JSON.stringify(OPP)}} vocab={${JSON.stringify(VOCAB)}} guardian={{ status: 'pending' }}
        onInterested={() => {}} onNotInterested={() => {}} onOpen={() => {}} />
    </div>
  </div></MemoryRouter>);`;

const SWEEP = `
    const handled = (el) => {
        const st = getComputedStyle(el);
        return ['auto', 'scroll', 'hidden', 'clip'].includes(st.overflowX) || st.position === 'absolute';
    };
    const offenders = [...document.querySelectorAll('*')]
        .filter((el) => el.clientWidth > 4 && el.scrollWidth > el.clientWidth + 1 && !handled(el))
        .map((el) => el.tagName.toLowerCase() + '[' + String(el.className || '').split(' ').filter(Boolean).slice(0, 3).join(' ') + ']'
            + ' needs ' + el.scrollWidth + ' has ' + el.clientWidth);`;

describe('a part-time card on a phone', { skip: skipWithoutStyles }, () => {
    for (const box of [320, 360, 430]) {
        test(`the whole card fits a ${box}px screen`, async () => {
            const { result, errors } = await screen({
                entry: entry(box), api, width: PHONE_VIEWPORT, styles: true, script: `
                    await sleep(800);
                    ${SWEEP}
                    const card = $('article');
                    return { offenders, cardFits: card.scrollWidth <= card.clientWidth + 1,
                             boxFits: $('#box').scrollWidth <= $('#box').clientWidth + 1 };` });
            assert.deepEqual(errors, []);
            assert.deepEqual(result.offenders, [], `does not fit: ${result.offenders.join(' | ')}`);
            assert.ok(result.cardFits && result.boxFits);
        });
    }

    test('everything that matters is still readable, not cut off', async () => {
        const { result } = await screen({
            entry: entry(360), api, width: PHONE_VIEWPORT, styles: true, script: `
                await sleep(800);
                const body = text($('article'));
                const btn = (re) => $$('button').find((b) => re.test(b.innerText));
                const view = btn(/View details/);
                const card = $('article');
                return {
                    body,
                    viewInside: view.getBoundingClientRect().right <= card.getBoundingClientRect().right + 1
                };` });
        for (const phrase of ['Photography assistant, engagement ceremony', 'Frame & Focus Studio', 'Verified',
            '100% match', 'YOUR DATES', 'Whitefield, Bengaluru', '2–4 hrs', 'Ages 16+', '₹800',
            'Photography & media', 'Events & functions', 'Guardian approval pending']) {
            assert.ok(result.body.includes(phrase), `"${phrase}" is missing from the card`);
        }
        assert.ok(result.viewInside, 'the View details button is inside the card, not past its edge');
    });

    test('the match badge moves under the title rather than squeezing it', async () => {
        const { result } = await screen({
            entry: entry(320), api, width: PHONE_VIEWPORT, styles: true, script: `
                await sleep(800);
                const title = $('h3');
                const badge = $$('span').find((s) => /% match$/.test(s.innerText.trim()));
                return {
                    titleFits: title.scrollWidth <= title.clientWidth + 1,
                    titleWidth: title.clientWidth,
                    badgeBelow: badge.getBoundingClientRect().top >= title.getBoundingClientRect().bottom - 1
                };` });
        assert.ok(result.titleFits, `the title needs more than its ${result.titleWidth}px column`);
        assert.ok(result.badgeBelow, 'the badge has dropped to its own line');
    });

    test('on a desktop the badge is back beside the title', async () => {
        // Full width, so the grid opens to its three columns as it would on a
        // real page; a narrow box at this viewport gives three tiny columns.
        const { result } = await screen({
            entry: entry("'100%'"), api, width: 1280, styles: true, script: `
                await sleep(800);
                const title = $('h3');
                const badge = $$('span').find((s) => /% match$/.test(s.innerText.trim()));
                return { sameLine: badge.getBoundingClientRect().top < title.getBoundingClientRect().bottom };` });
        assert.ok(result.sameLine, 'one row again when there is room');
    });
});
