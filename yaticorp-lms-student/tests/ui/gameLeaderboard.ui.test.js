/**
 * The Brain Games banner's standings: three rows tall whatever the class
 * size, the rest scrolling inside, with a button that scrolls them and, at
 * the end, goes back to the top. A short list needs no button at all.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles } from './harness.js';
import { apiModule } from './fixtures.js';

const person = (rank, name, stars, isMe = false) => ({ userId: `u${rank}`, rank, name, stars, xp: stars * 10, level: 2, streak: 1, isMe });
const classOf = (n) => apiModule({
    '/games/leaderboard': { total: n, cohort: 'global', entries: Array.from({ length: n }, (_, i) => person(i + 1, i === 1 ? 'Presilla' : `Learner ${i + 1}`, 300 - i * 10, i === 1)), me: person(2, 'Presilla', 290, true) }
});
const modules = (api) => ({ 'career/services/api': api });

const entry = `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import GameLeaderboard from '${srcFile('career/components/games/GameLeaderboard.jsx')}';
createRoot(document.getElementById('root')).render(
  <MemoryRouter><div className="futurepath" style={{ width: 360, padding: 12 }}><div id="panel" className="rounded-2xl bg-white/80 p-4 shadow-lg ring-1 ring-white/70 ring-inset"><GameLeaderboard dense /></div></div></MemoryRouter>);`;

const MEASURE = `
await sleep(900);
const panel = $('#panel');
const list = $('[data-standings]');
const button = $$('button').find((b) => /standings/.test(b.getAttribute('aria-label') || ''));
const rows = $$('[data-standings] li').length;
const before = { height: Math.round(panel.getBoundingClientRect().height), listHeight: Math.round(list.getBoundingClientRect().height), scrolls: list.scrollHeight > list.clientHeight + 1, rows, button: button ? button.innerText.trim() : null };
if (list.scrollHeight > list.clientHeight) { list.scrollTop = list.scrollHeight; list.dispatchEvent(new Event('scroll')); await sleep(100); }
const after = $$('button').find((b) => /standings/.test(b.getAttribute('aria-label') || ''));
return { ...before, atEnd: after ? after.innerText.trim() : null, ranked: text($('#panel')).match(/\\d+ players? ranked/)?.[0] };`;

describe('the Brain Games standings panel', { skip: skipWithoutStyles }, () => {
    test('three players fit with nothing to scroll and no button', async () => {
        const { result, errors } = await screen({ entry, api: 'export default {}', modules: modules(classOf(3)), styles: true, width: 500, script: MEASURE });
        assert.deepEqual(errors, []);
        assert.equal(result.rows, 3);
        assert.equal(result.scrolls, false);
        assert.equal(result.button, null, 'no button for a list that fits');
        assert.equal(result.ranked, '3 players ranked');
    });

    test('four players already scroll; twenty-five make the panel no taller; the button says More, then Top at the end', async () => {
        const four = await screen({ entry, api: 'export default {}', modules: modules(classOf(4)), styles: true, width: 500, script: MEASURE });
        const many = await screen({ entry, api: 'export default {}', modules: modules(classOf(25)), styles: true, width: 500, script: MEASURE });
        assert.deepEqual(four.errors, []);
        assert.deepEqual(many.errors, []);
        assert.equal(four.result.scrolls, true, 'the fourth row scrolls inside');
        assert.equal(four.result.button, 'More');
        assert.equal(four.result.atEnd, 'Top', 'at the end the button offers the top');
        assert.ok(Math.abs(many.result.height - four.result.height) <= 1, `the panel keeps its height (${four.result.height}px → ${many.result.height}px)`);
        assert.ok(four.result.listHeight <= 180, `three rows and a peek, was ${four.result.listHeight}px`);
        assert.equal(many.result.ranked, '25 players ranked');
    });
});
