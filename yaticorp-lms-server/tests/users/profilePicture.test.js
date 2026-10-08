/**
 * A profile picture is compulsory: a student can change it — to an avatar or
 * an uploaded photo — but never clear it back to blank. Editing the other
 * details still works for a student who has not chosen one yet.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, startApp, cleanup } = require('../helpers');

let app, student, call;

before(async () => {
    await connect();
    app = startApp({ mount: '/api/user', router: require('../../src/routes/userRoutes') });
    student = await makeUser('Picture');
    call = app.call(student.token);
});

after(async () => { await cleanup([student.user], app.server); });

test('a student with no picture can still edit their details', async () => {
    const r = await call('PUT', '/profile', { name: 'Picture Student Renamed' });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.profilePicture, '');
    assert.equal((await call('GET', '/profile')).body.user.profilePicture, '', 'the profile says there is none yet');
});

test('choosing an avatar saves it', async () => {
    const r = await call('PUT', '/profile', { profilePicture: '/avatars/girls/2.jpg' });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.ok(r.body.profilePicture.endsWith('/avatars/girls/2.jpg'));
    assert.ok((await call('GET', '/profile')).body.user.profilePicture.endsWith('/avatars/girls/2.jpg'));
});

test('the picture cannot be cleared back to blank', async () => {
    for (const blank of ['', '   ', null]) {
        const r = await call('PUT', '/profile', { profilePicture: blank });
        assert.equal(r.status, 400, `"${blank}" is refused`);
        assert.match(r.body.message, /profile picture is required/i);
    }
    assert.ok((await call('GET', '/profile')).body.user.profilePicture.endsWith('/avatars/girls/2.jpg'), 'the avatar is still there');
});

test('it can still be changed to another picture', async () => {
    const r = await call('PUT', '/profile', { profilePicture: '/avatars/boys/5.jpg' });
    assert.equal(r.status, 200);
    assert.ok(r.body.profilePicture.endsWith('/avatars/boys/5.jpg'));
    assert.equal((await call('PUT', '/profile', { profilePicture: 'https://example.com/me.png' })).status, 400, 'but not to any link online');
});

/* ── Uploading a photo (stored on Bunny; the storage is stood in for here) ── */

const upload = (bytes, type = 'image/jpeg', name = 'profile.jpg') => {
    const fd = new FormData();
    fd.append('profilePicture', new Blob([bytes], { type }), name);
    return fetch(`http://127.0.0.1:${app.server.address().port}/api/user/profile/picture`, {
        method: 'POST', headers: { Authorization: `Bearer ${student.token}` }, body: fd
    }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));
};
const withStorage = async (fake, fn) => {
    const bunny = require('../../src/utils/bunnyStorage');
    const real = bunny.uploadToBunny;
    bunny.uploadToBunny = fake;
    try { return await fn(); } finally { bunny.uploadToBunny = real; }
};
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 0xff, 0xd9]);

test('an uploaded photo is stored and becomes the profile picture', async () => {
    const seen = [];
    const r = await withStorage(async (buffer, name, folder) => { seen.push({ size: buffer.length, name, folder }); return 'https://cdn.example.net/profile-pictures/me.jpg'; },
        () => upload(JPEG));
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.profilePicture, 'https://cdn.example.net/profile-pictures/me.jpg');
    assert.deepEqual(seen, [{ size: JPEG.length, name: 'profile.jpg', folder: 'profile-pictures' }]);
    assert.equal((await call('GET', '/profile')).body.user.profilePicture, 'https://cdn.example.net/profile-pictures/me.jpg');
});

test('when the storage fails, the student is told plainly and the picture stays', async () => {
    const r = await withStorage(async () => { throw new Error('401 disabled customer'); }, () => upload(JPEG));
    assert.equal(r.status, 502);
    assert.match(r.body.message, /could not be saved just now/);
    assert.doesNotMatch(JSON.stringify(r.body), /disabled customer/, 'the storage error is not passed on');
    assert.equal((await call('GET', '/profile')).body.user.profilePicture, 'https://cdn.example.net/profile-pictures/me.jpg');
});

test('a photo over 5 MB, or a file that is not an image, gets a message, not a crash', async () => {
    const big = await upload(Buffer.alloc(5 * 1024 * 1024 + 10, 1));
    assert.equal(big.status, 413);
    assert.match(big.body.message, /too large/);
    const text = await upload(Buffer.from('hello'), 'text/plain', 'notes.txt');
    assert.equal(text.status, 400);
    assert.match(text.body.message, /image/i);
});
