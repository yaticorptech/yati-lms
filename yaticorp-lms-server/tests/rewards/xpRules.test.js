/**
 * Every XP amount a student can earn is a rule the admin edits under
 * Rewards → Reward rules. Career Path used to pay fixed amounts in code (10 a
 * task, 5 the daily activity, 20 a task quiz, 25 a skill quiz), so changing
 * "Complete a Career Path task" in the panel changed nothing. These pin the
 * rules as the single source: the new ones exist, an edit is what xpFor
 * returns, and the student summary carries them for the pages to show.
 *
 * The rulebook is one shared document: whatever a test changes is put back.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, startApp, cleanup } = require('../helpers');

const config = require('../../src/rewards/services/configService');
const C = require('../../src/rewards/config/constants');

let app, me, api, saved;
before(async () => {
    await connect();
    saved = { ...(await config.getConfig()).xpRules };
    me = await makeUser('XpRules');
    app = startApp({ mount: '/api/rewards', router: require('../../src/rewards') });
    api = app.call(me.token);
});
after(async () => {
    await config.updateConfig({ xpRules: saved });
    config.invalidate();
    await cleanup([me.user], app.server);
});

describe('XP rules', () => {
    test('Career Path task quizzes and skill quizzes are rules, with the amounts they always paid', () => {
        assert.ok(C.ACTIVITY_TYPES.includes('career_task_quiz'));
        assert.ok(C.ACTIVITY_TYPES.includes('skill_quiz'));
        assert.equal(C.DEFAULT_XP_RULES.career_task_quiz, 20);
        assert.equal(C.DEFAULT_XP_RULES.skill_quiz, 25);
        assert.equal(C.DEFAULT_XP_RULES.career_task, 10);
        assert.equal(C.DEFAULT_XP_RULES.daily_activity, 5);
    });

    test('an admin edit is what the Career Path pays from then on', async () => {
        const r = await config.updateConfig({ xpRules: { career_task: 17, career_task_quiz: 33, skill_quiz: 41, daily_activity: 9 } });
        assert.deepEqual(r.errors || [], []);
        config.invalidate();
        assert.equal(await config.xpFor('career_task'), 17);
        assert.equal(await config.xpFor('career_task_quiz'), 33);
        assert.equal(await config.xpFor('skill_quiz'), 41);
        assert.equal(await config.xpFor('daily_activity'), 9);
    });

    test('a rule set to 0 pays nothing, and a rule never stored reads its default', async () => {
        await config.updateConfig({ xpRules: { skill_quiz: 0 } });
        config.invalidate();
        assert.equal(await config.xpFor('skill_quiz'), 0);
        assert.equal(await config.xpFor('no_such_rule'), 0);
    });

    test('the student summary carries the live rules, for the pages that print "+10 XP"', async () => {
        await config.updateConfig({ xpRules: { career_task: 12 } });
        config.invalidate();
        const r = await api('GET', '/summary');
        assert.equal(r.status, 200, JSON.stringify(r.body).slice(0, 200));
        assert.equal(r.body.xpRules.career_task, 12);
        assert.equal(typeof r.body.xpRules.mock_interview, 'number');
    });
});
