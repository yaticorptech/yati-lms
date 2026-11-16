/**
 * Tower Shift by age band (2026-11-13). Pure, so node can test it.
 *
 * Classic rule: move one top ring at a time, never onto a smaller ring; best possible 2^n − 1.
 * Advanced rule ("next-door pegs only"): a ring may move only between neighbouring pegs (left↔middle, middle↔right),
 * so left→right takes two hops; moving the tower from left to right then takes 3^n − 1 moves at best.
 *
 * A state is an array: state[d] = the peg (0, 1, 2) of ring d, ring 0 the smallest. "Best moves left" comes from a
 * breadth-first search over all 3^n states, so it is exact for either rule.
 */

export const legalHop = (from, to, adjacent) => from !== to && (!adjacent || Math.abs(from - to) === 1);

/** Best possible moves from the start (all on peg 0) to all on peg 2. */
export const optimumMoves = (rings, adjacent) => (adjacent ? 3 ** rings - 1 : 2 ** rings - 1);

/** Pegs (stacks bottom → top, ring sizes 1 = smallest) to a state array, and back. */
export const stateOf = (pegs, rings) => {
  const s = Array(rings).fill(0);
  pegs.forEach((stack, p) => stack.forEach((size) => { s[size - 1] = p; }));
  return s;
};
const keyOf = (s) => s.join('');

/** The moves possible from a state: [from, to] pairs. */
export const movesFrom = (s, adjacent) => {
  const top = [Infinity, Infinity, Infinity];
  s.forEach((p, d) => { if (d < top[p]) top[p] = d; });
  const out = [];
  for (let from = 0; from < 3; from += 1) {
    if (top[from] === Infinity) continue;
    for (let to = 0; to < 3; to += 1) {
      if (legalHop(from, to, adjacent) && top[from] < top[to]) out.push([from, to]);
    }
  }
  return out;
};

const apply = (s, [from, to]) => {
  const d = s.indexOf(from);   // the smallest ring on `from` is its top
  const next = [...s];
  next[d] = to;
  return next;
};

const DIST = new Map();
/** Distance to the goal (every ring on peg 2) from every state, by BFS backwards from the goal (moves reverse). */
export const distances = (rings, adjacent) => {
  const id = `${rings}:${adjacent ? 1 : 0}`;
  if (DIST.has(id)) return DIST.get(id);
  const goal = Array(rings).fill(2);
  const dist = new Map([[keyOf(goal), 0]]);
  let frontier = [goal];
  while (frontier.length) {
    const next = [];
    for (const s of frontier) {
      const d = dist.get(keyOf(s));
      for (const m of movesFrom(s, adjacent)) {
        const t = apply(s, m);
        const k = keyOf(t);
        if (!dist.has(k)) { dist.set(k, d + 1); next.push(t); }
      }
    }
    frontier = next;
  }
  DIST.set(id, dist);
  return dist;
};

/** Fewest moves still needed from these pegs. */
export const movesLeft = (pegs, rings, adjacent) => distances(rings, adjacent).get(keyOf(stateOf(pegs, rings)));


/**
 * The band's tower: rings, rule, move budget (null = none), seconds.
 * foundation 2–3 rings · developing 3–4 · intermediate 4–5 · analytical 5–6 · advanced next-door pegs only with 3–4
 * rings and a move budget.
 */
export const towerConfig = (band, difficulty, levelNo) => {
  const t = Math.min(1, Math.max(0, (levelNo - 1) / 29));
  const pick = (a, b) => (t >= 0.5 ? b : a);
  let rings;
  let adjacent = false;
  let budget = null;
  let perMove;
  switch (band) {
    case 'foundation': rings = levelNo >= 6 || difficulty > 1 ? 3 : 2; perMove = 9; break;
    case 'developing': rings = pick(3, 4) + (difficulty > 1 ? 1 : 0); perMove = 6; break;
    case 'intermediate': rings = pick(4, 5) + (difficulty > 1 ? 1 : 0); perMove = 4.5 - t; break;
    case 'advanced': {
      adjacent = true;
      rings = difficulty >= 3 && t >= 0.4 ? 4 : 3;
      perMove = 3.2 - t * 0.6;
      break;
    }
    default: rings = Math.min(6, pick(4, 5) + (difficulty - 1 > 0 ? 1 : 0)); perMove = 4 - t; break;   // analytical
  }
  rings = Math.min(rings, 7);
  const best = optimumMoves(rings, adjacent);
  if (adjacent) budget = Math.ceil(best * 1.3);
  return { rings, adjacent, budget, best, seconds: Math.round(20 + best * perMove) };
};

/** Three for the best possible, two within a quarter (half, for the classic rule) more, one for any finish. */
export const starsForMoves = (moves, best, adjacent) => {
  if (moves <= best) return 3;
  if (moves <= Math.ceil(best * (adjacent ? 1.15 : 1.5))) return 2;
  return 1;
};
