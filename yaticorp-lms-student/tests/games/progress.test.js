import test from 'node:test';
import assert from 'node:assert/strict';

const A = await import('../../src/career/components/games/achievements.js');
const { GAME_ZONES, placeOf } = await import('../../src/career/components/games/zones.js');

const DAY = 86400000;
const NOW = new Date(2026, 10, 13, 15, 0).getTime();
const s = (at, over = {}) => ({ at, stage: 'medium', stars: 2, passed: true, correct: 8, wrong: 2, hints: 0, ms: 30000, perf: 0.7, accuracy: 80, ...over });

test('daily picks are the same all day, three distinct playable games, mixing skills', () => {
    for (const [zone, band] of [['young', 'foundation'], ['young', 'developing'], ['smart', 'intermediate'], ['smart', 'analytical'], ['master', 'advanced']]) {
        const a = A.dailyPicks({ zone, band, studentId: 'stu1', date: '2026-11-13' });
        const b = A.dailyPicks({ zone, band, studentId: 'stu1', date: '2026-11-13' });
        assert.deepEqual(a, b, 'deterministic');
        assert.equal(a.length, 3);
        assert.equal(new Set(a).size, 3);
        for (const id of a) { const p = placeOf(id, zone, band); assert.ok(p && !p.locked, `${id} playable in ${zone}/${band}`); }
        assert.equal(new Set(a.map((id) => GAME_ZONES[id].skill)).size, 3, 'three different skills');
    }
    // Locked challenges never appear for a band below them.
    for (let d = 1; d <= 28; d += 1) {
        const picks = A.dailyPicks({ zone: 'smart', band: 'intermediate', studentId: 'x', date: `2026-02-${String(d).padStart(2, '0')}` });
        assert.ok(!picks.includes('probability-lab') && !picks.includes('algorithm-builder'));
    }
    // Different days or students vary.
    const days = new Set(Array.from({ length: 10 }, (_, i) => A.dailyPicks({ zone: 'smart', band: 'analytical', studentId: 'stu1', date: `2026-11-${10 + i}` }).join()));
    assert.ok(days.size > 1);
});

test('daily progress ticks a game played today, and the streak counts whole days done', () => {
    const date = A.dayKeyOf(NOW);
    const picks = A.dailyPicks({ zone: 'smart', band: 'intermediate', studentId: 'k', date });
    const all = { [picks[0]]: { stage: 'medium', sessions: [s(NOW - 1000)] } };
    assert.deepEqual(A.dailyProgress(picks, all, date).map((p) => p.done), [true, false, false]);
    // Two full days in a row (today and yesterday).
    const full = {};
    for (const off of [0, 1]) {
        const dd = A.dayKeyOf(NOW - off * DAY);
        for (const id of A.dailyPicks({ zone: 'smart', band: 'intermediate', studentId: 'k', date: dd })) {
            (full[id] ||= { stage: 'medium', sessions: [] }).sessions.push(s(NOW - off * DAY));
        }
    }
    assert.equal(A.dailyStreak(full, { zone: 'smart', band: 'intermediate', studentId: 'k', now: NOW }), 2);
    assert.equal(A.dailyStreak({}, { zone: 'smart', band: 'intermediate', studentId: 'k', now: NOW }), 0);
});

test('improvement: this week and month against the ones before', () => {
    const all = { 'math-sprint': { sessions: [s(NOW - 10 * DAY, { perf: 0.5, accuracy: 60 }), s(NOW - 9 * DAY, { perf: 0.5, accuracy: 70 }), s(NOW - 2 * DAY, { perf: 0.8, accuracy: 90 }), s(NOW - DAY, { perf: 0.7, accuracy: 80 })] } };
    const { week, month } = A.improvement(all, NOW);
    assert.equal(week.score, 75);
    assert.equal(week.previousScore, 50);
    assert.equal(week.change, 25);
    assert.equal(week.accuracy, 85);
    assert.equal(week.previousAccuracy, 65);
    assert.equal(month.sessions, 4);
    assert.equal(month.change, null, 'nothing in the month before');
});

test('the last round against the average of the three before', () => {
    const sessions = [s(1, { accuracy: 10 }), s(2, { accuracy: 60 }), s(3, { accuracy: 70 }), s(4, { accuracy: 80 }), s(5, { accuracy: 90 })];
    assert.deepEqual(A.vsRecent(sessions), { metric: 'accuracy', current: 90, average: 70, change: 20 });
    assert.equal(A.vsRecent([s(1)]), null);
    const noAcc = [s(1, { accuracy: null, perf: 0.4 }), s(2, { accuracy: null, perf: 0.6 })];
    assert.deepEqual(A.vsRecent(noAcc), { metric: 'performance', current: 60, average: 40, change: 20 });
    // The previous best: the stored best, or (new best) the best of the earlier rounds.
    const g = { sessions: [s(1, { score: 40 }), s(2, { score: 70 }), s(3, { score: 90 })], best: { mark: 90, score: 90 } };
    assert.equal(A.previousBest(g, true).score, 70);
    assert.equal(A.previousBest(g, false).score, 90);
});

test('next challenge: an unlocked higher-zone game first, else a weaker game of the same skill, else a new one', () => {
    const strong = { stage: 'expert', sessions: Array.from({ length: 5 }, (_, i) => s(NOW - i, { perf: 0.95 })) };
    // 2026-11-14: strong results never open a higher section — the next challenge stays in the student's own.
    const up = A.recommendNext({ 'memory-match': strong }, 'memory-match', 'young', 'developing');
    assert.ok(up && up.reason !== 'unlocked' && up.zone === 'young');

    const all = { 'memory-match': { stage: 'medium', sessions: [s(1, { perf: 0.8 })] }, 'number-recall': { stage: 'medium', sessions: [s(1, { perf: 0.3 })] }, 'sequence-recall': { stage: 'medium', sessions: [s(1, { perf: 0.5 })] } };
    const weak = A.recommendNext(all, 'memory-match', 'smart', 'intermediate');
    assert.deepEqual([weak.gameId, weak.reason], ['number-recall', 'weaker']);

    const fresh = A.recommendNext({ 'memory-match': { stage: 'medium', sessions: [s(1)] } }, 'memory-match', 'smart', 'intermediate');
    assert.equal(fresh.reason, 'new');
    assert.equal(GAME_ZONES[fresh.gameId].skill, 'memory');
    assert.notEqual(fresh.gameId, 'memory-match');

    // Never a game locked at the band.
    for (const id of Object.keys(GAME_ZONES)) {
        const r = A.recommendNext({}, id, 'smart', 'intermediate');
        if (r && r.reason !== 'unlocked') { const p = placeOf(r.gameId, 'smart', 'intermediate'); assert.ok(p && !p.locked, `${id} → ${r.gameId}`); }
    }
    assert.equal(A.recommendNext({}, 'no-such-game', 'smart', 'intermediate'), null);
});

test('achievements come from the records and the ladder', () => {
    const none = A.achievements({}, { zone: 'smart', now: NOW });
    assert.equal(none.length, 10);
    assert.ok(none.every((b) => !b.earned));

    const ids = ['memory-match', 'mini-sudoku', 'word-scramble', 'math-sprint'];
    const all = {};
    ids.forEach((id, k) => { all[id] = { stage: k === 0 ? 'expert' : 'medium', sessions: Array.from({ length: 2 }, (_, i) => s(NOW - (k * 2 + i) * DAY, { accuracy: 95, stars: 3 })) }; });
    const got = Object.fromEntries(A.achievements(all, { zone: 'smart', levelsCleared: 55, now: NOW }).map((b) => [b.key, b.earned]));
    assert.equal(got['first-perfect'], true);
    assert.equal(got['levels-10'], true);
    assert.equal(got['levels-50'], true);
    assert.equal(got['levels-100'], false);
    assert.equal(got['streak-7'], true, 'eight days in a row');
    assert.equal(got['sharp-5'], true);
    assert.equal(got['all-categories'], true);
    assert.equal(got.expert, true);

    const rising = { 'math-sprint': { stage: 'medium', sessions: [0.3, 0.35, 0.6, 0.65].map((perf, i) => s(NOW - (10 - i) * DAY, { perf })) } };
    assert.equal(A.bestSkillGain(rising, NOW).gain, 30);
    assert.equal(A.achievements(rising, { zone: 'smart', now: NOW }).find((b) => b.key === 'skill-gain').earned, true);

    assert.equal(A.achievements({}, { zone: 'young', threeStarLevels: 10, now: NOW }).find((b) => b.key === 'stars-10').earned, true);
    assert.equal(A.achievements({}, { zone: 'young', threeStarLevels: 9, now: NOW }).find((b) => b.key === 'stars-10').earned, false);
});

test('play streak counts days in a row up to today or yesterday', () => {
    const all = { 'math-sprint': { sessions: [s(NOW - DAY), s(NOW - 2 * DAY), s(NOW - 4 * DAY)] } };
    assert.equal(A.playStreak(all, NOW), 2);
    assert.equal(A.playStreak({}, NOW), 0);
});
