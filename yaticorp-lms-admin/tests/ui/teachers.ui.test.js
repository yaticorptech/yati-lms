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
    { _id: 't1', name: 'Dr. Asha Rao', email: 'asha@college.edu', phone: '9845012345', cardNumber: '111122223333', institution: 'GFGC Dharwad', department: 'Education', designation: 'Assistant Professor', status: 'active', organization: { _id: 'o1', name: 'St Agnes College', orgCode: 'st_agnes' }, organizationId: 'o1', createdAt: '2026-10-01T00:00:00.000Z', summary: summary(40), teaches: [{ course: 'BCA', section: 'Section A', subject: 'Java' }] },
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
    if (url === '/organizations/me/classes') return reply({ enabled: false, programs: [{ _id: 'p1', name: 'BBA', teachers: 1, sections: [{ _id: 's1', name: 'Section A' }, { _id: 's2', name: 'Section B' }] }] });
    if (url === '/organizations/me/teachers/requests') return reply({ requests: [{ _id: 'r1', status: 'pending', requestedAt: '2026-10-22T09:00:00.000Z', teacher: { _id: 't3', name: 'Kiran Shetty', email: 'kiran@college.edu', phone: '9845000003', department: 'Kannada', designation: 'Lecturer', institution: 'St Agnes' } }], pendingCount: 1 });
    return reply({});
  },
  put: (url, body) => { window.__calls.push(['PUT', url, body]); return reply({ message: 'Kiran Shetty is now a member of your organization.' }); },
  delete: (url) => { window.__calls.push(['DELETE', url]); return reply({ message: 'Dr. Asha Rao was removed from your organization.' }); },
  post: (url, body) => { window.__calls.push(['POST', url, body]); return reply({}); }
};`;

const orgPage = (route = '/organization/teachers') => wrap('pages/org/OrgTeachers.jsx', 'OrgTeachers', { route, path: '/organization/teachers' });
// 360 Activities: its own sidebar item, after Courses (2026-10-31).
const activitiesPage = wrap('pages/org/Org360Activities.jsx', 'Org360Activities', { route: '/organization/360-activities', path: '/organization/360-activities' });

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
        assert.match(result.body, /Teaches\s*Java\s*BCA · Section A/, 'what the teacher marked they teach, in their profile');
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

    test('Courses & sections: one list, edited in place and saved together', async () => {
        const { result, errors } = await screen({ entry: orgPage('/organization/teachers?tab=classes'), api: orgApi, script: `
            await sleep(700);
            const body = text(document.body);
            const cards = $$('section').length;
            const saveBefore = $$('button').find((b) => b.innerText.trim() === 'Save').disabled;
            const setIn = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
            $('[aria-label="One section more"]').click(); await sleep(100);
            click(/Add course/); await sleep(150);
            setIn($('[aria-label="Course 2 name"]'), 'BCA'); await sleep(100);
            const names = text($$('li p').find((p) => /Section C/.test(p.innerText)));
            const dirty = /Unsaved changes/.test(document.body.innerText);
            click(/^Save$/); await sleep(400);
            return { body, cards, saveBefore, names, dirty, tabs: $$('button[aria-pressed]').map((b) => b.innerText.trim()), switch360: !!$('[aria-label="Open 360 to students"]'), puts: window.__calls.filter((c) => c[0] === 'PUT') };` });
        assert.deepEqual(errors, []);
        assert.match(result.body, /Requests/, 'teachers still ask to join');
        assert.match(result.body, /Section A · Section B/);
        assert.match(result.body, /1 teacher marked classes here/);
        assert.equal(result.cards, 1, 'one card, not one per course');
        assert.equal(result.saveBefore, true, 'nothing to save until something changes');
        assert.match(result.names, /Section A · Section B · Section C/);
        assert.equal(result.dirty, true);
        assert.deepEqual(result.puts[0], ['PUT', '/organizations/me/classes/programs', { programs: [{ _id: 'p1', name: 'BBA', sections: 3 }, { name: 'BCA', sections: 1 }] }]);
        assert.equal(result.puts.length, 1);
        assert.equal(result.switch360, false, '"Open 360 to students" is on the 360 Activities page');
        assert.deepEqual(result.tabs, ['Teachers', 'Requests', 'Courses & sections'], 'no Activities tab: it has its own sidebar item');
    });

    test('360 Activities (its own page): categories and activities, each "up to N" or "N per proof", saved together', { skip: skipWithoutStyles }, async () => {
        const GROUPS = [{ _id: 'g1', name: 'Academic Excellence', activities: [{ _id: 'a1', name: 'Presentations', mode: 'max', marks: 10 }, { _id: 'a2', name: 'Handwritten Assignments', mode: 'max', marks: 10 }] }];
        const api = orgApi
            .replace("if (url === '/organizations/me/classes') return reply({ enabled: false,", `if (url === '/organizations/me/classes') return reply({ activityGroups: ${JSON.stringify(GROUPS)}, enabled: false,`)
            .replace("put: (url, body) => { window.__calls.push(['PUT', url, body]); return reply(", "put: (url, body) => { window.__calls.push(['PUT', url, body]); if (url === '/organizations/me/classes') return reply({ enabled: body.enabled }); if (url.endsWith('/activities')) return body.groups.some((g) => !g.name) ? Promise.reject(Object.assign(new Error('400'), { response: { status: 400, data: { message: 'Every category needs a name, e.g. Academic Excellence.', group: 1, field: 'name' } } })) : reply({ activityGroups: body.groups.map((g, i) => ({ _id: g._id || 'n' + i, ...g, activities: g.activities.map((a, j) => ({ _id: a._id || 'n' + i + j, ...a })) })) }); return reply(");
        const { result, errors } = await screen({ entry: activitiesPage, api, width: 390, height: 900, styles: true, script: `
            await sleep(700);
            const body = text(document.body);
            window.confirm = () => true;
            const setIn = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
            const pick = async (label, re) => { $('[role=combobox][aria-label="' + label + '"]').click(); await sleep(200); const opts = $$('[role=option]'); const names = opts.map((o) => o.innerText.trim()); opts.find((o) => re.test(o.innerText)).click(); await sleep(150); return names; };
            // Change one, delete one.
            setIn($('[aria-label="Marks for Presentations"]'), '15'); await sleep(100);
            $('[aria-label="Remove Handwritten Assignments"]').click(); await sleep(100);
            // A new category: typed, added, and chosen at once.
            setIn($('[aria-label="New category name"]'), 'Earn While Learn'); await sleep(50);
            $('button[aria-label="Add category"]').click(); await sleep(200);
            const chosenName = $('[aria-label="Category name"]').value;
            const emptyCategory = text(document.body);
            // An activity: a name is needed; Enter-style Add keeps the cursor for the next.
            click(/^Add activity$/); await sleep(100);
            const needsName = text(document.body);
            setIn($('[aria-label="New activity name"]'), 'Individual activities'); await sleep(50);
            await pick('How the new activity is marked', /Per proof/);
            setIn($('[aria-label="Marks for the new activity"]'), '1'); await sleep(50);
            click(/^Add activity$/); await sleep(200);
            const added = { marks: $('[aria-label="Marks for Individual activities"]').value, draft: $('[aria-label="New activity name"]').value, focus: document.activeElement.getAttribute('aria-label') };
            setIn($('[aria-label="New activity name"]'), 'individual activities'); await sleep(50);
            click(/^Add activity$/); await sleep(100);
            const twice = text(document.body);
            setIn($('[aria-label="New activity name"]'), ''); await sleep(50);
            // The server's 400 marks the field at fault.
            setIn($('[aria-label="Category name"]'), ''); await sleep(50);
            click(/^Save$/); await sleep(400);
            const nameError = text(document.body);
            const badName = $('[aria-label="Category name"]').getAttribute('aria-invalid');
            setIn($('[aria-label="Category name"]'), 'Earn While Learn'); await sleep(100);
            const dirty = /Unsaved changes/.test(document.body.innerText);
            click(/^Save$/); await sleep(500);
            const saved = text(document.body);
            $('[role=switch][aria-label="Open 360 to students"]').click(); await sleep(300);
            const opened = text(document.body);
            // On a phone the categories are a dropdown; Delete category takes one out.
            const categories = await pick('Category', /^Academic Excellence/);
            const backTo = $('[aria-label="Category name"]').value;
            await pick('Category', /^Earn While Learn/);
            $('[aria-label="Delete Earn While Learn"]').click(); await sleep(200);
            return { body, chosenName, emptyCategory, needsName, added, twice, nameError, badName, dirty, puts: window.__calls.filter((c) => c[0] === 'PUT'), after: saved, opened, categories, backTo,
                deleted: text(document.body), sideways: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 };` });
        assert.deepEqual(errors, []);
        assert.match(result.body, /^360 Activities/, 'a page of its own, not a Teachers tab');
        assert.match(result.body, /1 category · 2 activities/);
        assert.match(result.body, /Open 360 to students/, 'the switch is here');
        assert.match(result.body, /only students added by your 360 teachers will see it/);
        assert.equal(result.chosenName, 'Earn While Learn', 'the new category opens at once');
        assert.match(result.emptyCategory, /No activities in Earn While Learn yet/);
        assert.match(result.needsName, /Type the activity name first/);
        assert.deepEqual(result.added, { marks: '1', draft: '', focus: 'New activity name' }, 'added; the box clears and keeps the cursor for the next');
        assert.match(result.twice, /individual activities is already in Earn While Learn/i);
        assert.match(result.nameError, /Every category needs a name/);
        assert.equal(result.badName, 'true', 'the field at fault is marked');
        assert.equal(result.dirty, true);
        assert.deepEqual(result.puts.at(-1), ['PUT', '/organizations/me/classes', { enabled: true }]);
        assert.match(result.opened, /360 is open: students added by your 360 teachers now see these activities/);
        assert.deepEqual(result.puts.at(-2), ['PUT', '/organizations/me/classes/activities', { groups: [
            { _id: 'g1', name: 'Academic Excellence', activities: [{ _id: 'a1', name: 'Presentations', mode: 'max', marks: 15, cap: null, bonus: false }] },
            { name: 'Earn While Learn', activities: [{ name: 'Individual activities', mode: 'each', marks: 1, cap: null, bonus: false }] }
        ], targetTotal: null }]);
        assert.match(result.after, /Activities saved/);
        assert.match(result.after, /2 categories · 2 activities/);
        assert.deepEqual(result.categories, ['Academic Excellence (1)', 'Earn While Learn (1)']);
        assert.equal(result.backTo, 'Academic Excellence');
        assert.match(result.deleted, /1 category · 1 activity/);
        assert.match(result.deleted, /Unsaved changes/);
        assert.ok(!result.sideways, 'nothing scrolls sideways on a phone');
    });

    test('360 Activities on a wide screen: the categories as a list on the left, the chosen one on the right', { skip: skipWithoutStyles }, async () => {
        const GROUPS = [
            { _id: 'g1', name: 'Academic Excellence', activities: [{ _id: 'a1', name: 'Presentations', mode: 'max', marks: 10 }] },
            { _id: 'g2', name: 'Campus Involvement', activities: [{ _id: 'a2', name: 'NSS Annual Camp', mode: 'max', marks: 10 }, { _id: 'a3', name: 'Attendance', mode: 'max', marks: 10 }] }
        ];
        const api = orgApi.replace("if (url === '/organizations/me/classes') return reply({ enabled: false,", `if (url === '/organizations/me/classes') return reply({ activityGroups: ${JSON.stringify(GROUPS)}, enabled: false,`);
        const { result, errors } = await screen({ entry: activitiesPage, api, width: 1280, height: 900, styles: true, script: `
            await sleep(700);
            const list = $$('aside[aria-label=Categories] li button').filter((b) => b.offsetParent).map((b) => b.innerText.replace(/\\s+/g, ' ').trim());
            const first = $('[aria-label="Category name"]').value;
            $$('aside[aria-label=Categories] li button').find((b) => /Campus Involvement/.test(b.innerText)).click(); await sleep(200);
            return { list, first, second: $('[aria-label="Category name"]').value, rows: $$('[aria-label^="Remove "]').map((b) => b.getAttribute('aria-label')),
                dropdownShown: !!$('[role=combobox][aria-label=Category]')?.offsetParent, sideways: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 };` });
        assert.deepEqual(errors, []);
        assert.deepEqual(result.list, ['Academic Excellence 1', 'Campus Involvement 2']);
        assert.equal(result.first, 'Academic Excellence');
        assert.equal(result.second, 'Campus Involvement');
        assert.deepEqual(result.rows, ['Remove NSS Annual Camp', 'Remove Attendance'], 'only the chosen category’s activities');
        assert.equal(result.dropdownShown, false, 'the dropdown is for phones');
        assert.ok(!result.sideways);
    });

    test('360 Activities before the platform unlocks 360: blurred, out of reach, with a note to ask (2026-11-04)', { skip: skipWithoutStyles }, async () => {
        const api = orgApi.replace("if (url === '/organizations/me/classes') return reply({ enabled: false,", "if (url === '/organizations/me/classes') return reply({ allowed: false, activityGroups: [], enabled: false,");
        const run = (width) => screen({ entry: activitiesPage, api, width, height: 900, styles: true, script: `
            await sleep(700);
            const note = $('[role=status]');
            const page = $('section[aria-labelledby=org-activities-title]');
            const box = note.getBoundingClientRect();
            return { note: note.innerText, inert: page.closest('[inert]') !== null, hidden: page.closest('[aria-hidden=true]') !== null,
                blurred: getComputedStyle(page.parentElement).filter.includes('blur'), onScreen: box.top >= 0 && box.bottom <= innerHeight,
                switchReachable: document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)?.closest('[role=switch]') !== null,
                sideways: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 };` });
        for (const width of [1280, 390]) {
            const { result, errors } = await run(width);
            assert.deepEqual(errors, []);
            assert.match(result.note, /360 is locked/);
            assert.match(result.note, /360 tracks each student’s growth beyond the classroom/, 'it says what 360 is');
            assert.match(result.note, /You set the activities[\s\S]*Students upload proof[\s\S]*Their 360 teacher checks it/, 'and how it works');
            assert.match(result.note, /Ask the YATICORP team to unlock 360/);
            assert.ok(result.inert && result.hidden, `the page behind cannot be used (${width}px)`);
            assert.ok(result.blurred, `and is blurred (${width}px)`);
            assert.ok(result.onScreen, `the note is in view without scrolling (${width}px)`);
            assert.equal(result.switchReachable, false);
            assert.ok(!result.sideways, `nothing scrolls sideways (${width}px)`);
        }
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
