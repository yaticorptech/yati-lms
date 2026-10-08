/**
 * The demo cards (services/fullAccess.js), in the Jobs section and with AI:
 *
 *   - the Jobs section starts from the target role set in Career Path, and
 *     every skill on that role's roadmap — started or not — opened out into
 *     the skills listings name (GET /api/jobs/my-profile, demo cards only)
 *   - their AI runs on the platform's Gemini key from the environment, never
 *     a saved key of their own, and without the daily per-student allowance
 *
 * Every other student: unchanged.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, startApp, cleanup } = require('../helpers');
const { DEMO_CARDS } = require('../../src/services/fullAccess');
const { normaliseCardNumber } = require('../../src/utils/cardNumber');
const SkillProgress = require('../../src/career/models/SkillProgress');
const CareerGoal = require('../../src/career/models/Goal');
const AiUsage = require('../../src/career/models/AiUsage');
const { runFor } = require('../../src/career/services/aiContext');
const aiQuota = require('../../src/career/services/aiQuota');
const userAiKey = require('../../src/utils/userAiKey');
const { jobsProfileFor } = require('../../src/jobboard/services/searchSkills');

let app, demo, plain, card;

before(async () => {
    await connect();
    app = startApp({ mount: '/api/jobs', router: require('../../src/jobboard') });
    demo = await makeUser('DemoAi');
    plain = await makeUser('PlainAi');
    card = normaliseCardNumber(demo.user.cardNumber);
    DEMO_CARDS.add(card);
    for (const who of [demo, plain]) {
        await CareerGoal.collection.insertOne({ userId: who.user._id, careerGoal: 'Full Stack Developer', educationLevel: 'Undergraduate' });
        await SkillProgress.insertMany([
            { userId: who.user._id, skillName: 'React.js & Next.js', progress: 0, level: 'Beginner' },
            { userId: who.user._id, skillName: 'SQL & NoSQL Databases', progress: 0, level: 'Beginner' }
        ]);
    }
});

after(async () => {
    DEMO_CARDS.delete(card);
    await CareerGoal.deleteMany({ userId: { $in: [demo.user._id, plain.user._id] } });
    await cleanup([demo.user, plain.user], app.server);
});

test('a demo card\'s Jobs section starts from its target role and the role\'s roadmap skills, started or not', async () => {
    const mine = await jobsProfileFor(demo.user);
    assert.equal(mine.role, 'Full Stack Developer');
    for (const s of ['React', 'Next.js', 'SQL']) assert.ok(mine.skills.includes(s), `${s} — at 0% on the roadmap, still the role's skill`);
    const r = await app.call(demo.token)('GET', '/my-profile');
    assert.equal(r.status, 200);
    assert.equal(r.body.role, 'Full Stack Developer');
    assert.equal((await app.call(plain.token)('GET', '/my-profile')).status, 403, 'not offered to anyone else');
});

test('a demo card has no daily AI allowance; any other student still does', async () => {
    const day = aiQuota.dayKey();
    const spend = (who) => AiUsage.insertMany(Array.from({ length: aiQuota.PER_STUDENT }, () => ({ userId: who.user._id, day, kind: 'test', ok: true })));
    await spend(demo); await spend(plain);

    await runFor(demo.user._id, () => aiQuota.assertWithinBudget());   // does not throw
    await assert.rejects(runFor(plain.user._id, () => aiQuota.assertWithinBudget()), (e) => e.code === 'student-daily-cap');

    const mineLeft = await aiQuota.remainingForStudent(demo.user._id);
    assert.equal(mineLeft.unlimited, true);
    assert.equal(mineLeft.remaining, aiQuota.PER_STUDENT, 'shown full, so no "running low" note');
    assert.equal((await aiQuota.remainingForStudent(plain.user._id)).remaining, 0);
});

test('a demo card runs on the platform key from the environment, even with a key of its own saved', async () => {
    const real = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'platform-key-from-env';
    try {
        await userAiKey.saveOwnKey(demo.user._id, 'AIzaOwnKeyOfTheDemoCard0000000000000');
        await userAiKey.saveOwnKey(plain.user._id, 'AIzaOwnKeyOfAnOrdinaryStudent00000000');
        const demoKey = await runFor(demo.user._id, () => userAiKey.resolveGeminiKey());
        assert.deepEqual(demoKey, { key: 'platform-key-from-env', own: false });
        const plainKey = await runFor(plain.user._id, () => userAiKey.resolveGeminiKey());
        assert.equal(plainKey.own, true, 'an ordinary student\'s own key is still theirs to use');
    } finally {
        process.env.GEMINI_API_KEY = real;
        await userAiKey.saveOwnKey(demo.user._id, '');
        await userAiKey.saveOwnKey(plain.user._id, '');
    }
});
