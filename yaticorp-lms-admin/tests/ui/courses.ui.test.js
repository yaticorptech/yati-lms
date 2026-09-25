/**
 * The admin course list on a phone: the stats sit three across, every card's
 * actions are on screen without a hover, and nothing runs off the side.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, wrap, skipWithoutStyles } from './harness.js';

const COURSES = [
    { _id: '50901', title: 'Tally & Basic Accounting', description: 'x', isPublished: true, price: 0, lessonsCount: 12, createdAt: '2026-09-01T00:00:00.000Z' },
    { _id: '50902', title: 'Spoken English for Interviews and Group Discussions', description: 'x', isPublished: false, price: 4999, lessonsCount: 1, createdAt: '2026-09-10T00:00:00.000Z', thumbnail: '' }
];
const api = `
window.__calls = [];
const reply = (data) => Promise.resolve({ data });
export default { get: () => reply(${JSON.stringify(COURSES)}), put: (url, body) => { window.__calls.push(['PUT', url, body]); return reply({}); }, post: () => reply({}), delete: () => reply({}) };`;
const entry = wrap('pages/Courses.jsx', 'Courses', { route: '/courses', path: '/courses' });

describe('the course list on a phone', { skip: skipWithoutStyles }, () => {
    test('stats three across, actions visible, prices honest, nothing sideways', async () => {
        const { result, errors } = await screen({
            entry, api, styles: true, width: 390, height: 900, script: `
                await sleep(700);
                const tiles = $$('.grid-cols-3 > div.relative').map((d) => Math.round(d.getBoundingClientRect().top));
                const more = $$('button[aria-label^="More actions for"]');
                const visible = more.map((b) => getComputedStyle(b).opacity === '1' && b.getBoundingClientRect().width > 0);
                const cards = $$('.grid > div.group').map(text);
                return {
                    tiles, visible, cards,
                    builderLinks: $$('a[title="Course Builder"]').length,
                    pageSideways: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
                };` });
        assert.deepEqual(errors, []);
        assert.equal(result.tiles.length, 3);
        assert.equal(new Set(result.tiles).size, 1, 'the three stat tiles share one row');
        assert.deepEqual(result.visible, [true, true], 'the ⋮ button is on screen without a hover');
        assert.equal(result.builderLinks, 2, 'and so is Builder');
        assert.match(result.cards.find((c) => /Tally/.test(c)), /Free/, 'a price of 0 reads Free, not a made-up ₹5,000');
        assert.match(result.cards.find((c) => /Spoken/.test(c)), /₹ 4,999/);
        assert.ok(!result.pageSideways);
    });

    test('the ⋮ menu opens, acts, and closes on a tap outside', async () => {
        const { result, errors } = await screen({
            entry, api, styles: true, width: 390, height: 900, script: `
                await sleep(700);
                const btn = $('button[aria-label="More actions for Tally & Basic Accounting"]');
                btn.click(); await sleep(150);
                const items = $$('[role=menu] [role=menuitem]').map(text);
                document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); await sleep(150);
                const closedByOutside = !$('[role=menu]');
                btn.click(); await sleep(150);
                click(/Unpublish/); await sleep(200);
                return { items, closedByOutside, put: window.__calls[0] };` });
        assert.deepEqual(errors, []);
        assert.deepEqual(result.items, ['Edit Details', 'Unpublish', 'Delete Course']);
        assert.ok(result.closedByOutside);
        assert.equal(result.put[1], '/admin/courses/50901');
        assert.equal(result.put[2].isPublished, false);
    });
});
