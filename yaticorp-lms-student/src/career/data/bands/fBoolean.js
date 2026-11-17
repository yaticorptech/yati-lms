/**
 * Boolean Breaker (Master Minds, Classes 11–12) — pure and seeded.
 *
 * A circuit: `n` input switches and a list of gates (AND, OR, NOT, XOR, NAND). Nodes 0..n−1 are the inputs, node n+i
 * is gate i, and the last gate drives the lamp. Every gate is used, every input matters, and the lamp is not stuck.
 * Three tasks:
 *  'light'   — set the switches so the lamp lights; only a few power-on tests, and the lamp is dark until you test.
 *  'table'   — fill the lamp column of the truth table (every switch combination).
 *  'missing' — one gate is hidden; the full truth table is shown; name the gate (exactly one fits).
 */
import { shuffle, pick } from '../seeded.js';

const clampN = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const t = (levelNo) => clampN(((levelNo || 1) - 1) / 29, 0, 1);

export const GATES = ['AND', 'OR', 'NOT', 'XOR', 'NAND'];
export const BINARY = ['AND', 'OR', 'XOR', 'NAND'];
export const INPUT_NAMES = ['A', 'B', 'C', 'D'];

export const applyGate = (op, a, b) => {
  switch (op) {
    case 'AND': return a & b;
    case 'OR': return a | b;
    case 'NOT': return a ^ 1;
    case 'XOR': return a ^ b;
    case 'NAND': return (a & b) ^ 1;
    default: throw new Error(`unknown gate ${op}`);
  }
};

/** Evaluate: `bits` are the inputs (0/1); `ops` optionally overrides gate ops. Returns every node's value and the lamp. */
export const evaluate = (circuit, bits, ops = null) => {
  const v = [...bits];
  circuit.gates.forEach((g, i) => {
    const op = ops ? ops[i] : g.op;
    v.push(applyGate(op, v[g.a], op === 'NOT' ? 0 : v[g.b]));
  });
  return { values: v, out: v[v.length - 1] };
};

/** Row r of the truth table: input k is bit (n−1−k) of r, so rows run 000, 001, … like a textbook table. */
export const rowBits = (n, r) => Array.from({ length: n }, (_, k) => (r >> (n - 1 - k)) & 1);
export const truthTable = (circuit, ops = null) =>
  Array.from({ length: 2 ** circuit.n }, (_, r) => evaluate(circuit, rowBits(circuit.n, r), ops).out);

/** Depth of each node (inputs 0), for drawing gates in columns. */
export const depths = (circuit) => {
  const d = Array(circuit.n).fill(0);
  circuit.gates.forEach((g) => d.push(1 + Math.max(d[g.a], g.op === 'NOT' ? 0 : d[g.b])));
  return d;
};

const usesAll = (circuit) => {
  const total = circuit.n + circuit.gates.length;
  const used = new Set([total - 1]);
  for (let i = circuit.gates.length - 1; i >= 0; i--) {
    const node = circuit.n + i;
    if (!used.has(node)) return false;
    const g = circuit.gates[i];
    used.add(g.a);
    if (g.op !== 'NOT') used.add(g.b);
  }
  return used.size === total;
};

/** Every input changes the lamp for at least one setting of the others. */
const everyInputMatters = (circuit, table) =>
  [...Array(circuit.n).keys()].every((k) => table.some((v, r) => v !== table[r ^ (1 << (circuit.n - 1 - k))]));

/** A random circuit of `n` inputs and `g` gates that passes the checks above. */
export const makeCircuit = (rng, n, g) => {
  for (let tries = 0; tries < 2000; tries++) {
    const gates = [];
    const unused = new Set([...Array(n).keys()]);
    for (let i = 0; i < g; i++) {
      const node = n + i;
      const last = i === g - 1;
      const pool = [...Array(node).keys()];
      const pref = [...unused];
      const op = !last && rng() < 0.18 ? 'NOT' : pick(rng, BINARY);
      const takeA = pref.length ? pick(rng, pref) : pick(rng, pool);
      // No NOT of a NOT, and NOT never sits on a raw switch twice.
      if (op === 'NOT' && gates[takeA - n]?.op === 'NOT') { i--; continue; }
      let b = 0;
      if (op !== 'NOT') {
        const rest = pref.filter((x) => x !== takeA);
        const others = pool.filter((x) => x !== takeA);
        b = rest.length ? pick(rng, rest) : pick(rng, others);
        unused.delete(b);
      }
      unused.delete(takeA);
      unused.add(node);
      gates.push(op === 'NOT' ? { op, a: takeA } : { op, a: takeA, b });
    }
    const circuit = { n, gates };
    if (!usesAll(circuit)) continue;
    const table = truthTable(circuit);
    const ones = table.filter(Boolean).length;
    if (ones === 0 || ones === table.length) continue;
    if (!everyInputMatters(circuit, table)) continue;
    return circuit;
  }
  throw new Error('no circuit');
};

/**
 * How a level plays (Classes 11–12 = 'advanced'; another band plays one step easier).
 *  rounds, pass — tasks per level, how many to get right
 *  inputs, gates — circuit size (tables stay at ≤ 3 inputs: 8 rows)
 *  tests        — power-on tests allowed in a 'light' task
 */
export const booleanConfig = (ageBand, difficulty = 1, levelNo = 1) => {
  const band = ageBand === 'advanced' || !ageBand ? 'advanced' : 'other';
  const d = clampN((difficulty || 1) - (band === 'advanced' ? 0 : 1), 1, 3);
  const late = t(levelNo) >= 0.5 ? 1 : 0;
  const rounds = [5, 6, 6][d - 1];
  const inputs = [2 + late, 3, 3][d - 1];
  const lightInputs = [inputs, 3 + late, 4][d - 1];
  const gates = [2 + late, 3 + late, 4 + late][d - 1];
  const tests = [3, 3, 2][d - 1];
  return { band, difficulty: d, rounds, pass: Math.ceil(rounds * 0.6), inputs, lightInputs, gates, tests };
};

/** One task of the given kind. */
export const makeTask = (rng, kind, cfg) => {
  if (kind === 'light') {
    const circuit = makeCircuit(rng, cfg.lightInputs, cfg.gates + (cfg.lightInputs > cfg.inputs ? 1 : 0));
    const table = truthTable(circuit);
    const offRows = table.map((v, r) => (v ? -1 : r)).filter((r) => r >= 0);
    const start = offRows.includes(0) ? 0 : pick(rng, offRows);
    return { kind, circuit, table, start: rowBits(circuit.n, start) };
  }
  if (kind === 'table') {
    const circuit = makeCircuit(rng, cfg.inputs, cfg.gates);
    return { kind, circuit, table: truthTable(circuit) };
  }
  for (let tries = 0; tries < 500; tries++) {
    const circuit = makeCircuit(rng, cfg.inputs, cfg.gates);
    const table = truthTable(circuit);
    const binaries = circuit.gates.map((g, i) => (g.op === 'NOT' ? -1 : i)).filter((i) => i >= 0);
    for (const hidden of shuffle(rng, binaries)) {
      const fits = BINARY.filter((op) => {
        const ops = circuit.gates.map((g, i) => (i === hidden ? op : g.op));
        return truthTable(circuit, ops).every((v, r) => v === table[r]);
      });
      if (fits.length === 1) return { kind, circuit, table, hidden, options: BINARY };
    }
  }
  throw new Error('no missing-gate task');
};

export const makeBooleanLevel = (rng, cfg) => {
  const kinds = [];
  while (kinds.length < cfg.rounds) kinds.push(...shuffle(rng, ['light', 'table', 'missing']));
  return shuffle(rng, kinds.slice(0, cfg.rounds)).map((k) => makeTask(rng, k, cfg));
};

/** Checks the player's answer: light → bits; table → array of 0/1 per row; missing → op name. */
export const checkTask = (task, answer) => {
  if (task.kind === 'light') return evaluate(task.circuit, answer).out === 1;
  if (task.kind === 'table') return answer.length === task.table.length && answer.every((v, r) => v === task.table[r]);
  return answer === task.circuit.gates[task.hidden].op;
};
