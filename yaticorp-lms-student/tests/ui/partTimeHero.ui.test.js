/** The part-time section's banner, taken in a real browser. */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutChrome } from './harness.js';
import { apiModule } from './fixtures.js';

const api = apiModule({ '/opportunities': { total: 0, items: [], window: { from: '2026-09-14', to: '2026-09-30' } } });

/** The tab, for a student in one age band, with or without a saved profile. */
const entry = (band, hasProfile = true) => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import OpportunitiesTab from '${srcFile('opportunities/OpportunitiesTab.jsx')}';
// Without a profile the tab also opens its details form, which reads the
// vocabulary the API sends; the banner behind it is what these tests look at.
const data = {
  band: '${band}',
  profile: ${hasProfile ? "{ dateOfBirth: '2002-04-01', wantFrom: '2026-09-14', wantTo: '2026-09-30', interests: ['events'] }" : 'null'},
  vocab: { interests: [{ id: 'events', label: 'Events', icon: 'star' }], categories: [], types: [] },
  rules: {}, guardian: null
};
createRoot(document.getElementById('root')).render(
  <MemoryRouter>
    <OpportunitiesTab data={data} onData={() => {}} careerPathEnabled location="Bengaluru" onLocation={() => {}} />
  </MemoryRouter>);`;

const banner = `
    await sleep(800);
    const h1 = $$('h1')[0];
    return {
        eyebrow: text($$('p').find((p) => /[A-Z]{4}/.test(p.innerText) && p.innerText === p.innerText.toUpperCase()) || $$('p')[0]),
        heading: text(h1),
        accent: text(h1.querySelector('span span')),
        subtitle: text($$('h1')[0].nextElementSibling),
        errors: window.__errors
    };`;

describe('the part-time banner', { skip: skipWithoutChrome }, () => {
    test('leads with the promise, and picks out what the section is for', async () => {
        const { result, errors } = await screen({ entry: entry('adult'), api, script: banner });
        assert.deepEqual(errors, []);
        assert.equal(result.eyebrow, 'Flexible work. Brighter tomorrows.');
        assert.equal(result.heading, 'Find the right part-time job for you');
        assert.equal(result.accent, 'part-time job', 'the middle of the heading is the coloured half');
        assert.equal(result.subtitle, 'Gain experience, earn extra income and build your skills.');
    });

    test('a teenager is told a guardian is involved, in the same shape', async () => {
        const { result } = await screen({ entry: entry('teen'), api, script: banner });
        assert.equal(result.heading, 'Find the right part-time job for you');
        assert.match(result.subtitle, /guardian in the loop/);
    });

    test('a student too young for local work is pointed at skills instead', async () => {
        const { result } = await screen({ entry: entry('explore'), api, script: banner });
        assert.equal(result.eyebrow, 'Explore now. Work later.');
        assert.match(result.heading, /Build the skills/);
        assert.equal(result.accent, 'your future');
        assert.equal(/part-time job/.test(result.heading), false, 'it does not offer what they cannot have');
    });

    test('before a profile is saved it says what to do first', async () => {
        const { result } = await screen({
            entry: entry('adult', false), api, script: `
                await sleep(800);
                return { status: text($$('p').find((p) => /get started|jobs on/.test(p.innerText))) };` });
        assert.match(result.status, /Tell us your dates and interests to get started/);
    });

    test('the picture is decoration and is hidden from screen readers', async () => {
        const { result } = await screen({
            entry: entry('adult'), api, script: `
                await sleep(800);
                const svg = $$('svg').find((s) => s.getAttribute('viewBox') === '0 0 280 190');
                return { present: !!svg, hidden: !!svg && !!svg.closest('[aria-hidden="true"]') };` });
        assert.ok(result.present, 'the banner carries its picture');
        assert.ok(result.hidden, 'and it is marked as decoration');
    });
});
