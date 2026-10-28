/**
 * Every game, the whole way, through the API, with the real game engines:
 *
 *   the admin organises it → two colleges enter a team each → the admin
 *   approves → draws the matches → the match does NOT start by itself, even
 *   past its time, and nobody has a code yet → the admin presses Start →
 *   each player sees their own code → joining needs that code (none, a wrong
 *   one and a teammate's are refused) → they play → the result decides the
 *   competition → the winner is told, gets the prizes, sees the result in
 *   Results and History, and downloads the certificate.
 *
 * Quiz Arena's whole flow is tests/competitions/arena.test.js.
 */
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { connect, makeUser, makeAdmin, startApp, cleanup } = require('../helpers');

const Competition = require('../../src/competitions/models/Competition');
const Team = require('../../src/competitions/models/Team');
const Match = require('../../src/competitions/models/Match');
const PlayGame = require('../../src/competitions/models/PlayGame');
const Organization = require('../../src/organizations/models/Organization');
const Notification = require('../../src/career/models/Notification');
const Admin = require('../../src/models/Admin');
const User = require('../../src/models/User');

const STAMP = `${Date.now()}`;
const made = { orgs: [], admins: [], users: [] };
let app, boss, colleges;
const inDays = (d) => new Date(Date.now() + d * 86400e3).toISOString();

before(async () => {
    await connect();
    app = startApp({ mount: '/api/competitions', router: require('../../src/competitions') });
    const b = await makeAdmin('Flow Super');
    await Admin.updateOne({ _id: b.admin._id }, { $set: { role: 'superadmin' } });
    made.admins.push(b.admin._id);
    boss = app.call(b.token);
    colleges = [];
    for (const label of ['North', 'South']) {
        const org = await Organization.create({ orgCode: `F${label}-${STAMP}`, name: `${label} College ${STAMP}`, organizationType: 'college', email: `flow-${label.toLowerCase()}-${STAMP}@example.com`, status: 'active' });
        made.orgs.push(org._id);
        const admin = await Admin.create({ name: `${label} Coordinator`, email: `flow-org-${label}-${STAMP}@example.com`, password: 'Passw0rd!x', role: 'orgadmin', organizationId: org._id });
        made.admins.push(admin._id);
        const s = await makeUser(`${label} Player`);
        await User.updateOne({ _id: s.user._id }, { $set: { organizationId: org._id } });
        made.users.push(s.user);
        colleges.push({ org, call: app.call(jwt.sign({ id: String(admin._id) }, process.env.JWT_SECRET, { expiresIn: '30m' })), player: { ...s, call: app.call(s.token) } });
    }
});

after(async () => {
    const ids = (await Competition.find({ name: { $regex: STAMP } }).select('_id').lean()).map((c) => c._id);
    await Promise.all([
        PlayGame.deleteMany({ competitionId: { $in: ids } }),
        Match.deleteMany({ competitionId: { $in: ids } }),
        Team.deleteMany({ competitionId: { $in: ids } }),
        Competition.deleteMany({ _id: { $in: ids } }),
        Notification.deleteMany({ userId: { $in: made.users.map((u) => u._id) } }),
        Organization.deleteMany({ _id: { $in: made.orgs } }),
        Admin.deleteMany({ _id: { $in: made.admins } })
    ]);
    await cleanup(made.users, app.server);
});

for (const game of ['chess', 'rapidfire', 'codeclash', 'brainsprint']) {
    describe(`${game}: organised to certificate`, () => {
        let id; let match; let startedAt;
        const [north, south] = [0, 1].map((i) => () => colleges[i]);

        test('the admin organises it and opens registration', async () => {
            const r = await boss('POST', '/admin', {
                name: `${game} Flow ${STAMP}`, game, startsAt: inDays(3), registrationDeadline: inDays(2), playersPerTeam: 1, maxTeams: 4, open: true,
                participationXp: 5, prizes: [{ place: 1, title: 'Winner', xp: 50, rewardPoints: 10 }, { place: 2, title: 'Runner-up', xp: 20 }]
            });
            assert.equal(r.status, 201, JSON.stringify(r.body));
            id = r.body.competition.id;
            assert.equal(r.body.competition.status, 'registration');
            assert.ok((await north().player.call('GET', '/')).body.competitions.some((c) => c.id === id), 'students see it');
        });

        test('each college enters its own player; the admin approves', async () => {
            for (const c of colleges) {
                const r = await c.call('PUT', `/org/${id}/team`, { coordinatorPhone: '9876543210', teamName: `${c.org.name.split(' ')[0]} ${game}`, players: [String(c.player.user._id)] });
                assert.ok([200, 201].includes(r.status), JSON.stringify(r.body));
            }
            const pending = (await north().player.call('GET', `/${id}`)).body.competition.myTeam;
            assert.equal(pending.status, 'pending', 'waiting for the admin');
            for (const t of (await boss('GET', `/admin/${id}`)).body.teams) assert.equal((await boss('PUT', `/admin/${id}/teams/${t.id}`, { status: 'approved' })).status, 200);
        });

        test('drawn, the match waits for the admin: no start by itself, no code, Join off', async () => {
            const d = await boss('POST', `/admin/${id}/draw`, { firstMatchAt: inDays(3) });
            assert.equal(d.status, 200, JSON.stringify(d.body));
            match = d.body.rounds[0].matches[0];
            // Even once its time has come.
            await Match.updateOne({ _id: match.id }, { $set: { scheduledAt: new Date(Date.now() - 60e3) } });
            for (const c of colleges) {
                const page = (await c.player.call('GET', `/${id}`)).body;
                assert.equal(page.myMatch?.started, false, 'not started by the clock');
                assert.equal(page.myMatch.code, null, 'no code before Start');
                assert.equal(page.myMatch.gameId, null);
                const me = (await c.player.call('GET', '/me')).body;
                const mine = [...(me.live || []), ...(me.upcoming || []), ...(me.matches || [])].find((m) => m.id === match.id);
                assert.equal(mine.status, 'scheduled');
                assert.equal(mine.gameCode ?? null, null);
            }
            assert.equal((await PlayGame.countDocuments({ competitionId: id })).valueOf(), 0, 'no game opened');
        });

        test('Start: each player gets their own code, and only it lets them in', async () => {
            assert.equal((await boss('POST', `/admin/${id}/matches/${match.id}/start`)).status, 200);
            const pages = await Promise.all(colleges.map(async (c) => (await c.player.call('GET', `/${id}`)).body.myMatch));
            for (const p of pages) {
                assert.equal(p.started, true);
                assert.match(p.code, /^[A-Z2-9]{6}$/, 'my own code, on the page');
                assert.ok(p.gameId);
            }
            assert.notEqual(pages[0].code, pages[1].code, 'a code each');
            const alerts = (await north().player.call('GET', '/alerts')).body.alerts;
            assert.equal(alerts.find((a) => a.gameId === pages[0].gameId)?.code, pages[0].code, 'the pop-up has my code');
            const g = pages[0].gameId;
            assert.ok((await north().player.call('POST', `/play/${g}/join`, {})).status >= 400, 'no code: refused');
            assert.ok((await north().player.call('POST', `/play/${g}/join`, { code: 'ZZZZZZ' })).status >= 400, 'a wrong code: refused');
            assert.ok((await north().player.call('POST', `/play/${g}/join`, { code: pages[1].code })).status >= 400, 'the other player\'s code: refused');
            assert.equal((await north().player.call('POST', `/play/${g}/join`, { code: pages[0].code })).status, 200);
            assert.equal((await south().player.call('POST', `/play/${g}/join`, { code: pages[1].code.toLowerCase() })).status, 200);
            assert.equal((await north().player.call('GET', `/${id}`)).body.myMatch.joined, true);
            match.gameId = g;
        });

        test('they play; the result decides the competition', async () => {
            // South resigns: North wins.
            startedAt = new Date();
            const r = await south().player.call('POST', `/play/${match.gameId}/action`, { action: { type: 'resign' } });
            assert.equal(r.status, 200, JSON.stringify(r.body));
            await require('../../src/competitions/services/bracketService').settled?.();
            let c;
            for (let i = 0; i < 30; i += 1) {
                c = (await boss('GET', `/admin/${id}`)).body.competition;
                if (c.status === 'completed') break;
                await new Promise((res) => setTimeout(res, 100));
            }
            assert.equal(c.status, 'completed', 'a two-team competition is over after its final');
            assert.equal(c.winners.find((w) => w.place === 1)?.collegeName, north().org.name);
        });

        test('the winner is told, paid, and finds it in Results and History with the certificate', async () => {
            const winner = north().player;
            // Students see nothing, and nothing is paid, until the organizer publishes the results.
            assert.ok(!(await winner.call('GET', '/history')).body.competitions.some((x) => x.competition.id === id), 'hidden before publishing');
            assert.equal((await winner.call('GET', `/${id}/certificate`)).status, 409);
            assert.equal((await boss('POST', `/admin/${id}/publish-results`)).status, 200);
            let told = [];
            for (let i = 0; i < 30 && !told.length; i += 1) {
                told = (await Notification.find({ userId: winner.user._id, createdAt: { $gte: startedAt } }).lean()).filter((n) => /1st place/.test(n.title));
                if (!told.length) await new Promise((res) => setTimeout(res, 100));
            }
            assert.ok(told.length, 'told they won 1st place');
            const results = (await winner.call('GET', '/history')).body.competitions;
            assert.ok(results.some((x) => x.competition.id === id), 'in Results');
            const mine = (await winner.call('GET', '/me')).body.results.find((x) => x.competition.id === id);
            assert.equal(mine?.place, 1, 'in History, 1st');
            assert.equal(mine.certificate, true);
            const pdf = await fetch(`http://127.0.0.1:${app.server.address().port}/api/competitions/${id}/certificate`, { headers: { Authorization: `Bearer ${winner.token}` } });
            assert.equal(pdf.status, 200);
            assert.equal(pdf.headers.get('content-type'), 'application/pdf');
            const page = (await winner.call('GET', `/${id}`)).body.competition;
            assert.equal(page.status, 'completed');
            assert.equal(page.myTeam.place, 1);
            // The runner-up gets a participation certificate (on by default).
            const second = (await south().player.call('GET', '/me')).body.results.find((x) => x.competition.id === id);
            assert.equal(second?.place, 2);
        });
    });
}

describe('Start now: the admin starts it any time, whatever times were set', () => {
    test('straight from registration (even before the deadline): drawn, opened, codes given', async () => {
        const r = await boss('POST', '/admin', { name: `Start Now ${STAMP}`, game: 'rapidfire', startsAt: inDays(5), registrationDeadline: inDays(4), playersPerTeam: 1, maxTeams: 4, open: true });
        const id = r.body.competition.id;
        for (const c of colleges) await c.call('PUT', `/org/${id}/team`, { coordinatorPhone: '9876543210', teamName: `${c.org.name.split(' ')[0]} Now`, players: [String(c.player.user._id)] });
        for (const t of (await boss('GET', `/admin/${id}`)).body.teams) await boss('PUT', `/admin/${id}/teams/${t.id}`, { status: 'approved' });
        const s = await boss('POST', `/admin/${id}/start-now`);
        assert.equal(s.status, 200, JSON.stringify(s.body));
        assert.equal(s.body.competition.status, 'live');
        assert.ok(s.body.rounds[0].matches.every((m) => m.status === 'live'), 'every match opened');
        const page = (await colleges[0].player.call('GET', `/${id}`)).body.myMatch;
        assert.equal(page.started, true);
        assert.match(page.code, /^[A-Z2-9]{6}$/);
        assert.equal((await boss('POST', `/admin/${id}/start-now`)).status, 409, 'nothing left to start');
    });
});

describe('a college allowed to host runs its own Quiz Arena, like the admin', () => {
    const { ArenaQuestion, ArenaCompetition, ArenaEntry } = require('../../src/competitions/arena/models');
    let host, other, contestId;
    before(async () => {
        [host, other] = colleges;
        await Organization.updateOne({ _id: host.org._id }, { $set: { canHostCompetitions: true } });
    });
    after(async () => {
        const ids = (await ArenaCompetition.find({ hostOrganizationId: host.org._id }).select('_id').lean()).map((c) => c._id);
        await ArenaEntry.deleteMany({ competitionId: { $in: ids } });
        await ArenaCompetition.deleteMany({ _id: { $in: ids } });
        await ArenaQuestion.deleteMany({ organizationId: host.org._id });
    });

    test('its own question bank, kept apart from the platform\'s', async () => {
        assert.equal((await other.call('GET', '/org/host/arena/questions')).status, 403, 'not allowed to host: refused');
        const q = (round, n) => ({ round, prompt: `Host R${round} Q${n} ${STAMP}`, options: ['A', 'B', 'C', 'D'], answer: n % 4, category: 'Test', ...(round === 2 ? { imageUrl: 'https://example.com/p.jpg' } : {}), ...(round === 3 ? { source: 'Test' } : {}) });
        for (const [round, n] of [[1, 2], [2, 1], [3, 2]]) {
            for (let k = 0; k < n; k += 1) {
                const r = await host.call('POST', '/org/host/arena/questions', q(round, k));
                assert.equal(r.status, 201, JSON.stringify(r.body));
                assert.equal((await host.call('POST', `/org/host/arena/questions/${r.body.question._id}/review`, { approve: true })).status, 200);
            }
        }
        const mine = (await host.call('GET', '/org/host/arena/questions')).body.questions;
        assert.equal(mine.length, 5, 'only its own questions');
        const platform = (await boss('GET', '/arena/admin/questions')).body.questions;
        assert.ok(!platform.some((x) => x.prompt.includes(`Host R1 Q0 ${STAMP}`)), 'not in the platform\'s bank');
        assert.equal((await boss('POST', `/arena/admin/questions/${mine[0]._id}/review`, { approve: false })).status, 404, 'the platform cannot touch it');
    });

    test('creates and publishes a contest from its own bank, for its own students only', async () => {
        // Today, so the college may start it (a college's Start now opens on the day).
        // Made with real dates (registration ends on an earlier day), then moved to today in the database.
        const r = await host.call('POST', '/org/host/arena', { title: `Host Quiz ${STAMP}`, startsAt: new Date(Date.now() + 2 * 86400e3), registrationDeadline: new Date(Date.now() + 1800e3), counts: { 1: 2, 2: 1, 3: 2 } });
        if (r.status === 201) await require('../../src/competitions/arena/models').ArenaCompetition.updateOne({ _id: r.body.competition.id }, { $set: { startsAt: new Date(Date.now() + 120e3), registrationDeadline: new Date(Date.now() + 60e3) } });
        assert.equal(r.status, 201, JSON.stringify(r.body));
        contestId = r.body.competition.id;
        const before = (await host.call('GET', `/org/host/arena/${contestId}/preview`)).body;
        assert.equal(before.draft, true);
        assert.equal(before.questions.length, 5, 'the demo shows what Publish would take');
        assert.equal((await host.call('POST', `/org/host/arena/${contestId}/publish`, { fromBank: true })).status, 200);
        const demo = (await host.call('GET', `/org/host/arena/${contestId}/preview`)).body;
        assert.equal(demo.questions.length, 5);
        assert.ok(demo.questions.every((q) => q.options.length === 4 && q.answer === undefined), 'as students see it: no answers');
        const saved = await ArenaCompetition.findById(contestId).lean();
        assert.ok(saved.paper.every((p) => p.prompt.includes(STAMP)), 'its own questions');
        assert.ok((await host.call('GET', '/org/host/arena')).body.competitions.some((c) => c.id === contestId));
        assert.ok(!(await boss('GET', '/arena/admin')).body.competitions.some((c) => c.id === contestId), 'not the platform\'s');
        assert.ok((await host.player.call('GET', '/arena')).body.competitions.some((c) => c.id === contestId), 'its students see it');
        assert.ok(!(await other.player.call('GET', '/arena')).body.competitions.some((c) => c.id === contestId), 'other colleges\' do not');
        assert.equal((await other.player.call('GET', `/arena/${contestId}`)).status, 404);
    });

    test('Generate question bank fills its own bank at once', async () => {
        const t0 = Date.now();
        const g = await host.call('POST', '/org/host/arena/questions/generate', { round: 'all' });
        assert.equal(g.status, 200, JSON.stringify(g.body));
        let job = g.body.job;
        while (job.status === 'running') { await new Promise((r) => setTimeout(r, 200)); job = (await host.call('GET', `/org/host/arena/questions/import/${job.id}`)).body.job; }
        assert.ok(Date.now() - t0 < 15000, `took ${Date.now() - t0} ms`);
        const mine = (await host.call('GET', '/org/host/arena/questions?round=1')).body.questions;
        assert.ok(mine.length > 10, `its own round 1 has ${mine.length}`);
        assert.ok(mine.every((x) => x.status === 'draft' || x.prompt.includes(STAMP)), 'new ones are drafts to review');
        const counts = (await host.call('GET', '/org/host/arena/questions')).body.counts;
        assert.ok([1, 2, 3].every((r) => counts[r].draft + counts[r].approved > 0), `all three rounds filled: ${JSON.stringify(counts)}`);
    });

    test('enters, approves and starts it; the student joins with their code', async () => {
        assert.equal((await host.call('PUT', `/org/arena/${contestId}/entries`, { players: [String(host.player.user._id)] })).status, 200);
        assert.equal((await other.call('PUT', `/org/arena/${contestId}/entries`, { players: [String(other.player.user._id)] })).status >= 400, true, 'another college cannot enter it');
        const entry = (await host.call('GET', `/org/host/arena/${contestId}`)).body.participants[0];
        assert.equal((await host.call('POST', `/org/host/arena/${contestId}/entries/review`, { entryIds: [entry.id], status: 'approved' })).status, 200);
        assert.equal((await host.call('POST', `/org/host/arena/${contestId}/start-now`)).status, 200);
        const code = (await host.player.call('GET', `/arena/${contestId}`)).body.competition.myCode;
        assert.match(code, /^[A-Z2-9]{6}$/);
        assert.equal((await host.player.call('POST', `/arena/${contestId}/join`, { code })).status, 200);
    });
});

describe('an entry fee: approved players pay online (Razorpay) before they can join', () => {
    const crypto = require('crypto');
    const fees = require('../../src/competitions/services/entryFee');
    let id; let paidOrders;
    before(() => {
        process.env.RAZORPAY_KEY_ID = 'rzp_test_key';
        process.env.RAZORPAY_KEY_SECRET = 'test_secret';
        paidOrders = new Set();
        let n = 0;
        // A stand-in Razorpay: makes orders, and says which are paid.
        fees.setFetch(async (url, opts = {}) => {
            const ok = (body) => ({ ok: true, json: async () => body });
            if (url.endsWith('/orders') && opts.method === 'POST') return ok({ id: `order_${STAMP}_${n += 1}` });
            const m = url.match(/\/orders\/([^/]+)\/payments$/);
            if (m) return ok({ items: paidOrders.has(m[1]) ? [{ id: `pay_${m[1]}`, status: 'captured' }] : [] });
            return { ok: false, json: async () => ({ error: { description: 'unknown' } }) };
        });
    });
    after(async () => {
        fees.setFetch(null);
        await fees.EntryPayment.deleteMany({ userId: { $in: made.users.map((u) => u._id) } });
    });
    const sign = (orderId, paymentId) => crypto.createHmac('sha256', 'test_secret').update(`${orderId}|${paymentId}`).digest('hex');

    test('set by the admin; owed once approved; no code and no seat until paid; recorded for the admin', async () => {
        const r = await boss('POST', '/admin', { name: `Fee Cup ${STAMP}`, game: 'brainsprint', startsAt: inDays(5), registrationDeadline: inDays(4), playersPerTeam: 1, maxTeams: 4, open: true, entryFee: { enabled: true, amount: 100 } });
        assert.equal(r.status, 201, JSON.stringify(r.body));
        id = r.body.competition.id;
        assert.deepEqual(r.body.competition.entryFee, { enabled: true, amount: 100 });
        for (const c of colleges) await c.call('PUT', `/org/${id}/team`, { coordinatorPhone: '9876543210', teamName: `${c.org.name.split(' ')[0]} Fee`, players: [String(c.player.user._id)] });
        for (const t of (await boss('GET', `/admin/${id}`)).body.teams) await boss('PUT', `/admin/${id}/teams/${t.id}`, { status: 'approved' });
        const [a, b] = colleges.map((c) => c.player);
        assert.deepEqual((await a.call('GET', `/${id}`)).body.myPayment, { amount: 100, paid: false });
        assert.ok((await a.call('GET', '/alerts')).body.alerts.some((x) => x.kind === 'payment' && x.competitionId === id), 'a pop-up to pay');

        const order = (await a.call('POST', `/${id}/pay`)).body;
        assert.equal(order.paid, false);
        assert.equal(order.amount, 10000, 'in paise');
        assert.equal(order.keyId, 'rzp_test_key');
        assert.equal((await a.call('POST', `/${id}/pay/verify`, { razorpay_order_id: order.orderId, razorpay_payment_id: 'pay_x', razorpay_signature: 'forged' })).status, 400, 'a forged signature is refused');
        assert.equal((await a.call('GET', `/${id}`)).body.myPayment.paid, false);
        const v = await a.call('POST', `/${id}/pay/verify`, { razorpay_order_id: order.orderId, razorpay_payment_id: 'pay_1', razorpay_signature: sign(order.orderId, 'pay_1') });
        assert.equal(v.status, 200, JSON.stringify(v.body));
        assert.deepEqual((await a.call('GET', `/${id}`)).body.myPayment, { amount: 100, paid: true });
        assert.equal((await fees.EntryPayment.findOne({ orderId: order.orderId }).lean()).paymentId, 'pay_1', 'recorded');

        // The browser closed before confirming: paying again finds it paid on Razorpay.
        const orderB = (await b.call('POST', `/${id}/pay`)).body;
        paidOrders.add(orderB.orderId);
        assert.deepEqual((await b.call('POST', `/${id}/pay`)).body, { paid: true }, 'not charged twice');

        const players = (await boss('GET', `/admin/${id}`)).body.teams.flatMap((t) => t.players);
        assert.ok(players.every((p) => p.paid), 'the admin sees both paid');
    });

    test('no code and no seat until paid', async () => {
        const r = await boss('POST', '/admin', { name: `Fee Cup 2 ${STAMP}`, game: 'rapidfire', startsAt: inDays(5), registrationDeadline: inDays(4), playersPerTeam: 1, maxTeams: 4, open: true, entryFee: { enabled: true, amount: 50 } });
        const id2 = r.body.competition.id;
        for (const c of colleges) await c.call('PUT', `/org/${id2}/team`, { coordinatorPhone: '9876543210', teamName: `${c.org.name.split(' ')[0]} Fee2`, players: [String(c.player.user._id)] });
        for (const t of (await boss('GET', `/admin/${id2}`)).body.teams) await boss('PUT', `/admin/${id2}/teams/${t.id}`, { status: 'approved' });
        assert.equal((await boss('POST', `/admin/${id2}/start-now`)).status, 200);
        const b = colleges[1].player;
        const page = (await b.call('GET', `/${id2}`)).body.myMatch;
        assert.equal(page.code, null, 'not paid: no code');
        const seat = (await PlayGame.findById(page.gameId).lean()).seats.find((s) => String(s.userId) === String(b.user._id));
        assert.equal((await b.call('POST', `/play/${page.gameId}/join`, { code: seat.code })).status, 402, 'not paid: cannot join even with the code');
    });
});

describe('without Razorpay keys: a test payment, recorded the same way', () => {
    const fees = require('../../src/competitions/services/entryFee');
    test('order, confirm, paid (marked test)', async () => {
        const keep = { id: process.env.RAZORPAY_KEY_ID, secret: process.env.RAZORPAY_KEY_SECRET };
        delete process.env.RAZORPAY_KEY_ID; delete process.env.RAZORPAY_KEY_SECRET;
        try {
            const r = await boss('POST', '/admin', { name: `Test Pay ${STAMP}`, game: 'codeclash', startsAt: inDays(5), registrationDeadline: inDays(4), playersPerTeam: 1, maxTeams: 4, open: true, entryFee: { enabled: true, amount: 10 } });
            const id = r.body.competition.id;
            const c = colleges[0];
            await c.call('PUT', `/org/${id}/team`, { coordinatorPhone: '9876543210', teamName: `${c.org.name.split(' ')[0]} TP`, players: [String(c.player.user._id)] });
            for (const t of (await boss('GET', `/admin/${id}`)).body.teams) await boss('PUT', `/admin/${id}/teams/${t.id}`, { status: 'approved' });
            const order = (await c.player.call('POST', `/${id}/pay`)).body;
            assert.equal(order.test, true);
            const v = await c.player.call('POST', `/${id}/pay/verify`, { razorpay_order_id: order.orderId, razorpay_payment_id: 'test_pay_1', razorpay_signature: 'test' });
            assert.equal(v.status, 200, JSON.stringify(v.body));
            assert.equal((await c.player.call('GET', `/${id}`)).body.myPayment.paid, true);
            assert.equal((await fees.EntryPayment.findOne({ orderId: order.orderId }).lean()).mode, 'test');
        } finally {
            if (keep.id) process.env.RAZORPAY_KEY_ID = keep.id;
            if (keep.secret) process.env.RAZORPAY_KEY_SECRET = keep.secret;
            await fees.EntryPayment.deleteMany({ userId: { $in: made.users.map((u) => u._id) } });
        }
    });
});
