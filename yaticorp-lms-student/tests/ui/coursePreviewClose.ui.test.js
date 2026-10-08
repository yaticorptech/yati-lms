/**
 * The course preview's Close Tab: a browser only closes a tab a script
 * opened, so when it cannot, the button takes the student back, or home.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutChrome } from './harness.js';

// The preview fetches with its own axios, not the shared client, so the
// page is driven to its error state by pointing it at a server that is not there.
const entry = (entries) => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import CoursePreview from '${srcFile('pages/CoursePreview.jsx')}';
const Where = () => <p id="where">{useLocation().pathname}</p>;
createRoot(document.getElementById('root')).render(
  <MemoryRouter initialEntries={${JSON.stringify(entries)}} initialIndex={${entries.length - 1}}>
    <Routes><Route path="/preview/:courseId" element={<><CoursePreview /><Where /></>} /><Route path="*" element={<Where />} /></Routes>
  </MemoryRouter>);`;

// `steps`: how many pages this tab has been through, as the app's router
// records it in history.state.idx.
const press = (steps) => `
    window.history.replaceState({ idx: ${steps} }, '');
    for (let i = 0; i < 40 && !find(/Close Tab/); i += 1) await sleep(250);
    const button = find(/Close Tab/);
    const before = $('#where').innerText;
    button.click(); await sleep(500);
    return { before, after: $('#where').innerText };`;

describe('the course preview\'s Close Tab', { skip: skipWithoutChrome }, () => {
    test('goes back when there is somewhere to go back to', async () => {
        const { result, errors } = await screen({ entry: entry(['/courses', '/preview/c1?token=x']), api: 'export default {};', script: press(1) });
        assert.deepEqual(errors, []);
        assert.equal(result.before, '/preview/c1');
        assert.equal(result.after, '/courses');
    });
    test('goes home when the preview is all this tab has seen', async () => {
        const { result } = await screen({ entry: entry(['/preview/c1?token=x']), api: 'export default {};', script: press(0) });
        assert.equal(result.after, '/');
    });
});
