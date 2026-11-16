/**
 * Strategic Constraint Lab (Master Minds) — scheduling puzzles, pure and seeded.
 *
 * Tasks go into days; each day holds a limited number. A hidden valid schedule is
 * dealt first and every rule is read off it, so every puzzle has a solution.
 * Rules are added one at a time, each one cutting the number of valid schedules,
 * until few are left. On cost levels each day has a fee per hour and each task a
 * length in hours; the cheapest valid schedule (found by a backtracking search)
 * sets the target.
 */
import { intBetween, shuffle, sample } from '../seeded.js';

export const TASKS = ['Audit', 'Budget', 'Coding', 'Design', 'Editing', 'Forecast', 'Graphics', 'Hiring'];
export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const clampN = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/** How a level plays, by band ('advanced'), difficulty 1–3 and step 1–30. */
export const constraintConfig = (ageBand, difficulty = 1, levelNo = 1) => {
  const d = clampN(difficulty || 1, 1, 3);
  const late = (levelNo || 1) >= 15;
  if (d === 1) return { band: 'advanced', items: late ? 6 : 5, slots: 3, cap: 2, puzzles: 3, pass: 2, attempts: 3, target: 10, maxRules: 6, cost: false, tolerance: 0, kinds: ['before', 'apart', 'together', 'on', 'notOn'] };
  if (d === 2) return { band: 'advanced', items: 6, slots: late ? 4 : 3, cap: 2, puzzles: 3, pass: 2, attempts: 3, target: late ? 12 : 6, maxRules: 7, cost: late, tolerance: 0.15, kinds: ['before', 'apart', 'together', 'notOn', 'gap'] };
  return { band: 'advanced', items: late ? 8 : 7, slots: 4, cap: 2, puzzles: 3, pass: 2, attempts: 3, target: 20, maxRules: 8, cost: true, tolerance: 0, kinds: ['before', 'apart', 'together', 'notOn', 'gap'] };
};

/** Is one rule met by a full or partial schedule? true / false / null (not both tasks placed yet). */
export const ruleState = (rule, assign) => {
  const a = assign[rule.a];
  const b = rule.b === undefined ? undefined : assign[rule.b];
  if (a === undefined || a === null) return null;
  if (rule.b !== undefined && (b === undefined || b === null)) return null;
  switch (rule.kind) {
    case 'before': return a < b;
    case 'gap': return b - a >= 2;
    case 'apart': return a !== b;
    case 'together': return a === b;
    case 'on': return a === rule.s;
    case 'notOn': return a !== rule.s;
    default: return false;
  }
};

export const ruleText = (rule, tasks = TASKS, days = DAYS) => {
  const A = tasks[rule.a];
  const B = rule.b === undefined ? '' : tasks[rule.b];
  switch (rule.kind) {
    case 'before': return `${A} on an earlier day than ${B}`;
    case 'gap': return `${B} at least two days after ${A}`;
    case 'apart': return `${A} and ${B} not on the same day`;
    case 'together': return `${A} and ${B} on the same day`;
    case 'on': return `${A} on ${days[rule.s]}`;
    case 'notOn': return `${A} not on ${days[rule.s]}`;
    default: return '';
  }
};

/** Cost of a full schedule: Σ hours × day fee. */
export const scheduleCost = (puzzle, assign) => assign.reduce((s, day, i) => s + puzzle.hours[i] * puzzle.fees[day], 0);

/**
 * Backtracking over every valid schedule: { count (capped), best: { cost, assign } }.
 * Rules are checked as soon as both their tasks are placed.
 */
export const solveSchedule = (puzzle, countCap = 100000) => {
  const n = puzzle.items;
  const byLast = Array.from({ length: n }, () => []);
  for (const r of puzzle.rules) byLast[Math.max(r.a, r.b === undefined ? r.a : r.b)].push(r);
  const load = Array(puzzle.slots).fill(0);
  const assign = Array(n).fill(null);
  let count = 0;
  let best = null;
  const go = (i) => {
    if (count >= countCap) return;
    if (i === n) {
      count += 1;
      if (puzzle.fees) {
        const cost = scheduleCost(puzzle, assign);
        if (!best || cost < best.cost) best = { cost, assign: [...assign] };
      } else if (!best) best = { cost: 0, assign: [...assign] };
      return;
    }
    for (let s = 0; s < puzzle.slots; s++) {
      if (load[s] >= puzzle.caps[s]) continue;
      assign[i] = s;
      if (byLast[i].every((r) => ruleState(r, assign) === true)) {
        load[s] += 1;
        go(i + 1);
        load[s] -= 1;
      }
      assign[i] = null;
    }
  };
  go(0);
  return { count, best };
};

/** All rules a schedule satisfies, as candidates. */
const candidates = (rng, config, hidden) => {
  const out = [];
  const n = config.items;
  for (let a = 0; a < n; a++) {
    for (let b = 0; b < n; b++) {
      if (a === b) continue;
      if (config.kinds.includes('before') && hidden[a] < hidden[b]) out.push({ kind: 'before', a, b });
      if (config.kinds.includes('gap') && hidden[b] - hidden[a] >= 2) out.push({ kind: 'gap', a, b });
      if (a < b && config.kinds.includes('apart') && hidden[a] !== hidden[b]) out.push({ kind: 'apart', a, b });
      if (a < b && config.kinds.includes('together') && hidden[a] === hidden[b]) out.push({ kind: 'together', a, b });
    }
    for (let s = 0; s < config.slots; s++) {
      if (config.kinds.includes('notOn') && hidden[a] !== s) out.push({ kind: 'notOn', a, s });
      if (config.kinds.includes('on') && hidden[a] === s) out.push({ kind: 'on', a, s });
    }
  }
  return shuffle(rng, out);
};

/**
 * One puzzle: { items, slots, caps, tasks, days, rules, hidden, fees?, hours?, optimum?, target? , count }.
 * target is the cost to beat (≤) on cost levels.
 */
export const makeConstraintPuzzle = (rng, config) => {
  const caps = Array(config.slots).fill(config.cap);
  // A spare place when the days are exactly full makes the search less forced.
  if (caps.reduce((s, c) => s + c, 0) < config.items + 1) caps[intBetween(rng, 0, config.slots - 1)] += 1;
  const order = shuffle(rng, Array.from({ length: config.items }, (_, i) => i));
  const hidden = Array(config.items).fill(0);
  const load = Array(config.slots).fill(0);
  for (const i of order) {
    const open = Array.from({ length: config.slots }, (_, s) => s).filter((s) => load[s] < caps[s]);
    const s = open[Math.floor(rng() * open.length)];
    hidden[i] = s;
    load[s] += 1;
  }
  const puzzle = { items: config.items, slots: config.slots, caps, tasks: TASKS.slice(0, config.items), days: DAYS.slice(0, config.slots), rules: [], hidden };
  if (config.cost) {
    puzzle.fees = shuffle(rng, sample(rng, [2, 3, 4, 5, 6, 7, 8], config.slots));
    puzzle.hours = Array.from({ length: config.items }, () => intBetween(rng, 1, 4));
  }
  let count = solveSchedule(puzzle, 5000).count;
  const used = new Set();
  for (const r of candidates(rng, config, hidden)) {
    if (puzzle.rules.length >= config.maxRules || count <= config.target) break;
    const key = r.b === undefined ? `${r.a}` : `${Math.min(r.a, r.b)}-${Math.max(r.a, r.b)}`;
    if (used.has(key)) continue;
    const next = solveSchedule({ ...puzzle, rules: [...puzzle.rules, r] }, 5000).count;
    if (next < count && next >= 1) {
      puzzle.rules.push(r);
      used.add(key);
      count = next;
    }
  }
  puzzle.count = count;
  if (config.cost) {
    const { best } = solveSchedule(puzzle);
    puzzle.optimum = best.cost;
    puzzle.solution = best.assign;
    puzzle.target = Math.floor(best.cost * (1 + config.tolerance));
  } else {
    puzzle.solution = hidden;
  }
  return puzzle;
};

export const makeConstraintLevel = (rng, config) => Array.from({ length: config.puzzles }, () => makeConstraintPuzzle(rng, config));

/**
 * Judge a (possibly partial) schedule: assign[i] = day index or null.
 * { rules: [true|false|null], loads, capsOk, complete, valid, cost, ok }.
 */
export const checkSchedule = (puzzle, assign) => {
  const rules = puzzle.rules.map((r) => ruleState(r, assign));
  const loads = Array(puzzle.slots).fill(0);
  assign.forEach((s) => { if (s !== null && s !== undefined) loads[s] += 1; });
  const capsOk = loads.map((l, s) => l <= puzzle.caps[s]);
  const complete = assign.length === puzzle.items && assign.every((s) => s !== null && s !== undefined);
  const valid = complete && rules.every((x) => x === true) && capsOk.every(Boolean);
  const cost = complete && puzzle.fees ? scheduleCost(puzzle, assign) : null;
  const ok = valid && (puzzle.fees ? cost <= puzzle.target : true);
  return { rules, loads, capsOk, complete, valid, cost, ok };
};
