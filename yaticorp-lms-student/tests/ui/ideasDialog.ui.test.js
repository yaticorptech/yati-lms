/**
 * Career Path → Ideas: every tile opens its list in a dialog in the middle of
 * the screen, over a dimmed page — on a phone too, where it used to be a sheet
 * pinned to the bottom edge with the page showing through undimmed.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles } from './harness.js';

const ROADMAP = {
    roadmapData: {
        skills: { technical: ['Navigation', 'Meteorology'], soft: ['Calm communication'], life: ['Discipline'] },
        subjects: ['Physics', 'Mathematics'],
        careerTips: [
            'Maintain immaculate physical health and 6/6 vision.',
            'Focus heavily on Physics and Mathematics during ICSE and ISC.',
            'Start financial planning early with your family.',
            'Develop calm and clear communication skills.'
        ]
    }
};

const entry = `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import api from '${srcFile('career/services/api.js')}';
import { AuthContext } from '${srcFile('career/context/AuthContext.jsx')}';
import { ToastProvider } from '${srcFile('career/components/ui/Toast.jsx')}';
import Recommendations from '${srcFile('career/pages/dashboard/Recommendations.jsx')}';
// No server: the career client answers from here.
api.defaults.adapter = async (config) => {
  const url = config.url || '';
  const data = url.includes('/roadmap') ? ${JSON.stringify(ROADMAP)} : url.includes('/badges') ? [] : { categories: [] };
  return { data, status: 200, statusText: 'OK', headers: {}, config };
};
createRoot(document.getElementById('root')).render(
  <MemoryRouter>
    <AuthContext.Provider value={{ user: { name: 'Hari Kiran', level: 3, xp: 335 } }}>
      <ToastProvider><Recommendations /></ToastProvider>
    </AuthContext.Provider>
  </MemoryRouter>
);`;
const api = 'export default {}';

const OPEN = (tile) => `
    await sleep(1500);
    const tile = $$('button, a').find((el) => el.innerText.includes(${JSON.stringify(tile)}));
    tile.click(); await sleep(400);
    const dialog = $$('[role=dialog]').pop();
    const panel = dialog.children[1].getBoundingClientRect();
    const backdrop = getComputedStyle(dialog.children[0]).backgroundColor;
    return {
        title: dialog.getAttribute('aria-label'),
        top: panel.top, bottom: panel.bottom, left: panel.left, right: panel.right,
        vw: window.innerWidth, vh: window.innerHeight,
        backdrop, body: text(dialog)
    };`;

describe('the Ideas dialogs', { skip: skipWithoutStyles }, () => {
    test('on a phone, a tile opens in the middle of the screen over a dimmed page', async () => {
        const { result, errors } = await screen({ entry, api, styles: true, width: 390, height: 844, script: OPEN('Advice worth keeping') });
        assert.deepEqual(errors, []);
        assert.equal(result.title, 'Advice worth keeping');
        const middle = (result.top + result.bottom) / 2;
        assert.ok(Math.abs(middle - result.vh / 2) < 2, `centred (${middle} vs ${result.vh / 2})`);
        assert.ok(result.top > 0 && result.bottom < result.vh, 'clear of the top and bottom edges');
        assert.ok(result.left > 0 && result.right < result.vw, 'with a margin at the sides');
        assert.notEqual(result.backdrop, 'rgba(0, 0, 0, 0)', 'the page behind is dimmed');
        assert.match(result.body, /6\/6 vision/);
    });

    test('a long list still fits: the dialog scrolls inside itself', async () => {
        const { result } = await screen({ entry, api, styles: true, width: 390, height: 600, script: OPEN('Skills to build') });
        assert.equal(result.title, 'Skills to build');
        assert.ok(result.top > 0 && result.bottom < result.vh);
    });

    test('on a laptop it is centred as before', async () => {
        const { result } = await screen({ entry, api, styles: true, width: 1280, height: 900, script: OPEN('Advice worth keeping') });
        const middle = (result.top + result.bottom) / 2;
        assert.ok(Math.abs(middle - result.vh / 2) < 2);
    });
});
