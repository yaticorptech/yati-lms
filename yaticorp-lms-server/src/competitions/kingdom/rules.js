/**
 * The hidden rules of The Lost Kingdom's number puzzles (2026-11-07: "puzzles 3 and 4 are too easy"), and a
 * solver that works a puzzle out the way a student must: try every rule a student could think of, keep the ones the
 * complete numbers agree with, and see which numbers could fill the gap. A puzzle is fair only when exactly one
 * number can (generator.js makes them, validate.js checks them again).
 *
 *   Puzzle 3, the triangle: each number comes from the two just below it, by one rule.
 *   Puzzle 4, the grid: in each row (or each column — part of the puzzle is seeing which) the third number comes
 *   from the first two, by one rule.
 */
const RULES = [
    { id: 'sum', f: (x, y) => x + y, say: 'add the two numbers' },
    { id: 'sum1', f: (x, y) => x + y + 1, say: 'add the two numbers, then add 1' },
    { id: 'sum2', f: (x, y) => x + y + 2, say: 'add the two numbers, then add 2' },
    { id: 'sum3', f: (x, y) => x + y + 3, say: 'add the two numbers, then add 3' },
    { id: 'sumLess1', f: (x, y) => x + y - 1, say: 'add the two numbers, then take away 1' },
    { id: 'dblFirst', f: (x, y) => 2 * x + y, say: 'double the first number, then add the second' },
    { id: 'dblSecond', f: (x, y) => x + 2 * y, say: 'add the first number to double the second' },
    { id: 'sumDouble', f: (x, y) => 2 * (x + y), say: 'add the two numbers, then double it' },
    { id: 'mul', f: (x, y) => x * y, say: 'multiply the two numbers' },
    { id: 'mul1', f: (x, y) => x * y + 1, say: 'multiply the two numbers, then add 1' },
    { id: 'mulLess1', f: (x, y) => x * y - 1, say: 'multiply the two numbers, then take away 1' },
    { id: 'mulPlusFirst', f: (x, y) => x * y + x, say: 'multiply the two numbers, then add the first' },
    { id: 'diff', f: (x, y) => Math.abs(x - y), say: 'take the smaller number away from the larger one' },
    { id: 'diffDouble', f: (x, y) => 2 * Math.abs(x - y), say: 'take the smaller from the larger, then double it' }
];

/**
 * Every rule a student might reasonably try, for the check (wider than RULES, which are the ones puzzles are made
 * with): p·x + q·y + k for small p, q, k; x·y + k; x·y plus one of them; the difference times 1–3 plus k. A puzzle is
 * kept only if all of these that fit the numbers shown give the same missing number.
 */
const CHECK_RULES = (() => {
    const out = RULES.map((r) => r.f);
    for (let p = 1; p <= 3; p += 1) for (let q = 1; q <= 3; q += 1) for (let k = -5; k <= 5; k += 1) out.push((x, y) => p * x + q * y + k);
    for (let k = -3; k <= 3; k += 1) out.push((x, y) => x * y + k);
    out.push((x, y) => x * y + y, (x, y) => x * y - x, (x, y) => x * y - y, (x, y) => (x + y) * 3, (x, y) => x * x + y, (x, y) => x + y * y);
    for (let m = 1; m <= 3; m += 1) for (let k = -2; k <= 3; k += 1) out.push((x, y) => m * Math.abs(x - y) + k);
    for (let k = -3; k <= 5; k += 1) out.push((x, y) => x - y + k, (x, y) => y - x + k);
    return out;
})();

/** The triangle's three sums: [top, from], as [result cell, left cell, right cell] in rows [[a], [b, c], [d, e, f]]. */
const TRI = [[[0, 0], [1, 0], [1, 1]], [[1, 0], [2, 0], [2, 1]], [[1, 1], [2, 1], [2, 2]]];
/** The grid's three relations, by rows or by columns: [result index, first, second] in cells 0–8. */
const GRID = {
    rows: [[2, 0, 1], [5, 3, 4], [8, 6, 7]],
    cols: [[6, 0, 3], [7, 1, 4], [8, 2, 5]]
};

/** Every number 0–max that could fill the gap (`null`) so that some single rule holds for all three relations. */
const fills = (get, relations, max, set) => {
    const out = [];
    for (let v = 0; v <= max; v += 1) {
        set(v);
        if (relations.some((rels) => CHECK_RULES.some((f) => rels.every(([z, x, y]) => f(get(x), get(y)) === get(z))))) out.push(v);
    }
    set(null);
    return out;
};
const triangleFills = (rows) => {
    const r = rows.map((x) => [...x]);
    const gap = r.flatMap((row, i) => row.map((v, k) => (v == null ? [i, k] : null))).find(Boolean);
    return fills(([i, k]) => r[i][k], [TRI], 999, (v) => { r[gap[0]][gap[1]] = v; });
};
const gridFills = (cells) => {
    const c = [...cells]; const gap = c.indexOf(null);
    return fills((i) => c[i], [GRID.rows, GRID.cols], 999, (v) => { c[gap] = v; });
};

module.exports = { CHECK_RULES, RULES, TRI, GRID, triangleFills, gridFills };
