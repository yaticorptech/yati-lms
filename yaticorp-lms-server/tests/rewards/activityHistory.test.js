/**
 * Learning done while Rewards is switched off still counts.
 *
 * recordActivity used to return before writing the activity when Rewards was
 * off, so every lesson and quiz finished in that time was missing from "Your
 * Progress" and from the ledger-based badges for good. Now the fact is always
 * written and only the payouts wait on the switch; and for the history that
 * was already lost, the summary counts the course progress the LMS kept
 * either way (Progress.completedLessons / passedQuizzes), without counting
 * one lesson twice.
 *
 * Also here: the summary no longer ranks the whole leaderboard on every call
 * (nothing read its `rank`), and "I've seen these events" can be told which
 * events — by id, or by kind and level — and never marks everything by mistake.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { connect, makeUser, startApp, cleanup } = require('../helpers');

const User = require('../../src/models/User');
const Progress = require('../../src/models/Progress');
const config = require('../../src/rewards/services/configService');
const { recordActivity } = require('../../src/rewards/services/activityService');
const { LearningActivity, RewardEvent } = require('../../src/rewards/models');

let app, me, api;
const id = () => new mongoose.Types.ObjectId();
const lessons = [id(), id(), id()];
const quizzes = [id(), id()];
const COURSE = `history-test-${Date.now()}`;

before(async () => {
    await connect();
    config.invalidate();
    me = await makeUser('History');
    app = startApp({ mount: '/api/rewards', router: require('../../src/rewards') });
    api = app.call(me.token);
});
after(async () => {
    config.invalidate();
    await cleanup([me.user], app.server);
});

describe('learning history', () => {
    test('with Rewards off the activity is recorded, and nothing is paid', async () => {
        // Switched off for this process only: the cached rulebook is the one
        // recordActivity reads, and the shared Setting is left alone.
        const cfg = await config.getConfig();
        const was = cfg.enabled;
        cfg.enabled = false;
        let r;
        try {
            r = await recordActivity({ userId: me.user._id, type: 'lesson_complete', refId: String(lessons[0]), courseId: COURSE });
        } finally {
            cfg.enabled = was;
            config.invalidate();
        }
        assert.equal(r.enabled, false);
        assert.deepEqual(r.events, []);
        assert.ok(await LearningActivity.exists({ userId: me.user._id, type: 'lesson_complete', refId: String(lessons[0]) }), 'the lesson is on the record');
        assert.equal((await User.findById(me.user._id).select('xp').lean()).xp || 0, 0, 'and no XP was paid for it');
        const again = await recordActivity({ userId: me.user._id, type: 'lesson_complete', refId: String(lessons[0]), courseId: COURSE });
        assert.equal(again.duplicate, true, 'it is still the one fact: switching back on does not pay it later');
    });

    test('"Your Progress" counts course progress too, without counting a lesson twice', async () => {
        // The lost history: lessons, passes and a finished course that only
        // the course progress knows about (lessons[0] is in both).
        await Progress.create({ userId: me.user._id, courseId: COURSE, completedLessons: lessons, passedQuizzes: quizzes, percentage: 100 });
        const r = await api('GET', '/summary');
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(r.body.stats.lessons.total, 3);
        assert.equal(r.body.stats.quizzes.passed, 2);
        assert.ok(r.body.stats.quizzes.completed >= 2, 'a passed quiz is a completed one');
        assert.equal(r.body.stats.courses.completed, 1);
        assert.equal('rank' in r.body, false, 'the summary no longer ranks the leaderboard');
    });

    test('events are marked seen by id, or by kind and level — never all of them by accident', async () => {
        const [l4, l5, badge] = await RewardEvent.create([
            { userId: me.user._id, kind: 'level_up', title: 'Level 4 reached!', payload: { level: 4 } },
            { userId: me.user._id, kind: 'level_up', title: 'Level 5 reached!', payload: { level: 5 } },
            { userId: me.user._id, kind: 'badge', title: 'Badge!', payload: {} }
        ]);
        const unseen = async () => (await api('GET', '/events/unseen')).body.map((e) => e._id).sort();

        const byKind = await api('POST', '/events/seen', { kind: 'level_up', level: 4 });
        assert.equal(byKind.body.marked, 1);
        assert.deepEqual(await unseen(), [String(l5._id), String(badge._id)].sort());

        const bad = await api('POST', '/events/seen', { ids: ['not-an-id'] });
        assert.equal(bad.body.marked, 0, 'a list of bad ids marks nothing, rather than everything');

        const unknown = await api('POST', '/events/seen', { kind: 'nonsense' });
        assert.equal(unknown.status, 400);

        const byId = await api('POST', '/events/seen', { ids: [String(badge._id)] });
        assert.equal(byId.body.marked, 1);
        assert.deepEqual(await unseen(), [String(l5._id)]);
    });
});
