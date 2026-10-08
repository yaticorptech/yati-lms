/**
 * Games & Competitions in the admin panel:
 *
 *   - the Create Competition form asks for everything the spec lists, and its
 *     buttons are Save Draft and Publish Competition
 *   - an organization's Competitions page has Take part and Host competitions;
 *     Host lists only its own, from /competitions/org/host
 *   - Take part: Register College first, then the team form
 *   - a published competition can still be edited: Edit on its card opens it
 *     with the form ready, and Save changes saves it
 *   - hosting is the platform admin's to give: a switch per organization in
 *     Organizations; without it an organization has no Host competitions tab
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, wrap, skipWithoutChrome } from './harness.js';

const OPEN = {
    id: 'c1', name: 'YATI Inter-College Ludo Championship', organizedBy: 'YATICORP', game: 'ludo', gameLabel: 'Ludo', emoji: '🎲',
    status: 'registration', phase: 'registration-open', registrationOpen: true, startsAt: '2026-10-25T04:30:00.000Z',
    registrationDeadline: '2026-10-20T12:00:00.000Z', registrationOpensAt: null, maxTeams: 25, playersPerTeam: 4, playersPerSide: 1,
    teamsPerMatch: 4, rules: 'Be fair.', prizes: [], prizeDetails: 'Trophy', certificates: true, participationCertificates: true,
    teamsCount: 3, playersCount: 12, winners: [], myTeam: null, counts: { pending: 1, approved: 2, live: 0, needsDecision: 0 }
};
const HOSTED = { ...OPEN, id: 'h1', name: 'Our College Chess Fest', game: 'chess', gameLabel: 'Chess', emoji: '♟️', status: 'draft', hostOrganizationId: 'o1' };
const DONE = { ...OPEN, id: 'c2', name: 'Old Carrom Cup', status: 'completed', phase: 'completed' };
const STUDENTS = [{ id: 's1', name: 'Student A', email: 'a@x.com' }, { id: 's2', name: 'Student B', email: 'b@x.com' }];

const api = `
window.__calls = [];
const reply = (data) => Promise.resolve({ data });
export default {
  get: (url) => { window.__calls.push(['GET', url]);
    if (url === '/competitions/org/host') return reply({ competitions: [${JSON.stringify(HOSTED)}] });
    if (url === '/competitions/org/students') return reply({ students: ${JSON.stringify(STUDENTS)} });
    if (url === '/competitions/org/hosting') return reply({ canHost: window.__canHost !== false });
    if (url === '/competitions/org/c1') return reply({ competition: ${JSON.stringify(OPEN)}, teams: [], rounds: [], myTeam: null });
    if (url === '/competitions/org') return reply({ competitions: [${JSON.stringify(OPEN)}] });
    if (url === '/competitions/admin') return reply({ competitions: [${JSON.stringify(OPEN)}, ${JSON.stringify(DONE)}] });
    if (url === '/competitions/admin/c1') return reply({ competition: ${JSON.stringify(OPEN)}, teams: [], rounds: [] });
    return reply({}); },
  post: (url, body) => { window.__calls.push(['POST', url, body]); return reply({ competition: { id: 'new1' } }); },
  put: (url, body) => { window.__calls.push(['PUT', url, body]);
    if (url === '/competitions/admin/c1') return reply({ competition: { ...${JSON.stringify(OPEN)}, ...body }, teams: [], rounds: [] });
    return reply({}); },
  delete: (url) => { window.__calls.push(['DELETE', url]); return reply({}); }
};`;

const page = (component, route, routePath, props = '', pre = '') => `
${pre}
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import Page from '${srcFile(component)}';
const Where = () => <p id="where">{useLocation().pathname}{useLocation().search}</p>;
createRoot(document.getElementById('root')).render(
  <MemoryRouter initialEntries={['${route}']}><Routes><Route path="${routePath}" element={<><Page ${props} /><Where /></>} /><Route path="*" element={<Where />} /></Routes></MemoryRouter>);`;

describe('Games & Competitions in the admin panel', { skip: skipWithoutChrome }, () => {
    test('Create Competition asks for every field, with Save Draft and Publish Competition', async () => {
        const { result, errors } = await screen({ entry: page('pages/Competitions.jsx', '/competitions', '/competitions'), api, script: `
            await sleep(600);
            click(/Create Competition/); await sleep(300);
            const form = $('form[aria-labelledby="comp-form-title"]');
            const labels = [...form.querySelectorAll('span')].map((x) => x.innerText.trim().toUpperCase());
            const buttons = [...form.querySelectorAll('button')].map((b) => b.innerText.trim());
            form.querySelector('input[maxlength="140"]').value = '';
            const name = form.querySelector('input[required][maxlength="140"]');
            const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
            setter.call(name, 'Test Cup'); name.dispatchEvent(new Event('input', { bubbles: true }));
            await sleep(100);
            [...form.querySelectorAll('button')].find((b) => /Publish Competition/.test(b.innerText)).click();
            await sleep(400);
            return { labels, buttons, posted: window.__calls.find((c) => c[0] === 'POST'), where: $('#where').innerText,
                     type: text(form) };` });
        assert.deepEqual(errors, []);
        for (const l of ['COMPETITION NAME', 'GAME', 'COMPETITION TYPE', 'COMPETITION DESCRIPTION', 'REGISTRATION START', 'REGISTRATION END', 'COMPETITION DATE', 'START TIME', 'NUMBER OF COLLEGES ALLOWED', 'PLAYERS PER TEAM', 'COMPETITION RULES', 'PRIZE DETAILS', 'COMPETITION BANNER / IMAGE']) {
            assert.ok(result.labels.some((x) => x.startsWith(l)), `the form asks for ${l}`);
        }
        assert.match(result.type, /Inter-College/);
        assert.match(result.type, /Participation certificates for everyone else/);
        assert.ok(result.buttons.includes('Save Draft'));
        assert.ok(result.buttons.includes('Publish Competition'));
        assert.equal(result.posted[1], '/competitions/admin');
        assert.equal(result.posted[2].open, true, 'Publish opens registration');
        assert.equal(result.posted[2].name, 'Test Cup');
        assert.ok(!Number.isNaN(new Date(result.posted[2].startsAt).getTime()), 'the date and start time make one moment');
        assert.equal(result.where, '/competitions/new1', 'straight into the new competition');
    });

    test('an organization: Take part and Host competitions; Host lists its own', async () => {
        const { result } = await screen({ entry: page('pages/org/OrgCompetitions.jsx', '/organization/competitions?tab=host', '/organization/competitions'), api, script: `
            await sleep(700);
            return { tabs: $$('button[aria-pressed]').map((b) => b.innerText.trim()), body: text(document.body),
                     links: $$('a').map((a) => a.getAttribute('href')), asked: window.__calls.map((c) => c[1]) };` });
        assert.deepEqual(result.tabs.slice(0, 2), ['Take part', 'Host competitions']);
        assert.match(result.body, /Competition Management/);
        assert.match(result.body, /Our College Chess Fest/);
        assert.ok(result.links.includes('/organization/competitions/host/h1'));
        assert.ok(result.asked.includes('/competitions/org/host'));
    });

    test('Take part: Register College first, then the team form with the college\'s students', async () => {
        const { result } = await screen({ entry: page('pages/org/OrgCompetitions.jsx', '/organization/competitions', '/organization/competitions'), api, script: `
            await sleep(700);
            $$('button[aria-expanded]')[0].click(); await sleep(500);
            const before = !!$('input[placeholder="e.g. St Agnes Knights"]');
            click(/Register College/); await sleep(300);
            return { before, form: !!$('input[placeholder="e.g. St Agnes Knights"]'), students: text(document.body).includes('Student A') };` });
        assert.equal(result.before, false, 'no form until Register College is pressed');
        assert.equal(result.form, true, 'then the team form');
        assert.equal(result.students, true, 'listing the college\'s own students');
    });

    test('a published competition has Edit on its card; a finished one does not', async () => {
        const { result } = await screen({ entry: page('pages/Competitions.jsx', '/competitions', '/competitions'), api, script: `
            await sleep(600);
            const edits = $$('a').filter((a) => /Edit/.test(a.innerText)).map((a) => a.getAttribute('href'));
            const opens = $$('a').map((a) => a.getAttribute('href'));
            edits.length && $$('a').find((a) => /Edit/.test(a.innerText)).click(); await sleep(200);
            return { edits, opens, where: $('#where').innerText };` });
        assert.deepEqual(result.edits, ['/competitions/c1?edit=1'], 'the open one only, not the completed one');
        assert.ok(result.opens.includes('/competitions/c1') && result.opens.includes('/competitions/c2'), 'every card still opens its competition');
        assert.equal(result.where, '/competitions/c1?edit=1');
    });

    test('opened from Edit, the published competition shows the form; Save changes saves it', async () => {
        const { result, errors } = await screen({ entry: page('pages/CompetitionAdmin.jsx', '/competitions/c1?edit=1', '/competitions/:id'), api, script: `
            await sleep(600);
            const form = $('form[aria-labelledby="comp-form-title"]');
            if (!form) return { form: false };
            const title = text(form.querySelector('#comp-form-title'));
            const name = form.querySelector('input[required][maxlength="140"]');
            const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
            setter.call(name, 'YATI Ludo Championship 2026'); name.dispatchEvent(new Event('input', { bubbles: true }));
            await sleep(100);
            [...form.querySelectorAll('button')].find((b) => /Save changes/.test(b.innerText)).click();
            await sleep(400);
            return { form: true, title, put: window.__calls.find((c) => c[0] === 'PUT'), open: !!$('form[aria-labelledby="comp-form-title"]'),
                     heading: text($('h1')), where: $('#where').innerText };` });
        assert.deepEqual(errors, []);
        assert.equal(result.form, true, 'the edit form is open straight away');
        assert.equal(result.title, 'Edit competition');
        assert.equal(result.put[1], '/competitions/admin/c1');
        assert.equal(result.put[2].name, 'YATI Ludo Championship 2026');
        assert.equal(result.open, false, 'the form closes once saved');
        assert.equal(result.heading, 'YATI Ludo Championship 2026');
        assert.equal(result.where, '/competitions/c1', 'and the link no longer reopens it');
    });

    test('an organization the platform admin has not let host: both buttons show, Host competitions cannot be clicked', async () => {
        const { result, errors } = await screen({ entry: page('pages/org/OrgCompetitions.jsx', '/organization/competitions?tab=host', '/organization/competitions', '', 'window.__canHost = false;'), api, script: `
            await sleep(700);
            const host = () => $$('button[aria-pressed]').find((b) => /Host competitions/.test(b.innerText));
            const before = { tabs: $$('button[aria-pressed]').map((b) => b.innerText.trim()), locked: host().getAttribute('aria-disabled'), title: host().title,
                             pressed: $$('button[aria-pressed="true"]').map((b) => b.innerText.trim()), note: !!$('[role=status]') };
            host().click(); await sleep(300);
            return { before, pressed: $$('button[aria-pressed="true"]').map((b) => b.innerText.trim()), note: text($('[role=status]')),
                     where: $('#where').innerText, body: text(document.body), asked: window.__calls.map((c) => c[1]) };` });
        assert.deepEqual(errors, []);
        assert.deepEqual(result.before.tabs, ['Take part', 'Host competitions'], 'both buttons, as they were');
        assert.equal(result.before.locked, 'true', 'Host competitions is locked');
        assert.match(result.before.title, /platform admin has to enable it/);
        assert.deepEqual(result.before.pressed, ['Take part'], 'even a link to the Host tab lands on Take part');
        assert.equal(result.before.note, false, 'no note until the locked button is clicked');
        assert.deepEqual(result.pressed, ['Take part'], 'clicking it does not open it');
        assert.match(result.note, /can't host competitions yet\. The platform admin has to enable it\./, 'it says why');
        assert.doesNotMatch(result.body, /Competition Management|Create Competition/);
        assert.match(result.body, /YATI Inter-College Ludo Championship/, 'Take part instead');
        assert.ok(!result.asked.includes('/competitions/org/host'), 'never asks for hosted competitions');
    });

    test('the Host competitions button follows the platform admin\'s switch while the page is open', async () => {
        const { result, errors } = await screen({ entry: page('pages/org/OrgCompetitions.jsx', '/organization/competitions', '/organization/competitions', '', 'window.__canHost = false;'), api, script: `
            const host = () => $$('button[aria-pressed]').find((b) => /Host competitions/.test(b.innerText));
            await sleep(600);
            const off = host().getAttribute('aria-disabled');
            window.__canHost = true; window.dispatchEvent(new Event('focus')); await sleep(400);
            const on = host().getAttribute('aria-disabled');
            host().click(); await sleep(400);
            const opened = { pressed: $$('button[aria-pressed="true"]')[0].innerText.trim(), management: text(document.body).includes('Competition Management') };
            window.__canHost = false; window.dispatchEvent(new Event('focus')); await sleep(400);
            return { off, on, opened, offAgain: host().getAttribute('aria-disabled'), pressedAfter: $$('button[aria-pressed="true"]').map((b) => b.innerText.trim()) };` });
        assert.deepEqual(errors, []);
        assert.equal(result.off, 'true', 'not allowed: locked');
        assert.equal(result.on, null, 'switched on: it opens up');
        assert.deepEqual(result.opened, { pressed: 'Host competitions', management: true }, 'and works');
        assert.equal(result.offAgain, 'true', 'switched off: locked again');
        assert.deepEqual(result.pressedAfter, ['Take part'], 'and the page goes back to Take part');
    });
});

/* ── The platform admin lets an organization host ─────────────────────────── */

const ORGS = [
    { _id: 'o1', name: 'ABC College', orgCode: 'ABC-2026-0001', organizationType: 'college', typeLabel: 'College', email: 'abc@x.edu', status: 'active', createdAt: '2026-09-01T00:00:00.000Z', studentCount: 3, pendingRequests: 0, courseAccess: { enabled: false, limit: 5 }, courseCount: 0, canHostCompetitions: false },
    { _id: 'o2', name: 'XYZ University', orgCode: 'XYZ-2026-0002', organizationType: 'university', typeLabel: 'University', email: 'xyz@x.edu', status: 'active', createdAt: '2026-09-02T00:00:00.000Z', studentCount: 5, pendingRequests: 0, courseAccess: { enabled: false, limit: 5 }, courseCount: 0, canHostCompetitions: true }
];
// Remembers the switch, as the server does, so the list reloaded after it agrees.
const orgsApi = `
window.__calls = [];
const orgs = ${JSON.stringify(ORGS)};
const reply = (data) => Promise.resolve({ data: JSON.parse(JSON.stringify(data)) });
export default {
  get: (url) => { window.__calls.push(['GET', url]); return reply({ organizations: orgs, totals: { all: 2, active: 2 }, types: [] }); },
  put: (url, body) => { window.__calls.push(['PUT', url, body]);
    orgs.find((o) => url.includes('/' + o._id + '/')).canHostCompetitions = body.enabled;
    return reply({ message: 'Done.', canHostCompetitions: body.enabled }); },
  post: () => reply({}), delete: () => reply({})
};`;

describe('hosting is the platform admin\'s to give', { skip: skipWithoutChrome }, () => {
    test('Organizations has a Competitions switch per organization', async () => {
        const { result, errors } = await screen({ entry: wrap('pages/Organizations.jsx', 'Organizations', { route: '/organizations', path: '/organizations' }), api: orgsApi, script: `
            await sleep(700);
            window.confirm = () => true;
            const cell = (name) => $('table button[aria-label="' + name + ' can host competitions"]');
            const before = { abc: [text(cell('ABC College')), cell('ABC College').getAttribute('aria-pressed')], xyz: [text(cell('XYZ University')), cell('XYZ University').getAttribute('aria-pressed')] };
            cell('ABC College').click(); await sleep(400);
            cell('XYZ University').click(); await sleep(400);
            return { header: $$('th').map(text).includes('Competitions'), before,
                     after: { abc: [text(cell('ABC College')), cell('ABC College').getAttribute('aria-pressed')], xyz: [text(cell('XYZ University')), cell('XYZ University').getAttribute('aria-pressed')] },
                     puts: window.__calls.filter((c) => c[0] === 'PUT'), phone: $$('ul button[aria-label$="can host competitions"]').length };` });
        assert.deepEqual(errors, []);
        assert.ok(result.header, 'a Competitions column');
        assert.deepEqual(result.before, { abc: ['Enable', 'false'], xyz: ['Can host', 'true'] });
        assert.deepEqual(result.puts, [
            ['PUT', '/organizations/admin/o1/competition-hosting', { enabled: true }],
            ['PUT', '/organizations/admin/o2/competition-hosting', { enabled: false }]
        ]);
        assert.deepEqual(result.after, { abc: ['Can host', 'true'], xyz: ['Enable', 'false'] });
        assert.equal(result.phone, 2, 'the phone cards have it too');
    });
});
