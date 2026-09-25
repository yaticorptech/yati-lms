/**
 * The admin dropdown that replaced every native <select>: the list is the
 * page's own, fits the screen, searches when long, works from the keyboard,
 * and on a phone is a sheet from the bottom.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles } from './harness.js';

const MANY = Array.from({ length: 40 }, (_, i) => `Category ${String(i).padStart(2, '0')}`);

const entry = (fieldTop = 40) => `
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import Select from '${srcFile('components/Select.jsx')}';
window.__changes = [];
window.__modalClosed = false;
const App = () => {
  const [big, setBig] = useState('Category 05');
  const [small, setSmall] = useState('b');
  // A modal-style Escape listener, like the job form's, to prove the
  // dropdown's own Escape does not reach it.
  window.onkeydown = (e) => { if (e.key === 'Escape') window.__modalClosed = true; };
  return (
    <div style={{ paddingTop: ${fieldTop}, paddingLeft: 16, paddingRight: 16 }}>
      <Select aria-label="Big" value={big} onChange={(e) => { window.__changes.push(e.target.value); setBig(e.target.value); }}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
        {${JSON.stringify(MANY)}.map((c) => <option key={c} value={c}>{c}</option>)}
      </Select>
      <div style={{ height: 12 }} />
      <Select aria-label="Small" value={small} onChange={(e) => { window.__changes.push(e.target.value); setSmall(e.target.value); }}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
        <option value="a">Apple</option>
        <>
          <option value="b">Banana</option>
          {true && <option value="c" disabled>Cherry (sold out)</option>}
        </>
        <option value="d">Date</option>
      </Select>
    </div>
  );
};
createRoot(document.getElementById('root')).render(<App />);`;

const api = 'export default {}';

describe('the admin dropdown', { skip: skipWithoutStyles }, () => {
    test('shows the chosen label, opens its own list, and a long one gets a search', async () => {
        const { result, errors } = await screen({
            entry: entry(), api, styles: true, width: 1200, height: 800, script: `
                await sleep(300);
                const big = $('[aria-label="Big"][role=combobox]');
                const shown = text(big);
                big.click(); await sleep(150);
                const list = $('[role=listbox]');
                const box = list.parentElement.getBoundingClientRect();
                const search = $('input[aria-label="Search options"]');
                search.value = ''; 
                const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
                setter.call(search, '3'); search.dispatchEvent(new Event('input', { bubbles: true })); await sleep(100);
                const filtered = $$('[role=option]').map(text);
                $$('[role=option]').find((o) => text(o) === 'Category 13').click(); await sleep(150);
                return {
                    shown, expanded: big.getAttribute('aria-expanded'),
                    listHeight: Math.round(box.height), vh: window.innerHeight, belowField: box.top >= big.getBoundingClientRect().bottom,
                    filtered, changes: window.__changes, after: text(big), closed: !$('[role=listbox]')
                };` });
        assert.deepEqual(errors, []);
        assert.equal(result.shown, 'Category 05');
        assert.ok(result.listHeight <= 320, 'the list is capped, not the whole screen');
        assert.ok(result.belowField, 'it opens under the field');
        assert.deepEqual(result.filtered, ['Category 03', 'Category 13', 'Category 23', 'Category 30', 'Category 31', 'Category 32', 'Category 33', 'Category 34', 'Category 35', 'Category 36', 'Category 37', 'Category 38', 'Category 39']);
        assert.deepEqual(result.changes, ['Category 13']);
        assert.equal(result.after, 'Category 13');
        assert.ok(result.closed, 'choosing closes it');
    });

    test('options come through fragments and conditionals; a disabled one cannot be chosen', async () => {
        const { result } = await screen({
            entry: entry(), api, styles: true, width: 1200, height: 800, script: `
                await sleep(300);
                $('[aria-label="Small"][role=combobox]').click(); await sleep(150);
                const labels = $$('[role=option]').map(text);
                const hasSearch = !!$('input[aria-label="Search options"]');
                $$('[role=option]').find((o) => /Cherry/.test(text(o))).click(); await sleep(100);
                return { labels, hasSearch, changes: window.__changes, stillOpen: !!$('[role=listbox]') };` });
        assert.deepEqual(result.labels, ['Apple', 'Banana', 'Cherry (sold out)', 'Date']);
        assert.equal(result.hasSearch, false, 'a short list has no search box');
        assert.deepEqual(result.changes, [], 'the disabled choice is ignored');
        assert.ok(result.stillOpen);
    });

    test('the keyboard drives it, and Escape closes only the dropdown', async () => {
        const { result } = await screen({
            entry: entry(), api, styles: true, width: 1200, height: 800, script: `
                await sleep(300);
                const small = $('[aria-label="Small"][role=combobox]');
                small.focus();
                const key = (k) => document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
                key('ArrowDown'); await sleep(150);
                const opened = !!$('[role=listbox]');
                key('ArrowDown'); await sleep(50);   // Banana -> skips disabled Cherry -> Date
                key('Enter'); await sleep(100);
                const chose = window.__changes.slice();
                key('Enter'); await sleep(150);
                key('Escape'); await sleep(100);
                return { opened, chose, closed: !$('[role=listbox]'), modalClosed: window.__modalClosed, refocused: document.activeElement === small };` });
        assert.ok(result.opened);
        assert.deepEqual(result.chose, ['d'], 'arrow keys skip the disabled option');
        assert.ok(result.closed);
        assert.equal(result.modalClosed, false, 'the form behind it stays open');
        assert.ok(result.refocused, 'focus goes back to the field');
    });

    test('near the bottom of the window it opens upwards, still on screen', async () => {
        const { result } = await screen({
            entry: entry(700), api, styles: true, width: 1200, height: 800, script: `
                await sleep(300);
                const big = $('[aria-label="Big"][role=combobox]');
                big.click(); await sleep(150);
                const box = $('[role=listbox]').parentElement.getBoundingClientRect();
                return { top: box.top, bottom: box.bottom, fieldTop: big.getBoundingClientRect().top, vh: window.innerHeight };` });
        assert.ok(result.bottom <= result.fieldTop, 'it sits above the field');
        assert.ok(result.top >= 0, 'and does not run off the top');
    });

    test('on a phone it opens in the middle of the screen, headed with the field', async () => {
        const { result } = await screen({
            entry: entry(), api, styles: true, width: 390, height: 800, script: `
                await sleep(300);
                $('[aria-label="Big"][role=combobox]').click(); await sleep(250);
                const pop = $('[role=dialog]');
                const r = pop.getBoundingClientRect();
                const chosen = $('[role=option][aria-selected=true]').getBoundingClientRect();
                const list = $('[role=listbox]').getBoundingClientRect();
                return {
                    top: r.top, bottom: r.bottom, left: r.left, right: r.right, vh: window.innerHeight, vw: window.innerWidth,
                    heading: text(pop.querySelector('p')), rows: $$('[role=option]').length,
                    chosenVisible: chosen.top >= list.top && chosen.bottom <= list.bottom
                };` });
        const middle = (result.top + result.bottom) / 2;
        assert.ok(Math.abs(middle - result.vh / 2) < 2, `centred vertically (${middle} vs ${result.vh / 2})`);
        assert.ok(result.top > 0 && result.bottom < result.vh, 'clear of both edges');
        assert.ok(result.left > 0 && result.right < result.vw, 'with a margin at the sides');
        assert.equal(result.heading, 'Big', 'headed with the field it belongs to');
        assert.equal(result.rows, 40);
        assert.ok(result.chosenVisible, 'opened scrolled to the current choice');
    });
    const multiEntry = `
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import Select from '${srcFile('components/Select.jsx')}';
window.__changes = [];
const App = () => {
  const [picked, setPicked] = useState(['c02']);
  return (
    <div style={{ padding: 16 }}>
      <label>Also matches interests</label>
      <Select multiple value={picked} onChange={(e) => { window.__changes.push(e.target.value); setPicked(e.target.value); }}
        placeholder="None" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
        {${JSON.stringify(MANY)}.map((c, i) => <option key={c} value={'c' + String(i).padStart(2, '0')}>{c}</option>)}
      </Select>
    </div>
  );
};
createRoot(document.getElementById('root')).render(<App />);`;

    test('multiple: ticks stay open, keep list order, and show as tags', async () => {
        const { result, errors } = await screen({
            entry: multiEntry, api, styles: true, width: 1200, height: 800, script: `
                await sleep(300);
                const field = $('[role=combobox]');
                const before = text(field);
                field.click(); await sleep(150);
                const pick = (label) => $$('[role=option]').find((o) => text(o) === label).click();
                pick('Category 10'); await sleep(50);
                pick('Category 01'); await sleep(50);
                pick('Category 05'); await sleep(50);
                pick('Category 07'); await sleep(50);
                const stillOpen = !!$('[role=listbox]');
                const multi = $('[role=listbox]').getAttribute('aria-multiselectable');
                const count = text(find(/^Done$/).parentElement.querySelector('span'));
                pick('Category 05'); await sleep(50);   // untick
                click(/^Done$/); await sleep(150);
                return { before, stillOpen, multi, count, changes: window.__changes, closed: !$('[role=listbox]'), after: text(field) };` });
        assert.deepEqual(errors, []);
        assert.equal(result.before, 'Category 02');
        assert.ok(result.stillOpen, 'ticking does not close the list');
        assert.equal(result.multi, 'true');
        assert.equal(result.count, '5 selected');
        assert.deepEqual(result.changes.at(-1), ['c01', 'c02', 'c07', 'c10'], 'in the list order, with the untick applied');
        assert.ok(result.closed, 'Done closes it');
        assert.equal(result.after, 'Category 01 Category 02 Category 07 +1 more');
    });

    test('multiple: Clear empties it, and an empty field shows its placeholder', async () => {
        const { result } = await screen({
            entry: multiEntry, api, styles: true, width: 390, height: 800, script: `
                await sleep(300);
                $('[role=combobox]').click(); await sleep(200);
                const heading = text($('[role=dialog] p'));
                click(/^Clear$/); await sleep(100);
                click(/^Done$/); await sleep(150);
                return { heading, last: window.__changes.at(-1), after: text($('[role=combobox]')) };` });
        assert.equal(result.heading, 'Also matches interests');
        assert.deepEqual(result.last, []);
        assert.equal(result.after, 'None');
    });
});
