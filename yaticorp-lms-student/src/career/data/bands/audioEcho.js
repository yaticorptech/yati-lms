/**
 * Audio Echo (2026-11-16, remade: the title kept, the game new). Rising Brains · Memory & Focus; id "grid-navigator".
 * Pure and seeded.
 *
 * Listening missions, mixed in every session:
 *   count — a quick stream of sounds plays (no lights): how many times did you hear the target sound?
 *   spot  — tap "Heard it!" every time the target sound plays; leave the others (a false tap costs)
 *   words — a voice reads a list of words; then pick every word you heard from a grid
 * Levels make streams longer and faster, add sounds and words, and leave less room for slips.
 */
import { intBetween, sample, shuffle } from '../seeded.js';

export const SOUNDS = [
  // Instruments
  { key: 'bell', name: 'Bell', emoji: '🔔', cat: 'instruments' },
  { key: 'drum', name: 'Drum', emoji: '🥁', cat: 'instruments' },
  { key: 'piano', name: 'Piano', emoji: '🎹', cat: 'instruments' },
  { key: 'drop', name: 'Water Drop', emoji: '💧', cat: 'instruments' },
  // Animals
  { key: 'dog', name: 'Dog', emoji: '🐶', cat: 'animals' },
  { key: 'cat', name: 'Cat', emoji: '🐱', cat: 'animals' },
  { key: 'cow', name: 'Cow', emoji: '🐮', cat: 'animals' },
  { key: 'duck', name: 'Duck', emoji: '🦆', cat: 'animals' },
  { key: 'bird', name: 'Bird', emoji: '🐦', cat: 'animals' },
  // Home & city
  { key: 'phone', name: 'Phone', emoji: '📱', cat: 'home' },
  { key: 'knock', name: 'Door Knock', emoji: '🚪', cat: 'home' },
  { key: 'doorbell', name: 'Doorbell', emoji: '🛎️', cat: 'home' },
  { key: 'clock', name: 'Clock', emoji: '⏰', cat: 'home' },
  { key: 'horn', name: 'Car Horn', emoji: '🚗', cat: 'home' },
  // Nature
  { key: 'thunder', name: 'Thunder', emoji: '⛈️', cat: 'nature' },
  { key: 'rain', name: 'Rain', emoji: '🌧️', cat: 'nature' },
  { key: 'wind', name: 'Wind', emoji: '🌬️', cat: 'nature' },
  { key: 'waves', name: 'Waves', emoji: '🌊', cat: 'nature' }
];
export const CATEGORIES = {
  instruments: { name: 'Instruments', icon: '🎵' },
  animals: { name: 'Animals', icon: '🐾' },
  home: { name: 'Home & City', icon: '🏠' },
  nature: { name: 'Nature', icon: '🌿' },
  mixed: { name: 'Mixed sounds', icon: '🎧' },
  tricky: { name: 'Sound-alikes', icon: '🧠' }
};

/**
 * Which sounds a level plays (2026-11-16, the user: different categories, harder as levels climb):
 * one category at a time first, then two mixed, then sounds that are easy to confuse.
 */
const PLAN = [
  [2, 'instruments', ['bell', 'drum', 'piano', 'drop']],
  [4, 'animals', ['dog', 'cat', 'cow', 'duck']],
  [6, 'home', ['phone', 'knock', 'doorbell', 'horn']],
  [8, 'nature', ['thunder', 'rain', 'wind', 'waves']],
  [10, 'mixed', ['bell', 'drum', 'piano', 'dog', 'cat', 'cow']],
  [12, 'mixed', ['phone', 'doorbell', 'horn', 'rain', 'wind', 'waves']],
  [99, 'tricky', ['bell', 'doorbell', 'drop', 'rain', 'dog', 'duck', 'knock', 'clock']]
];
export const soundsFor = (n) => PLAN.find(([upTo]) => n <= upTo);
export const WORDS = {
  fruits: ['mango', 'apple', 'banana', 'grape', 'orange', 'papaya', 'guava', 'cherry', 'lemon', 'melon', 'peach', 'plum'],
  animals: ['tiger', 'zebra', 'monkey', 'camel', 'eagle', 'rabbit', 'turtle', 'parrot', 'panda', 'whale', 'horse', 'otter'],
  things: ['kite', 'pencil', 'clock', 'bottle', 'ladder', 'candle', 'mirror', 'basket', 'helmet', 'rocket', 'button', 'wallet']
};

const clampN = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/** A level's setup. Classes 9–10 start two steps on. */
export const echoConfig = (ageBand, difficulty = 1, levelNo = 1) => {
  const band = ageBand === 'analytical' ? 'analytical' : 'intermediate';
  const n = clampN(levelNo + (band === 'analytical' ? 2 : 0) + ((difficulty || 1) - 1), 1, 40);
  return {
    band,
    n,
    category: soundsFor(n)[1],
    sounds: soundsFor(n)[2],
    gapMs: Math.max(380, 720 - n * 20),
    countLength: clampN(6 + n, 7, 18),
    spotLength: clampN(9 + n, 10, 20),
    words: clampN(4 + Math.floor(n / 3), 4, 9),
    slips: n <= 3 ? 1 : 0, // false taps allowed in "spot"
    rounds: 6,
    pass: 4
  };
};

/** A stream of sounds with exactly `hits` of the target (never two targets back to back on easy levels). */
const stream = (rng, sounds, target, length, hits, apart) => {
  for (;;) {
    const others = sounds.filter((s) => s !== target);
    const seq = Array.from({ length }, () => others[intBetween(rng, 0, others.length - 1)]);
    const spots = shuffle(rng, Array.from({ length: length - 1 }, (_, i) => i + 1)).slice(0, hits).sort((a, b) => a - b);
    if (apart && spots.some((p, i) => i && p - spots[i - 1] < 2)) continue;
    spots.forEach((p) => { seq[p] = target; });
    return seq;
  }
};

const countRound = (rng, c) => {
  const target = c.sounds[intBetween(rng, 0, c.sounds.length - 1)];
  const hits = intBetween(rng, 2, clampN(2 + Math.floor(c.n / 3), 3, 7));
  const seq = stream(rng, c.sounds, target, c.countLength, hits, c.n <= 4);
  const options = shuffle(rng, [...new Set([hits, hits - 1, hits + 1, hits + 2, hits - 2].filter((v) => v >= 0))].slice(0, 4));
  return { kind: 'count', target, seq, answer: hits, options };
};

const spotRound = (rng, c) => {
  const target = c.sounds[intBetween(rng, 0, c.sounds.length - 1)];
  const hits = intBetween(rng, 3, 5);
  return { kind: 'spot', target, seq: stream(rng, c.sounds, target, c.spotLength, hits, true), answer: hits };
};

const wordsRound = (rng, c) => {
  const keys = Object.keys(WORDS);
  const theme = keys[intBetween(rng, 0, keys.length - 1)];
  const pool = shuffle(rng, WORDS[theme]);
  const heard = pool.slice(0, c.words);
  // Decoys: the rest of the theme, then words from another theme.
  const other = WORDS[keys[(keys.indexOf(theme) + 1) % keys.length]];
  const decoys = [...pool.slice(c.words), ...sample(rng, other, 4)].slice(0, Math.max(4, c.words));
  return { kind: 'words', theme, heard, tiles: shuffle(rng, [...heard, ...decoys]), fallback: countRound(rng, c) };
};

/** A session: count, spot and words missions, mixed (each kind at least once). */
export const makeEchoLevel = (rng, config) => {
  const kinds = shuffle(rng, ['count', 'spot', 'words', 'count', 'spot', 'words']).slice(0, config.rounds);
  return kinds.map((k) => (k === 'count' ? countRound(rng, config) : k === 'spot' ? spotRound(rng, config) : wordsRound(rng, config)));
};

/** "Spot": which taps hit a target (within one gap after it began) and how many were false. */
export const scoreSpot = (seq, target, gapMs, tapTimes, leadMs = 0) => {
  const onsets = seq.map((k, i) => (k === target ? leadMs + i * gapMs : null)).filter((t) => t !== null);
  const caught = new Set();
  let falseTaps = 0;
  for (const t of tapTimes) {
    const hit = onsets.findIndex((o, i) => !caught.has(i) && t >= o && t < o + gapMs + 120);
    if (hit >= 0) caught.add(hit); else falseTaps += 1;
  }
  return { hits: caught.size, targets: onsets.length, falseTaps };
};

/** "Words": right only when every heard word is picked and nothing else. */
export const scoreWords = (heard, picked) => heard.every((w) => picked.includes(w)) && picked.every((w) => heard.includes(w));

