/**
 * The optional Organization ID on the signup form.
 *
 * Optional is the whole point, so the first thing checked is that leaving it
 * blank changes nothing: the account is created and the student lands on the
 * dashboard exactly as before. Then that a filled-in ID travels with the
 * registration, and that a typo in its shape is caught while the field is still
 * on screen to correct rather than after the account exists.
 *
 * The other place this is offered is the dashboard's "Add organization" button.
 * Neither is the dashboard panel they replaced.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutChrome } from './harness.js';
import { apiModule } from './fixtures.js';

const entry = `
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthContext } from '${srcFile('context/AuthContext.jsx')}';
import Signup from '${srcFile('pages/Signup.jsx')}';
const value = { user: null, setUser: () => {}, loading: false, login: () => {}, logout: () => {},
  isCreditSystemEnabled: true, isCareerPathEnabled: true, isJobsEnabled: true, isGlobalQuizEnabled: true, isRewardsEnabled: true };
createRoot(document.getElementById('root')).render(
  <AuthContext.Provider value={value}>
    <MemoryRouter initialEntries={['/signup']}>
      <Routes>
        <Route path="/signup" element={<Signup />} />
        <Route path="/" element={<h1>DASHBOARD REACHED</h1>} />
      </Routes>
    </MemoryRouter>
  </AuthContext.Provider>);`;

const CARD = { cardNumber: '123456789012', cvv: 'AB12C' };
const ACCOUNT = { token: 'tok', _id: 'u1', name: 'Asha Rao', email: 'asha@gmail.com' };

/** A registration that answers with whatever the server decided about the ID. */
const stub = (organization) => apiModule({
    '/auth/validate-qr': CARD,
    '/auth/register': organization === undefined ? ACCOUNT : { ...ACCOUNT, organization }
});

/** Walk steps 1 and 2, putting `orgCode` in the optional field. */
const FILL = (orgCode) => `
    const type = (el, v) => {
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, v);
        el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    await sleep(600);

    // Step 1 — the card, typed rather than scanned.
    click(/Type Instead/i);
    await sleep(200);
    type($$('input')[0], 'QR-123');
    await sleep(100);
    $$('button').find((b) => /Verify|Continue|Next/i.test(b.innerText))?.click();
    await sleep(500);

    // Step 2 — the details, plus the optional ID.
    type($('input[name="name"]'), 'Asha Rao');
    type($('input[name="email"]'), 'asha@gmail.com');
    type($('input[name="phone"]'), '9876543210');
    ${orgCode ? `type($('#signup-org-code'), '${orgCode}');` : ''}
    await sleep(150);
    $$('button').find((b) => /^Continue$/i.test(b.innerText.trim()))?.click();
    await sleep(500);`;

/** Step 3, and submit. */
const FINISH = `
    const pw = $$('input[type="password"]');
    type(pw[0], 'Passw0rd!x');
    type(pw[1], 'Passw0rd!x');
    await sleep(150);
    $$('button').find((b) => /Create Account/i.test(b.innerText))?.click();
    await sleep(900);`;

describe('the optional Organization ID on signup', { skip: skipWithoutChrome }, () => {
    test('the field is on the details step, and says it is optional', async () => {
        const { result, errors } = await screen({
            entry, api: stub(),
            script: `${FILL('')}
                // Back to the details step to inspect the field itself.
                $$('button').find((b) => /Back/i.test(b.innerText))?.click();
                await sleep(400);
                const field = $('#signup-org-code');
                const label = $('label[for="signup-org-code"]');
                return {
                    present: Boolean(field),
                    required: field ? field.required : null,
                    labelText: label ? label.innerText.replace(/\\s+/g, ' ').trim() : '',
                    hint: document.body.innerText.includes('You can add it later instead.'),
                    placeholder: field?.placeholder
                };
                `
        });
        assert.deepEqual(errors, []);
        assert.ok(result.present, 'the field is on the signup form');
        assert.equal(result.required, false, 'and is not required');
        assert.match(result.labelText, /Organization ID/i);
        assert.match(result.labelText, /optional/i, 'the label says so');
        assert.ok(result.hint, 'and so does the hint under it');
        assert.equal(result.placeholder, 'ABC-2026-0001');
    });

    test('left blank, signing up is exactly as it was', async () => {
        const { result, errors } = await screen({
            entry, api: stub(),
            script: `${FILL('')}${FINISH}
                const register = window.__calls.find(([m, url]) => m === 'POST' && url.includes('/auth/register'));
                return {
                    sentOrgCode: register ? register[2].orgCode : undefined,
                    reachedDashboard: /DASHBOARD REACHED/.test(document.body.innerText),
                    body: document.body.innerText.replace(/\\s+/g, ' ').trim()
                };
                `
        });
        assert.deepEqual(errors, []);
        assert.equal(result.sentOrgCode, '', 'an empty ID is sent as empty, not omitted');
        assert.ok(result.reachedDashboard, 'and the student goes straight to the dashboard');
        assert.ok(!/organization/i.test(result.body), 'with no extra screen about organizations');
    });

    test('an ID travels with the registration, and the answer is shown', async () => {
        const { result, errors } = await screen({
            entry,
            api: stub({ requested: true, orgCode: 'ORG-2026-0001', name: 'ABC College', message: 'Your request to join ABC College has been sent. They will be asked to approve you.' }),
            script: `${FILL('org-2026-0001')}${FINISH}
                const register = window.__calls.find(([m, url]) => m === 'POST' && url.includes('/auth/register'));
                const body = document.body.innerText.replace(/\\s+/g, ' ').trim();
                click(/Go to my dashboard/i);
                await sleep(500);
                return {
                    sentOrgCode: register ? register[2].orgCode : undefined,
                    body,
                    reachedDashboard: /DASHBOARD REACHED/.test(document.body.innerText)
                };
                `
        });
        assert.deepEqual(errors, []);
        assert.equal(result.sentOrgCode, 'org-2026-0001', 'whatever was typed is what is sent');
        assert.match(result.body, /Your account is ready/i);
        assert.match(result.body, /request to join ABC College has been sent/i, 'the student is told what happened');
        assert.ok(result.reachedDashboard, 'and can carry on to the dashboard');
    });

    test('an unrecognised ID still creates the account, and points at the dashboard button', async () => {
        const { result, errors } = await screen({
            entry,
            api: stub({ requested: false, orgCode: 'ORG-1999-9999', message: 'We could not find an active organization with the ID ORG-1999-9999. Your account is ready — you can add the right ID later from your dashboard.' }),
            script: `${FILL('ORG-1999-9999')}${FINISH}
                return {
                    registered: window.__calls.some(([m, url]) => m === 'POST' && url.includes('/auth/register')),
                    body: document.body.innerText.replace(/\\s+/g, ' ').trim(),
                    canContinue: $$('button').some((b) => /Go to my dashboard/i.test(b.innerText))
                };
                `
        });
        assert.deepEqual(errors, []);
        assert.ok(result.registered, 'a bad ID never costs someone their account');
        assert.match(result.body, /Your account is ready/i);
        assert.match(result.body, /could not find an active organization/i);
        assert.match(result.body, /Add organization/i, 'and it says where to try again');
        assert.ok(result.canContinue);
    });

    test('an ID of the wrong shape is caught before the account is made', async () => {
        const { result, errors } = await screen({
            entry, api: stub(),
            script: `${FILL('not-an-id')}
                return {
                    stillOnDetails: Boolean($('#signup-org-code')),
                    body: document.body.innerText.replace(/\\s+/g, ' ').trim(),
                    registered: window.__calls.some(([m, url]) => m === 'POST' && url.includes('/auth/register'))
                };
                `
        });
        assert.deepEqual(errors, []);
        assert.ok(result.stillOnDetails, 'the step does not advance');
        assert.match(result.body, /does not look right/i);
        assert.match(result.body, /leave it blank/i, 'and it reminds them the field is optional');
        assert.ok(!result.registered, 'nothing was created');
    });
});
