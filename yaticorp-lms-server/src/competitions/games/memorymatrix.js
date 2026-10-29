/**
 * Memory Matrix, a Group Brain game: some cells of a grid light up for a
 * moment; once they go dark, every player picks the same cells. The grid
 * grows every three rounds (easy starts at 3×3, medium 4×4, hard 5×5; at
 * most 7×7) and each round lights a few more.
 *
 * A round scores 10 for each right cell, −5 for each wrong one (never below
 * 0), and 50 more for getting them all. The rounds are roundCore.js's.
 *
 * Every cell a player taps is sent at once (`pick`); the others see only
 * how many they have picked until the round closes, then everyone's grid
 * (asked 2026-10-29: answers shown together once the time is up).
 */
const { makeRoundEngine } = require('./roundCore');
const { GameError } = require('./contract');

const START = { easy: 3, medium: 4, hard: 5 };

/** `k` different cells of an n×n grid, in order. */
const pickCells = (rng, n, k) => {
    const all = Array.from({ length: n * n }, (_, i) => i);
    for (let i = all.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rng() * (i + 1));
        [all[i], all[j]] = [all[j], all[i]];
    }
    return all.slice(0, k).sort((a, b) => a - b);
};

module.exports = makeRoundEngine({
    id: 'memorymatrix',
    label: 'Memory Matrix',
    emoji: '🟦',
    summary: 'Cells light up, then go dark: pick the same ones. The grid grows as you go.',
    maxSeats: 20,
    setup: (o) => ({ rounds: 8, startSize: START[o.difficulty] }),
    round: (g, index, rng) => {
        const size = Math.min(7, g.startSize + Math.floor(index / 3));
        const count = Math.min(size * size - 2, size + 1 + (index % 3));
        return { size, count, cells: pickCells(rng, size, count), showMs: 1500 + 250 * count, answerMs: 8000 + 1000 * count };
    },
    // Others' taps stay hidden while answering (only how many): everyone's show at the reveal (asked 2026-10-29).
    publicRound: (r, phase, g, you) => ({
        size: r.size, count: r.count, cells: phase === 'show' || phase === 'reveal' || phase === 'over' ? r.cells : null,
        picks: g.seats.map((_, i) => (phase === 'answer' && i !== you ? [] : r.picks?.[i] || [])),
        pickCounts: g.seats.map((_, i) => (r.picks?.[i] || []).length)
    }),
    // A tap on a cell: picked, or unpicked; never more than the round's count.
    actions: {
        pick: (g, seat, action) => {
            const r = g.current;
            const cell = Number(action.cell);
            if (!Number.isInteger(cell) || cell < 0 || cell >= r.size * r.size) throw new GameError('Pick a cell on the grid.');
            r.picks = r.picks || g.seats.map(() => []);
            const mine = r.picks[seat] || [];
            if (mine.includes(cell)) r.picks[seat] = mine.filter((c) => c !== cell);
            else if (mine.length < r.count) r.picks[seat] = [...mine, cell];
            else throw new GameError(`You have picked ${r.count} cells: tap one to take it back, or send.`);
            return null;
        },
        clear: (g, seat) => { if (g.current.picks) g.current.picks[seat] = []; return null; }
    },
    answer: (r, action, g, seat) => {
        const cells = Array.isArray(action.cells) ? action.cells.map(Number) : [];
        if (cells.some((c) => !Number.isInteger(c) || c < 0 || c >= r.size * r.size)) throw new GameError('Pick cells on the grid.');
        if (new Set(cells).size !== cells.length) throw new GameError('Pick each cell once.');
        if (cells.length !== r.count) throw new GameError(`Pick exactly ${r.count} cells.`);
        r.picks = r.picks || g.seats.map(() => []);
        r.picks[seat] = [...cells];
        return { cells: [...cells].sort((a, b) => a - b) };
    },
    score: (r, answers) => answers.map((a) => {
        if (!a) return { points: 0, correct: false, detail: { hits: 0, of: r.count } };
        const hits = a.value.cells.filter((c) => r.cells.includes(c)).length;
        const all = hits === r.count;
        return { points: Math.max(0, hits * 10 - (r.count - hits) * 5) + (all ? 50 : 0), correct: all, detail: { hits, of: r.count } };
    }),
    revealMessage: (r, results) => {
        const perfect = results.filter((x) => x.correct).length;
        return perfect ? `${perfect === 1 ? 'One player' : `${perfect} players`} got all ${r.count} cells.` : `Nobody got all ${r.count} cells.`;
    }
});
module.exports.pickCells = pickCells;
