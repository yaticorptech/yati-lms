/**
 * The admin's local jobs panel on a phone: one card per job carrying what the
 * table row would — dates, ages, safety, status — with nothing cut off at the
 * side, and the edit form as a sheet that fits the screen.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles } from './harness.js';

const job = (id, title, over = {}) => ({
    id, title, icon: '🏋️', category: 'loading', opportunityType: 'part-time',
    organization: { name: 'VRL Logistics Depot', verified: true },
    location: { area: 'Peenya', city: 'Bengaluru' }, slots: 8,
    startsAt: '2026-09-16T00:00:00.000Z', endsAt: '2099-10-15T00:00:00.000Z', timeLabel: '18:00–23:00',
    minimumAge: 18, maximumAge: null, safetyClassification: 'restricted', status: 'open', ...over
});

const JOBS = [
    job('j1', 'Godown loading crew'),
    job('j2', 'Night security guard, apartment gate', { icon: '🛡️', organization: { name: 'ShieldPro Security', verified: true }, location: { area: 'Hebbal' }, slots: 2, source: 'seed' }),
    job('j3', 'Material helper, construction site', { icon: '🧱', safetyClassification: 'general', status: 'closed', slots: 1 })
];
const VOCAB = {
    categories: [{ id: 'loading', label: 'Loading & unloading', icon: '📦' }],
    types: [{ id: 'part-time', label: 'Part-time' }],
    hours: [{ id: '2-4', label: '2–4 hours' }],
    safety: [{ id: 'restricted', label: 'Restricted', blurb: 'adults only — night shifts, heavy lifting, cash handling and similar work' }, { id: 'general', label: 'General', blurb: 'adults' }]
};

const api = `
const reply = (data) => Promise.resolve({ data });
export default { get: () => reply({ jobs: ${JSON.stringify(JOBS)}, vocab: ${JSON.stringify(VOCAB)} }), post: () => reply({}), put: () => reply({}), delete: () => reply({}) };`;

const entry = `
import { createRoot } from 'react-dom/client';
import LocalJobsPanel from '${srcFile('components/LocalJobsPanel.jsx')}';
createRoot(document.getElementById('root')).render(<LocalJobsPanel />);`;

describe('the local jobs panel on a phone', { skip: skipWithoutStyles }, () => {
    test('each job is a card, and nothing runs off the side', async () => {
        const { result, errors } = await screen({
            entry, api, styles: true, width: 390, height: 900, script: `
                await sleep(700);
                const cards = $$('ul.md\\\\:hidden > li');
                return {
                    tableShown: getComputedStyle($('table').parentElement).display !== 'none',
                    cards: cards.map((li) => text(li)),
                    widest: $$('#root *').reduce((m, el) => Math.max(m, Math.round(el.getBoundingClientRect().right)), 0),
                    vw: window.innerWidth,
                    pageSideways: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
                };` });
        assert.deepEqual(errors, []);
        assert.ok(!result.tableShown, 'the table gives way to cards');
        assert.equal(result.cards.length, 3);
        assert.match(result.cards[0], /Godown loading crew/);
        assert.match(result.cards[0], /18:00–23:00/);
        assert.match(result.cards[0], /18\+/);
        assert.match(result.cards[0], /restricted/, 'the safety class is on the card, not cut off');
        assert.match(result.cards[0], /open/);
        assert.match(result.cards[1], /demo/i);
        assert.match(result.cards[2], /closed/);
        assert.ok(!result.pageSideways);
        assert.ok(result.widest <= result.vw, `nothing past the edge (${result.widest} > ${result.vw})`);
    });

    test('editing opens the form as a sheet that fits the screen', async () => {
        const { result, errors } = await screen({
            entry, api, styles: true, width: 390, height: 800, script: `
                await sleep(700);
                $('ul.md\\\\:hidden button[aria-label="Edit Godown loading crew"]').click();
                await sleep(300);
                const form = $('form[role=dialog]');
                const r = form.getBoundingClientRect();
                return { title: form.querySelector('input').value, top: r.top, bottom: Math.round(r.bottom), vh: window.innerHeight, left: r.left, right: Math.round(r.right), vw: window.innerWidth };` });
        assert.deepEqual(errors, []);
        assert.equal(result.title, 'Godown loading crew');
        assert.ok(result.top >= 0 && result.bottom <= result.vh, 'the whole sheet is on screen');
        assert.ok(result.left >= 0 && result.right <= result.vw);
    });
    test('a long dropdown label does not push the form sideways', async () => {
        const { result, errors } = await screen({
            entry, api, styles: true, width: 390, height: 800, script: `
                await sleep(700);
                $('ul.md\\\\:hidden button[aria-label="Edit Godown loading crew"]').click();
                await sleep(300);
                const scroller = $('form[role=dialog]').children[1];
                // Open and close a dropdown the way a thumb would: focus comes back
                // to the field, and must not scroll the form to reach it.
                const safety = $$('form [role=combobox]').find((b) => /Restricted/.test(b.innerText));
                safety.click(); await sleep(200);
                const sheet = $$('[role=dialog]').pop();
                const isSheet = sheet.tagName !== 'FORM';
                sheet.querySelector('button[aria-label="Close"]').click(); await sleep(200);
                return { isSheet, formOpen: !!$('form[role=dialog]'), sw: scroller.scrollWidth, cw: scroller.clientWidth, scrollLeft: scroller.scrollLeft, label: safety.innerText.trim() };` });
        assert.deepEqual(errors, []);
        assert.ok(result.isSheet, 'the dropdown opened as its own sheet');
        assert.ok(result.formOpen, 'closing the dropdown left the job form open');
        assert.ok(result.cw > 300, 'the form was measured while on screen');
        assert.equal(result.sw, result.cw, 'nothing in the form is wider than the form');
        assert.equal(result.scrollLeft, 0, 'and it has not been scrolled sideways');
        assert.match(result.label, /^Restricted — adults only/);
    });
});
