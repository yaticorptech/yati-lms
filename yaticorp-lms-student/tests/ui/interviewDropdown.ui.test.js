/**
 * The interview pickers, on a phone.
 *
 * These were native <select>s. A native select can be styled shut but not
 * open — the list belongs to the operating system — so the app had no say in
 * how it looked or how much of the screen it took. They draw their own list
 * now, which means the app is answerable for it, which means it can be tested.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles } from './harness.js';
import { apiModule } from './fixtures.js';

const api = apiModule({});

const entry = `
import { createRoot } from 'react-dom/client';
import { Briefcase } from 'lucide-react';
import Dropdown from '${srcFile('components/Dropdown.jsx')}';
const OPTIONS = ['Full Stack Developer','Frontend Developer','Backend Developer','Data Analyst',
  'Data Scientist','Software Engineer','Business Analyst','UI/UX Designer','Digital Marketer',
  'Customer Support Executive','Other role…'].map((x) => ({ value: x, label: x }));
function Demo() {
  const [v, setV] = React.useState('Full Stack Developer');
  return (
    <div style={{ padding: 16 }}>
      <p id="picked">{v}</p>
      <Dropdown label="Job role" icon={Briefcase} value={v} onChange={setV} options={OPTIONS}
        className="relative w-full rounded-2xl border border-violet-100 bg-white py-3.5 pl-11 pr-10 text-sm font-semibold text-slate-800" />
    </div>);
}
import React from 'react';
createRoot(document.getElementById('root')).render(<Demo />);`;

const OPEN = `
    await sleep(500);
    const trigger = $('button[aria-haspopup="listbox"]');
    trigger.click(); await sleep(350);
    const list = $('[role="listbox"]');
    // The sheet is the wrapper: it carries the header bar and the list.
    const sheet = list.parentElement;
    const r = sheet.getBoundingClientRect();
    const rows = $$('[role="option"]');
    const closer = $$('button[aria-label="Close"]').find((b) => sheet.contains(b));
    return {
        opened: !!list,
        left: Math.round(r.left), right: Math.round(innerWidth - r.right),
        top: Math.round(r.top), bottom: Math.round(innerHeight - r.bottom),
        height: Math.round(r.height), vh: innerHeight,
        rowCount: rows.length,
        shortestRow: Math.min(...rows.map((x) => Math.round(x.getBoundingClientRect().height))),
        scrolls: list.scrollHeight > list.clientHeight + 1,
        pageWidens: document.documentElement.scrollWidth > innerWidth,
        hasCloser: !!closer,
        closerVisible: !!(closer && closer.getBoundingClientRect().width > 0),
        closerSize: closer ? Math.round(closer.getBoundingClientRect().height) : 0
    };`;

describe('the interview pickers', { skip: skipWithoutStyles }, () => {
    test('on a phone the list is a sheet that fits the screen', async () => {
        const { result, errors } = await screen({ entry, api, width: 500, height: 700, styles: true, script: OPEN });
        assert.deepEqual(errors, []);
        assert.ok(result.opened, 'the list opened');
        assert.equal(result.left, 0, 'it reaches the left edge');
        assert.equal(result.right, 0, 'and the right edge');
        assert.ok(result.bottom <= 1, `it sits on the bottom edge, not ${result.bottom}px above it`);
        assert.ok(result.top >= 0, `and its top is on screen, not at ${result.top}px`);
        assert.ok(result.height <= result.vh, `the list is ${result.height}px in a ${result.vh}px screen`);
        assert.equal(result.pageWidens, false, 'and nothing pushed the page sideways');
    });

    test('a long list scrolls instead of running off the screen', async () => {
        const { result } = await screen({ entry, api, width: 500, height: 700, styles: true, script: OPEN });
        assert.equal(result.rowCount, 11, 'every option is rendered');
        assert.ok(result.scrolls, 'eleven roles do not fit, so the sheet scrolls');
    });

    test('every row is big enough to hit with a thumb', async () => {
        const { result } = await screen({ entry, api, width: 500, height: 700, styles: true, script: OPEN });
        // 44px is the usual floor for a touch target.
        assert.ok(result.shortestRow >= 44, `the smallest row is ${result.shortestRow}px tall`);
    });

    test('choosing a role reports it back and shuts the list', async () => {
        const PICK = `
            await sleep(500);
            $('button[aria-haspopup="listbox"]').click(); await sleep(300);
            const wanted = $$('[role="option"]').find((o) => /Software Engineer/.test(o.innerText));
            wanted.click(); await sleep(300);
            return { picked: $('#picked').innerText.trim(), stillOpen: !!$('[role="listbox"]') };`;
        const { result } = await screen({ entry, api, width: 500, height: 700, styles: true, script: PICK });
        assert.equal(result.picked, 'Software Engineer');
        assert.equal(result.stillOpen, false, 'and the list closed behind it');
    });

    test('the sheet carries its own close button, and it is thumb-sized', async () => {
        // On a phone the sheet covers the field that opened it, so there is
        // nothing obvious to tap beside it — the way out has to be on the sheet.
        const { result } = await screen({ entry, api, width: 500, height: 700, styles: true, script: OPEN });
        assert.ok(result.hasCloser, 'there is a close button on the sheet');
        assert.ok(result.closerVisible, 'and it is actually drawn');
        assert.ok(result.closerSize >= 36, `it is ${result.closerSize}px, too small to hit`);
    });

    test('the close button shuts the sheet without changing the choice', async () => {
        const CLOSE = `
            await sleep(500);
            $('button[aria-haspopup="listbox"]').click(); await sleep(300);
            const before = $('#picked').innerText.trim();
            const sheet = $('[role="listbox"]').parentElement;
            $$('button[aria-label="Close"]').find((b) => sheet.contains(b)).click();
            await sleep(300);
            return { before, after: $('#picked').innerText.trim(), stillOpen: !!$('[role="listbox"]') };`;
        const { result } = await screen({ entry, api, width: 500, height: 700, styles: true, script: CLOSE });
        assert.equal(result.stillOpen, false, 'the sheet closed');
        assert.equal(result.after, result.before, 'and the role is the one it was before');
    });

    test('on a desktop it is a panel under the field, not a full-width sheet', async () => {
        const { result } = await screen({ entry, api, width: 1280, height: 800, styles: true, script: OPEN });
        assert.ok(result.left > 0 && result.right > 0, 'it sits under the field, inside the page');
        assert.ok(result.bottom > 1, 'and is not pinned to the bottom of the window');
        assert.equal(result.closerVisible, false, 'and it carries no close bar — clicking away is the exit here');
    });
});
