/**
 * My Profile, after the 2026-10-22 end-to-end test:
 *
 *   - the details shown are the server's, not only what the device saved at
 *     sign-in (an administrator's correction, another device's edit)
 *   - Edit Profile sends only what the student changed, and a refusal about
 *     one field ("An account already uses this email address") sits under
 *     that field
 *   - certificates or a resume that fail to load say so, with Try again —
 *     never "Your frame is empty" or "No resume uploaded yet"
 *   - Upload Certificate with nothing chosen asks for the file
 *   - removing your own AI key asks first
 *   - a failed avatar save keeps the server's own words
 *   - "Not now" to Google holds for the rest of the visit
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { screen, srcFile, ROOT, skipWithoutStyles } from './harness.js';
import { apiModule } from './fixtures.js';

const DESKTOP = 1280;
const SAVED = { _id: 'u1', name: 'Old Name', email: 'old@example.com', phone: '9876543210', cardNumber: '2401 0001 9664', credits: 5, xp: 315, level: 3, profilePicture: 'https://lms.example/avatars/boys/1.jpg' };
const SERVER = { ...SAVED, name: 'Corrected Name', phone: '+91 90000 00000', email: 'new@example.com' };

const routes = {
    '/user/announcements': [], '/career/notifications': [], '/jobs/notifications': [],
    '/user/profile': { user: SERVER },
    '/organizations/student/me': { member: false, organization: null, request: null },
    '/career/tasks/history': [],
    '/certificates': [],
    '/user/courses': { courses: [], bundles: [] },
    '/rewards/summary': {
        xp: 315, level: { level: 3 }, streak: { current: 0, longest: 0 }, badges: [],
        config: { levelThresholds: [0, 100, 300, 600, 1000] },
        stats: { lessons: { total: 0, thisWeek: 0 }, quizzes: { total: 0, passed: 0, thisWeek: 0 }, courses: { enrolled: 0, total: 0 }, xpThisWeek: 0 },
        series: {}
    },
    '/user/achievements': { achievements: [] },
    '/user/resume': { resume: null, ats: null }
};
// The stub, with a PUT that answers as the test says (window.__putAnswer).
const profileApi = apiModule(routes).split('export default {').join('const base = {') + `
export default { ...base, put: (url, body) => { window.__calls.push(['PUT', url, body]);
  const a = window.__putAnswer;
  return a && a.status >= 400 ? Promise.reject(Object.assign(new Error('Request failed'), { response: { status: a.status, data: a.data } }))
                              : Promise.resolve({ data: { ...${JSON.stringify(SERVER)}, ...body } }); } };`;

const profilePage = `
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '${srcFile('context/AuthContext.jsx')}';
import { RewardsProvider } from '${srcFile('context/RewardsContext.jsx')}';
import Profile from '${srcFile('pages/Profile.jsx')}';
localStorage.setItem('studentData', JSON.stringify(${JSON.stringify({ ...SAVED, token: 't0' })}));
const App = () => {
  const [user, setUser] = useState(${JSON.stringify(SAVED)});
  window.__user = user;
  return (
    <AuthContext.Provider value={{ user, setUser, isCareerPathEnabled: true, isGlobalQuizEnabled: true, isRewardsEnabled: true, isJobsEnabled: true }}>
      <RewardsProvider><MemoryRouter><Profile view="profile" /></MemoryRouter></RewardsProvider>
    </AuthContext.Provider>);
};
createRoot(document.getElementById('root')).render(<App />);`;

const TILES = `Object.fromEntries($$('[data-personal-info] dl > div').map((t) => [t.querySelector('dt').innerText.trim(), t.querySelector('dd').innerText.trim()]))`;
// React-controlled inputs take a value through the native setter and an input event.
const SET = `const setVal = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };`;
const stubs = { 'integrations/google/saveToDrive': 'export default () => Promise.resolve(null);' };

describe('My Profile shows and saves what the server has', { skip: skipWithoutStyles }, () => {
    test('details changed elsewhere replace the ones saved at sign-in, on screen and on the device', async () => {
        const { result, errors } = await screen({
            entry: profilePage, api: profileApi, styles: true, width: DESKTOP, budget: 20_000, modules: stubs, script: `
                await sleep(1500);
                return { tiles: ${TILES}, saved: JSON.parse(localStorage.getItem('studentData')) };` });
        assert.deepEqual(errors, []);
        assert.equal(result.tiles['Full Name'], 'Corrected Name');
        assert.equal(result.tiles['Phone Number'], '+91 90000 00000');
        assert.equal(result.tiles.Email.replace(/\s/g, ''), 'new@example.com');
        assert.equal(result.saved.name, 'Corrected Name', 'the device copy is brought up to date');
        assert.equal(result.saved.token, 't0', 'and keeps its token');
    });

    test('Edit Profile sends only the field the student changed', async () => {
        const { result, errors } = await screen({
            entry: profilePage, api: profileApi, styles: true, width: DESKTOP, budget: 20_000, modules: stubs, script: `
                ${SET}
                await sleep(1500);
                click(/Edit Profile/); await sleep(300);
                const filled = $('input[placeholder="Your full name"]').value;
                setVal($('input[type=tel]'), '+91 91111 22222'); await sleep(100);
                click(/Save Changes/); await sleep(500);
                const puts = window.__calls.filter((c) => c[0] === 'PUT');
                return { filled, body: puts[0] && puts[0][2], count: puts.length, toast: document.body.innerText.includes('Profile updated successfully') };` });
        assert.deepEqual(errors, []);
        assert.equal(result.filled, 'Corrected Name', 'the form opens on the server\'s details');
        assert.equal(result.count, 1);
        assert.deepEqual(result.body, { phone: '+91 91111 22222' }, 'the name and email are not sent back');
        assert.equal(result.toast, true);
    });

    test('saving with nothing changed sends nothing and closes the form', async () => {
        const { result, errors } = await screen({
            entry: profilePage, api: profileApi, styles: true, width: DESKTOP, budget: 20_000, modules: stubs, script: `
                await sleep(1500);
                click(/Edit Profile/); await sleep(300);
                click(/Save Changes/); await sleep(400);
                return { puts: window.__calls.filter((c) => c[0] === 'PUT').length, closed: !!$('[data-personal-info] dl') };` });
        assert.deepEqual(errors, []);
        assert.equal(result.puts, 0);
        assert.equal(result.closed, true);
    });

    test("another student's email is refused under the email field, not as \"Server error\"", async () => {
        const { result, errors } = await screen({
            entry: profilePage, api: profileApi, styles: true, width: DESKTOP, budget: 20_000, modules: stubs, script: `
                ${SET}
                window.__putAnswer = { status: 400, data: { field: 'email', code: 'EMAIL_TAKEN', message: 'An account already uses this email address. Use another one.' } };
                await sleep(1500);
                click(/Edit Profile/); await sleep(300);
                setVal($('input[type=email]'), 'Taken@Example.com'); await sleep(100);
                click(/Save Changes/); await sleep(500);
                const email = $('input[type=email]');
                const under = email.parentElement.querySelector('p');
                return { under: under && under.innerText, open: !$('[data-personal-info] dl'), banner: !!$('[data-personal-info] .bg-red-50'), body: document.body.innerText };` });
        assert.deepEqual(errors, []);
        assert.equal(result.under, 'An account already uses this email address. Use another one.');
        assert.equal(result.open, true, 'the form stays open to correct it');
        assert.equal(result.banner, false, 'not a banner above the form');
        assert.doesNotMatch(result.body, /Server error/);
    });

    test('a phone with letters in it is caught before saving', async () => {
        const { result, errors } = await screen({
            entry: profilePage, api: profileApi, styles: true, width: DESKTOP, budget: 20_000, modules: stubs, script: `
                ${SET}
                await sleep(1500);
                click(/Edit Profile/); await sleep(300);
                setVal($('input[type=tel]'), 'call 98765 43210'); await sleep(100);
                click(/Save Changes/); await sleep(300);
                return { message: text($('input[type=tel]').parentElement.querySelector('p')), puts: window.__calls.filter((c) => c[0] === 'PUT').length };` });
        assert.deepEqual(errors, []);
        assert.match(result.message || '', /7–15 digits/);
        assert.equal(result.puts, 0);
    });
});

describe('certificates and the resume that fail to load', { skip: skipWithoutStyles }, () => {
    // Each part on its own, as the upload test does: the full page's count-up
    // animation does not settle under the harness clock.
    const failing = (fails) => apiModule(routes).split('export default {').join('const base = {') + `
window.__tries = 0;
export default { ...base, get: (url, config) => {
  if (${JSON.stringify(fails)}.some((f) => url.includes(f)) && window.__tries++ < (window.__failTimes ?? 99)) {
    window.__calls.push(['GET', url]);
    return Promise.reject(Object.assign(new Error('Request failed'), { response: { status: 500, data: { message: 'Server error' } } }));
  }
  return base.get(url, config); } };`;
    const frame = (props = '') => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import CertificatesFrame from '${srcFile('components/CertificatesFrame.jsx')}';
window.__retried = 0;
createRoot(document.getElementById('root')).render(
  <MemoryRouter><CertificatesFrame certificates={[]} loading={false} certError={null} downloadingId={null} onDownload={() => {}} ${props} /></MemoryRouter>);`;

    test('course certificates that failed: the frame says so, with Try again', async () => {
        const { result, errors } = await screen({
            entry: frame('loadFailed={true} onRetry={() => { window.__retried++; return Promise.resolve(); }}'), api: apiModule(routes),
            styles: true, width: DESKTOP, budget: 20_000, modules: stubs, script: `
                await sleep(800);
                const body = document.body.innerText;
                click(/Try again/); await sleep(300);
                return { alert: text($('[role=alert]')), empty: /Your frame is empty/.test(body), retried: window.__retried };` });
        assert.deepEqual(errors, []);
        assert.match(result.alert || '', /could not be loaded/);
        assert.equal(result.empty, false, 'never "Your frame is empty"');
        assert.equal(result.retried, 1, 'Try again asks for them again');
    });

    test('uploaded certificates that failed: the same, and Try again brings them back', async () => {
        const { result, errors } = await screen({
            entry: frame(), api: failing(['/user/achievements']), styles: true, width: DESKTOP, budget: 20_000, modules: stubs, script: `
                window.__failTimes = 1;
                await sleep(800);
                const first = { alert: text($('[role=alert]')), empty: /Your frame is empty/.test(document.body.innerText) };
                click(/Try again/); await sleep(500);
                return { first, after: { alert: !!$('[role=alert]'), empty: /Your frame is empty/.test(document.body.innerText) } };` });
        assert.deepEqual(errors, []);
        assert.match(result.first.alert || '', /could not be loaded/);
        assert.equal(result.first.empty, false);
        assert.equal(result.after.alert, false, 'the message goes once they load');
        assert.equal(result.after.empty, true, 'and an empty frame is then truly empty');
    });

    test('Upload Certificate with nothing chosen asks for the file', async () => {
        const { result, errors } = await screen({
            entry: frame(), api: apiModule(routes), styles: true, width: DESKTOP, budget: 20_000, modules: stubs, script: `
                await sleep(600);
                click(/Upload Certificate/); await sleep(300);
                $('button[type="submit"]').click(); await sleep(300);
                return { message: text($('[aria-labelledby=cert-upload-title] [role=alert]')), posts: window.__calls.filter((c) => c[0] === 'POST').length };` });
        assert.deepEqual(errors, []);
        assert.equal(result.message, 'Choose the certificate file first.');
        assert.equal(result.posts, 0);
    });

    test('a resume that failed to load says so, not "No resume uploaded yet"', async () => {
        const entry = `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import ResumeSection from '${srcFile('components/ResumeSection.jsx')}';
createRoot(document.getElementById('root')).render(<MemoryRouter><ResumeSection /></MemoryRouter>);`;
        const { result, errors } = await screen({
            entry, api: failing(['/user/resume']), styles: true, width: DESKTOP, budget: 20_000, modules: stubs, script: `
                window.__failTimes = 1;
                await sleep(800);
                const first = { alert: text($('[role=alert]')), none: /No resume uploaded yet/.test(document.body.innerText) };
                click(/Try again/); await sleep(500);
                return { first, after: /No resume uploaded yet/.test(document.body.innerText) };` });
        assert.deepEqual(errors, []);
        assert.match(result.first.alert || '', /could not be loaded/);
        assert.equal(result.first.none, false);
        assert.equal(result.after, true, 'Try again reads it again');
    });
});

describe('small confirmations', { skip: skipWithoutStyles }, () => {
    test('Remove key asks first; Cancel keeps the key', async () => {
        const entry = `
import { createRoot } from 'react-dom/client';
import AiKeySettings from '${srcFile('components/AiKeySettings.jsx')}';
createRoot(document.getElementById('root')).render(<AiKeySettings />);`;
        const api = apiModule({ '/user/ai-key': { hasKey: true, masked: 'AIza••••3456', platformKeyAvailable: true }, '/user/jobs-access': { fullAccess: false } });
        const { result, errors } = await screen({
            entry, api, styles: true, width: DESKTOP, budget: 15_000, script: `
                await sleep(600);
                click(/Remove key/); await sleep(300);
                const asked = text($('[role=alertdialog]'));
                const deletesBefore = window.__calls.filter((c) => c[0] === 'DELETE').length;
                click(/^\\s*Cancel\\s*$/); await sleep(300);
                const afterCancel = window.__calls.filter((c) => c[0] === 'DELETE').length;
                click(/Remove key/); await sleep(300);
                $$('[role=alertdialog] button').find((b) => /Remove key/.test(b.innerText)).click(); await sleep(400);
                return { asked, deletesBefore, afterCancel, deletes: window.__calls.filter((c) => c[0] === 'DELETE').length };` });
        assert.deepEqual(errors, []);
        assert.match(result.asked || '', /Remove your AI key\?/);
        assert.equal(result.deletesBefore, 0, 'nothing removed while asking');
        assert.equal(result.afterCancel, 0, 'Cancel keeps it');
        assert.equal(result.deletes, 1, 'confirming removes it');
    });

    test("a failed avatar save keeps the server's own words; a bare \"Server error\" is put plainly", async () => {
        const files = { '/avatars/boys/1.jpg': readFileSync(path.join(ROOT, 'public', 'avatars', 'boys', '1.jpg')), '/avatars/boys/2.jpg': readFileSync(path.join(ROOT, 'public', 'avatars', 'boys', '2.jpg')) };
        const api = `
window.__calls = [];
export default {
  get: () => Promise.resolve({ data: {} }),
  put: (url, body) => { window.__calls.push(['PUT', url, body]);
    return Promise.reject(Object.assign(new Error('Request failed'), { response: { status: 500, data: { message: window.__said } } })); },
  post: () => Promise.resolve({ data: {} }), delete: () => Promise.resolve({ data: {} })
};`;
        const entry = `
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthContext } from '${srcFile('context/AuthContext.jsx')}';
import PhotoPicker from '${srcFile('components/PhotoPicker.jsx')}';
const App = () => { const [user, setUser] = useState({ _id: 'u1', name: 'A Student', profilePicture: 'https://lms.example/avatars/boys/1.jpg' });
  return <AuthContext.Provider value={{ user, setUser }}><PhotoPicker onClose={() => {}} /></AuthContext.Provider>; };
createRoot(document.getElementById('root')).render(<App />);`;
        const { result, errors } = await screen({ entry, api, files, budget: 15_000, script: `
            await sleep(800);
            window.__said = 'Your details could not be saved just now. Please try again.';
            $$('button[aria-label^="Avatar"]')[1].click(); await sleep(100);
            find(/Use this avatar/).click(); await sleep(400);
            const specific = text($('[role=dialog] [role=alert]'));
            window.__said = 'Server error';
            find(/Use this avatar/).click(); await sleep(400);
            return { specific, bare: text($('[role=dialog] [role=alert]')) };` });
        assert.deepEqual(errors, []);
        assert.equal(result.specific, 'Your details could not be saved just now. Please try again.');
        assert.equal(result.bare, 'Failed to update photo. Please try again.');
    });

    test('"Not now" to Google holds for the rest of the visit', async () => {
        const googleApi = `
export const getStatus = () => Promise.resolve({ available: true, connected: false, needsReconnect: false, email: '', permissions: [] });
export const beginConnect = () => Promise.resolve({ url: 'https://accounts.google.com/' });
export const disconnect = () => Promise.resolve({});
export const saveFile = () => Promise.resolve({});
export default {};`;
        const entry = `
import { createRoot } from 'react-dom/client';
import GoogleConsentDialog from '${srcFile('integrations/google/GoogleConsentDialog.jsx')}';
import saveToDrive from '${srcFile('integrations/google/saveToDrive.js')}';
sessionStorage.clear();
createRoot(document.getElementById('root')).render(<GoogleConsentDialog />);
window.__save = () => saveToDrive(new Blob(['x'], { type: 'application/pdf' }), { name: 'a.pdf', reason: 'So your files are kept.' });`;
        const { result, errors } = await screen({
            entry, api: apiModule({}), styles: true, width: DESKTOP, budget: 15_000, modules: { 'integrations/google/api': googleApi }, script: `
                const first = window.__save(); await sleep(400);
                const askedFirst = !!$('#google-consent-title');
                click(/Not now/); const r1 = await first; await sleep(200);
                const second = window.__save(); await sleep(400);
                const askedAgain = !!$('#google-consent-title');
                const r2 = await Promise.race([second, new Promise((ok) => setTimeout(() => ok('still waiting'), 1500))]);
                return { askedFirst, r1, askedAgain, r2 };` });
        assert.deepEqual(errors, []);
        assert.equal(result.askedFirst, true, 'the first file asks');
        assert.equal(result.r1.reason, 'declined');
        assert.equal(result.askedAgain, false, 'the next file does not ask again');
        assert.equal(result.r2.reason, 'declined', 'it simply files no copy');
    });
});
