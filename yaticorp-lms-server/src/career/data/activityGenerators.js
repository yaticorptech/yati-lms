/**
 * @description Generated daily activities, for when the hand-written ones in
 * activities.js have all been served.
 *
 * Ten hand-written puzzles a band is ten days. After that the student met the
 * same question again and again, which is the opposite of a daily warm-up. These
 * templates fill the gap without an AI call: each one enumerates a grid of
 * parameters, so every `k` is a different question with a computed, checked
 * answer — thousands per band before anything repeats.
 *
 * An id is `g:<template>:<k>` and fully determines the question (options are
 * shuffled from a seed made of the id), so the answer route can rebuild the
 * exact question the student saw without storing it.
 */

const JUNIOR = 'junior';
const SCHOOL = 'school';
const HIGHER = 'higher';

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Small seeded PRNG — the same id always shuffles its options the same way. */
const rngFrom = (text) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Split k into digits of a mixed radix: digits(7, [3, 4]) → [1, 2]. */
const digits = (k, sizes) =>
  sizes.map((size) => {
    const d = k % size;
    k = Math.floor(k / size);
    return d;
  });

/** Trim a number for display: 12.50 → 12.5, 7.00 → 7. */
const fmt = (n) => String(Number(Number(n).toFixed(2)));

const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const fact = (n) => (n <= 1 ? 1 : n * fact(n - 1));

/**
 * Four distinct options with the right one somewhere random. Numeric answers
 * are padded with near misses if the supplied wrong answers collide.
 */
const choices = (rng, correct, wrong) => {
  const right = typeof correct === 'number' ? fmt(correct) : String(correct);
  const pool = [];
  const add = (w) => {
    const s = typeof w === 'number' ? fmt(w) : String(w);
    if (s !== right && !pool.includes(s) && pool.length < 3) pool.push(s);
  };
  wrong.forEach(add);
  // Near misses, keeping any unit: '12.5%' pads with '13.5%', '11.5%'…
  const m = /^(-?\d+(?:\.\d+)?)(.*)$/.exec(right);
  for (let step = 1; pool.length < 3 && m && step < 50; step += 1) {
    const n = Number(m[1]);
    add(`${fmt(n + step)}${m[2]}`);
    if (n - step > 0) add(`${fmt(n - step)}${m[2]}`);
  }
  const options = [right, ...pool];
  for (let i = options.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { options, answer: options.indexOf(right) };
};

const ITEMS = ['pencils', 'erasers', 'stickers', 'balloons', 'notebooks', 'marbles'];

// Precomputed grids for templates whose valid parameters are not a plain box.
const TAP_PAIRS = [];
for (let a = 2; a <= 40; a += 1) {
  for (let b = a + 1; b <= 60; b += 1) if ((a * b) % (a + b) === 0) TAP_PAIRS.push([a, b]);
}

const WORK_SETS = [];
[3, 4, 5, 6, 8, 9, 10, 12, 15, 16, 18, 20].forEach((p) =>
  [4, 5, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 24, 30].forEach((d) =>
    [2, 3, 4, 5, 6, 8, 9, 10, 12, 15, 16, 18, 20, 24, 30].forEach((q) => {
      if (q !== p && (p * d) % q === 0) WORK_SETS.push([p, d, q]);
    })
  )
);

const PROFIT_SETS = [];
[120, 150, 200, 240, 250, 300, 400, 450, 500, 600, 750, 800, 1000, 1200, 1250, 1500, 1600, 2000, 2400, 2500].forEach((c) =>
  [5, 8, 10, 12.5, 15, 20, 25, 30, 40, 50].forEach((pct) => {
    if ((c * pct) % 100 === 0) {
      PROFIT_SETS.push([c, pct, 1]);
      if (pct < 50) PROFIT_SETS.push([c, pct, -1]);
    }
  })
);

const RATIO_SETS = [];
for (let a = 1; a <= 8; a += 1) {
  for (let b = a + 1; b <= 9; b += 1) {
    if (gcd(a, b) === 1) [10, 20, 25, 40, 50, 60, 100, 150, 200].forEach((m) => RATIO_SETS.push([a, b, m]));
  }
}

const WORDS = ['LEVEL', 'APPLE', 'BANANA', 'LETTER', 'BALLOON', 'COFFEE', 'PEPPER', 'SUCCESS', 'TOMATO', 'CHEESE', 'ACCESS', 'GOOGLE', 'PAPAYA', 'COOKIE', 'RADAR', 'ATTEMPT', 'NOON', 'TOFFEE', 'ASSESS', 'MAMMAL'];

// ── Templates ───────────────────────────────────────────────────────────────

const TEMPLATES = {
  // Junior
  jStep: {
    band: JUNIOR, size: 20 * 8,
    make(k, rng) {
      const [ai, di] = digits(k, [20, 8]);
      const a = ai + 1; const d = di + 2;
      const ans = a + 4 * d;
      return { kind: 'Pattern', prompt: `What comes next?  ${a}, ${a + d}, ${a + 2 * d}, ${a + 3 * d}, ___`, ...choices(rng, ans, [ans + d, ans - 1, ans + 2]), why: `Each number is ${d} more than the one before, so ${a + 3 * d} + ${d} = ${ans}.` };
    }
  },
  jTimes: {
    band: JUNIOR, size: 2 * 6 * 2,
    make(k, rng) {
      const [ri, ai, oi] = digits(k, [2, 6, 2]);
      const r = ri + 2; const a = ai + 1 + oi * 6;
      const t = [a, a * r, a * r * r, a * r ** 3];
      const ans = a * r ** 4;
      return { kind: 'Pattern', prompt: `What comes next?  ${t.join(', ')}, ___`, ...choices(rng, ans, [t[3] + (t[3] - t[2]), ans + t[3], ans - r]), why: `Each number is ${r} times the one before, so ${t[3]} x ${r} = ${ans}.` };
    }
  },
  jShop: {
    band: JUNIOR, size: 11 * 10 * 3 * ITEMS.length,
    make(k, rng) {
      const [pi, q0, ri, ii] = digits(k, [11, 10, 3, ITEMS.length]);
      const p = pi + 2; const q = q0 + 3; const rem = 1 + (ri % (p - 1));
      const m = p * q + rem; const item = ITEMS[ii];
      return { kind: 'Quick maths', prompt: `A shop sells ${item} at ₹${p} each. You have ₹${m}. How many can you buy?`, ...choices(rng, q, [q + 1, q - 1, q + 2]), why: `${q} ${item} cost ₹${p * q}, leaving ₹${rem} — not enough for one more.` };
    }
  },
  jMultiply: {
    band: JUNIOR, size: 10 * 10,
    make(k, rng) {
      const [ai, bi] = digits(k, [10, 10]);
      const a = ai + 6; const b = bi + 6; const ans = a * b;
      return { kind: 'Quick maths', prompt: `What is  ${a} x ${b} ?`, ...choices(rng, ans, [ans + a, ans - b, ans + 10]), why: `${a} x ${b} = ${ans}. Tip: ${a} x ${b - 1} = ${a * (b - 1)}, then add one more ${a}.` };
    }
  },
  jOdd: {
    band: JUNIOR, size: 6 * 10,
    make(k, rng) {
      const [ni, si] = digits(k, [6, 10]);
      const n = [3, 4, 5, 6, 9, 10][ni]; const s = si + 1;
      const odd = n * (s + 3) + 1;
      return { kind: 'Odd one out', prompt: 'Which number does not belong?', ...choices(rng, odd, [n * s, n * (s + 2), n * (s + 5)]), why: `${n * s}, ${n * (s + 2)} and ${n * (s + 5)} are all in the ${n} times table. ${odd} is not.` };
    }
  },
  jThink: {
    band: JUNIOR, size: 30 * 20,
    make(k, rng) {
      const [xi, ai] = digits(k, [30, 20]);
      const x = xi + 5; const a = ai + 3; const b = x + a;
      return { kind: 'Puzzle', prompt: `I think of a number and add ${a}. I get ${b}. What was my number?`, ...choices(rng, x, [b + a, x + 1, b]), why: `Undo the adding: ${b} − ${a} = ${x}.` };
    }
  },

  // School
  sPercent: {
    band: SCHOOL, size: 6 * 6 * 2,
    make(k, rng) {
      const pct = [10, 20, 25, 30, 40, 50];
      const [ui, di, order] = digits(k, [6, 6, 2]);
      const up = pct[ui]; const down = pct[di];
      const final = order ? (1 - down / 100) * (1 + up / 100) * 100 : (1 + up / 100) * (1 - down / 100) * 100;
      const change = final - 100;
      const label = (c) => (Math.abs(c) < 1e-9 ? 'unchanged' : `${fmt(Math.abs(c))}% ${c > 0 ? 'higher' : 'lower'}`);
      const steps = order ? `falls ${down}%, then rises ${up}%` : `rises ${up}%, then falls ${down}%`;
      return { kind: 'Aptitude', prompt: `A price ${steps}. Compared with the start, the final price is…`, ...choices(rng, label(change), [label(up - down), label(-change), label(change + 5), 'unchanged', label(change - 5), label(change + 10), label(change - 10)]), why: `Start at 100: ${order ? `100 → ${fmt(100 - down)} → ${fmt(final)}` : `100 → ${100 + up} → ${fmt(final)}`}. Each percentage is taken of the current price, not the original.` };
    }
  },
  sGaps: {
    band: SCHOOL, size: 15 * 5 * 3,
    make(k, rng) {
      const [ai, gi, si] = digits(k, [15, 5, 3]);
      const t = [ai + 1]; const g = gi + 1; const s = si + 1;
      for (let i = 0; i < 4; i += 1) t.push(t[i] + g + i * s);
      const nextGap = g + 4 * s; const ans = t[4] + nextGap;
      return { kind: 'Series', prompt: `What comes next?  ${t.join(', ')}, ___`, ...choices(rng, ans, [ans - s, ans + s, t[4] + (t[4] - t[3])]), why: `The gaps grow by ${s} each time: ${[0, 1, 2, 3].map((i) => g + i * s).join(', ')} — so the next gap is ${nextGap}, and ${t[4]} + ${nextGap} = ${ans}.` };
    }
  },
  sSumN: {
    band: SCHOOL, size: 51,
    make(k, rng) {
      const n = k + 10; const ans = (n * (n + 1)) / 2;
      return { kind: 'Quick maths', prompt: `What is the sum of the first ${n} natural numbers?`, ...choices(rng, ans, [(n * (n - 1)) / 2, ans + n, n * n]), why: `n(n+1)/2 = ${n} × ${n + 1} ÷ 2 = ${ans}.` };
    }
  },
  sTaps: {
    band: SCHOOL, size: TAP_PAIRS.length,
    make(k, rng) {
      const [a, b] = TAP_PAIRS[k]; const t = (a * b) / (a + b);
      return { kind: 'Aptitude', prompt: `One tap fills a tank in ${a} h, another in ${b} h. Together they take…`, ...choices(rng, `${fmt(t)} h`, [`${fmt((a + b) / 2)} h`, `${fmt(b - a)} h`, `${fmt(a / 2)} h`, `${fmt(t + 1)} h`]), why: `Rates add: 1/${a} + 1/${b} = 1/${fmt(t)} of the tank per hour, so ${fmt(t)} hours.` };
    }
  },
  sTrain: {
    band: SCHOOL, size: 5 * 16,
    make(k, rng) {
      const [vi, ti] = digits(k, [5, 16]);
      const kmh = [36, 54, 72, 90, 108][vi]; const ms = (kmh * 5) / 18; const t = ti + 5; const len = ms * t;
      return { kind: 'Aptitude', prompt: `A train ${len} m long runs at ${kmh} km/h. How long does it take to pass a pole?`, ...choices(rng, `${t} s`, [`${fmt(len / kmh)} s`, `${t + 2} s`, `${t - 1} s`, `${t * 2} s`]), why: `${kmh} km/h = ${kmh} × 5/18 = ${ms} m/s. ${len} ÷ ${ms} = ${t} seconds.` };
    }
  },
  sRatio: {
    band: SCHOOL, size: RATIO_SETS.length,
    make(k, rng) {
      const [a, b, m] = RATIO_SETS[k]; const total = (a + b) * m; const ans = b * m;
      return { kind: 'Aptitude', prompt: `₹${total} is shared in the ratio ${a} : ${b}. How much is the larger share?`, ...choices(rng, ans, [a * m, total / 2, ans + m]), why: `${a} + ${b} = ${a + b} parts, so one part is ₹${m}. The larger share is ${b} × ${m} = ₹${ans}.` };
    }
  },

  // Higher
  hWork: {
    band: HIGHER, size: WORK_SETS.length,
    make(k, rng) {
      const [p, d, q] = WORK_SETS[k]; const ans = (p * d) / q;
      return { kind: 'Aptitude', prompt: `${p} people finish a job in ${d} days. How long would ${q} people take?`, ...choices(rng, `${fmt(ans)} days`, [`${fmt((q * d) / p)} days`, `${fmt(ans + 2)} days`, `${fmt(d + p - q > 0 ? d + p - q : ans + 4)} days`, `${fmt(ans * 2)} days`]), why: `The job is ${p} × ${d} = ${p * d} person-days; ${p * d} ÷ ${q} = ${fmt(ans)} days.` };
    }
  },
  hInterest: {
    band: HIGHER, size: 8 * 2,
    make(k, rng) {
      const [ni, mi] = digits(k, [8, 2]);
      const n = [4, 5, 8, 10, 16, 20, 25, 40][ni]; const times = mi + 2;
      const rate = ((times - 1) * 100) / n;
      const word = times === 2 ? 'doubles' : 'triples';
      return { kind: 'Aptitude', prompt: `A sum ${word} in ${n} years at simple interest. The annual rate is…`, ...choices(rng, `${fmt(rate)}%`, [`${fmt((times * 100) / n)}%`, `${fmt(100 / n / 2)}%`, `${fmt(rate + 2.5)}%`, `${fmt(rate * 2)}%`]), why: `The interest earned is ${times - 1} × the principal over ${n} years, so ${(times - 1) * 100} ÷ ${n} = ${fmt(rate)}% a year.` };
    }
  },
  hSlice: {
    band: HIGHER, size: 4 * 4 * 10,
    make(k, rng) {
      const [si, di, pi] = digits(k, [4, 4, 10]);
      const s = [0, 1, 2, 10][si]; const d = [1, 2, 3, 5][di];
      const list = Array.from({ length: 6 }, (_, i) => s + i * d);
      const [i, j] = [[0, 2], [0, 3], [1, 3], [1, 4], [1, 5], [2, 4], [2, 5], [2, 6], [3, 5], [3, 6]][pi];
      const show = (a) => `[${a.join(',')}]`;
      return { kind: 'Code output', prompt: `In Python, what does  ${show(list)}[${i}:${j}]  return?`, ...choices(rng, show(list.slice(i, j)), [show(list.slice(i, j + 1)), show(list.slice(i + 1, j + 1)), show(list.slice(Math.max(0, i - 1), j)), show(list.slice(i, j - 1))]), why: `Slicing starts at index ${i} and stops before index ${j}, so it takes indices ${Array.from({ length: j - i }, (_, x) => i + x).join(', ')}.` };
    }
  },
  hFloor: {
    band: HIGHER, size: 26 * 8 * 2,
    make(k, rng) {
      const [ai, bi, op] = digits(k, [26, 8, 2]);
      const a = -(ai + 5); const b = bi + 2;
      const q = Math.floor(a / b); const r = a - b * q;
      if (op === 0) {
        return { kind: 'Code output', prompt: `In Python, what is  ${a} // ${b} ?`, ...choices(rng, q, [Math.trunc(a / b) === q ? q + 1 : Math.trunc(a / b), q - 1, -q]), why: `// rounds down, towards minus infinity: ${a} ÷ ${b} = ${fmt(a / b)}, which floors to ${q}.` };
      }
      return { kind: 'Code output', prompt: `In Python, what is  ${a} % ${b} ?`, ...choices(rng, r, [a % b, -r, r === 0 ? 1 : b - r]), why: `Python's % takes the sign of the divisor: ${a} = ${b} × (${q}) + ${r}, so the remainder is ${r}.` };
    }
  },
  hRange: {
    band: HIGHER, size: 11 * 12 * 6,
    make(k, rng) {
      const [ai, wi, si] = digits(k, [11, 12, 6]);
      const a = ai; const b = a + 7 + wi * 3; const s = si + 2;
      const ans = Math.ceil((b - a) / s);
      return { kind: 'Code output', prompt: `In Python, what is  len(range(${a}, ${b}, ${s})) ?`, ...choices(rng, ans, [Math.floor((b - a) / s) === ans ? ans + 1 : Math.floor((b - a) / s), ans - 1, Math.floor((b - a + 1) / s) + 1]), why: `range(${a}, ${b}, ${s}) counts ${a}, ${a + s}, … up to but not including ${b} — that is ${ans} numbers.` };
    }
  },
  hBinary: {
    band: HIGHER, size: 247,
    make(k, rng) {
      const n = 9 + ((k * 131) % 247);
      const bin = n.toString(2);
      const reversed = parseInt(bin.split('').reverse().join(''), 2);
      return { kind: 'Computer science', prompt: `What is the binary number  ${bin}  in decimal?`, ...choices(rng, n, [reversed, n + 2 ** (bin.length - 2), n - 1]), why: `Add the place values of each 1: ${bin.split('').map((c, i) => (c === '1' ? 2 ** (bin.length - 1 - i) : null)).filter((v) => v !== null).join(' + ')} = ${n}.` };
    }
  },
  hProfit: {
    band: HIGHER, size: PROFIT_SETS.length,
    make(k, rng) {
      const [c, pct, sign] = PROFIT_SETS[k];
      const sp = c + (sign * c * pct) / 100; const word = sign > 0 ? 'profit' : 'loss';
      const diff = Math.abs(sp - c);
      return { kind: 'Aptitude', prompt: `Bought for ₹${c}, sold for ₹${sp}. What is the ${word} percentage?`, ...choices(rng, `${fmt(pct)}%`, [`${fmt((diff / sp) * 100)}%`, `${fmt(pct * 2)}%`, `${fmt(pct + 5)}%`, `${fmt(diff / 10)}%`]), why: `${word === 'profit' ? 'Profit' : 'Loss'} is ₹${diff}, taken on the cost price: ${diff} ÷ ${c} × 100 = ${fmt(pct)}%.` };
    }
  },
  hPerm: {
    band: HIGHER, size: WORDS.length,
    make(k, rng) {
      const w = WORDS[k];
      const counts = {};
      w.split('').forEach((c) => { counts[c] = (counts[c] || 0) + 1; });
      const repeats = Object.entries(counts).filter(([, n]) => n > 1);
      const ans = fact(w.length) / repeats.reduce((p, [, n]) => p * fact(n), 1);
      return { kind: 'Aptitude', prompt: `In how many ways can the letters of ${w} be arranged?`, ...choices(rng, ans, [fact(w.length), fact(w.length) / 2, ans * 2]), why: `${w.length}! ÷ (${repeats.map(([c, n]) => `${n}! for ${c}`).join(', ')}) = ${ans}, because repeated letters swapped among themselves give the same word.` };
    }
  }
};

// ── Sequence ────────────────────────────────────────────────────────────────

/** A stride coprime to `size`, so stepping k by it visits every value once, out of order. */
const strideFor = (size) => {
  let p = 7919;
  while (gcd(p, size) !== 1) p += 1;
  return p;
};

const keysFor = (band) => Object.keys(TEMPLATES).filter((key) => TEMPLATES[key].band === band);

/**
 * The band's generated ids in serving order: one from each template in turn, so
 * consecutive days rotate through kinds, and within a template the parameters
 * jump around instead of creeping up one at a time.
 */
function* generatedIds(band) {
  const keys = keysFor(band);
  const longest = Math.max(...keys.map((key) => TEMPLATES[key].size));
  for (let round = 0; round < longest; round += 1) {
    for (const key of keys) {
      const { size } = TEMPLATES[key];
      if (round < size) yield `g:${key}:${(round * strideFor(size)) % size}`;
    }
  }
}

/** Rebuild a generated activity from its id, or null if the id is not one. */
const generated = (id) => {
  const m = /^g:([A-Za-z]+):(\d+)$/.exec(String(id));
  const template = m && TEMPLATES[m[1]];
  const k = m ? Number(m[2]) : -1;
  if (!template || k >= template.size) return null;
  return { id, band: template.band, ...template.make(k, rngFrom(id)) };
};

module.exports = { generatedIds, generated, TEMPLATES };
