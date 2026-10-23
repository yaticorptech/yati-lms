/**
 * Teachers, on the platform and in an organization's panel.
 *
 * The platform: the list with each teacher's research summary, the switch
 * that makes new teachers wait for approval, approving one, and adding a
 * teacher with their card — the card is checked first, the form sends the
 * card with the details, and a refusal shows under the field it is about.
 * An organization: its teachers with Remove, its join requests with Approve,
 * and the Teachers tab in the navigation carrying the waiting count.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, wrap, skipWithoutChrome, skipWithoutStyles } from './harness.js';

const summary = (percent) => ({ research: { title: 'Peer tutoring', percent, stage: 'Literature review' }, publications: { total: 3, published: 1 }, theses: 1, writing: { words30: 4200, days30: 9 } });
const TEACHERS = [
    { _id: 't1', name: 'Dr. Asha Rao', email: 'asha@college.edu', phone: '9845012345', cardNumber: '111122223333', institution: 'GFGC Dharwad', department: 'Education', designation: 'Assistant Professor', status: 'active', organization: { _id: 'o1', name: 'St Agnes College', orgCode: 'st_agnes' }, organizationId: 'o1', createdAt: '2026-10-01T00:00:00.000Z', summary: summary(40) },
    { _id: 't2', name: 'Meera Iyer', email: 'meera@college.edu', phone: '9845012346', cardNumber: '444455556666', institution: '', department: 'Physics', designation: '', status: 'pending', organization: null, organizationId: null, createdAt: '2026-10-20T00:00:00.000Z', summary: { research: null, publications: { total: 0, published: 0 }, theses: 0, writing: { words30: 0, days30: 0 } } }
];

const platformApi = ({ addFails = false } = {}) => `
window.__calls = [];
let approval = false;
const reply = (data) => Promise.resolve({ data });
const refuse = (status, data) => Promise.reject({ response: { status, data } });
export default {
  get: (url, config) => {
    window.__calls.push(['GET', url, (config && config.params) || {}]);
    if (url === '/admin/teachers') {
      const p = (config && config.params) || {};
      const list = ${JSON.stringify(TEACHERS)}.filter((t) => !p.status || t.status === p.status);
      return reply({ teachers: list, total: list.length, page: 1, pages: 1, pending: 1, approvalRequired: approval, canAssignOrganization: true });
    }
    if (url === '/organizations/admin/options') return reply({ organizations: [{ _id: 'o1', name: 'St Agnes College', status: 'active' }, { _id: 'o2', name: 'Pending Place', status: 'pending' }] });
    return reply({});
  },
  put: (url, body) => {
    window.__calls.push(['PUT', url, body]);
    if (url === '/admin/teachers/settings') { approval = body.approvalRequired; return reply({ approvalRequired: approval }); }
    return reply({ message: 'Saved.' });
  },
  patch: (url, body) => { window.__calls.push(['PATCH', url, body]); return reply({ status: body.status }); },
  post: (url, body) => {
    window.__calls.push(['POST', url, body]);
    if (url === '/auth/validate-qr') return reply({ valid: true, cardNumber: '777788889999', cvv: 'AB123', qrCodeNumber: 'QR777' });
    if (url === '/admin/teachers') return ${addFails ? "refuse(400, { field: 'email', code: 'EMAIL_TAKEN', message: 'A teacher account already uses this email address.' })" : "reply({ _id: 't9', message: 'Ravi Kumar was added.' })"};
    return reply({});
  },
  delete: (url) => { window.__calls.push(['DELETE', url]); return reply({ message: 'Deleted.' }); }
};`;

const TYPE = `
    const type = (el, v) => {
        const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
        el.dispatchEvent(new Event('input', { bubbles: true }));
    };`;

const teachersPage = wrap('pages/Teachers.jsx', 'Teachers', { route: '/teachers', path: '/teachers' });

describe('the platform’s Teachers page', { skip: skipWithoutChrome }, () => {
    test('lists teachers with their research, switches approval on, and approves a waiting teacher', async () => {
        const { result, errors } = await screen({ entry: teachersPage, api: platformApi(), script: `
            await sleep(700);
            const body = text(document.body);
            const sw = $('button[role="switch"]');
            const before = sw.getAttribute('aria-checked');
            sw.click(); await sleep(400);
            const after = $('button[role="switch"]').getAttribute('aria-checked');
            const notice = text(document.body);
            click(/teacher waiting for your approval/); await sleep(500);
            const asked = window.__calls.filter((c) => c[0] === 'GET' && c[1] === '/admin/teachers').at(-1)[2];
            const rows = $$('tbody tr').map(text);
            click(/^Approve$/); await sleep(500);
            return { body, before, after, notice, asked, rows, calls: window.__calls.filter((c) => c[0] !== 'GET') };` });
        assert.deepEqual(errors, []);
        assert.match(result.body, /Dr\. Asha Rao/);
        assert.match(result.body, /40% · Literature review/);
        assert.match(result.body, /1 published of 3/);
        assert.match(result.body, /4,200 words in 30 days/);
        assert.match(result.body, /St Agnes College/);
        assert.equal(result.before, 'false');
        assert.equal(result.after, 'true');
        assert.match(result.notice, /wait for your approval/);
        assert.equal(result.asked.status, 'pending');
        assert.equal(result.rows.length, 1);
        assert.match(result.rows[0], /Meera Iyer/);
        assert.deepEqual(result.calls.find((c) => c[0] === 'PUT'), ['PUT', '/admin/teachers/settings', { approvalRequired: true }]);
        assert.deepEqual(result.calls.find((c) => c[0] === 'PATCH'), ['PATCH', '/admin/teachers/t2/status', { status: 'active' }]);
    });

    test('adding a teacher checks the card, sends it with the details, and shows a refusal under its field', async () => {
        const { result, errors } = await screen({ entry: teachersPage, api: platformApi({ addFails: true }), script: `${TYPE}
            await sleep(600);
            click(/Add teacher/); await sleep(300);
            const beforeCard = !!$('#t-name');
            type($('input[aria-label="QR code or card number"]'), 'QR777'); await sleep(50);
            click(/Check card/); await sleep(300);
            const checked = text($('[role="dialog"]'));
            type($('#t-name'), 'Ravi Kumar');
            type($('#t-email'), 'asha@college.edu');
            type($('#t-phone'), '9845000001');
            type($('#t-password'), 'Teach@2026a');
            type($('#t-department'), 'Chemistry');
            await sleep(50);
            $('[role="dialog"] form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            await sleep(400);
            const emailError = text($('#t-email-error'));
            const posted = window.__calls.find((c) => c[0] === 'POST' && c[1] === '/admin/teachers');
            const validated = window.__calls.find((c) => c[1] === '/auth/validate-qr');
            return { beforeCard, checked, emailError, posted, validated, open: !!$('[role="dialog"]') };` });
        assert.deepEqual(errors, []);
        assert.equal(result.beforeCard, false, 'the details wait for the card');
        assert.deepEqual(result.validated[2], { qrCodeNumber: 'QR777' });
        assert.match(result.checked, /777788889999/);
        assert.deepEqual(result.posted[2], {
            name: 'Ravi Kumar', email: 'asha@college.edu', phone: '9845000001', password: 'Teach@2026a', institution: '', department: 'Chemistry', designation: '', organizationId: '',
            CardNumber: '777788889999', CVV: 'AB123', qrCodeNumber: 'QR777'
        });
        assert.equal(result.emailError, 'A teacher account already uses this email address.');
        assert.equal(result.open, true, 'the form stays open to fix it');
    });

    test('a twelve-digit card number is checked as a number, and a successful add says so', async () => {
        const { result, errors } = await screen({ entry: teachersPage, api: platformApi(), script: `${TYPE}
            await sleep(600);
            click(/Add teacher/); await sleep(300);
            type($('input[aria-label="QR code or card number"]'), '7777 8888 9999'); await sleep(50);
            click(/Check card/); await sleep(300);
            for (const [id, v] of [['t-name', 'Ravi Kumar'], ['t-email', 'ravi@college.edu'], ['t-phone', '9845000001'], ['t-password', 'Teach@2026a']]) type($('#' + id), v);
            await sleep(50);
            click(/^Add teacher$/, '[role="dialog"] button'); await sleep(500);
            return { validated: window.__calls.find((c) => c[1] === '/auth/validate-qr')[2], open: !!$('[role="dialog"]'), body: text(document.body) };` });
        assert.deepEqual(errors, []);
        assert.deepEqual(result.validated, { cardNumber: '777788889999' });
        assert.equal(result.open, false);
        assert.match(result.body, /Ravi Kumar was added/);
    });

    test('on a phone the list is cards, and nothing scrolls sideways', { skip: skipWithoutStyles }, async () => {
        const { result, errors } = await screen({ entry: teachersPage, api: platformApi(), width: 390, height: 900, styles: true, script: `
            await sleep(700);
            return { tables: $$('table').length, cards: $$('ul > li').length, vw: window.innerWidth,
                sideways: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 };` });
        assert.deepEqual(errors, []);
        assert.ok(result.vw < 640, 'a phone-sized window');
        assert.equal(result.tables, 0);
        assert.equal(result.cards, 2);
        assert.ok(!result.sideways, 'the page does not scroll sideways');
    });
});

/* ── The organization's panel ──────────────────────────────────────────── */

const orgApi = `
window.__calls = [];
const reply = (data) => Promise.resolve({ data });
export default {
  get: (url, config) => {
    window.__calls.push(['GET', url, (config && config.params) || {}]);
    if (url === '/organizations/me/teachers') return reply({ teachers: ${JSON.stringify(TEACHERS.slice(0, 1))}, pendingRequests: 1, orgCode: 'st_agnes' });
    if (url === '/organizations/me/teachers/requests') return reply({ requests: [{ _id: 'r1', status: 'pending', requestedAt: '2026-10-22T09:00:00.000Z', teacher: { _id: 't3', name: 'Kiran Shetty', email: 'kiran@college.edu', phone: '9845000003', department: 'Kannada', designation: 'Lecturer', institution: 'St Agnes' } }], pendingCount: 1 });
    return reply({});
  },
  put: (url, body) => { window.__calls.push(['PUT', url, body]); return reply({ message: 'Kiran Shetty is now a member of your organization.' }); },
  delete: (url) => { window.__calls.push(['DELETE', url]); return reply({ message: 'Dr. Asha Rao was removed from your organization.' }); },
  post: (url, body) => { window.__calls.push(['POST', url, body]); return reply({}); }
};`;

const orgPage = (route = '/organization/teachers') => wrap('pages/org/OrgTeachers.jsx', 'OrgTeachers', { route, path: '/organization/teachers' });

describe('an organization’s Teachers page', { skip: skipWithoutChrome }, () => {
    test('shows its teachers and its ID to share, and removes one after saying the account stays theirs', async () => {
        const { result, errors } = await screen({ entry: orgPage(), api: orgApi, script: `
            await sleep(700);
            const body = text(document.body);
            click(/^Remove$/); await sleep(300);
            const dialog = text($('[role="dialog"]'));
            click(/Remove teacher/); await sleep(400);
            return { body, dialog, deleted: window.__calls.find((c) => c[0] === 'DELETE'), after: text(document.body) };` });
        assert.deepEqual(errors, []);
        assert.match(result.body, /Dr\. Asha Rao/);
        assert.match(result.body, /st_agnes/);
        assert.match(result.body, /tap Add your organization and enter this Organization ID/, 'how a teacher joins, in the dashboard’s own words');
        assert.match(result.body, /Requests\s*1/, 'the waiting count rides on the Requests tab');
        assert.match(result.dialog, /stay theirs/);
        assert.deepEqual(result.deleted, ['DELETE', '/organizations/me/teachers/t1']);
        assert.match(result.after, /was removed from your organization/);
    });

    test('the requests tab approves a teacher who asked to join', async () => {
        const { result, errors } = await screen({ entry: orgPage('/organization/teachers?tab=requests'), api: orgApi, script: `
            await sleep(700);
            const body = text(document.body);
            let heard = 0;
            window.addEventListener('organization-teacher-requests-changed', () => { heard += 1; });
            click(/^Approve$/); await sleep(300);
            click(/^Approve$/, '[role="dialog"] button'); await sleep(500);
            return { body, put: window.__calls.find((c) => c[0] === 'PUT'), heard, after: text(document.body) };` });
        assert.deepEqual(errors, []);
        assert.match(result.body, /Kiran Shetty/);
        assert.match(result.body, /kiran@college\.edu/);
        assert.deepEqual(result.put, ['PUT', '/organizations/me/teachers/requests/r1', { decision: 'approve', reason: '' }]);
        assert.equal(result.heard, 1, 'the navigation badge is told');
        assert.match(result.after, /now a member of your organization/);
    });

    test('on a phone the page and the Add teacher form fit the screen', { skip: skipWithoutStyles }, async () => {
        const { result, errors } = await screen({ entry: orgPage(), api: orgApi.replace("post: (url, body) => { window.__calls.push(['POST', url, body]); return reply({}); }",
            "post: (url, body) => { window.__calls.push(['POST', url, body]); return reply(url === '/auth/validate-qr' ? { cardNumber: '777788889999', cvv: 'AB123', qrCodeNumber: 'QR777' } : {}); }"),
        width: 390, height: 800, styles: true, script: `${TYPE}
            await sleep(700);
            const sideways = () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
            const page = sideways();
            click(/^Add teacher$/); await sleep(300);
            type($('input[aria-label="QR code or card number"]'), 'QR777'); await sleep(50);
            click(/Check card/); await sleep(300);
            const box = $('[role="dialog"] > div').getBoundingClientRect();
            return { page, dialog: sideways(), fields: !!$('#t-name'), left: box.left, right: innerWidth - box.right, org: !!$('#t-org') };` });
        assert.deepEqual(errors, []);
        assert.ok(!result.page, 'the page does not scroll sideways');
        assert.ok(!result.dialog, 'nor with the form open');
        assert.ok(result.fields);
        assert.ok(result.left >= 0 && result.right >= 0, 'the form is inside the screen');
        assert.equal(result.org, false, 'an organization does not choose an organization');
    });
});
