/**
 * The group games made for the 84-game catalogue (games/catalogquiz.js, banks/catalogMakers.js, 2026-11-14): over many
 * seeds, at every difficulty and in every zone, each question is well formed (2–4 different options, the answer one of
 * them) and has exactly one right option — worked out again here from the question's own facts, not trusted from the
 * maker. Also: made through the engine as a room makes it, with the answer kept off the view until the reveal.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { engine, ROOM_GAMES } = require('../../src/competitions/games');
const { CATALOG_QUIZ } = require('../../src/competitions/games/catalogquiz');
const { MAKERS, check } = require('../../src/competitions/games/banks/catalogMakers');
const { GROUP_ZONES, ZONE_DIFFICULTY } = require('../../src/competitions/games/zones');

// mulberry32: a seeded generator with a long period (rooms use crypto randomness; tests need repeatable seeds).
const rngOf = (seed) => () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const SEEDS = 60;
const PER_SEED = 12;
const numOf = (o) => Number(String(o).replace('−', '-'));
const fracOf = (o) => { const [n, d = '1'] = String(o).split('/'); return Number(n) / Number(d); };
const low = (s) => String(s).toLowerCase();

/** Which options are right, worked out from the facts alone. */
const RIGHT = {
    animalPairs: (q) => {
        const f = q.facts;
        if (f.dir === 'forward') {
            const animal = check.ANIMALS.find((a) => a.name === f.animal);
            return q.options.map((o) => o === check.partnerOf(animal, f.pair));
        }
        // Backwards: the animal whose partner it is; no other option may even be linked to the word.
        return q.options.map((o) => {
            const a = check.ANIMALS.find((x) => o.endsWith(` ${x.name}`));
            assert.ok(a, o);
            if (check.partnerOf(a, f.pair) === f.word) return true;
            assert.ok(!check.animalFacts(a).has(low(f.word)), `${a.name} could claim ${f.word}`);
            return false;
        });
    },
    rhymes: (q) => {
        const f = q.facts;
        const fam = f.words.map(check.familyOf);
        assert.ok(fam.every((x) => x !== null));
        if (f.mode === 'with') return fam.map((x) => x === check.familyOf(f.target));
        // Odd one out: the one whose family no other option shares.
        return fam.map((x, i) => fam.filter((y, j) => j !== i && y === x).length === 0);
    },
    numberHop: (q) => {
        const { mode, a, b, step } = q.facts;
        const land = { add: a + b, sub: a - b, after: a + 1, before: a - 1, tens: a + b, skip: a + step * b, skip2: a + step * b }[mode];
        return q.options.map((o) => numOf(o) === land);
    },
    missingNumber: (q) => q.options.map((o) => {
        const seq = q.facts.seq.map((x) => (x === '?' ? numOf(o) : Number(x)));
        const diffs = seq.slice(1).map((v, i) => v - seq[i]);
        return diffs.every((x) => x === diffs[0]);
    }),
    analogies: (q) => q.options.map((o) => o === q.facts.d),
    equationRush: (q) => q.options.map((o) => {
        const x = numOf(o);
        return Math.abs(check.evalTree(q.facts.left, x) - check.evalTree(q.facts.right, x)) < 1e-9;
    }),
    ratioRelay: (q) => q.options.map((o) => numOf(o) === check.ratioAnswer(q.facts)),
    cipherLab: (q) => q.options.map((o) => o === check.decodeCipher(q.facts)),
    probability: (q) => {
        // Count the equally likely outcomes; outcomes where the "given" did not happen do not count.
        let yes = 0; let all = 0;
        for (const o of check.spaceOf(q.facts.space)) {
            const j = q.facts.judge(o);
            if (j === null) continue;
            all += 1; if (j) yes += 1;
        }
        return q.options.map((o) => Math.abs(fracOf(o) - yes / all) < 1e-12);
    },
    quantArena: (q) => {
        const f = q.facts;
        let rel;
        if (f.kind === 'qc') {
            const t = check.VAR_TEMPLATES[f.template];
            const [, cond, expect] = t.cases[f.caseIndex];
            // A denser grid than the maker samples, and the textbook answer, must agree.
            const dense = t.ints ? Array.from({ length: 41 }, (_, i) => i - 20) : [...new Set([...Array.from({ length: 81 }, (_, i) => (i - 40) / 4), 0.01, 0.2, 0.7, 0.99, 1.01, 7, 50, 1000, -0.01, -0.7, -7, -1000])];
            rel = check.decideBySampling(check.assignments(t.vars, dense, cond), t.fa, t.fb);
            assert.equal(rel, expect, `${t.a} vs ${t.b} given ${t.cases[f.caseIndex][0]}`);
        } else if (f.range) {
            const [lo, hi, m] = f.range; // c strictly between lo and hi, against m
            rel = m >= hi ? 'B' : m <= lo ? 'A' : 'cannot';
        } else {
            const [a, b] = f.check;
            rel = Math.abs(a - b) < 1e-9 ? 'equal' : a > b ? 'A' : 'B';
        }
        return check.QC_ID.map((id) => id === rel);
    },
    decisions: (q) => {
        const f = q.facts;
        const score = f.plans.map((plan) => (f.rule === 'ev' ? plan.reduce((s, [p, v]) => s + (p / 100) * v, 0) : Math.min(...plan.map(([, v]) => v))));
        assert.ok(f.plans.every((plan) => plan.reduce((s, [p]) => s + p, 0) === 100), 'probabilities add to 100%');
        const top = Math.max(...score);
        return q.options.map((o) => score[f.actions.indexOf(o)] === top);
    }
};

describe('Catalogue group games: questions', () => {
    for (const [name, maker] of Object.entries(MAKERS)) {
        test(`${name}: well formed, exactly one right option, at every level`, () => {
            for (let seed = 1; seed <= SEEDS; seed += 1) {
                const rng = rngOf(seed * 7919);
                for (const d of [1, 2, 3]) {
                    for (const zone of [null, 'young', 'smart', 'master']) {
                        for (let n = 0; n < PER_SEED / 4; n += 1) {
                            const q = maker(rng, d, zone);
                            assert.ok(typeof q.prompt === 'string' && q.prompt.length > 5, `${name}: prompt`);
                            assert.ok(q.options.length >= 2 && q.options.length <= 4, `${name}: ${q.options.length} options`);
                            assert.ok(q.options.every((o) => typeof o === 'string' && o.length), `${name}: options are text`);
                            assert.equal(new Set(q.options).size, q.options.length, `${name}: options repeat: ${q.options}`);
                            assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length, `${name}: answer index`);
                            const right = RIGHT[name](q);
                            assert.equal(right.filter(Boolean).length, 1, `${name} (d${d}): ${q.prompt} ${q.code || ''} → ${q.options} (${right})`);
                            assert.equal(right.indexOf(true), q.answer, `${name}: the marked answer is the right one: ${q.prompt}`);
                            if (q.visual) assert.ok(['symbols', 'digits'].includes(q.visual.kind), 'a picture the quiz table draws');
                        }
                    }
                }
            }
        });
    }

    test('Young Thinkers questions: no ×, ÷ or numbers past 20 at level 1', () => {
        const rng = rngOf(42);
        for (const name of ['animalPairs', 'rhymes', 'numberHop', 'missingNumber']) {
            for (let i = 0; i < 400; i += 1) {
                const q = MAKERS[name](rng, 1, 'young');
                for (const t of [q.prompt, ...q.options]) {
                    assert.ok(!/[×÷]/.test(t), `${name}: ${t}`);
                    for (const n of (t.match(/\d+/g) || []).map(Number)) assert.ok(n <= 20, `${name}: ${n} in ${t}`);
                }
            }
        }
    });
});

describe('Catalogue group games: rooms', () => {
    const SEATS = [{ name: 'A', side: 0 }, { name: 'B', side: 1 }, { name: 'C', side: 2 }];
    // 2026-11-17: only Equation Rush is still offered in a zone; the others keep their engines for past rooms.
    test('every one is a room game in at most one zone', () => {
        for (const id of CATALOG_QUIZ) {
            assert.ok(ROOM_GAMES.includes(id), id);
            assert.ok((GROUP_ZONES[id] || []).length <= 1, `${id}: ${GROUP_ZONES[id]}`);
        }
    });

    for (const id of CATALOG_QUIZ) {
        test(`${id}: a room deals a full game, the same for everyone, and keeps the answer back`, () => {
            const [zone = null] = GROUP_ZONES[id] || [];
            for (const difficulty of ['easy', 'medium', 'hard']) {
                for (const z of [zone, null]) {
                    const opts = z ? { zone: z, difficulty: ZONE_DIFFICULTY[z] } : { difficulty };
                    const a = engine(id).create(SEATS, { ...opts, questionCount: 20 }, { rng: rngOf(9), now: 0 });
                    const b = engine(id).create(SEATS, { ...opts, questionCount: 20 }, { rng: rngOf(9), now: 0 });
                    assert.equal(a.questions.length, 20, `${id}: 20 questions`);
                    assert.deepEqual(a.questions, b.questions);
                    for (const q of a.questions) {
                        assert.equal(new Set(q.options).size, q.options.length);
                        assert.ok(q.answer >= 0 && q.answer < q.options.length);
                        assert.equal(q.facts, undefined, 'facts stay on the server, out of the game');
                    }
                    const v = engine(id).view(engine(id).tick(a, { now: a.phaseEndsAt, rng: rngOf(1) }) || a, 0);
                    assert.ok(!v.answer, 'no answer in the view while a question is open');
                }
            }
        });
    }

    test('answers are scored on the server: right +100, wrong −20', () => {
        const e = engine('equationrush');
        let s = e.create(SEATS.slice(0, 2), { zone: 'smart', difficulty: 'medium' }, { rng: rngOf(3), now: 0 });
        s = e.tick(s, { now: s.phaseEndsAt, rng: rngOf(1) }) || s;
        const q = s.questions[s.index];
        s = e.act(s, 0, { type: 'answer', choice: q.answer }, { now: s.phaseStartedAt + 1000, rng: rngOf(1) });
        s = e.act(s, 1, { type: 'answer', choice: (q.answer + 1) % q.options.length }, { now: s.phaseStartedAt + 1500, rng: rngOf(1) });
        assert.deepEqual(s.scores, [100, -20]);
    });
});
