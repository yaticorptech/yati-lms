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
