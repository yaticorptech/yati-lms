/**
 * Nuance Navigator (Master Minds, Classes 11–12) — pure, seeded rounds.
 *
 * Three kinds of scale, each a strict order (one word per slot, so the placement is checkable):
 *  intensity  — words for the same idea, weakest to strongest (drizzle → deluge). Any subset of a ladder keeps
 *               its order, so a round deals 4–6 words from one ladder.
 *  connotation — the same meaning with a positive, neutral and negative colour (slender / thin / scrawny).
 *  register    — the same meaning, informal → neutral → formal (start / begin / commence).
 */
import { pick, sample, shuffle } from '../seeded.js';

/** Weakest → strongest. Every adjacent pair differs clearly in degree. */
export const INTENSITY = [
  { idea: 'rain', words: ['drizzle', 'shower', 'downpour', 'deluge'] },
  { idea: 'wind (Beaufort scale)', words: ['calm', 'breeze', 'gale', 'storm', 'hurricane'] },
  { idea: 'temperature', words: ['freezing', 'cold', 'cool', 'lukewarm', 'hot', 'scalding'] },
  { idea: 'size', words: ['microscopic', 'tiny', 'small', 'large', 'huge', 'colossal'] },
  { idea: 'happiness', words: ['content', 'happy', 'delighted', 'ecstatic'] },
  { idea: 'anger', words: ['displeased', 'annoyed', 'angry', 'furious'] },
  { idea: 'fear', words: ['uneasy', 'nervous', 'frightened', 'terrified'] },
  { idea: 'loudness of speech', words: ['whisper', 'talk', 'shout', 'scream'] },
  { idea: 'eating', words: ['taste', 'nibble', 'eat', 'devour'] },
  { idea: 'speed on foot', words: ['stroll', 'walk', 'jog', 'run', 'sprint'] },
  { idea: 'frequency', words: ['never', 'rarely', 'sometimes', 'often', 'usually', 'always'] },
  { idea: 'likelihood', words: ['impossible', 'unlikely', 'possible', 'likely', 'certain'] },
  { idea: 'light', words: ['dark', 'dim', 'bright', 'dazzling', 'blinding'] },
  { idea: 'wetness', words: ['dry', 'damp', 'wet', 'drenched'] },
  { idea: 'loudness', words: ['silent', 'quiet', 'loud', 'deafening'] },
  { idea: 'difficulty', words: ['effortless', 'easy', 'hard', 'impossible'] },
  { idea: 'showing amusement', words: ['smile', 'chuckle', 'laugh', 'guffaw'] },
  { idea: 'flow of water', words: ['drip', 'trickle', 'stream', 'torrent'] },
  { idea: 'height of land', words: ['molehill', 'mound', 'hill', 'mountain'] },
  { idea: 'settlement', words: ['hamlet', 'village', 'town', 'city', 'metropolis'] },
  { idea: 'quality', words: ['poor', 'satisfactory', 'good', 'excellent'] },
  { idea: 'closeness', words: ['stranger', 'acquaintance', 'friend', 'confidant'] },
  { idea: 'importance', words: ['trivial', 'minor', 'important', 'essential'] }
];

/** Positive / neutral / negative colouring of one meaning. */
export const CONNOTATION = [
  { idea: 'not old', words: ['youthful', 'young', 'childish'] },
  { idea: 'not fat', words: ['slender', 'thin', 'scrawny'] },
  { idea: 'a smell', words: ['fragrance', 'smell', 'stench'] },
  { idea: 'a place to live', words: ['home', 'house', 'hovel'] },
  { idea: 'pressing your view', words: ['assertive', 'forceful', 'pushy'] },
  { idea: 'widely known', words: ['renowned', 'well-known', 'notorious'] },
  { idea: 'someone who works with you', words: ['ally', 'associate', 'accomplice'] },
  { idea: 'saying what you think', words: ['candid', 'direct', 'blunt'] },
  { idea: 'avoiding risk', words: ['prudent', 'cautious', 'timid'] },
  { idea: 'not like others', words: ['distinctive', 'unusual', 'weird'] },
  { idea: 'a number of people together', words: ['gathering', 'crowd', 'mob'] },
  { idea: 'prompting someone to act', words: ['encourage', 'remind', 'nag'] },
  { idea: 'a person in public office', words: ['statesman', 'politician', 'demagogue'] },
  { idea: 'not spending much', words: ['thrifty', 'economical', 'stingy'] }
];

/** Informal / neutral / formal. */
export const REGISTER = [
  { idea: 'to begin', words: ['kick off', 'start', 'commence'] },
  { idea: 'young people in a family', words: ['kids', 'children', 'offspring'] },
  { idea: 'an adult male', words: ['guy', 'man', 'gentleman'] },
  { idea: 'to learn a fact', words: ['find out', 'discover', 'ascertain'] },
  { idea: 'a large number', words: ['loads of', 'many', 'numerous'] },
  { idea: 'to end', words: ['wrap up', 'finish', 'conclude'] },
  { idea: 'to give aid', words: ['help out', 'help', 'assist'] },
  { idea: 'to think about', words: ['mull over', 'consider', 'contemplate'] },
  { idea: 'to obtain by paying', words: ['pick up', 'buy', 'purchase'] },
  { idea: 'to throw away', words: ['chuck out', 'throw away', 'discard'] },
  { idea: 'the people who enforce the law', words: ['cops', 'police', 'constabulary'] },
  { idea: 'to make better', words: ['fix up', 'improve', 'ameliorate'] },
  { idea: 'to arrive', words: ['show up', 'arrive', 'present oneself'] },
  { idea: 'to look into', words: ['check out', 'examine', 'scrutinise'] }
];

export const SCALE_ENDS = {
  intensity: ['weakest', 'strongest'],
  connotation: ['positive', 'negative'],
  register: ['informal', 'formal']
};
export const SLOT_NAMES = { connotation: ['Positive', 'Neutral', 'Negative'], register: ['Informal', 'Neutral', 'Formal'] };

const clampN = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const ramp = (from, to, levelNo) => Math.round(from + (to - from) * clampN((levelNo - 1) / 29, 0, 1));

/**
 * difficulty 1: intensity ladders of 4, some connotation (register from step 15);
 * difficulty 2: ladders of 5, connotation and register;
 * difficulty 3: ladders of 5 (6 from step 10) and more of the subtler connotation and register scales.
 */
export const nuanceConfig = (ageBand, difficulty = 1, levelNo = 1) => {
  const d = clampN(difficulty || 1, 1, 3);
  const rounds = ramp(5, 7, levelNo) + (d - 1);
  const length = d === 1 ? 4 : d === 2 ? 5 : levelNo >= 10 ? 6 : 5;
  const mix = d === 1 ? { connotation: 0.25, register: levelNo >= 15 ? 0.15 : 0 } : d === 2 ? { connotation: 0.25, register: 0.25 } : { connotation: 0.3, register: 0.3 };
  return { band: ageBand === 'advanced' || !ageBand ? 'advanced' : 'gentle', difficulty: d, rounds, length, mix };
};

/** A round: { kind, idea, order: [correct words, low → high], chips: [shuffled words] }. */
export const makeNuanceRound = (rng, config, used = new Set()) => {
  const roll = rng();
  const kind = roll < config.mix.connotation ? 'connotation' : roll < config.mix.connotation + config.mix.register ? 'register' : 'intensity';
  if (kind === 'intensity') {
    const fits = INTENSITY.filter((l) => l.words.length >= config.length && !used.has(l.idea));
    const ladder = pick(rng, fits.length ? fits : INTENSITY.filter((l) => l.words.length >= config.length));
    // Keep a random subset, in ladder order.
    const keep = sample(rng, ladder.words.map((_, i) => i), config.length).sort((a, b) => a - b);
    const order = keep.map((i) => ladder.words[i]);
    return { kind, idea: ladder.idea, order, chips: dealNotInOrder(rng, order) };
  }
  const bank = kind === 'connotation' ? CONNOTATION : REGISTER;
  const fits = bank.filter((l) => !used.has(l.idea));
  const set = pick(rng, fits.length ? fits : bank);
  return { kind, idea: set.idea, order: [...set.words], chips: dealNotInOrder(rng, set.words) };
};

const dealNotInOrder = (rng, words) => {
  for (let t = 0; t < 30; t++) {
    const s = shuffle(rng, words);
    if (s.some((w, i) => w !== words[i])) return s;
  }
  return [...words].reverse();
};

export const makeNuanceLevel = (rng, config) => {
  const used = new Set();
  const out = [];
  for (let i = 0; i < config.rounds; i++) {
    const r = makeNuanceRound(rng, config, used);
    used.add(r.idea);
    out.push(r);
  }
  return out;
};

/** Slots holding the right word, for placed = [word | null per slot]. */
export const nuanceRight = (round, placed) => round.order.reduce((n, w, i) => n + (placed[i] === w ? 1 : 0), 0);
