/**
 * A popup and the app's own fixed chrome.
 *
 * A phone screen has a 4rem header pinned to the top and a floating nav over
 * the last 4rem at the bottom. A dialog that runs to either edge puts its own
 * content underneath them — the heading and its icon behind the header, the
 * buttons behind the nav. Everything is still in the document and still passes
 * a "nothing is cut off" check; it is simply hidden.
 *
 * z-index is not the answer on its own: it decides painting order, and any
 * ancestor that makes a stacking context takes the popup out of that race.
 * Starting the content clear of both bars cannot be undone that way.
 *
 * Measured in the real student shell, because without it neither bar is on the
 * page and this whole class of bug cannot appear.
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
    hoursPerSession: '2-4', minimumAge: 14, slots: 5, compensation: { label: '₹450/day' },
    description: 'Assemble and ribbon corporate gift hampers at the studio.',
    signals: { interests: ['packing'], date: 'in-window' }, matchReasons: ['interests'],
    guardianApprovalRequired: true, preference: 'interested', verified: true,
    safetyClassification: 'youth-safe', safetyNotes: 'Studio manager in the room.'
};
const VOCAB = {
    categories: [{ id: 'packing', label: 'Packing' }],
    types: [{ id: 'event-support', label: 'One-day job' }], interests: [],
    safety: [{ id: 'youth-safe', label: 'Youth-safe', description: 'Supervised.' }]
};

const api = apiModule({
    '/opportunities': { opportunity: OPP, rules: { band: 'teen', guardianApproval: true, exposeContact: false, verifiedOnly: true } },
    '/user/announcements': [], '/career/notifications': [], '/jobs/notifications': [],
    '/user/profile': { name: 'Bhagyashree' }, '/career/profile/summary': {}
});

/** One dialog, mounted inside the shell so the nav bar is really there. */
const inShell = (imports, element) => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthContext } from '${srcFile('context/AuthContext.jsx')}';
import StudentLayout from '${srcFile('layouts/StudentLayout.jsx')}';
${imports}
const Page = () => ${element};
createRoot(document.getElementById('root')).render(
  <AuthContext.Provider value={{ user: { name: 'Bhagyashree' } }}><MemoryRouter initialEntries={['/jobs']}>
    <Routes><Route path="/" element={<StudentLayout />}><Route path="jobs" element={<Page />} /></Route></Routes>
  </MemoryRouter></AuthContext.Provider>);`;

/** Every control in the dialog whose box overlaps the nav bar's box. */
const CLASH = `
  await sleep(1500);
  const dialog = $('[role="dialog"][aria-modal="true"]');
  if (!dialog) return { noDialog: true };
  const nav = $('.mbn-in');
  if (!nav) return { noNav: true };
  const n = nav.getBoundingClientRect();
  return {
    navTop: Math.round(n.top),
    clash: $$('button, a').filter((b) => dialog.contains(b)).map((b) => {
      const r = b.getBoundingClientRect();
      return (r.height > 0 && r.bottom > n.top && r.top < n.bottom)
        ? \`"\${b.innerText.trim().slice(0, 24)}" at \${Math.round(r.top)}-\${Math.round(r.bottom)}\`
        : null;
    }).filter(Boolean)
  };`;

const CASES = [
    ['the job details sheet', inShell(
        `import OpportunityDetails from '${srcFile('opportunities/OpportunityDetails.jsx')}';`,
        `<OpportunityDetails id="o1" vocab={${JSON.stringify(VOCAB)}} guardian={{ status: 'pending' }}
            onClose={() => {}} onInterested={() => {}} onReport={() => {}} onApply={() => {}} />`)],
    ['the filters drawer', inShell(
        `import FiltersDrawer from '${srcFile('opportunities/FiltersDrawer.jsx')}';`,
        `<FiltersDrawer open vocab={${JSON.stringify(VOCAB)}} rules={{ allowedTypes: ['event-support'], hiddenCategories: [] }}
            filters={{ anyDate: false, category: '', type: '', verifiedOnly: false }} onApply={() => {}} onClose={() => {}} categories={[]} />`)]
];


const APPLICATION = {
    id: 'a1', opportunityId: 'o1', status: 'continued',
    student: { name: 'Sowndarya', age: 14 },
    job: { title: OPP.title, company: 'Bloom Gifting', hours: '4 hrs/day', duration: '18 Sept 2026',
        location: 'Koramangala, Bengaluru', pay: '₹450/day', safety: ['Studio manager in the room.'] },
    guardian: { name: 'Radhika', email: 'ra••••@example.com', phone: '' },
    steps: ['Request sent', 'Parent review', 'Admin approval', 'Approved'].map((label) => ({ label, state: 'done' })),
    guardianAge: 15, declineReason: '', canContinue: true, guardianLink: ''
};
const applyApi = apiModule({
    '/opportunities/applications': { application: APPLICATION },
    '/opportunities/personal': { interested: [] },
    '/opportunities/o1': { opportunity: OPP, rules: { band: 'teen', guardianApproval: true, exposeContact: false } },
    '/opportunities': { total: 1, results: [OPP], categories: ['packing'], window: {}, web: { allowed: false, count: 0, searchLinks: [] } },
    '/user/announcements': [], '/career/notifications': [], '/jobs/notifications': [],
    '/user/profile': { name: 'Bhagyashree' }, '/career/profile/summary': {}
});
const applyEntry = inShell(
    `import OpportunitiesTab from '${srcFile('opportunities/OpportunitiesTab.jsx')}';`,
    `<OpportunitiesTab data={{ band: 'teen',
        profile: { dateOfBirth: '2012-02-13', wantFrom: '2026-09-11', wantTo: '2026-10-01', interests: ['packing'], guardianName: 'Radhika', guardianEmail: 'r@x.com', guardianPhone: '' },
        vocab: ${JSON.stringify(VOCAB)}, rules: { band: 'teen', guardianApproval: true, exposeContact: false }, guardian: null }}
        onData={() => {}} careerPathEnabled location="Bengaluru" onLocation={() => {}} />`);

/** Does anything visible in the dialog start above the header's bottom edge? */
const UNDER_HEADER = `
  await sleep(1500);
  const dialog = $('[role="dialog"][aria-modal="true"]');
  if (!dialog) return { noDialog: true };
  const header = $$('div').find((d) => d.className && String(d.className).includes('md:hidden')
        && String(d.className).includes('fixed') && String(d.className).includes('top-0'));
  if (!header) return { noHeader: true };
  const h = header.getBoundingClientRect();
  const hidden = $$('h1, h2, h3, p, button, span').filter((el) => {
    if (!dialog.contains(el)) return false;
    const r = el.getBoundingClientRect();
    return r.height > 0 && r.width > 0 && r.top < h.bottom && r.bottom > h.top;
  }).map((el) => \`"\${(el.innerText || el.tagName).trim().slice(0, 24)}" top \${Math.round(el.getBoundingClientRect().top)}\`);
  return { headerBottom: Math.round(h.bottom), hidden: hidden.slice(0, 6) };`;

describe("a popup and the app's fixed chrome", { skip: skipWithoutStyles }, () => {
    test('the apply flow starts below the header, icon and all', async () => {
        // This is the one that actually broke: the flow's heading card sat at
        // 12px and its icon at 33px, both behind a header ending at 64px, so
        // the icon appeared sliced in half.
        const OPEN_APPLY = `
            await sleep(1500);
            $$('button').find((b) => /View details/i.test(b.innerText)).click();
            await sleep(800);
            $$('button').find((b) => /Apply for part-time job/i.test(b.innerText)).click();
            await sleep(1200);
            const overlay = $('[aria-label="Job application"]');
            if (!overlay) return { noOverlay: true };
            const header = $$('div').find((d) => d.className && String(d.className).includes('md:hidden')
                && String(d.className).includes('fixed') && String(d.className).includes('top-0'));
            const h = header.getBoundingClientRect();
            const card = overlay.querySelector('section > div');
            const icon = card.querySelector('span');
            return {
                headerBottom: Math.round(h.bottom),
                cardTop: Math.round(card.getBoundingClientRect().top),
                iconTop: Math.round(icon.getBoundingClientRect().top)
            };`;
        const { result, errors } = await screen({
            entry: applyEntry, api: applyApi, width: 500, height: 700, styles: true, budget: 30_000, script: OPEN_APPLY });
        assert.deepEqual(errors, []);
        assert.equal(result.noOverlay, undefined, 'the apply flow opened');
        assert.ok(result.cardTop >= result.headerBottom,
            `the card starts at ${result.cardTop}px, under a header ending at ${result.headerBottom}px`);
        assert.ok(result.iconTop >= result.headerBottom,
            `its icon starts at ${result.iconTop}px, under the same header`);
    });

    for (const [name, entry] of CASES) {
        test(`${name} starts below the header`, async () => {
            const { result, errors } = await screen({
                entry, api, width: 500, height: 700, styles: true, budget: 25_000, script: UNDER_HEADER });
            assert.deepEqual(errors, []);
            assert.equal(result.__error, undefined, `probe threw: ${result.__error}`);
            assert.equal(result.noDialog, undefined, `the dialog opened, got ${JSON.stringify(result)}`);
            assert.equal(result.noHeader, undefined, `and the header is on the page, got ${JSON.stringify(result)}`);
            assert.deepEqual(result.hidden, [],
                `behind a header ending at ${result.headerBottom}px: ${result.hidden?.join(' | ')}`);
        });

        test(`${name} keeps its buttons clear of the bar`, async () => {
            const { result, errors } = await screen({
                entry, api, width: 500, height: 700, styles: true, budget: 25_000, script: CLASH });
            assert.deepEqual(errors, []);
            assert.equal(result.noDialog, undefined, 'the dialog opened');
            assert.equal(result.noNav, undefined, 'and the nav bar is on the page to clash with');
            assert.deepEqual(result.clash, [],
                `under a bar starting at ${result.navTop}px: ${result.clash?.join(' | ')}`);
        });
    }
});
