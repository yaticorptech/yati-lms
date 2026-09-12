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

// The shell asks for its own things on mount; unanswered, it throws before the
// popup is ever opened.
const shellApi = apiModule({
    '/opportunities': { total: 0, results: [], categories: [], window: {}, web: { allowed: false, count: 0, searchLinks: [] } },
    '/user/announcements': [], '/career/notifications': [], '/jobs/notifications': [],
    '/user/profile': { name: 'Bhagyashree' }, '/career/profile/summary': {}
});

// The same tab, but inside the student shell, so the app's own fixed mobile
// header is on the page. Without it a stacking bug simply cannot show up.
const shellEntry = `
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthContext } from '${srcFile('context/AuthContext.jsx')}';
import StudentLayout from '${srcFile('layouts/StudentLayout.jsx')}';
import OpportunitiesTab from '${srcFile('opportunities/OpportunitiesTab.jsx')}';
const data = { band: 'teen',
  profile: { dateOfBirth: '2012-02-13', wantFrom: '2026-09-11', wantTo: '2026-09-11', interests: ['catering'], guardianName: 'Ramya', guardianEmail: 'r@x.com' },
  vocab: { interests: ${JSON.stringify(INTERESTS)}, categories: [], types: [] }, rules: {}, guardian: null };
const Page = () => <OpportunitiesTab data={data} onData={() => {}} careerPathEnabled location="Bengaluru" onLocation={() => {}} />;
createRoot(document.getElementById('root')).render(
  <AuthContext.Provider value={{ user: { name: 'Bhagyashree' } }}>
    <MemoryRouter initialEntries={['/jobs']}>
      <Routes><Route path="/" element={<StudentLayout />}><Route path="jobs" element={<Page />} /></Route></Routes>
    </MemoryRouter>
  </AuthContext.Provider>);`;

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
        scrollable: (() => { const b = card.children[1]; return b.scrollHeight > b.clientHeight; })()
    };`;

describe('the part-time details popup', { skip: skipWithoutStyles }, () => {
    // 500 is the narrowest viewport headless Chrome will honour, and the
    // closest this harness gets to a phone. The popup was only ever measured
    // at 760 and wider, which is why a phone could clip it unnoticed.
    for (const [w, h] of [[1400, 900], [1200, 620], [1000, 560], [760, 560], [500, 900], [500, 620]]) {
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

    test('the way out stays on screen after scrolling down the form', async () => {
        // On a phone this form is several screens long. The close button used
        // to sit at the card's top corner and scroll away with it, leaving a
        // student halfway down with no visible way out.
        const SCROLL = `
            await sleep(1000);
            const open = $$('button').find((b) => /dates|Edit|Change/i.test(b.innerText));
            if (open) open.click();
            await sleep(600);
            const dialog = $('[role="dialog"]');
            const body = dialog.querySelector('form').children[1];
            body.scrollTop = body.scrollHeight;          // all the way to the bottom
            await sleep(400);
            const close = dialog.querySelector('button[aria-label="Close"]');
            const r = close.getBoundingClientRect();
            const onTop = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2));
            return {
                scrolled: body.scrollTop > 100,
                top: Math.round(r.top), bottom: Math.round(r.bottom),
                onScreen: r.top >= 0 && r.bottom <= innerHeight,
                clickable: close === onTop || close.contains(onTop)
            };`;
        const { result } = await screen({
            entry, api, width: 500, height: 620, styles: true, budget: 20_000, script: SCROLL });
        assert.ok(result.scrolled, 'the form really is taller than the screen');
        assert.ok(result.onScreen, `the close button sat at ${result.top}px, off the screen`);
        assert.ok(result.clickable, 'and nothing is painted over it');
    });

    test('the popup outranks the app\'s own header, it does not tie with it', async () => {
        // It sat at z-50, the same layer as the fixed mobile header. Two fixed
        // elements on one layer are ordered by whichever the DOM reaches last,
        // and the header won often enough to lie across the top of the card.
        const STACK = `
            await sleep(1200);
            const open = $$('button').find((b) => /dates|Edit|Change/i.test(b.innerText));
            if (open) open.click();
            await sleep(800);
            const dialog = $('[role="dialog"][aria-modal="true"]');
            const header = $('.md\\\\:hidden.fixed.top-0');
            const topEl = document.elementFromPoint(Math.round(innerWidth / 2), 8);
            return {
                headerZ: header ? Number(getComputedStyle(header).zIndex) : null,
                dialogZ: Number(getComputedStyle(dialog).zIndex),
                topIsDialog: !!(dialog === topEl || dialog.contains(topEl))
            };`;
        const { result, errors } = await screen({
            entry: shellEntry, api: shellApi, width: 500, height: 800, styles: true, budget: 25_000, script: STACK });
        assert.deepEqual(errors, []);
        assert.ok(result.headerZ !== null, 'the app header is on the page to compete with');
        assert.ok(result.dialogZ > result.headerZ,
            `the popup is z-${result.dialogZ}, the header z-${result.headerZ} — it must be above, not level`);
        assert.ok(result.topIsDialog, 'and the very top of the screen belongs to the popup');
    });

    test('a phone gets a full-screen sheet; a wide screen keeps its card', async () => {
        // On a 360px screen the centred card left a cramped column with gutters
        // down both sides and its corners clipped. A phone gets the whole
        // screen instead. The card shape returns from sm up.
        const BOX = `
            await sleep(1200);
            const open = $$('button').find((b) => /dates|Edit|Change/i.test(b.innerText));
            if (open) open.click();
            await sleep(800);
            const dialog = $('[role="dialog"][aria-modal="true"]');
            const card = dialog.querySelector('form');
            const close = dialog.querySelector('button[aria-label="Close"]');
            const r = card.getBoundingClientRect(), c = close.getBoundingClientRect();
            return {
                left: Math.round(r.left), right: Math.round(innerWidth - r.right), top: Math.round(r.top),
                closeVisible: c.top >= 0 && c.bottom <= innerHeight,
                sideways: document.documentElement.scrollWidth > innerWidth
            };`;

        const phone = (await screen({ entry: shellEntry, api: shellApi, width: 500, height: 800, styles: true, budget: 25_000, script: BOX })).result;
        assert.equal(phone.left, 0, `the sheet should reach the left edge, sat at ${phone.left}px`);
        assert.equal(phone.right, 0, `and the right edge, ${phone.right}px short`);
        // Not 0: the app's own 4rem header owns the top of a phone screen, and
        // the sheet starts under it rather than behind it.
        assert.ok(phone.top >= 64, `the sheet starts at ${phone.top}px, behind the app header`);
        assert.ok(phone.closeVisible, 'with the close button on screen');
        assert.equal(phone.sideways, false, 'and nothing pushed the page sideways');

        const desk = (await screen({ entry: shellEntry, api: shellApi, width: 1200, height: 900, styles: true, budget: 25_000, script: BOX })).result;
        assert.ok(desk.left > 16 && desk.left === desk.right,
            `a wide screen keeps an even-gutter card, saw ${desk.left}px and ${desk.right}px`);
        assert.ok(desk.top > 0, 'floating, not flush to the top');
    });

    test('the Save button clears the floating bottom nav', async () => {
        // The nav floats over the last 4rem of every phone screen. A sheet that
        // runs the full height puts its actions underneath it, and Save ended up
        // 25px behind the bar — there, but not pressable.
        const BOTTOM = `
            await sleep(1200);
            const open = $$('button').find((b) => /dates|Edit|Change/i.test(b.innerText));
            if (open) open.click();
            await sleep(800);
            const dialog = $('[role="dialog"][aria-modal="true"]');
            const body = dialog.querySelector('form').children[1];
            body.scrollTop = body.scrollHeight; await sleep(400);
            const nav = $('.mbn-in');
            const save = $$('button').find((b) => /save/i.test(b.innerText) && dialog.contains(b));
            const s = save.getBoundingClientRect(), n = nav.getBoundingClientRect();
            return { saveBottom: Math.round(s.bottom), navTop: Math.round(n.top),
                     covered: s.bottom > n.top };`;
        const { result } = await screen({
            entry: shellEntry, api: shellApi, width: 500, height: 700, styles: true, budget: 25_000, script: BOTTOM });
        assert.equal(result.covered, false,
            `Save ends at ${result.saveBottom}px, under a bar that starts at ${result.navTop}px`);
    });

    for (const [w, h, floor] of [[1400, 800, 0], [1000, 700, 0], [500, 700, 64]]) {
        test(`the pinned heading keeps its own padding at ${w} by ${h}`, async () => {
            // It pinned at a negative offset — -24px on a wide screen, -16px on
            // a phone — so its top padding scrolled off and the eyebrow ended up
            // at y=3. On a phone that is behind the app's 4rem header entirely.
            const PIN = `
                await sleep(1200);
                const open = $$('button').find((b) => /dates|Edit|Change/i.test(b.innerText));
                if (open) open.click();
                await sleep(800);
                const dialog = $('[role="dialog"][aria-modal="true"]');
                const head = dialog.querySelector('form').firstElementChild;
                const eyebrow = head.querySelector('p');
                const body = dialog.querySelector('form').children[1];
                body.scrollTop = 700; await sleep(350);
                return { headTop: Math.round(head.getBoundingClientRect().top),
                         eyebrowTop: Math.round(eyebrow.getBoundingClientRect().top) };`;
            const { result, errors } = await screen({
                entry: shellEntry, api: shellApi, width: w, height: h, styles: true, budget: 25_000, script: PIN });
            assert.deepEqual(errors, []);
            assert.ok(result.headTop >= floor,
                `the heading pinned at ${result.headTop}px, above its floor of ${floor}px`);
            assert.ok(result.eyebrowTop >= floor + 16,
                `the eyebrow sat at ${result.eyebrowTop}px, with no room above it`);
        });
    }

    // 2132x790 is the shape a zoomed-in desktop browser reports: very wide and
    // short. It is where the old layout failed worst — the card was 933px tall
    // in a 703px window, so the popup itself scrolled and carried its heading
    // off the top.
    for (const [w, h] of [[2132, 790], [1400, 900], [1000, 560], [500, 700]]) {
        test(`the card fits the window at ${w} by ${h}, and only its body scrolls`, async () => {
            const BANDS = `
                await sleep(1200);
                const open = $$('button').find((b) => /dates|Edit|Change/i.test(b.innerText));
                if (open) open.click();
                await sleep(900);
                const dialog = $('[role="dialog"][aria-modal="true"]');
                const card = dialog.querySelector('form');
                const body = card.children[1];
                const eyebrow = card.children[0].querySelector('p');
                const save = $$('button').find((b) => /Save|Show my jobs/i.test(b.innerText));
                body.scrollTop = body.scrollHeight; await sleep(300);
                return {
                    cardHeight: Math.round(card.getBoundingClientRect().height),
                    cardFits: card.getBoundingClientRect().height <= innerHeight + 1,
                    dialogScrolls: dialog.scrollHeight > dialog.clientHeight + 1,
                    bodyScrolled: body.scrollTop,
                    eyebrowTop: Math.round(eyebrow.getBoundingClientRect().top),
                    saveBottom: Math.round(save.getBoundingClientRect().bottom),
                    vh: innerHeight
                };`;
            const { result, errors } = await screen({
                entry: shellEntry, api: shellApi, width: w, height: h, styles: true, budget: 25_000, script: BANDS });
            assert.deepEqual(errors, []);
            assert.ok(result.cardFits, `the card is ${result.cardHeight}px in a ${result.vh}px window`);
            assert.equal(result.dialogScrolls, false, 'the popup itself must not scroll — only its body');
            assert.ok(result.bodyScrolled > 50, 'and the body really does scroll');
            assert.ok(result.eyebrowTop >= 0, `the heading sat at ${result.eyebrowTop}px after scrolling`);
            assert.ok(result.saveBottom <= result.vh, `Save ended at ${result.saveBottom}px in a ${result.vh}px window`);
        });
    }

    test('the close button sits inside the card, not hanging off its corner', async () => {
        const { result } = await screen({
            entry, api, width: 1200, height: 900, styles: true, budget: 20_000,
            script: `${MEASURE} return result;` });
        assert.ok(result.insideCard,
            `close at top ${result.closeTop} right ${result.closeRight}, card at top ${result.cardTop} right ${result.cardRight}`);
    });

    test('a form taller than the screen scrolls inside the card, not the card itself', async () => {
        const { result } = await screen({
            entry, api, width: 1000, height: 560, styles: true, budget: 20_000,
            script: `${MEASURE} return result;` });
        assert.ok(result.scrollable, 'this viewport really is too short for the form');
        assert.equal(result.aboveViewport, false);
        assert.ok(result.cardTop >= 0, 'and the top of it is still reachable');
    });
});
