/**
 * The Final Vault, a Group Brain escape-room race (asked 2026-10-27): five
 * temple chambers, the same five puzzles for everyone in the same order
 * (banks/vault.js), against one shared clock. A right answer opens the next
 * chamber; a wrong one adds a time penalty and jams the mechanism for a
 * moment (the same for everyone), and is never fatal.
 *
 * The winner is whoever opens the vault first, by their time plus their
 * penalties — the server's clock, not the player's. Points: 2000 for opening
 * the vault and 2 a second to spare (after penalties); short of it, 200 a
 * chamber and 10 off each mistake. The rules otherwise are stageCore.js's:
 * every answer names its chamber, so a double click cannot count twice.
 */
const { GameError } = require('./contract');
const { makeStageEngine } = require('./stageCore');
const { vaultStages, checkAnswer } = require('./banks/vault');

const SECONDS = { easy: 480, medium: 480, hard: 480 };   // 8 minutes at every level (asked 2026-10-28)
const PENALTY = { easy: 15, medium: 20, hard: 30 };   // seconds a wrong answer adds
const JAM_MS = 2500;                                  // how long a wrong answer jams the mechanism

const effectiveMs = (s, p) => (p.doneMs ?? s.runMs) + p.penaltyMs;

module.exports = makeStageEngine({
    id: 'finalvault',
    label: 'The Final Vault',
    emoji: '🏛️',
    summary: 'Five temple chambers, the same puzzles for everyone: open the treasure vault first.',
    setup: (o, rng) => ({ stages: vaultStages(rng, o.difficulty), seconds: SECONDS[o.difficulty], penalty: PENALTY[o.difficulty] }),
    start: () => ({ stage: 0, penaltyMs: 0, jamUntil: 0 }),
    actions: {
        solve: (s, seat, action, ctx) => {
            const p = s.progress[seat];
            if (ctx.now < p.jamUntil) throw new GameError('The mechanism is still resetting — try again in a moment.');
            const st = s.shared.stages[p.stage];
            if (checkAnswer(st, action.value)) {
                p.stage += 1;
                s.message = `${s.seats[seat].name} solved ${st.title}.`;
                if (p.stage >= s.shared.stages.length) { p.done = true; s.message = `${s.seats[seat].name} opened the vault!`; }
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
        return {
            total: s.shared.stages.length, penalty: s.shared.penalty, jamMs: JAM_MS,
            titles: s.shared.stages.map((x) => x.title),
            me: p && { stage: p.stage, mistakes: p.mistakes, penaltyMs: p.penaltyMs, jamUntil: p.jamUntil, done: p.done, failed: p.failed, doneMs: p.doneMs },
            current: st && { index: p.stage, title: st.title, kind: st.kind, ...st.pub },
            // What clearing each chamber so far has given you.
            clues: p ? s.shared.stages.slice(0, p.stage).map((x) => x.clue).filter(Boolean) : [],
            // Everyone's time, once they are through (penalties included).
            times: s.progress.map((x) => (x.done ? effectiveMs(s, x) : null)),
            review: over ? s.shared.stages.map((x) => ({ title: x.title, solution: x.solution })) : null
        };
    },
    progressOf: (p, s) => ({ at: p.stage, of: s.shared.stages.length }),
    score: (s, i) => {
        const p = s.progress[i];
        if (p.done) return 2000 + 2 * Math.max(0, Math.round((s.runMs - effectiveMs(s, p)) / 1000));
        return Math.max(0, p.stage * 200 - p.mistakes * 10);
    }
});
