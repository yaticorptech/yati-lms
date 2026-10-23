/**
 * The admin's segmented tabs (components/orgUi.jsx Segmented) — All, Upcoming,
 * Live, Completed, Drafts on Competitions, and the same row on other pages.
 * On a phone the row is wider than the screen and scrolls sideways; choosing
 * an option brings it to the middle on its own, so the next one is in view.
 *
 * Headless Chrome will not give a window as narrow as a phone, so the row is
 * put in a 300px box, which is what a phone leaves it. The harness runs on
 * virtual time, where a smooth scroll never animates, so the page's
 * scrollTo is made instant for the test: where the row lands is the point.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles } from './harness.js';

const entry = `
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Segmented } from '${srcFile('components/orgUi.jsx')}';
const FILTERS = [['all', 'All'], ['upcoming', 'Upcoming'], ['live', 'Live'], ['completed', 'Completed'], ['draft', 'Drafts']];
const Row = () => { const [v, setV] = useState('all'); return <div style={{ width: 300 }}><Segmented options={FILTERS} value={v} onChange={setV} counts={{ upcoming: 1 }} /></div>; };
createRoot(document.getElementById('root')).render(<Row />);`;

test('on a phone, choosing a tab scrolls it to the middle, with the next one in view', { skip: skipWithoutStyles }, async () => {
    const { result, errors } = await screen({ entry, api: 'export default {};', styles: true, script: `
        const smooth = Element.prototype.scrollTo;
        Element.prototype.scrollTo = function (o) { return smooth.call(this, typeof o === 'object' ? { ...o, behavior: 'instant' } : o); };
        await sleep(300);
        const row = $('[aria-pressed]').closest('.overflow-x-auto');
        const btn = (label) => $$('button').find((b) => b.innerText.replace(/\\s*\\d+$/, '').trim() === label);
        const shown = (label) => { const r = btn(label).getBoundingClientRect(), n = row.getBoundingClientRect(); return r.left >= n.left - 1 && r.right <= n.right + 1; };
        const before = { overflows: row.scrollWidth > row.clientWidth, completed: shown('Completed') };
        btn('Live').click(); await sleep(800);
        const atLive = { scrolled: row.scrollLeft, live: shown('Live'), completed: shown('Completed'), pressed: btn('Live').getAttribute('aria-pressed') };
        btn('Drafts').click(); await sleep(800);
        const atDrafts = { drafts: shown('Drafts') };
        btn('All').click(); await sleep(800);
        return { before, atLive, atDrafts, atAll: { scrolled: row.scrollLeft, all: shown('All') } };` });
    assert.deepEqual(errors, []);
    assert.equal(result.before.overflows, true, 'the row is wider than its 300px');
    assert.equal(result.before.completed, false, 'Completed starts cut off, as on the phone');
    assert.equal(result.atLive.pressed, 'true');
    assert.ok(result.atLive.scrolled > 0, 'choosing Live moved the row on its own');
    assert.equal(result.atLive.live, true);
    assert.equal(result.atLive.completed, true, 'and the next tab, Completed, is in view');
    assert.equal(result.atDrafts.drafts, true, 'the last one comes fully into view');
    assert.equal(result.atAll.scrolled, 0, 'back to All: the row scrolls back');
    assert.equal(result.atAll.all, true);
});
