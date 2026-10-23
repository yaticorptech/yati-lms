/**
 * Signing up: every detail is required. Continue always answers: with a
 * detail missing or wrong it stays on the step and says what, under that
 * field, and moves to it (it used to stay switched off, with only a tooltip
 * to say why — nothing at all on a phone). Create Account stays off until the
 * password is entered and confirmed.
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
    test('Continue says what is missing, under each field, until the name, Gmail address and phone number are all in', async () => {
        const { result, errors } = await screen({ entry, api, script: `${TO_DETAILS}
            const say = () => ({ name: text($('#signup-name-error')), email: text($('#signup-email-error')), phone: text($('#signup-phone-error')),
                                 focused: document.activeElement && document.activeElement.id, onDetails: !!$('#signup-name') });
            const states = { enabled: !cont().disabled };
            cont().click(); await sleep(200); states.empty = say();
            type($('input[name="name"]'), 'Asha Rao'); await sleep(80); states.nameTyped = say();
            type($('input[name="email"]'), 'asha@yahoo.com'); cont().click(); await sleep(200); states.notGmail = say();
            type($('input[name="email"]'), 'asha@gmail.com'); type($('input[name="phone"]'), '98765'); cont().click(); await sleep(200); states.shortPhone = say();
            states.invalidMarked = $('#signup-phone').getAttribute('aria-invalid');
            type($('input[name="phone"]'), '9876543210'); await sleep(80);
            cont().click(); await sleep(400);
            return { states, onPasswords: $$('input[type="password"]').length };` });
        assert.deepEqual(errors, []);
        const { states } = result;
        assert.equal(states.enabled, true, 'Continue is never switched off');
        assert.deepEqual(states.empty, { name: 'Please enter your full name.', email: 'Please enter your email address.', phone: 'Please enter your phone number.', focused: 'signup-name', onDetails: true });
        assert.equal(states.nameTyped.name, null, 'fixing a field clears its message');
        assert.equal(states.notGmail.email, 'Only @gmail.com email addresses are allowed.');
        assert.equal(states.notGmail.focused, 'signup-email', 'and the first problem gets the focus');
        assert.equal(states.shortPhone.phone, 'Please enter a 10-digit phone number.');
        assert.equal(states.shortPhone.email, null);
        assert.equal(states.invalidMarked, 'true');
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
