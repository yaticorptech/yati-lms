/**
 * The enrollments page on a phone: the filter, the search and the export
 * button stack instead of running off the side, and each enrollment is a card
 * carrying everything the table row would.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, wrap, skipWithoutStyles } from './harness.js';

const ROWS = [
    { _id: 'e1', type: 'Course', createdAt: '2026-09-20T09:00:00.000Z', userId: { name: 'Nikhil Shetty', email: 'a.very.long.student.address@gmail.com' }, courseId: { title: 'Data Structures and Algorithms in Depth' } },
    { _id: 'e2', type: 'Bundle', createdAt: '2026-09-21T09:00:00.000Z', userId: { name: 'Asha Rao', email: 'asha@example.com' }, bundleId: { title: 'Full Stack Bundle' } },
    { _id: 'e3', type: 'Course', createdAt: '2026-09-22T09:00:00.000Z', userId: null, courseId: { title: 'Orphaned' } }
];

const api = `
const reply = (data) => Promise.resolve({ data });
export default { get: () => reply(${JSON.stringify(ROWS)}), post: () => reply({}), put: () => reply({}), delete: () => reply({}) };`;

const entry = wrap('pages/Enrollments.jsx', 'Enrollments', { route: '/enrollments', path: '/enrollments' });

describe('the enrollments page on a phone', { skip: skipWithoutStyles }, () => {
    test('nothing runs off the side, and every enrollment is a card', async () => {
        const { result, errors } = await screen({
            entry, api, styles: true, width: 390, height: 800, script: `
                await sleep(800);
                const widest = $$('#root *').reduce((most, el) => Math.max(most, Math.round(el.getBoundingClientRect().right)), 0);
                const cards = $$('ul.md\\\\:hidden > li');
                return {
                    vw: window.innerWidth,
                    widest,
                    pageSideways: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
                    tableShown: getComputedStyle($('table').parentElement).display !== 'none',
                    cards: cards.map((li) => text(li)),
                    revokeButtons: cards.filter((li) => li.querySelector('button[aria-label^="Revoke"]')).length
                };` });
        assert.deepEqual(errors, [], 'a row with no student does not crash the search');
        assert.ok(!result.pageSideways, 'the page does not scroll sideways');
        assert.ok(result.widest <= result.vw, `nothing reaches past the screen edge (${result.widest} > ${result.vw})`);
        assert.ok(!result.tableShown, 'the table gives way to cards');
        assert.equal(result.cards.length, 3);
        assert.match(result.cards[0], /Nikhil Shetty/);
        assert.match(result.cards[0], /COURSE/);
        assert.match(result.cards[0], /Data Structures/);
        assert.equal(result.revokeButtons, 3, 'and each card can still revoke');
    });
});
