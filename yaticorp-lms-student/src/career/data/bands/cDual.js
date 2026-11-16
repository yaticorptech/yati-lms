/**
 * Dual-Image Recall (Rising Brains, memory) — extends Spot the Change. Pure and seeded.
 *
 * "change" rounds: scene A (a grid of pictures on coloured tiles) is shown,
 *   hidden, then scene B appears — tap every tile that changed (its picture,
 *   its colour, or two pictures that swapped). Younger players are told how
 *   many changed; at higher levels they are not.
 * "both" rounds (Classes 9–10): two scenes are shown one after the other, then
 *   a pool of pictures — tap every picture that appeared in BOTH scenes.
 */
import { intBetween, pick, sample, shuffle } from '../seeded.js';

export const DUAL_ICONS = [
  ['🍎', 'apple'], ['🚗', 'car'], ['🐟', 'fish'], ['⭐', 'star'], ['🎈', 'balloon'], ['🔔', 'bell'],
  ['⚽', 'football'], ['🌵', 'cactus'], ['🎸', 'guitar'], ['🦋', 'butterfly'], ['🍩', 'doughnut'], ['🚀', 'rocket'],
  ['🐢', 'turtle'], ['🌙', 'moon'], ['🔑', 'key'], ['🎩', 'hat'], ['🍌', 'banana'], ['🐘', 'elephant'],
  ['☂️', 'umbrella'], ['🧲', 'magnet'], ['🕰️', 'clock'], ['🦉', 'owl'], ['🍄', 'mushroom'], ['🚲', 'bicycle'],
  ['🎁', 'gift'], ['🌻', 'sunflower'], ['🐙', 'octopus'], ['📚', 'books'], ['🍉', 'watermelon'], ['🛶', 'canoe'],
  ['🦒', 'giraffe'], ['🎲', 'dice']
].map(([emoji, name]) => ({ emoji, name }));

/** Tile colours: keys the component maps to classes. */
export const DUAL_TINTS = ['sky', 'rose', 'amber', 'emerald', 'violet'];

export const dualBand = (ageBand) => (ageBand === 'analytical' ? 'analytical' : 'intermediate');

const clampN = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/**
 * rows, cols     — scene size for change rounds
 * changes        — [min, max] changed tiles
 * kinds          — change types in play ('icon', 'tint', 'swap')
 * tell           — whether the number of changes is told
 * both           — whether "in both scenes" rounds are mixed in; sceneSize, overlap for those
 * rounds, pass   — rounds in the level, perfect rounds to clear it
 * study          — seconds each scene is shown
 */
export const dualConfig = (ageBand, difficulty = 1, levelNo = 1) => {
  const band = dualBand(ageBand);
  const d = clampN(difficulty || 1, 1, 3);
  if (band === 'intermediate') {
    const rounds = 5;
    return {
      band,
      rows: d === 1 ? 3 : d === 2 ? 3 : 4,
      cols: d === 1 ? 3 : 4,
      changes: d === 1 ? [1, 2] : d === 2 ? [2, 3] : [2, 4],
      kinds: d === 1 ? ['icon'] : ['icon', 'tint'],
      tell: d === 1 || (d === 2 && levelNo < 20),
      both: false, sceneSize: 0, overlap: [0, 0],
      rounds, pass: Math.ceil(rounds * 0.6),
      study: d === 1 ? 7 : 6
    };
  }
  const rounds = 6;
  return {
    band,
    rows: 4,
    cols: d === 1 ? 4 : 5,
    changes: d === 1 ? [2, 3] : [2, 5],
    kinds: d === 1 ? ['icon', 'tint'] : ['icon', 'tint', 'swap'],
    tell: false,
    both: true,
    sceneSize: 5 + d,
    overlap: [2, 2 + d],
    rounds, pass: Math.ceil(rounds * 0.6),
    study: d === 3 ? 5 : 6
  };
};

/**
 * A change round: { kind: 'change', rows, cols, a: [{ emoji, name, tint }], b: [...], changed: [index], told }.
 * Pictures inside one scene are all different, so a changed picture is never ambiguous.
 */
export const makeChangeRound = (rng, config) => {
  const count = config.rows * config.cols;
  const icons = shuffle(rng, DUAL_ICONS);
  const a = icons.slice(0, count).map((icon) => ({ ...icon, tint: pick(rng, DUAL_TINTS) }));
  const spare = icons.slice(count);
  const b = a.map((t) => ({ ...t }));
  const target = intBetween(rng, config.changes[0], config.changes[1]);
  const changed = new Set();
  let guard = 0;
  while (changed.size < target && guard++ < 200) {
    const kind = pick(rng, config.kinds);
    const free = Array.from({ length: count }, (_, i) => i).filter((i) => !changed.has(i));
    if (kind === 'swap') {
      if (target - changed.size < 2 || free.length < 2) continue;
      const [i, j] = sample(rng, free, 2);
      [b[i].emoji, b[j].emoji] = [b[j].emoji, b[i].emoji];
      [b[i].name, b[j].name] = [b[j].name, b[i].name];
      changed.add(i);
      changed.add(j);
    } else if (kind === 'tint') {
      const i = pick(rng, free);
      b[i].tint = pick(rng, DUAL_TINTS.filter((t) => t !== a[i].tint));
      changed.add(i);
    } else {
      const i = pick(rng, free);
      const icon = spare.pop();
      b[i] = { ...icon, tint: a[i].tint };
      changed.add(i);
    }
  }
  return {
    kind: 'change', rows: config.rows, cols: config.cols, a, b,
    changed: [...changed].sort((x, y) => x - y), told: config.tell ? changed.size : null
  };
};

/** A "both" round: { kind: 'both', a: [icon], b: [icon], pool: [icon], answer: [emoji] }. */
export const makeBothRound = (rng, config) => {
  const n = config.sceneSize;
  const overlap = intBetween(rng, config.overlap[0], config.overlap[1]);
  const icons = shuffle(rng, DUAL_ICONS);
  const shared = icons.slice(0, overlap);
  const onlyA = icons.slice(overlap, overlap + (n - overlap));
  const onlyB = icons.slice(overlap + (n - overlap), overlap + 2 * (n - overlap));
  const fresh = icons.slice(overlap + 2 * (n - overlap), overlap + 2 * (n - overlap) + 2);
  const a = shuffle(rng, [...shared, ...onlyA]);
  const b = shuffle(rng, [...shared, ...onlyB]);
  // The pool: every shared picture, some from one scene only, and two never shown.
  const decoys = [...sample(rng, onlyA, Math.min(2, onlyA.length)), ...sample(rng, onlyB, Math.min(2, onlyB.length)), ...fresh];
  const pool = shuffle(rng, [...shared, ...decoys]);
  return { kind: 'both', a, b, pool, answer: shared.map((s) => s.emoji) };
};

/** Check a change round: { hits, missed, wrong, perfect }. */
export const checkChanges = (round, tapped) => {
  const want = new Set(round.changed);
  const hits = tapped.filter((i) => want.has(i)).length;
  const wrong = tapped.filter((i) => !want.has(i)).length;
  return { hits, missed: want.size - hits, wrong, perfect: hits === want.size && wrong === 0 };
};

/** Check a both round (picked emojis): { hits, missed, wrong, perfect }. */
export const checkBoth = (round, picked) => {
  const want = new Set(round.answer);
  const hits = picked.filter((e) => want.has(e)).length;
  const wrong = picked.filter((e) => !want.has(e)).length;
  return { hits, missed: want.size - hits, wrong, perfect: hits === want.size && wrong === 0 };
};

export const makeDualLevel = (rng, config) =>
  Array.from({ length: config.rounds }, (_, i) =>
    config.both && i % 2 === 1 ? makeBothRound(rng, config) : makeChangeRound(rng, config));
