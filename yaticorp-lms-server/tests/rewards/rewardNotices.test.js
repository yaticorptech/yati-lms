/**
 * Reward notices in the bell: each one opens somewhere, and they reach the
 * student whether Career Path is open or not.
 *
 * The rewards module writes its notices (XP, levels, badges, wallet, payouts)
 * into the Career Path notification collection, with no link, and the bell's
 * endpoint sat behind the Career Path lock, so with Career Path closed the
 * student was refused all of them. Now every notice carries a link, notices
 * saved without one are given one when read, and the endpoint answers ahead
 * of the lock — with the reward notices alone while Career Path is closed.
 *
 * The lock itself is a shared setting other suites rely on, so the closed
 * case is driven through the controller with the flag the route sets, and the
 * route order is checked on the router.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, cleanup } = require('../helpers');

const Notification = require('../../src/career/models/Notification');
const { notify, noticeLink, LINKS } = require('../../src/rewards/services/notify');
const controller = require('../../src/career/controllers/notificationController');

let me;
const reply = () => {
    const res = { code: 200, body: null };
    res.status = (c) => { res.code = c; return res; };
    res.json = (b) => { res.body = b; return res; };
    return res;
};

before(async () => {
    await connect();
    me = await makeUser('Notices');
});
after(async () => { await cleanup([me.user]); });

describe('reward notices', () => {
    test('every reward notice is written with a link to where it is about', async () => {
        await notify(me.user._id, 'Withdrawal paid', 'INR 10 has been sent.', LINKS.wallet);
        // (No 'XP converted' notice any more: XP stopped turning into wallet money, 2026-10-26.)
        await notify(me.user._id, '🏆 Rank #2 last week!', '+750 reward points.');
        await notify(me.user._id, '🏆 1st place!', 'You won the competition.');
        const rows = await Notification.find({ userId: me.user._id }).lean();
        const by = Object.fromEntries(rows.map((n) => [n.title, n]));
        assert.ok(rows.every((n) => n.type === 'reward'));
        assert.equal(by['Withdrawal paid'].link, '/enrolled-courses#wallet');
        assert.equal(by['🏆 Rank #2 last week!'].link, '/#leaderboard');
        assert.equal(by['🏆 1st place!'].link, '/competitions');
    });

    test('a notice saved without a link is given one when read, and never one into a locked Career Path', () => {
        assert.equal(noticeLink({ title: 'Withdrawal not approved' }), '/enrolled-courses#wallet');
        assert.equal(noticeLink({ title: 'XP earned' }), '/profile');
        assert.equal(noticeLink({ title: '🎖️ Badge unlocked: Quiz Master' }), '/career/badges');
        assert.equal(noticeLink({ title: '🎖️ Badge unlocked: Quiz Master' }, { careerIsOpen: false }), '/profile');
        assert.equal(noticeLink({ title: 'Level up!', link: '/career/badges' }, { careerIsOpen: false }), '/profile');
    });

    test('with Career Path closed the bell gets the reward notices alone, and "clear all" leaves the rest', async () => {
        await Notification.create({ userId: me.user._id, title: 'Your roadmap is ready', message: 'Career Path', type: 'system', link: '/career' });
        await Notification.collection.insertOne({ userId: me.user._id, title: 'Level up!', message: 'Old notice, no link', type: 'reward', isRead: false, createdAt: new Date(), updatedAt: new Date() });

        const closed = reply();
        await controller.getNotifications({ user: me.user, careerOpen: false }, closed);
        assert.equal(closed.code, 200);
        assert.ok(closed.body.length > 0);
        assert.ok(closed.body.every((n) => n.type === 'reward'), 'no Career Path notice while it is closed');
        assert.ok(closed.body.every((n) => n.link && !n.link.startsWith('/career')), 'and every link opens somewhere open');

        const open = reply();
        await controller.getNotifications({ user: me.user, careerOpen: true }, open);
        assert.ok(open.body.some((n) => n.type === 'system'), 'open, the Career Path notices are back');

        await controller.clearNotifications({ user: me.user, careerOpen: false }, reply());
        const left = await Notification.find({ userId: me.user._id }).lean();
        assert.deepEqual(left.map((n) => n.type), ['system'], 'clearing while closed clears only what was shown');
    });

    test('the bell is mounted ahead of the Career Path lock', () => {
        const career = require('../../src/career');
        const routes = require('../../src/career/routes/notificationRoutes');
        const { requireCareerPathEnabled } = require('../../src/career/middleware/featureGate');
        const at = career.stack.findIndex((l) => l.handle === routes);
        const gate = career.stack.findIndex((l) => l.handle === requireCareerPathEnabled);
        assert.ok(at >= 0 && gate >= 0);
        assert.ok(at < gate, 'notifications answer before the lock is checked');
    });
});
