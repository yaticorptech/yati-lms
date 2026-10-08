/**
 * Signing up: every detail is required. Continue stays off until the name,
 * a Gmail address and a phone number are all in; Create Account stays off
 * until the password is entered and confirmed.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutChrome } from './harness.js';
import { apiModule } from './fixtures.js';

const api = apiModule({ '/auth/validate-qr': { cardNumber: '123456789012', cvv: 'AB12C', qrCodeNumber: 'QR123' } });
const entry = `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '${srcFile('context/AuthContext.jsx')}';
import Signup from '${srcFile('pages/Signup.jsx')}';
createRoot(document.getElementById('root')).render(
  <AuthContext.Provider value={{ user: null, enterApp: () => {} }}><MemoryRouter initialEntries={['/signup']}><Signup /></MemoryRouter></AuthContext.Provider>);`;

const TO_DETAILS = `
    const type = (el, v) => { Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
    const cont = () => $$('button').find((b) => /^Continue$/i.test(b.innerText.trim()));
    await sleep(600);
    click(/Type Instead/i); await sleep(200);
    type($$('input')[0], '1234 5678 9012'); await sleep(100);
    $$('button').find((b) => /Verify/i.test(b.innerText))?.click(); await sleep(500);`;

describe('signing up needs every detail', { skip: skipWithoutChrome }, () => {
    test('Continue is off until the name, Gmail address and phone number are all filled in', async () => {
        const { result, errors } = await screen({ entry, api, script: `${TO_DETAILS}
            const states = { empty: cont().disabled };
            type($('input[name="name"]'), 'Asha Rao'); await sleep(80); states.nameOnly = cont().disabled;
            type($('input[name="email"]'), 'asha@yahoo.com'); await sleep(80); states.notGmail = cont().disabled;
            type($('input[name="email"]'), 'asha@gmail.com'); await sleep(80); states.noPhone = cont().disabled;
            type($('input[name="phone"]'), '98765'); await sleep(80); states.shortPhone = cont().disabled;
            type($('input[name="phone"]'), '9876543210'); await sleep(80); states.all = cont().disabled;
            cont().click(); await sleep(400);
            return { states, onPasswords: $$('input[type="password"]').length };` });
        assert.deepEqual(errors, []);
        assert.deepEqual(result.states, { empty: true, nameOnly: true, notGmail: true, noPhone: true, shortPhone: true, all: false });
        assert.equal(result.onPasswords, 2, 'then the password step');
    });

    test('Create Account is off until the password is entered and confirmed', async () => {
        const { result, errors } = await screen({ entry, api, script: `${TO_DETAILS}
            type($('input[name="name"]'), 'Asha Rao'); type($('input[name="email"]'), 'asha@gmail.com'); type($('input[name="phone"]'), '9876543210'); await sleep(100);
            cont().click(); await sleep(400);
            const create = () => $$('button').find((b) => /Create Account/i.test(b.innerText));
            const pw = $$('input[type="password"]');
            const states = { empty: create().disabled };
            type(pw[0], 'Passw0rd!x'); await sleep(80); states.oneOnly = create().disabled;
            type(pw[1], 'Passw0rd!x'); await sleep(80); states.both = create().disabled;
            return states;` });
        assert.deepEqual(errors, []);
        assert.deepEqual(result, { empty: true, oneOnly: true, both: false });
    });
});
