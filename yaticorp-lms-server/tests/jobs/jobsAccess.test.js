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

// ── The rule itself: five Career Path skills, each at 25% or more ──────────
describe('the skills rule', () => {
    const { connect, makeUser, cleanup } = require('../helpers');
    const { jobsAccessFor } = require('../../src/services/jobsAccess');
    const SkillProgress = require('../../src/career/models/SkillProgress');
    let student, flagged;
    const set = async (user, progress) => {
        await SkillProgress.deleteMany({ userId: user._id });
        await SkillProgress.insertMany(progress.map((p, i) => ({ userId: user._id, skillName: `Skill ${i + 1}`, progress: p })));
    };

    const { before, after } = require('node:test');
    before(async () => {
        await connect();
        student = (await makeUser('JobsRule')).user;
        flagged = (await makeUser('JobsRuleFlagged')).user;
        flagged.jobsAlwaysOpen = true;
    });
    after(async () => { await cleanup([student, flagged]); });

    test('five skills each at 25% open it', async () => {
        await set(student, [25, 25, 25, 25, 25]);
        const r = await jobsAccessFor(student);
        assert.equal(r.open, true);
        assert.equal(r.ready, 5);
        assert.deepEqual(r.required, { skills: 5, percent: 25 });
    });

    test('four is not enough, however far along they are', async () => {
        await set(student, [100, 90, 80, 70]);
        const r = await jobsAccessFor(student);
        assert.equal(r.open, false);
        assert.equal(r.ready, 4);
    });

    test('each one must reach 25%: one at 20% keeps it shut', async () => {
        await set(student, [60, 50, 40, 30, 20]);
        const r = await jobsAccessFor(student);
        assert.equal(r.open, false, 'an average of 40% is not five skills at 25%');
        assert.equal(r.ready, 4);
    });

    test('any five of more: six skills with five past the bar opens it', async () => {
        await set(student, [10, 30, 25, 40, 26, 90]);
        const r = await jobsAccessFor(student);
        assert.equal(r.open, true);
        assert.deepEqual(r.skills.map((s) => s.progress), [90, 40, 30, 26, 25, 10], 'highest first, for the locked page');
    });

    test('the same skill stored twice counts once', async () => {
        await SkillProgress.deleteMany({ userId: student._id });
        await SkillProgress.insertMany([...['React', 'react', 'REACT', 'Node', 'SQL'].map((n) => ({ userId: student._id, skillName: n, progress: 50 }))]);
        const r = await jobsAccessFor(student);
        assert.equal(r.skills.length, 3);
        assert.equal(r.open, false, 'three different skills, not five');
    });

    test('a student with no skills is shut, and an exempt account is open with none', async () => {
        await SkillProgress.deleteMany({ userId: student._id });
        assert.equal((await jobsAccessFor(student)).open, false);
        const r = await jobsAccessFor(flagged);
        assert.equal(r.open, true);
        assert.equal(r.alwaysOpen, true);
    });
});
