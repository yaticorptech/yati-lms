/**
 * A profile picture is compulsory.
 *
 *   - a signed-in student without one gets the photo picker on whatever page
 *     they are on; it has no ×, no Cancel, and a click outside does nothing,
 *     until they upload a photo or pick an avatar — then it goes and they
 *     carry on
 *   - the saved login may be older than the profile: if the server already
 *     has a picture (set on another device), nobody is asked
 *   - offline, nobody is blocked
 *   - My Profile's Change photo has no Remove: a picture can be changed, not
 *     cleared
 *   - an uploaded photo is cut to its square and shrunk to 512 pixels before
 *     it is sent (utils/cropImage.js)
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { screen, srcFile, ROOT, skipWithoutChrome } from './harness.js';

// The real avatar images, so the grid shows them as the app does.
const files = Object.fromEntries([1, 2, 3, 4, 5, 6].map((n) => [`/avatars/boys/${n}.jpg`, readFileSync(path.join(ROOT, 'public', 'avatars', 'boys', `${n}.jpg`))]));

const api = `
window.__calls = [];
export default {
  get: (url) => { window.__calls.push(['GET', url]);
    if (window.__offline) return Promise.reject(new Error('Network Error'));
    return Promise.resolve({ data: { user: { profilePicture: window.__serverPicture || '' } } }); },
  put: (url, body) => { window.__calls.push(['PUT', url, body]);
    return Promise.resolve({ data: { name: 'New Student', profilePicture: 'https://lms.example' + body.profilePicture } }); },
  post: (url) => { window.__calls.push(['POST', url]); return Promise.resolve({ data: {} }); },
  delete: () => Promise.resolve({ data: {} })
};`;

const gate = (pre) => `
${pre}
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthContext } from '${srcFile('context/AuthContext.jsx')}';
import ProfilePictureGate from '${srcFile('components/ProfilePictureGate.jsx')}';
const App = () => {
  const [user, setUser] = useState({ _id: 'u1', name: 'New Student', email: 'new@example.com' });
  window.__user = user;
  return <AuthContext.Provider value={{ user, setUser }}><p id="page">Dashboard</p><ProfilePictureGate /></AuthContext.Provider>;
};
createRoot(document.getElementById('root')).render(<App />);`;

describe('a profile picture is compulsory', { skip: skipWithoutChrome }, () => {
    test('without one, the picker shows and cannot be closed until an avatar is chosen', async () => {
        const { result, errors } = await screen({ entry: gate(''), api, files, script: `
            await sleep(800);
            const dialog = () => $('[role=dialog]');
            const before = { title: text($('#picker-title')), required: dialog() && dialog().dataset.required,
                close: !!$('[aria-label=Close]'), cancel: !!find(/^\\s*Cancel\\s*$/), upload: !!find(/Upload a photo/), remove: !!find(/Remove/),
                avatars: $$('button[aria-label^="Avatar"]').length, useDisabled: find(/Use this avatar/).disabled };
            dialog().parentElement.click(); await sleep(200);
            const afterOutsideClick = !!dialog();
            $$('button[aria-label^="Avatar"]')[2].click(); await sleep(100);
            find(/Use this avatar/).click(); await sleep(400);
            return { before, afterOutsideClick, put: window.__calls.find((c) => c[0] === 'PUT'), gone: !dialog(),
                     picture: window.__user.profilePicture, stored: JSON.parse(localStorage.getItem('studentData') || '{}').profilePicture, page: text($('#page')) };` });
        assert.deepEqual(errors, []);
        assert.equal(result.before.title, 'Add your profile picture');
        assert.equal(result.before.required, 'true');
        assert.equal(result.before.close, false, 'no ×');
        assert.equal(result.before.cancel, false, 'no Cancel');
        assert.equal(result.before.remove, false, 'no Remove');
        assert.ok(result.before.upload, 'Upload a photo is there');
        assert.equal(result.before.avatars, 6, 'and the avatars');
        assert.equal(result.before.useDisabled, true, 'nothing to save until one is picked');
        assert.equal(result.afterOutsideClick, true, 'a click outside does not close it');
        assert.deepEqual(result.put, ['PUT', '/user/profile', { profilePicture: '/avatars/boys/3.jpg' }]);
        assert.equal(result.gone, true, 'saved: the picker goes');
        assert.equal(result.picture, 'https://lms.example/avatars/boys/3.jpg');
        assert.equal(result.stored, 'https://lms.example/avatars/boys/3.jpg', 'and the saved login has it');
        assert.equal(result.page, 'Dashboard', 'the student carries on where they were');
    });

    test('a picture the server already has (set on another device) is used; nobody is asked', async () => {
        const { result, errors } = await screen({ entry: gate("window.__serverPicture = 'https://lms.example/avatars/girls/1.jpg';"), api, script: `
            await sleep(800);
            return { dialog: !!$('[role=dialog]'), picture: window.__user.profilePicture, asked: window.__calls.map((c) => c[1]) };` });
        assert.deepEqual(errors, []);
        assert.equal(result.dialog, false);
        assert.equal(result.picture, 'https://lms.example/avatars/girls/1.jpg', 'brought up to date');
        assert.deepEqual(result.asked, ['/user/profile']);
    });

    test('offline, nobody is blocked', async () => {
        const { result } = await screen({ entry: gate('window.__offline = true;'), api, script: `
            await sleep(800);
            return { dialog: !!$('[role=dialog]') };` });
        assert.equal(result.dialog, false);
    });

    test("My Profile's Change photo can change the picture but has no Remove", async () => {
        const entry = `
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthContext } from '${srcFile('context/AuthContext.jsx')}';
import PhotoPicker from '${srcFile('components/PhotoPicker.jsx')}';
const App = () => {
  const [user, setUser] = useState({ _id: 'u1', name: 'Old Student', profilePicture: 'https://lms.example/avatars/boys/1.jpg' });
  const [open, setOpen] = useState(true);
  window.__open = open;
  return <AuthContext.Provider value={{ user, setUser }}>{open && <PhotoPicker onClose={() => setOpen(false)} />}</AuthContext.Provider>;
};
createRoot(document.getElementById('root')).render(<App />);`;
        const { result, errors } = await screen({ entry, api, files, script: `
            await sleep(800);
            const r = { title: text($('#picker-title')), close: !!$('[aria-label=Close]'), cancel: !!find(/^\\s*Cancel\\s*$/), remove: !!find(/Remove/),
                        current: $$('button[aria-label^="Avatar"]').findIndex((b) => b.getAttribute('aria-pressed') === 'true') };
            find(/^\\s*Cancel\\s*$/).click(); await sleep(200);
            return { ...r, closed: !window.__open };` });
        assert.deepEqual(errors, []);
        assert.equal(result.title, 'Change photo');
        assert.ok(result.close && result.cancel, 'it can be closed as before');
        assert.equal(result.remove, false, 'but the picture cannot be removed');
        assert.equal(result.current, 0, 'the current avatar is marked');
        assert.equal(result.closed, true);
    });

    test('a photo is cut to its square and shrunk to 512 pixels; a small one is not blown up; see-through stays white', async () => {
        const entry = `
import { getCroppedBlob } from '${srcFile('utils/cropImage.js')}';
const photo = (w, h, paint) => { const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d')); return c.toDataURL('image/png'); };
const measure = async (blob) => { const bmp = await createImageBitmap(blob); const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
  const g = c.getContext('2d'); g.drawImage(bmp, 0, 0); const [r, gr, b] = g.getImageData(bmp.width >> 1, bmp.height >> 1, 1, 1).data;
  return { width: bmp.width, height: bmp.height, type: blob.type, centre: [r, gr, b] }; };
window.__run = async () => ({
  camera: await measure(await getCroppedBlob(photo(2000, 1500, (g) => { g.fillStyle = '#4f46e5'; g.fillRect(0, 0, 2000, 1500); }), { x: 250, y: 0, width: 1500, height: 1500 })),
  small: await measure(await getCroppedBlob(photo(300, 300, (g) => { g.fillStyle = '#16a34a'; g.fillRect(0, 0, 300, 300); }), { x: 0, y: 0, width: 300, height: 300 })),
  clear: await measure(await getCroppedBlob(photo(800, 800, () => {}), { x: 0, y: 0, width: 800, height: 800 })),
  broken: await getCroppedBlob('data:image/png;base64,AAAA', { x: 0, y: 0, width: 10, height: 10 }).then(() => 'read', (e) => e.message)
});`;
        const { result, errors } = await screen({ entry, api: 'export default {};', script: 'return await window.__run();' });
        assert.deepEqual(errors, []);
        assert.deepEqual([result.camera.width, result.camera.height, result.camera.type], [512, 512, 'image/jpeg'], 'a camera photo: 512 square, JPEG');
        assert.ok(result.camera.centre[2] > 180 && result.camera.centre[0] < 120, 'still the photo (indigo)');
        assert.deepEqual([result.small.width, result.small.height], [300, 300], 'a small photo keeps its size');
        assert.ok(result.clear.centre.every((v) => v > 240), 'a see-through PNG comes out white, not black');
        assert.equal(result.broken, 'That photo could not be read. Try another one.');
    });
});
