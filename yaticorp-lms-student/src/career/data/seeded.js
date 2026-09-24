/**
 * A small seeded random number generator for building question pools.
 *
 * The generated quiz pools have to be the SAME every time the game loads:
 * the question memory (components/games/questionMemory.js) recognises a
 * question by hashing its content, options included, so a pool that came out
 * differently on each visit would read as a stream of never-seen questions and
 * every level would repeat. Math.random cannot give that; this can.
 *
 * mulberry32. Fast, tiny, and plenty for dealing quiz questions.
 */
export const seeded = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** A whole number in [min, max], inclusive. */
export const intBetween = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));

/** One item of a list. */
export const pick = (rng, list) => list[Math.floor(rng() * list.length)];

/** A shuffled copy of a list. */
export const shuffle = (rng, list) => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/** `n` distinct items of a list. */
export const sample = (rng, list, n) => shuffle(rng, list).slice(0, n);

/**
 * How far through a pool an item sits, 0 for the first and 1 for the last.
 * Generated pools are built easy to hard, so this is the item's difficulty
 * inside its band, and the quiz uses it to ask harder questions at higher
 * levels of the same band.
 */
export const tierOf = (index, count) => (count <= 1 ? 0 : index / (count - 1));

/**
 * Three wrong numbers around a right one, distinct, positive and never the
 * answer. Drawn from the seeded generator so the same question always has
 * the same options.
 */
export const numberDistractors = (rng, answer, spread = 3, avoid = []) => {
  const out = new Set();
  const banned = new Set([answer, ...avoid]);
  const magnitude = Math.max(1, Math.round(Math.abs(answer) * 0.15));
  const drifts = [1, 2, 3, spread, spread + 1, magnitude, magnitude * 2, 10].filter((d) => d > 0);
  let guard = 0;
  while (out.size < 3 && guard < 200) {
    guard += 1;
    const d = pick(rng, drifts);
    const candidate = answer + (rng() < 0.5 ? -d : d);
    if (!banned.has(candidate) && candidate >= 0) out.add(candidate);
  }
  // Only reachable if the answer sits so low that few positives exist; pad upward.
  let bump = 1;
  while (out.size < 3) {
    if (!banned.has(answer + bump)) out.add(answer + bump);
    bump += 1;
  }
  return [...out];
};
