/**
 * Pull-to-refresh leaves popups alone.
 *
 * It only skipped a pull that started inside something scrolled down or
 * inside a role="dialog". A popup drawn in the page without that role — a
 * form, a sheet — reloaded the whole page from under the student, and what
 * they had typed went with it. Now a pull that starts on anything pinned
 * over the page (position: fixed), on a surface that takes its own touches
 * (touch-action: none), or inside [data-no-pull] is not a pull.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutChrome } from './harness.js';

const entry = `
import { useRef } from 'react';
import { createRoot } from 'react-dom/client';
import PullToRefresh from '${srcFile('components/PullToRefresh.jsx')}';
window.__refreshed = 0;
function Page() {
  const ref = useRef(null);
  return (<>
    <PullToRefresh scrollerRef={ref} onRefresh={() => { window.__refreshed += 1; }} />
    <main ref={ref} style={{ height: 600, overflow: 'auto' }}>
      <div style={{ height: 2000 }}>
        <p id="plain">The page</p>
        <div style={{ position: 'fixed', left: 0, right: 0, top: 300, background: '#fff' }}><p id="overlay">A form drawn over the page</p></div>
        <div data-no-pull><p id="opted-out">Opted out</p></div>
        <div style={{ touchAction: 'none' }}><p id="pad">A drawing pad</p></div>
      </div>
    </main>
  </>);
}
createRoot(document.getElementById('root')).render(<Page />);`;

// A finger down on `id`, dragged 220px down, and lifted.
const PULL = `
const pull = async (id) => {
  const el = document.getElementById(id);
  const at = (y) => new Touch({ identifier: 1, target: el, clientX: 100, clientY: y });
  const fire = (type, y) => el.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches: y == null ? [] : [at(y)], changedTouches: [at(y == null ? 320 : y)] }));
  fire('touchstart', 100); await sleep(20);
  for (const y of [110, 160, 220, 280, 320]) { fire('touchmove', y); await sleep(20); }
  fire('touchend', null); await sleep(500);
  return window.__refreshed;
};`;

describe('pull to refresh', { skip: skipWithoutChrome }, () => {
    test('is not set off from an overlay, an opted-out box or a touch surface — only from the page', async () => {
        const { result, errors } = await screen({
            entry, api: 'export default {};', script: `${PULL}
                await sleep(300);
                const overlay = await pull('overlay');
                const optedOut = await pull('opted-out');
                const pad = await pull('pad');
                const page = await pull('plain');
                return { overlay, optedOut, pad, page };` });
        assert.deepEqual(errors, []);
        assert.equal(result.overlay, 0, 'a pull on a popup pinned over the page');
        assert.equal(result.optedOut, 0, 'a pull inside data-no-pull');
        assert.equal(result.pad, 0, 'a pull on touch-action: none');
        assert.equal(result.page, 1, 'a pull on the page itself still refreshes');
    });
});
