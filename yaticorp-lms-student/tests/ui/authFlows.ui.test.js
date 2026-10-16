/**
 * Signing in and up, and the screens around them.
 *
 *   - sent to sign in because the session ended, the page says so — once
 *   - in scan mode with no card read, Access Platform says to scan first
 *     instead of sending an empty card number to the server
 *   - a link the student was heading for (?next=) is where signing in, or
 *     being signed in already, takes them
 *   - a sign-up the server refuses goes back to the step that owns the
 *     problem, with the card still verified and everything typed kept; no
 *     connection keeps them where they are; a card already registered offers
 *     signing in instead
 *   - an old Organization ID with typographic dashes is accepted, and what it
 *     led to travels to the dashboard with its reason
 *   - the profile-picture gate offers Sign out and Contact support, and stays
 *     away while an administrator is viewing the dashboard
 *   - view-as-student asks before signing out a different student, and a
 *     spent link says so
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutChrome } from './harness.js';
import { apiModule } from './fixtures.js';

const TYPE = `
    const type = (el, v) => {
        const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
        el.dispatchEvent(new Event('input', { bubbles: true }));
    };`;

/* ── Login ──────────────────────────────────────────────────────────────── */

const loginEntry = ({ user = null, pre = '', at = '/login' } = {}) => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthContext } from '${srcFile('context/AuthContext.jsx')}';
import Login from '${srcFile('pages/Login.jsx')}';
${pre}
const value = { user: ${JSON.stringify(user)}, login: (card, password, next) => { window.__login = { card, password, next };
  return Promise.resolve({ success: false, error: 'Invalid card number or password' }); } };
createRoot(document.getElementById('root')).render(
  <AuthContext.Provider value={value}>
    <MemoryRouter initialEntries={['${at}']}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/career/planner" element={<h1>PLANNER</h1>} />
        <Route path="/" element={<h1>DASHBOARD</h1>} />
      </Routes>
    </MemoryRouter>
  </AuthContext.Provider>);`;

describe('the sign-in page', { skip: skipWithoutChrome }, () => {
    test('after a session ended, it says so once', async () => {
        const { result, errors } = await screen({
            entry: loginEntry({ pre: "sessionStorage.setItem('yati:sessionEnded', '1');" }), api: apiModule({}),
            script: `await sleep(400);
                return { note: text($('[role=status]')), flagLeft: sessionStorage.getItem('yati:sessionEnded') };`
        });
        assert.deepEqual(errors, []);
        assert.equal(result.note, 'Your session has ended — please sign in again.');
        assert.equal(result.flagLeft, null, 'and only once');
    });

    test('nothing about a session on an ordinary visit', async () => {
        const { result } = await screen({ entry: loginEntry(), api: apiModule({}), script: `await sleep(300); return { note: !!$('[role=status]') };` });
        assert.equal(result.note, false);
    });

    test('in scan mode with no card read, it asks for the card instead of trying', async () => {
        const { result, errors } = await screen({
            entry: loginEntry({ at: '/login?next=%2Fcareer%2Fplanner' }), api: apiModule({}),
            script: `${TYPE} await sleep(400);
                type($('#login-password'), 'Passw0rd!x'); await sleep(50);
                find(/Access Platform/).click(); await sleep(200);
                const blocked = { alert: text($('[role=alert]')), tried: !!window.__login, focused: document.activeElement && document.activeElement.getAttribute('aria-label') };
                click(/Type Instead/); await sleep(100);
                type($('#login-card-number'), '123456789012'); await sleep(50);
                find(/Access Platform/).click(); await sleep(300);
                return { blocked, login: window.__login, alert: text($('[role=alert]')), focused: document.activeElement && document.activeElement.id };`
        });
        assert.deepEqual(errors, []);
        assert.equal(result.blocked.alert, 'Scan your card or type your card number first.');
        assert.equal(result.blocked.tried, false, 'no request with an empty card');
        assert.equal(result.blocked.focused, 'Scan your card', 'focus goes to the scanner');
        assert.deepEqual(result.login, { card: '123456789012', password: 'Passw0rd!x', next: '/career/planner' }, 'where they were heading goes with the sign-in');
        assert.equal(result.alert, 'Invalid card number or password');
        assert.equal(result.focused, 'login-password', 'back in the password box to try again');
    });

    test('every field is labelled, and the show-password button can be reached and says what it does', async () => {
        const { result } = await screen({
            entry: loginEntry(), api: apiModule({}),
            script: `await sleep(300); click(/Type Instead/); await sleep(100);
                const eye = $('button[aria-label="Show password"]');
                const before = { tab: eye.tabIndex, pressed: eye.getAttribute('aria-pressed') };
                eye.click(); await sleep(50);
                return { before, after: $('button[aria-pressed]').getAttribute('aria-label'),
                    labels: ['login-card-number', 'login-password'].map((id) => !!$('label[for="' + id + '"]')),
                    autocomplete: [$('#login-card-number').autocomplete, $('#login-password').autocomplete] };`
        });
        assert.deepEqual(result.before, { tab: 0, pressed: 'false' });
        assert.equal(result.after, 'Hide password');
        assert.deepEqual(result.labels, [true, true]);
        assert.deepEqual(result.autocomplete, ['username', 'current-password']);
    });

    test('the Forgot Password popup is a labelled dialog with a named close button', async () => {
        const { result } = await screen({
            entry: loginEntry(), api: apiModule({}),
            script: `await sleep(300); click(/Forgot password/); await sleep(150);
                const d = $('[role=dialog]');
                return { modal: d && d.getAttribute('aria-modal'), title: text(document.getElementById(d.getAttribute('aria-labelledby'))),
                         close: !!d.querySelector('button[aria-label=Close]'), label: !!$('label[for="forgot-card-number"]') };`
        });
        assert.deepEqual(result, { modal: 'true', title: 'Forgot Password', close: true, label: true });
    });

    test('signed in already, it goes on to where the student was heading', async () => {
        const { result } = await screen({
            entry: loginEntry({ user: { _id: 'u1', name: 'Asha' }, at: '/login?next=%2Fcareer%2Fplanner' }), api: apiModule({}),
            script: `await sleep(300); return text($('h1'));`
        });
        assert.equal(result, 'PLANNER');
    });

    test('and never off the site, whatever ?next= says', async () => {
        const { result } = await screen({
            entry: loginEntry({ user: { _id: 'u1', name: 'Asha' }, at: '/login?next=%2F%2Fevil.example%2Fx' }), api: apiModule({}),
            script: `await sleep(300); return text($('h1'));`
        });
        assert.equal(result, 'DASHBOARD');
    });
});

/* ── Sign up ────────────────────────────────────────────────────────────── */

const signupEntry = ({ user = null, at = '/signup' } = {}) => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthContext } from '${srcFile('context/AuthContext.jsx')}';
import Signup from '${srcFile('pages/Signup.jsx')}';
const value = { user: ${JSON.stringify(user)}, enterApp: (data, next) => { window.__entered = { data, next }; } };
createRoot(document.getElementById('root')).render(
  <AuthContext.Provider value={value}>
    <MemoryRouter initialEntries={['${at}']}>
      <Routes>
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<h1>SIGN IN PAGE</h1>} />
        <Route path="/jobs" element={<h1>JOBS</h1>} />
        <Route path="/" element={<h1>DASHBOARD</h1>} />
      </Routes>
    </MemoryRouter>
  </AuthContext.Provider>);`;

const CARD = { cardNumber: '123456789012', cvv: 'AB12C', qrCodeNumber: 'QR123' };

/** A sign-up whose registration fails the way `failure` says (source of an Error to throw). */
const failingSignup = (failure) => apiModule({}, `(url) => {
    if (url.includes('/auth/validate-qr')) return ${JSON.stringify(CARD)};
    if (url.includes('/auth/register')) { ${failure} }
    return {};
}`);
const httpError = (status, data) => `throw Object.assign(new Error('Request failed'), { response: { status: ${status}, data: ${JSON.stringify(data)} } });`;

const TO_PASSWORD = (orgCode = '') => `${TYPE}
    await sleep(500);
    click(/Type Instead/); await sleep(150);
    type($('#signup-card'), '1234 5678 9012'); await sleep(80);
    find(/Verify Card/).click(); await sleep(400);
    type($('#signup-name'), 'Asha Rao'); type($('#signup-email'), 'asha@gmail.com'); type($('#signup-phone'), '9876543210');
    ${orgCode ? `type($('#signup-org-code'), ${JSON.stringify(orgCode)});` : ''}
    await sleep(80);
    $$('button').find((b) => /^Continue$/.test(b.innerText.trim())).click(); await sleep(400);
    type($('#signup-password'), 'Passw0rd!x'); type($('#signup-confirm-password'), 'Passw0rd!x'); await sleep(80);
    find(/Create Account/).click(); await sleep(500);`;

describe('signing up', { skip: skipWithoutChrome }, () => {
    test('an email already in use goes back to the details, card still verified, the message under the email', async () => {
        const { result, errors } = await screen({
            entry: signupEntry(), api: failingSignup(httpError(400, { field: 'email', code: 'EMAIL_TAKEN', message: 'An account already uses this email address. Use another one, or sign in.' })),
            script: `${TO_PASSWORD()}
                return { onDetails: !!$('#signup-name'), card: text($$('p').find((p) => /Card verified/.test(p.innerText))?.nextElementSibling),
                    emailError: text($('#signup-email-error')), kept: [$('#signup-name').value, $('#signup-email').value, $('#signup-phone').value],
                    focused: document.activeElement && document.activeElement.id, entered: !!window.__entered };`
        });
        assert.deepEqual(errors, []);
        assert.equal(result.onDetails, true, 'back to step 2, not step 1');
        assert.equal(result.card, '123456789012', 'the verified card is kept');
        assert.match(result.emailError, /already uses this email/);
        assert.deepEqual(result.kept, ['Asha Rao', 'asha@gmail.com', '9876543210'], 'nothing typed is lost');
        assert.equal(result.focused, 'signup-email');
        assert.equal(result.entered, false);
    });

    test('with no connection it stays on the password step and says to check the connection', async () => {
        const { result, errors } = await screen({
            entry: signupEntry(), api: failingSignup(`throw new Error('Network Error');`),
            script: `${TO_PASSWORD()}
                return { onPasswords: !!$('#signup-password'), alert: text($('[role=alert]')), password: $('#signup-password').value };`
        });
        assert.deepEqual(errors, []);
        assert.equal(result.onPasswords, true);
        assert.equal(result.alert, 'Check your connection and try again.');
        assert.equal(result.password, 'Passw0rd!x', 'still filled in, ready to try again');
    });

    test('a card that already has an account offers signing in instead', async () => {
        const { result, errors } = await screen({
            entry: signupEntry(), api: failingSignup(httpError(400, { field: 'card', code: 'CARD_USED', message: 'This card already has an account. Sign in instead.' })),
            script: `${TO_PASSWORD()}
                const link = $$('[role=alert] a').find((a) => /Sign in/.test(a.innerText));
                const shown = { onCard: !!$('#signup-card') || !!find(/Verify Card/), alert: text($('[role=alert]')), link: !!link };
                link.click(); await sleep(200);
                return { ...shown, then: text($('h1')) };`
        });
        assert.deepEqual(errors, []);
        assert.equal(result.onCard, true, 'step 1: this card cannot be used');
        assert.match(result.alert, /This card already has an account — sign in instead\./);
        assert.equal(result.link, true);
        assert.equal(result.then, 'SIGN IN PAGE');
    });

    test('an old Organization ID with typographic dashes is accepted, and its outcome travels with a reason', async () => {
        const { result, errors } = await screen({
            entry: signupEntry({ at: '/signup?next=%2Fjobs' }),
            api: apiModule({ '/auth/validate-qr': CARD, '/auth/register': { token: 't', _id: 'u1', name: 'Asha Rao', organization: { requested: false, reason: 'not_found', orgCode: 'ABC-2026-0001', message: 'We could not find an active organization with the ID ABC-2026-0001.' } } }),
            script: `${TO_PASSWORD('ABC–2026—0001')}
                const register = window.__calls.find(([m, url]) => m === 'POST' && url.includes('/auth/register'));
                return { sent: register && register[2].orgCode, entered: window.__entered, carried: JSON.parse(sessionStorage.getItem('yati.signupOrg') || 'null') };`
        });
        assert.deepEqual(errors, []);
        assert.equal(result.sent, 'ABC–2026—0001', 'not refused on the client as "does not look right"');
        assert.equal(result.entered?.next, '/jobs', 'and the student goes on to where they were heading');
        assert.equal(result.carried?.reason, 'not_found', 'the dashboard knows why it was not requested');
    });

    test('signed in already, the sign-up page sends the student on', async () => {
        const { result } = await screen({
            entry: signupEntry({ user: { _id: 'u1', name: 'Asha' } }), api: apiModule({}),
            script: `await sleep(300); return text($('h1'));`
        });
        assert.equal(result, 'DASHBOARD');
    });

    test('the country code has a label of its own, and the details say what they are for', async () => {
        const { result } = await screen({
            entry: signupEntry(), api: apiModule({ '/auth/validate-qr': CARD }),
            script: `${TYPE} await sleep(400); click(/Type Instead/); await sleep(100);
                type($('#signup-card'), '123456789012'); await sleep(50); find(/Verify Card/).click(); await sleep(400);
                const details = ['signup-name', 'signup-email', 'signup-phone-code', 'signup-phone', 'signup-org-code'].map((id) => !!$('label[for="' + id + '"]'));
                return { details, autocomplete: [$('#signup-name').autocomplete, $('#signup-email').autocomplete] };`
        });
        assert.deepEqual(result.details, [true, true, true, true, true]);
        assert.deepEqual(result.autocomplete, ['name', 'email']);
    });
});

/* ── The profile-picture gate ───────────────────────────────────────────── */

const pictureApi = `
window.__calls = [];
export default {
  get: (url) => { window.__calls.push(['GET', url]); return Promise.resolve({ data: { user: { profilePicture: '' } } }); },
  put: () => Promise.resolve({ data: {} }),
  post: (url, body) => { window.__calls.push(['POST', url, body]); return Promise.resolve({ data: {} }); },
  delete: () => Promise.resolve({ data: {} })
};`;
const gate = (pre = '') => `
import { createRoot } from 'react-dom/client';
import { AuthContext } from '${srcFile('context/AuthContext.jsx')}';
import ProfilePictureGate from '${srcFile('components/ProfilePictureGate.jsx')}';
${pre}
const value = { user: { _id: 'u1', name: 'New Student', email: 'new@example.com', cardNumber: '123456789012' }, setUser: () => {}, logout: () => { window.__loggedOut = true; } };
createRoot(document.getElementById('root')).render(<AuthContext.Provider value={value}><p id="page">Dashboard</p><ProfilePictureGate /></AuthContext.Provider>);`;

describe('the profile-picture gate', { skip: skipWithoutChrome }, () => {
    test('is still compulsory, but offers Contact support and Sign out', async () => {
        const { result, errors } = await screen({
            entry: gate(), api: pictureApi,
            script: `${TYPE} await sleep(600);
                const support = find(/Contact support/);
                support.click(); await sleep(100);
                type($('#picker-support-message'), 'My photo will not upload'); await sleep(50);
                find(/Send to support/).click(); await sleep(200);
                const sent = text($('[role=dialog] [role=status]'));
                find(/Sign out/).click(); await sleep(50);
                return { picker: !!$('[role=dialog][data-required=true]'), close: !!$('[aria-label=Close]'),
                         ticket: window.__calls.find((c) => c[1] === '/tickets'), sent, loggedOut: !!window.__loggedOut };`
        });
        assert.deepEqual(errors, []);
        assert.equal(result.picker, true);
        assert.equal(result.close, false, 'still no ×');
        assert.equal(result.ticket[2].subject, 'Help adding a profile picture');
        assert.equal(result.ticket[2].email, 'new@example.com');
        assert.match(result.sent, /^Sent\./);
        assert.equal(result.loggedOut, true);
    });

    test('stays away while an administrator is viewing the dashboard', async () => {
        const { result, errors } = await screen({
            entry: gate(`localStorage.setItem('adminViewing', JSON.stringify({ by: 'Super Admin', name: 'New Student' }));`), api: pictureApi,
            script: `await sleep(600); return { picker: !!$('[role=dialog]'), asked: window.__calls.length };`
        });
        assert.deepEqual(errors, []);
        assert.equal(result.picker, false);
        assert.equal(result.asked, 0, 'not even asked');
    });
});

/* ── View as student ────────────────────────────────────────────────────── */

const adminAccess = (pre = '') => `
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import AdminAccess from '${srcFile('pages/AdminAccess.jsx')}';
${pre}
history.replaceState(null, '', location.pathname + '#code=abc123');
// StrictMode, as main.jsx mounts the app: its effects run twice in development,
// and a code that works once must still be traded only once.
createRoot(document.getElementById('root')).render(<StrictMode><MemoryRouter><AdminAccess /></MemoryRouter></StrictMode>);`;
const STUDENT = { _id: 's2', name: 'Bhagyashree', token: 'viewing-token', viewedBy: 'Super Admin' };

describe('view as student', { skip: skipWithoutChrome }, () => {
    test('trades the code, and asks before signing out a different student', async () => {
        const { result, errors } = await screen({
            entry: adminAccess(`localStorage.setItem('studentToken', 'own'); localStorage.setItem('studentData', JSON.stringify({ _id: 's1', name: 'Asha' }));`),
            api: apiModule({ '/auth/admin-access/exchange': STUDENT }),
            script: `await sleep(400);
                return { calls: window.__calls, hash: location.hash, title: text($('#admin-access-title')), body: text($('[role=dialog]')), token: localStorage.getItem('studentToken') };`
        });
        assert.deepEqual(errors, []);
        assert.deepEqual(result.calls, [['POST', '/auth/admin-access/exchange', { code: 'abc123' }]], 'once, even with the effect run twice');
        assert.equal(result.hash, '', 'the code is out of the address bar');
        assert.equal(result.title, 'Switch to Bhagyashree?');
        assert.match(result.body, /signed in as Asha/);
        assert.equal(result.token, 'own', 'nothing replaced until they say so');
    });

    test('a spent or expired link says so', async () => {
        const { result, errors } = await screen({
            entry: adminAccess(),
            api: apiModule({}, `(url) => { throw Object.assign(new Error('Gone'), { response: { status: 410, data: { message: 'This link has expired or was already used. Go back to the admin panel and press Dashboard again.' } } }); }`),
            script: `await sleep(400); return { alert: text($('[role=alert]')), token: localStorage.getItem('studentToken') };`
        });
        assert.deepEqual(errors, []);
        assert.match(result.alert, /expired or was already used/);
        assert.equal(result.token, null);
    });
});
