/**
 * The XP and wallet rules added on 2026-10-10 after a survey of the site for
 * what earned nothing and what cost nothing, and the lesson-progress fix that
 * came with them.
 *
 * Every new rule is optional: it pays (or costs) nothing until an admin adds
 * it under Rewards → Reward rules, and then each pays once per its reference.
 * The hooks tested here run for real: Career Path onboarding and tasks, a
 * friendly game room and a competition match, enrolling, joining a college,
 * the lesson progress endpoint, and the two new priced features.
 *
 * The rulebook is one shared document: what a test changes is put back.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { connect, makeUser, startApp, cleanup, openJobs } = require('../helpers');

// The roadmap's AI, stubbed before the controllers load.
const gemini = require('../../src/career/services/geminiService');
gemini.generateRoadmapFromAI = async () => ({ educationRoadmap: [{ phase: 'BCA Year 2' }, { phase: 'First Role' }], skills: { technical: ['SQL'] } });
// The Learning Bio's AI writer and its strength score, and Google's token exchange: stubbed too, so the real
// hooks run without calling the AI or Google. The bio is "at full strength" for every student here.
const bioStrength = require('../../src/learningbio/bioStrengthService');
bioStrength.strength = () => ({ percent: 100, ready: true, readiness: 'ready', nextStep: null, areas: [] });
require('../../src/learningbio/bioGeneratorService').generateBio = async () => ({ headline: 'A learner', bio: 'Learning every day.', short: 'Learning every day.', model: 'stub' });
const oauth = require('../../src/integrations/google/oauth');
oauth.exchangeCode = async () => ({ access_token: 'stub', refresh_token: 'stub', expiry_date: Date.now() + 3600e3, scope: '' });
oauth.saveLink = async () => {};

const config = require('../../src/rewards/services/configService');
const C = require('../../src/rewards/config/constants');
const { LABELS } = require('../../src/rewards/services/walletRuleService');
const { recordIfRuled } = require('../../src/rewards/services/xpHooks');
const { LearningActivity, WalletTransaction, Wallet } = require('../../src/rewards/models');

const NEW_XP = ['career_onboarding', 'day_plan_complete', 'skill_level_up', 'competition_match_win', 'friendly_game_played', 'friendly_game_win',
    'course_enroll', 'opportunity_profile', 'organization_join', 'bio_strength_full', 'google_connect'];
const NEW_WALLET = ['download_competition_certificate', 'create_game_room'];
// Existing XP rules a test sets an amount on, put back afterwards with the new ones.
const TOUCHED_XP = [...NEW_XP, 'assignment_complete', 'lesson_complete', 'resume_upload'];
const STAMP = `${Date.now()}${Math.floor(Math.random() * 1e4)}`;

let saved, users = [], made = { courses: [], games: [], comps: [], matches: [], orgs: [], admins: [] };
let userApp, roadmapApp, compApp, orgApp, jobsApp, bioApp, googleApp;
const paid = (user, type) => LearningActivity.countDocuments({ userId: user._id, type });
const student = async (label) => { const u = await makeUser(label); users.push(u.user); await openJobs(u); return u; };

before(async () => {
    await connect();
    const cfg = await config.getConfig();
    saved = { xp: { ...cfg.xpRules }, wallet: { ...(cfg.walletRules || {}) }, enabled: cfg.enabled };
    userApp = startApp({ mount: '/api/user', router: require('../../src/routes/userRoutes') });
    roadmapApp = startApp({ mount: '/api/roadmap', router: require('../../src/career/routes/roadmapRoutes') });
    compApp = startApp({ mount: '/api/competitions', router: require('../../src/competitions') });
    orgApp = startApp({ mount: '/api/organizations', router: require('../../src/organizations') });
    jobsApp = startApp({ mount: '/api/jobs', router: require('../../src/jobboard') });
    bioApp = startApp({ mount: '/api/learning-bio', router: require('../../src/learningbio') });
    googleApp = startApp({ mount: '/api/integrations/google', router: require('../../src/integrations/google/routes') });
});

after(async () => {
    // The rulebook as it was: the new rules out again, the old amounts back.
    await config.updateConfig({
        removeRules: { xp: TOUCHED_XP.filter((k) => !(k in saved.xp)), wallet: NEW_WALLET.filter((k) => !(k in saved.wallet)) },
        xpRules: Object.fromEntries(Object.entries(saved.xp).filter(([k]) => TOUCHED_XP.includes(k))),
        walletRules: Object.fromEntries(Object.entries(saved.wallet).filter(([k]) => NEW_WALLET.includes(k)))
    });
    config.invalidate();
    const Module = require('../../src/models/Module');
    const modules = await Module.find({ courseId: { $in: made.courses } }).select('_id').lean();
    await require('../../src/models/Lesson').deleteMany({ moduleId: { $in: modules.map((m) => m._id) } });
    await Module.deleteMany({ courseId: { $in: made.courses } });
    await require('../../src/models/Course').deleteMany({ _id: { $in: made.courses } });
    await require('../../src/competitions/models/PlayGame').deleteMany({ $or: [{ _id: { $in: made.games } }, { 'seats.userId': { $in: users.map((u) => u._id) } }] });
    await require('../../src/competitions/models/Match').deleteMany({ _id: { $in: made.matches } });
    await require('../../src/competitions/models/Competition').deleteMany({ _id: { $in: made.comps } });
    await require('../../src/organizations/models/Organization').deleteMany({ _id: { $in: made.orgs } });
    await require('../../src/models/Admin').deleteMany({ _id: { $in: made.admins } });
    for (const app of [roadmapApp, compApp, orgApp, jobsApp, bioApp, googleApp]) await new Promise((r) => app.server.close(r));
    await cleanup(users, userApp.server);
});

describe('the catalogue', () => {
    test('every new rule is known, labelled and described, and none is on until an admin adds it', () => {
        const { DESCRIPTIONS } = { DESCRIPTIONS: require('fs').readFileSync(require.resolve('../../src/rewards/services/activityService'), 'utf8') };
        for (const k of NEW_XP) {
            assert.ok(C.ACTIVITY_TYPES.includes(k), `${k} is an activity`);
            assert.ok(!(k in C.DEFAULT_XP_RULES), `${k} is optional`);
            assert.match(DESCRIPTIONS, new RegExp(`\\b${k}:`), `${k} has an XP history line`);
        }
        for (const k of NEW_WALLET) {
            assert.ok(C.WALLET_ACTIONS.includes(k) && C.OPTIONAL_WALLET_ACTIONS.includes(k), `${k} is an optional wallet action`);
            assert.ok(!(k in C.DEFAULT_WALLET_RULES));
            assert.ok(LABELS[k], `${k} has a label`);
        }
    });

    test('a rule nobody added records nothing at all', async () => {
        const me = await student('NoRule');
        await config.updateConfig({ removeRules: { xp: ['google_connect'] } }); config.invalidate();
        assert.equal(await recordIfRuled({ userId: me.user._id, type: 'google_connect', refId: 'google' }), null);
        assert.equal(await paid(me.user, 'google_connect'), 0);
    });

    test('once added, it pays once per reference', async () => {
        const me = await student('Ruled');
        await config.updateConfig({ xpRules: Object.fromEntries(NEW_XP.map((k) => [k, 7])) }); config.invalidate();
        await recordIfRuled({ userId: me.user._id, type: 'google_connect', refId: 'google' });
        await recordIfRuled({ userId: me.user._id, type: 'google_connect', refId: 'google' });
        assert.equal(await paid(me.user, 'google_connect'), 1);
    });
});

describe('Career Path', () => {
    test('the first roadmap pays "Build your first roadmap" once; a rebuild pays nothing more', async () => {
        const me = await student('Onboard');
        await require('../../src/career/models/Goal').create({ userId: me.user._id, educationLevel: 'Undergraduate', degree: 'BCA', specialization: 'Computer Applications', currentYear: '2nd Year', careerGoal: 'Data Analyst' });
        const call = roadmapApp.call(me.token);
        assert.equal((await call('POST', '/generate', {})).status, 201);
        assert.equal(await paid(me.user, 'career_onboarding'), 1);
        const again = await call('POST', '/generate', { rebuild: true });
        assert.ok(again.status < 300, JSON.stringify(again.body));
        assert.equal(await paid(me.user, 'career_onboarding'), 1);
    });

    test("finishing today's last task pays once a day, and a skill moving up a level pays once per level", async () => {
        const me = await student('Planner');
        const Task = require('../../src/career/models/Task');
        const SkillProgress = require('../../src/career/models/SkillProgress');
        const { completeTask } = require('../../src/career/services/taskCompletionService');
        const { startOfDay } = require('../../src/career/services/dailyPlanService');
        const roadmapId = new mongoose.Types.ObjectId();
        await SkillProgress.create({ userId: me.user._id, skillName: 'SQL', level: 'Beginner', progress: 95 });
        const [first, second] = await Task.create([
            { userId: me.user._id, roadmapId, title: 'Write three joins', skill: 'SQL', assignedDate: startOfDay(), status: 'Pending' },
            { userId: me.user._id, roadmapId, title: 'Sketch a dashboard', assignedDate: startOfDay(), status: 'Pending' }
        ]);
        await completeTask(me.user._id, first);
        assert.equal(await paid(me.user, 'day_plan_complete'), 0, 'one task still open');
        assert.equal(await paid(me.user, 'skill_level_up'), 1, 'SQL went Beginner → Intermediate');
        assert.equal((await SkillProgress.findOne({ userId: me.user._id, skillName: 'SQL' })).level, 'Intermediate');
        await completeTask(me.user._id, second);
        assert.equal(await paid(me.user, 'day_plan_complete'), 1, 'the day is done');
        // An extra task, also finished: still once today.
        const extra = await Task.create({ userId: me.user._id, roadmapId, title: 'One more', assignedDate: startOfDay(), status: 'Pending' });
        await completeTask(me.user._id, extra);
        assert.equal(await paid(me.user, 'day_plan_complete'), 1);
    });
});

describe('Games and competitions', () => {
    const games = require('../../src/competitions/services/gameService');
    const PlayGame = require('../../src/competitions/models/PlayGame');
    // A friendly chess room between two students, started `minutesAgo` ago, which `loser` then resigns.
    const playRoom = async (host, guest, minutesAgo) => {
        const room = await games.createRoom(host.user, 'chess', {});
        const id = String(room._id || room.game?.id || room.id);
        made.games.push(id);
        await games.joinRoom(guest.user, room.code || room.game?.code);
        await games.startRoom(id, host.user._id);
        await PlayGame.updateOne({ _id: id }, { $set: { startedAt: new Date(Date.now() - minutesAgo * 60e3) } });
        await games.act(id, guest.user._id, { type: 'resign' });
        return id;
    };

    test('a friendly game played through pays both players once a day, and the winner once a day', async () => {
        const a = await student('RoomA'); const b = await student('RoomB');
        await playRoom(a, b, 5);
        assert.equal(await paid(a.user, 'friendly_game_played'), 1);
        assert.equal(await paid(b.user, 'friendly_game_played'), 1);
        assert.equal(await paid(a.user, 'friendly_game_win'), 1);
        assert.equal(await paid(b.user, 'friendly_game_win'), 0);
        await playRoom(a, b, 5);
        assert.equal(await paid(a.user, 'friendly_game_win'), 1, 'still once today');
    });

    test('a game resigned in its first minutes pays nothing', async () => {
        const c = await student('QuickC'); const d = await student('QuickD');
        await playRoom(c, d, 1);
        assert.equal(await paid(c.user, 'friendly_game_played'), 0);
        assert.equal(await paid(c.user, 'friendly_game_win'), 0);
    });

    test('a competition match won at the board pays its winning player once; a walkover pays nothing', async () => {
        const Competition = require('../../src/competitions/models/Competition');
        const Match = require('../../src/competitions/models/Match');
        const { recordGame } = require('../../src/competitions/services/bracketService');
        const w = await student('MatchWin'); const l = await student('MatchLose'); const x = await student('Walk');
        const comp = await Competition.create({ name: `Rules test ${STAMP}`, game: 'chess', status: 'live', startsAt: new Date(), registrationDeadline: new Date() });
        made.comps.push(comp._id);
        const [ta, tb, tc, td] = [1, 2, 3, 4].map(() => new mongoose.Types.ObjectId());
        const match = async (slot, sides, seats, outcome) => {
            const gameId = new mongoose.Types.ObjectId();
            const m = await Match.create({ competitionId: comp._id, round: 0, roundName: 'Semi-final', slot, status: 'live', sides: sides.map((teamId) => ({ teamId })), gameIds: [gameId] });
            made.matches.push(m._id);
            const g = await PlayGame.create({ _id: gameId, kind: 'match', game: 'chess', competitionId: comp._id, matchId: m._id, sideTeams: sides, seats, status: 'finished', outcome, startedAt: new Date(Date.now() - 600e3), finishedAt: new Date() });
            made.games.push(g._id);
            return g;
        };
        // Two matches in the round, so deciding one does not end the competition.
        const won = await match(0, [ta, tb], [{ userId: w.user._id, name: 'W', side: 0 }, { userId: l.user._id, name: 'L', side: 1 }], { places: [[0], [1]], reason: 'Checkmate' });
        const walked = await match(1, [tc, td], [{ userId: x.user._id, name: 'X', side: 0 }], { places: [[0], [1]], reason: 'The other side never joined', walkover: true });
        await recordGame(won);
        await recordGame(won);
        assert.equal(await paid(w.user, 'competition_match_win'), 1);
        assert.equal(await paid(l.user, 'competition_match_win'), 0);
        await recordGame(walked);
        assert.equal(await paid(x.user, 'competition_match_win'), 0);
    });
});

describe('Courses', () => {
    let me, courseA, courseB, lessons;
    before(async () => {
        me = await student('Courses');
        const Course = require('../../src/models/Course');
        const Module = require('../../src/models/Module');
        const Lesson = require('../../src/models/Lesson');
        courseA = `RA${STAMP}`; courseB = `RB${STAMP}`;
        await Course.create([{ _id: courseA, title: 'Rules A', isPublished: true }, { _id: courseB, title: 'Rules B', isPublished: true }]);
        made.courses.push(courseA, courseB);
        const [ma, mb] = await Module.create([{ courseId: courseA, title: 'A1', order: 1 }, { courseId: courseB, title: 'B1', order: 1 }]);
        lessons = {
            video: await Lesson.create({ moduleId: ma._id, title: 'Watch', type: 'video', order: 1 }),
            assignment: await Lesson.create({ moduleId: ma._id, title: 'Build it', type: 'assignment', order: 2 }),
            other: await Lesson.create({ moduleId: mb._id, title: 'Elsewhere', type: 'video', order: 1 })
        };
        await config.updateConfig({ xpRules: { lesson_complete: 10, assignment_complete: 30 } }); config.invalidate();
    });

    test('enrolling pays once a day, however many courses', async () => {
        const call = userApp.call(me.token);
        assert.equal((await call('POST', `/courses/${courseA}/enroll`)).status, 200);
        assert.equal((await call('POST', `/courses/${courseB}/enroll`)).status, 200);
        assert.equal(await paid(me.user, 'course_enroll'), 1);
    });

    test('progress counts only a real lesson of the course: a made-up id or another course\'s lesson pays nothing', async () => {
        const call = userApp.call(me.token);
        const fake = await call('POST', '/progress/update', { courseId: courseA, lessonId: String(new mongoose.Types.ObjectId()) });
        assert.equal(fake.status, 404);
        const foreign = await call('POST', '/progress/update', { courseId: courseA, lessonId: String(lessons.other._id) });
        assert.equal(foreign.status, 404);
        assert.equal((await call('POST', '/progress/update', { courseId: courseA, lessonId: 'not-an-id' })).status, 400);
        assert.equal(await paid(me.user, 'lesson_complete'), 0);
    });

    test('an assignment lesson pays "Complete an assignment" on top of the lesson, and the course is counted from its own lessons', async () => {
        const call = userApp.call(me.token);
        const one = await call('POST', '/progress/update', { courseId: courseA, lessonId: String(lessons.video._id) });
        assert.equal(one.status, 200);
        assert.equal(one.body.progress.percentage, 50);
        assert.equal(await paid(me.user, 'assignment_complete'), 0);
        const two = await call('POST', '/progress/update', { courseId: courseA, lessonId: String(lessons.assignment._id) });
        assert.equal(two.body.progress.percentage, 100);
        assert.equal(await paid(me.user, 'lesson_complete'), 2);
        assert.equal(await paid(me.user, 'assignment_complete'), 1);
    });
});

describe('Organizations', () => {
    test('a student accepted into a college organization is paid once', async () => {
        const Organization = require('../../src/organizations/models/Organization');
        const Admin = require('../../src/models/Admin');
        const org = await Organization.create({ orgCode: `rules_test_${STAMP}`, name: `Rules Test College ${STAMP}`, organizationType: 'college', email: `rules-${STAMP}@example.com`, status: 'active' });
        made.orgs.push(org._id);
        const admin = await Admin.create({ name: 'Rules Org Admin', email: `rules-admin-${STAMP}@example.com`, password: 'Passw0rd!x', role: 'orgadmin', organizationId: org._id });
        made.admins.push(admin._id);
        const me = await student('Joiner');
        const asMe = orgApp.call(me.token);
        const asAdmin = orgApp.call(jwt.sign({ id: String(admin._id) }, process.env.JWT_SECRET, { expiresIn: '10m' }));
        const req = await asMe('POST', '/student/requests', { orgCode: org.orgCode });
        assert.equal(req.status, 201, JSON.stringify(req.body));
        const ok = await asAdmin('PUT', `/me/requests/${req.body.request._id}`, { decision: 'approve' });
        assert.equal(ok.status, 200, JSON.stringify(ok.body));
        assert.equal(await paid(me.user, 'organization_join'), 1);
    });
});

describe('Jobs, Learning Bio and Google', () => {
    test('saving the part-time jobs profile pays once', async () => {
        const me = await student('PartTimeProfile');
        const day = (n) => new Date(Date.now() + n * 86400e3).toISOString().slice(0, 10);
        const body = { dateOfBirth: '2000-01-01', wantFrom: day(1), wantTo: day(5), interests: ['catering'] };
        const call = jobsApp.call(me.token);
        const first = await call('PUT', '/opportunities/profile', body);
        assert.equal(first.status, 200, JSON.stringify(first.body));
        assert.equal((await call('PUT', '/opportunities/profile', { ...body, wantTo: day(6) })).status, 200);
        assert.equal(await paid(me.user, 'opportunity_profile'), 1);
    });

    test('a resume uploaded on the Jobs page pays "Upload a resume", once, like the profile\'s', async () => {
        // A demo card, so a Word file is read on the server without the AI.
        const zlib = require('zlib');
        const { DEMO_CARDS } = require('../../src/services/fullAccess');
        const { normaliseCardNumber } = require('../../src/utils/cardNumber');
        const { DOCX_MIME } = require('../../src/jobboard/services/localResumeParse');
        const xml = Buffer.from('<?xml version="1.0"?><w:document><w:body><w:p><w:r><w:t>Technical skills: SQL, Excel, Power BI</w:t></w:r></w:p></w:body></w:document>');
        const data = zlib.deflateRawSync(xml); const name = Buffer.from('word/document.xml');
        const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(8, 8); lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(xml.length, 22); lh.writeUInt16LE(name.length, 26);
        const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(8, 10); ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(xml.length, 24); ch.writeUInt16LE(name.length, 28);
        const cd = Buffer.concat([ch, name]); const eo = Buffer.alloc(22); eo.writeUInt32LE(0x06054b50, 0); eo.writeUInt16LE(1, 8); eo.writeUInt16LE(1, 10); eo.writeUInt32LE(cd.length, 12); eo.writeUInt32LE(lh.length + name.length + data.length, 16);
        const word = Buffer.concat([lh, name, data, cd, eo]);
        const me = await student('JobsResume');
        const card = normaliseCardNumber(me.user.cardNumber);
        DEMO_CARDS.add(card);
        try {
            await config.updateConfig({ xpRules: { resume_upload: 6 } }); config.invalidate();
            const upload = async () => {
                const fd = new FormData();
                fd.append('resume', new Blob([word], { type: DOCX_MIME }), 'resume.docx');
                const r = await fetch(`http://127.0.0.1:${jobsApp.server.address().port}/api/jobs/resume`, { method: 'POST', headers: { Authorization: `Bearer ${me.token}` }, body: fd });
                return { status: r.status, body: await r.json().catch(() => ({})) };
            };
            const first = await upload();
            assert.equal(first.status, 200, JSON.stringify(first.body));
            assert.equal((await upload()).status, 200);
            await new Promise((r) => setTimeout(r, 300));   // paid once the answer has gone
            assert.equal(await paid(me.user, 'resume_upload'), 1);
        } finally { DEMO_CARDS.delete(card); }
    });

    test('a Learning Bio at full strength pays once, however often it is opened', async () => {
        const me = await student('BioFull');
        const call = bioApp.call(me.token);
        assert.equal((await call('GET', '/')).status, 200);
        assert.equal((await call('GET', '/')).status, 200);
        assert.equal(await paid(me.user, 'bio_strength_full'), 1);
    });

    test('connecting a Google account pays once; connecting again pays nothing more', async () => {
        const me = await student('GoogleLink');
        const state = jwt.sign({ uid: String(me.user._id) }, process.env.JWT_SECRET, { expiresIn: '10m' });
        const back = async () => (await fetch(`http://127.0.0.1:${googleApp.server.address().port}/api/integrations/google/callback?code=abc&state=${state}`, { redirect: 'manual' })).headers.get('location');
        assert.match(await back(), /google=connected/);
        assert.match(await back(), /google=connected/);
        assert.equal(await paid(me.user, 'google_connect'), 1);
    });
});

describe('the new wallet rules', () => {
    test('creating a game room is charged when priced, and refunded when the room could not be made', async () => {
        const me = await student('RoomPay');
        await config.updateConfig({ walletRules: { create_game_room: 7 } }); config.invalidate();
        const call = compApp.call(me.token);
        const bad = await call('POST', '/rooms', { game: 'tiddlywinks' });
        assert.ok(bad.status >= 400);
        const good = await call('POST', '/rooms', { game: 'chess' });
        assert.equal(good.status, 201, JSON.stringify(good.body));
        made.games.push(good.body.game?.id || good.body._id || good.body.id);
        await new Promise((r) => setTimeout(r, 300));   // the refund is written when the failed answer finishes
        const rows = await WalletTransaction.find({ userId: me.user._id, source: { $in: ['feature_charge', 'feature_refund'] } }).lean();
        assert.equal(rows.filter((t) => t.source === 'feature_charge').length, 2, 'both attempts were charged');
        assert.equal(rows.filter((t) => t.source === 'feature_refund').length, 1, 'the failed one was given back');
        const wallet = await Wallet.findOne({ userId: me.user._id }).lean();
        assert.equal(wallet.totalSpent, 7, 'one room paid for');
    });

    test('a competition certificate is charged when priced, and refunded when there is none to give', async () => {
        const me = await student('CertPay');
        await config.updateConfig({ walletRules: { download_competition_certificate: 4 } }); config.invalidate();
        const r = await compApp.call(me.token)('GET', `/${new mongoose.Types.ObjectId()}/certificate`);
        assert.equal(r.status, 404);
        await new Promise((res) => setTimeout(res, 300));
        const rows = await WalletTransaction.find({ userId: me.user._id, source: { $in: ['feature_charge', 'feature_refund'] } }).lean();
        assert.deepEqual(rows.map((t) => t.source).sort(), ['feature_charge', 'feature_refund']);
        assert.equal((await Wallet.findOne({ userId: me.user._id }).lean()).totalSpent, 0);
    });
});
