/**
 * WORDCRAFT on the server (2026-11-20): the level is dealt here (Tongue Twister + two different others), every
 * challenge is re-scored here once and in order, the twister needs five correct in a row, a level unlocks the next only
 * when cleared, and the generic progress save cannot claim more WORDCRAFT stars than the server verified.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { connect, makeUser, startApp, cleanup } = require('../helpers');
const { FILES, FROM, TO } = require('../../scripts/syncWordcraft');

let app; const users = [];
before(async () => {
    await connect();
    app = startApp({ mount: '/api/career', router: require('../../src/career') });
});
after(async () => { await cleanup(users, app.server); });
const student = async (label) => { const s = await makeUser(label); users.push(s.user); return { ...s, api: app.call(s.token) }; };
const Profile = () => require('../../src/career/models/WordcraftProfile');

/** A good answer for a challenge (what a strong student would say). */
const goodAnswer = (ch) => {
    if (ch.kind === 'twister') return { attempts: [{ spoken: Array(5).fill(ch.item.text).join(' '), secs: Math.min(ch.seconds, 10) }] };
    const keys = (ch.item.keys || []).join(' ');
    if (ch.kind === 'caption') return { text: `Breaking news: ${keys.split(' ').slice(0, 3).join(' ')} like you have never seen before!` };
    if (ch.kind === 'plot') return { text: `${ch.item.line} Suddenly ${ch.twists.map((t) => `a ${t.word} appeared because everything changed`).join(', then ')} and meanwhile the hero finally understood, however later everyone celebrated together remarkably.`, spokeFor: 50, pauses: 0 };
    if (ch.kind === 'sell') return { text: `Imagine ${ch.item.name.toLowerCase()} in your life! ${keys}. You deserve the best, guaranteed, exclusive offer today only — grab yours now. Have you ever wanted something so unique? ${keys}`, spokeFor: ch.seconds - 2, pauses: 0 };
    return { text: `${keys} ${keys} and it is remarkable, essential, wonderful, fascinating, considerable, particularly important, absolutely meaningful everyday experiences ${keys}`, spokeFor: ch.seconds - 2, pauses: 0 };
};

describe('the shared game logic', () => {
    test('the server runs an exact copy of the game’s WORDCRAFT files (run scripts/syncWordcraft.js after changing them)', () => {
        if (!fs.existsSync(FROM)) return; // the student app is not checked out next to the server
        for (const f of FILES) assert.equal(fs.readFileSync(path.join(TO, f), 'utf8'), fs.readFileSync(path.join(FROM, f), 'utf8'), `${f} differs`);
    });

    test('every dealt level: the twister once, two different others; the pairs rotate fairly', async () => {
        const L = await require('../../src/career/wordcraft/service').lib();
        let state = L.freshDeal(); const rng = L.seeded(42); const count = {};
        for (let i = 0; i < 200; i += 1) {
            const r = L.dealCombo(rng, state); state = r.state;
            assert.equal(r.combo.length, 3);
            assert.equal(r.combo.filter((k) => k === 'twister').length, 1);
            const two = r.combo.filter((k) => k !== 'twister');
            assert.equal(new Set(two).size, 2);
            two.forEach((k) => { count[k] = (count[k] || 0) + 1; });
        }
        assert.deepEqual(Object.values(count), [80, 80, 80, 80, 80]);
    });
});

describe('playing a level', () => {
    test('start deals three challenges with the twister, and resumes the same level', async () => {
        const { api } = await student('WcStart');
        const a = await api('POST', '/games/wordcraft/start', { level: 1 });
        assert.equal(a.status, 200);
        const { session } = a.body;
        assert.equal(session.level, 1);
        assert.equal(session.challenges.length, 3);
        assert.equal(session.challenges.filter((c) => c.kind === 'twister').length, 1);
        const b = await api('POST', '/games/wordcraft/start', { level: 1 });
        assert.equal(b.body.session.id, session.id, 'resumed');
        assert.equal(b.body.resumed, true);
    });

    test('a locked level cannot be played: the unlocked one is played instead', async () => {
        const { api } = await student('WcLocked');
        const r = await api('POST', '/games/wordcraft/start', { level: 9 });
        assert.equal(r.body.session.level, 1);
    });

    test('challenges go in order, once each; a repeat gets the stored result and counts nothing', async () => {
        const { api, user } = await student('WcOrder');
        const { session } = (await api('POST', '/games/wordcraft/start', { level: 1 })).body;
        const out = await api('POST', '/games/wordcraft/submit', { sessionId: session.id, index: 1, ...goodAnswer(session.challenges[1]) });
        assert.equal(out.status, 409, 'not in order');
        const first = await api('POST', '/games/wordcraft/submit', { sessionId: session.id, index: 0, ...goodAnswer(session.challenges[0]) });
        assert.equal(first.status, 200);
        const again = await api('POST', '/games/wordcraft/submit', { sessionId: session.id, index: 0, text: 'something else entirely', attempts: [] });
        assert.equal(again.body.duplicate, true);
        assert.equal(again.body.result.score, first.body.result.score);
        const [x, y] = await Promise.all([1, 2].map(() => api('POST', '/games/wordcraft/submit', { sessionId: session.id, index: 1, ...goodAnswer(session.challenges[1]) })));
        assert.equal([x, y].filter((r) => r.body.duplicate).length, 1, 'two at once: one counts');
        const p = await Profile().findOne({ userId: user._id }).lean();
        assert.equal(p.challengesCompleted, 2);
    });

    test('a score cannot be sent: it is worked out on the server from what was said', async () => {
        const { api } = await student('WcScore');
        const { session } = (await api('POST', '/games/wordcraft/submit', {}).then(() => api('POST', '/games/wordcraft/start', { level: 1 }))).body;
        const ch = session.challenges[0];
        const r = await api('POST', '/games/wordcraft/submit', { sessionId: session.id, index: 0, score: 100, ...(ch.kind === 'twister' ? { attempts: [{ spoken: 'nothing like it', secs: 2 }] } : { text: 'um' }) });
        assert.equal(r.status, 200);
        assert.ok(r.body.result.score < 60, `scored ${r.body.result.score}`);
    });

    test('the twister: five times in one go, two chances; a broken run does not count', async () => {
        const L = await require('../../src/career/wordcraft/service').lib();
        const ch = L.makeChallenges(L.seeded(1), ['twister', 'caption', 'sell'], 1, {})[0];
        const five = { spoken: Array(5).fill(ch.item.text).join(' '), secs: 5 };
        const four = { spoken: Array(4).fill(ch.item.text).join(' '), secs: 5 };
        assert.equal(L.replayTwister(ch, [five]).done, true);
        assert.equal(L.replayTwister(ch, [five]).score, 100);
        assert.equal(L.replayTwister(ch, [four, five]).score, 80, 'second chance');
        assert.equal(L.replayTwister(ch, [four, four, five]).done, false, 'only two chances');
        assert.equal(L.replayTwister(ch, [{ ...five, secs: ch.seconds + 30 }]).done, false, 'too slow');
    });

    test('a level without the twister done is finished but not cleared, and does not unlock the next', async () => {
        const { api, user } = await student('WcNoTwister');
        const { session } = (await api('POST', '/games/wordcraft/start', { level: 1 })).body;
        let last;
        for (const [i, ch] of session.challenges.entries()) {
            const body = ch.kind === 'twister' ? { attempts: [{ spoken: ch.item.text, secs: 2 }] } : goodAnswer(ch);
            last = await api('POST', '/games/wordcraft/submit', { sessionId: session.id, index: i, ...body });
            assert.equal(last.status, 200);
        }
        assert.equal(last.body.level.complete, true);
        assert.equal(last.body.level.twisterDone, false);
        assert.equal(last.body.level.cleared, false);
        assert.equal(last.body.level.stars, 0);
        const p = await Profile().findOne({ userId: user._id }).lean();
        assert.equal(p.unlocked, 1);
        assert.equal(p.active, null);
        assert.equal((await api('POST', '/games/wordcraft/start', { level: 2 })).body.session.level, 1);
    });

    test('a cleared level unlocks the next, records stats, and caps what the progress save may claim', async () => {
        const { api } = await student('WcClear');
        const { session } = (await api('POST', '/games/wordcraft/start', { level: 1 })).body;
        let last;
        for (const [i, ch] of session.challenges.entries()) last = await api('POST', '/games/wordcraft/submit', { sessionId: session.id, index: i, ...goodAnswer(ch) });
        assert.equal(last.body.level.twisterDone, true);
        assert.equal(last.body.level.cleared, true);
        assert.ok(last.body.level.stars >= 1);
        const st = last.body.stats;
        assert.equal(st.unlocked, 2);
        assert.equal(st.levelsCompleted, 1);
        assert.equal(st.challengesCompleted, 3);
        assert.equal(st.totalPoints, last.body.level.total);
        assert.equal(st.history.length, 1);
        assert.ok(st.skills.pronunciation.score > 0);
        // The same level again: it keeps the same three challenges, fresh content.
        const again = (await api('POST', '/games/wordcraft/start', { level: 1 })).body.session;
        assert.deepEqual(again.challenges.map((c) => c.kind), session.challenges.map((c) => c.kind));
        assert.equal((await api('POST', '/games/wordcraft/start', { level: 2 })).body.session.level, 2);
        // The generic save: never more stars than the server verified.
        await api('POST', '/games/time', { seconds: 20 });
        const save = await api('POST', '/games/progress', { gameId: 'wordcraft', level: 2, stars: { 1: 3, 2: 3 } });
        assert.equal(save.status, 200);
        assert.equal(save.body.stars['1'] || 0, Math.min(3, last.body.level.stars));
        assert.ok(!save.body.stars['2'], 'level 2 not played');
    });

    test('bad input is refused', async () => {
        const { api } = await student('WcBad');
        const { session } = (await api('POST', '/games/wordcraft/start', { level: 1 })).body;
        const ch = session.challenges[0];
        const r = ch.kind === 'twister'
            ? await api('POST', '/games/wordcraft/submit', { sessionId: session.id, index: 0, attempts: Array.from({ length: 21 }, () => ({ spoken: 'x', secs: 1 })) })
            : await api('POST', '/games/wordcraft/submit', { sessionId: session.id, index: 0, text: 'x'.repeat(7000) });
        assert.equal(r.status, 400);
        assert.equal((await api('POST', '/games/wordcraft/submit', { sessionId: 'nope', index: 0, text: 'hi' })).status, 409);
        assert.equal((await app.call(null)('POST', '/games/wordcraft/start', { level: 1 })).status, 401);
    });
});
