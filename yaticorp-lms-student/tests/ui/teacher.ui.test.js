/**
 * The teacher side in the browser.
 *
 *   - the sign-in page has one box for a card number or a mobile number and
 *     no Student / Teacher choice (2026-10-30): a student's account signs in
 *     on the student side, a teacher's card or number is finished through the
 *     teacher API, and a teacher with no card uses their email
 *   - "Register your card" is the student sign-up's three steps, asking for
 *     an institution instead of an Organization ID, any email address
 *   - the dashboard and its pages draw at phone and laptop widths without
 *     running off the screen
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles } from './harness.js';
import { apiModule } from './fixtures.js';

// The teacher client, stood in for: calls are recorded, answers come from
// window.__treply(method, url, body) when a test sets it, else from ROUTES.
const ROUTES = {
    '/me': { _id: 't1', name: 'Dr. Meera Iyer', email: 'meera@college.edu', phone: '+91 98450 12345', cardNumber: '980000000001', institution: 'Govt. First Grade College', designation: 'Associate Professor', role: 'teacher', dailyWordGoal: 500 },
    '/overview': {
        teacher: { name: 'Dr. Meera Iyer' },
        research: { _id: 'p1', title: 'Peer tutoring and mathematics anxiety in rural colleges', percent: 25, done: 10, total: 40, current: { key: 'questions', title: 'Research questions & hypotheses' }, nextTasks: [{ _id: 'k1', text: 'Write the main research question' }, { _id: 'k2', text: 'Write two to four sub-questions or objectives' }] },
        publications: { total: 5, published: 2, inReview: 2, byStatus: { idea: 0, drafting: 1, submitted: 1, under_review: 1, revision: 0, accepted: 0, published: 2, rejected: 0 } },
        thesis: { _id: 'th1', title: 'Peer tutoring and mathematics anxiety', words: 18250, targetWords: 80000, chapters: 9, chaptersDone: 2, dueDate: '2027-06-30' },
        writing: { today: 320, goal: 500, last14: Array.from({ length: 14 }, (_, i) => ({ day: `2026-10-${String(9 + i).padStart(2, '0')}`, words: (i * 97) % 700 })) },
        plagiarism: { _id: 'r1', title: 'Introduction', score: 6.2, at: '2026-10-20' }
    },
    '/theses/th1': { _id: 'th1', title: 'Peer tutoring and mathematics anxiety', degree: 'PhD', targetWords: 80000, words: 0, chapters: [
        { _id: 'c1', title: 'Introduction', content: '', words: 0, targetWords: 6000, status: 'not_started' },
        { _id: 'c2', title: 'Review of Literature', content: '', words: 0, targetWords: 15000, status: 'not_started' }
    ] },
    '/projects': { projects: [{ _id: 'p1', title: 'Peer tutoring in rural colleges', goal: 'phd', field: 'Education',
        stages: [{ _id: 's1', key: 'topic', title: 'Topic & problem', description: 'Find a problem worth solving.', notes: '', tasks: [{ _id: 'k1', text: 'List three candidate topics', done: false }] },
                 { _id: 's2', key: 'literature', title: 'Literature review', description: 'Map what is known.', notes: '', tasks: [{ _id: 'k2', text: 'Search Scopus', done: false }] }],
        progress: { percent: 0, done: 0, total: 2, perStage: [{ key: 'topic', title: 'Topic & problem', total: 1, done: 0, percent: 0 }, { key: 'literature', title: 'Literature review', total: 1, done: 0, percent: 0 }], current: { key: 'topic', title: 'Topic & problem' }, nextTasks: [] } }], template: [] },
    '/publications': { publications: [
        { _id: 'a1', title: 'Peer tutoring and maths anxiety: a quasi-experiment in three rural colleges of north Karnataka', type: 'journal', status: 'published', venue: 'Journal of Rural Education', year: 2025, indexing: ['Scopus'], quartile: 'Q2', citations: 4 },
        { _id: 'a2', title: 'Mentoring circles', type: 'conference', status: 'under_review', year: 2026, indexing: [], citations: 0, deadline: '2026-11-15' }
    ], stats: { total: 2, byStatus: { idea: 0, drafting: 0, submitted: 0, under_review: 1, revision: 0, accepted: 0, published: 1, rejected: 0 }, byType: {}, byYear: { 2025: 1 }, byIndexing: { Scopus: 1 }, citations: 4, hIndex: 1, upcomingDeadlines: [{ _id: 'a2', title: 'Mentoring circles', deadline: '2026-11-15', status: 'under_review' }] } },
    '/writing': { pieces: [], stats: { today: 0, goal: 500, last14: Array.from({ length: 14 }, (_, i) => ({ day: `d${i}`, words: 0 })) }, kinds: [] },
    '/plagiarism/reports': { reports: [] },
    '/theses': { theses: [] }
};

const teacherSessionStub = `
window.__tcalls = window.__tcalls || [];
const ROUTES = ${JSON.stringify(ROUTES)};
const pick = (url) => { const key = Object.keys(ROUTES).sort((a, b) => b.length - a.length).find((k) => url === k || url.startsWith(k + '?')); return key ? ROUTES[key] : {}; };
const answer = (method, url, body) => {
  window.__tcalls.push([method, url, body]);
  const custom = window.__treply && window.__treply(method, url, body);
  if (custom && custom.error) return Promise.reject(Object.assign(new Error('Request failed'), { response: { status: custom.error, data: custom.data } }));
  if (custom) return Promise.resolve({ data: custom });
  return Promise.resolve({ data: pick(url) });
};
export default { get: (u, c) => answer('GET', u, c), post: (u, b) => answer('POST', u, b), put: (u, b) => answer('PUT', u, b), delete: (u) => answer('DELETE', u) };
export const TEACHER_TOKEN = 'teacherToken';
export const TEACHER_DATA = 'teacherData';
export const SIGNIN_AS = 'yati:signinAs';
export const TEACHER_SESSION_ENDED = 'yati:teacherSessionEnded';
export const readTeacher = () => ROUTES['/me'];
export const hasTeacherSession = () => !!window.__hasTeacher;
export const isEmbedded = () => false;
export const forgetTeacher = () => {};
export const rememberSigninAs = (r) => localStorage.setItem('yati:signinAs', r);
export const readSigninAs = () => { const v = localStorage.getItem('yati:signinAs'); return v === 'teacher' || v === 'student' ? v : null; };
export const enterTeacher = (data) => { window.__entered = data; };
export const signOutTeacher = () => { window.__signedOut = true; };
export const messageOf = (e, f = 'Something went wrong.') => e?.response?.data?.message || f;
`;
const modules = {
    'teacher/teacherSession': teacherSessionStub,
    // Pulled in by the plagiarism page's source uploads; pdf.js itself is not needed here.
    'components/course/loadPdfjs': 'export const loadPdfjs = async () => { throw new Error("pdf.js is not loaded in tests"); };'
};

const loginEntry = ({ remembered = null, at = '/login', studentLogin = "Promise.resolve({ success: false, error: 'Invalid card number or password' })" } = {}) => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthContext } from '${srcFile('context/AuthContext.jsx')}';
import Login from '${srcFile('pages/Login.jsx')}';
${remembered ? `localStorage.setItem('yati:signinAs', '${remembered}');` : "localStorage.removeItem('yati:signinAs');"}
const value = { user: null, login: (card, password) => { window.__login = { card, password }; return ${studentLogin}; } };
createRoot(document.getElementById('root')).render(
  <AuthContext.Provider value={value}>
    <MemoryRouter initialEntries={['${at}']}><Routes><Route path="/login" element={<Login />} /><Route path="/signup" element={<h1>SIGNUP</h1>} /></Routes></MemoryRouter>
  </AuthContext.Provider>);`;

const SET = `const setVal = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };`;

const TEACHER_REPLY = `window.__treply = (m, u) => (u === '/auth/login' ? { _id: 't1', name: 'Dr. Meera Iyer', role: 'teacher', token: 'tok' } : null);`;
const signIn = (who, password) => `
            setVal($('#login-card-number'), ${JSON.stringify(who)}); setVal($('#login-password'), ${JSON.stringify(password)});
            await sleep(100); $$('button[type=submit]')[0].click(); await sleep(500);`;

describe('signing in: one box, and the account decides the side', { skip: skipWithoutStyles }, () => {
    test('no Student / Teacher choice: one box for the card or mobile number', async () => {
        const { result, errors } = await screen({ entry: loginEntry({ remembered: 'teacher' }), api: apiModule({}), modules, styles: true, width: 1280, script: `
            await sleep(500);
            return { chooser: !!$('#role-chooser-title'), radios: $$('[role=radio]').length, heading: text($('h2')),
                     label: text($('label[for="login-card-number"]')), placeholder: $('#login-card-number').getAttribute('placeholder'),
                     signup: $$('a').find((a) => /Sign up here/.test(a.innerText))?.getAttribute('href') };` });
        assert.deepEqual(errors, []);
        assert.equal(result.chooser, false, 'no "Who is signing in?" popup');
        assert.equal(result.radios, 0, 'no Student / Teacher switch');
        assert.equal(result.heading, 'Welcome back');
        assert.equal(result.label, 'Card or mobile number');
        assert.match(result.placeholder, /mobile number/);
        assert.equal(result.signup, '/signup');
    });

    test('a student signs in with their mobile number, on the student side', async () => {
        const { result, errors } = await screen({ entry: loginEntry({ studentLogin: 'Promise.resolve({ success: true })' }), api: apiModule({}), modules, styles: true, script: `
            ${SET}${TEACHER_REPLY}
            await sleep(400);${signIn('+91 98765 43210', 'Stud-Pass1!')}
            return { login: window.__login, teacherCalls: window.__tcalls.filter((c) => c[1] === '/auth/login').length, entered: !!window.__entered };` });
        assert.deepEqual(errors, []);
        assert.deepEqual(result.login, { card: '+91 98765 43210', password: 'Stud-Pass1!' });
        assert.equal(result.teacherCalls, 0, 'the teacher sign-in is not used');
        assert.equal(result.entered, false);
    });

    test("a teacher's card or number is finished on the teacher side, and opens the teacher dashboard", async () => {
        const { result, errors } = await screen({ entry: loginEntry({ studentLogin: "Promise.resolve({ success: false, code: 'TEACHER_ACCOUNT', error: 'This is a teacher account.' })" }), api: apiModule({}), modules, styles: true, script: `
            ${SET}${TEACHER_REPLY}
            await sleep(400);${signIn('9845012345', 'Teach-Pass1!')}
            return { calls: window.__tcalls, entered: window.__entered, alert: text($('[role=alert]')) };` });
        assert.deepEqual(errors, []);
        assert.deepEqual(result.calls.find((c) => c[1] === '/auth/login'), ['POST', '/auth/login', { login: '9845012345', password: 'Teach-Pass1!' }]);
        assert.equal(result.entered.token, 'tok', 'the teacher session is entered');
        assert.ok(!result.alert, 'no error shown');
    });

    test('no email sign-in: a teacher without a card uses their mobile number in the same box', async () => {
        const { result, errors } = await screen({ entry: loginEntry(), api: apiModule({}), modules, styles: true, script: `
            ${SET}${TEACHER_REPLY}
            await sleep(400);
            return { emailLink: !!$$('button').find((b) => /Sign in with your email/.test(b.innerText)), emailBox: !!$('#login-teacher-email'), hint: document.body.innerText };` });
        assert.deepEqual(errors, []);
        assert.equal(result.emailLink, false);
        assert.equal(result.emailBox, false);
        assert.match(result.hint, /Teacher without a card\? Use the mobile number your organization added you with\./);
    });

    test('a wrong password says so, and nothing opens', async () => {
        const { result, errors } = await screen({ entry: loginEntry({ studentLogin: "Promise.resolve({ success: false, code: 'WRONG_PASSWORD', error: 'Wrong password. Try again, or use Forgot password.' })" }), api: apiModule({}), modules, styles: true, script: `
            ${SET}${TEACHER_REPLY}
            await sleep(400);${signIn('240100019664', 'nope')}
            return { alert: text($('[role=alert]')), teacherCalls: window.__tcalls.filter((c) => c[1] === '/auth/login').length, entered: !!window.__entered };` });
        assert.deepEqual(errors, []);
        assert.match(result.alert, /Wrong password/);
        assert.equal(result.teacherCalls, 0);
        assert.equal(result.entered, false);
    });
});

describe('registering a teacher card', { skip: skipWithoutStyles }, () => {
    const signupEntry = `
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthContext } from '${srcFile('context/AuthContext.jsx')}';
import Signup from '${srcFile('pages/Signup.jsx')}';
createRoot(document.getElementById('root')).render(
  <AuthContext.Provider value={{ user: null, enterApp: () => { window.__studentEntered = true; } }}>
    <MemoryRouter initialEntries={['/signup?as=teacher']}><Routes><Route path="/signup" element={<Signup />} /></Routes></MemoryRouter>
  </AuthContext.Provider>);`;
    const CARD = { valid: true, cardNumber: '980000000001', cvv: '123', qrCodeNumber: 'TQR1' };

    // No AI card: the organization added them by name and mobile number
    // (2026-10-30). The number is checked; one already set up is sent to sign
    // in; one still to be set up confirms it is them, sets a password and
    // gives their email and details here.
    const orgCheck = (reply) => `${SET}
            window.__treply = (m, u) => (u === '/auth/org-check' ? ${reply} : null);
            await sleep(400);
            const link = $$('button').find((b) => /Verify as your organization/.test(b.innerText));
            const linkShown = !!link; link.click(); await sleep(200);
            const cardGone = !$('#signup-card');
            setVal($('#signup-org-phone'), '89876 54331'); await sleep(100);
            $$('button[type=submit]').find((b) => /^Verify$/.test(b.innerText.trim())).click(); await sleep(400);
            return { linkShown, cardGone, call: window.__tcalls.find((c) => c[1] === '/auth/org-check'),
                     status: text($('[role=status]')), alert: text($('[role=alert]')),
                     signIn: $$('a').find((a) => /Go to sign in/.test(a.innerText))?.getAttribute('href') || null,
                     stepper: !!$$('span').find((x) => /Step 1 of 3/i.test(x.innerText) && x.offsetParent) };`;

    test("a teacher with no card checks the mobile number their organization added them with", async () => {
        const { result, errors } = await screen({ entry: signupEntry, api: apiModule({}), modules, styles: true, script: orgCheck("{ verified: true, teachers: [{ firstName: 'Geeta', organization: 'St Agnes College', active: true }] }") });
        assert.deepEqual(errors, []);
        assert.equal(result.linkShown, true, 'the option sits under the card number');
        assert.equal(result.cardGone, true, 'the card box gives way to the mobile number');
        assert.deepEqual(result.call, ['POST', '/auth/org-check', { phone: '89876 54331' }]);
        assert.match(result.status, /Verified/);
        assert.match(result.status, /Geeta, St Agnes College/);
        assert.match(result.status, /Sign in with this mobile number and your password/);
        assert.equal(result.signIn, '/login');
        assert.equal(result.stepper, false, 'no three-step indicator for this check');
    });

    test('added by name and number only: "Is this you?", a password, their details, and in', async () => {
        const replies = "({ '/auth/org-check': { verified: true, teachers: [{ firstName: 'Ravi', organization: 'St Agnes College', active: true, needsPassword: true, id: 't360', name: 'Ravi Kumar', phone: '89876 54331' }] }, '/auth/org-check/setup': { _id: 't360', role: 'teacher', mentor360: true, token: 'tok360' } })[u] || null";
        const { result, errors } = await screen({ entry: signupEntry, api: apiModule({}), modules, styles: true, script: `${SET}
            window.__treply = (m, u) => ${replies};
            await sleep(400);
            $$('button').find((b) => /Verify as your organization/.test(b.innerText)).click(); await sleep(200);
            setVal($('#signup-org-phone'), '89876 54331'); await sleep(100);
            $$('button[type=submit]').find((b) => /^Verify$/.test(b.innerText.trim())).click(); await sleep(400);
            const isThisYou = text($('[role=status]'));
            $$('button[type=submit]').find((b) => /Yes, this is me/.test(b.innerText)).click(); await sleep(200);
            const onPassword = !!$('#signup-org-password');
            setVal($('#signup-org-password'), 'Mentor-Pass1!');
            setVal($('#signup-org-confirm'), 'Mentor-Pass9!'); await sleep(100);
            $$('button[type=submit]').find((b) => /Continue/.test(b.innerText)).click(); await sleep(200);
            const mismatch = text($('[role=alert]'));
            setVal($('#signup-org-confirm'), 'Mentor-Pass1!'); await sleep(100);
            $$('button[type=submit]').find((b) => /Continue/.test(b.innerText)).click(); await sleep(200);
            const onDetails = !!$('#signup-org-email');
            setVal($('#signup-org-email'), 'ravi@college.edu');
            setVal($('#signup-org-designation'), 'Assistant Professor');
            setVal($('#signup-org-department'), 'Commerce'); await sleep(100);
            $$('button[type=submit]').find((b) => /Finish/.test(b.innerText)).click(); await sleep(400);
            return { isThisYou, onPassword, mismatch, onDetails, noCodeCall: !window.__tcalls.some((c) => /code/.test(c[1])),
                     setup: window.__tcalls.find((c) => c[1] === '/auth/org-check/setup'), entered: window.__entered };` });
        assert.deepEqual(errors, []);
        assert.match(result.isThisYou, /Is this you\?/);
        assert.match(result.isThisYou, /Ravi Kumar/);
        assert.match(result.isThisYou, /89876 54331/);
        assert.equal(result.onPassword, true);
        assert.match(result.mismatch, /do not match/);
        assert.equal(result.onDetails, true);
        assert.equal(result.noCodeCall, true, 'no email code');
        assert.deepEqual(result.setup, ['POST', '/auth/org-check/setup', { phone: '89876 54331', teacherId: 't360', password: 'Mentor-Pass1!', email: 'ravi@college.edu', designation: 'Assistant Professor', department: 'Commerce', researchArea: '' }]);
        assert.equal(result.entered.token, 'tok360');
    });

    test('"No, this is not me" goes back to the mobile number', async () => {
        const replies = "(u === '/auth/org-check' ? { verified: true, teachers: [{ firstName: 'Ravi', organization: 'St Agnes College', active: true, needsPassword: true, id: 't360', name: 'Ravi Kumar', phone: '89876 54331' }] } : null)";
        const { result, errors } = await screen({ entry: signupEntry, api: apiModule({}), modules, styles: true, script: `${SET}
            window.__treply = (m, u) => ${replies};
            await sleep(400);
            $$('button').find((b) => /Verify as your organization/.test(b.innerText)).click(); await sleep(200);
            setVal($('#signup-org-phone'), '89876 54331'); await sleep(100);
            $$('button[type=submit]').find((b) => /^Verify$/.test(b.innerText.trim())).click(); await sleep(400);
            $$('button').find((b) => /No, this is not me/.test(b.innerText)).click(); await sleep(200);
            return { phoneBack: !!$('#signup-org-phone'), alert: text($('[role=alert]')) };` });
        assert.deepEqual(errors, []);
        assert.equal(result.phoneBack, true);
        assert.match(result.alert, /ask your organization/);
    });

    test('a number no organization has added says to ask them', async () => {
        const { result, errors } = await screen({ entry: signupEntry, api: apiModule({}), modules, styles: true, script: orgCheck("{ error: 404, data: { code: 'NOT_ADDED', message: 'No organization has added a teacher with this mobile number yet. Ask your organization to add you, then try again.' } }") });
        assert.deepEqual(errors, []);
        assert.match(result.alert, /Ask your organization to add you/);
        assert.equal(result.signIn, null);
    });

    test('the same three steps, an institution instead of an Organization ID, any email, and the teacher API', async () => {
        const { result, errors } = await screen({ entry: signupEntry, api: apiModule({ '/auth/validate-qr': CARD }), modules, styles: true, width: 1280, budget: 20_000, script: `
            ${SET}
            window.__treply = (m, u) => (u === '/auth/register' ? { _id: 't9', role: 'teacher', token: 'newtok' } : null);
            await sleep(400);
            const heading = text($('h2'));
            click(/Type Instead/); await sleep(150);
            setVal($('#signup-card'), '980000000001'); await sleep(100);
            $$('button[type=submit]')[0].click(); await sleep(500);
            const step2 = { institution: !!$('#signup-institution'), department: !!$('#signup-department'), orgCode: !!$('#signup-org-code'), hint: text($('#signup-email-hint')) };
            setVal($('#signup-name'), 'Dr. Meera Iyer');
            setVal($('#signup-email'), 'meera@college.edu.in');
            setVal($('#signup-phone'), '9845012345');
            setVal($('#signup-institution'), 'Govt. First Grade College');
            await sleep(100);
            $$('button[type=submit]')[0].click(); await sleep(400);
            const onPassword = !!$('#signup-password');
            setVal($('#signup-password'), 'Teach-Pass1!'); setVal($('#signup-confirm-password'), 'Teach-Pass1!'); await sleep(100);
            // Create Account waits for the Terms and Conditions to be agreed.
            const lockedUntilAgreed = $$('button[type=submit]')[0].disabled;
            $('#signup-password').closest('form').querySelector('input[type=checkbox]').click(); await sleep(100);
            $$('button[type=submit]')[0].click(); await sleep(500);
            return { heading, step2, onPassword, lockedUntilAgreed, register: window.__tcalls.find((c) => c[1] === '/auth/register'), entered: window.__entered, student: !!window.__studentEntered };` });
        assert.deepEqual(errors, []);
        assert.equal(result.heading, 'Register your teacher card');
        assert.deepEqual({ ...result.step2, hint: undefined }, { institution: true, department: true, orgCode: false, hint: undefined });
        assert.match(result.step2.hint, /work or personal email/);
        assert.equal(result.onPassword, true, 'a college email is accepted');
        assert.equal(result.lockedUntilAgreed, true, 'Create Account is locked until the terms are agreed');
        assert.equal(result.register[2].institution, 'Govt. First Grade College');
        assert.equal(result.register[2].email, 'meera@college.edu.in');
        assert.equal(result.register[2].CardNumber, '980000000001');
        assert.equal(result.entered.token, 'newtok');
        assert.equal(result.student, false, 'no student account');
    });
});

describe('the teacher dashboard', { skip: skipWithoutStyles }, () => {
    const page = (route) => `
import { createRoot } from 'react-dom/client';
import { Suspense } from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { TeacherProvider } from '${srcFile('teacher/TeacherContext.jsx')}';
import TeacherLayout from '${srcFile('teacher/TeacherLayout.jsx')}';
import TeacherDashboard from '${srcFile('teacher/pages/TeacherDashboard.jsx')}';
import Methodologies from '${srcFile('teacher/pages/Methodologies.jsx')}';
import Publications from '${srcFile('teacher/pages/Publications.jsx')}';
import Writing from '${srcFile('teacher/pages/Writing.jsx')}';
import Plagiarism from '${srcFile('teacher/pages/Plagiarism.jsx')}';
import ResearchPath from '${srcFile('teacher/pages/ResearchPath.jsx')}';
import ThesisList from '${srcFile('teacher/pages/ThesisList.jsx')}';
createRoot(document.getElementById('root')).render(
  <MemoryRouter initialEntries={['${route}']}>
    <Suspense fallback={null}>
    <Routes>
      <Route path="/teacher" element={<TeacherProvider><TeacherLayout /></TeacherProvider>}>
        <Route index element={<TeacherDashboard />} />
        <Route path="methods" element={<Methodologies />} />
        <Route path="methods/:key" element={<Methodologies />} />
        <Route path="publications" element={<Publications />} />
        <Route path="writing" element={<Writing />} />
        <Route path="plagiarism" element={<Plagiarism />} />
        <Route path="research-path" element={<ResearchPath />} />
        <Route path="thesis" element={<ThesisList />} />
      </Route>
    </Routes>
    </Suspense>
  </MemoryRouter>);`;
    const OVERFLOW = `(() => { const W = document.documentElement.clientWidth; return { page: document.documentElement.scrollWidth - W }; })()`;

    for (const [width, label] of [[1280, 'a laptop'], [500, 'a phone']]) {
        test(`on ${label}: greeting, summary tiles, the next tasks, and nothing off the screen`, async () => {
            const { result, errors } = await screen({ entry: page('/teacher'), api: apiModule({}), modules, styles: true, width, height: 900, script: `
                await sleep(900);
                const body = document.body.innerText;
                return { greeting: /Dr\\. Meera Iyer/.test(text($('h1'))), now: /Now: Research questions/.test(body), tile: /18,250/.test(body), task: /Write the main research question/.test(body),
                         streak: /streak/i.test(body), tools: $$('section[aria-labelledby=tools-title] a').length,
                         bottomBar: (() => { const n = $('nav[aria-label="Teacher shortcuts"]'); return !!n && getComputedStyle(n).display !== 'none'; })(),
                         sidebar: (() => { const a = $('aside'); return !!a && getComputedStyle(a).display !== 'none'; })(), overflow: ${OVERFLOW} };` });
            assert.deepEqual(errors, []);
            assert.equal(result.greeting, true);
            assert.equal(result.now, true, 'the current research stage');
            assert.equal(result.tile, true, 'thesis words');
            assert.equal(result.task, true, 'the next task');
            assert.equal(result.streak, false, 'no streak on the teacher side');
            assert.equal(result.tools, 6, 'all six tools');
            assert.equal(result.bottomBar, width < 1024, 'the bottom bar only on a phone');
            assert.equal(result.sidebar, width >= 1024, 'the sidebar only on a laptop');
            assert.ok(result.overflow.page <= 0, `no sideways scroll (${result.overflow.page}px)`);
        });
    }

    test('each page draws on a phone without running off the screen', async () => {
        for (const route of ['/teacher/methods', '/teacher/methods/experimental', '/teacher/publications', '/teacher/writing', '/teacher/plagiarism', '/teacher/research-path', '/teacher/thesis']) {
            const { result, errors } = await screen({ entry: page(route), api: apiModule({}), modules, styles: true, width: 500, height: 900, script: `
                await sleep(800);
                return { h1: text($('h1')) || text($('[role=dialog] h2')), overflow: ${OVERFLOW} };` });
            assert.deepEqual(errors, [], route);
            assert.ok(result.h1, `${route} has a heading`);
            assert.ok(result.overflow.page <= 0, `${route}: no sideways scroll (${result.overflow.page}px)`);
        }
    });

    test('a methodology guide opens with its steps, with no "studied" mark anywhere', async () => {
        const { result, errors } = await screen({ entry: page('/teacher/methods/phenomenology'), api: apiModule({}), modules, styles: true, width: 1280, script: `
            await sleep(700);
            const title = text($('#method-guide-title'));
            const steps = $$('[role=dialog] ol li').length;
            const advised = window.__tcalls.some((c) => /advise/.test(c[1]));
            return { title, steps, advised, calls: window.__tcalls.filter((c) => c[1].startsWith('/methods')).length, studied: $$('button').some((b) => /studied/i.test(b.innerText)) || /\\d+ of \\d+ studied/.test(document.body.innerText) };` });
        assert.deepEqual(errors, []);
        assert.equal(result.title, 'Phenomenology');
        assert.ok(result.steps >= 5, 'the full guide, from the app');
        assert.equal(result.advised, false);
        assert.equal(result.calls, 0, 'nothing asked of the server');
        assert.equal(result.studied, false, 'no Studied button or counter');
    });
});

describe('how to publish a paper, on the Publications Map', { skip: skipWithoutStyles }, () => {
    // Inside the real layout: the board's edge-to-edge strip relies on its padding.
    const page = (route, extra = '') => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { TeacherProvider } from '${srcFile('teacher/TeacherContext.jsx')}';
import TeacherLayout from '${srcFile('teacher/TeacherLayout.jsx')}';
import Publications from '${srcFile('teacher/pages/Publications.jsx')}';
${extra}
createRoot(document.getElementById('root')).render(
  <MemoryRouter initialEntries={['${route}']}><Routes><Route path="/teacher" element={<TeacherProvider><TeacherLayout /></TeacherProvider>}><Route path="publications" element={<Publications />} /></Route></Routes></MemoryRouter>);`;
    const empty = `window.__treply = (m, u) => (u === '/publications' ? { publications: [], stats: { total: 0, byStatus: { idea: 0, drafting: 0, submitted: 0, under_review: 0, revision: 0, accepted: 0, published: 0, rejected: 0 }, byType: {}, byYear: {}, byIndexing: {}, citations: 0, hIndex: 0, upcomingDeadlines: [] } } : null);`;

    test('the guide starts closed and opens on a tap; Next walks the twelve steps', async () => {
        const { result, errors } = await screen({ entry: page('/teacher/publications', empty), api: apiModule({}), modules, styles: true, width: 1280, script: `
            await sleep(700);
            const closed = !$('#publishing-guide-body');
            $('[aria-controls=publishing-guide-body]').click(); await sleep(200);
            const first = { closed, open: !!$('#publishing-guide-body'), steps: $$('#publishing-guide ol[aria-label=Steps] li').length, title: text($('#publishing-guide article h3')) };
            click(/^\\s*Next\\s*$/); await sleep(200);
            const second = text($('#publishing-guide article h3'));
            const links = $$('#publishing-guide article a[target=_blank]').map((a) => a.href);
            $$('#publishing-guide ol button').find((b) => /Revise and respond/.test(b.innerText)).click(); await sleep(200);
            return { first, second, links, revise: text($('#publishing-guide article h3')), todo: $$('#publishing-guide article ul li').length };` });
        assert.deepEqual(errors, []);
        assert.deepEqual(result.first, { closed: true, open: true, steps: 12, title: 'Check the work is ready to publish' });
        assert.equal(result.second, 'Choose the right journal');
        assert.ok(result.links.some((h) => h.includes('scopus.com/sources')), 'links to check indexing');
        assert.equal(result.revise, 'Revise and respond to reviewers');
        assert.ok(result.todo >= 5);
    });

    test('each paper shows its next step, which opens the guide there; the form shows tips for its status', async () => {
        const { result, errors } = await screen({ entry: page('/teacher/publications'), api: apiModule({}), modules, styles: true, width: 1280, script: `
            await sleep(700);
            const closed = !$('#publishing-guide-body');
            const next = $$('button').find((b) => /Next: Wait through peer review/.test(b.innerText));
            next.click(); await sleep(300);
            const opened = text($('#publishing-guide article h3'));
            // The paper's card (the board's columns became one list of cards).
            $$('li > button').find((b) => /Mentoring circles/.test(b.innerText)).click(); await sleep(300);
            // textContent: the label is shown in capitals by CSS, which innerText reports.
            const tips = ($$('[role=dialog] p').find((p) => /At this stage/.test(p.textContent)) || {}).textContent || '';
            return { closed, hasNext: !!next, opened, tips };` });
        assert.deepEqual(errors, []);
        assert.equal(result.closed, true, 'collapsed once there are papers');
        assert.equal(result.hasNext, true);
        assert.equal(result.opened, 'Wait through peer review');
        assert.match(result.tips || '', /At this stage: Wait through peer review/);
    });

    test('on a phone: a step picker, and nothing off the screen', async () => {
        const { result, errors } = await screen({ entry: page('/teacher/publications?guide=journal'), api: apiModule({}), modules, styles: true, width: 500, height: 900, script: `
            await sleep(700);
            // The step picker is the app's own dropdown: its button shows the chosen step.
            return { picker: (() => { const s = $('#publishing-guide-step'); return !!s && getComputedStyle(s.parentElement).display !== 'none' ? s.innerText.trim() : null; })(),
                     list: getComputedStyle($('#publishing-guide ol[aria-label=Steps]')).display, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };` });
        assert.deepEqual(errors, []);
        assert.match(result.picker || '', /Choose the right journal/, 'opened from the link at its step');
        assert.equal(result.list, 'none', 'the side list is for wider screens');
        assert.ok(result.overflow <= 0, `no sideways scroll (${result.overflow}px)`);
    });
});

describe('every section teaches, with no outside service', { skip: skipWithoutStyles }, () => {
    const routed = (path, Page, file, route = '*') => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { TeacherProvider } from '${srcFile('teacher/TeacherContext.jsx')}';
import TeacherLayout from '${srcFile('teacher/TeacherLayout.jsx')}';
import ${Page} from '${srcFile(`teacher/pages/${file}.jsx`)}';
createRoot(document.getElementById('root')).render(
  <MemoryRouter initialEntries={['${path}']}><Routes><Route path="/teacher" element={<TeacherProvider><TeacherLayout /></TeacherProvider>}><Route path="${route}" element={<${Page} />} /></Route></Routes></MemoryRouter>);`;

    test('the methodology advisor answers in the app, without calling anyone', async () => {
        const { result, errors } = await screen({ entry: routed('/teacher/methods', 'Methodologies', 'Methodologies'), api: apiModule({}), modules, styles: true, width: 1280, script: `
            ${SET}
            await sleep(500);
            // The questions come first; the written question is the other way in.
            $$('[role=radio]').find((b) => /Describe my question/.test(b.innerText)).click(); await sleep(150);
            const t = $('#advisor-question');
            Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(t, 'Is there a relationship between sleep quality and academic performance of nursing students?');
            t.dispatchEvent(new Event('input', { bubbles: true })); await sleep(100);
            click(/Get advice/); await sleep(300);
            return { first: text($$('button').find((b) => /Read the guide →/.test(b.innerText))), calls: window.__tcalls.map((c) => c[1]), guides: $$('article').length };` });
        assert.deepEqual(errors, []);
        assert.match(result.first, /Correlational/);
        assert.ok(!result.calls.some((c) => /advise/.test(c)), 'no advisor request');
        assert.equal(result.guides, 12, 'all twelve guides, from the app');
    });

    test('a Research Path stage teaches itself: why, how, an example, what to avoid, opened when tapped', async () => {
        const { result, errors } = await screen({ entry: routed('/teacher/research-path', 'ResearchPath', 'ResearchPath'), api: apiModule({}), modules, styles: true, width: 1280, script: `
            await sleep(700);
            // Stages and their lessons start closed (the user's ask, 2026-10-24).
            const closed = !/Learn this stage/.test(document.body.innerText);
            $$('button').find((b) => /Topic & problem/.test(b.innerText)).click(); await sleep(200);
            const lessonClosed = !/FINER/.test(document.body.innerText);
            const panel = $$('button').find((b) => /Learn this stage/.test(b.innerText));
            panel.click(); await sleep(200);
            const body = document.body.innerText;
            const learn = { finer: /FINER/.test(body), example: /Example:/.test(body), avoid: /Avoid/i.test(body), tasks: /Your tasks/i.test(body) };
            panel.click(); await sleep(200);
            return { closed, lessonClosed, learn, folded: !/FINER/.test(document.body.innerText) };` });
        assert.deepEqual(errors, []);
        assert.equal(result.closed, true, 'the stages start closed');
        assert.equal(result.lessonClosed, true, 'the lesson starts closed');
        assert.deepEqual(result.learn, { finer: true, example: true, avoid: true, tasks: true });
        assert.equal(result.folded, true, 'it can be folded away');
    });

    test('a thesis chapter shows its own writing guide, and its headings go into the chapter', async () => {
        const { result, errors } = await screen({ entry: routed('/teacher/thesis/th1', 'ThesisEditor', 'ThesisEditor', 'thesis/:id'), api: apiModule({}), modules, styles: true, width: 1280, budget: 20_000, script: `
            // The chapter save answers as the server does.
            window.__treply = (m, u, b) => (m === 'PUT' && /chapters\\/c\\d$/.test(u) ? { chapter: { _id: u.slice(-2), title: 'Introduction', content: b.content, words: 40, status: 'drafting', targetWords: 6000 }, words: 40 } : null);
            await sleep(800);
            const title = text($('#chapter-guide-title'));
            const intro = { problem: /Statement of the problem/.test(document.body.innerText), phrases: /Useful phrases/.test(document.body.innerText) };
            click(/Add these headings to the chapter/); await sleep(200);
            const inserted = $('#chapter-text').value;
            await sleep(1900);
            const put = window.__tcalls.find((c) => c[0] === 'PUT' && /chapters\\/c1$/.test(c[1]));
            $$('nav[aria-label=Chapters] button').find((b) => /Review of Literature/.test(b.innerText)).click();
            await sleep(400);
            return { title, intro, inserted: inserted.slice(0, 40), saved: !!put, second: text($('#chapter-guide-title')), assist: window.__tcalls.some((c) => /assist/.test(c[1])) };` });
        assert.deepEqual(errors, []);
        assert.equal(result.title, 'How to write the Introduction');
        assert.deepEqual(result.intro, { problem: true, phrases: true });
        assert.match(result.inserted, /^Background of the study/);
        assert.equal(result.saved, true, 'the headings are saved with the chapter');
        assert.equal(result.second, 'How to write the Literature Review', '"Review of Literature" finds the same guide');
        assert.equal(result.assist, false, 'no assistant request');
    });

    test('the plagiarism and writing guides start closed and open on a tap, with examples', async () => {
        const plag = await screen({ entry: routed('/teacher/plagiarism', 'Plagiarism', 'Plagiarism'), api: apiModule({}), modules, styles: true, width: 1280, script: `
            await sleep(700);
            $('[aria-controls=plagiarism-guide-body]').click(); await sleep(200);
            const steps = $$('#plagiarism-guide ol[aria-label=Steps] li').length;
            $$('#plagiarism-guide ol button').find((b) => /Paraphrasing/.test(b.innerText)).click(); await sleep(200);
            const examples = $$('#plagiarism-guide article p').map((p) => p.textContent.trim()).filter((t) => t === 'Patchwriting (not acceptable)' || t === 'A real paraphrase').length;
            $$('#plagiarism-guide ol button').find((b) => /UGC/.test(b.innerText)).click(); await sleep(200);
            return { steps, examples, ugc: /Level 0 \\(up to 10%\\)/.test(document.querySelector('#plagiarism-guide').textContent) };` });
        assert.deepEqual(plag.errors, []);
        assert.equal(plag.result.steps, 9);
        assert.equal(plag.result.examples, 2, 'a bad and a good paraphrase');
        assert.equal(plag.result.ugc, true);

        const writing = await screen({ entry: routed('/teacher/writing', 'Writing', 'Writing'), api: apiModule({}), modules, styles: true, width: 500, height: 900, script: `
            await sleep(700);
            const closed = !$('#writing-guide-body');
            $('[aria-controls=writing-guide-body]').click(); await sleep(200);
            const picker = !!$('#writing-guide-step');
            $('#writing-guide-step').click(); await sleep(300);
            return { closed, open: !!$('#writing-guide-body'), picker, steps: $$('[role=option]').length, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };` });
        assert.deepEqual(writing.errors, []);
        assert.equal(writing.result.closed, true, 'closed at first');
        assert.equal(writing.result.open, true, 'opens on a tap');
        assert.equal(writing.result.steps, 9);
        assert.ok(writing.result.overflow <= 0, `no sideways scroll on a phone (${writing.result.overflow}px)`);
    });
});
