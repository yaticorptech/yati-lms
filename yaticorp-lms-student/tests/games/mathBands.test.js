/**
 * The five maths games by age band (src/career/data/bands/math.js), dealt thousands of times per band.
 *
 * Every answer is recomputed here independently (expressions re-evaluated from the text shown, fractions and
 * percentages from their numbers, Number Forge solutions replayed on the tiles), options are distinct and contain
 * the answer, and each band stays inside what its age is taught (no × for Classes 1–2, no negatives before Class 6…).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const M = await import('../../src/career/data/bands/math.js');
const { BAND_KEYS, sprintConfig, sprintQuestion, runningConfig, runningStream, percentConfig, percentQuestion, sortConfig, sortBoard, forgeConfig, forgeRound, canForge } = M;

/** A seeded generator, so a failure can be replayed. */
const seeded = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Every (difficulty, levelNo) a band can be played at — including one stage below and the expert step above. */
const SETTINGS = [];
for (let d = 1; d <= 3; d++) for (let n = 1; n <= 30; n += 1) SETTINGS.push([d, n]);
const PER_BAND = 3000;
const each = (band, fn) => {
  const rng = seeded(BAND_KEYS.indexOf(band) * 7919 + 17);
  for (let i = 0; i < PER_BAND; i++) {
    const [d, n] = SETTINGS[i % SETTINGS.length];
    fn(d, n, rng, i);
  }
};
const distinct = (list) => new Set(list).size === list.length;

/* ---- an independent reader of what the student sees ---------------- */
const SUPS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const fromSup = (s) => Number(s.replace('⁻', '-').split('').map((c) => (c === '-' ? '-' : SUPS.indexOf(c))).join(''));
const evalText = (text) => {
  const js = text
    .replace(/(\d+)% of (\d+)/g, '($1/100*$2)')
    .replace(/√(\d+)/g, 'Math.sqrt($1)')
    .replace(/([⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, (m) => `**(${fromSup(m)})`)
    .replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/');
  return Function(`"use strict"; return (${js});`)();
};

test('math sprint: every answer is what the question shows, options distinct, bands kept', () => {
  for (const band of BAND_KEYS) {
    each(band, (d, n, rng) => {
      const cfg = sprintConfig(band, d, n);
      const q = sprintQuestion(cfg, rng);
      assert.ok(Number.isInteger(q.answer), `${band}: ${q.text} has answer ${q.answer}`);
      assert.equal(q.options.length, cfg.choices);
      assert.ok(distinct(q.options), `${band}: options repeat for ${q.text}`);
      assert.ok(q.options.includes(q.answer), `${band}: ${q.text} options miss the answer`);
      assert.ok(q.explain && q.explain.length > 3);
      if (q.kind === 'count') assert.equal(q.answer, q.pic.a);
      else {
        const v = evalText(q.text);
        assert.ok(Math.abs(v - q.answer) < 1e-9, `${band}: ${q.text} = ${v}, not ${q.answer}`);
      }
      if (q.pic?.op) assert.equal(q.pic.op === '+' ? q.pic.a + q.pic.b : q.pic.a - q.pic.b, q.answer);
      const nums = (q.text.match(/\d+/g) || []).map(Number);
      if (band === 'foundation') {
        assert.ok(!/[×÷²%√]/.test(q.text), `foundation met ${q.text}`);
        assert.ok(nums.every((x) => x <= 20) && q.answer <= 20 && q.answer >= 0, q.text);
        assert.ok(q.options.every((o) => o >= 0 && o <= 20));
      }
      if (band === 'developing') {
        assert.ok(!/[²³%√()]/.test(q.text) && !q.text.startsWith('−'), `developing met ${q.text}`);
        assert.ok(nums.every((x) => x <= 100) && q.answer >= 0 && q.answer <= 100, q.text);
        assert.ok(q.options.every((o) => o >= 0));
      }
      if (band === 'intermediate') assert.ok(!/[²³%√⁰¹⁴⁵⁶⁷⁸⁹]/.test(q.text), `intermediate met ${q.text}`);
      if (band === 'analytical') assert.ok(!/[%√]/.test(q.text), `analytical met ${q.text}`);
    });
  }
});

test('math sprint: the young never see ×, the old never see counting', () => {
  const kinds = {};
  for (const band of BAND_KEYS) {
    kinds[band] = new Set();
    each(band, (d, n, rng) => kinds[band].add(sprintQuestion(sprintConfig(band, d, n), rng).text.replace(/[\d()]+/g, '#')));
  }
  assert.ok([...kinds.foundation].some((k) => k.startsWith('How many')));
  assert.ok(![...kinds.advanced].some((k) => k.startsWith('How many')));
  assert.ok([...kinds.advanced].some((k) => k.includes('%')));
  assert.ok([...kinds.analytical].some((k) => k.includes('²')));
});

test('running total: totals recomputed step by step, band rules held', () => {
  for (const band of BAND_KEYS) {
    each(band, (d, n, rng) => {
      const cfg = runningConfig(band, d, n);
      const s = runningStream(cfg, rng);
      assert.ok(!s.fallback, `${band}: fell back`);
      const lanes = { A: 0, B: 0, null: 0 };
      const path = [0];
      for (const st of s.steps) {
        const k = String(st.lane);
        const t = lanes[k];
        const next = st.op === '+' ? t + st.value : st.op === '−' ? t - st.value : st.op === '×' ? t * st.value : t / st.value;
        assert.ok(Number.isInteger(next), `${band}: ${t} ${st.op} ${st.value} is not whole`);
        lanes[k] = next;
        if (!st.lane || st.lane === s.ask) path.push(next);
        if (band === 'developing') assert.ok(next >= 0 && next <= 50, `developing total ${next}`);
        if (band === 'intermediate') assert.ok(next >= -50 && next <= 50);
      }
      const total = s.ask ? lanes[s.ask] : lanes.null;
      assert.equal(total, s.total);
      assert.deepEqual(path, s.path);
      assert.ok(s.options.includes(s.total) && distinct(s.options) && s.options.length === cfg.choices, `${band}: options ${s.options}`);
      const ops = new Set(s.steps.map((x) => x.op));
      if (band === 'foundation') {
        assert.deepEqual([...ops], ['+']);
        assert.ok(s.steps.length <= 4 && s.steps.every((x) => x.value <= 4) && s.total <= 16 && cfg.dots);
        assert.ok(s.options.every((o) => o >= 0));
      }
      if (band === 'developing') assert.ok(!ops.has('×') && !ops.has('÷'));
      if (band === 'intermediate') assert.ok(!ops.has('×') && !ops.has('÷') && s.path.some((t) => t < 0));
      if (band === 'analytical') {
        assert.ok(s.steps.filter((x) => x.op === '×' || x.op === '÷').every((x) => x.value === 2));
        assert.ok(ops.has('×') || ops.has('÷'));
      }
      if (band === 'advanced' && s.mode === 'alternate') s.steps.forEach((x, i) => assert.equal(x.op, ['+', '×', '−', '÷'][i % 4]));
      if (band === 'advanced' && s.mode === 'lanes') assert.ok(s.steps.some((x) => x.lane === 'A') && s.steps.some((x) => x.lane === 'B'));
    });
  }
});

/* ---- Percent Snap --------------------------------------------------- */
const whole = (x) => {
  assert.ok(Math.abs(x - Math.round(x)) < 1e-9, `${x} is not whole`);
  return Math.round(x);
};
const optValue = (label) => {
  const m = String(label).match(/^([+−]?)₹?(\d+)(%?)$/);
  if (!m) return null;
  return (m[1] === '−' ? -1 : 1) * Number(m[2]);
};
const expectSnap = (q) => {
  const D = q.data;
  switch (q.kind) {
    case 'ofNumber': return String(whole((D.N / D.n) * D.k));
    case 'pctOf': return String(whole(D.N * (D.p / 100)));
    case 'change': return String(whole(D.N * (1 + (D.up ? 1 : -1) * (D.p / 100))));
    case 'pctChange': { const v = whole(((D.M - D.N) / D.N) * 100); return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)}%`; }
    case 'reverse': return String(whole(D.M / (1 + D.p / 100)));
    case 'discount': return `₹${whole(D.P * (1 - D.p / 100))}`;
    case 'gst': return `₹${whole(D.P * (1 + D.r / 100))}`;
    case 'successive': return String(whole(D.N * (1 + D.p / 100) * (1 - D.q / 100)));
    case 'interest': return `₹${whole((D.P * D.r * D.t) / 100)}`;
    case 'overall': { const v = whole(((1 + D.p / 100) * (1 - D.q / 100) - 1) * 100); return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)}%`; }
    case 'compound': return `₹${whole(D.P * (1 + D.r / 100) ** 2)}`;
    case 'reverseDiscount': return `₹${whole(D.M / (1 - D.p / 100))}`;
    default: return null;
  }
};
const BAND_SNAP = {
  foundation: ['equal', 'shaded'], developing: ['shaded', 'ofNumber'], intermediate: ['pctOf'], analytical: ['change', 'pctChange', 'reverse'],
  advanced: ['discount', 'gst', 'successive', 'interest', 'overall', 'compound', 'reverseDiscount']
};

test('percent snap: exact answers, one right option, band content', () => {
  for (const band of BAND_KEYS) {
    each(band, (d, n, rng) => {
      const cfg = percentConfig(band, d, n);
      const q = percentQuestion(cfg, rng);
      assert.ok(BAND_SNAP[band].includes(q.kind), `${band} dealt ${q.kind}`);
      const ids = q.options.map((o) => o.id);
      assert.ok(distinct(ids) && ids.includes(q.answer) && q.options.length === cfg.choices, `${band} ${q.kind}: ${ids} / ${q.answer}`);
      assert.ok(q.explain);
      if (q.kind === 'equal') {
        const right = q.options.filter((o) => o.pic.parts.length === q.data.n && o.pic.parts.every((w) => w === o.pic.parts[0]));
        assert.equal(right.length, 1);
        assert.equal(right[0].id, q.answer);
      } else if (q.kind === 'shaded') {
        const k = q.pic.shaded.length;
        const total = q.pic.parts.length;
        assert.ok(q.pic.parts.every((w) => w === 1));
        assert.equal(q.answer, `${k}/${total}`);
        const same = q.options.filter((o) => { const [a, b] = o.id.split('/').map(Number); return a * total === b * k; });
        assert.equal(same.length, 1, `two options equal ${k}/${total}: ${ids}`);
        if (band === 'foundation') assert.ok(total <= 4);
      } else {
        assert.equal(q.answer, expectSnap(q), `${band} ${q.kind} ${q.line}`);
        const vals = q.options.map((o) => optValue(o.label));
        assert.ok(vals.every((v) => v !== null) && distinct(vals), `${band}: ${ids}`);
      }
      if (q.kind === 'ofNumber') assert.equal(g(q.data.k, q.data.n), 1, `${q.line} not in lowest terms`);
      if (q.kind === 'pctOf') assert.ok([5, 10, 20, 25, 50, 75].includes(q.data.p));
    });
  }
});

/* ---- Speed Sort ------------------------------------------------------ */
const g = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
const R = (n, d = 1) => { if (d < 0) { n = -n; d = -d; } const k = g(n, d) || 1; return [n / k, d / k]; };
const decR = (s) => { const [i, f = ''] = s.split('.'); return R(Number(i + f), 10 ** f.length); };
const rootR = ([n, d], k) => {
  const r = (x) => { const y = Math.round(Math.abs(x) ** (1 / k)); assert.equal(y ** k, x, `not a perfect root: ${x}`); return y; };
  return R(r(n), r(d));
};
const parseLabel = (label) => {
  let s = label.replace(/−/g, '-');
  if (s.startsWith('√')) return rootR(decR(s.slice(1)), 2);
  if (s.startsWith('∛')) return rootR(decR(s.slice(1)), 3);
  const pw = s.match(/^\(?(-?\d+)\)?([⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+)$/);
  if (pw) {
    const b = Number(pw[1]); const k = fromSup(pw[2]);
    return k >= 0 ? R(b ** k) : R(1, b ** -k);
  }
  const fr = s.match(/^(-?\d+)\/(\d+)$/);
  if (fr) return R(Number(fr[1]), Number(fr[2]));
  s = s.trim();
  return decR(s);
};

test('speed sort: values distinct and exactly ordered, labels say what they are worth', () => {
  for (const band of BAND_KEYS) {
    each(band, (d, n, rng) => {
      const cfg = sortConfig(band, d, n);
      const b = sortBoard(cfg, rng);
      assert.equal(b.items.length, cfg.count);
      const vals = b.items.map((it) => {
        if (it.size) return R(it.size);
        const v = parseLabel(it.label);
        assert.deepEqual(v, [it.n, it.d], `${band}: ${it.label} read as ${v}, made as ${it.n}/${it.d}`);
        return v;
      });
      assert.ok(distinct(vals.map(([a, c]) => `${a}/${c}`)), `${band}: tie on ${b.items.map((x) => x.label)}`);
      const sorted = b.items.map((it, i) => [it.rank, vals[i]]).sort((x, y) => x[0] - y[0]);
      for (let i = 1; i < sorted.length; i++) assert.ok(sorted[i - 1][1][0] * sorted[i][1][1] < sorted[i][1][0] * sorted[i - 1][1][1]);
      assert.ok(distinct(b.items.map((x) => x.key)));
      for (const it of b.items) {
        const fr = (it.label || '').match(/(\d+)\/(\d+)/);
        if (fr) assert.equal(g(Number(fr[1]), Number(fr[2])), 1, `${it.label} is not in lowest terms`);
      }
      if (band === 'foundation') {
        assert.ok(cfg.count <= 4 && vals.every(([a, c]) => c === 1 && a >= 1 && a <= 20));
      }
      if (band === 'developing') assert.ok(vals.every(([a]) => a > 0) && b.items.every((x) => !x.label.includes('.')));
      if (band === 'intermediate') assert.ok(b.items.every((x) => !x.label.includes('/')));
    });
  }
});

/* ---- Number Forge ---------------------------------------------------- */
const OPF = { '+': (a, b) => a + b, '−': (a, b) => (a >= b ? a - b : NaN), '×': (a, b) => a * b, '÷': (a, b) => (b && a % b === 0 ? a / b : NaN) };

test('number forge: every round has a working solution inside the band', () => {
  for (const band of BAND_KEYS) {
    each(band, (d, n, rng, i) => {
      const cfg = forgeConfig(band, d, n);
      const r = forgeRound(cfg, rng);
      assert.ok(!r.fallback, `${band}: fell back`);
      assert.ok(!r.start.includes(r.target), `${band}: target ${r.target} already a tile`);
      assert.ok(r.target <= cfg.cap && r.target >= cfg.minTarget);
      assert.equal(r.start.length, cfg.tiles);
      // Replay the stored solution on the tiles.
      const bag = [...r.start];
      for (const line of r.solution) {
        const [, a, op, b, out] = line.match(/^(\d+) (.) (\d+) = (\d+)$/);
        assert.ok(r.ops.includes(op), `${band}: ${op} not allowed`);
        for (const x of [Number(a), Number(b)]) {
          const k = bag.indexOf(x);
          assert.ok(k >= 0, `${band}: ${x} not on the board in ${r.solution}`);
          bag.splice(k, 1);
        }
        assert.equal(OPF[op](Number(a), Number(b)), Number(out));
        bag.push(Number(out));
      }
      assert.ok(bag.includes(r.target));
      if (r.mustUseAll) assert.equal(bag.length, 1, `${band}: solution leaves tiles`);
      if (i % 10 === 0) assert.ok(canForge(r.start, r.target, r.ops, r.mustUseAll));
      if (band === 'foundation') assert.ok(cfg.tiles === 3 && r.target <= 10 && r.ops.join() === '+');
      if (band === 'developing') assert.ok(r.target <= 30 && !r.ops.includes('÷'));
    });
  }
});

test('advanced forge rounds carry a constraint', () => {
  const seen = new Set();
  each('advanced', (d, n, rng) => {
    const cfg = forgeConfig('advanced', d, n);
    const r = forgeRound(cfg, rng);
    seen.add(cfg.constraint);
    if (cfg.constraint === 'ops') assert.ok(r.ops.length < 4);
  });
  assert.ok(seen.has('all') && seen.has('ops'));
});

test('a null band plays as analytical', () => {
  assert.deepEqual(sprintConfig(null, 2, 10), sprintConfig('analytical', 2, 10));
  assert.deepEqual(forgeConfig(undefined, 3, 30), forgeConfig('analytical', 3, 30));
});
