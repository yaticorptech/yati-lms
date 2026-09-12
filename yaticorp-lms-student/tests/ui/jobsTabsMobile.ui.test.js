/**
 * The Jobs tab strip on a phone.
 *
 * Five tabs in one row need 760px. They used to scroll sideways, which hides
 * whichever tab is off the edge — and a tab nobody can see is a tab nobody
 * uses. They wrap onto a grid instead, and the single row returns on a wide
 * screen where it fits.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles } from './harness.js';
import { apiModule } from './fixtures.js';

const PHONE_VIEWPORT = 500;
const api = apiModule({});

const entry = (box) => `
import { createRoot } from 'react-dom/client';
import { Briefcase, Sparkles, Globe, Clock, Bookmark } from 'lucide-react';
import JobsTabs from '${srcFile('jobs/JobsTabs.jsx')}';
const TABS = [
  { id: 'jobs', label: 'Jobs', hint: 'Find Jobs', icon: Briefcase, tone: 'indigo' },
  { id: 'match', label: 'Career Match', hint: 'Smart Suggestions', icon: Sparkles, tone: 'emerald' },
  { id: 'hidden', label: 'Hidden Opportunities', hint: 'Unseen Jobs', icon: Globe, tone: 'orange' },
  { id: 'opportunities', label: 'Part-Time Jobs', hint: 'Flexible Work', icon: Clock, tone: 'sky' },
  { id: 'saved', label: 'Saved Jobs', hint: 'Your Collection', icon: Bookmark, tone: 'violet' }
];
createRoot(document.getElementById('root')).render(
  <div id="box" style={{ width: ${box}, padding: 12 }}>
    <JobsTabs tabs={TABS} active="jobs" onChange={() => {}} counts={{ saved: 3 }} />
  </div>);`;

/** Every tab, and whether any of them is drawn outside the strip. */
const MEASURE = `
    await sleep(700);
    const strip = $('nav[aria-label="Job views"]');
    const edge = strip.getBoundingClientRect();
    const tabs = $$('[role="tab"]');
    const outside = tabs.filter((t) => {
        const r = t.getBoundingClientRect();
        return r.right > edge.right + 1 || r.left < edge.left - 1;
    }).map((t) => t.innerText.replace(/\\s+/g, ' ').trim());
    const result = {
        labels: tabs.map((t) => t.innerText.replace(/\\s+/g, ' ').trim()),
        outside,
        stripScrolls: strip.scrollWidth > strip.clientWidth + 1,
        boxFits: $('#box').scrollWidth <= $('#box').clientWidth + 1,
        rows: new Set(tabs.map((t) => Math.round(t.getBoundingClientRect().top))).size
    };`;

describe('the Jobs tab strip on a phone', { skip: skipWithoutStyles }, () => {
    for (const box of [320, 360, 430]) {
        test(`all five tabs are on screen at ${box}px, none scrolled out of sight`, async () => {
            const { result, errors } = await screen({
                entry: entry(box), api, width: PHONE_VIEWPORT, styles: true,
                script: `${MEASURE} return result;` });
            assert.deepEqual(errors, []);
            assert.equal(result.labels.length, 5, 'every tab is rendered');
            assert.deepEqual(result.outside, [], `drawn outside the strip: ${result.outside.join(' | ')}`);
            assert.equal(result.stripScrolls, false, 'the strip does not scroll sideways');
            assert.ok(result.boxFits, 'and it does not widen the page');
            assert.ok(result.rows > 1, 'they wrap onto more than one row');
        });
    }

    test('every tab is still named in full, just without its subtitle', async () => {
        const { result } = await screen({
            entry: entry(360), api, width: PHONE_VIEWPORT, styles: true,
            script: `${MEASURE} return result;` });
        for (const label of ['Jobs', 'Career Match', 'Hidden Opportunities', 'Part-Time Jobs', 'Saved Jobs']) {
            assert.ok(result.labels.some((t) => t.startsWith(label)), `"${label}" should be readable, saw ${JSON.stringify(result.labels)}`);
        }
        assert.equal(result.labels.some((t) => /Smart Suggestions/.test(t)), false, 'the subtitles stand down on a phone');
        const saved = result.labels.find((t) => /Saved/.test(t));
        assert.ok(saved && saved.includes('3'), `the saved count survives, saw ${JSON.stringify(saved)}`);
    });

    test('a tab name gets the whole cell, so it does not break across lines', async () => {
        // Beside its icon the name was left a 94px column, and "Hidden
        // Opportunities" broke into two cramped lines inside it. Stacked under
        // the icon it has the full cell. 360px is the narrowest common phone.
        const LINES = `
            await sleep(700);
            return $$('[role="tab"]').map((t) => {
                const label = t.querySelector('span > span');
                const lh = parseFloat(getComputedStyle(label).lineHeight);
                return {
                    text: label.textContent.trim(),
                    lines: Math.round(label.getBoundingClientRect().height / lh),
                    width: Math.round(label.getBoundingClientRect().width)
                };
            });`;
        const { result } = await screen({ entry: entry(360), api, width: PHONE_VIEWPORT, styles: true, script: LINES });
        for (const tab of result) {
            assert.equal(tab.lines, 1, `"${tab.text}" wrapped onto ${tab.lines} lines in ${tab.width}px`);
        }
    });

    test('on a wide screen it is one row again, subtitles and all', async () => {
        const { result } = await screen({
            entry: entry("'100%'"), api, width: 1280, styles: true,
            script: `${MEASURE} return result;` });
        assert.equal(result.rows, 1, 'five across');
        assert.deepEqual(result.outside, []);
        assert.ok(result.labels.some((t) => /Smart Suggestions/.test(t)), 'the subtitles are back');
    });
});
