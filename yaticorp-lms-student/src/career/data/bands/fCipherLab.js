/**
 * Cipher Lab (Master Minds, Classes 11–12) — pure and seeded.
 *
 * Extends Cipher Challenge (data/bands/cipher.js, left untouched) with three harder ciphers, each broken by hand:
 *  'sub'   — monoalphabetic substitution: a full random key; a letter-frequency chart and a key-mapping panel.
 *  'vig'   — Vigenère with a known key length: one Caesar shift per key slot, with per-slot letter counts.
 *  'trans' — columnar transposition: the message written in rows and read out by columns in a secret order;
 *            the player re-orders the column strips until the rows read as English.
 * Solved when the live decryption equals the plaintext. The texts are real English: quotations and facts.
 */
import { shuffle, pick, sample } from '../seeded.js';

const clampN = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const t = (levelNo) => clampN(((levelNo || 1) - 1) / 29, 0, 1);
export const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const code = (ch) => ch.charCodeAt(0) - 65;
const chr = (i) => ABC[((i % 26) + 26) % 26];
const isLetter = (ch) => ch >= 'A' && ch <= 'Z';
export const lettersOf = (text) => [...text].filter(isLetter).join('');

/** Quotations (with who said them) and plain facts. Capitals, letters and single spaces only. */
export const TEXTS = [
  { text: 'IMAGINATION IS MORE IMPORTANT THAN KNOWLEDGE', source: 'Albert Einstein' },
  { text: 'THE JOURNEY OF A THOUSAND MILES BEGINS WITH ONE STEP', source: 'Lao Tzu' },
  { text: 'THE UNEXAMINED LIFE IS NOT WORTH LIVING', source: 'Socrates' },
  { text: 'TO BE OR NOT TO BE THAT IS THE QUESTION', source: 'William Shakespeare, Hamlet' },
  { text: 'ALL THE WORLDS A STAGE AND ALL THE MEN AND WOMEN MERELY PLAYERS', source: 'William Shakespeare, As You Like It' },
  { text: 'THE ONLY THING WE HAVE TO FEAR IS FEAR ITSELF', source: 'Franklin D. Roosevelt' },
  { text: 'ASK NOT WHAT YOUR COUNTRY CAN DO FOR YOU ASK WHAT YOU CAN DO FOR YOUR COUNTRY', source: 'John F. Kennedy' },
  { text: 'THAT IS ONE SMALL STEP FOR MAN ONE GIANT LEAP FOR MANKIND', source: 'Neil Armstrong' },
  { text: 'ARISE AWAKE AND STOP NOT TILL THE GOAL IS REACHED', source: 'Swami Vivekananda' },
  { text: 'WHERE THE MIND IS WITHOUT FEAR AND THE HEAD IS HELD HIGH', source: 'Rabindranath Tagore, Gitanjali' },
  { text: 'IF YOU WANT TO SHINE LIKE A SUN FIRST BURN LIKE A SUN', source: 'A. P. J. Abdul Kalam' },
  { text: 'NOTHING IN LIFE IS TO BE FEARED IT IS ONLY TO BE UNDERSTOOD', source: 'Marie Curie' },
  { text: 'IF I HAVE SEEN FURTHER IT IS BY STANDING ON THE SHOULDERS OF GIANTS', source: 'Isaac Newton' },
  { text: 'THE BEST WAY TO PREDICT THE FUTURE IS TO INVENT IT', source: 'Alan Kay' },
  { text: 'LIFE IS WHAT HAPPENS WHEN YOU ARE BUSY MAKING OTHER PLANS', source: 'John Lennon' },
  { text: 'I THINK THEREFORE I AM', source: 'Rene Descartes' },
  { text: 'KNOWLEDGE IS POWER', source: 'Francis Bacon' },
  { text: 'WHERE THERE IS A WILL THERE IS A WAY', source: 'Proverb' },
  { text: 'THE PEN IS MIGHTIER THAN THE SWORD', source: 'Edward Bulwer-Lytton' },
  { text: 'FORTUNE FAVOURS THE BOLD', source: 'Latin proverb' },
  { text: 'IN THE MIDDLE OF DIFFICULTY LIES OPPORTUNITY', source: 'Albert Einstein' },
  { text: 'BE THE CHANGE THAT YOU WISH TO SEE IN THE WORLD', source: 'Attributed to Mahatma Gandhi' },
  { text: 'THE ROOTS OF EDUCATION ARE BITTER BUT THE FRUIT IS SWEET', source: 'Aristotle' },
  { text: 'IT DOES NOT MATTER HOW SLOWLY YOU GO AS LONG AS YOU DO NOT STOP', source: 'Confucius' },
  { text: 'A PERSON WHO NEVER MADE A MISTAKE NEVER TRIED ANYTHING NEW', source: 'Albert Einstein' },
  { text: 'WATER BOILS AT ONE HUNDRED DEGREES CELSIUS AT SEA LEVEL', source: 'Fact' },
  { text: 'LIGHT FROM THE SUN TAKES ABOUT EIGHT MINUTES TO REACH THE EARTH', source: 'Fact' },
  { text: 'AN ADULT HUMAN SKELETON HAS TWO HUNDRED AND SIX BONES', source: 'Fact' },
  { text: 'MOUNT EVEREST IS THE HIGHEST MOUNTAIN ABOVE SEA LEVEL', source: 'Fact' },
  { text: 'THE PACIFIC IS THE LARGEST AND DEEPEST OCEAN ON EARTH', source: 'Fact' },
  { text: 'JUPITER IS THE LARGEST PLANET IN OUR SOLAR SYSTEM', source: 'Fact' },
  { text: 'SOUND TRAVELS FASTER IN WATER THAN IN AIR', source: 'Fact' },
  { text: 'DIAMOND AND GRAPHITE ARE BOTH MADE ENTIRELY OF CARBON', source: 'Fact' },
  { text: 'PLANTS MAKE THEIR FOOD FROM SUNLIGHT BY PHOTOSYNTHESIS', source: 'Fact' },
  { text: 'SOUND CANNOT TRAVEL THROUGH THE VACUUM OF SPACE', source: 'Fact' },
  { text: 'VENUS IS THE HOTTEST PLANET IN OUR SOLAR SYSTEM', source: 'Fact' },
  { text: 'NITROGEN MAKES UP ABOUT SEVENTY EIGHT PERCENT OF THE AIR', source: 'Fact' },
  { text: 'A LEAP YEAR HAS THREE HUNDRED AND SIXTY SIX DAYS', source: 'Fact' },
  { text: 'THE ELECTRON CARRIES A NEGATIVE ELECTRIC CHARGE', source: 'Fact' },
  { text: 'HONEYBEES MAKE HONEY FROM THE NECTAR OF FLOWERS', source: 'Fact' },
  { text: 'THE CHEETAH IS THE FASTEST ANIMAL ON LAND', source: 'Fact' },
  { text: 'THE BLUE WHALE IS THE LARGEST ANIMAL KNOWN TO HAVE LIVED', source: 'Fact' },
  { text: 'ANTARCTICA IS THE COLDEST CONTINENT ON EARTH', source: 'Fact' },
  { text: 'MARS IS CALLED THE RED PLANET BECAUSE OF IRON OXIDE DUST', source: 'Fact' },
  { text: 'THE SQUARE ROOT OF ONE HUNDRED AND FORTY FOUR IS TWELVE', source: 'Fact' },
  { text: 'ARYABHATA WAS AN INDIAN MATHEMATICIAN AND ASTRONOMER', source: 'Fact' },
  { text: 'THE GANGA RISES AT THE GANGOTRI GLACIER IN THE HIMALAYAS', source: 'Fact' },
  { text: 'DNA CARRIES THE GENETIC INSTRUCTIONS OF LIVING THINGS', source: 'Fact' },
  { text: 'THE HEART PUMPS BLOOD AROUND THE WHOLE BODY', source: 'Fact' },
  { text: 'A TRIANGLE HAS ANGLES THAT ADD UP TO ONE HUNDRED AND EIGHTY DEGREES', source: 'Fact' }
];

/** Real words used as Vigenère keys, by length. */
export const KEYWORDS = {
  3: ['SUN', 'SKY', 'ART', 'MAP', 'OWL', 'ICE', 'GEM', 'FOX', 'JAM', 'RAY'],
  4: ['STAR', 'MOON', 'BOLT', 'WAVE', 'IRON', 'LAMP', 'ROSE', 'GOLD', 'KITE', 'FERN'],
  5: ['PRISM', 'ORBIT', 'CLOUD', 'TIGER', 'QUART', 'FLAME', 'HONEY', 'PIANO', 'RIVER', 'LUNAR'],
  6: ['CIPHER', 'GALAXY', 'MARBLE', 'SPIRAL', 'ZENITH', 'BREEZE', 'COBALT', 'FROZEN', 'PUZZLE', 'VECTOR']
};

export const KINDS = ['sub', 'vig', 'trans'];

/**
 * How a level plays (Classes 11–12 = 'advanced'; another band plays one step easier). A level is three puzzles,
 * one of each kind, each worth 3 when solved (0 if abandoned).
 *  givens   — substitution letters already in the key
 *  keyLen   — Vigenère key length; vigGiven — key slots shown
 *  cols     — transposition columns
 */
export const cipherLabConfig = (ageBand, difficulty = 1, levelNo = 1) => {
  const band = ageBand === 'advanced' || !ageBand ? 'advanced' : 'other';
  const d = clampN((difficulty || 1) - (band === 'advanced' ? 0 : 1), 1, 3);
  const late = t(levelNo) >= 0.5 ? 1 : 0;
  const givens = [6, 4, 2][d - 1] - late;
  const keyLen = clampN([3, 4, 5][d - 1] + late, 3, 6);
  const vigGiven = d === 1 ? 1 : 0;
  const cols = clampN([3, 4, 5][d - 1] + late, 3, 6);
  const puzzles = 3;
  const max = puzzles * 3;
  return { band, difficulty: d, givens, keyLen, vigGiven, cols, puzzles, max, pass: Math.ceil(max * 0.55) };
};

/** Letter counts of a string, as an array of 26. */
export const letterCounts = (s) => {
  const out = Array(26).fill(0);
  for (const ch of s) if (isLetter(ch)) out[code(ch)]++;
  return out;
};

/* ── Substitution ─────────────────────────────────────────────────────────── */

/** A random key with no letter left in place: key[plainIndex] = cipher letter. */
const derangement = (rng) => {
  for (;;) {
    const k = shuffle(rng, [...ABC]);
    if (k.every((c, i) => c !== ABC[i])) return k.join('');
  }
};

/** Decrypt with a partial key map { cipherLetter: plainLetter }; unknown letters become '_'. */
export const subDecrypt = (cipher, map) => [...cipher].map((ch) => (isLetter(ch) ? map[ch] || '_' : ch)).join('');

/* ── Vigenère ─────────────────────────────────────────────────────────────── */

/** Encrypt (dir 1) or decrypt (dir −1), counting letters only for the key position. Unknown key slot → '_'. */
export const vigenere = (text, key, dir = 1) => {
  let i = 0;
  return [...text].map((ch) => {
    if (!isLetter(ch)) return ch;
    const k = key[i % key.length];
    i++;
    if (!k || k === '_') return '_';
    return chr(code(ch) + dir * code(k));
  }).join('');
};

/** Letter counts of the cipher letters under one key slot. */
export const slotCounts = (cipher, keyLen, slot) => letterCounts(lettersOf(cipher).split('').filter((_, i) => i % keyLen === slot).join(''));

/* ── Columnar transposition ───────────────────────────────────────────────── */

/** The message as a grid of `cols` columns (letters only, padded with X): returns column strings. */
export const toColumns = (letters, cols) => {
  const rows = Math.ceil(letters.length / cols);
  const padded = letters.padEnd(rows * cols, 'X');
  return Array.from({ length: cols }, (_, c) => Array.from({ length: rows }, (_, r) => padded[r * cols + c]).join(''));
};
/** Read a row of column strips across, top row first. */
export const readColumns = (strips) => {
  const rows = strips[0].length;
  let out = '';
  for (let r = 0; r < rows; r++) for (const s of strips) out += s[r];
  return out;
};

/* ── Puzzles ──────────────────────────────────────────────────────────────── */

const pickText = (rng, used, test) => {
  const pool = TEXTS.filter((x) => !used.has(x.text) && test(lettersOf(x.text).length));
  const chosen = pick(rng, pool.length ? pool : TEXTS.filter((x) => !used.has(x.text)));
  used.add(chosen.text);
  return chosen;
};

export const makeCipherPuzzle = (rng, kind, cfg, used = new Set()) => {
  if (kind === 'sub') {
    const src = pickText(rng, used, (n) => n >= 32);
    const key = derangement(rng);
    const cipher = [...src.text].map((ch) => (isLetter(ch) ? key[code(ch)] : ch)).join('');
    const solution = {};
    for (const ch of new Set(lettersOf(src.text))) solution[key[code(ch)]] = ch;
    // Given letters: never the most frequent cipher letters, so the frequency chart still has work to do.
    const counts = letterCounts(cipher);
    const present = Object.keys(solution).sort((a, b) => counts[code(b)] - counts[code(a)]);
    const givens = sample(rng, present.slice(3), Math.min(cfg.givens, present.length - 3));
    return { kind, ...src, cipher, solution, givens: Object.fromEntries(givens.map((c) => [c, solution[c]])) };
  }
  if (kind === 'vig') {
    const src = pickText(rng, used, (n) => n >= cfg.keyLen * 7);
    const key = pick(rng, KEYWORDS[cfg.keyLen]);
    const cipher = vigenere(src.text, key, 1);
    const shown = sample(rng, [...Array(cfg.keyLen).keys()], cfg.vigGiven);
    return { kind, ...src, cipher, key, keyLen: cfg.keyLen, givenSlots: shown };
  }
  const src = pickText(rng, used, (n) => n >= cfg.cols * 4 && n <= cfg.cols * 10);
  const letters = lettersOf(src.text);
  const columns = toColumns(letters, cfg.cols);
  const target = readColumns(columns);
  let order;
  do order = shuffle(rng, [...Array(cfg.cols).keys()]);
  while (readColumns(order.map((i) => columns[i])) === target);
  // strips[j] is column order[j] of the true grid; the player puts them back in true order.
  return { kind, ...src, cols: cfg.cols, strips: order.map((i) => columns[i]), order, target };
};

export const makeCipherLabLevel = (rng, cfg) => {
  const used = new Set();
  return shuffle(rng, KINDS).slice(0, cfg.puzzles).map((kind) => makeCipherPuzzle(rng, kind, cfg, used));
};

/** The live decryption for a player's state: sub → { map }, vig → { key: [letters|null] }, trans → { arrangement: strip indexes }. */
export const decryptWith = (puzzle, state) => {
  if (puzzle.kind === 'sub') return subDecrypt(puzzle.cipher, state.map);
  if (puzzle.kind === 'vig') return vigenere(puzzle.cipher, state.key.map((k) => k || '_'), -1);
  return readColumns(state.arrangement.map((i) => puzzle.strips[i]));
};
/** Solved when the decryption is exactly the plaintext. */
export const isSolved = (puzzle, state) => {
  const out = decryptWith(puzzle, state);
  return puzzle.kind === 'trans' ? out === puzzle.target : out === puzzle.text;
};
/** The state that solves it. */
export const solutionState = (puzzle) => {
  if (puzzle.kind === 'sub') return { map: { ...puzzle.solution } };
  if (puzzle.kind === 'vig') return { key: [...puzzle.key] };
  const arrangement = [];
  for (let c = 0; c < puzzle.cols; c++) arrangement.push(puzzle.order.indexOf(c));
  return { arrangement };
};
/** The state a puzzle opens in. */
export const startState = (puzzle) => {
  if (puzzle.kind === 'sub') return { map: { ...puzzle.givens } };
  if (puzzle.kind === 'vig') return { key: Array.from({ length: puzzle.keyLen }, (_, i) => (puzzle.givenSlots.includes(i) ? puzzle.key[i] : null)) };
  return { arrangement: [...Array(puzzle.cols).keys()] };
};
/** Assign plain letter `p` to cipher letter `c` (a plain letter can serve one cipher letter only; null clears). */
export const assignLetter = (state, c, p) => {
  const map = Object.fromEntries(Object.entries(state.map).filter(([k, v]) => k !== c && (p === null || v !== p)));
  if (p) map[c] = p;
  return { map };
};
/** Puzzle score: 3 when solved; 0 when abandoned. */
export const puzzleScore = (solved) => (solved ? 3 : 0);
