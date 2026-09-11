/**
 * The weekly activity card on a phone.
 *
 * Today's circle carries a Tailwind ring, which is a box-shadow and so sits
 * outside the element's measured box. The card clips its own overflow, so a
 * ring with no room is silently cut rather than making the page scroll — the
 * checks here add the ring back before comparing against the card's edge.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles } from './harness.js';
import { apiModule } from './fixtures.js';

const PHONE_VIEWPORT = 500;
const api = apiModule({});

const WEEK = [
    { key: 'd0', dayNum: 5, label: 'S', active: false, isToday: false },
    { key: 'd1', dayNum: 6, label: 'S', active: false, isToday: false },
    { key: 'd2', dayNum: 7, label: 'M', active: true, isToday: false },
    { key: 'd3', dayNum: 8, label: 'T', active: false, isToday: false },
    { key: 'd4', dayNum: 9, label: 'W', active: false, isToday: false },
    { key: 'd5', dayNum: 10, label: 'T', active: false, isToday: false },
    { key: 'd6', dayNum: 11, label: 'F', active: false, isToday: true }
];

/** The card exactly as the profile page builds it, in a box of a given width. */
const entry = (box) => `
import { createRoot } from 'react-dom/client';
import { CalendarDays } from 'lucide-react';
import { ActivityStrip } from '${srcFile('components/ProfileWidgets.jsx')}';
createRoot(document.getElementById('root')).render(
  <div style={{ width: ${box}, padding: 8 }}>
    <div id="card" className="relative overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 shadow-sm">
      <span aria-hidden="true" className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-200/50 blur-2xl" />
      <div className="relative grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><CalendarDays size={18} className="text-amber-500" /> Weekly activity</h2>
          <p className="mb-4 text-sm text-slate-500 lg:mb-3">1 active day this week</p>
          <div className="max-w-md"><ActivityStrip days={${JSON.stringify(WEEK)}} /></div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center lg:w-72">
          <div className="rounded-xl bg-white/80 p-2 ring-1 ring-amber-100"><p className="text-lg font-black text-slate-900">0</p><p className="text-[11px] font-semibold text-slate-500">🔥 Streak</p></div>
          <div className="rounded-xl bg-white/80 p-2 ring-1 ring-amber-100"><p className="text-lg font-black text-slate-900">0</p><p className="text-[11px] font-semibold text-slate-500">🎓 Completed</p></div>
          <div className="rounded-xl bg-white/80 p-2 ring-1 ring-amber-100"><p className="text-lg font-black text-slate-900">0</p><p className="text-[11px] font-semibold text-slate-500">🏆 Certificates</p></div>
        </div>
      </div>
    </div>
  </div>);`;

/** Everything the card draws past its own padding box, rings included. */
const CLIPPED = `
    const card = document.getElementById('card');
    const cs = getComputedStyle(card);
    const box = card.getBoundingClientRect();
    const edge = { left: box.left + parseFloat(cs.paddingLeft), right: box.right - parseFloat(cs.paddingRight) };
    const ringOf = (el) => (String(getComputedStyle(el).boxShadow).match(/0px 0px 0px (\\d+(?:\\.\\d+)?)px/g) || [])
        .reduce((a, x) => Math.max(a, parseFloat(x.split(' ')[3])), 0);
    const clipped = [...card.querySelectorAll('*')].filter((el) => {
        const r = el.getBoundingClientRect();
        if (!r.width || getComputedStyle(el).position === 'absolute') return false;
        const ring = ringOf(el);
        return r.right + ring > edge.right + 1 || r.left - ring < edge.left - 1;
    }).map((el) => el.tagName.toLowerCase() + ' ' + JSON.stringify((el.innerText || '').trim().slice(0, 14))
        + ' reaches ' + Math.round(el.getBoundingClientRect().right + ringOf(el) - edge.left) + ' of ' + Math.round(edge.right - edge.left));`;

describe('the weekly activity card on a phone', { skip: skipWithoutStyles }, () => {
    for (const box of [320, 360, 430]) {
        test(`nothing is cut off at ${box}px`, async () => {
            const { result, errors } = await screen({
                entry: entry(box), api, width: PHONE_VIEWPORT, styles: true, script: `
                    await sleep(700);
                    ${CLIPPED}
                    return { clipped, days: $$('ol li').length };` });
            assert.deepEqual(errors, []);
            assert.equal(result.days, 7, 'the whole week is there');
            assert.deepEqual(result.clipped, [], `cut off: ${result.clipped.join(' | ')}`);
        });
    }

    test("today's ring is drawn in full, not sliced by the card", async () => {
        const { result } = await screen({
            entry: entry(360), api, width: PHONE_VIEWPORT, styles: true, script: `
                await sleep(700);
                const card = document.getElementById('card');
                const cs = getComputedStyle(card);
                const right = card.getBoundingClientRect().right - parseFloat(cs.paddingRight);
                const today = $$('ol li').at(-1).querySelector('span');
                const ring = (String(getComputedStyle(today).boxShadow).match(/0px 0px 0px (\\d+(?:\\.\\d+)?)px/g) || [])
                    .reduce((a, x) => Math.max(a, parseFloat(x.split(' ')[3])), 0);
                return { label: today.innerText.trim(), ring, spare: Math.round(right - today.getBoundingClientRect().right) };` });
        assert.equal(result.label, '11', 'the last circle is today');
        assert.ok(result.ring > 0, 'today really does carry a ring');
        assert.ok(result.spare >= result.ring, `only ${result.spare}px spare for a ${result.ring}px ring`);
    });

    test('the three tiles still read in full', async () => {
        const { result } = await screen({
            entry: entry(320), api, width: PHONE_VIEWPORT, styles: true, script: `
                await sleep(700);
                const tiles = $$('div').filter((d) => /Streak|Completed|Certificates/.test(d.innerText) && d.className.includes('rounded-xl'));
                return { labels: tiles.map((t) => t.innerText.replace(/\\s+/g, ' ').trim()),
                         fits: tiles.every((t) => t.scrollWidth <= t.clientWidth + 1) };` });
        assert.deepEqual(result.labels, ['0 🔥 Streak', '0 🎓 Completed', '0 🏆 Certificates']);
        assert.ok(result.fits, 'no tile has its label clipped');
    });
});
