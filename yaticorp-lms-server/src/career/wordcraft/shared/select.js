/**
 * WORDCRAFT levels (2026-11-20). Pure and seeded — no React, no storage.
 *
 * Every level is exactly three challenges: the compulsory Tongue Twister and two different ones of the other five.
 *  · The 10 possible pairs of the five are dealt from a shuffled deck, so over any ten levels each optional challenge
 *    appears exactly four times and no combination repeats. A new deck never starts with the pair the last one ended on.
 *  · The twister's place (1st, 2nd or 3rd) comes from its own shuffled run of the three places, never the same place
 *    two levels running, so it is first, middle and last equally often.
 * The deck never runs out, so levels go on for ever.
 */
import { shuffle, pick } from './rand.js';
import { TABOO, CAPTIONS, TOPICS, OPENERS, TWISTS, PRODUCTS, TWISTERS } from './content.js';

export const TWISTER = 'twister';
export const OPTIONAL = ['dont-say', 'caption', 'talk60', 'plot', 'sell'];
export const CHALLENGES = {
  'dont-say': { name: "Don't Say That!", icon: '🚫', short: 'Explain it without the forbidden words' },
  caption: { name: 'Caption Clash', icon: '🖼️', short: 'Write the best caption for the picture' },
  talk60: { name: 'Talk for 60', icon: '⏱️', short: 'Speak on the topic without stopping' },
  plot: { name: 'Plot Twist', icon: '🌀', short: 'Tell a story, weave in every twist' },
  sell: { name: 'Sell the Impossible', icon: '💼', short: 'Pitch the product to a doubtful customer' },
  twister: { name: 'Tongue Twister', icon: '👅', short: 'Five correct in a row' }
};

/** The four stages. Times in seconds; `acc` the share of a twister's words that must be heard right. */
export const STAGES = [
  { key: 'beginner', name: 'Beginner', from: 1, taboo: 60, talk: 45, plot: 70, twists: 2, sell: 60, acc: 0.8, twistRate: 0.6 },
  { key: 'intermediate', name: 'Intermediate', from: 11, taboo: 50, talk: 60, plot: 60, twists: 2, sell: 45, acc: 0.85, twistRate: 0.55 },
  { key: 'advanced', name: 'Advanced', from: 26, taboo: 45, talk: 60, plot: 60, twists: 3, sell: 40, acc: 0.9, twistRate: 0.5 },
  { key: 'expert', name: 'Expert', from: 46, taboo: 40, talk: 60, plot: 60, twists: 3, sell: 30, acc: 0.9, twistRate: 0.45 }
];
export const stageOf = (level) => { let s = 0; STAGES.forEach((st, i) => { if ((level || 1) >= st.from) s = i; }); return s; };

/** The ten pairs of optional challenges. */
export const PAIRS = OPTIONAL.flatMap((a, i) => OPTIONAL.slice(i + 1).map((b) => [a, b]));
const samePair = (p, q) => !!p && !!q && p[0] === q[0] && p[1] === q[1];

/** A fresh dealing state. */
export const freshDeal = () => ({ deck: [], last: null, places: [], lastPlace: null });

/**
 * Deal the next level's three challenges. Returns { combo, state } — `state` is new; the old one is not changed.
 */
export const dealCombo = (rng, state = freshDeal()) => {
  const s = { deck: [...(state.deck || [])], last: state.last ?? null, places: [...(state.places || [])], lastPlace: state.lastPlace ?? null };
  if (!s.deck.length) {
    s.deck = shuffle(rng, PAIRS.map((_, i) => i));
    // A new deck never opens with the pair the last one closed on.
    if (s.last !== null && samePair(PAIRS[s.deck[0]], PAIRS[s.last])) [s.deck[0], s.deck[1]] = [s.deck[1], s.deck[0]];
  }
  const pairIdx = s.deck.shift();
  s.last = pairIdx;
  if (!s.places.length) {
    s.places = shuffle(rng, [0, 1, 2]);
    if (s.places[0] === s.lastPlace) s.places.push(s.places.shift());
  }
  const place = s.places.shift();
  s.lastPlace = place;
  const two = shuffle(rng, PAIRS[pairIdx]);
  const combo = [...two];
  combo.splice(place, 0, TWISTER);
  return { combo, state: s };
};

/** Pick an item not seen lately; when every one has been seen, start over (the oldest come back first). */
export const pickFresh = (rng, items, seen = []) => {
  const recent = new Set(seen);
  const fresh = items.filter((it) => !recent.has(it.id));
  if (fresh.length) return pick(rng, fresh);
  const order = new Map(seen.map((id, i) => [id, i]));
  return [...items].sort((a, b) => (order.get(a.id) ?? -1) - (order.get(b.id) ?? -1))[0];
};
const atStage = (items, stage) => { const own = items.filter((it) => it.stage === stage); return own.length ? own : items; };

/** Seconds for saying the twister five times in one go, by stage: a short grace, then about half a second a word. */
export const twisterSeconds = (text, stage) => {
  const n = String(text).split(/\s+/).filter(Boolean).length;
  return Math.ceil(3 + 5 * n * [0.6, 0.55, 0.5, 0.45][stage]); // all five times, in one go
};

/**
 * Build a level's three challenges with their content. `seen` is { bankName: [ids…] } of recent items.
 * Each challenge: { kind, stage, seconds?, item, twists? }.
 */
export const makeChallenges = (rng, combo, stage, seen = {}) => combo.map((kind) => {
  const st = STAGES[stage];
  if (kind === 'dont-say') return { kind, stage, seconds: st.taboo, item: pickFresh(rng, atStage(TABOO, stage), seen.taboo) };
  if (kind === 'caption') return { kind, stage, item: pickFresh(rng, CAPTIONS, seen.caption) };
  if (kind === 'talk60') return { kind, stage, seconds: st.talk, item: pickFresh(rng, atStage(TOPICS, stage), seen.topic) };
  if (kind === 'sell') return { kind, stage, seconds: st.sell, item: pickFresh(rng, PRODUCTS, seen.product) };
  if (kind === 'plot') {
    const pool = shuffle(rng, atStage(TWISTS, stage).filter((t) => !(seen.twist || []).includes(t.id)));
    const fill = pool.length >= st.twists ? pool : shuffle(rng, atStage(TWISTS, stage));
    const seconds = st.plot;
    // The twists drop in evenly through the story, the first after a short start.
    const gap = (seconds - 12) / st.twists;
    const twists = fill.slice(0, st.twists).map((t, i) => ({ ...t, at: Math.round(10 + gap * i) }));
    return { kind, stage, seconds, item: pickFresh(rng, atStage(OPENERS, stage), seen.opener), twists };
  }
  const item = pickFresh(rng, atStage(TWISTERS, stage), seen.twister);
  return { kind, stage, item, seconds: twisterSeconds(item.text, stage), acc: st.acc, needed: 5 };
});

/** Which bank each challenge's item belongs to (for remembering what was seen). */
export const bankOf = (kind) => ({ 'dont-say': 'taboo', caption: 'caption', talk60: 'topic', sell: 'product', plot: 'opener', twister: 'twister' }[kind]);
