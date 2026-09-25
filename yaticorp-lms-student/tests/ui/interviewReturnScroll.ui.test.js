/**
 * Coming back to the interview dashboard lands where the student left it,
 * not on the hero at the top — by the "← Interview" link or by the browser's
 * own back — while arriving from the menu still starts at the top.
 *
 * The dashboard here stands in for the real one the way that matters: it
 * sits in the layout's scrolling <main>, and shows a short loading screen
 * before its tall content, which is what used to lose the scroll.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles } from './harness.js';

const entry = `
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useReturnScroll, markReturn } from '${srcFile('interview/scrollMemory.js')}';
sessionStorage.clear();

function Dashboard() {
  const [data, setData] = useState(null);
  useEffect(() => { const t = setTimeout(() => setData(true), 300); return () => clearTimeout(t); }, []);
  const ref = useReturnScroll(Boolean(data));
  if (!data) return <p id="loading">Checking your interview readiness…</p>;
  return (
    <div ref={ref} id="dash">
      <h1 id="hero" style={{ height: 400 }}>Hero</h1>
      {Array.from({ length: 30 }, (_, i) => <p key={i} style={{ height: 100 }}>Card {i}</p>)}
      <Link id="to-practice" to="/interview/practice">Practice</Link>
    </div>);
}
function Practice() {
  return (
    <div id="practice" style={{ height: 3000 }}>
      <Link id="back" to="/interview" onClick={markReturn}>← Interview</Link>
    </div>);
}
function Menu() { const nav = useNavigate(); window.__nav = nav; return <Link id="menu" to="/interview">Interview (menu)</Link>; }

createRoot(document.getElementById('root')).render(
  <MemoryRouter initialEntries={['/interview']}>
    <Menu />
    <main id="main" style={{ height: 600, overflow: 'auto' }}>
      <Routes>
        <Route path="/interview" element={<Dashboard />} />
        <Route path="/interview/practice" element={<Practice />} />
      </Routes>
    </main>
  </MemoryRouter>);`;

const GO_DOWN_AND_AWAY = `
    await sleep(600);
    const main = $('#main');
    main.scrollTop = 1500; main.dispatchEvent(new Event('scroll')); await sleep(100);
    $('#to-practice').click(); await sleep(200);
    main.scrollTop = 900; main.dispatchEvent(new Event('scroll')); await sleep(100);  // scrolling the practice page
`;

describe('coming back to the interview dashboard', { skip: skipWithoutStyles }, () => {
    test('the "← Interview" link returns to where the student was', async () => {
        const { result, errors } = await screen({ entry, api: 'export default {}', width: 1280, height: 800, styles: true, script: GO_DOWN_AND_AWAY + `
            $('#back').click(); await sleep(900);
            return { onDashboard: !!$('#dash'), at: $('#main').scrollTop };` });
        assert.deepEqual(errors, []);
        assert.ok(result.onDashboard);
        assert.ok(Math.abs(result.at - 1500) <= 2, `back at 1500, not ${result.at}`);
    });

    test("the browser's own back does the same", async () => {
        const { result } = await screen({ entry, api: 'export default {}', width: 390, height: 800, styles: true, script: GO_DOWN_AND_AWAY + `
            window.__nav(-1); await sleep(900);
            return { onDashboard: !!$('#dash'), at: $('#main').scrollTop };` });
        assert.ok(result.onDashboard);
        assert.ok(Math.abs(result.at - 1500) <= 2, `back at 1500, not ${result.at}`);
    });

    test('arriving from the menu still starts at the top', async () => {
        const { result } = await screen({ entry, api: 'export default {}', width: 1280, height: 800, styles: true, script: GO_DOWN_AND_AWAY + `
            $('#main').scrollTop = 0;
            $('#menu').click(); await sleep(900);
            return { onDashboard: !!$('#dash'), at: $('#main').scrollTop };` });
        assert.ok(result.onDashboard);
        assert.equal(result.at, 0);
    });
});
