/**
 * PUC classes (2026-11-19): Year · Semester · Stream, added one section at a time, each section with its own class
 * teacher, shown with each section's students; one section removed on its own.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { connect, startApp, cleanup } = require('../helpers');

const STAMP = `${Date.now()}${Math.floor(Math.random() * 1e4)}`;
const Organization = require('../../src/organizations/models/Organization');
const Admin = require('../../src/models/Admin');
let app, base, org, admin, token;
const o = (method, path, body) => fetch(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined })
    .then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));

before(async () => {
    await connect();
    app = startApp({ mount: '/api/organizations', router: require('../../src/organizations') });
    base = `http://127.0.0.1:${app.server.address().port}/api/organizations/me/campus`;
    org = await Organization.create({ orgCode: `puc_${STAMP}`, name: `PUC College ${STAMP}`, organizationType: 'college', email: `puc-${STAMP}@example.com`, status: 'active', approvedAt: new Date(), campusAllowed: true });
    admin = await Admin.create({ name: 'PUC Admin', email: `puc-admin-${STAMP}@example.com`, password: 'Passw0rd!x', role: 'orgadmin', organizationId: org._id });
    token = jwt.sign({ id: String(admin._id) }, process.env.JWT_SECRET, { expiresIn: '10m' });
});
after(async () => { await Organization.deleteOne({ _id: org._id }); await cleanup([], app.server, [admin]); });

test('one section at a time, each its own; one removed on its own', async () => {
    const add = (section) => o('POST', '/departments', { program: 'puc', stream: 'Arts', pucYear: 1, pucSem: 1, sections: section, section, headId: '' });
    assert.equal((await add('A')).status, 201);
    const b = await add('B');
    assert.equal(b.status, 201, JSON.stringify(b.body));
    assert.match(b.body.message, /Section B added/);
    assert.equal((await add('A')).status, 400, 'no second A');
    let list = (await o('GET', '/departments')).body.departments.filter((d) => d.program === 'puc');
    assert.equal(list.length, 1);
    assert.deepEqual(list[0].sections, ['A', 'B']);
    assert.deepEqual(list[0].sectionStudents, { A: 0, B: 0 });
    assert.equal(list[0].name, 'Arts · 1st year · 1st sem');
    const del = await o('DELETE', `/departments/${list[0]._id}/sections/B`);
    assert.equal(del.status, 200, JSON.stringify(del.body));
    list = (await o('GET', '/departments')).body.departments.filter((d) => d.program === 'puc');
    assert.deepEqual(list[0].sections, ['A']);
    assert.equal((await o('DELETE', `/departments/${list[0]._id}/sections/A`)).status, 400, 'the only section: remove the class');
});

test('what the institution has: from its type until chosen, then as chosen (2026-11-19)', async () => {
    let r = await o('GET', '/kinds');
    assert.equal(r.status, 200);
    assert.ok(r.body.kinds.includes('degree') && r.body.kinds.includes('puc'), JSON.stringify(r.body));
    assert.equal(r.body.chosen, false);
    assert.equal((await o('PUT', '/kinds', { kinds: [] })).status, 400, 'at least one');
    assert.equal((await o('PUT', '/kinds', { kinds: ['puc'] })).status, 200);
    r = await o('GET', '/kinds');
    assert.deepEqual(r.body.kinds, ['puc']);
    assert.equal(r.body.chosen, true);
});

test('renaming a degree section moves its students; taking away a section with students is refused (2026-11-19 QA)', async () => {
    const User = require('../../src/models/User');
    const { makeUser } = require('../helpers');
    const made = await o('POST', '/departments', { program: 'degree', name: `BCA ${STAMP}`, code: 'BCA', semesters: 6, sections: 'A, B' });
    assert.equal(made.status, 201, JSON.stringify(made.body));
    const dept = (await o('GET', '/departments')).body.departments.find((d) => d.name === `BCA ${STAMP}`);
    const kid = await makeUser('Section Kid');
    try {
        await User.updateOne({ _id: kid.user._id }, { $set: { organizationId: org._id, campus: { departmentId: dept._id, semester: 1, section: 'B', status: 'studying' } } });
        assert.equal((await o('PUT', `/departments/${dept._id}`, { sections: 'A' })).status, 400, 'B still has a student');
        const r = await o('PUT', `/departments/${dept._id}`, { sections: 'A, C' });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal((await User.findById(kid.user._id).select('+campus').lean()).campus.section, 'C');
        const after = (await o('GET', '/departments')).body.departments.find((d) => String(d._id) === String(dept._id));
        assert.deepEqual(after.sectionStudents, { A: 0, C: 1 });
    } finally {
        await User.deleteOne({ _id: kid.user._id });
    }
});
