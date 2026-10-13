/**
 * The Jobs lock, held by the server (2026-10-13). The section opens once five
 * Career Path skills are at 25% or more, or for an exempt account. It used to
 * be checked only by the page: a locked student asking the server for jobs got
 * them, and PUT /api/career/skills/:id let a student set their own skills to
 * 100%, which opened it. That route is gone; progress is earned on the server.
 *
 * The job alerts bell sits in the app's header on every page, so
 * /api/jobs/notifications answers whether Jobs is open or not.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, startApp, cleanup, openJobs } = require('../helpers');
const SkillProgress = require('../../src/career/models/SkillProgress');

let jobs, skills, locked, nearly, ready, exempt;
const SKILLS = ['React', 'JavaScript', 'Node.js', 'HTML', 'CSS'];
const give = (st, progress) => SkillProgress.insertMany(SKILLS.map((skillName, i) => ({ userId: st.user._id, skillName, progress: progress[i], level: 'Intermediate' })));

before(async () => {
    await connect();
    jobs = startApp({ mount: '/api/jobs', router: require('../../src/jobboard') });
    skills = startApp({ mount: '/api/career/skills', router: require('../../src/career/routes/skillRoutes') });
    locked = await makeUser('Locked');
    nearly = await makeUser('Nearly'); await give(nearly, [30, 30, 30, 30, 24]);
    ready = await makeUser('Ready'); await give(ready, [30, 30, 30, 30, 25]);
    exempt = await makeUser('Exempt'); await openJobs(exempt);
});
after(async () => {
    await SkillProgress.deleteMany({ userId: { $in: [locked, nearly, ready, exempt].map((s) => s.user._id) } });
    await cleanup([locked.user, nearly.user, ready.user, exempt.user], jobs.server);
    skills.server.close();
});

describe('the Jobs lock on the server', () => {
    test('a student without five skills at 25% is refused, and told how far along they are', async () => {
        for (const st of [locked, nearly]) {
            for (const [method, path, body] of [['POST', '/recommend', { skills: ['React'], role: 'Frontend Developer' }], ['GET', '/saved'], ['GET', '/opportunities/profile'], ['GET', '/roles']]) {
                const r = await jobs.call(st.token)(method, path, body);
                assert.equal(r.status, 403, `${st.user.name} ${method} ${path}`);
                assert.equal(r.body.code, 'JOBS_SKILLS_LOCKED');
            }
        }
        const r = await jobs.call(nearly.token)('GET', '/saved');
        assert.equal(r.body.ready, 4);
        assert.deepEqual(r.body.required, { skills: 5, percent: 25 });
    });

    test('five skills at 25% open it, and so does an exempt account', async () => {
        for (const st of [ready, exempt]) {
            const r = await jobs.call(st.token)('GET', '/saved');
            assert.equal(r.status, 200, st.user.name);
        }
    });

    test('the job alerts bell answers either way', async () => {
        const r = await jobs.call(locked.token)('GET', '/notifications');
        assert.equal(r.status, 200);
    });

    test('a student cannot set their own skill progress', async () => {
        const row = await SkillProgress.findOne({ userId: nearly.user._id, skillName: 'CSS' }).lean();
        const r = await skills.call(nearly.token)('PUT', `/${row._id}`, { progress: 100 });
        assert.equal(r.status, 404);
        assert.equal((await SkillProgress.findById(row._id).lean()).progress, 24, 'unchanged');
        assert.equal((await jobs.call(nearly.token)('GET', '/saved')).status, 403, 'and Jobs stays shut');
    });

    test('their skills can still be read', async () => {
        const r = await skills.call(nearly.token)('GET', '/');
        assert.equal(r.status, 200);
        assert.equal(r.body.length, 5);
    });
});
