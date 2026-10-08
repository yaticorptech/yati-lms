/**
 * Which parts of the Jobs section a student can reach.
 *
 * Every tab is open to every age now. An under-18 still lands on Part-Time
 * Jobs, because that is the part written for them, but the rest is there to be
 * opened — with a notice saying the scraped listings are not age-checked.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles } from './harness.js';
import { apiModule } from './fixtures.js';

const EMPTY_BOARD = { total: 0, results: [], page: 1 };

/** The Jobs page for a student whose opportunity profile puts them in `band`. */
const apiFor = (band, extra = {}, postSource = '') => apiModule({
    '/jobs/opportunities/profile': {
        band,
        profile: { dateOfBirth: '2012-02-13', wantFrom: '2026-09-11', wantTo: '2026-10-01', interests: [] },
        vocab: { categories: [], types: [], interests: [] },
        rules: { band, guardianApproval: band !== 'adult', verifiedOnly: true, exposeContact: false },
        guardian: { status: 'none' }
    },
    '/jobs/opportunities': { total: 0, results: [], categories: [], window: {}, web: { allowed: false, count: 0, searchLinks: [] } },
    '/jobs/saved': { saved: [] },
    '/jobs/meta': { roles: [], skills: [], popular: [] },
    '/jobs': EMPTY_BOARD,
    '/user/resume': { resume: null },
    ...extra
}, postSource);

const entry = `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '${srcFile('context/AuthContext.jsx')}';
import Jobs from '${srcFile('pages/Jobs.jsx')}';
createRoot(document.getElementById('root')).render(
  <AuthContext.Provider value={{ user: { name: 'Sowndarya' }, isCareerPathEnabled: true, isJobsEnabled: true, isCreditSystemEnabled: true, isRewardsEnabled: true }}>
    <MemoryRouter><Jobs /></MemoryRouter>
  </AuthContext.Provider>);`;

/** The tab strip, as labels. */
const READ_TABS = `
    const tabs = $$('button').map((b) => b.innerText.replace(/\\s+/g, ' ').trim())
        .filter((t) => /^(Jobs|Career Match|Hidden Opportunities|Part-Time Jobs|Saved Jobs)\\b/.test(t))
        .map((t) => t.split(' ').slice(0, 3).join(' '));`;

describe('the Jobs section tabs', { skip: skipWithoutStyles }, () => {
    for (const band of ['explore', 'teen', 'adult']) {
        test(`every tab is offered to a student in the ${band} band`, async () => {
            const { result, errors } = await screen({
                entry, api: apiFor(band), styles: true, budget: 25_000, script: `
                    await sleep(1600);
                    ${READ_TABS}
                    return { tabs, body: text(document.body).slice(0, 200) };` });
            assert.deepEqual(errors, []);
            for (const label of ['Jobs', 'Career Match', 'Hidden Opportunities', 'Part-Time Jobs', 'Saved Jobs']) {
                assert.ok(result.tabs.some((t) => t.startsWith(label)), `${label} should be offered, saw ${JSON.stringify(result.tabs)}`);
            }
        });
    }

    test('every student opens the section on Jobs, nobody is sent elsewhere', async () => {
        // An under-18 used to be redirected straight to Part-Time Jobs, which
        // made the other four tabs look like they were not there.
        const { result } = await screen({
            entry, api: apiFor('teen'), styles: true, budget: 25_000, script: `
                await sleep(1600);
                return { body: text(document.body), url: location.search };` });
        assert.equal(/Flexible work\. Brighter tomorrows\./i.test(result.body), false,
            'the part-time banner is not what opens');
        assert.equal(/tab=opportunities/.test(result.url), false,
            'and nothing rewrote the address on their behalf');
    });

    test('going to Part-Time Jobs while a search is still loading stays on Part-Time Jobs', async () => {
        // The page runs a first search for Jobs by itself. A student who went
        // to Part-Time Jobs before it answered was pulled back to Jobs when
        // the results arrived (2026-10-02). The search here takes 1.5s.
        const api = apiFor('teen', {
            '/career/goals': { careerGoal: 'Frontend Developer' },
            '/career/skills': [{ skillName: 'React', progress: 40 }]
        }, `(url) => /recommend/.test(url)
            ? new Promise((done) => setTimeout(() => done({ results: [], poolSize: 0, total: 0, roleRecognized: true,
                query: { skills: ['React'], role: 'Frontend Developer', roleText: 'Frontend Developer' } }), 1500))
            : ({})`);
        const { result, errors } = await screen({
            entry, api, styles: true, budget: 25_000, script: `
                await sleep(700);
                const searching = window.__calls.some((c) => c[0] === 'POST' && /recommend/.test(c[1]));
                $$('button').find((b) => /Part-Time/.test(b.innerText)).click();
                await sleep(2200);
                const on = $('[role="tab"][aria-selected="true"]');
                return { searching, on: on ? on.innerText.replace(/\\s+/g, ' ') : '',
                         partTime: !!$('[data-guardian-info]') };` });
        assert.deepEqual(errors, []);
        assert.equal(result.searching, true, 'the first search was still loading when Part-Time was chosen');
        assert.match(result.on, /Part-Time/, `the selected tab after the search landed was "${result.on}"`);
        assert.equal(result.partTime, true, 'and the part-time board is what is showing');
    });

    test('a student of 18 or over is still told that under-18s need a guardian to agree', async () => {
        // The green popup for an adult used to say nothing about it, and read
        // as though the rule had been taken away (2026-10-02).
        const { result, errors } = await screen({
            entry, api: apiFor('adult'), styles: true, budget: 25_000, script: `
                await sleep(1600);
                $$('button').find((b) => /Part-Time/.test(b.innerText)).click(); await sleep(1200);
                $('[data-guardian-info]').click(); await sleep(400);
                const dialog = $('[role="dialog"][aria-labelledby="guardian-info-title"]');
                return { popup: dialog ? text(dialog) : '' };` });
        assert.deepEqual(errors, []);
        assert.match(result.popup, /Staying safe on the board/);
        assert.match(result.popup, /Students under 18 need a parent or guardian to agree/, 'said up front');
        assert.match(result.popup, /For students under 18: a parent or guardian has to agree/, 'and in the safety notes');
        assert.match(result.popup, /You are 18 or over, so you can apply straight away/);
    });

    test('the guardian notice belongs to Part-Time Jobs and stays there', async () => {
        // A small shield in the part-time board's top row; the words are in
        // the popup behind it (2026-10-02), not a full-width notice.
        const { result } = await screen({
            entry, api: apiFor('teen'), styles: true, budget: 25_000, script: `
                await sleep(1600);
                const board = text(document.body);
                const shieldOnBoard = !!$('[data-guardian-info]');
                const partTimeTab = $$('button').find((b) => /Part-Time/.test(b.innerText));
                partTimeTab.click(); await sleep(1200);
                const before = text(document.body);
                const shield = $('[data-guardian-info]');
                if (shield) shield.click();
                await sleep(400);
                const dialog = $('[role="dialog"][aria-labelledby="guardian-info-title"]');
                return { board, shieldOnBoard, before, shield: !!shield, popup: dialog ? text(dialog) : '' };` });
        assert.equal(result.shield, true, 'the part-time tab has the shield');
        assert.equal(/parent or guardian has to agree first/i.test(result.before), false,
            'and no full-width notice on the board itself');
        assert.match(result.popup, /You're under 18 — a parent or guardian has to agree first/,
            'the shield opens the explanation of the permission, saying it is for under-18s');
        assert.match(result.popup, /For students under 18:/, 'and so does the safety note about it');
        assert.match(result.popup, /Safety information & privacy notice/i, 'with the safety notes (drawn in capitals)');
        assert.equal(result.shieldOnBoard, false, 'the other tabs have no shield');
        assert.equal(/parent or guardian has to agree first/i.test(result.board), false,
            'and the rest of the section does not repeat it');
        assert.equal(/not age-checked/.test(result.board), false,
            'no age notice on the other tabs either');
    });
});
