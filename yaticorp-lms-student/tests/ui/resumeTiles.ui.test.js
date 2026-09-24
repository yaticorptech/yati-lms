/**
 * The resume action tiles on a narrow screen.
 *
 * Each tile is a grid item, and a grid item's default `min-width: auto` is its
 * own content width — so however narrow the screen got, the tiles stayed 318px
 * and spilled over the edge with the chevron cut off. The text inside already
 * carried min-w-0; it was the tile itself that would not give way.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles } from './harness.js';
import { apiModule } from './fixtures.js';

const api = apiModule({ '/resume': { resume: { fileName: 'cv.pdf', uploadedAt: '2026-09-01T00:00:00.000Z' } } });

const entry = (width) => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import ResumeSection from '${srcFile('components/ResumeSection.jsx')}';
createRoot(document.getElementById('root')).render(
  <MemoryRouter><div id="box" style={{ width: ${width}, padding: 8 }}><ResumeSection /></div></MemoryRouter>);`;

const MEASURE = `
    await sleep(1200);
    const box = $('#box');
    const b = box.getBoundingClientRect();
    const tiles = $$('#box a, #box button').filter((t) => t.getBoundingClientRect().width > 0);
    const past = tiles
        .filter((t) => t.getBoundingClientRect().right > b.right + 1)
        .map((t) => \`"\${t.innerText.replace(/\\s+/g, ' ').trim().slice(0, 24)}" \${Math.round(t.getBoundingClientRect().right - b.right)}px over\`);
    return {
        boxWidth: Math.round(b.width),
        widest: Math.max(...tiles.map((t) => Math.round(t.getBoundingClientRect().width))),
        past,
        // Every chevron and arrow has to be inside the box, not clipped off it.
        marksCut: $$('#box a svg, #box button svg')
            .filter((s) => { const r = s.getBoundingClientRect(); return r.width > 0 && r.right > b.right + 1; }).length
    };`;

describe('the resume tiles on a narrow screen', { skip: skipWithoutStyles }, () => {
    // 240 is narrower than any phone, but it is what a page looks like when the
    // browser is zoomed well in — which is how this was found.
    for (const width of [360, 320, 280, 240]) {
        test(`they fit a ${width}px column instead of spilling over it`, async () => {
            const { result, errors } = await screen({
                entry: entry(width), api, width: 500, height: 900, styles: true, budget: 20_000, script: MEASURE });
            assert.deepEqual(errors, []);
            assert.deepEqual(result.past, [], `tiles hanging off the edge: ${result.past.join(' | ')}`);
            assert.ok(result.widest <= result.boxWidth,
                `the widest tile is ${result.widest}px in a ${result.boxWidth}px column`);
            assert.equal(result.marksCut, 0, 'and no chevron or arrow is clipped off the side');
        });
    }
});
