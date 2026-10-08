/**
 * For the demo cards only, the Jobs section's skills come from the student:
 * their Career Path skills and their uploaded resume. Everyone else is as
 * before.
 *
 *   - interleaveSkills takes from each source in turn, so a long resume
 *     cannot push Career Path out of the list (it used to: 2 of 17 got in)
 *   - the Career Path "Jobs for you" tile searches on both for a demo card,
 *     and on Career Path's goal and skills, as before, for anyone else
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutChrome } from './harness.js';
import { apiModule } from './fixtures.js';

describe('where the Jobs section gets its skills', { skip: skipWithoutChrome }, () => {
    test('each source gets its turn: twenty resume skills do not crowd out Career Path', async () => {
        const entry = `
import { interleaveSkills } from '${srcFile('jobs/api.js')}';
const resume = Array.from({ length: 20 }, (_, i) => 'Resume ' + (i + 1));
window.__run = () => ({
  mixed: interleaveSkills([resume, ['HTML', 'CSS', 'React', 'Next.js', 'SQL'], ['Excel']], 12),
  dupes: interleaveSkills([['React', 'Python'], ['react', 'HTML'], []]),
  all: interleaveSkills([resume, ['HTML', 'CSS', 'React', 'Next.js', 'SQL'], ['Excel']]).length
});`;
        const { result, errors } = await screen({ entry, api: 'export default {};', script: 'return window.__run();' });
        assert.deepEqual(errors, []);
        for (const s of ['HTML', 'CSS', 'React', 'Next.js', 'SQL', 'Excel']) assert.ok(result.mixed.includes(s), `${s} made it into the first 12`);
        assert.equal(result.mixed.length, 12);
        assert.deepEqual(result.dupes, ['React', 'HTML', 'Python'], 'taking turns, and the same skill twice counts once');
        assert.equal(result.all, 26, 'with room, everything fits');
    });

    const tile = `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '${srcFile('context/AuthContext.jsx')}';
import JobMatchesTile from '${srcFile('career/components/dashboard/JobMatchesTile.jsx')}';
createRoot(document.getElementById('root')).render(
  <AuthContext.Provider value={{ isJobsEnabled: true }}><MemoryRouter><div id="tile"><JobMatchesTile /></div></MemoryRouter></AuthContext.Provider>);`;
    const routes = (fullAccess) => apiModule({
        '/user/jobs-access': { open: true, alwaysOpen: false, fullAccess, ready: 5, required: { skills: 5, percent: 25 }, skills: [] },
        '/career/goals': { careerGoal: 'Frontend Developer' },
        '/career/skills': [{ skillName: 'HTML5 / CSS3 / Tailwind CSS', progress: 40 }],
        // The server's merged list: Career Path opened out, plus the resume.
        '/user/resume/ats/data': { skills: [
            { name: 'HTML', sources: ['career'] }, { name: 'CSS', sources: ['career'] }, { name: 'Tailwind CSS', sources: ['career'] },
            { name: 'Figma', sources: ['resume'] }, { name: 'Python', sources: ['resume'] }
        ], stats: { courses: 0 } },
        '/jobs/recommend': { results: [{ id: 'j1', title: 'Junior Frontend Developer', company: 'Acme', location: 'Bengaluru', url: 'https://example.com', match: { total: 70 } }] }
    });
    const sent = `
        await sleep(1400);
        const posts = window.__calls.filter((c) => c[0] === 'POST' && c[1].includes('/jobs/recommend'));
        const last = posts.at(-1);
        return { skills: last && last[2].skills, role: last && last[2].role, text: text($('#tile')) };`;

    test('a demo card: the Career Path tile searches on Career Path and resume skills together', async () => {
        const { result, errors } = await screen({ entry: tile, api: routes(true), styles: true, script: sent });
        assert.deepEqual(errors, []);
        assert.equal(result.role, 'Frontend Developer');
        assert.deepEqual([...result.skills].sort(), ['CSS', 'Figma', 'HTML', 'Python', 'Tailwind CSS'], 'Career Path opened out, and the resume');
        assert.ok(!result.skills.includes('HTML5 / CSS3 / Tailwind CSS'), 'not the raw syllabus name');
        assert.match(result.text, /Junior Frontend Developer/);
    });

    test('anyone else: the tile searches on Career Path\'s goal and skills, as before', async () => {
        const { result, errors } = await screen({ entry: tile, api: routes(false), styles: true, script: sent });
        assert.deepEqual(errors, []);
        assert.equal(result.role, 'Frontend Developer');
        assert.deepEqual(result.skills, ['HTML5 / CSS3 / Tailwind CSS'], 'no resume skills mixed in');
    });
});
