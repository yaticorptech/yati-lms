/**
 * Equation Rush — linear equations with whole-number answers, solved by undoing
 * the operations step by step. Pure and seeded.
 *
 * An equation is built FORWARDS from its answer: start with x, apply a chain of
 * operations (× a, + b, ÷ q …) and the right-hand side is what x becomes — so the
 * answer is always a whole number and every division is exact. Solving peels the
 * chain from the outside in: each step is the inverse of the outermost operation.
 * The hardest kind also has x on the right (ax + b = cx + d): the first step
 * gathers the x terms.
 *
 *  op:   ['add', k] (k may be negative: a subtraction) | ['mul', k] (k ≠ 0, ±1) | ['div', k] (k ≥ 2)
 *  step: { type: 'add' | 'mul' | 'div' | 'subx', k }  — what to do to BOTH sides
 */
import { intBetween, pick, shuffle } from '../seeded.js';

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));

export const equationBand = (ageBand) => (ageBand === 'analytical' || ageBand === 'advanced' ? 'analytical' : 'intermediate');

/** Apply one forward op to a number (null if a division is not exact). */
export const applyOp = (v, [type, k]) => {
  if (type === 'add') return v + k;
  if (type === 'mul') return v * k;
  if (type === 'div') return v % k === 0 ? v / k : null;
  return null;
};

/** The inverse of a forward op, as a step. */
export const inverseOf = ([type, k]) =>
  type === 'add' ? { type: 'add', k: -k } : type === 'mul' ? { type: 'div', k } : { type: 'mul', k };

/** Apply a step to a number. */
export const applyStep = (v, step) => {
  if (step.type === 'add') return v + step.k;
  if (step.type === 'mul') return v * step.k;
  if (step.type === 'div') return v % step.k === 0 ? v / step.k : null;
  return null;
};

const minus = '−';
const num = (v) => (v < 0 ? `${minus}${-v}` : String(v));
const paren = (v) => (v < 0 ? `(${minus}${-v})` : String(v));

/** Label for a step button: "− 5", "÷ 3", "× (−2)", "− 2x". */
export const stepLabel = (s) => {
  if (s.type === 'add') return s.k >= 0 ? `+ ${s.k}` : `${minus} ${-s.k}`;
  if (s.type === 'mul') return `× ${paren(s.k)}`;
  if (s.type === 'div') return `÷ ${paren(s.k)}`;
  if (s.type === 'subx') return s.k >= 0 ? `${minus} ${s.k === 1 ? '' : s.k}x` : `+ ${-s.k === 1 ? '' : -s.k}x`;
  return '?';
};

/**
 * Expression tree for a chain of ops on x (inner first):
 * { t: 'x' } | { t: 'mul', k, e } | { t: 'add', k, e } | { t: 'div', k, e }
 */
export const chainTree = (ops) => ops.reduce((e, [t, k]) => ({ t, k, e }), { t: 'x' });

const isTerm = (n) => n.t === 'x' || (n.t === 'mul' && n.e.t === 'x');

/** Plain text of a tree (also the screen-reader text). */
export const treeText = (n) => {
  if (n.t === 'x') return 'x';
  if (n.t === 'num') return num(n.v);
  if (n.t === 'mul') {
    if (n.e.t === 'x') return n.k === -1 ? `${minus}x` : `${num(n.k)}x`;
    return `${num(n.k)}(${treeText(n.e)})`;
  }
  if (n.t === 'add') return `${treeText(n.e)} ${n.k >= 0 ? '+' : minus} ${Math.abs(n.k)}`;
  if (n.t === 'div') return isTerm(n.e) ? `${treeText(n.e)}/${n.k}` : `(${treeText(n.e)})/${n.k}`;
  if (n.t === 'xside') return `${n.c === 1 ? '' : n.c === -1 ? minus : num(n.c)}x ${n.d >= 0 ? '+' : minus} ${Math.abs(n.d)}`;
  return '';
};

/**
 * How a level plays.
 *  count      equations in the level
 *  kinds      equation templates to draw from
 *  xMin/xMax  range of the answer
 *  negatives  coefficients and constants may be negative
 *  seconds    level clock (pausable)
 */
export const equationConfig = (ageBand, difficulty = 1, levelNo = 1) => {
  const band = equationBand(ageBand);
  const d = clamp(difficulty || 1, 1, 3);
  const t = clamp((levelNo - 1) / 29, 0, 1);
  if (band === 'intermediate') {
    const kinds = d === 1 ? (t < 0.5 ? ['one'] : ['one', 'one', 'linear']) : d === 2 ? ['one', 'linear', 'linear', 'divadd'] : ['linear', 'divadd', 'bracket', 'bracketdiv'];
    const count = 6 + (t >= 0.5 ? 1 : 0);
    return { band, count, kinds, xMin: 1, xMax: 12 + Math.round(8 * t), negatives: false, seconds: count * (d === 1 ? 30 : 40) };
  }
  const kinds = d === 1 ? ['linear', 'divadd', 'bracket', 'bracketdiv'] : d === 2 ? ['bracket', 'frac', 'bracketconst', 'linear'] : ['both', 'frac', 'bracketconst', 'both'];
  const count = 6 + (t >= 0.5 ? 1 : 0) + (d >= 3 ? 1 : 0);
  return { band, count, kinds, xMin: -12, xMax: 15, negatives: true, seconds: count * (d === 1 ? 45 : 55) };
};

const signed = (rng, lo, hi, negatives) => (negatives && rng() < 0.45 ? -1 : 1) * intBetween(rng, lo, hi);
const coef = (rng, lo, hi, negatives) => signed(rng, lo, hi, negatives);

/** Forward ops for a template. */
const opsFor = (rng, kind, cfg) => {
  const neg = cfg.negatives;
  switch (kind) {
    case 'one': return [pick(rng, [['add', intBetween(rng, 2, 20)], ['add', -intBetween(rng, 2, 15)], ['mul', intBetween(rng, 2, 9)], ['div', intBetween(rng, 2, 6)]])];
    case 'linear': return [['mul', coef(rng, 2, 9, neg)], ['add', signed(rng, 1, 20, neg || rng() < 0.4)]];
    case 'divadd': return [['div', intBetween(rng, 2, 6)], ['add', signed(rng, 1, 15, neg || rng() < 0.4)]];
    case 'bracket': return [['add', signed(rng, 1, 9, neg || rng() < 0.4)], ['mul', coef(rng, 2, 6, neg)]];
    case 'bracketdiv': return [['add', signed(rng, 1, 12, neg || rng() < 0.4)], ['div', intBetween(rng, 2, 5)]];
    case 'frac': {
      const q = intBetween(rng, 2, 5);
      let p = intBetween(rng, 2, 7);
      while (gcd(p, q) !== 1) p += 1;
      return [['mul', neg && rng() < 0.3 ? -p : p], ['div', q], ['add', signed(rng, 1, 12, neg)]];
    }
    case 'bracketconst': return [['add', signed(rng, 1, 9, neg)], ['mul', coef(rng, 2, 5, neg)], ['add', signed(rng, 1, 15, neg)]];
    default: return null;
  }
};

/**
 * One equation:
 *  { x, kind, lines: [{ left: tree, right: tree }], steps: [step], finalText }
 *  lines[0] is the question; lines[i + 1] is what step i leaves (the last line is x = …).
 *  finalText is how the last line reads before it is worked out ("x = 15 ÷ 3").
 */
export const makeEquation = (rng, cfg, kind) => {
  for (let guard = 0; guard < 400; guard++) {
    const x = intBetween(rng, cfg.xMin, cfg.xMax);
    if (x === 0) continue;
    if (kind === 'both') {
      // ax + b = cx + d, with a − c a usable coefficient.
      const c = coef(rng, 2, 6, true);
      const diff = coef(rng, 2, 5, true);
      const a = c + diff;
      if (a === 0 || a === 1 || a === -1) continue;
      const b = signed(rng, 1, 15, true);
      const d = diff * x + b;
      if (Math.abs(d) > 80) continue;
      const ops = [['mul', diff], ['add', b]];
      const first = { left: { t: 'add', k: b, e: { t: 'mul', k: a, e: { t: 'x' } } }, right: { t: 'xside', c, d } };
      return finishEquation(x, kind, ops, d, [{ type: 'subx', k: c }], [first]);
    }
    const ops = opsFor(rng, kind, cfg);
    let v = x;
    let ok = true;
    for (const op of ops) {
      v = applyOp(v, op);
      if (v === null || (!cfg.negatives && v <= 0) || Math.abs(v) > 120) { ok = false; break; }
    }
    if (!ok) continue;
    return finishEquation(x, kind, ops, v, [], []);
  }
  return null;
};

const finishEquation = (x, kind, ops, rhs, preSteps, preLines) => {
  const steps = [...preSteps];
  const lines = [...preLines];
  let remaining = [...ops];
  let value = rhs;
  lines.push({ left: chainTree(remaining), right: { t: 'num', v: value } });
  let finalText = '';
  while (remaining.length) {
    const op = remaining[remaining.length - 1];
    const step = inverseOf(op);
    steps.push(step);
    const before = value;
    value = applyStep(value, step) + 0;   // never −0
    remaining = remaining.slice(0, -1);
    if (!remaining.length) finalText = `x = ${num(before)} ${stepLabel(step)}`;
    lines.push({ left: chainTree(remaining), right: { t: 'num', v: value } });
  }
  return { x, kind, ops, steps, lines, finalText };
};

/** The options for a step: the right inverse plus three tempting wrong moves, all different. */
export const stepOptions = (rng, eq, i) => {
  const right = eq.steps[i];
  const labels = new Set([stepLabel(right)]);
  const wrong = [];
  const add = (s) => { const l = stepLabel(s); if (!labels.has(l) && wrong.length < 3) { labels.add(l); wrong.push(s); } };
  if (right.type === 'subx') {
    add({ type: 'subx', k: -right.k });
    add({ type: 'mul', k: right.k });
    add({ type: 'div', k: Math.abs(right.k) });
  } else {
    // Doing the operation again instead of undoing it.
    add(right.type === 'add' ? { type: 'add', k: -right.k } : right.type === 'mul' ? { type: 'div', k: right.k } : { type: 'mul', k: right.k });
    // Undoing an inner operation first (the wrong order).
    const pre = eq.steps.length - eq.ops.length;
    const innerOp = eq.ops[eq.ops.length - 1 - (i - pre) - 1];
    if (innerOp) add(inverseOf(innerOp));
    // The right kind of move with the wrong partner (÷ where − was needed …).
    const m = Math.abs(right.k);
    add(right.type === 'add' ? { type: 'div', k: Math.max(2, m) } : { type: 'add', k: -m });
  }
  for (let k = 2; wrong.length < 3 && k < 30; k++) add({ type: pick(rng, ['add', 'mul', 'div']), k: k + intBetween(rng, 0, 3) });
  return shuffle(rng, [right, ...wrong]);
};

export const sameStep = (a, b) => a.type === b.type && a.k === b.k;

/** A level of equations, with their step options dealt. */
export const makeEquationLevel = (rng, cfg) => {
  const out = [];
  const seen = new Set();
  while (out.length < cfg.count) {
    const kind = pick(rng, cfg.kinds);
    const eq = makeEquation(rng, cfg, kind);
    if (!eq) continue;
    const text = `${treeText(eq.lines[0].left)}=${treeText(eq.lines[0].right)}`;
    if (seen.has(text)) continue;
    seen.add(text);
    eq.options = eq.steps.map((_, i) => stepOptions(rng, eq, i));
    out.push(eq);
  }
  return shuffle(rng, out);
};

/** Points available in an equation: one per step, two for the value. */
export const equationMax = (eq) => eq.steps.length + 2;
