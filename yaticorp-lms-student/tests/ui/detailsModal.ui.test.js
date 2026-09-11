/**
 * The job details popup, at viewports it has to squeeze into.
 *
 * The panel caps its own height and scrolls inside, so the risk is not the
 * body but the header: if the panel reaches the screen edge, the title and the
 * close button are the first things lost. These check there is always overlay
 * visible above and below it.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles } from './harness.js';
import { apiModule } from './fixtures.js';

const OPP = {
    id: 'o1', icon: '🎁', title: 'Gift hamper packing',
    organization: { name: 'Bloom Gifting', verified: true },
    matchScore: 79, opportunityType: 'event-support', category: 'packing',
    startsAt: '2026-09-18T11:00:00.000Z', endsAt: '2026-09-20T15:00:00.000Z', timeLabel: '11:00–15:00',
    location: { area: 'Koramangala', city: 'Bengaluru', venue: '5th Block studio' },
    hoursPerSession: '2-4', minimumAge: 14, maximumAge: null, slots: 5,
    compensation: { label: '₹450/day' },
    description: 'Assemble and ribbon corporate gift hampers at the studio ahead of a big delivery.',
    signals: { interests: ['packing', 'decoration'], date: 'in-window' },
    matchReasons: ['interests', 'similar'],
    guardianApprovalRequired: true, preference: 'interested', verified: true,
    safetyClassification: 'youth-safe', safetyNotes: 'Studio manager in the room; seated work at tables.'
};
const VOCAB = {
    categories: [{ id: 'packing', label: 'Packing & sweet boxing' }, { id: 'decoration', label: 'Decoration & buntings' }],
    types: [{ id: 'event-support', label: 'One-day job' }], interests: [],
    safety: [{ id: 'youth-safe', label: 'Youth-safe', description: 'Light, daytime, supervised work with no hazards — open to teens.' }]
};
const api = apiModule({
    '/opportunities': { opportunity: OPP, rules: { band: 'teen', guardianApproval: true, exposeContact: false, verifiedOnly: true } }
});

const entry = `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import OpportunityDetails from '${srcFile('opportunities/OpportunityDetails.jsx')}';
createRoot(document.getElementById('root')).render(
  <MemoryRouter><OpportunityDetails id="o1" vocab={${JSON.stringify(VOCAB)}} guardian={{ status: 'pending' }}
    onClose={() => {}} onInterested={() => {}} onReport={() => {}} onApply={() => {}} /></MemoryRouter>);`;

const MEASURE = `
    await sleep(900);
    const overlay = $('#root').firstElementChild;
    const panel = overlay.firstElementChild;
    const header = panel.firstElementChild;
    const box = (el) => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; };
    const p = box(panel), hd = box(header);
    const result = {
        vh: window.innerHeight,
        panelTop: Math.round(p.top), panelBottom: Math.round(p.bottom),
        headerTop: Math.round(hd.top), headerBottom: Math.round(hd.bottom),
        gapAbove: Math.round(p.top), gapBelow: Math.round(window.innerHeight - p.bottom),
        // The title and the close button are inside the screen, whole.
        titleVisible: hd.top >= 0 && hd.bottom <= window.innerHeight,
        closeVisible: (() => { const c = panel.querySelector('button[aria-label="Close"], button'); const r = c.getBoundingClientRect(); return r.top >= 0 && r.bottom <= window.innerHeight; })()
    };`;

describe('the job details popup', { skip: skipWithoutStyles }, () => {
    for (const [w, h] of [[1400, 900], [1200, 700], [1000, 620], [760, 560]]) {
        test(`its header is whole and on screen at ${w} by ${h}`, async () => {
            const { result, errors } = await screen({
                entry, api, width: w, height: h, styles: true, script: `${MEASURE} return result;` });
            assert.deepEqual(errors, []);
            assert.ok(result.titleVisible, `the header runs from ${result.headerTop} to ${result.headerBottom} in a ${result.vh}px screen`);
            assert.ok(result.closeVisible, 'the close button is reachable');
            assert.ok(result.gapAbove > 0, `the panel touches the top edge (gap ${result.gapAbove}px)`);
            assert.ok(result.gapBelow > 0, `the panel touches the bottom edge (gap ${result.gapBelow}px)`);
        });
    }

    test('there is real breathing room above it, not a hairline', async () => {
        const { result } = await screen({
            entry, api, width: 1000, height: 620, styles: true, script: `${MEASURE} return result;` });
        assert.ok(result.gapAbove >= 20, `only ${result.gapAbove}px of overlay above the panel`);
    });
});
