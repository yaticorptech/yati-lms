/**
 * Picking up where the student left off in the course player.
 *
 * A lesson video is one large file, and the page reloads more often than
 * anyone means it to: a phone locking its screen or switching apps is enough.
 * Two things used to send a student back to the start — the course always
 * opened on lesson one, and the video always opened at 0:00. Now the lesson
 * that was open is reopened, and the video is restored to where it was.
 *
 * The video is a silent WAV served by the harness: Chrome plays audio-only
 * files through a <video> element, and its length is known from the header,
 * which is all the restore needs. No ffmpeg, no binary fixture.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { screen, srcFile, skipWithoutChrome } from './harness.js';
import { apiModule } from './fixtures.js';

/** `seconds` of 8-bit mono silence: the smallest thing Chrome will call a video. */
const silentWav = (seconds, rate = 8000) => {
    const n = seconds * rate;
    const buf = Buffer.alloc(44 + n);
    buf.write('RIFF', 0); buf.writeUInt32LE(36 + n, 4); buf.write('WAVE', 8);
    buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
    buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate, 28); buf.writeUInt16LE(1, 32); buf.writeUInt16LE(8, 34);
    buf.write('data', 36); buf.writeUInt32LE(n, 40); buf.fill(128, 44);
    return buf;
};
const files = { '/lesson.wav': silentWav(60) };

const lesson = (id, title) => ({ _id: id, title, type: 'video', videoSource: 'generic', videoUrl: '/lesson.wav' });
const course = (completedLessons) => ({
    course: { _id: 'C1', title: 'Backend with Node' },
    modules: [
        { _id: 'M1', title: 'Getting started', lessons: [lesson('L1', 'Welcome'), lesson('L2', 'Setting up')] },
        { _id: 'M2', title: 'Express', lessons: [lesson('L3', 'Your first route')] }
    ],
    progress: { completedLessons, percentage: Math.round((completedLessons.length / 3) * 100) }
});
// The playback route is listed first: the stub matches by "url contains key",
// and the course key is a prefix of the playback one.
const api = (completedLessons, playback = null) => apiModule({
    '/user/courses/C1/playback': playback || { activeLessonId: null, activeLessonAt: null, positions: {} },
    '/user/courses/C1': course(completedLessons)
});

/** The player at /learn/C1, after `setup` has run in the page. */
const entry = (setup = '') => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthContext } from '${srcFile('context/AuthContext.jsx')}';
import CoursePlayer from '${srcFile('pages/CoursePlayer.jsx')}';
${setup}
createRoot(document.getElementById('root')).render(
  <AuthContext.Provider value={{ user: { name: 'Bhagyashree' }, setUser: () => {} }}>
    <MemoryRouter initialEntries={['/learn/C1']}>
      <Routes><Route path="/learn/:courseId" element={<CoursePlayer />} /></Routes>
    </MemoryRouter>
  </AuthContext.Provider>);`;

const OPENED = `
  await sleep(800);
  return {
    active: text($('button.border-indigo-600')),
    heading: text($('h2')),
    lessonsShown: $$('button.border-l-4').map((b) => text(b)),
    videoSrc: ($('video') || {}).getAttribute?.('src') || null
  };`;

describe('the lesson the course opens on', { skip: skipWithoutChrome }, () => {
    test('is the one that was open last time', async () => {
        const { result, errors } = await screen({
            entry: entry(`localStorage.setItem('yati:active-lesson:C1', 'L3');`),
            api: api(['L1', 'L2']), files, script: OPENED
        });
        assert.deepEqual(errors, []);
        assert.match(result.active, /Your first route/);
        assert.equal(result.heading, 'Your first route');
        assert.equal(result.lessonsShown.length, 1, 'only its module is expanded');
        assert.equal(result.videoSrc, '/lesson.wav');
    });

    test('is the first lesson when nothing is remembered', async () => {
        const { result, errors } = await screen({ entry: entry(), api: api(['L1', 'L2']), files, script: OPENED });
        assert.deepEqual(errors, []);
        assert.match(result.active, /Welcome/);
        assert.equal(result.heading, 'Welcome');
        assert.equal(result.lessonsShown.length, 2, 'the first module is expanded');
    });

    test('is the first lesson when the remembered one is locked again', async () => {
        const { result, errors } = await screen({
            entry: entry(`localStorage.setItem('yati:active-lesson:C1', 'L3');`),
            api: api([]), files, script: OPENED
        });
        assert.deepEqual(errors, []);
        assert.match(result.active, /Welcome/);
        assert.equal(result.heading, 'Welcome');
    });

    test('is written down when the student picks a lesson', async () => {
        const { result, errors } = await screen({
            entry: entry(), api: api(['L1', 'L2']), files,
            script: `
  await sleep(800);
  const clicked = click(/Setting up/, 'button');
  await sleep(300);
  return { clicked, heading: text($('h2')), remembered: JSON.parse(localStorage.getItem('yati:active-lesson:C1')) };`
        });
        assert.deepEqual(errors, []);
        assert.equal(result.clicked, true);
        assert.equal(result.heading, 'Setting up');
        assert.equal(result.remembered.id, 'L2');
        assert.ok(result.remembered.at > 0, 'dated, so another device\'s record can be compared with it');
    });
});

describe('the server\'s copy', { skip: skipWithoutChrome }, () => {
    test('opens the lesson another device was on, when that is the later record', async () => {
        const { result, errors } = await screen({
            entry: entry(`localStorage.setItem('yati:active-lesson:C1', JSON.stringify({ id: 'L2', at: 100 }));`),
            api: api(['L1', 'L2'], { activeLessonId: 'L3', activeLessonAt: 200, positions: {} }), files, script: OPENED
        });
        assert.deepEqual(errors, []);
        assert.equal(result.heading, 'Your first route');
    });

    test('yields to this device when this device is the later record', async () => {
        const { result, errors } = await screen({
            entry: entry(`localStorage.setItem('yati:active-lesson:C1', JSON.stringify({ id: 'L2', at: 300 }));`),
            api: api(['L1', 'L2'], { activeLessonId: 'L3', activeLessonAt: 200, positions: {} }), files, script: OPENED
        });
        assert.deepEqual(errors, []);
        assert.equal(result.heading, 'Setting up');
    });

    test('is told which lesson was picked', async () => {
        const { result, errors } = await screen({
            entry: entry(), api: api(['L1', 'L2']), files,
            script: `
  await sleep(800);
  click(/Setting up/, 'button');
  await sleep(300);
  return { puts: window.__calls.filter((c) => c[0] === 'PUT') };`
        });
        assert.deepEqual(errors, []);
        assert.equal(result.puts.length, 1);
        assert.equal(result.puts[0][1], '/user/courses/C1/playback');
        assert.equal(result.puts[0][2].activeLessonId, 'L2');
        assert.ok(result.puts[0][2].at > 0);
    });

    const RESTORE = `
  let video = null;
  for (let i = 0; i < 50 && !video; i++) { video = $('video'); if (!video) await sleep(100); }
  for (let i = 0; i < 100 && video && video.readyState < 1; i++) await sleep(100);
  await sleep(500);
  const restored = video.currentTime;
  video.dispatchEvent(new Event('pause'));
  await sleep(100);
  return { restored, puts: window.__calls.filter((c) => c[0] === 'PUT') };`;

    test('a newer position from another device is where the video starts', async () => {
        const { result, errors } = await screen({
            entry: entry(`localStorage.setItem('yati:video-pos:L1', JSON.stringify({ seconds: 42, at: 100 }));`),
            api: api([], { activeLessonId: null, activeLessonAt: null, positions: { L1: { seconds: 20, at: 200 } } }),
            files, budget: 20000, script: RESTORE
        });
        assert.deepEqual(errors, []);
        assert.ok(Math.abs(result.restored - 20) < 0.5, `started at the server's 0:20 (got ${result.restored})`);
    });

    test('an older one is ignored in favour of this device, and a pause is sent to the server', async () => {
        const { result, errors } = await screen({
            entry: entry(`localStorage.setItem('yati:video-pos:L1', JSON.stringify({ seconds: 42, at: 300 }));`),
            api: api([], { activeLessonId: null, activeLessonAt: null, positions: { L1: { seconds: 20, at: 200 } } }),
            files, budget: 20000, script: RESTORE
        });
        assert.deepEqual(errors, []);
        assert.ok(Math.abs(result.restored - 42) < 0.5, `started at this device's 0:42 (got ${result.restored})`);
        const sent = result.puts.map((c) => c[2]).filter((b) => b.lessonId === 'L1');
        assert.ok(sent.length >= 1, 'the pause was sent to the server');
        const last = sent[sent.length - 1];
        assert.ok(Math.abs(last.seconds - 42) < 0.5, `with the position (got ${last.seconds})`);
        assert.ok(last.at > 0);
    });
});

describe('the video position', { skip: skipWithoutChrome }, () => {
    test('is restored, guarded against skipping ahead, and saved on pause', async () => {
        const { result, errors } = await screen({
            entry: entry(`localStorage.setItem('yati:video-pos:L1', '42');`),
            api: api([]), files, budget: 20000,
            script: `
  let video = null;
  for (let i = 0; i < 50 && !video; i++) { video = $('video'); if (!video) await sleep(100); }
  if (!video) return { noVideo: true };
  for (let i = 0; i < 100 && video.readyState < 1; i++) await sleep(100);
  await sleep(500);
  const restored = video.currentTime;
  const pill = $$('div').find((d) => d.children.length === 0 && /^Resumed from/.test(d.textContent));
  // Skipping ahead of the furthest point watched snaps back to it.
  video.currentTime = 55;
  await sleep(500);
  const afterSkip = video.currentTime;
  // Going back is always allowed.
  video.currentTime = 10;
  await sleep(500);
  const afterRewind = video.currentTime;
  // A pause writes the position down.
  video.dispatchEvent(new Event('pause'));
  await sleep(100);
  return {
    duration: video.duration, readyState: video.readyState, restored, pill: text(pill),
    afterSkip, afterRewind, saved: JSON.parse(localStorage.getItem('yati:video-pos:L1'))
  };`
        });
        assert.deepEqual(errors, []);
        assert.equal(result.noVideo, undefined, 'the player rendered a video element');
        assert.ok(result.readyState >= 1, `the file loaded (readyState ${result.readyState})`);
        assert.ok(Math.abs(result.duration - 60) < 1, `a 60s file (got ${result.duration})`);
        assert.ok(Math.abs(result.restored - 42) < 0.5, `resumed at 0:42 (got ${result.restored})`);
        assert.equal(result.pill, 'Resumed from 0:42');
        assert.ok(Math.abs(result.afterSkip - 42) < 0.5, `skipping ahead snapped back to 0:42 (got ${result.afterSkip})`);
        assert.ok(Math.abs(result.afterRewind - 10) < 0.5, `rewinding was allowed (got ${result.afterRewind})`);
        assert.ok(Math.abs(result.saved.seconds - 10) < 0.5, `the pause saved 0:10 (got ${result.saved.seconds})`);
        assert.ok(result.saved.at > 0, 'and dated it');
    });

    test('a position at the very end starts the video over', async () => {
        const { result, errors } = await screen({
            entry: entry(`localStorage.setItem('yati:video-pos:L1', '59.5');`),
            api: api([]), files, budget: 20000,
            script: `
  let video = null;
  for (let i = 0; i < 50 && !video; i++) { video = $('video'); if (!video) await sleep(100); }
  for (let i = 0; i < 100 && video && video.readyState < 1; i++) await sleep(100);
  await sleep(500);
  return { readyState: video.readyState, at: video.currentTime,
    pill: !!$$('div').find((d) => d.children.length === 0 && /^Resumed from/.test(d.textContent)) };`
        });
        assert.deepEqual(errors, []);
        assert.ok(result.readyState >= 1, 'the file loaded');
        assert.equal(result.at, 0);
        assert.equal(result.pill, false, 'no resume notice for a fresh start');
    });
});
