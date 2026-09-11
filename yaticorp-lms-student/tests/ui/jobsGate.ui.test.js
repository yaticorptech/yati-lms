/**
 * The lock on the Jobs section: a quarter of the way through your courses
 * opens it.
 *
 * A gate is worth testing from both sides. Too strict and students who have
 * done the work are told to go away; too loose and it may as well not be there.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles } from './harness.js';
import { apiModule } from './fixtures.js';

/** Enrolled courses at the given progress values. */
const withCourses = (...progress) => apiModule({
    '/user/courses': { courses: progress.map((p, i) => ({ _id: `c${i}`, title: `Course ${i + 1}`, progress: p })) }
});

const entry = `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import useCourseCompletion from '${srcFile('hooks/useCourseCompletion.js')}';
import JobsLockedNotice from '${srcFile('jobs/JobsLockedNotice.jsx')}';
const Gate = () => {
  const { loading, unlocked, total, percent, required } = useCourseCompletion();
  if (loading) return <p>loading</p>;
  if (unlocked) return <p id="open">The jobs board</p>;
  return <JobsLockedNotice total={total} percent={percent} required={required} />;
};
createRoot(document.getElementById('root')).render(<MemoryRouter><Gate /></MemoryRouter>);`;

const read = `
    await sleep(800);
    return { open: !!$('#open'), body: text(document.body) };`;

describe('who may open the Jobs section', { skip: skipWithoutStyles }, () => {
    test('a quarter of the way through opens it', async () => {
        const { result, errors } = await screen({ entry, api: withCourses(25), styles: true, script: read });
        assert.deepEqual(errors, []);
        assert.ok(result.open, '25% is enough');
    });

    test('further than that opens it too', async () => {
        const { result } = await screen({ entry, api: withCourses(40, 100, 10), styles: true, script: read });
        assert.ok(result.open, 'an average of 50% is comfortably past the bar');
    });

    test('a student who has barely started is held back, and told how far', async () => {
        const { result } = await screen({ entry, api: withCourses(10, 0), styles: true, script: read });
        assert.equal(result.open, false);
        assert.match(result.body, /Keep going a little further/);
        assert.match(result.body, /Your progress/);
        assert.match(result.body, /5%/, 'their own figure is shown');
        assert.match(result.body, /another 20% away/, 'and what is left to do');
    });

    test('one course out of eight does not count as a quarter of the way', async () => {
        const { result } = await screen({ entry, api: withCourses(100, 0, 0, 0, 0, 0, 0, 0), styles: true, script: read });
        assert.equal(result.open, false, 'the average is 13%, not 100%');
    });

    test('a student with no courses is asked to start one', async () => {
        const { result } = await screen({ entry, api: withCourses(), styles: true, script: read });
        assert.equal(result.open, false);
        assert.match(result.body, /Start a course first/);
        assert.equal(/Your progress/.test(result.body), false, 'no progress bar when there is no progress');
    });

    test('finishing everything still opens it, as it always did', async () => {
        const { result } = await screen({ entry, api: withCourses(100, 100), styles: true, script: read });
        assert.ok(result.open);
    });

    test('a failed request opens the section rather than locking them out', async () => {
        const failing = `
window.__calls = [];
const nope = () => Promise.reject(new Error('network'));
export default { get: nope, post: nope, put: nope, delete: nope };`;
        const { result } = await screen({ entry, api: failing, styles: true, script: read });
        assert.ok(result.open, 'a dropped connection must not read as "you have not studied"');
    });
});
