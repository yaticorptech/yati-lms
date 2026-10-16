/**
 * A job alert opened from the bell while the student is already on Jobs.
 *
 * The page read its address once, on arrival. The bell's alert changes the
 * address (the exact search the alert is about) without leaving the page, so
 * the URL changed and nothing else: the old results stayed under the new
 * link. Now a new address from outside — a push, or back/forward — re-reads
 * the form and searches again, while the page's own rewrites of its address
 * (it keeps the URL in step with every search) are left alone.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutChrome } from './harness.js';
import { apiModule } from './fixtures.js';

const api = apiModule({
    '/jobs/recommend': { results: [], total: 0, poolSize: 0, query: {} },
    '/jobs/opportunities/profile': { band: 'adult', profile: {}, vocab: { categories: [], types: [], interests: [] }, rules: { band: 'adult' }, guardian: { status: 'none' } },
    '/jobs/saved': { saved: [] },
    '/jobs/roles/skills': { all: [], popular: [] },
    '/jobs/roles': { roles: [] },
    '/jobs/resume': { profile: null },
    '/user/jobs-access': { fullAccess: false },
    '/user/resume': { resume: null }
});

const entry = `
import { createRoot } from 'react-dom/client';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { AuthContext } from '${srcFile('context/AuthContext.jsx')}';
import Jobs from '${srcFile('pages/Jobs.jsx')}';
function Nav() { window.__nav = useNavigate(); return null; }
createRoot(document.getElementById('root')).render(
  <AuthContext.Provider value={{ user: { _id: 'u1', name: 'Sowndarya' }, isCareerPathEnabled: true, isJobsEnabled: true }}>
    <MemoryRouter initialEntries={['/jobs?skills=React&role=Developer&loc=Mangaluru']}><Nav /><Jobs /></MemoryRouter>
  </AuthContext.Provider>);`;

const SEARCHES = `window.__calls.filter((c) => c[0] === 'POST' && c[1] === '/jobs/recommend').map((c) => ({ skills: c[2].skills, role: c[2].role, location: c[2].location }))`;

describe('a job alert opened on the Jobs page', { skip: skipWithoutChrome }, () => {
    test('searches again for what the alert names, and only once', async () => {
        const { result, errors } = await screen({
            entry, api, budget: 20_000, script: `
                await sleep(1500);
                const first = ${SEARCHES};
                window.__nav('/jobs?skills=Python,SQL&role=Data%20Analyst&loc=Bengaluru'); await sleep(1500);
                return { first, all: ${SEARCHES} };` });
        assert.deepEqual(errors, []);
        assert.deepEqual(result.first, [{ skills: ['React'], role: 'Developer', location: 'Mangaluru' }], 'the arrival search');
        assert.equal(result.all.length, 2, `one search for the alert, none for the page's own address rewrites: ${JSON.stringify(result.all)}`);
        assert.deepEqual(result.all[1], { skills: ['Python', 'SQL'], role: 'Data Analyst', location: 'Bengaluru' });
    });
});
