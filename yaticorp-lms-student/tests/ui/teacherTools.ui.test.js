/**
 * The teacher dashboard's newer tools, in the browser:
 *
 *   - "Add your organization", a popup from the dashboard and My profile (no
 *     menu item): find a college by its ID, ask to join, see it waiting
 *   - focus mode and version history in the writing editor
 *   - the thesis as a Word file
 *   - the APA reference list, the Excel and Word downloads, and the new
 *     volume / issue / pages fields
 *   - the six-question methodology advisor
 *   - a research project's type of study
 *   - uploading a paper for the plagiarism check
 *   - each new screen fits a phone
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles } from './harness.js';
import { apiModule } from './fixtures.js';

const ME = { _id: 't1', name: 'Dr. Meera Iyer', email: 'meera@college.edu', phone: '+91 98450 12345', cardNumber: '980000000001', institution: 'Govt. First Grade College', role: 'teacher', dailyWordGoal: 500 };
const ROUTES = {
    '/me': ME,
    '/organization': { member: false, organization: null, request: null },
    '/overview': {
        teacher: { name: 'Dr. Meera Iyer' }, organization: null, research: null,
        publications: { total: 0, published: 0, inReview: 0, byStatus: {} }, thesis: null,
        writing: { today: 0, goal: 500, last14: [] }, plagiarism: null
    },
    '/writing/w1/versions': { versions: [{ _id: 'v1', createdAt: '2026-10-22T09:00:00Z', words: 5, reason: 'auto', label: '' }, { _id: 'v2', createdAt: '2026-10-21T09:00:00Z', words: 3, reason: 'manual', label: 'Sent to supervisor' }], currentWords: 9 },
    '/writing/w1/versions/v1': { _id: 'v1', createdAt: '2026-10-22T09:00:00Z', words: 5, content: 'The first draft, kept safely.' },
    '/writing/w1': { _id: 'w1', title: 'An essay on mentoring', kind: 'essay', content: 'Mentoring matters because students learn from those they trust.', wordGoal: 500, words: 9 },
    '/writing': { pieces: [], stats: { today: 0, goal: 500, last14: Array.from({ length: 14 }, (_, i) => ({ day: `d${i}`, words: 0 })) }, kinds: [] },
    '/theses/th1': { _id: 'th1', title: 'Peer tutoring and mathematics anxiety', degree: 'PhD', targetWords: 80000, words: 0, chapters: [
        { _id: 'c1', title: 'Introduction', content: 'Some words already written in the introduction.', words: 7, targetWords: 6000, status: 'drafting' }
    ] },
    '/projects': { projects: [], template: [], kinds: [
        { key: 'general', label: 'General', description: 'The standard path.' },
        { key: 'survey', label: 'Survey / quantitative', description: 'Questionnaires and numbers.' },
        { key: 'review', label: 'Systematic review / meta-analysis', description: 'Studying the studies.' }
    ] },
    '/publications/references': { references: [{ _id: 'a1', text: 'Rao, A., & Iyer, M. (2023). Peer tutoring in rural colleges. Journal of Rural Education, 12(3), 45–60.', segments: [{ text: 'Rao, A., & Iyer, M. (2023). Peer tutoring in rural colleges. ' }, { text: 'Journal of Rural Education', italic: true }, { text: ', ' }, { text: '12', italic: true }, { text: '(3), 45–60.' }] }], total: 1 },
    '/publications': { publications: [
        { _id: 'a1', title: 'Peer tutoring in rural colleges', type: 'journal', status: 'published', venue: 'Journal of Rural Education', year: 2023, volume: '12', issue: '3', pages: '45–60', indexing: ['Scopus'], citations: 4 }
    ], stats: { total: 1, byStatus: { idea: 0, drafting: 0, submitted: 0, under_review: 0, revision: 0, accepted: 0, published: 1, rejected: 0 }, byType: {}, byYear: { 2023: 1 }, byIndexing: { Scopus: 1 }, citations: 4, hIndex: 1, upcomingDeadlines: [] } },
    '/plagiarism/sources': { sources: [], max: 50 },
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
  if (body && body.responseType === 'blob') return Promise.resolve({ data: new Blob(['file']) });
  return Promise.resolve({ data: pick(url) });
};
export default { get: (u, c) => answer('GET', u, c), post: (u, b) => answer('POST', u, b), put: (u, b) => answer('PUT', u, b), delete: (u) => answer('DELETE', u) };
export const TEACHER_TOKEN = 'teacherToken';
export const TEACHER_DATA = 'teacherData';
export const readTeacher = () => ROUTES['/me'];
export const hasTeacherSession = () => true;
export const forgetTeacher = () => {};
export const signOutTeacher = () => {};
export const messageOf = (e, f = 'Something went wrong.') => e?.response?.data?.message || f;
`;
const modules = {
    'teacher/teacherSession': teacherSessionStub,
    'native/saveFile': 'export const saveBlob = async (blob, name) => { (window.__saved ||= []).push(name); return true; };',
    'components/course/loadPdfjs': 'export const loadPdfjs = async () => { throw new Error("pdf.js is not loaded in tests"); };'
};

const page = (route, extra = '') => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { TeacherProvider } from '${srcFile('teacher/TeacherContext.jsx')}';
import TeacherLayout from '${srcFile('teacher/TeacherLayout.jsx')}';
import TeacherDashboard from '${srcFile('teacher/pages/TeacherDashboard.jsx')}';
import TeacherProfile from '${srcFile('teacher/pages/TeacherProfile.jsx')}';
import WritingEditor from '${srcFile('teacher/pages/WritingEditor.jsx')}';
import Writing from '${srcFile('teacher/pages/Writing.jsx')}';
import ThesisEditor from '${srcFile('teacher/pages/ThesisEditor.jsx')}';
import Publications from '${srcFile('teacher/pages/Publications.jsx')}';
import Methodologies from '${srcFile('teacher/pages/Methodologies.jsx')}';
import ResearchPath from '${srcFile('teacher/pages/ResearchPath.jsx')}';
import Plagiarism from '${srcFile('teacher/pages/Plagiarism.jsx')}';
${extra}
createRoot(document.getElementById('root')).render(
  <MemoryRouter initialEntries={['${route}']}>
    <Routes>
      <Route path="/teacher" element={<TeacherProvider><TeacherLayout /></TeacherProvider>}>
        <Route index element={<TeacherDashboard />} />
        <Route path="profile" element={<TeacherProfile />} />
        <Route path="writing" element={<Writing />} />
        <Route path="writing/:id" element={<WritingEditor />} />
        <Route path="thesis/:id" element={<ThesisEditor />} />
        <Route path="publications" element={<Publications />} />
        <Route path="methods" element={<Methodologies />} />
        <Route path="research-path" element={<ResearchPath />} />
        <Route path="plagiarism" element={<Plagiarism />} />
      </Route>
    </Routes>
  </MemoryRouter>);`;

const SET = `
const setVal = (el, v) => { const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
const button = (re, root = document) => [...root.querySelectorAll('button')].find((b) => re.test(b.innerText.trim()) || re.test(b.getAttribute('aria-label') || ''));
const calls = (method, re) => window.__tcalls.filter((c) => c[0] === method && re.test(c[1]));
const OVERFLOW = () => document.documentElement.scrollWidth - document.documentElement.clientWidth;`;

describe('a teacher adds their organization', { skip: skipWithoutStyles }, () => {
    test('from the dashboard: a popup to find the college by ID, ask to join, and see it waiting', async () => {
        const extra = `
let asked = false;
window.__treply = (m, u, b) => {
  if (m === 'GET' && u.startsWith('/organization/lookup/')) return { organization: { _id: 'o1', orgCode: 'st_agnes_college', name: 'St Agnes College', typeLabel: 'College' }, alreadyMember: false, hasPendingRequest: false, pendingElsewhere: false };
  if (m === 'POST' && u === '/organization/requests') { asked = true; return { message: 'Your request to join St Agnes College has been sent.' }; }
  if (m === 'GET' && u === '/organization' && asked) return { member: false, organization: null, request: { _id: 'q1', status: 'pending', requestedAt: '2026-10-23T08:00:00Z', organization: { name: 'St Agnes College', orgCode: 'st_agnes_college' } } };
  return null;
};`;
        const { result, errors } = await screen({ entry: page('/teacher', extra), api: apiModule({}), modules, styles: true, width: 500, height: 900, script: `
            ${SET}
            await sleep(500);
            button(/Add your organization/).click(); await sleep(400);
            const dialog = text($('#organization-dialog-title'));
            const empty = !!$('#org-code');
            button(/^Find$/).click(); await sleep(200);
            const needsCode = text($('#org-code').closest('div').parentElement);
            setVal($('#org-code'), 'st_agnes_college');
            button(/^Find$/).click(); await sleep(300);
            const found = /St Agnes College/.test(document.body.innerText);
            button(/Ask to join/).click(); await sleep(400);
            return { dialog, empty, needsCode, found, post: calls('POST', /^\\/organization\\/requests$/)[0], body: document.body.innerText, title: text($('#organization-dialog-title')), overview: calls('GET', /^\\/overview$/).length, overflow: OVERFLOW() };` });
        assert.deepEqual(errors, []);
        assert.equal(result.dialog, 'Add your organization');
        assert.equal(result.empty, true);
        assert.match(result.needsCode, /Enter the Organization ID/);
        assert.equal(result.found, true);
        assert.deepEqual(result.post[2], { orgCode: 'st_agnes_college' });
        assert.equal(result.title, 'Waiting for approval');
        assert.match(result.body, /request to join St Agnes College has been sent/);
        assert.equal(result.overview, 2, 'the dashboard behind refreshes');
        assert.equal(result.overflow, 0);
    });

    test('no Organization menu item; My profile opens the same popup', async () => {
        const { result, errors } = await screen({ entry: page('/teacher/profile'), api: apiModule({}), modules, styles: true, width: 1280, script: `
            ${SET}
            await sleep(400);
            const menu = $$('aside a').map((a) => a.getAttribute('href'));
            button(/Add your organization/).click(); await sleep(300);
            return { menu, dialog: text($('#organization-dialog-title')), field: !!$('#org-code') };` });
        assert.deepEqual(errors, []);
        assert.ok(!result.menu.some((h) => /organization/.test(h)), result.menu.join(' '));
        assert.equal(result.dialog, 'Add your organization');
        assert.equal(result.field, true);
    });
});

describe('focus mode and version history', { skip: skipWithoutStyles }, () => {
    test('focus mode fills a phone screen, keeps the timer and saves what is typed', async () => {
        const { result, errors } = await screen({ entry: page('/teacher/writing/w1'), api: apiModule({}), modules, styles: true, width: 500, height: 900, budget: 20000, script: `
            ${SET}
            await sleep(400);
            // Icon only on a phone: its name is its label, "Focus mode".
            button(/^Focus( mode)?$/).click(); await sleep(200);
            const dialog = $('[role=dialog][aria-label^="Focus mode"]');
            const box = dialog.getBoundingClientRect();
            const timer = !!button(/Start focus timer/, dialog);
            setVal($('#focus-text'), 'A brand new sentence written in focus mode.');
            await sleep(2000);
            const saved = calls('PUT', /^\\/writing\\/w1$/).pop();
            button(/Exit focus/, dialog).click(); await sleep(200);
            return { box: [box.width, box.height], viewport: [innerWidth, innerHeight], timer, saved: saved && saved[2], gone: !$('[role=dialog][aria-label^="Focus mode"]'), editor: $('#piece-text').value, overflow: OVERFLOW() };` });
        assert.deepEqual(errors, []);
        assert.deepEqual(result.box, result.viewport, 'the whole screen');
        assert.equal(result.timer, true);
        assert.deepEqual(result.saved, { content: 'A brand new sentence written in focus mode.' });
        assert.equal(result.gone, true);
        assert.equal(result.editor, 'A brand new sentence written in focus mode.');
        assert.equal(result.overflow, 0);
    });

    test('history lists versions; one opens, and restoring asks first and puts it in the editor', async () => {
        const extra = `window.__treply = (m, u) => (m === 'POST' && u === '/writing/w1/versions/v1/restore' ? { _id: 'w1', content: 'The first draft, kept safely.', words: 5 } : null);`;
        const { result, errors } = await screen({ entry: page('/teacher/writing/w1', extra), api: apiModule({}), modules, styles: true, width: 1280, script: `
            ${SET}
            await sleep(400);
            button(/^History$/).click(); await sleep(300);
            const items = $$('[role=dialog] li button').map((b) => b.innerText.replace(/\\s+/g, ' '));
            $$('[role=dialog] li button')[0].click(); await sleep(300);
            const preview = text($('[role=dialog] .whitespace-pre-wrap'));
            button(/Restore this version/).click(); await sleep(100);
            const warned = text($('[role=dialog] [role=alert]'));
            const early = calls('POST', /restore/).length;
            button(/Yes, restore it/).click(); await sleep(300);
            return { items, preview, warned, early, restored: calls('POST', /restore/).length, editor: $('#piece-text').value, closed: !$('#version-history-title') };` });
        assert.deepEqual(errors, []);
        assert.equal(result.items.length, 2);
        assert.match(result.items[1], /Sent to supervisor/);
        assert.equal(result.preview, 'The first draft, kept safely.');
        assert.match(result.warned, /kept in the history first/);
        assert.equal(result.early, 0, 'nothing restored before the second click');
        assert.equal(result.restored, 1);
        assert.equal(result.editor, 'The first draft, kept safely.');
        assert.equal(result.closed, true);
    });

    test('a version can be saved by hand, with a name', async () => {
        const { result, errors } = await screen({ entry: page('/teacher/writing/w1'), api: apiModule({}), modules, styles: true, width: 1280, script: `
            ${SET}
            await sleep(400);
            button(/^History$/).click(); await sleep(300);
            setVal($('#version-label'), 'Before the viva');
            button(/Save a version/).click(); await sleep(300);
            return { post: calls('POST', /^\\/writing\\/w1\\/versions$/)[0], ok: text($('[role=dialog] [role=status]')) };` });
        assert.deepEqual(errors, []);
        assert.deepEqual(result.post[2], { label: 'Before the viva' });
        assert.match(result.ok, /This version is kept/);
    });
});

describe('downloads', { skip: skipWithoutStyles }, () => {
    test('the thesis downloads as a Word file', async () => {
        const { result, errors } = await screen({ entry: page('/teacher/thesis/th1'), api: apiModule({}), modules, styles: true, width: 1280, script: `
            ${SET}
            await sleep(400);
            button(/^Word$/).click(); await sleep(300);
            return { call: calls('GET', /docx/)[0], saved: window.__saved };` });
        assert.deepEqual(errors, []);
        assert.equal(result.call[1], '/theses/th1/docx');
        assert.deepEqual(result.call[2], { responseType: 'blob' });
        assert.deepEqual(result.saved, ['Peer_tutoring_and_mathematics_anxiety.docx']);
    });

    test('the APA reference list shows journal names in italics, copies, and downloads as Word and Excel', async () => {
        const { result, errors } = await screen({ entry: page('/teacher/publications'), api: apiModule({}), modules, styles: true, width: 1280, script: `
            ${SET}
            await sleep(500);
            button(/Reference list\\s+\\(APA\\)/).click(); await sleep(300);
            const italic = $$('#references-title ~ * i, [role=dialog] ol i').map((i) => i.innerText);
            const entry = text($('[role=dialog] ol li'));
            button(/Download Word/).click(); await sleep(200);
            button(/Close/).click(); await sleep(200);
            button(/^Excel$/).click(); await sleep(200);
            return { italic, entry, exports: calls('GET', /\\/publications\\/export/).map((c) => c[2].params.format), saved: window.__saved };` });
        assert.deepEqual(errors, []);
        assert.deepEqual(result.italic, ['Journal of Rural Education', '12']);
        assert.match(result.entry, /^Rao, A\., & Iyer, M\. \(2023\)/);
        assert.deepEqual(result.exports, ['docx', 'xlsx']);
        assert.equal(result.saved.length, 2);
        assert.match(result.saved[0], /_APA\.docx$/);
        assert.match(result.saved[1], /\.xlsx$/);
    });

    test('the publication form has volume, issue, pages and publisher, and sends them', async () => {
        const { result, errors } = await screen({ entry: page('/teacher/publications'), api: apiModule({}), modules, styles: true, width: 500, height: 900, script: `
            ${SET}
            await sleep(500);
            button(/Add publication/).click(); await sleep(300);
            setVal($('#pub-title'), 'A new paper on mentoring');
            setVal($('#pub-volume'), '8'); setVal($('#pub-issue'), '2'); setVal($('#pub-pages'), '101–118'); setVal($('#pub-publisher'), 'Springer');
            button(/^Save$/).click(); await sleep(300);
            const body = calls('POST', /^\\/publications$/)[0][2];
            return { fields: [body.volume, body.issue, body.pages, body.publisher], overflow: OVERFLOW() };` });
        assert.deepEqual(errors, []);
        assert.deepEqual(result.fields, ['8', '2', '101–118', 'Springer']);
        assert.equal(result.overflow, 0);
    });
});

describe('learning: guides read, the advisor, study types', { skip: skipWithoutStyles }, () => {
    test('the guides have no "Mark as read" or read counter', async () => {
        const { result, errors } = await screen({ entry: page('/teacher/publications?guide=ready'), api: apiModule({}), modules, styles: true, width: 1280, script: `
            ${SET}
            await sleep(500);
            return { header: text($('#publishing-guide > button')), mark: !!button(/Mark as read/), asked: calls('GET', /guides/).length };` });
        assert.deepEqual(errors, []);
        assert.doesNotMatch(result.header, /read/i);
        assert.equal(result.mark, false);
        assert.equal(result.asked, 0);
    });

    test('six answers suggest the experimental design for "does it cause a change, with a comparison group"', async () => {
        const { result, errors } = await screen({ entry: page('/teacher/methods'), api: apiModule({}), modules, styles: true, width: 500, height: 900, script: `
            ${SET}
            await sleep(400);
            const picks = [/causes a change/, /compare with a group/, /^Numbers/, /^Many people/, /term or semester/, /tested answer/];
            const asked = [];
            for (const re of picks) { asked.push(text($('fieldset p'))); button(re).click(); await sleep(150); }
            const first = $$('[aria-live=polite] .grid button')[0];
            return { asked, first: first && first.innerText, overflow: OVERFLOW() };` });
        assert.deepEqual(errors, []);
        assert.equal(result.asked.length, 6);
        assert.match(result.asked[0], /What do you mainly want to do/);
        assert.match(result.first, /Strong fit/);
        assert.match(result.first, /Experimental/);
        assert.equal(result.overflow, 0);
    });

    test('a new research project asks for its type of study and sends it', async () => {
        const extra = `window.__treply = (m, u, b) => (m === 'POST' && u === '/projects' ? { _id: 'p9', title: b.title, kind: b.kind, goal: 'phd', stages: [], progress: { percent: 0, done: 0, total: 0, perStage: [], current: null, nextTasks: [] } } : null);`;
        const { result, errors } = await screen({ entry: page('/teacher/research-path', extra), api: apiModule({}), modules, styles: true, width: 1280, script: `
            ${SET}
            await sleep(400);
            button(/Start a research path/).click(); await sleep(300);
            const kinds = $$('input[name=project-kind]').map((i) => i.value);
            setVal($('#project-title'), 'A review of peer tutoring studies');
            $$('input[name=project-kind]').find((i) => i.value === 'review').click(); await sleep(100);
            button(/^Create$/).click(); await sleep(300);
            return { kinds, body: calls('POST', /^\\/projects$/)[0][2] };` });
        assert.deepEqual(errors, []);
        assert.deepEqual(result.kinds, ['general', 'survey', 'review']);
        assert.equal(result.body.kind, 'review');
        assert.equal(result.body.title, 'A review of peer tutoring studies');
    });
});

describe('Independent Writing and uploaded sources', { skip: skipWithoutStyles }, () => {
    test('the Independent Writing page has no calendar and no streak', async () => {
        const { result, errors } = await screen({ entry: page('/teacher/writing'), api: apiModule({}), modules, styles: true, width: 500, height: 900, script: `
            ${SET}
            await sleep(500);
            return { body: document.body.innerText, asked: calls('GET', /calendar/).length, overflow: OVERFLOW() };` });
        assert.deepEqual(errors, []);
        assert.doesNotMatch(result.body, /calendar|streak/i);
        assert.match(result.body, /Last 14 days/i);
        assert.equal(result.asked, 0);
        assert.equal(result.overflow, 0);
    });

    test('a text file uploaded as a source is read and sent, and the page says the check uses it', async () => {
        const extra = `window.__treply = (m, u, b) => {
  if (m === 'POST' && u === '/plagiarism/sources') { window.__added = true; return { _id: 's1', title: 'rao2021', words: 40, createdAt: '2026-10-23' }; }
  if (m === 'GET' && u === '/plagiarism/sources' && window.__added) return { sources: [{ _id: 's1', title: 'rao2021', words: 40, createdAt: '2026-10-23' }], max: 50 };
  return null;
};`;
        const { result, errors } = await screen({ entry: page('/teacher/plagiarism', extra), api: apiModule({}), modules, styles: true, width: 1280, budget: 45000, script: `
            ${SET}
            await sleep(500);
            const input = $('#source-files');
            const dt = new DataTransfer();
            dt.items.add(new File(['Peer tutoring benefits both the tutor and the tutee because explaining a concept forces the tutor to organise their own understanding.'], 'rao2021.txt', { type: 'text/plain' }));
            input.files = dt.files;
            input.dispatchEvent(new Event('change', { bubbles: true }));
            // Reading a file is real I/O, which the page's fast-forwarded clock does not wait for.
            for (let i = 0; i < 300 && !/Added/.test(document.body.innerText); i += 1) await sleep(100);
            return { post: calls('POST', /^\\/plagiarism\\/sources$/)[0], body: document.body.innerText };` });
        assert.deepEqual(errors, []);
        assert.equal(result.post[2].fileName, 'rao2021.txt');
        assert.match(result.post[2].text, /^Peer tutoring benefits/);
        assert.match(result.body, /Added “rao2021”/);
        assert.match(result.body, /the 1 paper you uploaded/);
    });
});
