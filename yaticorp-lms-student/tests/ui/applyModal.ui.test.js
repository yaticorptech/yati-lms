/**
 * The job application popup, at viewports it does not fit.
 *
 * This one grows with its content — the guardian card, the tracker, the job
 * details — so on a short screen it is taller than the window. A flex item
 * centred inside a scroll container overflows equally top and bottom, and the
 * top half can never be scrolled back to; the heading is the first thing lost.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles } from './harness.js';
import { apiModule } from './fixtures.js';

const OPP = {
    id: 'o1', icon: '🎈', title: 'Buntings & stage decoration, school annual day', kind: 'local',
    organization: { name: "St. Joseph's PTA", verified: true },
    matchScore: 88, opportunityType: 'event-support', category: 'decoration',
    startsAt: '2026-09-12T09:00:00.000Z', endsAt: '2026-09-13T13:00:00.000Z', timeLabel: '09:00–13:00',
    location: { area: 'Frazer Town', city: 'Bengaluru' }, hoursPerSession: '2-4',
    minimumAge: 14, maximumAge: null, slots: 4, compensation: { label: '₹400/day · snacks' },
    description: 'Cut, string and hang buntings and help dress the stage for the annual day.',
    signals: { interests: ['decoration'], date: 'in-window' }, matchReasons: ['interests'],
    guardianApprovalRequired: true, preference: null, verified: true, onYourDates: true,
    safetyClassification: 'youth-safe', safetyNotes: 'Teachers supervise throughout.'
};
const APPLICATION = {
    id: 'a1', opportunityId: 'o1', status: 'needs-guardian',
    student: { name: 'Sowndarya', age: 14 },
    job: {
        title: OPP.title, company: "St. Joseph's PTA", hours: '4 hrs/day',
        duration: '12 Sept 2026 – 13 Sept 2026', location: 'Frazer Town, Bengaluru',
        pay: '₹400/day · snacks', safety: ['Teachers supervise throughout.']
    },
    guardian: { name: 'Radhika', email: 'ra••••@example.com', phone: '' },
    steps: ['Request sent', 'Guardian review', 'Approval', 'Application continues'].map((label) => ({ label, state: 'waiting' })),
    guardianAge: 15, reminders: 0, declineReason: '', canContinue: false, guardianLink: ''
};
const VOCAB = {
    categories: [{ id: 'decoration', label: 'Decoration & buntings' }],
    types: [{ id: 'event-support', label: 'One-day job' }],
    interests: [{ id: 'decoration', label: 'Decoration', icon: '*' }],
    safety: [{ id: 'youth-safe', label: 'Youth-safe', description: 'Supervised.' }]
};
const api = apiModule({
    '/opportunities/applications': { application: APPLICATION },
    '/opportunities/personal': { interested: [] },
    '/opportunities/o1': { opportunity: OPP, rules: { band: 'teen', guardianApproval: true, exposeContact: false } },
    '/opportunities': { total: 1, results: [OPP], categories: ['decoration'], window: {}, web: { allowed: false, count: 0, searchLinks: [] } }
});

const entry = `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import OpportunitiesTab from '${srcFile('opportunities/OpportunitiesTab.jsx')}';
const data = { band: 'teen',
  profile: { dateOfBirth: '2012-02-13', wantFrom: '2026-09-11', wantTo: '2026-10-01', interests: ['decoration'], guardianName: 'Radhika', guardianEmail: 'radhika@example.com', guardianPhone: '' },
  vocab: ${JSON.stringify(VOCAB)}, rules: { band: 'teen', guardianApproval: true, exposeContact: false }, guardian: null };
createRoot(document.getElementById('root')).render(
  <MemoryRouter><div className="p-6"><OpportunitiesTab data={data} onData={() => {}} careerPathEnabled location="Bengaluru" onLocation={() => {}} /></div></MemoryRouter>);`;

/** Open a job, press Apply, then measure the popup that appears. */
const MEASURE = `
    await sleep(1300);
    $$('button').find((b) => /View details/i.test(b.innerText)).click();
    await sleep(700);
    $$('button').find((b) => /Apply for part-time job/i.test(b.innerText)).click();
    await sleep(1000);
    const overlay = $('[aria-label="Job application"]');
    const panel = overlay.querySelector('.opp-scroll');
    const heading = overlay.querySelector('h2');
    const top = (el) => Math.round(el.getBoundingClientRect().top);
    // Scroll the panel to the bottom: a pinned heading survives that.
    panel.scrollTop = panel.scrollHeight;
    await sleep(250);
    const result = {
        vh: window.innerHeight,
        headingText: heading.innerText.replace(/\\s+/g, ' ').trim(),
        headingTop: top(heading),
        headingWhole: heading.getBoundingClientRect().top >= 0,
        // The popup fits the page: the overlay behind it never has to scroll.
        overlayScrolls: overlay.scrollHeight > overlay.clientHeight + 1,
        panelScrolls: panel.scrollHeight > panel.clientHeight + 1,
        headingStillUp: heading.getBoundingClientRect().top >= 0
    };`;

describe('the job application popup', { skip: skipWithoutStyles }, () => {
    for (const [w, h] of [[1400, 900], [1200, 700], [1000, 620], [760, 560]]) {
        test(`its heading is on screen at ${w} by ${h}`, async () => {
            const { result, errors } = await screen({
                entry, api, width: w, height: h, styles: true, budget: 25_000,
                script: `${MEASURE} return result;` });
            assert.deepEqual(errors, []);
            assert.equal(result.headingText, 'Guardian approval required');
            assert.ok(result.headingWhole, `the heading starts ${result.headingTop}px above the top of a ${result.vh}px screen`);
            assert.ok(result.headingTop > 0, 'and not flush against the edge');
            assert.equal(result.overlayScrolls, false, 'the popup fits the page rather than making the page scroll');
        });
    }

    test('a popup taller than the screen scrolls inside itself, keeping its heading', async () => {
        const { result } = await screen({
            entry, api, width: 1000, height: 620, styles: true, budget: 25_000,
            script: `${MEASURE} return result;` });
        assert.ok(result.panelScrolls, 'this viewport really is too short for the popup');
        assert.equal(result.overlayScrolls, false, 'so the popup scrolls, not the page behind it');
        assert.ok(result.headingStillUp, 'and the heading is still there once you have scrolled to the bottom');
    });
});
