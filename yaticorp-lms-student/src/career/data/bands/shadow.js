/**
 * Shadow Detective — the rounds, pure and seeded so a test can deal thousands.
 *
 * A round shows the shadow of one thing (or, for older players, two things
 * overlapping) and a row of coloured choices. The shadow is the same emoji
 * drawn with `filter: brightness(0)`, so it always matches its choice exactly.
 *
 * Every item sits in a look-alike pair (🐈/🐆, 🍐/🍎 …), and every pair in a
 * shape family. Young players get choices from different pairs only; older
 * players get the target's twin as a decoy, a turned shadow, or a shadow with a
 * cloud over part of it. As the level rises the other choices come more and
 * more from the target's own family.
 */
import { pick, shuffle } from '../seeded.js';

/** Look-alike pairs: each is [emoji, name]. Twins share a rough outline. */
export const PAIRS = [
  [['🐈', 'cat'], ['🐆', 'leopard']],
  [['🍐', 'pear'], ['🍎', 'apple']],
  [['🐘', 'elephant'], ['🦏', 'rhino']],
  [['🐇', 'rabbit'], ['🐿️', 'squirrel']],
  [['🦒', 'giraffe'], ['🦕', 'dinosaur']],
  [['🐢', 'turtle'], ['🐌', 'snail']],
  [['✈️', 'aeroplane'], ['🚁', 'helicopter']],
  [['🚗', 'car'], ['🚌', 'bus']],
  [['🎸', 'guitar'], ['🎻', 'violin']],
  [['🔨', 'hammer'], ['🔧', 'spanner']],
  [['☂️', 'umbrella'], ['🍄', 'mushroom']],
  [['🐓', 'rooster'], ['🦆', 'duck']],
  [['🐟', 'fish'], ['🐬', 'dolphin']],
  [['🦋', 'butterfly'], ['🐝', 'bee']],
  [['🍌', 'banana'], ['🌙', 'moon']],
  [['🏠', 'house'], ['⛺', 'tent']],
  [['🔑', 'key'], ['🗝️', 'old key']],
  [['🥕', 'carrot'], ['🌶️', 'chilli']],
  [['🐎', 'horse'], ['🦌', 'deer']],
  [['🐧', 'penguin'], ['🦉', 'owl']],
  [['🌵', 'cactus'], ['🌲', 'tree']],
  [['🚲', 'bicycle'], ['🛵', 'scooter']],
  [['🦀', 'crab'], ['🕷️', 'spider']],
  [['⚽', 'ball'], ['🍪', 'cookie']]
];

/*
 * Shape families (2026-11-18, the user: "as level increases keep similar looking shadows"): pairs whose
 * outlines are alike as a group — four-legged animals, little creatures, birds and swimmers, round and curved
 * food, vehicles, held things, tall things. Higher levels fill the choices from the target's family.
 */
const FAMILY_OF = {
  cat: 'quad', elephant: 'quad', horse: 'quad', giraffe: 'quad',
  rabbit: 'small', turtle: 'small', crab: 'small', butterfly: 'small',
  rooster: 'bird', penguin: 'bird', fish: 'bird',
  pear: 'food', ball: 'food', banana: 'food', carrot: 'food',
  aeroplane: 'ride', car: 'ride', bicycle: 'ride',
  guitar: 'held', hammer: 'held', key: 'held',
  umbrella: 'tall', house: 'tall', cactus: 'tall'
};

/** Every item, with the index of its pair and its shape family. */
export const ITEMS = PAIRS.flatMap((pair, group) => pair.map(([emoji, name]) => ({ emoji, name, group, family: FAMILY_OF[pair[0][1]] })));

const twinOf = (item) => ITEMS.find((it) => it.group === item.group && it.emoji !== item.emoji);

/** The age bands this game plays as. Anything older than intermediate plays intermediate; unknown plays developing. */
export const shadowBand = (ageBand) =>
  ageBand === 'foundation' ? 'foundation' : ageBand === 'developing' || !ageBand ? 'developing' : 'intermediate';

const clampN = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const ramp = (from, to, levelNo) => Math.round(from + (to - from) * clampN((levelNo - 1) / 29, 0, 1));

/**
 * How a level plays, by band, difficulty (1–3) and step (1–30).
 *  rounds, pass   — fixed run of shadows, how many first-try right clears it
 *  choices        — how many buttons
 *  twins          — chance a single round brings the target's look-alike as a decoy
 *  turn, hide     — chance the shadow is turned / partly covered
 *  pairs          — chance a round is a two-shadow scene
 *  seconds        — per shadow
 *  similar        — chance a single round's other choices come from the target's shape family; grows with the level
 */
export const shadowConfig = (ageBand, difficulty = 1, levelNo = 1) => {
  const band = shadowBand(ageBand);
  const d = clampN(difficulty || 1, 1, 3);
  if (band === 'foundation') {
    const rounds = 5 + (d >= 3 ? 1 : 0);
    // Still no twins for the youngest, but same-family choices creep in from level 2.
    return { band, rounds, pass: rounds - 2, choices: 3, twins: 0, turn: 0, hide: 0, pairs: 0, seconds: ramp(25, 18, levelNo), similar: clampN((levelNo - 1) * 0.1, 0, 0.8) };
  }
  if (band === 'developing') {
    const rounds = ramp(6, 8, levelNo);
    const similar = clampN(0.2 + (levelNo - 1) * 0.12, 0, 1);
    return {
      band, rounds, pass: Math.ceil(rounds * 0.6),
      choices: clampN(ramp(4, 5, levelNo) + (d - 1), 4, 5),
      similar,
      twins: Math.max(0.4 + 0.15 * (d - 1), similar),
      turn: d === 1 ? 0.3 * clampN((levelNo - 1) / 29, 0, 1) : 0.3 + 0.1 * d,
      hide: d >= 3 ? 0.25 : 0,
      pairs: 0,
      seconds: ramp(18, 12, levelNo) - (d - 1)
    };
  }
  const rounds = ramp(7, 9, levelNo);
  const similar = clampN(0.5 + (levelNo - 1) * 0.15, 0, 1);
  return {
    band, rounds, pass: Math.ceil(rounds * 0.6),
    choices: clampN(5 + (d >= 2 ? 1 : 0), 5, 6),
    similar,
    twins: Math.max(0.6, similar),
    turn: 0.4 + 0.1 * d,
    hide: 0.2 + 0.1 * d,
    pairs: 0.35 + 0.1 * d,
    seconds: ramp(16, 11, levelNo) - (d - 1)
  };
};

const TURNS = [90, 180, 270, 45, -45];
const HIDES = ['top', 'right', 'bottom', 'left'];

/** One item from a pair not in `usedGroups`. */
const freshItem = (rng, usedGroups) => pick(rng, ITEMS.filter((it) => !usedGroups.has(it.group)));

/**
 * One round.
 *  single: { kind: 'single', targets: [item], choices: [item…], turn: deg, hide: side|null }
 *  pair:   { kind: 'pair',   targets: [a, b], choices: [item…] }
 * `choices` hold every target exactly once and no emoji twice.
 */
export const makeShadowRound = (rng, config) => {
  const n = clampN(config.choices, 3, 6);
  const isPair = rng() < (config.pairs || 0);
  const used = new Set();
  const targets = [];
  const count = isPair ? 2 : 1;
  for (let i = 0; i < count; i++) {
    const it = freshItem(rng, used);
    used.add(it.group);
    targets.push(it);
  }
  const decoys = [];
  // Look-alikes: the twin of a target, which shares its outline but is not it.
  for (const t of targets) {
    if (decoys.length + targets.length < n && rng() < (config.twins || 0)) decoys.push(twinOf(t));
  }
  // Young players: no twin on the board, so every other choice is a different kind of thing.
  const blocked = new Set([...targets.map((t) => t.group), ...decoys.map((t) => t.group)]);
  const pool = ITEMS.filter((it) => !blocked.has(it.group));
  // A look-alike round (more likely as the level rises): the target's shape family comes first, so the
  // choices are all of a kind — four-legged animals against a four-legged shadow — and only the outline tells.
  const alike = !isPair && rng() < (config.similar || 0);
  const family = targets[0].family;
  const ordered = alike
    ? [...shuffle(rng, pool.filter((it) => it.family === family)), ...shuffle(rng, pool.filter((it) => it.family !== family))]
    : shuffle(rng, pool);
  // One item per pair at most for fillers, so the fillers never twin each other on young boards.
  const fillers = [];
  for (const it of ordered) {
    if (decoys.length + targets.length + fillers.length >= n) break;
    if (fillers.some((f) => f.group === it.group)) continue;
    fillers.push(it);
  }
  const choices = shuffle(rng, [...targets, ...decoys, ...fillers]);
  if (isPair) return { kind: 'pair', targets, choices };
  return {
    kind: 'single',
    targets,
    choices,
    turn: rng() < (config.turn || 0) ? pick(rng, TURNS) : 0,
    hide: rng() < (config.hide || 0) ? pick(rng, HIDES) : null
  };
};

/** A level's rounds: no target repeats inside one level while there are items left. */
export const makeShadowLevel = (rng, config) => {
  const rounds = [];
  const seen = new Set();
  for (let i = 0; i < config.rounds; i++) {
    let round = makeShadowRound(rng, config);
    for (let tries = 0; tries < 8 && round.targets.some((t) => seen.has(t.emoji)); tries++) round = makeShadowRound(rng, config);
    round.targets.forEach((t) => seen.add(t.emoji));
    rounds.push(round);
  }
  return rounds;
};
