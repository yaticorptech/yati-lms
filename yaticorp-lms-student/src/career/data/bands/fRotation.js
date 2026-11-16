/**
 * Spatial Rotation Vault (Master Minds, Classes 11–12) — pure and seeded.
 *
 * Extends Spin Match: a block figure (a free polyomino of 5–8 cells, with no symmetry at all, so its eight
 * orientations are all different) is shown with some cells marked. It is hidden; the player then picks the one
 * candidate that is the same figure turned (not flipped, not altered), and taps where the marked cells went on it.
 *
 * Cells are [x, y]. A quarter turn clockwise maps (x, y) to (-y, x) before normalising back into the corner; marks
 * travel with their cell through the same map, so the expected answer is computed by rotation, never stored by hand.
 */
import { shuffle, intBetween, pick } from '../seeded.js';

const clampN = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const t = (levelNo) => clampN(((levelNo || 1) - 1) / 29, 0, 1);
const ramp = (from, to, levelNo) => Math.round(from + (to - from) * t(levelNo));

/** Shift cells into the corner, sorted, so two placements of one shape compare equal. Marks (a third field) ride along. */
export const normalise = (cells) => {
  const minX = Math.min(...cells.map((c) => c[0]));
  const minY = Math.min(...cells.map((c) => c[1]));
  return cells.map(([x, y, ...rest]) => [x - minX, y - minY, ...rest]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
};

/** One quarter turn clockwise (on screen, y down): (x, y) -> (-y, x). */
export const rotate = (cells) => normalise(cells.map(([x, y, ...rest]) => [-y, x, ...rest]));
/** A mirror image (left-right flip). */
export const mirror = (cells) => normalise(cells.map(([x, y, ...rest]) => [-x, y, ...rest]));
/** `k` quarter turns. */
export const turn = (cells, k) => {
  let c = normalise(cells);
  for (let i = 0; i < ((k % 4) + 4) % 4; i++) c = rotate(c);
  return c;
};
/** The shape's identity in one placement (marks ignored). */
export const shapeKey = (cells) => normalise(cells.map(([x, y]) => [x, y])).map((c) => `${c[0]},${c[1]}`).join(';');
const rotKeys = (cells) => [0, 1, 2, 3].map((k) => shapeKey(turn(cells, k)));
/** True when `b` is `a` turned by some quarter turns (a flip does not count). */
export const isRotationOf = (a, b) => rotKeys(a).includes(shapeKey(b));
/** The free shape's key: the same for all eight orientations. */
const freeKey = (cells) => [...rotKeys(cells), ...rotKeys(mirror(cells))].sort()[0];
/** All eight orientations different: no turn or flip maps the figure onto itself. */
export const isAsymmetric = (cells) => new Set([...rotKeys(cells), ...rotKeys(mirror(cells))]).size === 8;

const connected = (cells) => {
  const set = new Set(cells.map(([x, y]) => `${x},${y}`));
  const seen = new Set([`${cells[0][0]},${cells[0][1]}`]);
  const stack = [cells[0]];
  while (stack.length) {
    const [x, y] = stack.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = `${x + dx},${y + dy}`;
      if (set.has(k) && !seen.has(k)) { seen.add(k); stack.push([x + dx, y + dy]); }
    }
  }
  return seen.size === cells.length;
};
export const isConnected = connected;

/** A random connected figure of `n` cells, grown cell by cell, kept inside a 4×4 (n ≤ 6) or 5×5 box. */
const grow = (rng, n) => {
  const box = n <= 6 ? 4 : 5;
  const cells = [[0, 0]];
  const has = (x, y) => cells.some((c) => c[0] === x && c[1] === y);
  let guard = 0;
  while (cells.length < n && guard++ < 400) {
    const [x, y] = pick(rng, cells);
    const [dx, dy] = pick(rng, [[1, 0], [-1, 0], [0, 1], [0, -1]]);
    const nx = x + dx;
    const ny = y + dy;
    if (has(nx, ny)) continue;
    const xs = [...cells.map((c) => c[0]), nx];
    const ys = [...cells.map((c) => c[1]), ny];
    if (Math.max(...xs) - Math.min(...xs) >= box || Math.max(...ys) - Math.min(...ys) >= box) continue;
    cells.push([nx, ny]);
  }
  return normalise(cells);
};

/** The figure with one cell moved somewhere else on its rim: a near-miss impostor, never the same free shape. */
const alter = (rng, cells) => {
  for (let tries = 0; tries < 60; tries++) {
    const drop = intBetween(rng, 0, cells.length - 1);
    const rest = cells.filter((_, i) => i !== drop).map(([x, y]) => [x, y]);
    if (!connected(rest)) continue;
    const spots = [];
    for (const [x, y] of rest) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (!rest.some((c) => c[0] === nx && c[1] === ny) && !spots.some((s) => s[0] === nx && s[1] === ny)) spots.push([nx, ny]);
      }
    }
    const spot = pick(rng, spots);
    const next = normalise([...rest, spot]);
    if (freeKey(next) !== freeKey(cells)) return next;
  }
  return null;
};

/**
 * How a level plays (Classes 11–12 = 'advanced'; any other band plays one step easier).
 *  rounds, pass, max — fixed run of figures; each is worth 2 (the right figure, and every mark placed right)
 *  cells             — figure size
 *  marks             — marked cells to remember
 *  options           — candidates: one true turn, the rest flipped copies and (harder) altered copies
 *  altered           — how many of the impostors are near-miss shapes rather than mirror images
 *  studyMs           — how long the figure is shown
 */
export const rotationConfig = (ageBand, difficulty = 1, levelNo = 1) => {
  const band = ageBand === 'advanced' || !ageBand ? 'advanced' : 'other';
  const d = clampN((difficulty || 1) - (band === 'advanced' ? 0 : 1), 1, 3);
  const rounds = 6;
  const cells = clampN([5, 6, 7][d - 1] + (t(levelNo) >= 0.5 ? 1 : 0), 5, 8);
  const marks = clampN([2, 2, 3][d - 1] + (t(levelNo) >= 0.66 ? 1 : 0), 2, 4);
  const options = [4, 5, 6][d - 1];
  const altered = [0, 1, 2][d - 1];
  const studyMs = ramp([6500, 5500, 4500][d - 1], [5500, 4500, 3500][d - 1], levelNo);
  const max = rounds * 2;
  return { band, difficulty: d, rounds, cells, marks, options, altered, studyMs, max, pass: Math.ceil(max * 0.6) };
};

/** One round: the figure (with marks), the candidates (exactly one a true turn), and where the marks land on it. */
export const makeRotationRound = (rng, cfg) => {
  let base;
  do base = grow(rng, cfg.cells); while (base.length !== cfg.cells || !isAsymmetric(base));
  const markIdx = shuffle(rng, base.map((_, i) => i)).slice(0, cfg.marks);
  const marked = base.map(([x, y], i) => [x, y, markIdx.includes(i) ? 1 : 0]);
  const k = intBetween(rng, 1, 3);
  const answer = turn(marked, k);
  const flips = shuffle(rng, [0, 1, 2, 3]).map((j) => turn(mirror(base), j));
  const impostors = [];
  const seen = new Set([shapeKey(answer)]);
  for (let i = 0; i < cfg.altered; i++) {
    const alt = alter(rng, base);
    if (alt) {
      const placed = turn(alt, intBetween(rng, 0, 3));
      if (!seen.has(shapeKey(placed))) { seen.add(shapeKey(placed)); impostors.push(placed); }
    }
  }
  for (const f of flips) {
    if (impostors.length >= cfg.options - 1) break;
    if (!seen.has(shapeKey(f))) { seen.add(shapeKey(f)); impostors.push(f); }
  }
  const options = shuffle(rng, [
    { id: 'o0', cells: answer.map(([x, y]) => [x, y]), right: true },
    ...impostors.map((c, i) => ({ id: `o${i + 1}`, cells: c.map(([x, y]) => [x, y]), right: false }))
  ]);
  return {
    base: marked,
    turns: k,
    options,
    answerMarks: answer.filter((c) => c[2]).map(([x, y]) => `${x},${y}`).sort()
  };
};

export const makeRotationLevel = (rng, cfg) => Array.from({ length: cfg.rounds }, () => makeRotationRound(rng, cfg));

/** Marks tapped on the turned figure, as "x,y" keys: how many are right, and whether the set is exactly right. */
export const checkMarks = (round, tapped) => {
  const want = new Set(round.answerMarks);
  const hits = tapped.filter((k) => want.has(k)).length;
  return { hits, exact: hits === want.size && tapped.length === want.size };
};
