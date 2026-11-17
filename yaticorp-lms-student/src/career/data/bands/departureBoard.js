/**
 * Departure Board (2026-11-16, Master Minds · Memory & Focus; id "departure-board"). Pure and seeded.
 *
 * An airport board of flights is shown for a few seconds — destination, time, flight number, gate — then it goes blank
 * and you answer questions from memory: "Which gate is the flight to Tokyo?", "Which flight leaves first?". At higher
 * levels an announcement changes a gate or delays a flight after the board is gone, and the questions use the NEW
 * board, so the old detail has to be replaced in your head. Levels: more flights, more columns, less time, more changes.
 */
import { intBetween, pick, sample, shuffle } from '../seeded.js';

export const CITIES = [
  'Tokyo', 'Paris', 'London', 'Dubai', 'Sydney', 'Rome', 'Cairo', 'Delhi', 'Mumbai', 'Singapore', 'Toronto', 'Nairobi',
  'Berlin', 'Madrid', 'Lisbon', 'Seoul', 'Bangkok', 'Istanbul', 'Moscow', 'Chennai', 'Kolkata', 'Athens', 'Vienna',
  'Oslo', 'Lima', 'Doha', 'Muscat', 'Dhaka', 'Colombo', 'Kathmandu', 'Zurich', 'Prague'
];
const AIRLINES = ['AI', 'EK', 'QR', 'BA', 'LH', 'SQ', 'AF', 'TK', 'UK', 'JL'];

const clampN = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/** "HH:MM" from minutes after midnight. */
export const clock = (mins) => `${String(Math.floor(mins / 60) % 24).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

/** Flights per board, columns shown, study seconds, announcements, boards and questions per board. */
export const boardConfig = (ageBand, difficulty = 1, levelNo = 1) => {
  const s = clampN(Math.ceil(levelNo / 3) + ((difficulty || 1) - 1) * 2 + (ageBand === 'advanced' ? 1 : 0), 1, 14);
  const flights = s <= 2 ? 3 : s <= 5 ? 4 : s <= 9 ? 5 : 6;
  const fields = s <= 2 ? ['dest', 'gate'] : s <= 5 ? ['dest', 'time', 'gate'] : ['dest', 'time', 'flight', 'gate'];
  const changes = s <= 5 ? 0 : s <= 10 ? 1 : 2;
  const perCell = s <= 4 ? 2.2 : s <= 9 ? 1.8 : 1.5;
  return {
    flights,
    fields,
    changes,
    seconds: clampN(Math.round(flights * (fields.length - 1) * perCell + 3), 6, 30),
    boards: 3,
    questions: s <= 5 ? 3 : 4
  };
};

/** One board: unique destinations, gates, times and flight numbers. Sorted by time, like a real board. */
export const makeBoard = (rng, cfg) => {
  const dests = sample(rng, CITIES, cfg.flights);
  const gates = sample(rng, ['A', 'B', 'C', 'D'].flatMap((l) => Array.from({ length: 9 }, (_, i) => `${l}${i + 1}`)), cfg.flights + cfg.changes);
  const start = intBetween(rng, 6 * 12, 20 * 12) * 5; // a 5-minute slot between 06:00 and 20:00
  const times = sample(rng, Array.from({ length: 24 }, (_, i) => start + i * 10), cfg.flights).sort((a, b) => a - b);
  const codes = new Set();
  while (codes.size < cfg.flights) codes.add(`${pick(rng, AIRLINES)} ${intBetween(rng, 101, 989)}`);
  const codeList = [...codes];
  const rows = dests.map((dest, i) => ({ dest, time: times[i], flight: codeList[i], gate: gates[i] }));
  return { rows, spareGates: gates.slice(cfg.flights) };
};

/**
 * Announcements: a gate change (to a gate not on the board) or a delay (to a time not on the board). Returns the
 * notes and the board after them.
 */
export const makeChanges = (rng, board, cfg) => {
  const rows = board.rows.map((r) => ({ ...r }));
  const notes = [];
  const picked = sample(rng, rows.map((_, i) => i), cfg.changes);
  picked.forEach((i, k) => {
    const row = rows[i];
    const useTime = cfg.fields.includes('time') && rng() < 0.5;
    if (useTime) {
      const taken = new Set(rows.map((r) => r.time));
      const options = [20, 25, 30, 35, 40, 45].map((d) => row.time + d).filter((t) => !taken.has(t));
      const to = pick(rng, options);
      notes.push({ kind: 'time', dest: row.dest, from: row.time, to, text: `The flight to ${row.dest} is delayed to ${clock(to)}.` });
      row.time = to;
    } else {
      const to = board.spareGates[k];
      notes.push({ kind: 'gate', dest: row.dest, from: row.gate, to, text: `The flight to ${row.dest} now leaves from gate ${to}.` });
      row.gate = to;
    }
  });
  return { notes, rows };
};

const fmt = (field, v) => (field === 'time' ? clock(v) : v);

/** Four options: the answer, the trap (an old value) if any, then others from the board, then made-up ones. */
const optionsFor = (rng, field, answer, rows, trap) => {
  const own = rows.map((r) => r[field]).filter((v) => v !== answer && v !== trap);
  const extra = field === 'dest' ? CITIES : field === 'gate' ? ['A3', 'B5', 'C2', 'D7', 'A8', 'B1'] : field === 'time' ? [answer + 15, answer - 25, answer + 50] : ['EK 404', 'AI 202', 'SQ 318'];
  const pool = [...new Set([...(trap !== undefined ? [trap] : []), ...shuffle(rng, own), ...shuffle(rng, extra)])].filter((v) => v !== answer);
  return shuffle(rng, [answer, ...pool.slice(0, 3)]).map((v) => fmt(field, v));
};

const ASK = {
  gate: (r) => `Which gate is the flight to ${r.dest}?`,
  time: (r) => `What time does the flight to ${r.dest} leave?`,
  flight: (r) => `What is the flight number to ${r.dest}?`
};

/**
 * The questions for one board (asked about the board AFTER the announcements). Each: { prompt, options, answer }.
 * Each announced flight gets one question about what changed, with its old value as a trap.
 */
export const makeQuestions = (rng, rows, cfg, notes = []) => {
  const qs = [];
  notes.forEach((n) => {
    const r = rows.find((x) => x.dest === n.dest);
    qs.push({ prompt: ASK[n.kind](r), answer: fmt(n.kind, r[n.kind]), options: optionsFor(rng, n.kind, r[n.kind], rows, n.from), about: r.dest });
  });
  const kinds = cfg.fields.filter((f) => f !== 'dest');
  const forward = shuffle(rng, rows.filter((r) => !notes.some((n) => n.dest === r.dest)).concat(rows));
  const makers = [
    () => { const r = forward.find((x) => !qs.some((q) => q.about === x.dest)) || forward[0]; const f = pick(rng, kinds); return { prompt: ASK[f](r), answer: fmt(f, r[f]), options: optionsFor(rng, f, r[f], rows), about: r.dest }; },
    () => { const r = pick(rng, rows); return { prompt: `Which city is the flight from gate ${r.gate} going to?`, answer: r.dest, options: optionsFor(rng, 'dest', r.dest, rows), about: r.dest }; }
  ];
  if (cfg.fields.includes('time')) {
    makers.push(() => { const r = rows.reduce((a, b) => (b.time < a.time ? b : a)); return { prompt: 'Which flight leaves FIRST?', answer: r.dest, options: optionsFor(rng, 'dest', r.dest, rows), about: '*first' }; });
    makers.push(() => { const r = rows.reduce((a, b) => (b.time > a.time ? b : a)); return { prompt: 'Which flight leaves LAST?', answer: r.dest, options: optionsFor(rng, 'dest', r.dest, rows), about: '*last' }; });
  }
  if (cfg.fields.includes('flight')) {
    makers.push(() => { const r = pick(rng, rows); return { prompt: `Where is flight ${r.flight} going?`, answer: r.dest, options: optionsFor(rng, 'dest', r.dest, rows), about: r.dest }; });
  }
  let guard = 0;
  while (qs.length < cfg.questions && guard++ < 60) {
    const q = pick(rng, makers)();
    if (!qs.some((x) => x.prompt === q.prompt)) qs.push(q);
  }
  return qs.map(({ about: _about, ...q }) => q);
};

/** A level: `boards` boards, each with its announcements and questions. */
export const makeBoardLevel = (rng, cfg) => Array.from({ length: cfg.boards }, () => {
  const board = makeBoard(rng, cfg);
  const { notes, rows } = makeChanges(rng, board, cfg);
  return { shown: board.rows, notes, rows, questions: makeQuestions(rng, rows, cfg, notes) };
});
