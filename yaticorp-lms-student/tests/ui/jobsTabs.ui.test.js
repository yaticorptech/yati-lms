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
const apiFor = (band) => apiModule({
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
    '/user/resume': { resume: null }
});

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

    test('the guardian notice belongs to Part-Time Jobs and stays there', async () => {
        const { result } = await screen({
            entry, api: apiFor('teen'), styles: true, budget: 25_000, script: `
                await sleep(1600);
                const board = text(document.body);
                const partTimeTab = $$('button').find((b) => /Part-Time/.test(b.innerText));
                partTimeTab.click(); await sleep(1200);
                return { board, partTime: text(document.body) };` });
        assert.match(result.partTime, /A parent or guardian has to agree first/,
            'the part-time tab explains the permission');
        assert.equal(/A parent or guardian has to agree first/.test(result.board), false,
            'and the rest of the section does not repeat it');
        assert.equal(/not age-checked/.test(result.board), false,
            'no age notice on the other tabs either');
    });
});
