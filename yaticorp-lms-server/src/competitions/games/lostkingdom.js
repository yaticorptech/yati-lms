/**
 * The Lost Kingdom, a Group Brain race (asked 2026-10-28, as The Final Vault
 * is): five trials on the way to the treasure of Aurelia — The Broken Path
 * (number series), The Temple of Knowledge (general knowledge), The Bridge of
 * Logic, The Code Mechanism (number panels) and The Final Combination (five
 * symbols in order, from clues collected on the way). The trials are made
 * fresh for every room (kingdom/generator.js) and are the same for everyone
 * in it, against one shared clock.
 *
 * A right answer opens the next trial and gives a relic and a clue for the
 * final gate. A wrong one adds a time penalty and jams the mechanism for a
 * moment (the same for everyone). (Hints are not shown on the screen, asked
 * 2026-10-28; the explanation comes with the review at the end.) The winner is whoever reaches the treasure first,
 * by their time plus penalties. Points as The Final Vault's: 2000 for the
 * treasure and 2 a second to spare; short of it, 200 a trial, 10 off a mistake.
 */
const { GameError } = require('./contract');
const { makeStageEngine } = require('./stageCore');
const { expedition, checkAnswer } = require('../kingdom/generator');

const SECONDS = { easy: 480, medium: 480, hard: 480 };   // 8 minutes at every level (asked 2026-10-28)
const PENALTY = { easy: 15, medium: 20, hard: 30 };    // seconds a wrong answer adds
const JAM_MS = 2500;
const LEVEL = { easy: 'school', medium: 'school', hard: 'college' };

const effectiveMs = (s, p) => (p.doneMs ?? s.runMs) + p.penaltyMs;

module.exports = makeStageEngine({
    id: 'lostkingdom',
    label: 'The Lost Kingdom',
    emoji: '🧭',
    summary: 'Five trials to the treasure of Aurelia — numbers, knowledge and logic, new every game. Reach it first.',
    setup: (o, rng) => ({ stages: expedition(rng, { level: LEVEL[o.difficulty] || 'school' }), seconds: SECONDS[o.difficulty], penalty: PENALTY[o.difficulty] }),
    start: () => ({ stage: 0, penaltyMs: 0, jamUntil: 0 }),
    actions: {
        solve: (s, seat, action, ctx) => {
            const p = s.progress[seat];
            if (ctx.now < p.jamUntil) throw new GameError('The mechanism is still resetting — try again in a moment.');
            const st = s.shared.stages[p.stage];
            if (checkAnswer(st, action.value)) {
                p.stage += 1;
                s.message = `${s.seats[seat].name} solved ${st.title}.`;
                if (p.stage >= s.shared.stages.length) { p.done = true; s.message = `${s.seats[seat].name} found the treasure of Aurelia!`; }
            } else {
                p.mistakes += 1;
                p.penaltyMs += s.shared.penalty * 1000;
                p.jamUntil = ctx.now + JAM_MS;
            }
        }
    },
    publicOf: (s, you, over) => {
        const p = you != null ? s.progress[you] : null;
        const st = p && !over && p.stage < s.shared.stages.length ? s.shared.stages[p.stage] : null;
        const passed = p ? s.shared.stages.slice(0, p.stage) : [];
        return {
            total: s.shared.stages.length, penalty: s.shared.penalty, jamMs: JAM_MS,
            titles: s.shared.stages.map((x) => x.title),
            regions: s.shared.stages.map((x) => x.region),
            me: p && { stage: p.stage, mistakes: p.mistakes, penaltyMs: p.penaltyMs, jamUntil: p.jamUntil, done: p.done, failed: p.failed, doneMs: p.doneMs },
            current: st && {
                index: p.stage, title: st.title, region: st.region, kind: st.kind, prompt: st.prompt, data: st.data, options: st.options, category: st.category || null
            },
            // What the trials behind me gave: a relic each, a clue for the final gate, and why the answer was right.
            journal: passed.map((x, i) => ({ index: i, title: x.title, clue: x.clue, relic: x.relic, explain: x.explain, source: x.source || null })),
            times: s.progress.map((x) => (x.done ? effectiveMs(s, x) : null)),
            review: over ? s.shared.stages.map((x) => ({ title: x.title, prompt: x.prompt, explain: x.explain, source: x.source || null })) : null
        };
    },
    progressOf: (p, s) => ({ at: p.stage, of: s.shared.stages.length }),
    score: (s, i) => {
        const p = s.progress[i];
        if (p.done) return 2000 + 2 * Math.max(0, Math.round((s.runMs - effectiveMs(s, p)) / 1000));
        return Math.max(0, p.stage * 200 - p.mistakes * 10);
    }
});
