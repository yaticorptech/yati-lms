/**
 * Career Match and Hidden Opportunities.
 *
 * The tab works out roles from everything the student can show for, and a
 * resume is only one of those sources: a finished course counts too. So the
 * tabs have to stand up when there is no resume stored at all. profile is
 * null in that state, and reading a field off it threw during render: React
 * unmounted the tree and the whole Jobs page went white, tab strip and all.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutChrome } from './harness.js';

/** @param {object} o.atsSkills rows as /user/resume/ats/data answers them */
const api = ({ atsSkills = [], roles = [], jobs = [] } = {}) => `
export default {
  get: (url) => {
    if (url.includes('/resume/ats/data')) return Promise.resolve({ data: { skills: ${JSON.stringify(atsSkills)}, stats: { courses: 2 } } });
    if (url.includes('/jobs/roles')) return Promise.resolve({ data: { roles: ${JSON.stringify(roles)} } });
    return Promise.resolve({ data: {} });
  },
  post: () => Promise.resolve({ data: { results: ${JSON.stringify(jobs)} } })
};`;

const FROM_COURSES = [
    { name: 'Kotlin', sources: ['course'] },
    { name: 'Android SDK', sources: ['course'] }
];

const ROLES = [{ name: 'Mobile App Developer', core: ['Kotlin', 'Android SDK'], preferred: ['Java'] }];

const entry = (profile) => `
import { createRoot } from 'react-dom/client';
import HiddenOpportunitiesTab from '${srcFile('jobs/HiddenOpportunitiesTab.jsx')}';
createRoot(document.getElementById('root')).render(
  <HiddenOpportunitiesTab profile={${profile}} onSwitchTab={() => {}} location="Mangaluru, India" />);`;

const matchEntry = (profile) => `
import { createRoot } from 'react-dom/client';
import CareerMatchTab from '${srcFile('jobs/CareerMatchTab.jsx')}';
createRoot(document.getElementById('root')).render(
  <CareerMatchTab profile={${profile}} onProfile={() => {}} onSwitchTab={() => {}} location="Mangaluru, India" />);`;

const JOB = { id: 'j1', title: 'Android Developer', company: 'Appco', location: 'Mangaluru', match: { total: 82 } };

describe('the resume-driven job tabs', { skip: skipWithoutChrome }, () => {
    test('opens for a student whose skills came from courses, not a resume', async () => {
        // profile === null means "asked, nothing stored" — the state the page
        // was blanking on.
        const { result, errors } = await screen({
            entry: entry('null'), api: api({ atsSkills: FROM_COURSES, roles: ROLES }), script: `
                await sleep(1200);
                return { body: text(document.body), rootEmpty: !document.getElementById('root').innerHTML };` });
        assert.deepEqual(errors, [], 'nothing may throw during render');
        assert.equal(result.rootEmpty, false, 'the page is not blank');
        assert.match(result.body, /Hidden Opportunities/);
        assert.match(result.body, /Mobile App Developer/, 'the role the course skills open');
        assert.match(result.body, /2 from your courses/, 'and it says where the skills came from');
    });

    test('a student with a resume still sees their qualification', async () => {
        const profile = `{ skills: ['Kotlin'], education: { degree: 'BCA', specialization: 'Computer Applications' },
                           seniority: 'Fresher', experienceYears: 0, pastRoles: [] }`;
        const { result, errors } = await screen({
            entry: entry(profile), api: api({ atsSkills: FROM_COURSES, roles: ROLES }), script: `
                await sleep(1200); return { body: text(document.body) };` });
        assert.deepEqual(errors, []);
        assert.match(result.body, /BCA · Computer Applications/);
    });

    test('with nothing to go on it asks for a resume rather than breaking', async () => {
        const { result, errors } = await screen({
            entry: entry('null'), api: api({ atsSkills: [], roles: ROLES }), script: `
                await sleep(1200); return { body: text(document.body) };` });
        assert.deepEqual(errors, []);
        assert.match(result.body, /Add your resume/);
    });

    test('Career Match opens on course skills alone, and says so', async () => {
        // The same null profile, and the card must not offer a "profile
        // resume" the student has never uploaded.
        const { result, errors } = await screen({
            entry: matchEntry('null'), api: api({ atsSkills: FROM_COURSES, jobs: [JOB] }), script: `
                await sleep(900);
                return { body: text(document.body), rootEmpty: !document.getElementById('root').innerHTML };` });
        assert.deepEqual(errors, [], 'nothing may throw during render');
        assert.equal(result.rootEmpty, false, 'the page is not blank');
        assert.match(result.body, /Continue with your course skills/);
        assert.match(result.body, /2 skills from your courses/);
        assert.equal(/profile resume/i.test(result.body), false, 'it does not name a resume that is not there');
    });

    test('Career Match runs the whole way through without one', async () => {
        const { result, errors } = await screen({
            entry: matchEntry('null'), api: api({ atsSkills: FROM_COURSES, jobs: [JOB] }), script: `
                await sleep(900);
                click(/course skills/);
                await sleep(1400);
                return { body: text(document.body) };` });
        assert.deepEqual(errors, []);
        assert.match(result.body, /Matching against your course skills/);
        assert.match(result.body, /1 job matches your skills/, 'and it counts them in English');
        assert.match(result.body, /Android Developer/, 'the match itself');
    });

    test('Career Match still names the resume when there is one', async () => {
        const profile = `{ filename: 'bhagyashree-resume.pdf', skills: ['Kotlin'], parsedAt: '2026-09-01' }`;
        const { result, errors } = await screen({
            entry: matchEntry(profile), api: api({ atsSkills: FROM_COURSES, jobs: [JOB] }), script: `
                await sleep(900); return { body: text(document.body) };` });
        assert.deepEqual(errors, []);
        assert.match(result.body, /Continue with profile resume/);
        assert.match(result.body, /bhagyashree-resume\.pdf/);
    });
});
