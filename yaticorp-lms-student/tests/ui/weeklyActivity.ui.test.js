/**
 * The weekly activity card on a phone.
 *
 * The card is Career Path's learning-streak panel (StreakPanel) with the
 * courses and certificates the student has finished inside it
 * (WeeklyActivityCard), as the Dashboard's Weekly activity tab shows it. It
 * replaced the old strip of seven circles.
 *
 * Today's tile carries an outline, which is drawn outside the element's
 * measured box. The panel clips its own overflow, so an outline with no room
 * would be silently cut rather than making the page scroll — the checks here
 * add the outline back before comparing against the panel's edge.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles } from './harness.js';
import { apiModule } from './fixtures.js';

const PHONE_VIEWPORT = 500;
const api = apiModule({});

// The last seven days as Profile builds them (recentActivity): one active, today last.
const WEEK = ['2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13'].map((key, i) => ({
    key, label: 'WTFSSMT'[i], active: i === 5, isToday: i === 6
}));

/** The card exactly as the profile page builds it, in a box of a given width. */
const entry = (box) => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import WeeklyActivityCard from '${srcFile('components/WeeklyActivityCard.jsx')}';
createRoot(document.getElementById('root')).render(
  <MemoryRouter>
    <div style={{ width: ${box}, padding: 8 }}>
      <WeeklyActivityCard streak={3} activity={${JSON.stringify(WEEK)}} weekly={{ recent: 4, prior: 2, ahead: 2 }} careerOn completedCourses={1} certificates={1} />
    </div>
  </MemoryRouter>);`;

// The panel is the box that clips (StreakPanel's own, inside the card's section).
const PANEL = `const panel = document.querySelector('section > div');
    const ps = getComputedStyle(panel);
    const pr = panel.getBoundingClientRect();
    const outlineOf = (el) => { const s = getComputedStyle(el); return s.outlineStyle === 'none' ? 0 : parseFloat(s.outlineWidth) + Math.max(0, parseFloat(s.outlineOffset)); };`;

/**
 * Everything that spills past the panel's padding, or whose outline reaches
 * where the panel clips (its padding box: an outline may sit in the padding).
 */
const CLIPPED = `${PANEL}
    const edge = { left: pr.left + parseFloat(ps.paddingLeft), right: pr.right - parseFloat(ps.paddingRight) };
    const clip = { left: pr.left + parseFloat(ps.borderLeftWidth), right: pr.right - parseFloat(ps.borderRightWidth) };
    const clipped = [...panel.querySelectorAll('*')].filter((el) => {
        const r = el.getBoundingClientRect();
        if (!r.width || getComputedStyle(el).position === 'absolute' || el.closest('[aria-hidden="true"], [aria-hidden=""]')) return false;
        const o = outlineOf(el);
        return r.right > edge.right + 1 || r.left < edge.left - 1 || r.right + o > clip.right + 1 || r.left - o < clip.left - 1;
    }).map((el) => el.tagName.toLowerCase() + ' ' + JSON.stringify((el.innerText || '').trim().slice(0, 14))
        + ' reaches ' + Math.round(el.getBoundingClientRect().right + outlineOf(el) - edge.left) + ' of ' + Math.round(edge.right - edge.left));`;

// The figures count up and the tiles pop in: measure once they rest.
const SETTLE = 'await sleep(1500);';

describe('the weekly activity card on a phone', { skip: skipWithoutStyles }, () => {
    for (const box of [320, 360, 430]) {
        test(`nothing is cut off at ${box}px`, async () => {
            const { result, errors } = await screen({
                entry: entry(box), api, width: PHONE_VIEWPORT, styles: true, script: `
                    ${SETTLE}
                    ${CLIPPED}
                    return { clipped, days: $$('[title*="2026-10-"]').length, sideways: document.documentElement.scrollWidth > innerWidth + 1 };` });
            assert.deepEqual(errors, []);
            assert.equal(result.days, 7, 'the whole week is there');
            assert.deepEqual(result.clipped, [], `cut off: ${result.clipped.join(' | ')}`);
            assert.equal(result.sideways, false, 'the page does not scroll sideways');
        });
    }

    test("today's outline is drawn in full, not sliced by the panel", async () => {
        const { result } = await screen({
            entry: entry(320), api, width: PHONE_VIEWPORT, styles: true, script: `
                ${SETTLE}
                ${PANEL}
                const today = $$('[title*="2026-10-"]').at(-1);
                return { label: today.innerText.trim(), outline: outlineOf(today), spare: Math.round(pr.right - parseFloat(ps.borderRightWidth) - today.getBoundingClientRect().right) };` });
        assert.equal(result.label, '13', 'the last tile is today');
        assert.ok(result.outline > 0, 'today really does carry an outline');
        assert.ok(result.spare >= result.outline, `only ${result.spare}px spare for a ${result.outline}px outline`);
    });

    test('the streak and the two tiles read in full, with their figures counted up', async () => {
        const { result } = await screen({
            entry: entry(320), api, width: PHONE_VIEWPORT, styles: true, script: `
                ${SETTLE}
                const tiles = $$('section a');
                return { labels: tiles.map((t) => t.innerText.replace(/\\s+/g, ' ').trim()),
                         fits: tiles.every((t) => t.scrollWidth <= t.clientWidth + 1),
                         text: text($('section')) };` });
        assert.deepEqual(result.labels, ['🎓 1 Course completed', '🏆 1 Certificate']);
        assert.ok(result.fits, 'no tile has its label clipped');
        assert.match(result.text, /Learning streak\s*3\s*days/i);
        assert.match(result.text, /4\s*quests this week\s*— 2 ahead of last week/);
    });
});
