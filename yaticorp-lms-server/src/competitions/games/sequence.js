/**
 * Sequence & Reaction, a Group Brain game. Most rounds show a sequence of
 * colours, symbols or digits, one at a time; once it is gone every player
 * taps it back in order. Each round's sequence is one longer (easy starts at
 * 3, medium 4, hard 5). Every third round is a reaction round instead: wait
 * for "Go", then tap — before "Go" is a false start.
 *
 * Sequence round: 10 for each item in its right place, and 50 more for the
 * whole sequence. Reaction round: 100 less a point for every 10 ms after
 * "Go" (at least 10); a false start scores −20. The rounds are roundCore.js's.
 *
 * A reaction is timed on the server from "Go" (the show's end, which every
 * browser knows) to the tap's arrival.
 */
const { makeRoundEngine } = require('./roundCore');
const { GameError } = require('./contract');

const SETS = {
    colours: ['red', 'blue', 'green', 'yellow', 'purple', 'orange'],
    symbols: ['★', '●', '▲', '■', '◆', '♥'],
    digits: ['1', '2', '3', '4', '5', '6']
};
const KINDS = Object.keys(SETS);
const START = { easy: 3, medium: 4, hard: 5 };
const CHOICES = { easy: 4, medium: 5, hard: 6 };
const STEP_MS = 800;

const isReaction = (g, index) => g.reaction && index % 3 === 2;

module.exports = makeRoundEngine({
    id: 'sequence',
    label: 'Sequence & Reaction',
    emoji: '🎯',
    summary: 'Watch a sequence, then tap it back — longer every round. Reaction rounds: wait for Go, then tap first.',
    maxSeats: 20,
    setup: (o) => ({ rounds: 9, startLength: START[o.difficulty], choices: CHOICES[o.difficulty], reaction: o.reaction !== false }),
    round: (g, index, rng) => {
        if (isReaction(g, index)) {
            return { kind: 'reaction', early: true, showMs: 1500 + Math.floor(rng() * 2500), answerMs: 3000 };
        }
        const done = Array.from({ length: index }, (_, i) => i).filter((i) => !isReaction(g, i)).length;
        const length = g.startLength + done;
        const set = KINDS[index % KINDS.length];
        const items = SETS[set].slice(0, g.choices);
        const sequence = Array.from({ length }, () => Math.floor(rng() * items.length));
        return { kind: 'sequence', set, items, length, sequence, stepMs: STEP_MS, showMs: STEP_MS * length + 600, answerMs: 6000 + 1500 * length };
    },
    publicRound: (r, phase) => (r.kind === 'reaction'
        ? { kind: 'reaction', go: phase !== 'show' }
        : { kind: 'sequence', set: r.set, items: r.items, length: r.length, stepMs: r.stepMs, sequence: phase === 'show' || phase === 'reveal' || phase === 'over' ? r.sequence : null }),
    early: () => ({ falseStart: true }),
    answer: (r, action) => {
        if (r.kind === 'reaction') return { tap: true };
        const seq = Array.isArray(action.sequence) ? action.sequence.map(Number) : [];
        if (seq.length !== r.length) throw new GameError(`Tap all ${r.length} in order.`);
        if (seq.some((x) => !Number.isInteger(x) || x < 0 || x >= r.items.length)) throw new GameError('Tap one of the choices.');
        return { sequence: seq };
    },
    score: (r, answers) => answers.map((a) => {
        if (r.kind === 'reaction') {
            if (!a) return { points: 0, correct: false, detail: { missed: true } };
            if (a.value.falseStart) return { points: -20, correct: false, detail: { falseStart: true } };
            return { points: Math.max(10, 100 - Math.floor(a.ms / 10)), correct: true, detail: { ms: a.ms } };
        }
        if (!a) return { points: 0, correct: false, detail: { right: 0, of: r.length } };
        const right = a.value.sequence.filter((x, i) => x === r.sequence[i]).length;
        const all = right === r.length;
        return { points: right * 10 + (all ? 50 : 0), correct: all, detail: { right, of: r.length } };
    }),
    revealMessage: (r, results) => {
        if (r.kind === 'reaction') {
            const fast = results.map((x, i) => [x, i]).filter(([x]) => x.detail?.ms != null).sort((a, b) => a[0].detail.ms - b[0].detail.ms)[0];
            return fast ? `Fastest: ${fast[0].detail.ms} ms.` : 'Nobody tapped in time.';
        }
        const perfect = results.filter((x) => x.correct).length;
        return perfect ? `${perfect === 1 ? 'One player' : `${perfect} players`} got all ${r.length}.` : `Nobody got all ${r.length}.`;
    }
});
