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
import { screen, srcFile, wrap, skipWithoutChrome, skipWithoutStyles } from './harness.js';

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
    test('on a phone the competition form is one popup that fits the screen, and scrolls inside', { skip: skipWithoutStyles }, async () => {
        const { result, errors } = await screen({ entry: page('pages/Competitions.jsx', '/competitions', '/competitions'), api, styles: true, width: 390, height: 800, script: `
            await sleep(600);
            click(/Create Competition/); await sleep(300);
            const form = $('form[aria-labelledby="comp-form-title"]');
            const r = form.getBoundingClientRect();
            const body = form.children[1], publish = [...form.querySelectorAll('button')].find((b) => /Publish Competition/.test(b.innerText));
            const p = publish.getBoundingClientRect();
            return { top: r.top, below: innerHeight - r.bottom, scrolls: getComputedStyle(body).overflowY, long: body.scrollHeight > body.clientHeight,
                     publishOnScreen: p.top >= r.top && p.bottom <= r.bottom, pageScrolls: document.documentElement.scrollHeight > innerHeight + 1 };` });
        assert.deepEqual(errors, []);
        assert.ok(result.top >= 16 && result.below >= 16, `the whole popup is on screen, with room round it (${Math.round(result.top)}px, ${Math.round(result.below)}px)`);
        assert.equal(result.scrolls, 'auto');
        assert.equal(result.long, true, 'the long form scrolls inside the popup');
        assert.equal(result.publishOnScreen, true, 'Publish Competition is in view without scrolling');
        assert.equal(result.pageScrolls, false, 'the page behind does not scroll');
    });

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

    test('every competition card has Delete; it asks first, saying what goes with it', async () => {
        const { result, errors } = await screen({ entry: page('pages/Competitions.jsx', '/competitions', '/competitions'), api, script: `
            await sleep(600);
            const dels = $$('button').filter((b) => /Delete/.test(b.innerText));
            const asked = [];
            window.confirm = (q) => { asked.push(q); return asked.length > 1; };
            dels[0].click(); await sleep(200);
            const onNo = window.__calls.filter((c) => c[0] === 'DELETE').length;
            dels[0].click(); await sleep(400);
            return { count: dels.length, asked, onNo, deleted: window.__calls.filter((c) => c[0] === 'DELETE').map((c) => c[1]),
                     reads: window.__calls.filter((c) => c[0] === 'GET' && c[1] === '/competitions/admin').length, where: $('#where').innerText };` });
        assert.deepEqual(errors, []);
        assert.equal(result.count, 2, 'an open one and a finished one alike');
        assert.match(result.asked[0], /Delete "YATI Inter-College Ludo Championship" for good\? Students will no longer see it/);
        assert.match(result.asked[0], /3 teams are registered for it; they go too/);
        assert.equal(result.onNo, 0, 'nothing deleted on Cancel');
        assert.deepEqual(result.deleted, ['/competitions/admin/c1']);
        assert.equal(result.reads, 2, 'then the list is read again');
        assert.equal(result.where, '/competitions', 'and the card did not open the competition');
    });

    test('an open competition\'s page has Delete too, back to the list after', async () => {
        const { result, errors } = await screen({ entry: page('pages/CompetitionAdmin.jsx', '/competitions/c1', '/competitions/:id'), api, script: `
            await sleep(600);
            let asked = '';
            window.confirm = (q) => { asked = q; return true; };
            [...document.querySelector('header').querySelectorAll('button')].find((b) => /Delete/.test(b.innerText)).click(); await sleep(400);
            return { asked, deleted: window.__calls.filter((c) => c[0] === 'DELETE').map((c) => c[1]), where: $('#where').innerText };` });
        assert.deepEqual(errors, []);
        assert.match(result.asked, /This cannot be undone/);
        assert.deepEqual(result.deleted, ['/competitions/admin/c1']);
        assert.equal(result.where, '/competitions');
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
                     puts: window.__calls.filter((c) => c[0] === 'PUT') };` });
        assert.deepEqual(errors, []);
        assert.ok(result.header, 'a Competitions column');
        assert.deepEqual(result.before, { abc: ['Enable', 'false'], xyz: ['Can host', 'true'] });
        assert.deepEqual(result.puts, [
            ['PUT', '/organizations/admin/o1/competition-hosting', { enabled: true }],
            ['PUT', '/organizations/admin/o2/competition-hosting', { enabled: false }]
        ]);
        assert.deepEqual(result.after, { abc: ['Can host', 'true'], xyz: ['Enable', 'false'] });
        // Below 768px the page draws cards instead of the table (useMediaQuery),
        // so the phone's switch is looked for at a phone's width.
        const phone = await screen({ entry: wrap('pages/Organizations.jsx', 'Organizations', { route: '/organizations', path: '/organizations' }), api: orgsApi, width: 390, height: 900, script: `
            await sleep(700);
            return { table: !!$('table button[aria-label$="can host competitions"]'), cards: $$('ul button[aria-label$="can host competitions"]').length };` });
        assert.deepEqual(phone.errors, []);
        assert.deepEqual(phone.result, { table: false, cards: 2 }, 'the phone cards have it too');
    });
});

describe('a competition past its registration deadline', { skip: skipWithoutChrome }, () => {
    // Saved as open for registration (no one closed it or drew the matches),
    // but its deadline has passed: the server's phase is 'upcoming'.
    const PAST = { ...OPEN, id: 'p1', name: 'Past Deadline Cup', phase: 'upcoming', registrationOpen: false };
    const SOON = { ...OPEN, id: 's1', name: 'Opens Soon Cup', phase: 'registration-soon', registrationOpen: false };
    const pastApi = `
window.__calls = [];
const reply = (data) => Promise.resolve({ data });
export default {
  get: (url) => { window.__calls.push(['GET', url]);
    if (url === '/competitions/admin') return reply({ competitions: [${JSON.stringify(PAST)}, ${JSON.stringify(SOON)}, ${JSON.stringify(OPEN)}] });
    if (url === '/competitions/org') return reply({ competitions: [${JSON.stringify(PAST)}] });
    if (url === '/competitions/org/hosting') return reply({ canHost: false });
    if (url === '/competitions/admin/p1') return reply({ competition: ${JSON.stringify(PAST)}, teams: [], rounds: [] });
    return reply({}); },
  post: () => Promise.resolve({ data: {} }), put: () => Promise.resolve({ data: {} }), delete: () => Promise.resolve({ data: {} })
};`;
    const chips = `[...document.querySelectorAll('span.rounded-full')].map((s) => s.innerText.trim())`;

    test('reads "Registration closed" for the admin and the college, as it does for students', async () => {
        const list = await screen({ entry: page('pages/Competitions.jsx', '/competitions', '/competitions'), api: pastApi, script: `
            await sleep(600);
            const card = (name) => [...document.querySelectorAll('article, li, a, div')].filter((e) => e.innerText && e.innerText.includes(name)).sort((a, b) => a.innerText.length - b.innerText.length)[0];
            const chipOf = (name) => { let el = card(name); while (el && !el.querySelector('span.rounded-full')) el = el.parentElement; return [...el.querySelectorAll('span.rounded-full')].map((s) => s.innerText.trim()); };
            return { past: chipOf('Past Deadline Cup'), soon: chipOf('Opens Soon Cup'), open: chipOf('YATI Inter-College Ludo Championship') };` });
        assert.deepEqual(list.errors, []);
        assert.ok(list.result.past.includes('Registration closed'), `admin list: ${list.result.past}`);
        assert.ok(!list.result.past.includes('Registration open'));
        assert.ok(list.result.soon.includes('Registration opens soon'), `admin list: ${list.result.soon}`);
        assert.ok(list.result.open.includes('Registration open'), 'one still open says so');

        const detail = await screen({ entry: page('pages/CompetitionAdmin.jsx', '/competitions/p1', '/competitions/:id'), api: pastApi, script: `await sleep(600); return ${chips};` });
        assert.deepEqual(detail.errors, []);
        assert.ok(detail.result.includes('Registration closed'), `admin page: ${detail.result}`);

        const college = await screen({ entry: page('pages/org/OrgCompetitions.jsx', '/organization/competitions', '/organization/competitions'), api: pastApi, script: `await sleep(800); return ${chips};` });
        assert.deepEqual(college.errors, []);
        assert.ok(college.result.includes('Registration closed'), `college page: ${college.result}`);
        assert.ok(!college.result.includes('Registration open'));
    });
});

describe('a round with an odd number of teams', { skip: skipWithoutChrome }, () => {
    // Three teams: Alpha plays Delta, Gamma has nobody to play (a bye).
    const BYE_CUP = { ...OPEN, id: 'b1', name: 'Bye Cup', game: 'chess', status: 'live', phase: 'live', registrationOpen: false, playersPerTeam: 1, teamsPerMatch: 2 };
    const side = (id, name) => ({ teamId: id, teamName: name, collegeName: `${name} College`, lineup: [] });
    const MATCHES = [
        { id: 'm1', roundName: 'Semi Final', kind: 'main', slot: 0, status: 'scheduled', scheduledAt: '2026-10-14T07:28:00.000Z', sides: [side('t1', 'Alpha'), side('t2', 'Delta')], winnerTeamId: null, games: 0 },
        { id: 'm2', roundName: 'Semi Final', kind: 'main', slot: 1, status: 'bye', scheduledAt: '2026-10-14T07:28:00.000Z', sides: [side('t3', 'Gamma')], winnerTeamId: 't3', decidedBy: 'bye', games: 0 }
    ];
    const GAMMA = { id: 't3', teamName: 'Gamma', status: 'approved', note: '', players: [{ userId: 's1', name: 'Student A' }] };
    const byeApi = `
const reply = (data) => Promise.resolve({ data });
const rounds = [{ round: 0, name: 'Semi Final', matches: ${JSON.stringify(MATCHES)} }];
export default {
  get: (url) => {
    if (url === '/competitions/org') return reply({ competitions: [{ ...${JSON.stringify(BYE_CUP)}, myTeam: ${JSON.stringify(GAMMA)} }] });
    if (url === '/competitions/org/b1') return reply({ competition: ${JSON.stringify(BYE_CUP)}, teams: [], rounds, myTeam: ${JSON.stringify(GAMMA)} });
    if (url === '/competitions/org/hosting') return reply({ canHost: false });
    if (url === '/competitions/admin/b1') return reply({ competition: ${JSON.stringify(BYE_CUP)}, teams: [], rounds });
    return reply({}); },
  post: () => reply({}), put: () => reply({}), delete: () => reply({})
};`;

    test('the college whose team has the bye is told it goes through, not that it won a match', async () => {
        const { result, errors } = await screen({ entry: page('pages/org/OrgCompetitions.jsx', '/organization/competitions', '/organization/competitions'), api: byeApi, script: `
            await sleep(600);
            const head = document.querySelector('section button[aria-expanded]');
            const card = head.innerText;
            head.click(); await sleep(600);
            return { card, matches: document.querySelector('h3 + div').innerText };` });
        assert.deepEqual(errors, []);
        assert.match(result.card, /up to 1 player(?!s)/, 'one player, not "1 players"');
        assert.match(result.matches, /goes straight to the next round/);
        assert.doesNotMatch(result.matches, /won/);
        assert.doesNotMatch(result.matches, /2026/, 'no time on a match nobody plays');
    });

    test('a match that needs the organizer\'s decision has no "Watch the game" link: its game is over', async () => {
        const stuck = { ...MATCHES[0], status: 'live', gameId: 'g1', games: 1, needsDecision: true, resultNote: 'Nobody joined the game. The organizer will decide this match.' };
        const stuckApi = byeApi.replace(JSON.stringify(MATCHES), JSON.stringify([stuck, MATCHES[1]]));
        assert.notEqual(stuckApi, byeApi, 'the stuck match was put in');
        const { result, errors } = await screen({ entry: page('pages/CompetitionAdmin.jsx', '/competitions/b1', '/competitions/:id'), api: stuckApi, script: `
            await sleep(600);
            [...document.querySelectorAll('button')].find((b) => /Matches & rounds/.test(b.innerText)).click(); await sleep(400);
            const card = [...document.querySelectorAll('article')].find((a) => /Delta/.test(a.innerText));
            return { text: card.innerText, watch: [...card.querySelectorAll('a')].some((a) => /Watch the game/.test(a.innerText)) };` });
        assert.deepEqual(errors, []);
        assert.match(result.text, /Needs your decision/);
        assert.match(result.text, /Decide this match myself/, 'the way to settle it is there');
        assert.equal(result.watch, false);
    });

    test('the organizer sees the bye with no match time, and the real match with its time', async () => {
        const { result, errors } = await screen({ entry: page('pages/CompetitionAdmin.jsx', '/competitions/b1', '/competitions/:id'), api: byeApi, script: `
            await sleep(600);
            const header = document.querySelector('header').innerText;
            [...document.querySelectorAll('button')].find((b) => /Matches & rounds/.test(b.innerText)).click(); await sleep(400);
            const cards = [...document.querySelectorAll('article')];
            return { header, bye: cards.find((a) => /Bye/.test(a.innerText))?.innerText, match: cards.find((a) => /Delta/.test(a.innerText))?.innerText };` });
        assert.deepEqual(errors, []);
        assert.match(result.header, /up to 1 player each/);
        assert.match(result.bye, /goes straight through/);
        assert.doesNotMatch(result.bye, /Scheduled/);
        assert.match(result.match, /Match time/, 'the real match can still be timed');
    });
});

describe('a college\'s own competition', { skip: skipWithoutChrome }, () => {
    // Only its students see it; the college makes the teams from them.
    const OWN = { ...OPEN, id: 'h2', name: 'Delta Chess Day', organizedBy: 'Sample Delta College', game: 'chess', gameLabel: 'Chess', emoji: '♟️', hostOrganizationId: 'o1', playersPerTeam: 2, playersPerSide: 1, teamsPerMatch: 2, maxTeams: 8 };
    const REDS = { id: 't1', teamName: 'Reds', collegeName: 'Sample Delta College', organizationId: 'o1', status: 'approved', note: '', place: null, coordinator: { name: 'Delta Coordinator' },
        players: [{ userId: 's1', name: 'Student A' }, { userId: 's2', name: 'Student B' }] };
    const PUPILS = ['A', 'B', 'C', 'D'].map((x, i) => ({ id: `s${i + 1}`, name: `Student ${x}`, email: `${x.toLowerCase()}@x.com`, cardNumber: '' }));
    const ownApi = `
window.__calls = [];
const reply = (data) => Promise.resolve({ data });
const detail = (teams) => ({ competition: ${JSON.stringify(OWN)}, teams, rounds: [] });
export default {
  get: (url) => { window.__calls.push(['GET', url]);
    if (url === '/competitions/org/host/h2') return reply(detail([${JSON.stringify(REDS)}]));
    if (url === '/competitions/admin/h2') return reply({ ...detail([${JSON.stringify(REDS)}]), competition: { ...${JSON.stringify(OWN)}, organizedBy: 'Delta Chess Club', hostName: 'Sample Delta College' } });
    if (url === '/competitions/org/host/h2/students') return reply({ students: ${JSON.stringify(PUPILS)} });
    if (url === '/competitions/org/host') return reply({ competitions: [] });
    if (url === '/competitions/org/hosting') return reply({ canHost: true });
    return reply({}); },
  post: (url, body) => { window.__calls.push(['POST', url, body]);
    return reply(detail([${JSON.stringify(REDS)}, { ...${JSON.stringify(REDS)}, id: 't2', teamName: body.teamName, players: body.players.map((userId) => ({ userId, name: userId })) }])); },
  patch: (url, body) => { window.__calls.push(['PATCH', url, body]); return reply(detail([${JSON.stringify(REDS)}])); },
  put: () => reply({}), delete: (url) => { window.__calls.push(['DELETE', url]); return reply(detail([])); }
};`;
    const hostPage = () => page('pages/CompetitionAdmin.jsx', '/organization/competitions/host/h2', '/organization/competitions/host/:id', 'apiBase="/competitions/org/host"');

    test('Teams: the college\'s own teams, with Edit and Remove — nothing to approve', async () => {
        const { result, errors } = await screen({ entry: hostPage(), api: ownApi, script: `
            await sleep(600);
            const card = $('[data-team="t1"]');
            return { tabs: $$('button').map((b) => b.innerText.trim()).filter((t) => /^(Teams|Registrations)/.test(t)), card: text(card),
                     buttons: [...card.querySelectorAll('button')].map((b) => b.innerText.trim()), intro: text(document.body) };` });
        assert.deepEqual(errors, []);
        assert.deepEqual(result.tabs.map((t) => t.replace(/\d+$/, '').trim()), ['Teams']);
        assert.match(result.intro, /Only Sample Delta College's students see this competition/);
        assert.match(result.card, /Reds/);
        assert.match(result.card, /Student A, Student B/);
        assert.deepEqual(result.buttons, ['Edit team', 'Remove']);
    });

    test('Add a team: pick from the college\'s students, in playing order; one already in a team cannot be picked twice', async () => {
        const { result, errors } = await screen({ entry: hostPage(), api: ownApi, script: `
            await sleep(600);
            click(/Add a team/); await sleep(500);
            const form = $('[data-team-maker]');
            const pupil = (name) => [...form.querySelectorAll('li button')].find((b) => b.innerText.includes(name));
            const taken = { disabled: pupil('Student A').disabled, says: text(pupil('Student A')) };
            pupil('Student D').click(); await sleep(50); pupil('Student C').click(); await sleep(50);
            const order = [text(pupil('Student D')).trim()[0], text(pupil('Student C')).trim()[0]];
            const name = form.querySelector('input[maxlength="80"]');
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(name, 'Blues');
            name.dispatchEvent(new Event('input', { bubbles: true })); await sleep(100);
            [...form.querySelectorAll('button')].find((b) => /Add team/.test(b.innerText)).click(); await sleep(400);
            return { taken, order, posted: window.__calls.find((c) => c[0] === 'POST'), formGone: !$('[data-team-maker]'), blues: !!$('[data-team="t2"]') };` });
        assert.deepEqual(errors, []);
        assert.equal(result.taken.disabled, true, 'Student A is in Reds');
        assert.match(result.taken.says, /In Reds/);
        assert.deepEqual(result.order, ['1', '2'], 'numbered in the order picked');
        assert.equal(result.posted[1], '/competitions/org/host/h2/teams');
        assert.deepEqual(result.posted[2], { teamName: 'Blues', players: ['s4', 's3'] });
        assert.equal(result.formGone, true);
        assert.equal(result.blues, true, 'the new team is listed');
    });

    test('the platform admin sees the college by name — never "your college", which it is not', async () => {
        const { result, errors } = await screen({ entry: page('pages/CompetitionAdmin.jsx', '/competitions/h2', '/competitions/:id'), api: ownApi, script: `
            await sleep(600);
            const intro = text(document.body);
            [...document.querySelector('header').querySelectorAll('button')].find((b) => /Edit/.test(b.innerText)).click(); await sleep(300);
            const form = text($('form[aria-labelledby="comp-form-title"]'));
            return { intro, form };` });
        assert.deepEqual(errors, []);
        assert.match(result.intro, /Only Sample Delta College's students see this competition\. The college makes the teams/);
        assert.doesNotMatch(result.intro, /your students/);
        assert.match(result.form, /Sample Delta College only/);
        assert.match(result.form, /Only Sample Delta College's students see it\. The college makes the teams from them/);
        assert.doesNotMatch(result.form, /Your college only|Only your students/);
    });

    test('the college itself still reads "Your college only" in its edit form', async () => {
        const { result, errors } = await screen({ entry: hostPage(), api: ownApi, script: `
            await sleep(600);
            [...document.querySelector('header').querySelectorAll('button')].find((b) => /Edit/.test(b.innerText)).click(); await sleep(300);
            return text($('form[aria-labelledby="comp-form-title"]'));` });
        assert.deepEqual(errors, []);
        assert.match(result, /Your college only/);
        assert.match(result, /Only your students see it/);
    });

    test('its create form counts teams, not colleges, and says it is for the college\'s students', async () => {
        const { result, errors } = await screen({ entry: page('pages/org/OrgCompetitions.jsx', '/organization/competitions?tab=host', '/organization/competitions'), api: ownApi, script: `
            await sleep(700);
            click(/Create Competition/); await sleep(300);
            const form = $('form[aria-labelledby="comp-form-title"]');
            return { form: text(form), labels: [...form.querySelectorAll('span')].map((x) => x.innerText.trim().toUpperCase()), intro: text(document.body) };` });
        assert.deepEqual(errors, []);
        assert.match(result.form, /New competition for your students/);
        assert.match(result.form, /Your college only/);
        assert.ok(result.labels.includes('NUMBER OF TEAMS ALLOWED'));
        assert.ok(!result.labels.includes('NUMBER OF COLLEGES ALLOWED'));
        assert.match(result.intro, /Only your students see it/);
    });
});

describe('a live competition\'s page on a phone', { skip: skipWithoutStyles }, () => {
    test('the name and dates keep the card\'s width; Edit and Cancel go to their own row', async () => {
        const LIVE = { ...OPEN, id: 'l1', name: 'Sample Chess Cup – Play Live', status: 'live', phase: 'live' };
        const liveApi = `
const reply = (data) => Promise.resolve({ data });
export default {
  get: (url) => reply(url === '/competitions/admin/l1' ? { competition: ${JSON.stringify(LIVE)}, teams: [], rounds: [] } : {}),
  post: () => reply({}), put: () => reply({}), delete: () => reply({})
};`;
        const { result, errors } = await screen({ entry: page('pages/CompetitionAdmin.jsx', '/competitions/l1', '/competitions/:id'), api: liveApi, styles: true, width: 390, height: 900, script: `
            await sleep(700);
            const header = document.querySelector('header'), h1 = header.querySelector('h1');
            const lines = Math.round(h1.getBoundingClientRect().height / parseFloat(getComputedStyle(h1).lineHeight));
            const edit = [...header.querySelectorAll('button')].find((b) => /Edit/.test(b.innerText)).getBoundingClientRect();
            const back = [...document.querySelectorAll('a')].find((a) => /All competitions/.test(a.innerText)).getBoundingClientRect();
            return { share: h1.parentElement.getBoundingClientRect().width / header.getBoundingClientRect().width, lines, buttonsBelow: edit.top >= h1.getBoundingClientRect().bottom, backHeight: back.height };` });
        assert.deepEqual(errors, []);
        assert.ok(result.share > 0.6, `the name has room (${Math.round(result.share * 100)}% of the card)`);
        assert.ok(result.lines <= 2, `the name is ${result.lines} lines, not a word a line`);
        assert.equal(result.buttonsBelow, true, 'Edit and Cancel are on their own row');
        assert.ok(result.backHeight >= 40, `All competitions is a finger's height (${result.backHeight}px)`);
    });

    test('the college\'s Take part list keeps each name readable, with the badges below it', async () => {
        // A phone's width: headless Chrome will not give a window under 500px,
        // so the page is drawn in a box the width a phone leaves it.
        const narrow = page('pages/org/OrgCompetitions.jsx', '/organization/competitions', '/organization/competitions')
            .replace('element={<><Page  /><Where /></>}', 'element={<div style={{ width: 358 }}><Page /><Where /></div>}');
        assert.notEqual(narrow, page('pages/org/OrgCompetitions.jsx', '/organization/competitions', '/organization/competitions'), 'the box was put in');
        const { result, errors } = await screen({ entry: narrow, api, styles: true, width: 390, height: 900, script: `
            await sleep(800);
            const head = document.querySelector('section button[aria-expanded]');
            const name = head.querySelector('span.font-bold');
            const chip = head.querySelector('span.rounded-full').getBoundingClientRect();
            return { share: name.getBoundingClientRect().width / head.getBoundingClientRect().width,
                     lines: Math.round(name.getBoundingClientRect().height / parseFloat(getComputedStyle(name).lineHeight)),
                     chipBelow: chip.top >= name.getBoundingClientRect().bottom };` });
        assert.deepEqual(errors, []);
        assert.ok(result.share > 0.6, `the name has room (${Math.round(result.share * 100)}% of the card)`);
        assert.ok(result.lines <= 2, `the name is ${result.lines} lines`);
        assert.equal(result.chipBelow, true, 'the status badge sits below');
    });
});
