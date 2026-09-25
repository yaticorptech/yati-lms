/**
 * Who may open the Jobs section without the 25% course progress.
 *
 * The rule this replaces was a build-time flag on whichever machine ran the
 * dev server. Two things followed from that and both were wrong: every account
 * signing in on that machine got Jobs, and the accounts that were meant to
 * have it got nothing anywhere else. Access belongs to a person.
 */
const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { jobsAlwaysOpen, allowList } = require('../../src/services/jobsAccess');

let saved;
beforeEach(() => { saved = process.env.JOBS_ALWAYS_OPEN; });
afterEach(() => {
    if (saved === undefined) delete process.env.JOBS_ALWAYS_OPEN;
    else process.env.JOBS_ALWAYS_OPEN = saved;
});

describe('the account\'s own flag', () => {
    test('a flagged account is open wherever it signs in, with no server config', () => {
        // The point of storing this on the account: a second machine running
        // its own server, with no JOBS_ALWAYS_OPEN of its own, still honours it.
        delete process.env.JOBS_ALWAYS_OPEN;
        assert.equal(jobsAlwaysOpen({ name: 'Yaticorp', cardNumber: '240100019664', jobsAlwaysOpen: true }), true);
    });

    test('an unflagged account is not carried in by another account on the same machine', () => {
        delete process.env.JOBS_ALWAYS_OPEN;
        assert.equal(jobsAlwaysOpen({ name: 'Chinmay G K', jobsAlwaysOpen: false }), false);
        assert.equal(jobsAlwaysOpen({ name: 'Chinmay G K' }), false);
    });

    test('the flag has to be exactly true, not merely truthy', () => {
        delete process.env.JOBS_ALWAYS_OPEN;
        assert.equal(jobsAlwaysOpen({ name: 'X', jobsAlwaysOpen: 'yes' }), false);
        assert.equal(jobsAlwaysOpen({ name: 'X', jobsAlwaysOpen: 1 }), false);
    });
});

describe('the Jobs allow list', () => {
    test('the named accounts are exempt, and nobody else is', () => {
        process.env.JOBS_ALWAYS_OPEN = 'Yaticorp,Bhagyashree';
        assert.equal(jobsAlwaysOpen({ name: 'Yaticorp' }), true);
        assert.equal(jobsAlwaysOpen({ name: 'Bhagyashree' }), true);
        // The whole point: another account is not carried in by the first two.
        assert.equal(jobsAlwaysOpen({ name: 'Chinmay G K' }), false);
        assert.equal(jobsAlwaysOpen({ name: 'Test' }), false);
    });

    test('it does not match a name that merely contains one of them', () => {
        process.env.JOBS_ALWAYS_OPEN = 'Yaticorp';
        assert.equal(jobsAlwaysOpen({ name: 'Yaticorp Tech Team' }), false,
            'a longer name is a different account, not the same one');
    });

    test('case and stray spaces do not decide who gets in', () => {
        process.env.JOBS_ALWAYS_OPEN = '  yaticorp , BHAGYASHREE ';
        assert.equal(jobsAlwaysOpen({ name: 'Yaticorp' }), true);
        assert.equal(jobsAlwaysOpen({ name: 'bhagyashree' }), true);
    });

    test('an email or card number works too, for accounts sharing a name', () => {
        process.env.JOBS_ALWAYS_OPEN = '240100019664,bhagya@example.com';
        assert.equal(jobsAlwaysOpen({ name: 'Yaticorp', cardNumber: '240100019664' }), true);
        assert.equal(jobsAlwaysOpen({ name: 'Someone', email: 'bhagya@example.com' }), true);
        assert.equal(jobsAlwaysOpen({ name: 'Yaticorp', cardNumber: '999' }), false);
    });

    test('unset means the rule applies to everyone', () => {
        delete process.env.JOBS_ALWAYS_OPEN;
        assert.deepEqual(allowList(), []);
        assert.equal(jobsAlwaysOpen({ name: 'Yaticorp' }), false,
            'production has no list, so nobody skips the progress rule');
        process.env.JOBS_ALWAYS_OPEN = '';
        assert.equal(jobsAlwaysOpen({ name: 'Yaticorp' }), false);
    });

    test('a missing or empty account is never exempt', () => {
        process.env.JOBS_ALWAYS_OPEN = 'Yaticorp';
        assert.equal(jobsAlwaysOpen(null), false);
        assert.equal(jobsAlwaysOpen({}), false);
        assert.equal(jobsAlwaysOpen({ name: '', email: '', cardNumber: '' }), false,
            'blank fields must not match a blank entry');
    });
});
