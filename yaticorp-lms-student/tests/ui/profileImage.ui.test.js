/**
 * Profile pictures that cannot be shown as saved.
 *
 * Some students' pictures came out as the browser's broken-image icon — in the
 * leaderboard, the header, the profile (2026-10-14): avatars saved from an
 * older, larger set that the app does not carry (girls/7, boys/8), and
 * uploaded photos whose file is gone. ProfileImage shows the app's own copy of
 * an avatar where there is one, and the student's initials when a picture
 * still will not load.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { screen, srcFile, ROOT, skipWithoutChrome } from './harness.js';

const files = { '/avatars/girls/1.jpg': readFileSync(path.join(ROOT, 'public', 'avatars', 'girls', '1.jpg')) };

const entry = `
import { createRoot } from 'react-dom/client';
import ProfileImage from '${srcFile('components/ProfileImage.jsx')}';
const Fallback = ({ id }) => <span id={id}>DN</span>;
createRoot(document.getElementById('root')).render(<div>
  <div id="old-avatar"><ProfileImage src="http://localhost:5173/avatars/girls/7.jpg" alt="Divya" className="h-9 w-9" fallback={<Fallback id="fb1" />} /></div>
  <div id="gone-photo"><ProfileImage src="/uploads/missing-photo.jpg" alt="Deepak" className="h-9 w-9" fallback={<Fallback id="fb2" />} /></div>
  <div id="no-photo"><ProfileImage src="" fallback={<Fallback id="fb3" />} /></div>
</div>);`;

describe('a profile picture that cannot be shown as saved', { skip: skipWithoutChrome }, () => {
    test('an avatar the app does not carry shows one it does; a missing photo shows the initials', async () => {
        const { result, errors } = await screen({ entry, api: 'export default {};', files, script: `
            await sleep(1500);
            const img = $('#old-avatar img');
            return {
                oldSrc: img && img.getAttribute('src'), oldLoaded: !!img && img.complete && img.naturalWidth > 0, oldFallback: !!$('#fb1'),
                goneImg: !!$('#gone-photo img'), goneFallback: text($('#gone-photo')),
                noneFallback: text($('#no-photo'))
            };` });
        assert.deepEqual(errors, []);
        assert.equal(result.oldSrc, '/avatars/girls/1.jpg', 'girls/7 is shown as an avatar the app has');
        assert.ok(result.oldLoaded && !result.oldFallback, 'and it loads');
        assert.equal(result.goneImg, false, 'no broken image left behind');
        assert.equal(result.goneFallback, 'DN', 'the initials instead');
        assert.equal(result.noneFallback, 'DN', 'as for a student with no picture');
    });
});
