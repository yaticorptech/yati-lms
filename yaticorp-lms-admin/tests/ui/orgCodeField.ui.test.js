/**
 * The Organization ID box: chosen by the organization, never generated.
 *
 * On the public registration form and on the superadmin's "Add organization",
 * the ID is typed in handle style (st_agnes_college). The box tidies what is
 * typed, says straight away when it breaks a rule, asks the server whether it
 * is free, and puts "already exists" under itself — whether it learns that
 * while typing or from the server refusing the submit.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, wrap, skipWithoutChrome } from './harness.js';

// st_agnes_college is taken; race_taken is free while typing but lost on submit.
const api = `
window.__calls = [];
const reply = (data) => Promise.resolve({ data });
export default {
  get: (url, config) => {
    window.__calls.push(['GET', url, config && config.params]);
    if (url.includes('/code-available')) {
      const code = config.params.code;
      return reply(code === 'st_agnes_college'
        ? { code, available: false, message: 'That organization ID already exists. Try another.' }
        : { code, available: true, message: 'This organization ID is available.' });
    }
    if (url.includes('/organizations/types')) return reply({ types: [{ value: 'college', label: 'College' }, { value: 'school', label: 'School' }] });
    return reply({ organizations: [], totals: { all: 0, pending: 0, active: 0, rejected: 0, suspended: 0, inactive: 0 }, types: [{ value: 'school', label: 'School' }] });
  },
  post: (url, body) => {
    window.__calls.push(['POST', url, body]);
    if (body.orgCode === 'race_taken') {
      return Promise.reject({ response: { status: 409, data: { field: 'orgCode', message: 'That organization ID already exists. Try another.' } } });
    }
    return reply({ message: 'created', organization: { ...body, status: 'pending' } });
  },
  put: () => reply({}), delete: () => reply({})
};`;

const TYPE = `
  const type = (sel, value) => {
    const box = $(sel);
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(box, value);
    box.dispatchEvent(new Event('input', { bubbles: true }));
  };`;

const register = wrap('pages/RegisterOrganization.jsx', 'RegisterOrganization', { route: '/register-organization', path: '/register-organization' });
const organizations = wrap('pages/Organizations.jsx', 'Organizations', { route: '/organizations', path: '/organizations' });

describe('the Organization ID box', { skip: skipWithoutChrome }, () => {
    test('what is typed is tidied, handle style, and a free ID says so', async () => {
        const { result, errors } = await screen({ entry: register, api, script: `${TYPE}
            await sleep(400);
            type('#reg-code', '@St Agnes.2026');
            const tidied = $('#reg-code').value;
            await sleep(700);
            return { tidied, status: text($('#reg-code-status')), asked: window.__calls.filter((c) => c[1].includes('code-available')).map((c) => c[2].code) };` });
        assert.deepEqual(errors, []);
        assert.equal(result.tidied, 'st_agnes.2026', 'lowercase, no @, spaces become underscores');
        assert.match(result.status, /available/i);
        assert.deepEqual(result.asked, ['st_agnes.2026'], 'asked once, after typing pauses');
    });

    test('a taken ID says "already exists", and the form is not sent', async () => {
        const { result } = await screen({ entry: register, api, script: `${TYPE}
            await sleep(400);
            type('#reg-code', 'st_agnes_college');
            await sleep(700);
            const status = text($('#reg-code-status'));
            $('form').requestSubmit(); await sleep(300);
            return { status, after: text($('#reg-code-status')), posts: window.__calls.filter((c) => c[0] === 'POST').length };` });
        assert.match(result.status, /already exists/i);
        assert.match(result.after, /already exists/i);
        assert.equal(result.posts, 0);
    });

    test('a broken rule is said at once, without asking the server', async () => {
        const { result } = await screen({ entry: register, api, script: `${TYPE}
            await sleep(400);
            const said = [];
            for (const v of ['ab', '1234', 'a..b', 'admin']) { type('#reg-code', v); await sleep(50); said.push(text($('#reg-code-status'))); }
            return { said, asked: window.__calls.filter((c) => c[1].includes('code-available')).length };` });
        assert.match(result.said[0], /at least 3/i);
        assert.match(result.said[1], /one letter/i);
        assert.match(result.said[2], /two full stops/i);
        assert.match(result.said[3], /reserved/i);
        assert.equal(result.asked, 0);
    });

    test('the organization name offers an ID to start from', async () => {
        const { result } = await screen({ entry: register, api, script: `${TYPE}
            await sleep(400);
            type('#reg-name', "St. Agnes College");
            await sleep(100);
            const offer = [...document.querySelectorAll('button')].find((b) => /^Use @/.test(text(b)));
            const label = text(offer);
            offer.click(); await sleep(100);
            return { label, value: $('#reg-code').value };` });
        assert.equal(result.label, 'Use @st_agnes_college');
        assert.equal(result.value, 'st_agnes_college');
    });

    test("the superadmin's Add organization asks for the ID, and shows the server's 'already exists' under it", async () => {
        const { result, errors } = await screen({ entry: organizations, api, script: `${TYPE}
            await sleep(500);
            [...document.querySelectorAll('button')].find((b) => /Add Organization/.test(text(b))).click();
            await sleep(200);
            const dialog = text($('[role="dialog"]'));
            type('#org-name', 'Race College');
            type('#org-email', 'office@race.edu');
            type('#org-password', 'Passw0rd!x');
            type('#org-code', 'race_taken');
            await sleep(700);
            $('[role="dialog"] form').requestSubmit(); await sleep(400);
            const post = window.__calls.find((c) => c[0] === 'POST');
            return { dialog, sent: post && post[2].orgCode, status: text($('#org-code-status')), open: Boolean($('[role="dialog"]')) };` });
        assert.deepEqual(errors, []);
        assert.doesNotMatch(result.dialog, /generated automatically/i);
        assert.match(result.dialog, /Organization ID/);
        assert.equal(result.sent, 'race_taken');
        assert.match(result.status, /already exists/i, 'under the box, not in a banner');
        assert.equal(result.open, true, 'and the form stays open to fix it');
    });
});
