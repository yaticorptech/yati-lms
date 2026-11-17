/**
 * Clue Chain (Rising Brains, logic) — extends Scale Balance's ordering idea. Pure and seeded.
 *
 * Two puzzle kinds, both answered by putting cards in order:
 *  "rank"  — chained comparison clues ("Kabir is taller than Diya", "Sana is
 *            just taller than Rohan") about 4–6 people; order them top to
 *            bottom. The generator adds true clues until brute force over every
 *            ordering leaves exactly ONE that fits, then drops every clue that
 *            is not needed, so the set is minimal and the answer unique.
 *  "chain" — "If …, then …" cards from a starting fact to a conclusion; order
 *            the cards so each one's result is the next one's condition.
 *            Every step in a chain is a different statement, so the order is unique.
 */
import { pick, sample, shuffle } from '../seeded.js';

export const PEOPLE = ['Aarav', 'Diya', 'Kabir', 'Meera', 'Rohan', 'Sana', 'Ishaan', 'Tara', 'Vikram', 'Anaya', 'Dev', 'Zoya'];

export const ATTRS = [
  { more: 'taller', less: 'shorter', most: 'tallest', least: 'shortest' },
  { more: 'older', less: 'younger', most: 'oldest', least: 'youngest' },
  { more: 'faster', less: 'slower', most: 'fastest', least: 'slowest' },
  { more: 'heavier', less: 'lighter', most: 'heaviest', least: 'lightest' }
];

/** Cause-and-effect chains: each step leads to the next. Every statement is different from every other. */
export const CHAINS = [
  ['it rains heavily all night', 'the cricket ground is waterlogged', 'the match is moved to Sunday', 'the team gets an extra day to practise', 'the new bowler is fit to play', 'the team fields its strongest side'],
  ['the alarm clock does not ring', 'Riya wakes up late', 'she misses the school bus', 'her father drives her to school', 'he reaches his office late', 'his meeting starts without him'],
  ['a plant gets no sunlight', 'it cannot make enough food', 'its leaves turn yellow', 'it stops growing new shoots', 'it produces no flowers', 'no fruit forms on it'],
  ['the shop raises its prices', 'fewer customers buy there', 'its weekly sales drop', 'the owner orders less stock', 'the supplier earns less', 'the supplier looks for new buyers'],
  ['the river water is polluted', 'the fish in it fall sick', 'the kingfishers find less food', 'fewer kingfishers nest by the river', 'birdwatchers stop visiting', 'the village tea stall loses customers'],
  ['the phone battery runs out', 'Arjun cannot use the map app', 'he takes a wrong turn', 'he reaches the museum late', 'he misses the guided tour', 'he has to come back next week'],
  ['the library stays open until 7 pm', 'students can study there after school', 'more students finish their homework on time', 'teachers give fewer late marks', 'the class wins the punctuality prize'],
  ['the bridge is closed for repairs', 'the buses take the long route', 'the journey takes twenty minutes longer', 'the bus reaches school after the bell', 'the students miss the assembly'],
  ['the temperature drops below 0 °C', 'the water in the pond freezes', 'the ducks cannot reach the water weeds', 'the ducks fly to the lake nearby', 'the pond is quiet all winter'],
  ['the school wins the science fair', 'it receives new microscopes as a prize', 'students can look at cells in class', 'more students choose biology', 'the biology club doubles in size'],
  ['Meera saves ₹50 every week', 'she has ₹500 after ten weeks', 'she can afford the book set', 'she reads all seven books', 'she wins the reading challenge'],
  ['the factory switches to solar power', 'it burns less coal', 'less smoke rises from its chimney', 'the air in the town gets cleaner', 'fewer people suffer from coughs'],
  ['a magnet is brought near the iron filings', 'the filings are pulled towards it', 'they line up along the field lines', 'the shape of the magnetic field becomes visible', 'the class can sketch the field pattern'],
  ['the moon passes between the Sun and the Earth', 'it blocks the sunlight', 'a shadow falls on part of the Earth', 'the sky darkens in the middle of the day', 'people see a solar eclipse']
];

export const clueBand = (ageBand) => (ageBand === 'analytical' ? 'analytical' : 'intermediate');

const clampN = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/**
 * puzzles, pass  — puzzles per level, solved to clear it
 * people         — names to order in a rank puzzle
 * kinds          — clue types allowed
 * chainAt        — which puzzle numbers are cause-and-effect chains; chainCards = "If" cards in one
 * checks         — tries per puzzle (after the first, wrong positions are marked)
 */
export const clueConfig = (ageBand, difficulty = 1, levelNo = 1) => {
  const band = clueBand(ageBand);
  const d = clampN(difficulty || 1, 1, 3);
  const late = levelNo >= 15;
  if (band === 'intermediate') {
    return {
      band,
      puzzles: 4, pass: 3,
      people: d === 1 ? 4 : d === 2 ? (late ? 5 : 4) : 5,
      kinds: d === 1 ? ['gt', 'lt', 'top', 'bottom'] : ['gt', 'lt', 'top', 'bottom', 'rank'],
      chainAt: d === 3 || (d === 2 && late) ? [1] : [],
      chainCards: 4,
      checks: 2
    };
  }
  return {
    band,
    puzzles: 4, pass: 3,
    people: d === 1 ? 5 : d === 2 ? (late ? 6 : 5) : 6,
    kinds: d === 1 ? ['gt', 'lt', 'notTop', 'notBottom', 'adjacent', 'rank'] : ['gt', 'lt', 'notTop', 'notBottom', 'adjacent', 'between'],
    chainAt: [1, 3],
    chainCards: d === 1 ? 4 : 5,
    checks: 2
  };
};

const ORD = ['', '', '2nd', '3rd', '4th', '5th'];

/** Every permutation of [0..n-1]. */
const perms = (n) => {
  if (n === 1) return [[0]];
  const out = [];
  for (const p of perms(n - 1)) for (let i = 0; i <= p.length; i++) out.push([...p.slice(0, i), n - 1, ...p.slice(i)]);
  return out;
};
const PERMS = new Map();
const permsOf = (n) => { if (!PERMS.has(n)) PERMS.set(n, perms(n)); return PERMS.get(n); };

/**
 * A clue tests an ordering, given as `pos` (pos[person] = place, 0 = top).
 * { kind, a, b?, c?, k? } with person indices.
 */
export const clueHolds = (clue, pos) => {
  const n = pos.length;
  switch (clue.kind) {
    case 'gt': case 'lt': return pos[clue.a] < pos[clue.b];
    case 'top': return pos[clue.a] === 0;
    case 'bottom': return pos[clue.a] === n - 1;
    case 'notTop': return pos[clue.a] !== 0;
    case 'notBottom': return pos[clue.a] !== n - 1;
    case 'adjacent': return pos[clue.b] === pos[clue.a] + 1;
    case 'between': return pos[clue.a] < pos[clue.b] && pos[clue.b] < pos[clue.c];
    case 'rank': return pos[clue.a] === clue.k;
    default: return false;
  }
};

export const clueText = (clue, names, attr) => {
  const [A, B, C] = [names[clue.a], names[clue.b], names[clue.c]];
  switch (clue.kind) {
    case 'gt': return `${A} is ${attr.more} than ${B}.`;
    case 'lt': return `${B} is ${attr.less} than ${A}.`;
    case 'top': return `${A} is the ${attr.most}.`;
    case 'bottom': return `${A} is the ${attr.least}.`;
    case 'notTop': return `${A} is not the ${attr.most}.`;
    case 'notBottom': return `${A} is not the ${attr.least}.`;
    case 'adjacent': return `${A} is just ${attr.more} than ${B} — nobody comes between them.`;
    case 'between': return `${B} is ${attr.less} than ${A} but ${attr.more} than ${C}.`;
    case 'rank': return `${A} is the ${ORD[clue.k + 1]} ${attr.most}.`;
    default: return '';
  }
};

/** Every true clue of the allowed kinds about `order` (order[place] = person). */
const trueClues = (order, kinds) => {
  const n = order.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (kinds.includes('gt')) out.push({ kind: 'gt', a: order[i], b: order[j] });
      if (kinds.includes('lt')) out.push({ kind: 'lt', a: order[i], b: order[j] });
      if (kinds.includes('adjacent') && j === i + 1) out.push({ kind: 'adjacent', a: order[i], b: order[j] });
      if (kinds.includes('between')) for (let k = j + 1; k < n; k++) out.push({ kind: 'between', a: order[i], b: order[j], c: order[k] });
    }
    if (kinds.includes('top') && i === 0) out.push({ kind: 'top', a: order[i] });
    if (kinds.includes('bottom') && i === n - 1) out.push({ kind: 'bottom', a: order[i] });
    if (kinds.includes('notTop') && i !== 0) out.push({ kind: 'notTop', a: order[i] });
    if (kinds.includes('notBottom') && i !== n - 1) out.push({ kind: 'notBottom', a: order[i] });
    if (kinds.includes('rank') && i > 0 && i < n - 1) out.push({ kind: 'rank', a: order[i], k: i });
  }
  return out;
};

/** How many orderings of n people fit every clue (stops counting at `cap`). */
export const countOrders = (n, clues, cap = Infinity) => {
  let count = 0;
  for (const p of permsOf(n)) {
    // p is an ordering (place → person); clues need person → place.
    const pos = new Array(n);
    p.forEach((person, place) => { pos[person] = place; });
    if (clues.every((c) => clueHolds(c, pos))) { count += 1; if (count >= cap) return count; }
  }
  return count;
};

/** A rank puzzle: { kind: 'rank', attr, names, clues: [clue], texts, items: [name] (shuffled), answer: [name] }. */
export const makeRankPuzzle = (rng, config) => {
  const n = config.people;
  const names = sample(rng, PEOPLE, n);
  const attr = pick(rng, ATTRS);
  const order = shuffle(rng, names.map((_, i) => i));
  const pool = shuffle(rng, trueClues(order, config.kinds));
  const clues = [];
  for (const c of pool) {
    clues.push(c);
    if (countOrders(n, clues, 2) === 1) break;
  }
  // Drop every clue the answer does not need: the set stays unique and becomes minimal.
  for (const c of shuffle(rng, [...clues])) {
    const without = clues.filter((x) => x !== c);
    if (countOrders(n, without, 2) === 1) clues.splice(clues.indexOf(c), 1);
  }
  const answer = order.map((i) => names[i]);
  let items = shuffle(rng, answer);
  while (items.join() === answer.join()) items = shuffle(rng, answer);
  const shown = shuffle(rng, clues);
  return { kind: 'rank', attr, names, clues: shown, texts: shown.map((c) => clueText(c, names, attr)), items, answer };
};

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** A chain puzzle: { kind: 'chain', fact, conclusion, items: [card id] (shuffled), answer: [card id], cards: { id: text } }. */
export const makeChainPuzzle = (rng, config, avoid = []) => {
  const long = CHAINS.map((_, i) => i).filter((i) => CHAINS[i].length > config.chainCards);
  const choices = long.filter((i) => !avoid.includes(i));
  const which = pick(rng, choices.length ? choices : long);
  const full = CHAINS[which];
  const len = Math.min(full.length, config.chainCards + 1);
  const start = Math.floor(rng() * (full.length - len + 1));
  const steps = full.slice(start, start + len);
  const cards = {};
  const answer = [];
  for (let i = 0; i < steps.length - 1; i++) {
    const id = `c${i}`;
    cards[id] = `If ${steps[i]}, then ${steps[i + 1]}.`;
    answer.push(id);
  }
  let items = shuffle(rng, answer);
  while (items.join() === answer.join()) items = shuffle(rng, answer);
  return { kind: 'chain', chain: which, fact: `${cap(steps[0])}.`, conclusion: `So ${steps[steps.length - 1]}.`, cards, items, answer };
};

/** Per place: is the card there the right one? */
export const checkOrder = (puzzle, order) => puzzle.answer.map((id, i) => order[i] === id);

export const makeClueLevel = (rng, config) => {
  const out = [];
  const used = [];
  for (let i = 0; i < config.puzzles; i++) {
    if (config.chainAt.includes(i)) {
      const p = makeChainPuzzle(rng, config, used);
      used.push(p.chain);
      out.push(p);
    } else out.push(makeRankPuzzle(rng, config));
  }
  return out;
};
