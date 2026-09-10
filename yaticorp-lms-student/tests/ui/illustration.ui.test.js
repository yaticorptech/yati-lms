/**
 * The illustration slots. Two of them must stay empty until your own artwork
 * arrives; the rest fall back to the mascot. Every image format a design tool
 * is likely to export has to be found without renaming.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { screen, srcFile, skipWithoutChrome } from './harness.js';

const api = 'export default { get: () => Promise.resolve({ data: {} }) };';
const entry = (props) => `
import { createRoot } from 'react-dom/client';
import Illustration from '${srcFile('interview/Illustration.jsx')}';
createRoot(document.getElementById('root')).render(<Illustration ${props} />);`;
const look = `await sleep(600); const img = $('img'); return { src: img && img.getAttribute('src'), count: $$('img').length };`;
// A one-pixel PNG, so the browser can actually load what it is offered.
const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

describe('the illustration slot', { skip: skipWithoutChrome }, () => {
    test('falls back to the mascot when no artwork is there', async () => {
        // The mascot art is served too, so its own missing-file guard is not what we measure.
        const { result, errors } = await screen({
            entry: entry('name="steps" pose="thumbs" height={120}'), api, script: look,
            files: { '/mascot/thumbs.png': PIXEL }
        });
        assert.deepEqual(errors, []);
        assert.match(result.src, /^\/mascot\//, 'the mascot stands in');
    });

    test('draws nothing at all where the slot asked to stay empty', async () => {
        const { result } = await screen({ entry: entry('name="steps" mascot={false} height={120}'), api, script: look });
        assert.equal(result.count, 0, 'an empty space, never a broken image or a stand-in');
    });

    test('prefers the slot\'s own file over the shared one', async () => {
        const { result } = await screen({
            entry: entry('name="steps" mascot={false} height={120}'), api, script: look,
            files: { '/illustrations/steps.png': PIXEL, '/illustrations/student.png': PIXEL }
        });
        assert.equal(result.src, '/illustrations/steps.png');
    });

    test('falls back to the shared student image', async () => {
        const { result } = await screen({
            entry: entry('name="steps" mascot={false} height={120}'), api, script: look,
            files: { '/illustrations/student.png': PIXEL }
        });
        assert.equal(result.src, '/illustrations/student.png');
    });

    for (const ext of ['webp', 'jpg', 'jpeg']) {
        test(`finds a .${ext} without renaming`, async () => {
            const { result } = await screen({
                entry: entry('name="steps" mascot={false} height={120}'), api, script: look,
                files: { [`/illustrations/steps.${ext}`]: PIXEL }
            });
            assert.equal(result.src, `/illustrations/steps.${ext}`);
        });
    }
});
