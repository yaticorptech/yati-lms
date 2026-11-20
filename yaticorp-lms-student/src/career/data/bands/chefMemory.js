/**
 * Chef's Memory (2026-11-16, replaces Brain Pairs in Rising Brains · Memory & Focus; same game id "pattern-recall").
 * Pure and seeded.
 *
 * A recipe card shows for a few seconds — 2 🍅, then 1 🧅, then 3 🥕 — and hides. Cook it from memory: tap the
 * ingredients from the pantry into the pot, then Cook. Levels add steps and bigger amounts, make the order matter,
 * and bring twist cards ("No onions!", "Double the carrots!") that change the recipe after it hides.
 */
import { intBetween, pick, sample, shuffle } from '../seeded.js';

export const INGREDIENTS = [
  ['🍅', 'tomato', 'tomatoes'], ['🧅', 'onion', 'onions'], ['🥕', 'carrot', 'carrots'], ['🧄', 'garlic clove', 'garlic'], ['🌶️', 'chilli', 'chillies'],
  ['🥔', 'potato', 'potatoes'], ['🍄', 'mushroom', 'mushrooms'], ['🧀', 'cheese slice', 'cheese'], ['🥚', 'egg', 'eggs'], ['🫑', 'pepper', 'peppers'],
  ['🌽', 'corn cob', 'corn'], ['🥦', 'broccoli floret', 'broccoli'], ['🍋', 'lemon', 'lemons'], ['🧈', 'butter pat', 'butter']
];
export const DISHES = [['🍲', 'Super Soup'], ['🍛', 'Chef’s Curry'], ['🍝', 'Pasta Party'], ['🥘', 'Veggie Pot'], ['🍕', 'Pizza Pie'], ['🥗', 'Crunchy Salad']];
const ONE = Object.fromEntries(INGREDIENTS.map(([e, one]) => [e, one]));
const MANY = Object.fromEntries(INGREDIENTS.map(([e, , many]) => [e, many]));

const clampN = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/** steps, biggest amount, whether order matters, twist share, study seconds, pantry size, rounds, pass. */
export const chefConfig = (ageBand, difficulty = 1, levelNo = 1) => {
  const band = ageBand === 'analytical' ? 'analytical' : 'intermediate';
  const d = clampN(difficulty || 1, 1, 3);
  const steps = band === 'intermediate' ? (d === 1 ? (levelNo >= 8 ? 4 : 3) : d === 2 ? 4 : 5) : (d === 1 ? 5 : 6);
  const maxQty = band === 'intermediate' && d === 1 && levelNo < 10 ? 2 : 3;
  const ordered = band === 'analytical' || d >= 2 || levelNo >= 5;
  const twist = band === 'analytical' ? 0.6 : d >= 2 ? 0.5 : levelNo >= 12 ? 0.35 : 0;
  return { band, steps, maxQty, ordered, twist, study: steps * 2 + 2, pantry: Math.min(INGREDIENTS.length, steps + 5), rounds: 5, pass: 4 };
};

/** The words a twist card says. */
const twistText = (t) => (t.kind === 'remove' ? `No ${MANY[t.emoji]}! Leave them out.` : t.kind === 'double' ? `Double the ${MANY[t.emoji]}!` : `Add ${t.qty} ${t.emoji} ${t.qty > 1 ? MANY[t.emoji] : ONE[t.emoji]} at the end.`);

/** A recipe as a list of single taps, in order: [['🍅',2],['🧅',1]] → 🍅 🍅 🧅. */
export const unitsOf = (recipe) => recipe.flatMap(([emoji, qty]) => Array(qty).fill(emoji));

/**
 * One order: { dish, shown: [[emoji, qty]], twist: { kind, emoji, qty?, text } | null, answer: [[emoji, qty]], pantry }.
 * `shown` is the card; `answer` is what to cook after the twist.
 */
export const makeOrder = (rng, config) => {
  const chosen = sample(rng, INGREDIENTS, config.steps + 1);
  const shown = chosen.slice(0, config.steps).map(([emoji]) => [emoji, intBetween(rng, 1, config.maxQty)]);
  const spare = chosen[config.steps][0];
  let twist = null;
  let answer = shown.map((s) => [...s]);
  if (rng() < config.twist) {
    const kind = pick(rng, ['remove', 'double', 'add']);
    if (kind === 'remove') {
      const i = intBetween(rng, 0, shown.length - 1);
      twist = { kind, emoji: shown[i][0] };
      answer = answer.filter((_, j) => j !== i);
    } else if (kind === 'double') {
      const i = intBetween(rng, 0, shown.length - 1);
      twist = { kind, emoji: shown[i][0] };
      answer[i][1] *= 2;
    } else {
      twist = { kind, emoji: spare, qty: intBetween(rng, 1, 2) };
      answer.push([spare, twist.qty]);
    }
    twist.text = twistText(twist);
  }
  const needed = new Set([...shown, ...answer].map(([e]) => e));
  const decoys = shuffle(rng, INGREDIENTS.map(([e]) => e).filter((e) => !needed.has(e))).slice(0, Math.max(0, config.pantry - needed.size));
  return { dish: pick(rng, DISHES), shown, twist, answer, pantry: shuffle(rng, [...needed, ...decoys]) };
};

/*
 * More than one way to remember (2026-11-18, the user: "it's a memory game — make it creative, not just remember and
 * add"). Each round has a style, and they change through the level:
 *   card   — the whole recipe at once, as before;
 *   flash  — a cooking show: one ingredient at a time, then gone — remember the sequence;
 *   tables — two tables order at once; when both hide, the waiter says which table to cook for.
 */
export const STYLES = ['card', 'flash', 'tables', 'flash', 'tables'];
const makeTables = (rng, config) => {
  const cfg = { ...config, steps: Math.max(2, config.steps - 1), twist: 0 };
  const a = makeOrder(rng, cfg);
  let b = makeOrder(rng, cfg);
  for (let k = 0; k < 20 && b.shown.some(([e]) => a.shown.some(([f]) => f === e)); k++) b = makeOrder(rng, cfg);
  const ask = intBetween(rng, 0, 1);
  const chosen = ask ? b : a;
  const needed = new Set([...a.shown, ...b.shown].map(([e]) => e));
  const decoys = shuffle(rng, INGREDIENTS.map(([e]) => e).filter((e) => !needed.has(e))).slice(0, Math.max(0, config.pantry + 1 - needed.size));
  return {
    style: 'tables', dish: chosen.dish, shown: chosen.shown, tables: [a.shown, b.shown], ask,
    twist: { kind: 'table', text: `Table ${ask + 1} is hungry — cook Table ${ask + 1}'s order!` },
    answer: chosen.shown.map((x) => [...x]), pantry: shuffle(rng, [...needed, ...decoys])
  };
};
export const makeChefLevel = (rng, config) => Array.from({ length: config.rounds }, (_, i) => {
  const style = STYLES[i % STYLES.length];
  if (style === 'tables') return makeTables(rng, config);
  return { ...makeOrder(rng, config), style };
});

/** Does the pot (a list of single taps) cook the answer? In order when `ordered`, else any order. */
export const cooks = (order, pot, ordered) => {
  const want = unitsOf(order.answer);
  if (pot.length !== want.length) return false;
  if (ordered) return pot.every((e, i) => e === want[i]);
  const count = (list) => list.reduce((m, e) => ({ ...m, [e]: (m[e] || 0) + 1 }), {});
  const a = count(pot);
  const b = count(want);
  return Object.keys(b).every((k) => a[k] === b[k]) && Object.keys(a).every((k) => a[k] === b[k]);
};
