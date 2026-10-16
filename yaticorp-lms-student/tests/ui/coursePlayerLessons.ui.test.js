/**
 * The course player's lessons (audit, 2026-10-14):
 *
 *   - a locked lesson says why when it is tapped — the date, for one whose
 *     module is not open yet — instead of a tooltip a phone never shows;
 *   - Mark Complete waits while it saves, so a double-click sends it once,
 *     and a done lesson offers the next one;
 *   - /learn/:id?lesson=<id> opens that lesson when it can be opened;
 *   - a quiz lesson with no questions can be marked done; one that fails to
 *     load offers Try again; its options are a keyboard radio group;
 *   - the credits a first attempt earns show above the phone's bar, outside
 *     the page, with the server's balance;
 *   - a reading (a PDF that is not for download) is drawn in the page, with
 *     no iframe and no download, and offers Open if it cannot be read;
 *   - a video watched to the end stays watched after a reload.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { screen, srcFile, skipWithoutChrome } from './harness.js';

const silentWav = (seconds, rate = 8000) => {
    const n = seconds * rate;
    const buf = Buffer.alloc(44 + n);
    buf.write('RIFF', 0); buf.writeUInt32LE(36 + n, 4); buf.write('WAVE', 8);
    buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
    buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate, 28); buf.writeUInt16LE(1, 32); buf.writeUInt16LE(8, 34);
    buf.write('data', 36); buf.writeUInt32LE(n, 40); buf.fill(128, 44);
    return buf;
};

const lesson = (id, title, extra = {}) => ({ _id: id, title, type: 'generic', ...extra });
const courseOf = (modules, completedLessons = []) => ({
    course: { _id: 'C1', title: 'Backend with Node' },
    modules,
    progress: { completedLessons, percentage: 0 }
});
const BASIC = [
    { _id: 'M1', title: 'Getting started', lessons: [lesson('L1', 'Welcome'), lesson('L2', 'Setting up')] },
    { _id: 'M2', title: 'Express', locked: true, unlockAt: '2027-03-15T09:00:00.000Z', lessons: [{ _id: 'L3', title: 'Your first route', type: 'generic', locked: true }] }
];
const QUIZ = { _id: 'QZ', lessonId: 'Q1', passingScore: 50, questions: [{ _id: 'a', questionText: 'Two plus two?', options: ['3', '4', '5'] }] };
const QUIZ_LESSON = [{ _id: 'M1', title: 'Check', lessons: [lesson('Q1', 'Check yourself', { type: 'quiz', quizId: 'QZ' }), lesson('L9', 'After the quiz')] }];

/**
 * The API, answering as the server does: the course, progress saved after
 * `delay` ms, the lesson's quiz (`quiz`: an object, 'none' for a lesson with
 * no quiz, failing its first `quizFails` reads), and a quiz `submit` reply.
 */
const playerApi = ({ data, quiz = null, quizFails = 0, submit = null, delay = 0 }) => `
window.__calls = [];
const data = ${JSON.stringify(data)};
let completed = [...data.progress.completedLessons];
let quizReads = 0;
const reply = (body, ms = 0) => new Promise((r) => setTimeout(() => r({ data: body }), ms));
const fail = (status, body) => Promise.reject(Object.assign(new Error('Request failed'), { isAxiosError: true, response: { status, data: body } }));
export default {
  defaults: {},
  get: (url) => { window.__calls.push(['GET', url]);
    if (url.includes('/playback')) return reply({ activeLessonId: null, activeLessonAt: null, positions: {} });
    if (url.includes('/quiz')) {
      quizReads += 1;
      if (quizReads <= ${quizFails}) return fail(500, { message: 'Server error' });
      const quiz = ${JSON.stringify(quiz)};
      return quiz === 'none' ? fail(404, { code: 'NO_QUIZ', message: 'This lesson has no quiz questions yet.' }) : reply(quiz);
    }
    if (url.includes('/user/courses/')) return reply({ ...data, progress: { ...data.progress, completedLessons: completed } });
    return reply({}); },
  post: (url, body) => { window.__calls.push(['POST', url, body]);
    if (url.includes('/progress/update')) {
      completed = [...new Set([...completed, body.lessonId])];
      return reply({ progress: { completedLessons: completed, percentage: 50 }, rewards: { events: [] } }, ${delay});
    }
    if (url.includes('/quiz/submit')) return reply(${JSON.stringify(submit)});
    return reply({}); },
  put: (url, body) => { window.__calls.push(['PUT', url, body]); return reply({}); },
  delete: () => reply({})
};`;

const entry = ({ route = '/learn/C1', setup = '', user = { _id: 'U1', name: 'Asha', credits: 150 } } = {}) => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthContext } from '${srcFile('context/AuthContext.jsx')}';
import CoursePlayer from '${srcFile('pages/CoursePlayer.jsx')}';
${setup}
const Where = () => <p id="where">{useLocation().search || '(none)'}</p>;
window.__user = null;
createRoot(document.getElementById('root')).render(
  <AuthContext.Provider value={{ user: ${JSON.stringify(user)}, setUser: (u) => { window.__user = u; } }}>
    <MemoryRouter initialEntries={['${route}']}>
      <Routes><Route path="/learn/:courseId" element={<><CoursePlayer /><Where /></>} /></Routes>
    </MemoryRouter>
  </AuthContext.Provider>);`;

describe('locked lessons', { skip: skipWithoutChrome }, () => {
    test('say why when tapped: the earlier lessons, or the date the module opens', async () => {
        const { result, errors } = await screen({ entry: entry(), api: playerApi({ data: courseOf(BASIC) }), script: `
            await sleep(700);
            click(/Setting up/, 'button'); await sleep(150);
            const order = text($('[role="status"]'));
            click(/Express/, 'button'); await sleep(150);
            click(/Your first route/, 'button'); await sleep(150);
            const drip = text($('[role="status"]'));
            return { order, drip, heading: text($('h2')),
              disabled: $$('button.border-l-4').filter((b) => b.disabled).length,
              ariaDisabled: $$('button.border-l-4[aria-disabled="true"]').length };` });
        assert.deepEqual(errors, []);
        assert.match(result.order, /Complete the previous lessons/);
        assert.match(result.drip, /^Available on .*2027/);
        assert.doesNotMatch(result.drip, /previous lessons/);
        assert.equal(result.heading, 'Welcome', 'neither opened');
        assert.equal(result.disabled, 0, 'tappable, so they can say why');
        assert.equal(result.ariaDisabled, 2);
    });
});

describe('Mark Complete', { skip: skipWithoutChrome }, () => {
    test('waits while it saves, so a double-click sends once; then Next lesson opens the next one', async () => {
        const { result, errors } = await screen({ entry: entry(), api: playerApi({ data: courseOf(BASIC), delay: 600 }), script: `
            await sleep(700);
            const button = find(/Mark Complete/);
            button.click(); button.click();
            await sleep(100);
            const saving = find(/Saving/);
            const during = { saving: !!saving, disabled: saving ? saving.disabled : null };
            await sleep(900);
            const posts = window.__calls.filter((c) => c[0] === 'POST' && c[1].includes('/progress/update')).length;
            const next = find(/Next lesson/);
            if (next) next.click();
            await sleep(300);
            return { during, posts, hadNext: !!next, heading: text($('h2')), done: !!find(/Completed/) };` });
        assert.deepEqual(errors, []);
        assert.deepEqual(result.during, { saving: true, disabled: true });
        assert.equal(result.posts, 1, 'sent once');
        assert.equal(result.hadNext, true);
        assert.equal(result.heading, 'Setting up');
    });
});

describe('a lesson named in the address', { skip: skipWithoutChrome }, () => {
    test('opens when it can, and leaves the address', async () => {
        const { result, errors } = await screen({ entry: entry({ route: '/learn/C1?lesson=L2' }), api: playerApi({ data: courseOf(BASIC, ['L1']) }), script: `
            await sleep(800);
            return { heading: text($('h2')), search: text($('#where')) };` });
        assert.deepEqual(errors, []);
        assert.equal(result.heading, 'Setting up');
        assert.equal(result.search, '(none)');
    });

    test('a locked one is not opened: the course opens where the student is up to', async () => {
        const { result, errors } = await screen({ entry: entry({ route: '/learn/C1?lesson=L3' }), api: playerApi({ data: courseOf(BASIC) }), script: `
            await sleep(800);
            return { heading: text($('h2')) };` });
        assert.deepEqual(errors, []);
        assert.equal(result.heading, 'Welcome');
    });
});

describe('quiz lessons', { skip: skipWithoutChrome }, () => {
    test('with no questions, the lesson can be marked complete', async () => {
        const { result, errors } = await screen({ entry: entry(), api: playerApi({ data: courseOf(QUIZ_LESSON), quiz: 'none' }), script: `
            await sleep(800);
            const note = text(document.body);
            const button = find(/Mark Complete/);
            const enabled = !!button && !button.disabled;
            if (button) button.click();
            await sleep(300);
            return { note, enabled, posted: window.__calls.some((c) => c[0] === 'POST' && c[1].includes('/progress/update') && c[2].lessonId === 'Q1') };` });
        assert.deepEqual(errors, []);
        assert.match(result.note, /doesn.t have any questions yet/);
        assert.equal(result.enabled, true);
        assert.equal(result.posted, true);
    });

    test('one that fails to load offers Try again; its options are a radio group the arrow keys move through', async () => {
        const { result, errors } = await screen({ entry: entry(), api: playerApi({ data: courseOf(QUIZ_LESSON), quiz: QUIZ, quizFails: 1 }), script: `
            await sleep(800);
            const alert = text($('[role="alert"]'));
            const retried = click(/Try again/);
            await sleep(400);
            const group = $('[role="radiogroup"]');
            const radios = $$('[role="radio"]');
            const tabbable = radios.map((r) => r.tabIndex);
            radios[0].focus();
            radios[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
            await sleep(100);
            const checked = $$('[role="radio"]').map((r) => r.getAttribute('aria-checked'));
            return { alert, retried, named: text(document.getElementById(group.getAttribute('aria-labelledby'))),
              count: radios.length, tabbable, checked, focused: text(document.activeElement) };` });
        assert.deepEqual(errors, []);
        assert.match(result.alert, /could not be loaded/);
        assert.equal(result.retried, true);
        assert.match(result.named, /Two plus two/);
        assert.equal(result.count, 3);
        assert.deepEqual(result.tabbable, [0, -1, -1], 'one Tab stop');
        assert.deepEqual(result.checked, ['false', 'true', 'false']);
        assert.equal(result.focused, '4');
    });

    test("a first attempt's credits show outside the page, with the server's balance", async () => {
        const submit = { score: 100, correctCount: 1, totalQuestions: 1, passed: true, creditsEarned: 100, totalCredits: 250, rewards: { events: [] },
            results: [{ questionId: 'a', providedAnswer: 1, correctAnswer: 1, isCorrect: true, explanation: '' }] };
        const { result, errors } = await screen({ entry: entry(), api: playerApi({ data: courseOf(QUIZ_LESSON), quiz: QUIZ, submit }), script: `
            await sleep(800);
            $$('[role="radio"]')[1].click(); await sleep(100);
            click(/Submit Assessment/); await sleep(500);
            const toast = $$('[role="status"]').find((el) => /Credits Earned/.test(el.innerText));
            return { toast: !!toast, outside: !!toast && toast.parentElement === document.body,
              dismiss: toast ? toast.querySelector('button').getAttribute('aria-label') : null,
              credits: window.__user && window.__user.credits, passed: !!find(/Next lesson/) };` });
        assert.deepEqual(errors, []);
        assert.equal(result.toast, true);
        assert.equal(result.outside, true, 'out at the end of the page, above the phone bar');
        assert.equal(result.dismiss, 'Dismiss');
        assert.equal(result.credits, 250, "the server's balance, not this page's sum");
        assert.equal(result.passed, true, 'the pass completed the lesson and offers the next one');
    });
});

describe('a reading', { skip: skipWithoutChrome }, () => {
    const pdfLesson = [{ _id: 'M1', title: 'Read', lessons: [lesson('P1', 'The handbook', { type: 'pdf', pdfUrl: '/handbook.pdf', allowDownload: false })] }];
    const fakePdfjs = (works) => `
        export const loadPdfjs = async () => ({
          getDocument: () => ({
            promise: ${works ? `Promise.resolve({ numPages: 2, getPage: async () => ({
              getViewport: ({ scale }) => ({ width: 600 * scale, height: 800 * scale }),
              render: () => { window.__drawn = (window.__drawn || 0) + 1; return { promise: Promise.resolve(), cancel() {} }; }
            }) })` : `Promise.reject(new Error('Unexpected server response (403)'))`},
            destroy() {}
          })
        });`;

    test('is drawn in the page, a canvas a page, with no iframe and no download', async () => {
        const { result, errors } = await screen({
            entry: entry(), api: playerApi({ data: courseOf(pdfLesson) }),
            modules: { 'components/course/loadPdfjs': fakePdfjs(true) },
            script: `
            await sleep(900);
            return { iframes: $$('iframe').length, pages: $$('[data-pdf-viewer] canvas').length, drawn: window.__drawn || 0,
              download: !!find(/Download/), named: ($('[data-pdf-viewer] canvas') || {}).getAttribute?.('aria-label') };` });
        assert.deepEqual(errors, []);
        assert.equal(result.iframes, 0);
        assert.equal(result.pages, 2);
        assert.ok(result.drawn >= 1, `drawn (${result.drawn})`);
        assert.equal(result.download, false);
        assert.equal(result.named, 'The handbook, page 1');
    });

    test('that cannot be read offers Open instead', async () => {
        const { result, errors } = await screen({
            entry: entry(), api: playerApi({ data: courseOf(pdfLesson) }),
            modules: { 'components/course/loadPdfjs': fakePdfjs(false), 'native/saveFile': 'export const saveBlob = async () => {}; export const openExternal = async (url) => { window.__opened = url; };' },
            script: `
            await sleep(900);
            const open = find(/^Open/);
            if (open) open.click();
            await sleep(100);
            return { said: text(document.body), open: !!open, opened: window.__opened || null, download: !!find(/Download/) };` });
        assert.deepEqual(errors.filter((e) => !/403/.test(e)), []);
        assert.match(result.said, /could not be shown here/);
        assert.equal(result.open, true);
        assert.equal(result.opened, '/handbook.pdf');
        assert.equal(result.download, false);
    });
});

describe('a video watched to the end', { skip: skipWithoutChrome }, () => {
    const videoLesson = [{ _id: 'M1', title: 'Watch', lessons: [lesson('V1', 'Intro video', { type: 'video', videoSource: 'generic', videoUrl: '/lesson.wav' })] }];
    const files = { '/lesson.wav': silentWav(20) };
    const READ = `
        await sleep(900);
        const button = find(/Mark Complete/);
        return { enabled: !!button && !button.disabled, note: /Finish watching/.test(document.body.innerText) };`;

    test('stays watched after a reload, for this student', async () => {
        const { result, errors } = await screen({
            entry: entry({ setup: `localStorage.setItem('yati:video-watched:U1:V1', JSON.stringify({ at: 1 }));` }),
            api: playerApi({ data: courseOf(videoLesson) }), files, script: READ
        });
        assert.deepEqual(errors, []);
        assert.equal(result.enabled, true);
        assert.equal(result.note, false);
    });

    test('is still asked for when it was another student who watched it', async () => {
        const { result, errors } = await screen({
            entry: entry({ setup: `localStorage.setItem('yati:video-watched:U2:V1', JSON.stringify({ at: 1 }));` }),
            api: playerApi({ data: courseOf(videoLesson) }), files, script: READ
        });
        assert.deepEqual(errors, []);
        assert.equal(result.enabled, false);
        assert.equal(result.note, true);
    });
});
