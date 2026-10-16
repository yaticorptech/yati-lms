/** Preset avatars come from the bundle; uploaded photos keep their links. */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { pictureUrl } = await import('../../src/native/pictures.js');

test('a preset avatar saved against the website is shown from its bundled path', () => {
    assert.equal(pictureUrl('http://localhost:5173/avatars/boys/3.jpg'), '/avatars/boys/3.jpg');
    assert.equal(pictureUrl('https://lms.yaticorp.com/avatars/girls/1.jpg'), '/avatars/girls/1.jpg');
    assert.equal(pictureUrl('/avatars/elders/2.jpg'), '/avatars/elders/2.jpg');
});

test('an uploaded photo, an empty value or an odd string is left as it is', () => {
    const photo = 'https://res.cloudinary.com/demo/image/upload/v1/lms_profile/abc.jpg';
    assert.equal(pictureUrl(photo), photo);
    assert.equal(pictureUrl(''), '');
    assert.equal(pictureUrl(null), '');
    assert.equal(pictureUrl('not a url'), 'not a url');
});

test('an avatar the app does not carry is shown as one it does, the same one every time', async () => {
    const { AVATAR_COUNTS } = await import('../../src/native/pictures.js');
    const fs = await import('node:fs');
    const path = await import('node:path');
    // The counts match the files in public/avatars, so nothing mapped to is missing.
    for (const [group, count] of Object.entries(AVATAR_COUNTS)) {
        const files = fs.readdirSync(path.resolve(import.meta.dirname, '../../public/avatars', group)).filter((f) => /^\d+\.jpg$/.test(f));
        assert.equal(files.length, count, `${group}: ${files.length} files`);
    }
    // Seen in the test database on 2026-10-14: girls/7 and boys/8 are not in the app.
    assert.equal(pictureUrl('http://localhost:5173/avatars/girls/7.jpg'), '/avatars/girls/1.jpg');
    assert.equal(pictureUrl('/avatars/boys/8.jpg'), '/avatars/boys/2.jpg');
    assert.equal(pictureUrl('/avatars/elders/12.jpg'), '/avatars/elders/3.jpg');
    assert.equal(pictureUrl('/avatars/kids/0.jpg'), '/avatars/kids/1.jpg');
    // One it carries is left alone, and the answer is stable.
    assert.equal(pictureUrl('/avatars/girls/6.jpg'), '/avatars/girls/6.jpg');
    assert.equal(pictureUrl(pictureUrl('/avatars/boys/8.jpg')), '/avatars/boys/2.jpg');
});
