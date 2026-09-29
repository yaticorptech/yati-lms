/**
 * The phone's bottom bar: all seven sections fit, Career Path right after
 * Courses, and My Profile is not in it.
 *
 * Seven cells share a floating bar that is 344px wide on the narrowest phone
 * we support, so each cell is about 49px. The short labels are written to fit
 * that; a label that grows, or an eighth item, would cut a word or run two
 * together, and nothing else on the page would notice.
 *
 * Measured at true phone widths. Headless Chrome will not open a window under
 * 500px, so these run through the harness's device mode.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles, DEVICES } from './harness.js';

const entry = `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import MobileBottomNav from '${srcFile('components/MobileBottomNav.jsx')}';
createRoot(document.getElementById('root')).render(
  <MemoryRouter initialEntries={['/career']}><MobileBottomNav isJobsEnabled isCareerPathEnabled /></MemoryRouter>
);`;

const measure = `
    // Let the active item's pop animation settle.
    await new Promise((r) => setTimeout(r, 600));
    const links = [...document.querySelectorAll('nav a')];
    const labels = links.map((a) => a.querySelector('span.whitespace-nowrap'));
    const boxes = labels.map((l) => l.getBoundingClientRect());
    const bar = document.querySelector('nav > div').getBoundingClientRect();
    return {
        vw: innerWidth,
        items: links.map((a, i) => ({ href: a.getAttribute('href'), label: labels[i].textContent, current: a.getAttribute('aria-current') })),
        gaps: boxes.slice(1).map((b, i) => b.left - boxes[i].right),
        firstLeft: boxes[0].left, lastRight: boxes.at(-1).right, barLeft: bar.left, barRight: bar.right,
        pageScrolls: document.documentElement.scrollWidth > innerWidth
    };`;

const PHONES = ['galaxyZFold6Folded', 'galaxyA55', 'pixel9', 'iPhone16ProMax'];

describe('phone bottom bar', { skip: skipWithoutStyles }, () => {
    for (const name of PHONES) {
        test(`${name} (${DEVICES[name].width}px): Career after Courses, seven labels whole and apart`, async () => {
            const { result, errors } = await screen({ entry, api: 'export default {};', styles: true, device: DEVICES[name], script: measure });
            assert.deepEqual(errors, []);
            assert.equal(result.vw, DEVICES[name].width, 'the page is laid out at the phone\'s width');

            assert.deepEqual(result.items.map((i) => i.label),
                ['Home', 'Courses', 'Career', 'Forum', 'Jobs', 'Grants', 'Interview']);
            assert.ok(!result.items.some((i) => i.href === '/profile'), 'My Profile is not in the bar');
            assert.equal(result.items[2].href, '/career');
            assert.equal(result.items[2].current, 'page', 'Career Path is marked as the page you are on');

            // A gap at or below zero means two words touch or overlap.
            assert.ok(Math.min(...result.gaps) > 2, `closest labels are ${Math.min(...result.gaps).toFixed(1)}px apart`);
            assert.ok(result.firstLeft >= result.barLeft && result.lastRight <= result.barRight, 'every label sits inside the bar');
            assert.equal(result.pageScrolls, false, 'the bar does not widen the page');
        });
    }
});
