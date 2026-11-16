/**
 * Decision Theory Arena (Master Minds) — multi-stage decisions, pure and seeded.
 *
 * A level is a run of quarters. Each quarter the whole bankroll goes into one
 * plan, whose outcome is a % return, so results compound. A stage is either a
 * payoff matrix (actions × states of the world) or a decision tree (decisions,
 * chance nodes, leaves). The right choice maximises expected return — computed
 * exactly with fractions, rolling back through any later decision — or, when a
 * stage says "cautious", maximises the worst case (maximin / minimax loss).
 * Every stage has one clear best answer (a gap of at least one point).
 */
import { intBetween, pick, sample, shuffle } from '../seeded.js';

const clampN = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/* ---------------------------------------------------------------- fractions */

const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
export const frac = (n, d = 1) => { const g = gcd(n, d) * Math.sign(d); return { n: n / g, d: d / g }; };
const add = (x, y) => frac(x.n * y.d + y.n * x.d, x.d * y.d);
const mul = (x, y) => frac(x.n * y.n, x.d * y.d);
export const cmp = (x, y) => Math.sign(x.n * y.d - y.n * x.d);
export const toNum = (x) => x.n / x.d;
export const fmtFrac = (x) => { const v = toNum(x); return Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100); };

/* ---------------------------------------------------------------- trees */

/** Expected value of a node (fraction), deciding optimally at later decision nodes. */
export const nodeEV = (node) => {
  if (node.type === 'leaf') return frac(node.value);
  if (node.type === 'chance') return node.branches.reduce((s, b) => add(s, mul(frac(b.p, 100), nodeEV(b.node))), frac(0));
  return node.branches.map((b) => nodeEV(b.node)).reduce((best, v) => (cmp(v, best) > 0 ? v : best));
};

/** Worst outcome reachable from a node, if later decisions are made for EV. */
const worstOf = (node) => {
  if (node.type === 'leaf') return node.value;
  if (node.type === 'chance') return Math.min(...node.branches.map((b) => worstOf(b.node)));
  return worstOf(bestBranch(node).node);
};

export const bestBranch = (node) => {
  let best = node.branches[0];
  for (const b of node.branches) if (cmp(nodeEV(b.node), nodeEV(best.node)) > 0) best = b;
  return best;
};

/** The leaf reached from a node with a uniform draw u (chance by cumulative p; later decisions by EV). */
export const realise = (node, u, path = []) => {
  if (node.type === 'leaf') return { value: node.value, path };
  if (node.type === 'decision') {
    const b = bestBranch(node);
    return realise(b.node, u, [...path, b.label]);
  }
  let acc = 0;
  for (const b of node.branches) {
    acc += b.p;
    if (u * 100 < acc || b === node.branches[node.branches.length - 1]) return realise(b.node, (u * 100 - (acc - b.p)) / b.p, [...path, b.label]);
  }
  return null;
};

/* ---------------------------------------------------------------- config */

/** How a level plays: band 'advanced', difficulty 1–3, step 1–30. */
export const decisionConfig = (ageBand, difficulty = 1, levelNo = 1) => {
  const d = clampN(difficulty || 1, 1, 3);
  const late = (levelNo || 1) >= 15;
  const stages = d === 1 ? 6 : d === 2 ? 7 : 8;
  return {
    band: 'advanced',
    stages,
    pass: Math.ceil(stages * 0.6),
    pStep: d === 3 ? 5 : 10,
    kinds: d === 1 ? ['matrix', 'tree1', 'matrix', 'tree1'] : d === 2 ? ['matrix', 'tree1', 'tree2', 'minimax', 'matrix', 'tree1', 'tree2'] : ['tree2', 'matrix', 'minimax', 'tree2', 'tree1', 'matrix', 'minimax', 'tree2'],
    actions: d === 1 ? (late ? 3 : 2) : d === 2 ? 3 : 4,
    states: d === 1 ? 2 : 3,
    bankroll: 1000
  };
};

/* ---------------------------------------------------------------- generation */

const ACTION_SETS = [
  ['Expand the factory', 'Run a small pilot', 'Hold cash', 'Sell the unit'],
  ['Launch now', 'Launch in one city', 'Wait a quarter', 'License the idea'],
  ['Buy growth stocks', 'Buy bonds', 'Keep it in savings', 'Back a start-up'],
  ['Open a new store', 'Renovate the old one', 'Go online only', 'Partner with a chain']
];
const STATE_SETS = [['Boom', 'Steady', 'Slump'], ['High demand', 'Medium demand', 'Low demand'], ['Rival enters', 'Market flat', 'Rival quits']];
const TREE_ACTIONS = [
  ['Launch the app', 'Run a pilot first', 'Sell the idea'],
  ['Bid for the contract', 'Subcontract the work', 'Stay out'],
  ['Build a prototype', 'Buy a licence', 'Fund a study'],
  ['Enter the export market', 'Grow at home', 'Join a partner']
];
const OUTCOMES = [['Success', 'Failure'], ['Strong sales', 'Weak sales'], ['Approved', 'Rejected']];

/** Probabilities in steps of `step` summing to 100, each at least `step`. */
const probs = (rng, k, step) => {
  for (;;) {
    const cuts = Array.from({ length: k - 1 }, () => intBetween(rng, 1, 100 / step - 1) * step).sort((a, b) => a - b);
    const ps = [...cuts, 100].map((c, i) => c - (i ? cuts[i - 1] : 0));
    if (ps.every((p) => p >= step)) return ps;
  }
};
const ret = (rng, lo = -40, hi = 60) => intBetween(rng, lo / 5, hi / 5) * 5;

/** Index of the unique best of `vals` (fractions or numbers) if it beats the rest by `gap`, else -1. */
const uniqueBest = (vals, gap) => {
  const nums = vals.map((v) => (typeof v === 'number' ? v : toNum(v)));
  const order = nums.map((v, i) => i).sort((a, b) => nums[b] - nums[a]);
  return nums[order[0]] - nums[order[1]] >= gap ? order[0] : -1;
};

const makeMatrix = (rng, config, criterion) => {
  const nA = criterion === 'minimax' ? Math.max(3, config.actions) : config.actions;
  for (let tries = 0; tries < 300; tries++) {
    const actions = sample(rng, pick(rng, ACTION_SETS), nA);
    const stateNames = pick(rng, STATE_SETS).slice(0, config.states);
    const ps = probs(rng, config.states, config.pStep);
    const payoffs = actions.map(() => stateNames.map(() => ret(rng)));
    const evs = payoffs.map((row) => row.reduce((s, v, j) => add(s, frac(v * ps[j], 100)), frac(0)));
    const worst = payoffs.map((row) => Math.min(...row));
    const evBest = uniqueBest(evs, 1);
    const minBest = uniqueBest(worst, 5);
    if (evBest < 0) continue;
    if (criterion === 'minimax' && (minBest < 0 || (minBest === evBest && tries < 250))) continue;
    return {
      kind: 'matrix', criterion, actions,
      states: stateNames.map((name, j) => ({ name, p: ps[j] })),
      payoffs, evs, worst,
      answer: criterion === 'minimax' ? minBest : evBest
    };
  }
  return null;
};

const chance = (rng, config, outcomeNames, k, lo, hi) => {
  const ps = probs(rng, k, config.pStep);
  return { type: 'chance', branches: ps.map((p, i) => ({ label: outcomeNames[i] || `Outcome ${i + 1}`, p, node: { type: 'leaf', value: ret(rng, lo, hi) } })) };
};

const makeTree = (rng, config, twoStage) => {
  for (let tries = 0; tries < 300; tries++) {
    const names = pick(rng, TREE_ACTIONS).slice(0, twoStage ? 2 + (config.actions >= 4 ? 1 : 0) : Math.min(3, config.actions));
    const outs = pick(rng, OUTCOMES);
    const branches = names.map((label, i) => {
      if (twoStage && i === 0) {
        // Risky first move; on a bad outcome there is a second choice to make.
        const p = probs(rng, 2, config.pStep);
        const follow = {
          type: 'decision',
          branches: [
            { label: 'Try again', node: chance(rng, config, outs, 2, -40, 50) },
            { label: 'Cut losses', node: { type: 'leaf', value: ret(rng, -30, 0) } }
          ]
        };
        return { label, node: { type: 'chance', branches: [{ label: outs[0], p: p[0], node: { type: 'leaf', value: ret(rng, 20, 80) } }, { label: outs[1], p: p[1], node: follow }] } };
      }
      return { label, node: rng() < 0.3 ? { type: 'leaf', value: ret(rng, -5, 20) } : chance(rng, config, outs, rng() < 0.5 ? 2 : 3, -40, 60) };
    });
    const root = { type: 'decision', branches };
    const evs = branches.map((b) => nodeEV(b.node));
    const answer = uniqueBest(evs, 1);
    if (answer < 0) continue;
    if (twoStage) {
      const follow = branches[0].node.branches[1].node;
      if (uniqueBest(follow.branches.map((b) => nodeEV(b.node)), 1) < 0) continue;
    }
    return { kind: twoStage ? 'tree2' : 'tree1', criterion: 'ev', actions: names, tree: root, evs, worst: branches.map((b) => worstOf(b.node)), answer };
  }
  return null;
};

export const makeDecisionStage = (rng, config, kind) => {
  let s = null;
  for (let i = 0; i < 5 && !s; i++) {
    s = kind === 'matrix' ? makeMatrix(rng, config, 'ev') : kind === 'minimax' ? makeMatrix(rng, config, 'minimax') : makeTree(rng, config, kind === 'tree2');
  }
  return { ...s, u: rng() };
};

export const makeDecisionLevel = (rng, config) => {
  const kinds = shuffle(rng, config.kinds).slice(0, config.stages);
  while (kinds.length < config.stages) kinds.push(config.kinds[kinds.length % config.kinds.length]);
  return kinds.map((k) => makeDecisionStage(rng, config, k));
};

/** What happens when action `i` is taken: { value (% return), path: [labels] }. */
export const playStage = (stage, i) => {
  if (stage.kind === 'matrix') {
    let acc = 0;
    for (let j = 0; j < stage.states.length; j++) {
      acc += stage.states[j].p;
      if (stage.u * 100 < acc || j === stage.states.length - 1) return { value: stage.payoffs[i][j], path: [stage.states[j].name] };
    }
  }
  const out = realise(stage.tree.branches[i].node, stage.u, []);
  return out.path.length ? out : { ...out, path: ['Certain outcome'] };
};

/** Apply a % return to a bankroll, to the nearest credit. */
export const applyReturn = (bank, pct) => Math.round(bank * (1 + pct / 100));
