/**
 * Interference Recall (Master Minds, Classes 11–12) — pure and seeded.
 *
 * Extends Seen Before with proactive/retroactive interference: study list A, then list B — built from the SAME
 * meaning groups as A (river → stream), so every B word is a lure for an A word — then a short arithmetic distractor,
 * then a recognition test holding the A words, B lures and brand-new words from the same groups. Tap only list A.
 * Score = hits − false alarms (never below 0).
 */
import { shuffle, sample, intBetween, pick } from '../seeded.js';

const clampN = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const t = (levelNo) => clampN(((levelNo || 1) - 1) / 29, 0, 1);
const ramp = (from, to, levelNo) => Math.round(from + (to - from) * t(levelNo));

/** Meaning groups: words in one group are close enough to be confused in memory. No word appears twice. */
export const GROUPS = [
  ['RIVER', 'STREAM', 'BROOK', 'CREEK', 'CANAL'],
  ['FOREST', 'JUNGLE', 'WOODLAND', 'GROVE', 'THICKET'],
  ['DOCTOR', 'SURGEON', 'NURSE', 'PHYSICIAN', 'MEDIC'],
  ['LAWYER', 'JUDGE', 'ATTORNEY', 'ADVOCATE', 'JURY'],
  ['VIOLIN', 'CELLO', 'VIOLA', 'GUITAR', 'HARP'],
  ['HAMMER', 'MALLET', 'CHISEL', 'WRENCH', 'PLIERS'],
  ['CASTLE', 'PALACE', 'FORTRESS', 'MANSION', 'CITADEL'],
  ['STORM', 'TEMPEST', 'CYCLONE', 'HURRICANE', 'TYPHOON'],
  ['OCEAN', 'SEA', 'LAGOON', 'GULF', 'BAY'],
  ['MOUNTAIN', 'HILL', 'PEAK', 'SUMMIT', 'RIDGE'],
  ['TIGER', 'LION', 'LEOPARD', 'JAGUAR', 'CHEETAH'],
  ['EAGLE', 'HAWK', 'FALCON', 'VULTURE', 'KITE'],
  ['SWORD', 'DAGGER', 'SABRE', 'SPEAR', 'LANCE'],
  ['JACKET', 'COAT', 'SWEATER', 'BLAZER', 'CARDIGAN'],
  ['CHAIR', 'STOOL', 'BENCH', 'SOFA', 'COUCH'],
  ['LETTER', 'NOTE', 'MEMO', 'MESSAGE', 'TELEGRAM'],
  ['TRAIN', 'TRAM', 'METRO', 'BUS', 'COACH'],
  ['SHIP', 'BOAT', 'YACHT', 'FERRY', 'CANOE'],
  ['APPLE', 'PEAR', 'PLUM', 'PEACH', 'APRICOT'],
  ['ANGER', 'RAGE', 'FURY', 'WRATH', 'ANNOYANCE'],
  ['JOY', 'DELIGHT', 'BLISS', 'GLEE', 'ELATION'],
  ['FEAR', 'TERROR', 'DREAD', 'PANIC', 'FRIGHT'],
  ['SILVER', 'GOLD', 'PLATINUM', 'BRONZE', 'COPPER'],
  ['PLANET', 'COMET', 'ASTEROID', 'METEOR', 'MOON'],
  ['NOVEL', 'POEM', 'ESSAY', 'SONNET', 'STORY'],
  ['TEACHER', 'TUTOR', 'MENTOR', 'LECTURER', 'PROFESSOR'],
  ['BREAD', 'LOAF', 'BUN', 'ROLL', 'BAGEL'],
  ['VALLEY', 'CANYON', 'GORGE', 'RAVINE', 'GULLY'],
  ['CARPET', 'RUG', 'MAT', 'TAPESTRY', 'BLANKET'],
  ['GARDEN', 'ORCHARD', 'MEADOW', 'PARK', 'LAWN'],
  ['MARKET', 'BAZAAR', 'SHOP', 'STORE', 'MALL'],
  ['WIZARD', 'SORCERER', 'MAGICIAN', 'WITCH', 'ENCHANTER'],
  ['ROSE', 'TULIP', 'LILY', 'DAISY', 'ORCHID'],
  ['THIEF', 'ROBBER', 'BANDIT', 'BURGLAR', 'PIRATE'],
  ['CUP', 'MUG', 'GLASS', 'GOBLET', 'TUMBLER']
];

/**
 * How a level plays (Classes 11–12 = 'advanced'; another band plays one step easier).
 *  listSize      — words in list A (and in list B)
 *  studyMs       — per word on screen (lists are shown one word at a time)
 *  lures         — B words that come back in the test (all B words are from A's groups)
 *  fresh         — never-seen words from A's groups in the test
 *  sums          — arithmetic problems in the distractor
 *  pass          — hits − false alarms needed
 */
export const interferenceConfig = (ageBand, difficulty = 1, levelNo = 1) => {
  const band = ageBand === 'advanced' || !ageBand ? 'advanced' : 'other';
  const d = clampN((difficulty || 1) - (band === 'advanced' ? 0 : 1), 1, 3);
  // Two words a list for the first levels (2026-11-14, the user: "level one … 2 out of 2"), then one more about every
  // three levels — and from level 4 the harder difficulties add a word or two — up to twelve.
  const lv = Math.max(1, Math.floor(levelNo || 1));
  const listSize = Math.min(12, 2 + Math.floor((lv - 1) / 3) + (lv > 3 ? d - 1 : 0));
  const studyMs = ramp([1700, 1400, 1200][d - 1], [1400, 1200, 1000][d - 1], levelNo);
  const lures = Math.max(1, Math.round(listSize * [0.5, 0.75, 1][d - 1]));
  const fresh = Math.max(1, Math.round(listSize * [0.34, 0.5, 0.5][d - 1]));
  const sums = listSize <= 3 ? 1 : [3, 4, 5][d - 1];
  return { band, difficulty: d, listSize, studyMs, lures, fresh, sums, max: listSize, pass: listSize <= 3 ? listSize : Math.ceil(listSize * 0.6) };
};

/** A quick sum with three choices, exactly one right. */
const makeSum = (rng, d) => {
  const op = pick(rng, d >= 2 ? ['+', '-', '×'] : ['+', '-']);
  let a;
  let b;
  let ans;
  if (op === '×') { a = intBetween(rng, 6, 15); b = intBetween(rng, 3, 9); ans = a * b; }
  else if (op === '+') { a = intBetween(rng, 18, 89); b = intBetween(rng, 14, 79); ans = a + b; }
  else { a = intBetween(rng, 50, 120); b = intBetween(rng, 13, 49); ans = a - b; }
  const wrong = new Set();
  for (const off of shuffle(rng, [-10, -2, -1, 1, 2, 10, 9, -9])) {
    if (wrong.size >= 2) break;
    if (ans + off > 0) wrong.add(ans + off);
  }
  return { text: `${a} ${op} ${b}`, answer: ans, choices: shuffle(rng, [ans, ...wrong]) };
};

/**
 * One trial: list A and list B (one word each from the same groups, in shuffled order), the distractor sums, and
 * the test items, each tagged 'A' (target), 'B' (lure) or 'N' (new word from an A group).
 */
export const makeInterferenceTrial = (rng, cfg) => {
  const groups = sample(rng, GROUPS, cfg.listSize);
  const A = [];
  const B = [];
  const N = [];
  for (const g of groups) {
    const [a, b, n] = sample(rng, g, 3);
    A.push(a); B.push(b); N.push(n);
  }
  const listA = shuffle(rng, A);
  const listB = shuffle(rng, B);
  const lures = sample(rng, B, cfg.lures);
  const fresh = sample(rng, N, cfg.fresh);
  const test = shuffle(rng, [
    ...A.map((w) => ({ word: w, kind: 'A' })),
    ...lures.map((w) => ({ word: w, kind: 'B' })),
    ...fresh.map((w) => ({ word: w, kind: 'N' }))
  ]);
  const sums = Array.from({ length: cfg.sums }, () => makeSum(rng, cfg.difficulty));
  return { listA, listB, sums, test };
};

/** Score a set of tapped words: hits (A words) − false alarms (anything else), never below 0. */
export const scoreRecall = (trial, tapped) => {
  const kind = new Map(trial.test.map((it) => [it.word, it.kind]));
  let hits = 0;
  let lureFA = 0;
  let newFA = 0;
  for (const w of new Set(tapped)) {
    const k = kind.get(w);
    if (k === 'A') hits++;
    else if (k === 'B') lureFA++;
    else if (k === 'N') newFA++;
  }
  return { hits, lureFA, newFA, falseAlarms: lureFA + newFA, score: Math.max(0, hits - lureFA - newFA) };
};
