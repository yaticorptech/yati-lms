/**
 * Files a student uploads are kept in their own Google Drive, not here
 * (2026-11-02): refused until Drive is linked (409 DRIVE_REQUIRED, the app's
 * link-Drive popup), then saved in their Drive and shared by link — the link
 * is all that is kept — downloaded through our server, and removed from their
 * Drive when they delete it. (360 proofs: tests/organizations/org360.test.js;
 * the Jobs resume: tests/jobs/searchSkills.test.js.)
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { connect, makeUser, startApp, cleanup, fakeDrive } = require('../helpers');
const Achievement = require('../../src/models/Achievement');
const WalletTransaction = require('../../src/rewards/models/WalletTransaction');

const PNG = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex');
let app, linked, unlinked, drive;

before(async () => {
    await connect();
    drive = fakeDrive();
    linked = await makeUser('DriveLinked');
    unlinked = await makeUser('DriveUnlinked');
    drive.link(linked.user._id);
    app = startApp({ mount: '/api/user', router: require('../../src/routes/userRoutes') });
});

after(async () => {
    drive.restore();
    await Achievement.deleteMany({ userId: { $in: [linked.user._id, unlinked.user._id] } });
    await cleanup([linked.user, unlinked.user], app.server);
});

const send = (who, path, fields, file) => {
    const fd = new FormData();
    if (file) fd.append(file.field, new Blob([file.bytes], { type: file.type }), file.name);
    for (const [k, v] of Object.entries(fields)) fd.append(k, v);
    return fetch(`http://127.0.0.1:${app.server.address().port}/api/user${path}`, { method: 'POST', headers: { Authorization: `Bearer ${who.token}` }, body: fd })
        .then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));
};
const certificate = { field: 'file', bytes: PNG, type: 'image/png', name: 'nss-camp.png' };

test('a certificate: refused until Drive is linked, then kept in the student\'s Drive by link', async () => {
    const refused = await send(unlinked, '/achievements', { title: 'NSS camp' }, certificate);
    assert.deepEqual([refused.status, refused.body.code], [409, 'DRIVE_REQUIRED']);
    assert.equal(await Achievement.countDocuments({ userId: unlinked.user._id }), 0);

    const saved = await send(linked, '/achievements', { title: 'NSS camp', issuer: 'NSS' }, certificate);
    assert.equal(saved.status, 201, JSON.stringify(saved.body));
    const a = saved.body.achievement;
    assert.match(a.fileUrl, /^https:\/\/drive\.google\.com\/file\/d\/drive-file-\d+\/view$/, 'the view link');
    assert.match(a.thumbnailUrl, /^https:\/\/drive\.google\.com\/thumbnail\?id=drive-file-\d+/, 'Drive draws its picture');
    assert.equal(a.inDrive, true);
    const row = await Achievement.findById(a.id).lean();
    assert.deepEqual([row.storage, row.objectPath], ['drive', ''], 'nothing on our storage');
    const inDrive = drive.files.get(row.driveFileId);
    assert.ok(inDrive?.shared, 'shared by link, for whoever checks it');
    assert.equal(inDrive.userId, String(linked.user._id));
});

test('a certificate in Drive downloads through our server, and leaves Drive when deleted', async () => {
    const a = (await send(linked, '/achievements', { title: 'Hackathon' }, certificate)).body.achievement;
    const r = await fetch(`http://127.0.0.1:${app.server.address().port}/api/user/achievements/${a.id}/file`, { headers: { Authorization: `Bearer ${linked.token}` } });
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('content-type'), 'image/png');
    assert.deepEqual(Buffer.from(await r.arrayBuffer()), PNG);
    const other = await fetch(`http://127.0.0.1:${app.server.address().port}/api/user/achievements/${a.id}/file`, { headers: { Authorization: `Bearer ${unlinked.token}` } });
    assert.equal(other.status, 404, 'not someone else\'s');

    const fileId = (await Achievement.findById(a.id).lean()).driveFileId;
    const del = await fetch(`http://127.0.0.1:${app.server.address().port}/api/user/achievements/${a.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${linked.token}` } });
    assert.equal(del.status, 200);
    await new Promise((res) => setTimeout(res, 50));
    assert.equal(drive.files.has(fileId), false, 'removed from their Drive');
});

test('a resume: refused before anything is charged, then kept in Drive by link', async () => {
    const resume = { field: 'resume', bytes: Buffer.from('resume text'), type: 'application/msword', name: 'resume.doc' };
    const refused = await send(unlinked, '/resume', {}, resume);
    assert.deepEqual([refused.status, refused.body.code], [409, 'DRIVE_REQUIRED']);
    assert.equal(await WalletTransaction.countDocuments({ userId: unlinked.user._id, source: 'feature_charge' }), 0, 'no charge for a refused upload');

    const saved = await send(linked, '/resume', {}, resume);
    assert.equal(saved.status, 201, JSON.stringify(saved.body));
    assert.match(saved.body.resume.fileUrl || '', /^https:\/\/drive\.google\.com\/file\/d\/drive-file-\d+\/view$/);
});

test('Extra-curricular proof: Drive required where Google sign-in is set up', async () => {
    const { storeProof } = require('../../src/nccnss/proofStore');
    const jpeg = Buffer.from('ffd8ffe000104a46494600010100000100010000ffd9', 'hex');
    await assert.rejects(storeProof(unlinked.user._id, jpeg, { name: 'Camp' }), (e) => e.code === 'DRIVE_REQUIRED');
    const kept = await storeProof(linked.user._id, jpeg, { name: 'Camp' });
    assert.match(kept.url, /^https:\/\/drive\.google\.com\/file\/d\//);
    assert.ok(drive.files.get(kept.driveId)?.shared);
    assert.ok(mongoose.isValidObjectId(String(linked.user._id)));
});
