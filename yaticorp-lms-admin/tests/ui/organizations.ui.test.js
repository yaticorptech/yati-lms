/**
 * The superadmin Organizations page: the queue it shows, and the confirmations
 * in front of every decision.
 *
 * Approving an organization lets it collect students; rejecting or suspending
 * one cuts off an institution's access. None of that should happen on a single
 * mis-aimed click, so these tests hold the confirmation step in place and check
 * that nothing is sent to the server before it is confirmed. They also pin down
 * that a rejection cannot be sent without a reason, because the organization is
 * shown that reason and "no" with no explanation is not an answer.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, wrap, skipWithoutChrome, skipWithoutStyles } from './harness.js';

const PENDING = {
    _id: 'p1', orgCode: 'ORG-2026-0002', name: 'XYZ Institute', organizationType: 'training_institute',
    typeLabel: 'Training Institute', email: 'head@xyz.edu', phone: '9876543210', contactPerson: 'Meera Nair',
    address: '4 Hill Road', website: 'xyz.edu', expectedStudents: 120, status: 'pending', statusReason: '',
    approvedAt: null, createdAt: '2026-09-18T09:00:00.000Z', studentCount: 0, pendingRequests: 0
};
const ACTIVE = {
    _id: 'a1', orgCode: 'ORG-2026-0001', name: 'ABC College', organizationType: 'college',
    typeLabel: 'College', email: 'office@abc.edu', phone: '9000000000', contactPerson: 'Asha Rao',
    address: '12 Station Road', website: 'abc.edu', expectedStudents: 250, status: 'active', statusReason: '',
    approvedAt: '2026-09-10T09:00:00.000Z', createdAt: '2026-09-01T09:00:00.000Z', studentCount: 245, pendingRequests: 3
};

const LIST = {
    organizations: [ACTIVE, PENDING],
    totals: { all: 2, pending: 1, active: 1, rejected: 0, suspended: 0, inactive: 0 },
    types: [
        { value: 'college', label: 'College' },
        { value: 'training_institute', label: 'Training Institute' }
    ]
};

const api = `
const LIST = ${JSON.stringify(LIST)};
window.__calls = [];
const reply = (data) => Promise.resolve({ data });
export default {
  get: (url, config) => {
    window.__calls.push(['GET', url, config && config.params]);
    // A single organization, for the review panel. Split rather than matched:
    // this source lives inside a template literal in the test, where a regex
    // literal's own backslashes would be eaten before esbuild ever sees them.
    const tail = url.split('/organizations/admin/')[1];
    const oneId = tail && !tail.includes('/') ? tail : null;
    if (oneId) {
      const org = LIST.organizations.find((o) => o._id === oneId);
      return reply({
        organization: { ...org, statusHistory: [{ status: 'pending', reason: 'Registered through the public form', at: org.createdAt, byName: '' }] },
        admins: [{ _id: 'ad1', name: org.contactPerson, email: org.email, role: 'orgadmin', createdAt: org.createdAt }],
        studentCount: org.studentCount,
        pendingRequests: org.pendingRequests
      });
    }
    return reply(LIST);
  },
  post: (url, body) => { window.__calls.push(['POST', url, body]); return reply({ message: 'created', organization: body }); },
  put: (url, body) => { window.__calls.push(['PUT', url, body]); return reply({ message: 'done', organization: { ...LIST.organizations[1], ...body } }); },
  delete: (url) => { window.__calls.push(['DELETE', url]); return reply({ ok: true }); }
};`;

const entry = wrap('pages/Organizations.jsx', 'Organizations', { route: '/organizations', path: '/organizations' });

describe('the superadmin organizations page', { skip: skipWithoutChrome }, () => {
    test('lists every organization with its ID, students and status', async () => {
        const { result, errors } = await screen({
            entry, api, script: `
                await sleep(700);
                const rows = $$('tbody tr').map((tr) => text(tr));
                return {
                    rows,
                    body: text(document.body),
                    buttons: $$('button').map((b) => b.innerText.trim()).filter(Boolean)
                };` });
        assert.deepEqual(errors, []);
        assert.equal(result.rows.length, 2);
        assert.match(result.body, /ORG-2026-0001/);
        assert.match(result.body, /ABC College/);
        assert.match(result.body, /XYZ Institute/);
        assert.match(result.rows.find((r) => /ABC College/.test(r)), /245/, 'the student count is shown');
        assert.match(result.rows.find((r) => /ABC College/.test(r)), /3 waiting/, 'and its waiting requests');
    });

    test('a pending organization offers Review, Approve and Reject; an active one offers Suspend', async () => {
        const { result, errors } = await screen({
            entry, api, script: `
                await sleep(700);
                const row = (name) => $$('tbody tr').find((tr) => tr.innerText.includes(name));
                const actions = (name) => Array.from(row(name).querySelectorAll('td:last-child button')).map((b) => b.innerText.trim());
                return { pending: actions('XYZ Institute'), active: actions('ABC College') };` });
        assert.deepEqual(errors, []);
        assert.deepEqual(result.pending, ['Review', 'Approve', 'Reject']);
        assert.deepEqual(result.active, ['View', 'Suspend'], 'an approved organization is not approved again');
    });

    test('approving asks first, and sends nothing until it is confirmed', async () => {
        const { result, errors } = await screen({
            entry, api, script: `
                await sleep(700);
                const row = $$('tbody tr').find((tr) => tr.innerText.includes('XYZ Institute'));
                Array.from(row.querySelectorAll('td:last-child button')).find((b) => /Approve/.test(b.innerText)).click();
                await sleep(400);
                const dialog = $('[aria-label="Confirm this decision"]');
                return {
                    asked: Boolean(dialog),
                    dialogText: dialog ? text(dialog) : '',
                    writesBeforeConfirming: window.__calls.filter(([m]) => m !== 'GET').length
                };` });
        assert.deepEqual(errors, []);
        assert.ok(result.asked, 'a confirmation appears');
        assert.equal(result.writesBeforeConfirming, 0, 'and nothing has been sent yet');
        assert.match(result.dialogText, /Approve this organization\?/i);
        assert.match(result.dialogText, /XYZ Institute/);
        assert.match(result.dialogText, /ORG-2026-0002/, 'which organization is named, not just implied');
        assert.match(result.dialogText, /students will be able to join/i, 'and what approving does');
    });

    test('confirming sends the approval for that organization', async () => {
        const { result, errors } = await screen({
            entry, api, script: `
                await sleep(700);
                const row = $$('tbody tr').find((tr) => tr.innerText.includes('XYZ Institute'));
                Array.from(row.querySelectorAll('td:last-child button')).find((b) => /Approve/.test(b.innerText)).click();
                await sleep(400);
                const dialog = $('[aria-label="Confirm this decision"]');
                Array.from(dialog.querySelectorAll('button')).find((b) => /^Approve$/.test(b.innerText.trim())).click();
                await sleep(700);
                return {
                    writes: window.__calls.filter(([m]) => m !== 'GET'),
                    stillAsking: Boolean($('[aria-label="Confirm this decision"]')),
                    body: text(document.body)
                };` });
        assert.deepEqual(errors, []);
        assert.equal(result.writes.length, 1, 'one decision, sent once');
        const [method, url, body] = result.writes[0];
        assert.equal(method, 'PUT');
        assert.match(url, /\/organizations\/admin\/p1\/status$/, 'the right organization');
        assert.equal(body.status, 'active');
        assert.ok(!result.stillAsking, 'the dialog closes');
        assert.match(result.body, /done/, 'and the result is reported');
    });

    test('a rejection cannot be sent without a reason', async () => {
        const { result, errors } = await screen({
            entry, api, script: `
                await sleep(700);
                const row = $$('tbody tr').find((tr) => tr.innerText.includes('XYZ Institute'));
                Array.from(row.querySelectorAll('td:last-child button')).find((b) => /Reject/.test(b.innerText)).click();
                await sleep(400);
                const dialog = $('[aria-label="Confirm this decision"]');
                const confirm = Array.from(dialog.querySelectorAll('button')).find((b) => /^Reject$/.test(b.innerText.trim()));
                const before = { disabled: confirm.disabled, hasReasonBox: Boolean($('#decision-reason')) };

                // Pressing it anyway must send nothing.
                confirm.click();
                await sleep(300);
                const blocked = window.__calls.filter(([m]) => m !== 'GET').length;

                const box = $('#decision-reason');
                const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
                setter.call(box, 'Could not verify the institution');
                box.dispatchEvent(new Event('input', { bubbles: true }));
                await sleep(300);
                const after = { disabled: Array.from($('[aria-label="Confirm this decision"]').querySelectorAll('button')).find((b) => /^Reject$/.test(b.innerText.trim())).disabled };

                Array.from($('[aria-label="Confirm this decision"]').querySelectorAll('button')).find((b) => /^Reject$/.test(b.innerText.trim())).click();
                await sleep(700);
                return { before, blocked, after, writes: window.__calls.filter(([m]) => m !== 'GET') };` });
        assert.deepEqual(errors, []);
        assert.ok(result.before.hasReasonBox, 'a rejection asks for a reason');
        assert.equal(result.before.disabled, true, 'and cannot be confirmed while it is empty');
        assert.equal(result.blocked, 0, 'clicking it regardless sends nothing');
        assert.equal(result.after.disabled, false, 'once a reason is given it can be sent');
        assert.equal(result.writes.length, 1);
        assert.equal(result.writes[0][2].status, 'rejected');
        assert.match(result.writes[0][2].reason, /verify the institution/, 'the reason travels with it');
    });

    test('cancelling a decision sends nothing at all', async () => {
        const { result, errors } = await screen({
            entry, api, script: `
                await sleep(700);
                const row = $$('tbody tr').find((tr) => tr.innerText.includes('ABC College'));
                Array.from(row.querySelectorAll('td:last-child button')).find((b) => /Suspend/.test(b.innerText)).click();
                await sleep(400);
                const dialog = $('[aria-label="Confirm this decision"]');
                const warned = text(dialog);
                Array.from(dialog.querySelectorAll('button')).find((b) => /Cancel/.test(b.innerText)).click();
                await sleep(400);
                return {
                    warned,
                    closed: !$('[aria-label="Confirm this decision"]'),
                    writes: window.__calls.filter(([m]) => m !== 'GET').length
                };` });
        assert.deepEqual(errors, []);
        assert.match(result.warned, /Existing members and all their learning progress are kept/i,
            'suspension says plainly that nothing is lost');
        assert.ok(result.closed);
        assert.equal(result.writes, 0);
    });

    test('the status filter asks the server for that status', async () => {
        const { result, errors } = await screen({
            entry, api, script: `
                await sleep(700);
                $$('button').find((b) => /^Pending/.test(b.innerText.trim())).click();
                await sleep(600);
                return { gets: window.__calls.filter(([m]) => m === 'GET').map(([, , params]) => params) };` });
        assert.deepEqual(errors, []);
        assert.deepEqual(result.gets[0], {}, 'the first load asks for everything');
        assert.deepEqual(result.gets.at(-1), { status: 'pending' }, 'and the chip narrows it');
    });

    test('opening one shows its full details and its decision history', async () => {
        const { result, errors } = await screen({
            entry, api, script: `
                await sleep(700);
                const row = $$('tbody tr').find((tr) => tr.innerText.includes('XYZ Institute'));
                Array.from(row.querySelectorAll('td:last-child button')).find((b) => /Review/.test(b.innerText)).click();
                await sleep(700);
                const panel = $('[aria-label="Organization details"]');
                return { body: panel ? text(panel) : '' };` });
        assert.deepEqual(errors, []);
        assert.match(result.body, /XYZ Institute/);
        assert.match(result.body, /ORG-2026-0002/);
        assert.match(result.body, /Meera Nair/, 'the contact person');
        assert.match(result.body, /head@xyz\.edu/, 'and how to reach them');
        assert.match(result.body, /Training Institute/);
    });
});

/**
 * The popups have to fit a phone.
 *
 * The students popup held a table with a 720px minimum width, so on a phone it
 * ran a quarter of its width off the side of the panel and had to be dragged
 * sideways to read. Below `sm` it is now a card per student instead. Measured
 * against the app's real stylesheet, because the whole question is one of
 * layout: an unstyled page would pass this on anything.
 */
describe('the organization popups fit a phone', { skip: skipWithoutStyles }, () => {
    const MANY = Array.from({ length: 12 }, (_, i) => ({
        _id: `s${i}`, name: `Student ${i}`, email: `student${i}@example.com`, status: 'active',
        coursesEnrolled: 4, coursesCompleted: i % 5, progressPercent: (i * 7) % 100,
        xp: i * 25, level: 2, certificates: i % 3, lastActive: '2026-09-17T09:00:00.000Z'
    }));

    const crowded = `
const LIST = ${JSON.stringify(LIST)};
const MANY = ${JSON.stringify(MANY)};
window.__calls = [];
const reply = (data) => Promise.resolve({ data });
export default {
  get: (url) => {
    window.__calls.push(['GET', url]);
    if (url.includes('/students')) return reply({ organization: LIST.organizations[0], students: MANY });
    return reply(LIST);
  },
  post: () => reply({}), put: () => reply({}), delete: () => reply({})
};`;

    /** Open the students popup and look for anything sticking out sideways. */
    const MEASURE = `
        await sleep(800);
        const row = $$('tbody tr, ul > li').find((el) => el.innerText.includes('ABC College'));
        Array.from(row.querySelectorAll('button')).find((b) => /^\\d+$/.test(b.innerText.trim())).click();
        await sleep(700);
        const overlay = $('[aria-label="Organization students"]');
        const panel = overlay.firstElementChild;
        const heading = overlay.querySelector('h2');
        const widest = Array.from(panel.querySelectorAll('*'))
            .reduce((most, el) => Math.max(most, el.scrollWidth - el.clientWidth), 0);
        const rect = panel.getBoundingClientRect();
        return {
            vw: window.innerWidth,
            vh: window.innerHeight,
            headingText: heading.innerText.trim(),
            headingTop: Math.round(heading.getBoundingClientRect().top),
            panelTop: Math.round(rect.top),
            panelBottom: Math.round(rect.bottom),
            sidewaysOverflowPx: widest,
            pageSideways: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
            // Counted from the visible text rather than by element, because both
            // layouts are in the DOM and only one of them is displayed.
            names: new Set((panel.innerText.match(/Student \\d+/g) || [])).size
        };`;

    test('at phone width nothing runs off the side, and every student is still listed', async () => {
        const { result, errors } = await screen({
            entry, api: crowded, styles: true, width: 390, height: 780, script: MEASURE
        });
        assert.deepEqual(errors, []);
        assert.equal(result.sidewaysOverflowPx, 0, 'no sideways dragging inside the popup');
        assert.ok(!result.pageSideways, 'and none on the page behind it');
        assert.equal(result.names, MANY.length, 'the cards carry every student the table would have');
        assert.equal(result.headingText, 'ABC College');
        assert.ok(result.headingTop >= 0 && result.panelBottom <= result.vh + 1, 'the popup sits inside the screen');
    });

    test('at laptop width the table comes back, and still fits', async () => {
        const { result, errors } = await screen({
            entry, api: crowded, styles: true, width: 1400, height: 900, script: MEASURE
        });
        assert.deepEqual(errors, []);
        assert.equal(result.sidewaysOverflowPx, 0);
        assert.equal(result.names, MANY.length);
        assert.ok(result.panelTop >= 0 && result.panelBottom <= result.vh + 1, 'and is not taller than the window');
    });
});

/**
 * The "assign a student" picker.
 *
 * It opens onto five candidates rather than everyone, because it is for finding
 * one person: a long list pushes the search box — the thing that actually
 * narrows it — off the top of a short window. More are shown on request.
 */
describe('assigning a student to an organization', { skip: skipWithoutChrome }, () => {
    const CANDIDATES = Array.from({ length: 23 }, (_, i) => ({
        _id: `c${i}`, name: `Candidate ${i}`, email: `c${i}@demo.invalid`, cardNumber: `${1000 + i}`,
        status: 'active', organizationId: null, currentOrganization: null
    }));
    // One of them already belongs somewhere, which must be said out loud.
    CANDIDATES[1] = { ...CANDIDATES[1], organizationId: 'p1', currentOrganization: { name: 'XYZ Institute', orgCode: 'ORG-2026-0002' } };

    const withCandidates = `
const LIST = ${JSON.stringify(LIST)};
const CANDIDATES = ${JSON.stringify(CANDIDATES)};
window.__calls = [];
const reply = (data) => Promise.resolve({ data });
export default {
  get: (url, config) => {
    window.__calls.push(['GET', url, config && config.params]);
    if (url.includes('/assignable')) return reply({ students: CANDIDATES, capped: false });
    if (url.includes('/students')) return reply({ organization: LIST.organizations[0], students: [] });
    return reply(LIST);
  },
  post: (url, body) => { window.__calls.push(['POST', url, body]); return reply({ message: 'Candidate 0 was added to ABC College.' }); },
  put: () => reply({}), delete: () => reply({ message: 'ok' })
};`;

    /** Open the students popup, then the picker. */
    const OPEN = `
        await sleep(800);
        const row = $$('tbody tr, ul > li').find((el) => el.innerText.includes('ABC College'));
        Array.from(row.querySelectorAll('button')).find((b) => /^\\d+$/.test(b.innerText.trim())).click();
        await sleep(700);
        $('[aria-label="Assign student"]').click();
        await sleep(800);
        const picker = $('[aria-label="Assign a student"]');`;

    const rows = `$$('[aria-label="Assign a student"] ul li')`;

    test('it opens on five, and says how many more there are', async () => {
        const { result, errors } = await screen({
            entry, api: withCandidates, script: `${OPEN}
                return {
                    shown: ${rows}.length,
                    text: picker.innerText.replace(/\\s+/g, ' ').trim(),
                    buttons: $$('[aria-label="Assign a student"] button').map((b) => b.innerText.trim()).filter(Boolean)
                };
                `
        });
        assert.deepEqual(errors, []);
        assert.equal(result.shown, 5, 'five candidates, not all twenty-three');
        assert.match(result.text, /Showing 5 of 23/, 'and it says so');
        assert.ok(result.buttons.some((b) => /Show 5 more/.test(b)), 'with a way to see more');
        assert.ok(result.buttons.some((b) => /Show all 23/.test(b)), 'and a way to see them all');
    });

    test('“show more” reveals five at a time, and “show all” the rest', async () => {
        const { result, errors } = await screen({
            entry, api: withCandidates, script: `${OPEN}
                const after = [];
                $$('[aria-label="Assign a student"] button').find((b) => /Show 5 more/.test(b.innerText)).click();
                await sleep(300);
                after.push(${rows}.length);
                $$('[aria-label="Assign a student"] button').find((b) => /Show 5 more/.test(b.innerText)).click();
                await sleep(300);
                after.push(${rows}.length);
                $$('[aria-label="Assign a student"] button').find((b) => /Show all/.test(b.innerText)).click();
                await sleep(300);
                after.push(${rows}.length);
                return { after, stillHasMore: $$('[aria-label="Assign a student"] button').some((b) => /Show \\d+ more/.test(b.innerText)) };
                `
        });
        assert.deepEqual(errors, []);
        assert.deepEqual(result.after, [10, 15, 23], 'five, then five, then the rest');
        assert.ok(!result.stillHasMore, 'and the button goes away once everything is shown');
    });

    test('searching goes back to five, and asks the server', async () => {
        const { result, errors } = await screen({
            entry, api: withCandidates, script: `${OPEN}
                $$('[aria-label="Assign a student"] button').find((b) => /Show all/.test(b.innerText)).click();
                await sleep(300);
                const beforeSearch = ${rows}.length;

                const box = $('[aria-label="Assign a student"] input');
                Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(box, 'Candidate');
                box.dispatchEvent(new Event('input', { bubbles: true }));
                await sleep(900);

                return {
                    beforeSearch,
                    afterSearch: ${rows}.length,
                    searched: window.__calls.some(([m, url, params]) => m === 'GET' && url.includes('/assignable') && params && params.search === 'Candidate')
                };
                `
        });
        assert.deepEqual(errors, []);
        assert.equal(result.beforeSearch, 23);
        assert.equal(result.afterSearch, 5, 'a new search starts short again');
        assert.ok(result.searched, 'and the narrowing is done by the server');
    });

    test('a student already elsewhere is marked, and offered as a move', async () => {
        const { result, errors } = await screen({
            entry, api: withCandidates, script: `${OPEN}
                const marked = ${rows}.find((li) => li.innerText.includes('Currently in'));
                return {
                    text: marked ? marked.innerText.replace(/\\s+/g, ' ').trim() : '',
                    action: marked ? marked.querySelector('button').innerText.trim() : ''
                };
                `
        });
        assert.deepEqual(errors, []);
        assert.match(result.text, /Currently in XYZ Institute/, 'their organization is named');
        assert.equal(result.action, 'Move here', 'and it is a move, not a plain add');
    });

    test('assigning posts the student and reports back', async () => {
        const { result, errors } = await screen({
            entry, api: withCandidates, script: `${OPEN}
                ${rows}[0].querySelector('button').click();
                await sleep(800);
                return {
                    posts: window.__calls.filter(([m]) => m === 'POST'),
                    pickerClosed: !$('[aria-label="Assign a student"]'),
                    body: document.body.innerText.replace(/\\s+/g, ' ').trim()
                };
                `
        });
        assert.deepEqual(errors, []);
        assert.equal(result.posts.length, 1, 'one assignment, sent once');
        assert.match(result.posts[0][1], /\/organizations\/admin\/a1\/students$/);
        assert.deepEqual(result.posts[0][2], { studentId: 'c0' });
        assert.ok(result.pickerClosed, 'the picker closes');
        assert.match(result.body, /was added to ABC College/, 'and the result is reported');
    });
});

/**
 * An organization with no students at all.
 *
 * The way into the assign picker was the student count, and the count was
 * disabled at zero — so the one organization most in need of a student was the
 * one you could not put a student into. The count is now always a way in, and
 * says "Assign" when there is nobody there yet.
 */
describe('an organization with no students', { skip: skipWithoutChrome }, () => {
    const EMPTY_ORG = { ...ACTIVE, _id: 'e1', name: 'Empty Academy', orgCode: 'EMPTY-2026-0003', studentCount: 0, pendingRequests: 0 };
    const SUSPENDED_ORG = { ...EMPTY_ORG, _id: 'e2', name: 'Shut Academy', orgCode: 'SHUT-2026-0004', status: 'suspended' };
    const PENDING_ORG = { ...EMPTY_ORG, _id: 'e3', name: 'Waiting Academy', orgCode: 'WAIT-2026-0005', status: 'pending' };
    const EMPTY_LIST = {
        organizations: [EMPTY_ORG, SUSPENDED_ORG, PENDING_ORG],
        totals: { all: 3, active: 1, suspended: 1, pending: 1 },
        types: [{ value: 'college', label: 'College' }]
    };

    const api = `
const LIST = ${JSON.stringify(EMPTY_LIST)};
window.__calls = [];
const reply = (data) => Promise.resolve({ data });
export default {
  get: (url) => {
    window.__calls.push(['GET', url]);
    if (url.includes('/assignable')) return reply({ students: [{ _id: 'c1', name: 'Free Agent', email: 'free@demo.invalid', status: 'active', organizationId: null, currentOrganization: null }], capped: false });
    const forStudents = url.match(/\\/admin\\/(e\\d)\\/students$/);
    if (forStudents) return reply({ organization: LIST.organizations.find((o) => o._id === forStudents[1]), students: [] });
    return reply(LIST);
  },
  post: (url, body) => { window.__calls.push(['POST', url, body]); return reply({ message: 'Free Agent was added to Empty Academy.' }); },
  put: () => reply({}), delete: () => reply({})
};`;

    const openFor = (name) => `
        await sleep(800);
        const row = $$('tbody tr, ul > li').find((el) => el.innerText.includes('${name}'));
        const countButton = Array.from(row.querySelectorAll('button')).find((b) => /^0/.test(b.innerText.trim()));
        const wasDisabled = countButton ? countButton.disabled : null;
        countButton.click();
        await sleep(800);
        const popup = $('[aria-label="Organization students"]');`;

    test('the count is still a way in, and says so', async () => {
        const { result, errors } = await screen({
            entry, api, script: `${openFor('Empty Academy')}
                return {
                    wasDisabled,
                    countLabel: Array.from($$('tbody tr, ul > li').find((el) => el.innerText.includes('Empty Academy')).querySelectorAll('button')).find((b) => /^0/.test(b.innerText.trim())).innerText.replace(/\\s+/g, ' ').trim(),
                    opened: Boolean(popup),
                    popupText: popup.innerText.replace(/\\s+/g, ' ').trim(),
                    canAssign: Boolean($('[aria-label="Assign student"]'))
                };
                `
        });
        assert.deepEqual(errors, []);
        assert.equal(result.wasDisabled, false, 'the count is not disabled at zero');
        // The gap between the count and the word is CSS, not a space character.
        assert.match(result.countLabel, /^0\s*·\s*Assign$/, 'and it says what pressing it is for');
        assert.ok(result.opened, 'the popup opens on an empty organization');
        assert.match(result.popupText, /No students have joined/i);
        assert.ok(result.canAssign, 'with the assign button available');
    });

    test('and a student can be assigned from there', async () => {
        const { result, errors } = await screen({
            entry, api, script: `${openFor('Empty Academy')}
                $('[aria-label="Assign student"]').click();
                await sleep(800);
                $$('[aria-label="Assign a student"] ul li')[0].querySelector('button').click();
                await sleep(800);
                return {
                    posts: window.__calls.filter(([m]) => m === 'POST'),
                    body: document.body.innerText.replace(/\\s+/g, ' ').trim()
                };
                `
        });
        assert.deepEqual(errors, []);
        assert.equal(result.posts.length, 1);
        assert.match(result.posts[0][1], /\/organizations\/admin\/e1\/students$/);
        assert.deepEqual(result.posts[0][2], { studentId: 'c1' });
        assert.match(result.body, /was added to Empty Academy/);
    });

    test('a pending organization offers no way to assign a student', async () => {
        const { result, errors } = await screen({
            entry, api, script: `${openFor('Waiting Academy')}
                return {
                    countLabel: Array.from($$('tbody tr, ul > li').find((el) => el.innerText.includes('Waiting Academy')).querySelectorAll('button')).find((b) => /^0/.test(b.innerText.trim())).innerText.replace(/\\s+/g, ' ').trim(),
                    opened: Boolean(popup),
                    popupText: popup.innerText.replace(/\\s+/g, ' ').trim(),
                    canAssign: Boolean($('[aria-label="Assign student"]'))
                };
                `
        });
        assert.deepEqual(errors, []);
        assert.match(result.countLabel, /^0$/, 'the count does not invite an assignment');
        assert.ok(result.opened, 'the popup still opens');
        assert.equal(result.canAssign, false, 'with no assign button');
        assert.match(result.popupText, /Approve it before assigning/i, 'and it says why');
        assert.doesNotMatch(result.popupText, /Use “Assign student”/);
    });

    test('an organization that is not active can still be stocked, with the caveat said', async () => {
        const { result, errors } = await screen({
            entry, api, script: `${openFor('Shut Academy')}
                const beforePicker = popup.innerText.replace(/\\s+/g, ' ').trim();
                $('[aria-label="Assign student"]').click();
                await sleep(800);
                const picker = $('[aria-label="Assign a student"]');
                return {
                    canAssign: true,
                    beforePicker,
                    pickerText: picker.innerText.replace(/\\s+/g, ' ').trim(),
                    candidates: $$('[aria-label="Assign a student"] ul li').length
                };
                `
        });
        assert.deepEqual(errors, []);
        assert.ok(result.canAssign, 'the button is offered whatever the status');
        assert.match(result.beforePicker, /cannot sign in to see them until it is active/i,
            'the empty state warns before the picker is even opened');
        assert.match(result.pickerText, /is suspended/i, 'and the picker repeats it where the decision is made');
        assert.equal(result.candidates, 1, 'with candidates to choose from');
    });
});
