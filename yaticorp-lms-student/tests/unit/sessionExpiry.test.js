/**
 * The end of a session (src/utils/sessionExpiry.js), outside a browser: the
 * module only touches localStorage, sessionStorage and window.location, so
 * plain stand-ins are enough to see what it clears, what it remembers and
 * where it sends the student — and that a burst of 401s sends them once.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

/** A Storage stand-in whose stored keys are its own enumerable properties, as in a browser. */
const makeStorage = () => {
    const store = {};
    Object.defineProperties(store, {
        getItem: { value: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null) },
        setItem: { value: (k, v) => { store[k] = String(v); } },
        removeItem: { value: (k) => { delete store[k]; } }
    });
    return store;
};

const assigned = [];
globalThis.localStorage = makeStorage();
globalThis.sessionStorage = makeStorage();
globalThis.window = { location: { pathname: '/career/planner', search: '?tab=2', hash: '', assign: (url) => assigned.push(url) } };

const { expireSessionOn401, safeNextPath, loginPathFor, forgetStudent, SESSION_ENDED_KEY, ADMIN_VIEW_KEY } = await import('../../src/utils/sessionExpiry.js');

const signIn = () => {
    localStorage.setItem('studentToken', 't');
    localStorage.setItem('studentData', '{"_id":"u1"}');
    localStorage.setItem(ADMIN_VIEW_KEY, '{"by":"Admin"}');
    localStorage.setItem('unrelated', 'kept');
    sessionStorage.setItem('yati:dailyActivitySeen', '1');
    sessionStorage.setItem('lb-celebrated:week:u9', '1');
    sessionStorage.setItem('yati.signupOrg', '{}');
    sessionStorage.setItem('somethingElse', 'kept');
};
const err = (status, url) => ({ response: { status }, config: { url } });

test('anything but a 401, and a 401 from signing in itself, leave the session alone', () => {
    signIn();
    expireSessionOn401(err(500, '/user/settings'));
    expireSessionOn401(err(403, '/user/settings'));
    expireSessionOn401({ message: 'Network Error', config: { url: '/user/settings' } });
    expireSessionOn401(err(401, '/auth/student/login'));
    expireSessionOn401(err(401, 'http://localhost:5000/api/auth/register'));
    expireSessionOn401(undefined);
    assert.equal(localStorage.getItem('studentToken'), 't');
    assert.equal(sessionStorage.getItem(SESSION_ENDED_KEY), null);
    assert.deepEqual(assigned, []);
});

test('a 401 signs the student out, says why once, and goes to the sign-in page with where they were', () => {
    signIn();
    expireSessionOn401(err(401, '/user/settings'));
    for (const k of ['studentToken', 'studentData', ADMIN_VIEW_KEY]) assert.equal(localStorage.getItem(k), null, `${k} cleared`);
    assert.equal(localStorage.getItem('unrelated'), 'kept', 'nothing else on the device');
    assert.equal(sessionStorage.getItem('yati:dailyActivitySeen'), null, "this tab's memory of the student goes too");
    assert.equal(sessionStorage.getItem('lb-celebrated:week:u9'), null);
    assert.equal(sessionStorage.getItem('somethingElse'), 'kept');
    assert.equal(sessionStorage.getItem(SESSION_ENDED_KEY), '1');
    assert.deepEqual(assigned, ['/login?next=%2Fcareer%2Fplanner%3Ftab%3D2']);
});

test('the requests that fail alongside it do not each start a redirect', () => {
    signIn();
    expireSessionOn401(err(401, '/rewards/summary'));
    expireSessionOn401(err(401, '/career/tasks'));
    assert.equal(assigned.length, 1, 'still the one redirect');
    assert.equal(localStorage.getItem('studentToken'), null, 'but each one still clears');
});

test('only a path on this site is somewhere to go after signing in', () => {
    assert.equal(safeNextPath('/career/planner?tab=2#today'), '/career/planner?tab=2#today');
    assert.equal(safeNextPath('/learn/c1'), '/learn/c1');
    for (const bad of ['//evil.example/x', '/\\evil.example', 'https://evil.example/', 'javascript:alert(1)', 'career', '', null, undefined, 42]) {
        assert.equal(safeNextPath(bad), '/', String(bad));
    }
    for (const loop of ['/login', '/login?next=/x', '/signup', '/admin-access', '/reset-password/']) {
        assert.equal(safeNextPath(loop), '/', `${loop} is not a destination`);
    }
    assert.equal(loginPathFor('/'), '/login');
    assert.equal(loginPathFor('//evil.example'), '/login');
    assert.equal(loginPathFor('/jobs'), '/login?next=%2Fjobs');
});

test('signing in keeps the sign-up notice the new student is meant to see', () => {
    signIn();
    forgetStudent({ keep: ['yati.signupOrg'] });
    assert.equal(sessionStorage.getItem('yati.signupOrg'), '{}');
    assert.equal(sessionStorage.getItem('yati:dailyActivitySeen'), null);
    forgetStudent();
    assert.equal(sessionStorage.getItem('yati.signupOrg'), null, 'signing out does not');
});
