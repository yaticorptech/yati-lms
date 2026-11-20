/**
 * Treasure Path for Young Thinkers (2026-11-18, the user: "make it a treasure hunt — an ancient map where the student
 * solves puzzles, answers logically, and the explorer moves"). A trail of landmarks across an old map; at each one a
 * small logic puzzle — answer it and the explorer walks on. Pure and seeded so a test can deal thousands.
 *
 * A puzzle: { kind, ask, show?, options: [{ e?, t? }], answer (index), hint, why }.
 *   ask   — the question, short and spoken plainly
 *   show  — what to look at (a row of pictures, a sum…), or null
 */
import { pick, shuffle } from './seeded.js';

/** The landmarks on the trail, in order of the walk. The last is always the treasure. */
export const LANDMARKS = [
  { e: '🌴', name: 'Palm Beach' }, { e: '🗿', name: 'Stone Head' }, { e: '🌉', name: 'Old Bridge' },
  { e: '🛕', name: 'Lost Temple' }, { e: '🌋', name: 'Fire Mountain' }, { e: '🏝️', name: 'Secret Island' },
  { e: '🐊', name: 'Croc River' }, { e: '🏔️', name: 'Snow Peak' }
];

const opts = (rng, answer, others, n = 4) => {
  const seen = new Set([JSON.stringify(answer)]);
  const rest = others.filter((o) => { const k = JSON.stringify(o); if (seen.has(k)) return false; seen.add(k); return true; });
  const list = shuffle(rng, [answer, ...shuffle(rng, rest).slice(0, n - 1)]);
  return { options: list, answer: list.findIndex((o) => JSON.stringify(o) === JSON.stringify(answer)) };
};

/* ------------------------------------------------------------- puzzle kinds -- */

const RIDDLES = [
  ['I have four legs and say “Moo”. Who am I?', '🐄', ['🐶', '🐑', '🐄', '🐔', '🐎']],
  ['I am yellow and shine in the sky in the day.', '☀️', ['🌙', '⭐', '☀️', '☁️']],
  ['You wear me on your feet.', '👟', ['🧢', '🧤', '👟', '👓']],
  ['I have a long trunk and big ears.', '🐘', ['🦒', '🐘', '🦁', '🐒']],
  ['I fall from clouds and make things wet.', '🌧️', ['🌧️', '🔥', '🌈', '❄️']],
  ['I tell you the time.', '⏰', ['📚', '⏰', '✏️', '🔑']],
  ['I live in water and have fins.', '🐟', ['🐦', '🐟', '🐈', '🐝']],
  ['You use me to open a door.', '🔑', ['🔑', '🥄', '✂️', '🎈']],
  ['I am cold and white and fall in winter.', '❄️', ['❄️', '🔥', '🌻', '☀️']],
  ['I make honey and say “Buzz”.', '🐝', ['🐞', '🦋', '🐝', '🐜']],
  ['I have a long neck and eat leaves from tall trees.', '🦒', ['🦒', '🦓', '🐢', '🐊']],
  ['You read me. I have pages.', '📚', ['📚', '📺', '🎸', '⚽']],
  ['I am round, you kick me in a game.', '⚽', ['🏀', '⚽', '🎾', '🏓']],
  ['I am orange and rabbits love me.', '🥕', ['🍌', '🥕', '🍎', '🍇']],
  ['I have wings but I am not a bird. I fly people far away.', '✈️', ['🚗', '🚢', '✈️', '🚲']],
  ['Hens lay me.', '🥚', ['🥚', '🍞', '🧀', '🥛']]
];
const riddle = (rng) => {
  const [ask, answer, pool] = pick(rng, RIDDLES);
  const o = opts(rng, { e: answer }, pool.map((e) => ({ e })), 3);
  return { kind: 'riddle', ask, show: null, ...o, hint: 'Read it again — picture it in your head.', why: `It is ${answer}!` };
};

const SETS = [['🔴', '🔵', '🟢', '🟡'], ['🐶', '🐱', '🐰', '🐸'], ['🍎', '🍌', '🍇', '🍓'], ['⭐', '🌙', '☀️', '❤️']];
const pattern = (rng, hard) => {
  const set = shuffle(rng, pick(rng, SETS));
  const shape = pick(rng, hard ? ['ABC', 'AABB', 'ABB'] : ['AB', 'AAB', 'ABB']);
  const unit = [...shape].map((l) => set['ABC'.indexOf(l)]);
  const row = Array.from({ length: unit.length * 2 + 1 }, (_, i) => unit[i % unit.length]);
  const answer = unit[row.length % unit.length];
  const o = opts(rng, { e: answer }, set.map((e) => ({ e })), 3);
  return { kind: 'pattern', ask: 'What comes next?', show: { row: [...row, '?'] }, ...o, hint: 'Find the part that repeats.', why: `It repeats ${unit.join(' ')} — so ${answer} is next.` };
};

const COUNT_E = ['🍎', '⭐', '🐟', '🌸', '🪙', '🐞', '💎'];
const count = (rng, hard) => {
  const e = pick(rng, COUNT_E);
  const n = hard ? 5 + Math.floor(rng() * 5) : 2 + Math.floor(rng() * 5);
  const o = opts(rng, { t: String(n) }, [n - 1, n + 1, n + 2, n - 2].filter((x) => x > 0).map((x) => ({ t: String(x) })), 3);
  return { kind: 'count', ask: `How many ${e} do you see?`, show: { group: Array.from({ length: n }, () => e) }, ...o, hint: 'Touch each one as you count.', why: `There are ${n} ${e}.` };
};

const SUMS_E = ['🍎', '🪙', '🍪', '🎈'];
const sum = (rng, hard) => {
  const e = pick(rng, SUMS_E);
  const minus = hard && rng() < 0.5;
  const a = minus ? 4 + Math.floor(rng() * 5) : 1 + Math.floor(rng() * 4);
  const b = minus ? 1 + Math.floor(rng() * (a - 1)) : 1 + Math.floor(rng() * 4);
  const n = minus ? a - b : a + b;
  const o = opts(rng, { t: String(n) }, [n - 1, n + 1, n + 2, n - 2].filter((x) => x >= 0).map((x) => ({ t: String(x) })), 3);
  return {
    kind: 'sum', ask: minus ? `You had ${a} ${e} and gave away ${b}. How many are left?` : `${a} ${e} and ${b} more ${e}. How many in all?`,
    show: { sum: { a, b, e, minus } }, ...o, hint: minus ? 'Start with all of them, then take some away.' : 'Put them together and count.', why: `${a} ${minus ? '−' : '+'} ${b} = ${n}.`
  };
};

const BIG = [['🐜', 1], ['🐭', 2], ['🐈', 3], ['🐕', 4], ['🐄', 6], ['🦒', 7], ['🐘', 8], ['🐳', 9]];
const bigger = (rng) => {
  const three = shuffle(rng, BIG).slice(0, 3);
  const most = rng() < 0.5;
  const answer = [...three].sort((x, y) => (most ? y[1] - x[1] : x[1] - y[1]))[0];
  const list = three.map(([e]) => ({ e }));
  return { kind: 'bigger', ask: most ? 'Which one is the BIGGEST?' : 'Which one is the SMALLEST?', show: null, options: list, answer: three.indexOf(answer), hint: 'Think how big each one is in real life.', why: `${answer[0]} is the ${most ? 'biggest' : 'smallest'}.` };
};

const OPP = [['hot 🔥', 'cold ❄️'], ['day ☀️', 'night 🌙'], ['big 🐘', 'small 🐭'], ['up ⬆️', 'down ⬇️'], ['happy 😀', 'sad 😢'], ['fast 🐆', 'slow 🐢'], ['open 📖', 'closed 📕'], ['wet 💧', 'dry 🏜️']];
const opposite = (rng) => {
  const [w, a] = pick(rng, OPP);
  const others = OPP.filter(([x]) => x !== w).map(([, y]) => ({ t: y }));
  const o = opts(rng, { t: a }, others, 3);
  return { kind: 'opposite', ask: `What is the opposite of ${w.split(' ')[0].toUpperCase()} ${w.split(' ')[1]}?`, show: null, ...o, hint: 'Opposite means as different as can be.', why: `${w} ↔ ${a}.` };
};

const ODD = [[['🍎', '🍌', '🍇'], '🚗', 'fruits'], [['🐶', '🐱', '🐰'], '🌳', 'animals'], [['🚗', '🚌', '🚲'], '🍕', 'things that move on roads'], [['🔴', '🟥', '🍓'], '🟦', 'red'], [['✏️', '🖍️', '🖊️'], '🍌', 'for writing'], [['🦅', '🐦', '🦉'], '🐟', 'birds']];
const oddOne = (rng) => {
  const [three, odd, what] = pick(rng, ODD);
  const list = shuffle(rng, [...three, odd]);
  return { kind: 'odd', ask: 'Which one does NOT belong?', show: null, options: list.map((e) => ({ e })), answer: list.indexOf(odd), hint: 'Three are the same kind of thing.', why: `${three.join(' ')} are ${what} — ${odd} is not.` };
};

const numberRun = (rng) => {
  const step = pick(rng, [1, 2, 5, 10]);
  const from = step * (1 + Math.floor(rng() * 3));
  const run = [0, 1, 2, 3].map((i) => from + i * step);
  const n = from + 4 * step;
  const o = opts(rng, { t: String(n) }, [n + step, n - 1, n + 1, n - step].map((x) => ({ t: String(x) })), 3);
  return { kind: 'numbers', ask: 'Which number comes next?', show: { row: [...run.map(String), '?'] }, ...o, hint: `How much does it grow each time?`, why: `It goes up by ${step} each time.` };
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const days = (rng) => {
  const i = Math.floor(rng() * 7);
  const after = rng() < 0.6;
  const answer = DAYS[(i + (after ? 1 : 6)) % 7];
  const o = opts(rng, { t: answer }, DAYS.map((d) => ({ t: d })), 3);
  return { kind: 'days', ask: after ? `Today is ${DAYS[i]}. What day is tomorrow?` : `Today is ${DAYS[i]}. What day was yesterday?`, show: null, ...o, hint: 'Say the days in order: Monday, Tuesday…', why: `${after ? 'After' : 'Before'} ${DAYS[i]} comes ${answer}.` };
};

/** Which kinds a band meets: the youngest picture riddles and counting; Classes 3–5 add numbers, days and sums. */
const KINDS = {
  foundation: [riddle, pattern, count, bigger, oddOne, opposite, sum],
  developing: [riddle, pattern, count, sum, numberRun, days, bigger, oddOne, opposite]
};

/** How a level plays: how many landmarks to reach the treasure. */
export const huntConfig = (band = 'foundation', levelNo = 1) => {
  // Four riddles a map (2026-11-18): the map is the user's picture — camp, temple, waterfall, mountain, the chest.
  const stops = 4;
  return { band: band === 'developing' ? 'developing' : 'foundation', stops, pass: Math.ceil(stops * 0.6), hard: levelNo >= 10 };
};

/** A hunt: the landmarks in order (the treasure last) and a puzzle at each — never the same kind twice in a row. */
export const makeHunt = (rng, cfg) => {
  const kinds = KINDS[cfg.band];
  const marks = shuffle(rng, LANDMARKS).slice(0, cfg.stops);
  const puzzles = [];
  let last = null;
  for (let i = 0; i < cfg.stops; i++) {
    const make = pick(rng, kinds.filter((k) => k !== last));
    last = make;
    puzzles.push(make(rng, cfg.hard));
  }
  return { marks, puzzles };
};
