/**
 * Count & Catch (2026-11-16, remade again: the user's design). Pure, so node can test it.
 *
 * A sum to work out — 3 + 2, 7 − 4, 3 × 2, 12 ÷ 3 — and things falling from the sky. Move the basket to catch exactly
 * that many of the right thing, then press Done. Other things fall too: leave them. Levels climb:
 *   + small → + and − to 10 → with × → × and ÷ (Developing, Classes 3–5, starts four levels on).
 */

const int = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
const pick = (rng, list) => list[int(rng, 0, list.length - 1)];
const shuffle = (rng, list) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const KINDS = [
  { emoji: '🍎', one: 'apple', many: 'apples' },
  { emoji: '🍌', one: 'banana', many: 'bananas' },
  { emoji: '🍓', one: 'strawberry', many: 'strawberries' },
  { emoji: '⭐', one: 'star', many: 'stars' },
  { emoji: '🍊', one: 'orange', many: 'oranges' },
  { emoji: '🥕', one: 'carrot', many: 'carrots' },
  { emoji: '🍇', one: 'bunch of grapes', many: 'grapes' }
];

/** The level's setup: which signs, how fast things fall, rounds and pass mark. */
export const countConfig = (band, levelNo) => {
  const n = Math.max(1, levelNo + (band === 'developing' ? 4 : 0));
  const ops = n <= 2 ? ['+'] : n <= 4 ? ['+', '−'] : n <= 6 ? ['+', '−', '×'] : ['×', '÷', '+', '−'];
  return { ops, maxAnswer: n <= 2 ? 6 : 10, fallMs: Math.max(2300, 3400 - n * 90), rounds: 6, pass: n <= 2 ? 4 : 5 };
};

/** A sum with a whole-number answer from 2 to `max`. */
export const makeSum = (rng, op, max) => {
  for (;;) {
    let a;
    let b;
    let answer;
    if (op === '+') { answer = int(rng, 2, max); a = int(rng, 1, answer - 1); b = answer - a; }
    else if (op === '−') { answer = int(rng, 2, max); b = int(rng, 1, 5); a = answer + b; }
    else if (op === '×') { a = int(rng, 2, 5); b = int(rng, 1, 5); answer = a * b; }
    else { answer = int(rng, 2, 5); b = int(rng, 2, 5); a = answer * b; }
    if (answer >= 2 && answer <= max) return { text: `${a} ${op} ${b}`, answer };
  }
};

/**
 * One round: { sum, answer, kind, stream: [{ id, emoji, target, x, t0 }], endMs }.
 * The stream always has more of the right thing than needed (so the child must stop at the answer) and some others.
 */
export const makeCountRound = (rng, config) => {
  const { text, answer } = makeSum(rng, pick(rng, config.ops), config.maxAnswer);
  const [kind, ...others] = shuffle(rng, KINDS);
  const targets = answer + int(rng, 2, 4);
  const decoys = Math.max(3, Math.round(targets * 0.7));
  const count = targets + decoys;
  const gap = 1150 - Math.min(350, answer * 25);
  const items = shuffle(rng, [...Array(targets).fill(true), ...Array(decoys).fill(false)]);
  let lastX = 50;
  const stream = items.map((target, i) => {
    let x;
    do x = int(rng, 10, 90); while (Math.abs(x - lastX) < 14);
    lastX = x;
    return { id: i, target, emoji: target ? kind.emoji : pick(rng, others.slice(0, 2)).emoji, x, t0: 600 + i * gap + int(rng, -120, 120) };
  });
  return { sum: text, answer, kind, stream, endMs: 600 + (count - 1) * gap + config.fallMs + 400 };
};

export const makeCountLevel = (rng, config) => Array.from({ length: config.rounds }, () => makeCountRound(rng, config));
