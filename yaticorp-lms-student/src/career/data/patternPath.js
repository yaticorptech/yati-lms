/**
 * Pattern Path, in pictures (2026-11-18, the user: "redesign this, make it attractive"). For the young section.
 *
 * A round is a row of pictures that repeats a little unit — 🐱🎈, 🐱🐱🎈, 🐱🎈🍌 … — and one spot to fill: the next
 * one, or (later) a gap in the middle. Some rounds grow instead of repeat (🍎, 🍎🍎, 🍎🍎🍎, ?). Four picture choices.
 * After the tap the unit is shown, so the student sees WHY. Pure and seeded so a test can deal thousands.
 */
import { pick, shuffle } from './seeded.js';

export const GAP = '?';

/** Picture sets: a round draws its pictures from one, so they look like they belong together. */
const SETS = [
  ['🐱', '🐶', '🐰', '🐸', '🐵', '🐼'],
  ['🍎', '🍌', '🍇', '🍓', '🍊', '🍉'],
  ['🔴', '🔵', '🟢', '🟡', '🟣', '🟠'],
  ['⭐', '❤️', '🔺', '🟦', '🌙', '☀️'],
  ['🚗', '🚌', '🚲', '✈️', '🚀', '🚂'],
  ['🌸', '🌻', '🌷', '🍀', '🍄', '🌵'],
  ['🎈', '🎁', '🎂', '🧸', '🪁', '⚽']
];

/** The units, by how hard they are to see. Letters stand for pictures. */
const EASY = ['AB', 'AAB', 'ABB'];
const MID = ['ABC', 'AABB', 'ABB', 'AAB'];
const HARD = ['ABCD', 'ABAC', 'AABC', 'ABCC', 'AABBC'];

/** The look of a round's row — changes round to round. */
export const STYLES = ['beads', 'train', 'stones'];

/** How a level plays: rounds, which units, gaps in the middle, growing rounds, the clock. */
export const patternConfig = (levelNo = 1) => {
  const units = levelNo <= 4 ? EASY : levelNo <= 12 ? [...EASY, ...MID] : [...MID, ...HARD];
  const rounds = Math.min(8, 5 + Math.floor((levelNo - 1) / 8));
  return { rounds, pass: Math.ceil(rounds * 0.6), units, gaps: levelNo >= 8, growing: levelNo >= 4, seconds: rounds * 20 };
};

const UNIT_WHY = (unit) => unit.join(' ');

/** A repeating round. */
const repeatRound = (rng, cfg) => {
  const shape = pick(rng, cfg.units);
  const letters = [...new Set(shape)];
  const set = shuffle(rng, pick(rng, SETS));
  const sym = Object.fromEntries(letters.map((l, i) => [l, set[i]]));
  const unit = [...shape].map((l) => sym[l]);
  const length = Math.max(5, Math.min(9, unit.length * 2 + 1 + Math.floor(rng() * unit.length)));
  const full = Array.from({ length: length + 1 }, (_, i) => unit[i % unit.length]);
  // The spot to fill: the next one, or later a gap somewhere after the first full unit.
  const gapAt = cfg.gaps && rng() < 0.4 ? unit.length + Math.floor(rng() * (length - unit.length)) : length;
  const answer = full[gapAt];
  const row = gapAt === length ? [...full.slice(0, length), GAP] : full.slice(0, length).map((s, i) => (i === gapAt ? GAP : s));
  // Choices: every picture in the unit, topped up with ones from the same set that are not in it.
  const extra = set.filter((s) => !unit.includes(s));
  const options = shuffle(rng, [...new Set([answer, ...letters.map((l) => sym[l]), ...extra])].slice(0, 4));
  const before = gapAt === 0 ? null : full[gapAt - 1];
  return {
    kind: 'repeat', row, gapAt, answer, options: options.map((e) => ({ type: 'pic', e })), answerIndex: options.indexOf(answer), unit,
    why: `The pattern repeats ${UNIT_WHY(unit)}. ${before ? `After ${before} comes ${answer}.` : `It starts with ${answer}.`}`
  };
};

/** A growing round: one more each time. */
const growRound = (rng) => {
  const e = pick(rng, pick(rng, SETS));
  const from = 1 + Math.floor(rng() * 2);
  const steps = 3;
  const row = Array.from({ length: steps }, (_, i) => ({ type: 'group', e, n: from + i }));
  const n = from + steps;
  const counts = shuffle(rng, [n, n - 1, n + 1, n + 2]);
  return {
    kind: 'grow', row: [...row, GAP], gapAt: steps, answer: n,
    options: counts.map((k) => ({ type: 'group', e, n: k })), answerIndex: counts.indexOf(n), unit: null,
    why: `Each step has one more ${e}: ${row.map((r) => r.n).join(', ')} — so next is ${n}!`
  };
};

/** A level's rounds, the look changing every round and a growing round now and then. */
export const makePatternLevel = (rng, levelNo = 1) => {
  const cfg = patternConfig(levelNo);
  const styles = shuffle(rng, STYLES);
  return Array.from({ length: cfg.rounds }, (_, i) => {
    const round = cfg.growing && i % 3 === 2 ? growRound(rng) : repeatRound(rng, cfg);
    return { ...round, style: styles[i % styles.length] };
  });
};
