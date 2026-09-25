/**
 * The dropdowns on the job search form.
 *
 * These were native <select>s. A native select can be styled shut but not
 * open: the open list is drawn by the operating system, so on a Mac it came
 * out as a grey system menu with no relation to the app around it. The only
 * fix is to stop using one — the shared Dropdown draws its own list, which is
 * why this test measures the panel's real colours rather than its classes.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { screen, srcFile, skipWithoutChrome, skipWithoutStyles, ROOT } from './harness.js';

const JOB_TYPES = ['Any', 'Full-time', 'Part-time', 'Internship', 'Contract'];

const entry = (placement = 'panel') => `
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import Dropdown from '${srcFile('components/Dropdown.jsx')}';
function Demo() {
  const [v, setV] = useState('Any');
  return <div style={{ padding: 40 }}>
    <Dropdown label="Job type" accent="indigo" placement="${placement}" value={v}
      options={${JSON.stringify(JOB_TYPES)}.map((t) => ({ value: t, label: t }))} onChange={setV}
      className="relative w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white pr-10 text-left text-slate-800" />
    <p id="picked">{v}</p>
  </div>;
}
createRoot(document.getElementById('root')).render(<Demo />);`;

/* Read every colour while the list is still open: closing it unmounts the
   panel, and a live computed style then answers '' for everything. */
const open = `
  $('button[aria-haspopup="listbox"]').click();
  await sleep(400);
  const panel = $('ul[role="listbox"]').parentElement;
  const rows = $$('li[role="option"]');
  const sel = rows.find((r) => r.getAttribute('aria-selected') === 'true');
  const snap = {
    panelBg: String(getComputedStyle(panel).backgroundColor),
    rowColor: String(getComputedStyle(rows[1]).color),
    selectedBg: String(getComputedStyle(sel).backgroundColor),
    labels: rows.map((r) => r.innerText.trim()),
    selected: sel.innerText.trim()
  };`;

describe('the job search dropdowns', { skip: skipWithoutStyles }, () => {
    test('the open list is the app\'s own white panel, not a system menu', async () => {
        const { result, errors } = await screen({
            entry: entry(), api: 'export default {};', styles: true, script: `
                await sleep(300); ${open}
                return snap;` });
        assert.deepEqual(errors, []);
        assert.equal(result.panelBg, 'rgb(255, 255, 255)', 'the panel is white');
        // The grey menu drew its text white-on-grey. Ours is dark on white,
        // which only holds if the row colour is a dark one.
        assert.match(result.rowColor, /^(rgb|oklch)/);
        assert.notEqual(result.rowColor, 'rgb(255, 255, 255)', 'and its text is not white on white');
        assert.deepEqual(result.labels, JOB_TYPES, 'every choice is there');
        assert.equal(result.selected, 'Any');
    });

    test('choosing an option changes the value', async () => {
        const { result, errors } = await screen({
            entry: entry(), api: 'export default {};', styles: true, script: `
                await sleep(300); ${open}
                rows[2].click(); await sleep(250);
                return { button: text($('button[aria-haspopup="listbox"]')), picked: text($('#picked')),
                         stillOpen: !!$('ul[role="listbox"]') };` });
        assert.deepEqual(errors, []);
        assert.equal(result.picked, 'Part-time', 'the choice reaches the form');
        assert.equal(result.button, 'Part-time', 'and the closed field shows it');
        assert.equal(result.stillOpen, false, 'the list closes behind it');
    });

    test('the keyboard can work it', async () => {
        const { result, errors } = await screen({
            entry: entry(), api: 'export default {};', styles: true, script: `
                await sleep(300);
                const btn = $('button[aria-haspopup="listbox"]');
                btn.focus();
                const key = (k) => btn.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
                // A gap between each: two keys in one tick are handled by the
                // same render, so the second would read a cursor the first had
                // not yet moved.
                key('ArrowDown'); await sleep(200);
                key('ArrowDown'); await sleep(200);
                key('Enter'); await sleep(250);
                return { picked: text($('#picked')) };` });
        assert.deepEqual(errors, []);
        assert.equal(result.picked, 'Full-time');
    });

    test('on a phone it opens under its own field, not as a sheet', async () => {
        // The Target role box beside it drops a panel under itself at every
        // width. A neighbour that answered with a bottom sheet read as a
        // different kind of control on the same form.
        // 500px is the narrowest headless Chrome will go.
        const { result, errors } = await screen({
            entry: entry(), api: 'export default {};', styles: true, width: 500, script: `
                await sleep(300);
                const btn = $('button[aria-haspopup="listbox"]');
                const f = btn.getBoundingClientRect();
                btn.click(); await sleep(400);
                const panel = $('ul[role="listbox"]').parentElement;
                const p = panel.getBoundingClientRect();
                return {
                    bg: String(getComputedStyle(panel).backgroundColor),
                    onScreen: p.left >= 0 && p.right <= window.innerWidth,
                    gap: Math.round(p.top - f.bottom),
                    leftOff: Math.round(p.left - f.left), rightOff: Math.round(p.right - f.right),
                    bottomOfScreen: Math.round(window.innerHeight - p.bottom),
                    hasCloseX: !!$$('button[aria-label="Close"]').length,
                    hasBackdrop: !!$$('div.fixed.inset-0').length
                };` });
        assert.deepEqual(errors, []);
        // Placed against its field. The panel is portalled to <body> and
        // positioned from the field's measured box, so the test asks where it
        // landed rather than which CSS position property got it there.
        assert.equal(result.bg, 'rgb(255, 255, 255)');
        assert.equal(result.onScreen, true, 'and all of it is on the screen');
        assert.ok(result.gap >= 0 && result.gap <= 8, `it sits just under the field, gap was ${result.gap}px`);
        assert.equal(result.leftOff, 0, 'left edges line up with the field');
        assert.equal(result.rightOff, 0, 'and so do the right');
        assert.ok(result.bottomOfScreen > 100, 'it is nowhere near the bottom of the screen');
        assert.equal(result.hasCloseX, false, 'a panel needs no close button');
        assert.equal(result.hasBackdrop, false, 'and dims nothing behind it');
    });

    test('the default placement is the centred popup, which this form does not use', async () => {
        // The interview pickers open as a popup over a dimmed page: a sheet on
        // the bottom edge sat behind the app's own thumb bar and hid its last
        // option. That is the default; the job form asks for 'panel' instead,
        // and this pins the difference so neither section quietly gets the
        // other's behaviour.
        const { result, errors } = await screen({
            entry: entry('popup'), api: 'export default {};', styles: true, width: 500, script: `
                await sleep(300);
                const btn = $('button[aria-haspopup="listbox"]');
                const f = btn.getBoundingClientRect();
                btn.click(); await sleep(400);
                const p = $('ul[role="listbox"]').parentElement.getBoundingClientRect();
                return { startsBelowField: p.top > f.bottom + 40,
                         centred: Math.abs((p.left + p.right) / 2 - window.innerWidth / 2) < 4,
                         onBottomEdge: Math.round(window.innerHeight - p.bottom) === 0,
                         hasCloseX: !!$$('button[aria-label="Close"]').length };` });
        assert.deepEqual(errors, []);
        assert.equal(result.centred, true, 'the popup is centred on the screen');
        assert.equal(result.onBottomEdge, false, 'not pinned to the bottom edge, where the thumb bar is');
        assert.equal(result.hasCloseX, true, 'and it carries its own way out');
    });
});

describe('the job search form', { skip: skipWithoutChrome }, () => {
    test('has no native select left to be drawn by the system', async () => {
        // A single <select> anywhere on this page brings the grey menu back,
        // so this guards the whole form rather than one field.
        const source = readFileSync(path.join(ROOT, 'src', 'pages', 'Jobs.jsx'), 'utf8');
        assert.equal(/<select\b/.test(source), false, 'Jobs.jsx should use the shared Dropdown throughout');
    });
});
