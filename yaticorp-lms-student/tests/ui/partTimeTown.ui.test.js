/**
 * The town on the part-time board.
 *
 * The board's own town — the one saved on the part-time profile — with the
 * Jobs tab's Location box standing in until the student has set one. Changing
 * it here never changes the Jobs tab's box. It is shown whole in a pill by the
 * search box and is not typed into there. It used to be a second, typed box,
 * cut by its own width to "Shivamogga," — a comma and nothing after it. The
 * nearby-vacancies search uses the same town.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles } from './harness.js';
import { apiModule } from './fixtures.js';

const api = apiModule({
    '/opportunities': { total: 0, results: [], categories: [], window: {}, web: { allowed: false, count: 0, searchLinks: [] } },
    '/opportunities/profile': { profile: { location: 'Udupi' }, band: 'teen', rules: {}, guardian: null }
});

const entry = (profileTown, jobsTown = 'Bengaluru') => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import OpportunitiesTab from '${srcFile('opportunities/OpportunitiesTab.jsx')}';
const data = { band: 'teen',
  profile: { dateOfBirth: '2012-02-13', wantFrom: '2027-01-11', wantTo: '2027-01-11', interests: ['catering'], guardianName: 'Radhika', guardianEmail: 'radhika@example.com', location: ${JSON.stringify(profileTown)} },
  vocab: { interests: [{ id: 'catering', label: 'Catering', icon: '*' }], categories: [], types: [] }, rules: {}, guardian: null };
window.__jobsTownChanged = 0;
createRoot(document.getElementById('root')).render(
  <MemoryRouter><OpportunitiesTab data={data} onData={() => {}} careerPathEnabled location={${JSON.stringify(jobsTown)}} onLocation={() => { window.__jobsTownChanged += 1; }} /></MemoryRouter>);`;

const LOOK = `
    await sleep(900);
    const pill = $('[data-town]');
    const askedFor = window.__calls.filter((c) => /\\/opportunities\\/?$/.test(c[1])).map((c) => c[2] && c[2].location);
    return {
        pill: pill ? pill.innerText.replace(/\\s+/g, ' ').trim() : null,
        whole: pill ? pill.querySelector('.truncate').scrollWidth <= pill.querySelector('.truncate').clientWidth + 1 : null,
        typedBox: !!$$('input').find((i) => /town/i.test(i.getAttribute('aria-label') || i.placeholder || '')),
        askedFor
    };`;

describe('the town on the part-time board', { skip: skipWithoutStyles }, () => {
    test('shows the board\'s own town — the part-time profile\'s — whole, and searches near it', async () => {
        const { result, errors } = await screen({ entry: entry('Shivamogga, Karnataka', 'Mangalore, India'), api, styles: true, width: 1280, script: LOOK });
        assert.deepEqual(errors, []);
        assert.equal(result.pill, 'Your town: Shivamogga, Karnataka', 'the part-time town, not the Jobs box');
        assert.equal(result.whole, true, 'not cut off at a fixed width — no dangling comma');
        assert.equal(result.typedBox, false, 'and it is not a box to type in');
        assert.ok(result.askedFor.length > 0, 'the board was asked for');
        assert.ok(result.askedFor.every((l) => l === 'Shivamogga, Karnataka'), `vacancies are looked for near it, asked: ${result.askedFor}`);
    });

    test('until the student sets a part-time town, the Jobs Location box stands in', async () => {
        const { result, errors } = await screen({ entry: entry('', 'Mangalore, India'), api, styles: true, width: 1280, script: LOOK });
        assert.deepEqual(errors, []);
        assert.equal(result.pill, 'Your town: Mangalore, India');
        assert.ok(result.askedFor.length > 0, 'the board was asked for');
        assert.ok(result.askedFor.every((l) => l === 'Mangalore, India'), `and searched near, asked: ${result.askedFor}`);
    });

    test('saving a part-time town changes this board only, never the Jobs box', async () => {
        const { result, errors } = await screen({ entry: entry('Shivamogga, Karnataka', 'Mangalore, India'), api, styles: true, width: 1280, budget: 20_000, script: `
            await sleep(900);
            $$('button').find((b) => /Change dates|^Edit$/.test(b.innerText)).click();
            await sleep(400);
            const box = $('#opp-location');
            const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
            set.call(box, 'Udupi'); box.dispatchEvent(new Event('input', { bubbles: true }));
            await sleep(100);
            $$('button[type="submit"]').at(-1).click();
            await sleep(800);
            const saved = window.__calls.find((c) => c[0] === 'PUT' && /profile$/.test(c[1]));
            return { savedTown: saved && saved[2].location, jobsTownChanged: window.__jobsTownChanged };` });
        assert.deepEqual(errors, []);
        assert.equal(result.savedTown, 'Udupi', 'the new town is saved on the part-time profile');
        assert.equal(result.jobsTownChanged, 0, 'and the Jobs tab\'s Location box was left alone');
    });

    test('with no town anywhere there is no pill', async () => {
        const { result, errors } = await screen({ entry: entry('', ''), api, styles: true, width: 1280, script: LOOK });
        assert.deepEqual(errors, []);
        assert.equal(result.pill, null, 'nothing to show yet');
        assert.equal(result.typedBox, false);
    });

    test('the dates-and-interests form opens on the town in use', async () => {
        const { result, errors } = await screen({ entry: entry('', 'Mangalore, India'), api, styles: true, width: 1280, script: `
            await sleep(900);
            $$('button').find((b) => /Change dates|^Edit$/.test(b.innerText)).click();
            await sleep(400);
            return { town: $('#opp-location') && $('#opp-location').value };` });
        assert.deepEqual(errors, []);
        assert.equal(result.town, 'Mangalore, India');
    });
});
