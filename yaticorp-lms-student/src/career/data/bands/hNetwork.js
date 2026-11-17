/**
 * Network Logic (Master Minds) — weighted graphs, pure and seeded.
 *
 * A board is a jittered grid of nodes joined by grid and diagonal edges (one
 * diagonal per cell at most, so the drawing never crosses itself). Every board
 * is connected: a random spanning tree is laid first and extra edges added.
 *
 * Three tasks:
 *  path — the cheapest route A→B (Dijkstra). Any route of optimal cost counts.
 *  tour — a route from A to B passing every required node, cost within a cap
 *         (cap = optimum, plus slack on easier levels). Optimum = best order of
 *         the required nodes over all-pairs shortest distances.
 *  mst  — pick edges that connect every node at the least total cost (Kruskal).
 *         Any spanning tree of that weight counts.
 */
import { intBetween, shuffle } from '../seeded.js';

export const LETTERS = 'ABCDEFGHIJKLMNOP';
const clampN = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const t01 = (levelNo) => clampN(((levelNo || 1) - 1) / 29, 0, 1);
const ramp = (from, to, levelNo) => Math.round(from + (to - from) * t01(levelNo));

/** How a level plays, by band (Master Minds plays 'advanced'), difficulty 1–3 and step 1–30. */
export const networkConfig = (ageBand, difficulty = 1, levelNo = 1) => {
  const d = clampN(difficulty || 1, 1, 3);
  const t = t01(levelNo);
  const cols = d === 1 && t < 0.5 ? 3 : 4;
  const rows = d === 3 && t >= 0.5 ? 4 : 3;
  const kinds = d === 1 ? ['path', 'mst', 'path', 'mst'] : d === 2 ? ['path', 'tour', 'mst', 'tour', 'path'] : ['tour', 'mst', 'tour', 'path', 'mst', 'tour'];
  const rounds = clampN(ramp(4, 5, levelNo) + (d === 3 ? 1 : 0), 4, 6);
  return {
    band: 'advanced',
    cols,
    rows,
    rounds,
    pass: Math.ceil(rounds * 0.6),
    kinds,
    wmax: d === 1 ? 9 : d === 2 ? 12 : 15,
    extra: 0.3 + 0.1 * d,
    required: d === 3 && levelNo >= 10 ? 2 : 1,
    slack: d === 2 ? 0.2 : d === 3 && levelNo < 10 ? 0.1 : 0
  };
};

/* ---------------------------------------------------------------- graph */

const find = (parent, x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };

/** A connected weighted graph: { nodes: [{ id, label, x, y }], edges: [{ id, a, b, w }] } in a 400×300 drawing. */
export const makeGraph = (rng, cols, rows, extra, wmax) => {
  const nodes = [];
  const sx = 300 / (cols - 1);
  const sy = (rows === 4 ? 225 : 200) / (rows - 1);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const id = r * cols + c;
      nodes.push({ id, label: LETTERS[id], x: Math.round(50 + c * sx + (rng() - 0.5) * 26), y: Math.round(40 + r * sy + (rng() - 0.5) * 22) });
    }
  }
  const cand = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const id = r * cols + c;
      if (c + 1 < cols) cand.push([id, id + 1]);
      if (r + 1 < rows) cand.push([id, id + cols]);
      if (c + 1 < cols && r + 1 < rows) cand.push(rng() < 0.5 ? [id, id + cols + 1] : [id + 1, id + cols]);
    }
  }
  const parent = nodes.map((n) => n.id);
  const chosen = [];
  const rest = [];
  for (const [a, b] of shuffle(rng, cand)) {
    const ra = find(parent, a);
    const rb = find(parent, b);
    if (ra !== rb) { parent[ra] = rb; chosen.push([a, b]); } else rest.push([a, b]);
  }
  for (const e of rest) if (rng() < extra) chosen.push(e);
  const edges = chosen
    .sort((p, q) => p[0] - q[0] || p[1] - q[1])
    .map(([a, b], id) => ({ id, a: Math.min(a, b), b: Math.max(a, b), w: intBetween(rng, 1, wmax) }));
  return { nodes, edges };
};

export const edgeBetween = (graph, u, v) => graph.edges.find((e) => (e.a === u && e.b === v) || (e.a === v && e.b === u)) || null;

/** Dijkstra from `src`: { dist, prev }. */
export const dijkstra = (graph, src) => {
  const n = graph.nodes.length;
  const dist = Array(n).fill(Infinity);
  const prev = Array(n).fill(-1);
  const done = Array(n).fill(false);
  dist[src] = 0;
  for (let k = 0; k < n; k++) {
    let u = -1;
    for (let i = 0; i < n; i++) if (!done[i] && (u < 0 || dist[i] < dist[u])) u = i;
    if (u < 0 || dist[u] === Infinity) break;
    done[u] = true;
    for (const e of graph.edges) {
      const v = e.a === u ? e.b : e.b === u ? e.a : -1;
      if (v >= 0 && dist[u] + e.w < dist[v]) { dist[v] = dist[u] + e.w; prev[v] = u; }
    }
  }
  return { dist, prev };
};

/** One shortest path src→dst as node ids. */
export const shortestPath = (graph, src, dst) => {
  const { prev } = dijkstra(graph, src);
  const out = [dst];
  while (out[0] !== src) out.unshift(prev[out[0]]);
  return out;
};

/** Kruskal: { weight, edgeIds } of a minimum spanning tree. */
export const kruskal = (graph) => {
  const parent = graph.nodes.map((n) => n.id);
  let weight = 0;
  const edgeIds = [];
  for (const e of [...graph.edges].sort((p, q) => p.w - q.w || p.id - q.id)) {
    const ra = find(parent, e.a);
    const rb = find(parent, e.b);
    if (ra !== rb) { parent[ra] = rb; weight += e.w; edgeIds.push(e.id); }
  }
  return { weight, edgeIds };
};

const permutations = (list) => (list.length <= 1 ? [list] : list.flatMap((x, i) => permutations([...list.slice(0, i), ...list.slice(i + 1)]).map((p) => [x, ...p])));

/** The cheapest walk from `from` through every node of `required` (any order) to `to`: { cost, walk }. */
export const bestTour = (graph, from, required, to) => {
  const dists = graph.nodes.map((n) => dijkstra(graph, n.id).dist);
  let best = null;
  for (const order of permutations(required)) {
    const stops = [from, ...order, to];
    let cost = 0;
    for (let i = 0; i + 1 < stops.length; i++) cost += dists[stops[i]][stops[i + 1]];
    if (!best || cost < best.cost) best = { cost, stops };
  }
  const walk = [from];
  for (let i = 0; i + 1 < best.stops.length; i++) walk.push(...shortestPath(graph, best.stops[i], best.stops[i + 1]).slice(1));
  return { cost: best.cost, walk };
};

/** Hop counts from src (BFS). */
const hops = (graph, src) => {
  const h = Array(graph.nodes.length).fill(Infinity);
  h[src] = 0;
  const q = [src];
  while (q.length) {
    const u = q.shift();
    for (const e of graph.edges) {
      const v = e.a === u ? e.b : e.b === u ? e.a : -1;
      if (v >= 0 && h[v] === Infinity) { h[v] = h[u] + 1; q.push(v); }
    }
  }
  return h;
};

/* ---------------------------------------------------------------- rounds */

/**
 * One task.
 *  path: { kind, graph, from, to, optimum, solution: walk }
 *  tour: { kind, graph, from, to, required: [ids], optimum, cap, solution: walk }
 *  mst:  { kind, graph, optimum, solution: edgeIds }
 */
export const makeNetworkRound = (rng, config, kind) => {
  const graph = makeGraph(rng, config.cols, config.rows, config.extra, config.wmax);
  const n = graph.nodes.length;
  if (kind === 'mst') {
    const m = kruskal(graph);
    return { kind, graph, optimum: m.weight, solution: m.edgeIds };
  }
  // Far-apart endpoints: hop distance at least the board's width minus one.
  const pairs = [];
  for (let a = 0; a < n; a++) {
    const h = hops(graph, a);
    for (let b = a + 1; b < n; b++) if (h[b] >= Math.max(2, config.cols - 1)) pairs.push([a, b]);
  }
  const [p, q] = shuffle(rng, pairs)[0];
  const [from, to] = rng() < 0.5 ? [p, q] : [q, p];
  if (kind === 'path') {
    const { dist } = dijkstra(graph, from);
    return { kind, graph, from, to, optimum: dist[to], solution: shortestPath(graph, from, to) };
  }
  // A required stop is worth something only off the shortest route.
  const direct = new Set(shortestPath(graph, from, to));
  const others = shuffle(rng, graph.nodes.map((x) => x.id).filter((id) => id !== from && id !== to));
  const off = others.filter((id) => !direct.has(id));
  const required = [...off, ...others.filter((id) => direct.has(id))].slice(0, config.required).sort((x, y) => x - y);
  const best = bestTour(graph, from, required, to);
  return { kind, graph, from, to, required, optimum: best.cost, cap: Math.floor(best.cost * (1 + config.slack)), solution: best.walk };
};

export const makeNetworkLevel = (rng, config) => {
  const kinds = shuffle(rng, config.kinds).slice(0, config.rounds);
  while (kinds.length < config.rounds) kinds.push(config.kinds[kinds.length % config.kinds.length]);
  return kinds.map((k) => makeNetworkRound(rng, config, k));
};

/* ---------------------------------------------------------------- checking */

/** Cost of a walk (node ids), or null when two consecutive nodes are not joined. */
export const walkCost = (graph, walk) => {
  let cost = 0;
  for (let i = 0; i + 1 < walk.length; i++) {
    const e = edgeBetween(graph, walk[i], walk[i + 1]);
    if (!e) return null;
    cost += e.w;
  }
  return cost;
};

/** Total weight of chosen edges, and whether they form a spanning tree. */
export const treeInfo = (graph, edgeIds) => {
  const parent = graph.nodes.map((n) => n.id);
  let weight = 0;
  let cycle = false;
  for (const id of edgeIds) {
    const e = graph.edges[id];
    if (!e) return { weight: 0, spanning: false, cycle: true };
    weight += e.w;
    const ra = find(parent, e.a);
    const rb = find(parent, e.b);
    if (ra === rb) cycle = true; else parent[ra] = rb;
  }
  const roots = new Set(graph.nodes.map((n) => find(parent, n.id)));
  return { weight, cycle, spanning: !cycle && roots.size === 1 && edgeIds.length === graph.nodes.length - 1, parts: roots.size };
};

/**
 * Judge an answer: a walk for path/tour, a list of edge ids for mst.
 * { ok, cost, reason } — reason names what is wrong when not ok.
 */
export const checkNetwork = (round, answer) => {
  if (round.kind === 'mst') {
    const info = treeInfo(round.graph, answer);
    if (info.cycle) return { ok: false, cost: info.weight, reason: 'cycle' };
    if (!info.spanning) return { ok: false, cost: info.weight, reason: 'disconnected' };
    return { ok: info.weight === round.optimum, cost: info.weight, reason: info.weight === round.optimum ? null : 'costly' };
  }
  const cost = walkCost(round.graph, answer);
  if (cost === null || answer[0] !== round.from) return { ok: false, cost: cost ?? 0, reason: 'broken' };
  if (answer[answer.length - 1] !== round.to) return { ok: false, cost, reason: 'unfinished' };
  if (round.kind === 'tour') {
    const missing = round.required.filter((r) => !answer.includes(r));
    if (missing.length) return { ok: false, cost, reason: 'missing' };
    return { ok: cost <= round.cap, cost, reason: cost <= round.cap ? null : 'costly' };
  }
  return { ok: cost === round.optimum, cost, reason: cost === round.optimum ? null : 'costly' };
};
