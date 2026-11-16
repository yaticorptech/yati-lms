/**
 * Cipher Challenge (2026-11-13): decode a short, positive message hidden under a cipher, by working out the key.
 *
 * intermediate (Classes 6–8): symbol substitution with part of the key shown; Caesar shift on a slider, range told.
 * analytical (9–10): Caesar with an unknown shift (letter counts to help), number codes (A=1, or shifted), Atbash.
 * advanced (11–12+): full letter substitution solved by hand, Vigenère with a known key length, chained ciphers.
 *
 * Plain JS, no React: tests/games/newSmart.test.js checks that every round decodes to its message with the true key.
 */
import { seeded, pick, shuffle, sample } from '../seeded.js';

const A = 65;
const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const idx = (ch) => ch.charCodeAt(0) - A;
const chr = (i) => String.fromCharCode(A + (((i % 26) + 26) % 26));
const isLetter = (ch) => ch >= 'A' && ch <= 'Z';

/** Messages: short (intermediate), medium (analytical), long (advanced — long enough for letter counts to help). */
export const MESSAGES = {
  short: [
    'BE KIND', 'READ MORE BOOKS', 'NEVER GIVE UP', 'SMILE AT A FRIEND', 'ASK GOOD QUESTIONS', 'PRACTICE EVERY DAY',
    'HELP EACH OTHER', 'DREAM BIG', 'STAY CURIOUS', 'WORK AS A TEAM', 'TRY YOUR BEST', 'SHARE YOUR IDEAS',
    'LEARN SOMETHING NEW', 'BE BRAVE TODAY', 'THANK YOUR TEACHER', 'KEEP GOING', 'MISTAKES HELP US GROW', 'PLAY FAIR',
    'THINK BEFORE YOU SPEAK', 'PLANT A TREE', 'DRINK MORE WATER', 'LISTEN WITH CARE', 'MATHS IS FUN',
    'SCIENCE IS AMAZING', 'YOU CAN DO IT', 'BE A GOOD FRIEND', 'KEEP YOUR DESK TIDY', 'CHEER FOR YOUR TEAM'
  ],
  medium: [
    'KINDNESS IS A KIND OF STRENGTH', 'EVERY EXPERT WAS ONCE A BEGINNER', 'GOOD FRIENDS MAKE HARD DAYS EASIER',
    'READING OPENS DOORS TO NEW WORLDS', 'SMALL STEPS LEAD TO BIG RESULTS', 'TEAMWORK MAKES THE DREAM WORK',
    'CURIOSITY IS THE START OF LEARNING', 'PRACTICE TURNS EFFORT INTO SKILL', 'BELIEVE IN YOURSELF AND KEEP TRYING',
    'THE LIBRARY IS FULL OF ADVENTURES', 'A GOOD BREAKFAST POWERS THE BRAIN', 'GREAT IDEAS START WITH A QUESTION',
    'HELPING OTHERS MAKES YOU STRONGER', 'EVERY MISTAKE TEACHES A LESSON', 'THE STARS ARE WAITING TO BE EXPLORED',
    'HARD WORK BEATS TALENT', 'PATIENCE IS A SUPER POWER', 'RESPECT EVERYONE YOU MEET', 'LEARNING NEVER STOPS',
    'TODAY IS A GREAT DAY TO LEARN', 'A SMILE CAN BRIGHTEN THE WHOLE CLASS', 'THE BEST TEAMS LISTEN TO EACH OTHER'
  ],
  long: [
    'THE MORE THAT YOU READ THE MORE THINGS YOU WILL KNOW',
    'SUCCESS IS THE SUM OF SMALL EFFORTS REPEATED EVERY DAY',
    'THE BEST WAY TO PREDICT THE FUTURE IS TO CREATE IT',
    'BE THE REASON SOMEONE SMILES AT SCHOOL TODAY',
    'A TEAM THAT LISTENS TO EACH OTHER CAN SOLVE THE HARDEST PROBLEMS',
    'EDUCATION IS THE MOST POWERFUL TOOL TO CHANGE THE WORLD',
    'A GOOD SCIENTIST ASKS QUESTIONS AND THEN TESTS THE ANSWERS',
    'THERE ARE NO SHORTCUTS TO ANY PLACE WORTH GOING',
    'THE SECRET OF GETTING AHEAD IS GETTING STARTED',
    'IT ALWAYS SEEMS IMPOSSIBLE UNTIL IT IS DONE',
    'KINDNESS IS A LANGUAGE THAT EVERYONE CAN UNDERSTAND',
    'IN THE MIDDLE OF EVERY DIFFICULTY THERE IS A CHANCE TO GROW',
    'THE TEACHER OPENS THE DOOR BUT YOU MUST WALK THROUGH IT',
    'A RIVER CUTS THROUGH ROCK BECAUSE IT NEVER STOPS FLOWING',
    'GREAT THINGS ARE DONE BY A SERIES OF SMALL THINGS BROUGHT TOGETHER',
    'THE MIND IS NOT A VESSEL TO BE FILLED BUT A FIRE TO BE LIT',
    'WHEN YOU HELP SOMEONE LEARN YOU LEARN TWICE AS MUCH',
    'EVERY GREAT INVENTION BEGAN AS A SIMPLE QUESTION ASKED BY A CURIOUS MIND'
  ]
};

/** Symbols for the symbol cipher: plain, single-width shapes. */
const SYMBOLS = ['★', '◆', '▲', '●', '■', '♥', '♣', '♠', '☀', '☂', '☾', '✿', '✚', '✦', '◐', '♫', '⚑', '☘', '❄', '⚓',
  '✂', '☎', '✈', '⌘', '∞', 'Ω'];

/* ---- Rounds ---------------------------------------------------------------------------------------------------- */

/**
 * The kinds of round and the controls they are solved with:
 *   map      — the student assigns a plain letter to each cipher token (symbol, numbers, atbash, substitution);
 *   shift    — one shift on a slider (caesar);
 *   vigenere — one shift per key letter;
 *   chained  — a mirror switch and a shift.
 */
export const TYPES = {
  intermediate: ['symbol', 'caesar'],
  analytical: ['caesar', 'numbers', 'atbash'],
  advanced: ['substitution', 'vigenere', 'chained']
};

const lettersOf = (text) => [...text].filter(isLetter);
const distinctLetters = (text) => [...new Set(lettersOf(text))];

/** A permutation of the alphabet with no letter left in place. */
const derangement = (rng) => {
  for (;;) {
    const p = shuffle(rng, [...Array(26).keys()]);
    if (p.every((v, i) => v !== i)) return p;
  }
};

/** Build tokens: each letter becomes { t: cipher token, plain, slot? }; anything else passes through as { raw }. */
const tokenize = (plain, enc) => {
  let n = 0;
  return [...plain].map((ch) => {
    if (!isLetter(ch)) return { raw: ch };
    const tok = { plain: ch, ...enc(ch, n) };
    n += 1;
    return tok;
  });
};

/**
 * One round. `levelNo` (1–30) and `difficulty` (1–3) pick how much help is given; `seed` makes it repeatable.
 * Returns { type, kind, plaintext, tokens, key, given, … } — see decodeWith for each kind's key.
 */
export function makeCipherRound(band, difficulty = 1, levelNo = 1, seed = Math.floor(Math.random() * 2 ** 31)) {
  const rng = seeded(seed);
  const b = TYPES[band] ? band : 'analytical';
  const t01 = Math.min(1, Math.max(0, (levelNo - 1) / 29));
  const lerp = (a, z) => Math.round(a + (z - a) * t01);
  const type = TYPES[b][(levelNo + Math.floor(rng() * 3)) % TYPES[b].length];
  const bank = b === 'intermediate' ? MESSAGES.short : b === 'analytical' ? MESSAGES.medium : MESSAGES.long;
  const plaintext = pick(rng, bank);
  const distinct = distinctLetters(plaintext);
  const base = { band: b, type, plaintext, seed, maxChecks: 3 };

  if (type === 'symbol') {
    const syms = shuffle(rng, SYMBOLS);
    const map = {};
    ABC.split('').forEach((ch, i) => { map[syms[i]] = ch; });
    const symOf = Object.fromEntries(Object.entries(map).map(([s, ch]) => [ch, s]));
    const share = (difficulty >= 2 ? 0.45 : 0.6) - 0.15 * t01;
    const shown = sample(rng, distinct, Math.max(1, Math.round(distinct.length * share)));
    return {
      ...base, kind: 'map', title: 'Symbol code',
      rule: 'Each symbol always stands for the same letter. Some are in the key — work out the rest.',
      tokens: tokenize(plaintext, (ch) => ({ t: symOf[ch] })),
      key: Object.fromEntries(distinct.map((ch) => [symOf[ch], ch])),
      given: Object.fromEntries(shown.map((ch) => [symOf[ch], ch])),
      seconds: lerp(150, 120) + distinct.length * 4
    };
  }

  if (type === 'caesar') {
    const easy = b === 'intermediate';
    const max = easy ? (difficulty >= 2 ? lerp(8, 12) : lerp(4, 6)) : 25;
    const shift = 1 + Math.floor(rng() * max);
    return {
      ...base, kind: 'shift', title: 'Caesar shift',
      rule: easy
        ? `Every letter was moved ${max <= 1 ? '1 place' : `1 to ${max} places`} along the alphabet. Slide back until the message reads.`
        : 'Every letter was moved the same number of places along the alphabet. Use the letter counts: E is the commonest letter in English.',
      tokens: tokenize(plaintext, (ch) => ({ t: chr(idx(ch) + shift) })),
      key: { shift }, range: [0, easy ? max : 25], freq: !easy,
      seconds: easy ? lerp(120, 100) : lerp(180, 150)
    };
  }

  if (type === 'numbers') {
    const offset = difficulty === 1 && levelNo <= 15 ? 0 : 1 + Math.floor(rng() * 25);
    const numOf = (ch) => String(((idx(ch) + offset) % 26) + 1);
    const key = Object.fromEntries(distinct.map((ch) => [numOf(ch), ch]));
    const given = offset === 0 ? {} : Object.fromEntries(sample(rng, distinct, 1).map((ch) => [numOf(ch), ch]));
    return {
      ...base, kind: 'map', title: 'Number code', numbers: true,
      rule: offset === 0
        ? 'Each number is a letter’s place in the alphabet: A = 1, B = 2 … Z = 26.'
        : 'Each number is a letter’s place in the alphabet — but the count starts somewhere else, not at A = 1, and wraps after 26. One letter is given.',
      tokens: tokenize(plaintext, (ch) => ({ t: numOf(ch) })),
      key, given, freq: offset !== 0,
      seconds: lerp(180, 150) + distinct.length * 3
    };
  }

  if (type === 'atbash') {
    const mirror = (ch) => chr(25 - idx(ch));
    const shown = sample(rng, distinct, difficulty >= 3 ? 1 : 2);
    return {
      ...base, kind: 'map', title: 'Mirror code (Atbash)',
      rule: 'The alphabet was folded in half: the first letter swaps with the last, the second with the second-last… Find the pattern from the letters given.',
      tokens: tokenize(plaintext, (ch) => ({ t: mirror(ch) })),
      key: Object.fromEntries(distinct.map((ch) => [mirror(ch), ch])),
      given: Object.fromEntries(shown.map((ch) => [mirror(ch), ch])),
      freq: true,
      seconds: lerp(180, 150) + distinct.length * 3
    };
  }

  if (type === 'substitution') {
    const perm = derangement(rng);
    const enc = (ch) => chr(perm[idx(ch)]);
    const counts = {};
    lettersOf(plaintext).forEach((ch) => { counts[ch] = (counts[ch] || 0) + 1; });
    // Start-up letters: a few, never the commonest (finding E is the first move).
    const top = Object.entries(counts).sort((x, y) => y[1] - x[1])[0][0];
    const shown = sample(rng, distinct.filter((ch) => ch !== top), difficulty >= 3 ? lerp(3, 2) : lerp(5, 3));
    return {
      ...base, kind: 'map', title: 'Secret alphabet',
      rule: 'Every letter was swapped for another, always the same one. Use the letter counts, short words (A, I, THE, IS) and the letters given.',
      tokens: tokenize(plaintext, (ch) => ({ t: enc(ch) })),
      key: Object.fromEntries(distinct.map((ch) => [enc(ch), ch])),
      given: Object.fromEntries(shown.map((ch) => [enc(ch), ch])),
      freq: true,
      seconds: lerp(420, 360)
    };
  }

  if (type === 'vigenere') {
    const len = difficulty >= 3 ? (levelNo > 15 ? 4 : 3) : (levelNo > 15 ? 3 : 2);
    const shifts = [...Array(len)].map(() => 1 + Math.floor(rng() * 25));
    return {
      ...base, kind: 'vigenere', title: 'Vigenère code',
      rule: `A key word of ${len} letters was used: letter 1 of the message shifted by key letter 1, letter 2 by key letter 2 … then the key repeats. Solve one key letter at a time — each has its own letter counts.`,
      tokens: tokenize(plaintext, (ch, n) => ({ t: chr(idx(ch) + shifts[n % len]), slot: n % len })),
      key: { shifts }, keyLength: len, freq: true,
      seconds: lerp(360, 300) + len * 30
    };
  }

  // chained: mirrored (Atbash), then shifted.
  const shift = 1 + Math.floor(rng() * 25);
  return {
    ...base, kind: 'chained', title: 'Double lock',
    rule: 'Two locks: the alphabet was mirrored (A↔Z, B↔Y…) and then every letter shifted the same number of places. Undo both.',
    tokens: tokenize(plaintext, (ch) => ({ t: chr(25 - idx(ch) + shift) })),
    key: { mirror: true, shift }, freq: true,
    seconds: lerp(240, 200)
  };
}

/* ---- Decoding -------------------------------------------------------------------------------------------------- */

/** A key in the form the student edits, set to the true key. */
export const trueState = (round) => {
  if (round.kind === 'map') return { map: { ...round.key } };
  if (round.kind === 'shift') return { shift: round.key.shift };
  if (round.kind === 'vigenere') return { shifts: [...round.key.shifts] };
  return { mirror: round.key.mirror, shift: round.key.shift };
};

/** Where the student starts: the given letters, no shift. */
export const startState = (round) => {
  if (round.kind === 'map') return { map: { ...(round.given || {}) } };
  if (round.kind === 'shift') return { shift: round.range[0] };
  if (round.kind === 'vigenere') return { shifts: Array(round.keyLength).fill(0) };
  return { mirror: false, shift: 0 };
};

/** One token decoded under a state: a letter, or null while a map token has no letter yet. */
export const decodeToken = (round, tok, state) => {
  if (tok.raw !== undefined) return tok.raw;
  if (round.kind === 'map') return state.map[tok.t] || null;
  if (round.kind === 'shift') return chr(idx(tok.t) - state.shift);
  if (round.kind === 'vigenere') return chr(idx(tok.t) - (state.shifts[tok.slot] || 0));
  const unshifted = idx(tok.t) - state.shift;
  return state.mirror ? chr(25 - unshifted) : chr(unshifted);
};

/** The whole message under a state; '_' where a letter is still unknown. */
export const decodeWith = (round, state) => round.tokens.map((tok) => decodeToken(round, tok, state) || '_').join('');

const byToken = (a, b) => (Number(a) - Number(b)) || (a < b ? -1 : a > b ? 1 : 0);

/** Distinct cipher tokens with their counts, commonest first. Per key slot for Vigenère when `slot` is given. */
export const tokenCounts = (round, slot = null) => {
  const counts = new Map();
  for (const t of round.tokens) {
    if (t.raw !== undefined || (slot !== null && t.slot !== slot)) continue;
    counts.set(t.t, (counts.get(t.t) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || byToken(a[0], b[0]));
};

/** Whether every letter is filled (map rounds can only be checked when nothing is blank). */
export const isComplete = (round, state) => round.kind !== 'map' || round.tokens.every((t) => t.raw !== undefined || state.map[t.t]);

/** For a wrong check on a map round: how many of the cipher tokens are assigned the right letter. */
export const rightTokens = (round, state) => {
  if (round.kind !== 'map') return null;
  const all = Object.keys(round.key);
  return { right: all.filter((t) => state.map[t] === round.key[t]).length, of: all.length };
};

/** Stars for a decoded message: three with no wrong check and under 60% of the time; a star off each. */
export const cipherStars = ({ solved, wrong = 0, usedFrac = 0 }) =>
  (solved ? Math.max(1, 3 - wrong - (usedFrac > 0.6 ? 1 : 0)) : 0);

export const letterOf = chr;
export const ALPHABET = ABC;
