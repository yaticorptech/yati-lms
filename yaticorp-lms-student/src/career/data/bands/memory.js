/**
 * Age-band content and rules for the six memory games (2026-11-13): Memory Match, Sequence Recall, Number Recall,
 * Colour Match, Grid Recall and Reverse Recall. Pure — no React, no API — so tests/games/memoryBands.test.js can
 * load it under plain node.
 *
 * Every game asks one config function here for its round: (band, difficulty, levelNo, tier) in, the round's rules out.
 * `band` is progress.ageBand; null (no zone known) plays as 'analytical', which is how the games played before bands.
 * levelNo is already capped at the band's maxStep (zones.js BANDS), so a young band's ramp is measured against its own
 * top step: Foundation reaches the end of its curve at step 12, not at step 30.
 *
 * Every generator takes an optional `rng` (default Math.random) so a test can drive it.
 */
import { BANDS } from '../../components/games/zones.js';

/* ---------------------------------------------------------------- helpers -- */

export const BAND_KEYS = ['foundation', 'developing', 'intermediate', 'analytical', 'advanced'];

/** The band a game plays at: the student's, or 'analytical' (today's behaviour) when none is known. */
export const bandKey = (ageBand) => (BAND_KEYS.includes(ageBand) ? ageBand : 'analytical');

/** young (Classes 1–5), smart (6–10) or master (11–12+). */
export const groupOf = (ageBand) => {
  const b = bandKey(ageBand);
  return b === 'foundation' || b === 'developing' ? 'young' : b === 'advanced' ? 'master' : 'smart';
};

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const lerp = (from, to, r) => Math.round(from + (to - from) * r);

/** How far through the band's own steps a level is, 0…1. */
export const bandRamp = (ageBand, levelNo) => {
  const max = BANDS[bandKey(ageBand)]?.maxStep || 30;
  return clamp01(((Number(levelNo) || 1) - 1) / Math.max(1, max - 1));
};

/** levels.js `between`, over the full thirty steps — the curve the smart bands always used. */
const between = (from, to, levelNo) => lerp(from, to, clamp01(((Number(levelNo) || 1) - 1) / 29));

export const shuffle = (list, rng = Math.random) => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const pickOne = (list, rng = Math.random) => list[Math.floor(rng() * list.length)];

/* ---------------------------------------------------------------- content -- */

/** Picture sets for the young bands. No set holds two near-look-alikes: those come only from LOOKALIKES, on purpose. */
export const PICTURES = {
  animals: ['🐶', '🐱', '🐰', '🐻', '🐼', '🦁', '🐸', '🐵', '🐮', '🐷', '🐔', '🐢'],
  fruits: ['🍎', '🍌', '🍇', '🍓', '🍊', '🍉', '🍍', '🥝', '🍒', '🍐'],
  objects: ['⚽', '🚗', '🎈', '📚', '✏️', '⏰', '🔑', '☂️', '🎁', '🧸'],
  shapes: ['🔴', '🟦', '🔺', '⭐', '🟩', '🟡', '🔶', '❤️', '🌙', '🟪']
};

/** Near-look-alike pairs per picture set — the harder young levels put both on one board. */
export const LOOKALIKES = {
  animals: [['🐶', '🐕'], ['🐱', '🐈'], ['🐰', '🐇'], ['🐮', '🐄'], ['🐷', '🐖']],
  fruits: [['🍎', '🍏'], ['🍊', '🍋'], ['🍑', '🍅'], ['🍐', '🥭']],
  objects: [['🚗', '🚙'], ['⚽', '🏀'], ['📕', '📗'], ['🔑', '🗝️']],
  shapes: [['🔴', '🟠'], ['🟦', '🔵'], ['🔶', '🔸'], ['⭐', '🌟']]
};

/** The original Memory Match faces. */
export const EMOJI_FACES = ['🚀', '🎯', '💡', '🧠', '⚡', '🏆', '🔭', '🧩', '🎨', '🔑', '🎲', '🛰️'];

/** Smart bands: symbols in look-alike families (filled and hollow). */
export const SIMILAR_FAMILIES = [
  ['★', '☆'], ['✦', '✧'], ['◆', '◇'], ['●', '○'], ['▲', '△'],
  ['■', '□'], ['♠', '♤'], ['♥', '♡'], ['♣', '♧'], ['▼', '▽']
];

/** Master Minds: rotations of the same shape. */
export const COMPLEX_FAMILIES = [
  ['◐', '◑', '◒', '◓'],
  ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'],
  ['◰', '◱', '◲', '◳'],
  ['⊕', '⊗', '⊖', '⊘'],
  ['⬡', '⬢']
];

/** Whole families first, so the cards on one board look as alike as possible. */
const fromFamilies = (families, count, rng) => shuffle(families, rng).flat().slice(0, count);

/* ---------------------------------------------------------- memory-match -- */

const colsFor = (pairs) => ({ 3: 3, 4: 4, 5: 5, 6: 3, 8: 4, 10: 5, 12: 6 })[pairs] || 4;

/**
 * Memory Match. kind: 'pictures' (young: one picture set, look-alikes mixed in later), 'emoji', 'similar' (smart),
 * 'complex' (master). Master Minds also get the twist: every card is shown for `previewMs`, then the pairs must be
 * found in the order the queue asks for — a right pair out of turn turns back over.
 */
export function memoryMatchConfig({ ageBand, difficulty = 1, levelNo = 1, tier = 'easy' } = {}) {
  const band = bandKey(ageBand);
  const r = bandRamp(band, levelNo);
  const d = Math.min(3, Math.max(1, difficulty));
  const base = { band, ordered: false, previewMs: 0, lookalikes: 0, theme: null };
  let pairs, kind, factor;
  if (band === 'foundation') {
    pairs = [3, 4, 5, 6][Math.min(3, Math.floor(r * 4))];
    kind = 'pictures';
    base.lookalikes = r >= 0.8 ? 2 : r >= 0.5 ? 1 : 0;
    factor = 3;
  } else if (band === 'developing') {
    pairs = [4, 5, 6, 8][Math.min(3, Math.floor(r * 4))];
    kind = 'pictures';
    base.lookalikes = r >= 0.75 ? 3 : r >= 0.5 ? 2 : r >= 0.25 ? 1 : 0;
    factor = 2.7;
  } else {
    const cols = tier === 'easy' ? 3 : tier === 'medium' ? 4 : d === 3 ? 6 : 5;
    pairs = cols * 2;
    if (band === 'advanced') {
      kind = 'complex';
      factor = d === 3 ? 2.1 : 2.4;
    } else {
      kind = d === 1 && tier === 'easy' ? 'emoji' : 'similar';
      factor = d === 1 ? 2.6 : d === 2 ? 2.2 : 1.9;
    }
  }
  base.lookalikes = Math.min(base.lookalikes, Math.floor(pairs / 2));
  if (band === 'advanced') {
    base.ordered = true;
    base.previewMs = 1500 + pairs * (d === 3 ? 200 : 260);
  }
  return { ...base, pairs, kind, cols: colsFor(pairs), moveBudget: Math.round(pairs * factor) };
}

/** The distinct faces for a board: config.pairs of them, never two alike. */
export function memoryFaces(config, rng = Math.random) {
  if (config.kind === 'pictures') {
    const theme = config.theme || pickOne(Object.keys(PICTURES), rng);
    const twins = shuffle(LOOKALIKES[theme], rng).slice(0, config.lookalikes).flat();
    const faces = [...new Set(twins)];
    for (const face of shuffle(PICTURES[theme], rng)) {
      if (faces.length >= config.pairs) break;
      if (!faces.includes(face)) faces.push(face);
    }
    return faces.slice(0, config.pairs);
  }
  if (config.kind === 'similar') return fromFamilies(SIMILAR_FAMILIES, config.pairs, rng);
  if (config.kind === 'complex') return fromFamilies(COMPLEX_FAMILIES, config.pairs, rng);
  return shuffle(EMOJI_FACES, rng).slice(0, config.pairs);
}

/** The shuffled deck, and (for an ordered round) the order the pairs must be found in. */
export function buildMemoryDeck(config, rng = Math.random) {
  const faces = memoryFaces(config, rng);
  const deck = shuffle(faces.flatMap((face, i) => [{ id: `${i}a`, face }, { id: `${i}b`, face }]), rng);
  return { deck, order: config.ordered ? shuffle(faces, rng) : null };
}

/* -------------------------------------------------------- sequence-recall -- */

/** Pad colours, lit and resting. Literal class strings, so Tailwind finds them. */
const PAD_TONES = [
  { on: 'bg-rose-400', off: 'bg-rose-500/30' },
  { on: 'bg-sky-400', off: 'bg-sky-500/30' },
  { on: 'bg-emerald-400', off: 'bg-emerald-500/30' },
  { on: 'bg-amber-300', off: 'bg-amber-500/30' },
  { on: 'bg-violet-400', off: 'bg-violet-500/30' },
  { on: 'bg-orange-400', off: 'bg-orange-500/30' },
  { on: 'bg-teal-400', off: 'bg-teal-500/30' },
  { on: 'bg-pink-400', off: 'bg-pink-500/30' }
];
const YOUNG_PAD_FACES = [['⭐', 'Star'], ['🍎', 'Apple'], ['🐶', 'Dog'], ['🚗', 'Car'], ['🌙', 'Moon'], ['🎈', 'Balloon']];
const MIXED_PAD_FACES = [['▲', 'Triangle'], ['7', 'Seven'], ['●', 'Circle'], ['3', 'Three'], ['■', 'Square'], ['9', 'Nine'], ['◆', 'Diamond'], ['5', 'Five']];

export const sequencePads = (faces, count) =>
  faces.slice(0, count).map(([label, name], id) => ({ id, label, name, ...PAD_TONES[id] }));

/**
 * Sequence Recall. The run starts at `start` and grows by one per success up to `maxRun`; `target` clears the level.
 * Young bands play picture pads, slowly, with a short ceiling and fixed-score stars. Master Minds get rule rounds.
 */
export function sequenceConfig({ ageBand, difficulty = 1, levelNo = 1 } = {}) {
  const band = bandKey(ageBand);
  const r = bandRamp(band, levelNo);
  const d = Math.min(3, Math.max(1, difficulty));
  if (band === 'foundation') {
    const target = lerp(2, 4, r);
    return { band, young: true, pads: sequencePads(YOUNG_PAD_FACES, 4), start: 1, target, maxRun: target + 1, pace: lerp(950, 800, r), rules: false };
  }
  if (band === 'developing') {
    const target = lerp(3, 6, r);
    return { band, young: true, pads: sequencePads(YOUNG_PAD_FACES, r >= 0.5 ? 6 : 4), start: 1, target, maxRun: target + 1, pace: lerp(850, 650, r), rules: false };
  }
  const pace = Math.max(220, between(640, 380, levelNo) - (d - 1) * 70);
  if (band === 'advanced') {
    const target = between(5, 9, levelNo) + (d - 2) * 2;
    return { band, young: false, pads: sequencePads(MIXED_PAD_FACES, 8), start: 3, target, maxRun: Math.ceil(target * 1.5), pace, rules: true, evenRule: d === 3 };
  }
  const target = between(4, 9, levelNo) + (d - 1) * 2;
  const padCount = band === 'analytical' && d >= 2 ? 8 : 6;
  return { band, young: false, pads: sequencePads(MIXED_PAD_FACES, padCount), start: 2, target, maxRun: Math.ceil(target * 1.5), pace, rules: false };
}

export const SEQUENCE_RULES = {
  forward: { label: 'Same order', hint: 'Play it back in the same order.' },
  reverse: { label: 'Backwards', hint: 'Play it back BACKWARDS — last one first.' },
  even: { label: 'Even spots only', hint: 'Play back only the 2nd, 4th, 6th… ones, in order.' }
};

/** The rule for the next playback. Only Master Minds get anything but 'forward', and never on a run shorter than 3. */
export function sequenceRule(config, length, rng = Math.random) {
  if (!config.rules || length < 3) return 'forward';
  const x = rng();
  if (config.evenRule && length >= 4 && x < 0.2) return 'even';
  return x < 0.5 ? 'reverse' : 'forward';
}

/** What the student must press, in order, for a sequence under a rule. */
export function expectedInput(order, rule) {
  if (rule === 'reverse') return [...order].reverse();
  if (rule === 'even') return order.filter((_, i) => i % 2 === 1);
  return [...order];
}

/* ---------------------------------------------------------- number-recall -- */

export const makeDigits = (length, rng = Math.random) =>
  Array.from({ length }, () => Math.floor(rng() * 10)).join('');

/**
 * Number Recall. mode 'single' (one number, typed back) or 'dual' (Master Minds: two numbers in a row, then one of
 * them is asked for). The number grows by one per success, to `maxLen`. showMs(len) is how long it stays up.
 */
export function numberRecallConfig({ ageBand, difficulty = 1, levelNo = 1 } = {}) {
  const band = bandKey(ageBand);
  const r = bandRamp(band, levelNo);
  const d = Math.min(3, Math.max(1, difficulty));
  if (band === 'foundation') {
    return { band, young: true, mode: 'single', start: 2, target: r >= 0.6 ? 4 : 3, maxLen: 5, baseMs: 1600, perDigitMs: 650 };
  }
  if (band === 'developing') {
    return { band, young: true, mode: 'single', start: r >= 0.5 ? 3 : 2, target: r >= 0.5 ? 5 : 4, maxLen: 6, baseMs: 1100, perDigitMs: 450 };
  }
  if (band === 'advanced') {
    const target = between(4, 7, levelNo) + (d - 2);
    return {
      band, young: false, mode: 'dual', start: 3 + (d - 2), target, maxLen: Math.ceil(target * 1.5),
      baseMs: Math.max(900, between(2600, 1500, levelNo) - (d - 2) * 300), perDigitMs: 0
    };
  }
  const target = between(5, 9, levelNo) + (d - 1) * 2;
  return {
    band, young: false, mode: 'single', start: between(3, 6, levelNo) + (d - 1), target, maxLen: Math.ceil(target * 1.5),
    baseMs: Math.max(700, between(3000, 1600, levelNo) - (d - 1) * 400), perDigitMs: 0
  };
}

export const showMsFor = (config, length) => config.baseMs + config.perDigitMs * length;

/** A dual round: two numbers of `length` digits, never the same, and which one is asked for. */
export function dualRound(length, rng = Math.random) {
  const first = makeDigits(length, rng);
  let second = makeDigits(length, rng);
  while (second === first) second = makeDigits(length, rng);
  const ask = rng() < 0.5 ? 'first' : 'second';
  return { first, second, ask, answer: ask === 'first' ? first : second };
}

/* ----------------------------------------------------------- colour-match -- */

// `edge` is the deeper shade each answer key sinks into (see .cm-key).
export const INKS = [
  { name: 'RED', label: 'Red', class: 'text-rose-500', button: 'bg-gradient-to-b from-rose-400 to-rose-500', edge: '#be123c' },
  { name: 'BLUE', label: 'Blue', class: 'text-sky-500', button: 'bg-gradient-to-b from-sky-400 to-sky-500', edge: '#0369a1' },
  { name: 'GREEN', label: 'Green', class: 'text-emerald-500', button: 'bg-gradient-to-b from-emerald-400 to-emerald-500', edge: '#047857' },
  { name: 'YELLOW', label: 'Yellow', class: 'text-yellow-400', button: 'bg-gradient-to-b from-yellow-300 to-yellow-400', edge: '#a16207' },
  { name: 'PURPLE', label: 'Purple', class: 'text-violet-500', button: 'bg-gradient-to-b from-violet-400 to-violet-500', edge: '#6d28d9' }
];
export const BLOB_SHAPES = ['circle', 'square', 'triangle', 'star', 'heart'];

/**
 * Colour Match. mode 'blob' (a coloured shape; tap its colour — no reading), 'stroop' (a colour word in another ink;
 * tap the ink), or 'switch' (Master Minds: a cue says whether to tap the INK or the WORD, and flips). `stroopShare`
 * mixes word cards into a blob round (Developing, later levels). `penalty`: a wrong answer takes a point off.
 */
export function colourConfig({ ageBand, difficulty = 1, levelNo = 1 } = {}) {
  const band = bandKey(ageBand);
  const r = bandRamp(band, levelNo);
  const d = Math.min(3, Math.max(1, difficulty));
  if (band === 'foundation') {
    return { band, young: true, mode: 'blob', colours: r >= 0.4 ? 4 : 3, stroopShare: 0, matchChance: 0, seconds: 45, target: lerp(6, 12, r), shuffleKeys: false, penalty: false };
  }
  if (band === 'developing') {
    return { band, young: true, mode: 'blob', colours: 4, stroopShare: r >= 0.5 ? 0.5 : 0, matchChance: 0.4, seconds: lerp(45, 40, r), target: lerp(8, 15, r), shuffleKeys: false, penalty: false };
  }
  const matchChance = Math.max(0.05, 0.4 - clamp01((levelNo - 1) / 29) * 0.3);
  if (band === 'advanced') {
    return {
      band, young: false, mode: 'switch', colours: d === 3 ? 5 : 4, stroopShare: 1, matchChance: 0,
      switchChance: d === 3 ? 0.45 : 0.35, seconds: 45, target: between(8, 16, levelNo) + (d - 2) * 3, shuffleKeys: false, penalty: true
    };
  }
  const analytical = band === 'analytical';
  return {
    band, young: false, mode: 'stroop', colours: analytical && d === 3 ? 5 : 4, stroopShare: 1, matchChance,
    seconds: between(45, 35, levelNo) - (analytical && d >= 2 ? 5 : 0), target: between(8, 20, levelNo) + (d - 1) * 3,
    shuffleKeys: analytical && d >= 2, penalty: false
  };
}

/**
 * One card. { kind: 'blob'|'word', ink, word, shape, rule: 'ink'|'word', answer } — `answer` is the INKS name the
 * right key carries: the ink, or under the WORD rule the colour the word names. A switch card never has word and ink
 * agree, so the rule always decides the answer.
 */
export function makeColourCard(config, prevRule = 'ink', rng = Math.random) {
  const palette = INKS.slice(0, config.colours);
  const ink = pickOne(palette, rng);
  const wordCard = config.mode !== 'blob' || rng() < config.stroopShare;
  if (!wordCard) {
    return { kind: 'blob', ink, word: null, shape: pickOne(BLOB_SHAPES, rng), rule: 'ink', answer: ink.name };
  }
  let word = ink;
  const agree = config.mode !== 'switch' && rng() < config.matchChance;
  if (!agree) {
    const others = palette.filter((c) => c.name !== ink.name);
    word = pickOne(others, rng);
  }
  let rule = 'ink';
  if (config.mode === 'switch') rule = rng() < config.switchChance ? (prevRule === 'ink' ? 'word' : 'ink') : prevRule;
  return { kind: 'word', ink, word: word.name, shape: null, rule, answer: rule === 'ink' ? ink.name : word.name };
}

/* ----------------------------------------------------------- grid-recall -- */

const GRID_PICTURES = ['🍎', '⭐', '🐶', '🚗', '🎈', '🐱', '🌙', '⚽', '🍌', '🐸'];

/**
 * Grid Recall. Young bands see pictures appear in cells (`pictures`); Master Minds see two patterns one after the
 * other (`twoStage`) and recall the SECOND first, then the FIRST.
 */
/*
 * From level 2 the young bands put the pictures back (2026-11-18, the user): the pictures show and hide, then 4
 * choices sit under the grid — the shown pictures and look-alikes that were never there — and each one is picked
 * and placed on the square where it was. Level 1 stays "tap where they were".
 */
const PLACE_FROM_LEVEL = 2;
const PLACE_CHOICES = 4;
const placeMode = (levelNo) => ((levelNo || 1) >= PLACE_FROM_LEVEL ? { place: true, choices: PLACE_CHOICES } : { place: false });

/*
 * Lit tiles for Rising Brains and Master Minds (2026-11-18, the user: "start easy — they should keep on playing"):
 * easy 3; medium 4, then 5 from level 15; hard 5, then 6 from level 25.
 */
const gridLit = (d, levelNo = 1) => (d === 1 ? 3 : d === 2 ? (levelNo >= 15 ? 5 : 4) : levelNo >= 25 ? 6 : 5);

export function gridConfig({ ageBand, difficulty = 1, levelNo = 1 } = {}) {
  const band = bandKey(ageBand);
  const r = bandRamp(band, levelNo);
  const d = Math.min(3, Math.max(1, difficulty));
  if (band === 'foundation') {
    return { band, young: true, size: 3, lit: lerp(2, 3, r), showMs: lerp(2600, 2000, r), rounds: 5, target: 3, pictures: true, twoStage: false, ...placeMode(levelNo) };
  }
  if (band === 'developing') {
    const place = placeMode(levelNo);
    // Placing is harder than tapping: at most 4 pictures to put back, so every one of them is among the 4 choices.
    return { band, young: true, size: r >= 0.5 ? 4 : 3, lit: place.place ? Math.min(4, lerp(3, 5, r)) : lerp(3, 5, r), showMs: lerp(2200, 1600, r) + (place.place ? 600 : 0), rounds: 5, target: r >= 0.5 ? 4 : 3, pictures: true, twoStage: false, ...place };
  }
  if (band === 'advanced') {
    // One pattern only (2026-11-18, the user: "two sets appear — make it one").
    return { band, young: false, size: d === 3 ? 5 : 4, lit: gridLit(d, levelNo), showMs: between(1900, 1300, levelNo), rounds: 5, target: between(3, 4, levelNo), pictures: false, twoStage: false };
  }
  return {
    band, young: false, size: d === 3 ? 5 : 4, lit: gridLit(d, levelNo),
    showMs: between(1600, 900, levelNo), rounds: 5, target: between(3, 5, levelNo), pictures: false, twoStage: false
  };
}

/**
 * Every round of a Grid Recall level, drawn up front: { first: cells[], second: cells[] (twoStage, disjoint from
 * first), pictures: { cell: emoji } (young) }.
 */
export function gridRounds(config, rng = Math.random) {
  const cells = config.size * config.size;
  const lit = Math.min(config.lit, config.twoStage ? Math.floor(cells / 2) : cells - 1);
  return Array.from({ length: config.rounds }, () => {
    const order = shuffle([...Array(cells).keys()], rng);
    const first = order.slice(0, lit);
    const second = config.twoStage ? order.slice(lit, lit * 2) : [];
    const pictures = {};
    if (config.pictures) {
      const faces = shuffle(GRID_PICTURES, rng);
      first.forEach((cell, i) => { pictures[cell] = faces[i % faces.length]; });
    }
    // Place mode: the shown pictures, topped up to 4 with ones that were not on the grid, shuffled.
    const choices = config.place ? shuffle([...new Set([...first.map((c) => pictures[c]), ...shuffle(GRID_PICTURES, rng)])].slice(0, Math.max(config.choices, first.length)), rng) : [];
    return { first, second, pictures, choices };
  });
}

/* ---------------------------------------------------------- reverse-recall -- */

const REVERSE_PICTURES = ['🐶', '🍎', '⭐', '🚗', '🎈', '🐱', '🌙', '⚽', '🍌', '🐸', '🌸', '🐟'];

/**
 * Reverse Recall. mode 'pictures' (tap the pictures back, last first), 'digits' (type the number backwards) or
 * 'plus1' (Master Minds: backwards, and every digit one bigger — 9 becomes 0).
 */
export function reverseConfig({ ageBand, difficulty = 1, levelNo = 1 } = {}) {
  const band = bandKey(ageBand);
  const r = bandRamp(band, levelNo);
  const d = Math.min(3, Math.max(1, difficulty));
  if (band === 'foundation') {
    return { band, young: true, mode: 'pictures', start: 2, target: 3, maxLen: 4, padSize: 4, baseMs: 1200, perItemMs: 900 };
  }
  if (band === 'developing') {
    return r < 0.5
      ? { band, young: true, mode: 'pictures', start: 3, target: 4, maxLen: 5, padSize: 6, baseMs: 1000, perItemMs: 700 }
      : { band, young: true, mode: 'digits', start: 3, target: lerp(4, 5, r), maxLen: 6, baseMs: 1200, perItemMs: 500 };
  }
  if (band === 'advanced') {
    const target = between(4, 7, levelNo) + (d - 2);
    return {
      band, young: false, mode: 'plus1', start: 3 + (d - 2), target, maxLen: Math.ceil(target * 1.5),
      baseMs: Math.max(1000, between(3200, 2000, levelNo) - (d - 2) * 350), perItemMs: 0
    };
  }
  const target = between(4, 8, levelNo) + (d - 1) * 2;
  return {
    band, young: false, mode: 'digits', start: between(3, 5, levelNo) + (d - 1), target, maxLen: Math.ceil(target * 1.5),
    baseMs: Math.max(900, between(3200, 1900, levelNo) - (d - 1) * 350), perItemMs: 0
  };
}

/** A picture round: `length` distinct pictures, and a pad of config.padSize holding all of them (shuffled). */
export function pictureRound(length, padSize, rng = Math.random) {
  const pool = shuffle(REVERSE_PICTURES, rng);
  const shown = pool.slice(0, length);
  const pad = shuffle(pool.slice(0, Math.max(length, padSize)), rng);
  return { shown, pad, answer: [...shown].reverse() };
}

/** The answer to a digit round: backwards, and under 'plus1' each digit one bigger (9 wraps to 0). */
export function reverseAnswer(digits, mode) {
  const back = String(digits).split('').reverse();
  return (mode === 'plus1' ? back.map((c) => String((Number(c) + 1) % 10)) : back).join('');
}
