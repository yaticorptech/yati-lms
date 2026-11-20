/**
 * Game-specific demos for group masterB (Master Minds verbal + maths, and four classic maths games). Each is a pure
 * function of (f, ex): a small copy of the game's own screen, clean type and SVG, no emoji. See GameDemo.jsx.
 */

// ---- Shared bits -------------------------------------------------------------------------------------------------
const OPT = {
  idle: 'bg-white text-[#1b2456] ring-1 ring-slate-200',
  hold: 'bg-indigo-600 text-white ring-2 ring-indigo-600',
  ok: 'bg-emerald-500 text-white ring-2 ring-emerald-500',
  bad: 'bg-rose-50 text-rose-700 ring-2 ring-rose-300',
  dim: 'bg-white text-slate-400 ring-1 ring-slate-200'
};
const REST = [88, 94, false];
const at2 = (i) => [27 + (i % 2) * 46, 66 + Math.floor(i / 2) * 20]; // 2×2 answer grid at the bottom
const at4 = (i) => [15.5 + i * 23, 85]; // four in a row at the bottom
const at3 = (i) => [19.3 + i * 30.7, 85]; // three in a row at the bottom

/** The usual pick-one flow: read (f < t0), point, tap, right. */
const pick = (f, right, at, [p0, p1, p2], t0 = 1) => {
  const k = f - t0;
  return {
    st: (i) => (i !== right ? (k >= 2 ? 'dim' : 'idle') : k >= 2 ? 'ok' : k === 1 ? 'hold' : 'idle'),
    hand: k < 0 ? REST : [...at(right), k === 1],
    step: k < 0 ? 0 : k < 2 ? 1 : 2,
    phase: k < 0 ? p0 : k < 2 ? p1 : p2,
    done: k >= 2
  };
};

function score(n) {
  return <span className="absolute top-1.5 right-1.5 z-20 rounded-full bg-slate-900 px-2 py-0.5 text-xs font-black text-white tabular-nums">Score {n}</span>;
}

/** A pick-one board: prompt on top, options in a 2×2 grid (or a row) at the bottom. */
function board({ prompt, opts, st, layout = 'grid', mono = false, small = false }) {
  const grid = layout === 'row4' ? 'h-[22%] grid-cols-4' : layout === 'row3' ? 'h-[22%] grid-cols-3' : 'h-[40%] grid-cols-2';
  return (
    <div className="relative h-full">
      <div className={`absolute inset-x-3 top-8 flex flex-col items-center justify-center text-center ${layout === 'grid' ? 'bottom-[46%]' : 'bottom-[29%]'}`}>{prompt}</div>
      <div className={`absolute inset-x-3 bottom-3 grid gap-1.5 ${grid}`}>
        {opts.map((o, i) => (
          <div key={o} className={`grid place-items-center rounded-xl px-1 text-center leading-tight font-black transition-colors duration-300 ${small ? 'text-xs' : 'text-sm'} ${mono ? 'font-mono' : ''} ${OPT[st(i)]}`}>{o}</div>
        ))}
      </div>
    </div>
  );
}

const quiz = (data, render, phases, { layout = 'grid', mono = false, small = false, showScore = true } = {}) => ({
  frames: 5,
  draw: (f, ex) => {
    const d = data[ex];
    const at = layout === 'row4' ? at4 : layout === 'row3' ? at3 : at2;
    const p = pick(f, d.right, at, phases);
    return {
      body: <>{showScore && score([3, 5, 7][ex] + (p.done ? 1 : 0))}{board({ prompt: render(d, f), opts: d.opts, st: p.st, layout, mono, small })}</>,
      hand: p.hand, step: p.step, phase: p.phase
    };
  }
});

const eyebrow = 'text-xs font-black tracking-[0.14em] uppercase';

// ---- Verbal: Synonyms & Antonyms, Idiom Sense --------------------------------------------------------------------
const SYN = [
  { tag: 'Same as', word: 'Candid', opts: ['frank', 'sly', 'timid', 'vague'], right: 0 },
  { tag: 'Opposite of', word: 'Frugal', opts: ['thrifty', 'lavish', 'modest', 'careful'], right: 1 },
  { tag: 'Which word fits best?', text: ['He ', ' the rumour with the full figures.'], opts: ['refused', 'reputed', 'refuted', 'revered'], right: 2 }
];
const IDIOM = [
  { phrase: 'Sour grapes', opts: ['Pretending not to want it', 'Disliking fruit', 'Honest criticism', 'A bitter taste'], right: 0 },
  { phrase: 'Rest on your laurels', opts: ['Take a short break', 'Stop trying after a success', 'Celebrate loudly', 'Plan for the future'], right: 1 },
  { phrase: 'The writing on the wall', opts: ['An advertisement', 'A sign of success', 'A clear sign of coming failure', 'A notice of a sale'], right: 2 }
];

// ---- Maths quiz data -----------------------------------------------------------------------------------------------
const PCT = [
  { ask: 'Sale price?', line: '₹2,400 with 25% off', opts: ['₹1,800', '₹600', '₹2,100', '₹1,600'], right: 0 },
  { ask: 'Total to pay?', line: '₹500 + 18% GST', opts: ['₹518', '₹590', '₹680', '₹509'], right: 1 },
  { ask: 'Overall change?', line: 'Up 20%, then down 20%', opts: ['0%', '+4%', '−4%', '−2%'], right: 2 }
];
const BIN = [
  { ask: 'Read as decimal', show: '1011', places: [8, 4, 2, 1], opts: ['9', '11', '13', '10'], right: 1 },
  { ask: 'Write in binary', show: '6', opts: ['0110', '0101', '0111', '0100'], right: 0 },
  { ask: 'Read as decimal', show: '11010', places: [16, 8, 4, 2, 1], opts: ['24', '22', '26', '28'], right: 2 }
];
const ROUND = [
  { place: 100, n: '4672', dig: 2, opts: ['4700', '4600', '5000', '4670'], right: 0 },
  { place: 10, n: '385', dig: 2, opts: ['380', '390', '400', '385'], right: 1 },
  { place: 1000, n: '6481', dig: 1, opts: ['6500', '7000', '6000', '6400'], right: 2 }
];
const QC = [
  { cond: 'x > 1', a: 'x²', b: 'x', right: 0 },
  { cond: null, a: '2³', b: '3²', right: 1 },
  { cond: 'x ≠ 0', a: 'x²', b: '2x', right: 3 }
];
const QC_OPTS = ['A is greater', 'B is greater', 'Equal', 'Cannot be determined'];
const CLOCK = [
  { h: 4, m: 30, opts: ['5:30', '4:30', '6:20', '4:00'], right: 1 },
  { h: 10, m: 15, opts: ['10:15', '3:50', '9:15', '10:45'], right: 0 },
  { h: 7, m: 40, opts: ['8:40', '7:45', '8:35', '7:40'], right: 3 }
];

function clock(h, m, hi) {
  const ticks = [...Array(12).keys()];
  return (
    <svg viewBox="0 0 120 120" className="h-full w-auto" aria-hidden>
      <circle cx="60" cy="60" r="56" fill="#fff" stroke="#c7d2fe" strokeWidth="4" />
      {ticks.map((i) => {
        const a = (i * Math.PI) / 6; const big = i % 3 === 0;
        return <line key={i} x1={60 + Math.sin(a) * (big ? 44 : 48)} y1={60 - Math.cos(a) * (big ? 44 : 48)} x2={60 + Math.sin(a) * 52} y2={60 - Math.cos(a) * 52} stroke={big ? '#4338ca' : '#a5b4fc'} strokeWidth={big ? 3 : 2} strokeLinecap="round" />;
      })}
      {[12, 3, 6, 9].map((n, i) => <text key={n} x={60 + Math.sin((i * Math.PI) / 2) * 35} y={64 - Math.cos((i * Math.PI) / 2) * 35} textAnchor="middle" fontSize="13" fontWeight="800" fill="#312e81">{n}</text>)}
      <line x1="60" y1="60" x2="60" y2="32" stroke={hi === 'h' ? '#f59e0b' : '#1e1b4b'} strokeWidth="6" strokeLinecap="round" transform={`rotate(${(h % 12) * 30 + m * 0.5} 60 60)`} />
      <line x1="60" y1="60" x2="60" y2="16" stroke={hi === 'm' ? '#f59e0b' : '#6c3bff'} strokeWidth="4" strokeLinecap="round" transform={`rotate(${m * 6} 60 60)`} />
      <circle cx="60" cy="60" r="4" fill="#1e1b4b" />
    </svg>
  );
}

// ---- Probability Lab bags ------------------------------------------------------------------------------------------
const BAGS = [
  { colour: 'red', bags: [[2, 3], [3, 2], [4, 4]], frac: ['2/5 = 40%', '3/5 = 60%', '4/8 = 50%'], right: 1 },
  { colour: 'red', bags: [[3, 1], [5, 3], [6, 4]], frac: ['3/4 = 75%', '5/8 ≈ 63%', '6/10 = 60%'], right: 0 },
  { colour: 'blue', bags: [[2, 2], [4, 3], [1, 3]], frac: ['2/4 = 50%', '3/7 ≈ 43%', '3/4 = 75%'], right: 2 }
];

// ---- Statistical Inference plots ----------------------------------------------------------------------------------
function dots({ rows, lo, hi, mark }) {
  const x = (v) => 22 + ((v - lo) / (hi - lo)) * 170;
  return (
    <svg viewBox="0 0 200 74" className="h-full w-full" aria-hidden>
      {rows.map((row, k) => {
        const base = rows.length === 1 ? 52 : 28 + k * 34; const seen = {};
        return (
          <g key={k}>
            {row.label && <text x="2" y={base + 4} fontSize="13" fontWeight="800" fill="#334155">{row.label}</text>}
            <line x1="20" y1={base + 7} x2="196" y2={base + 7} stroke="#cbd5e1" />
            {row.xs.map((v, i) => { seen[v] = (seen[v] || 0) + 1; return <circle key={i} cx={x(v)} cy={base - (seen[v] - 1) * 8} r="3.6" fill={v === mark ? '#e11d48' : '#0d9488'} />; })}
          </g>
        );
      })}
    </svg>
  );
}
const STATS = [
  { plot: dots({ lo: 2, hi: 11, rows: [{ label: 'A', xs: [6, 7, 7, 8, 8, 8, 9, 10] }, { label: 'B', xs: [3, 4, 4, 5, 5, 6, 7, 7] }] }), ask: 'Which has the greater mean?', opts: ['Sample A', 'Sample B', 'Same'], right: 0 },
  { plot: dots({ lo: 3, hi: 19, mark: 18, rows: [{ xs: [4, 5, 5, 6, 6, 6, 7, 18] }] }), ask: 'Remove the red point. The mean…', opts: ['rises', 'falls', 'stays'], right: 1 },
  {
    plot: (
      <svg viewBox="0 0 200 74" className="h-full w-full" aria-hidden>
        <line x1="14" y1="68" x2="196" y2="68" stroke="#64748b" /><line x1="14" y1="68" x2="14" y2="4" stroke="#64748b" />
        {[[1, 9], [2, 8], [3, 8.5], [4, 6], [5, 6.5], [6, 4], [7, 3.5], [8, 2]].map(([a, b]) => <circle key={a} cx={14 + a * 21} cy={70 - b * 7} r="3.6" fill="#0d9488" />)}
      </svg>
    ),
    ask: 'What is the correlation?', opts: ['positive', 'negative', 'none'], right: 1
  }
];

// ---- Decision Theory Arena -----------------------------------------------------------------------------------------
const DECIDE = [
  { cautious: false, states: [['Boom', 60], ['Bust', 40]], plans: ['Bonds', 'Stocks', 'Startup'], pay: [[4, 4], [20, -10], [40, -50]], score: [4, 8, 4], right: 1, after: 120 },
  { cautious: true, states: [['Boom', 50], ['Bust', 50]], plans: ['Plan A', 'Plan B', 'Plan C'], pay: [[10, -20], [6, -2], [25, -40]], score: [-20, -2, -40], right: 1, after: 106 },
  { cautious: false, states: [['Rain', 30], ['Sun', 70]], plans: ['Umbrellas', 'Both', 'Ice cream'], pay: [[30, -10], [5, 5], [-15, 20]], score: [2, 5, 9.5], right: 2, after: 120 }
];

// ---- Numerical Optimization knapsack ------------------------------------------------------------------------------
const PACK = [
  { cap: 10, items: [['Tent', 5, 10], ['Stove', 4, 7], ['Camera', 3, 8], ['Rope', 2, 3]], taps: [0, 1, 2, 1, 3] },
  { cap: 8, items: [['Laptop', 4, 9], ['Books', 3, 5], ['Drone', 5, 11], ['Lamp', 1, 3]], taps: [2, 1, 0, 2, 3] },
  { cap: 12, items: [['Gold', 6, 15], ['Silver', 5, 11], ['Gem', 2, 8], ['Coin', 4, 9]], taps: [0, 1, 2, 1, 3] }
];

// ---- Number Forge ---------------------------------------------------------------------------------------------------
const FORGE = [
  { target: 24, tiles: [5, 7, 2, 9], a: 0, op1: 0, b: 1, r1: 12, c: 2, op2: 2 },
  { target: 15, tiles: [9, 4, 6, 3], a: 0, op1: 1, b: 1, r1: 5, c: 3, op2: 2 },
  { target: 36, tiles: [8, 4, 3], a: 0, op1: 0, b: 1, r1: 12, c: 2, op2: 2, rule: 'use every tile' }
];
const OPS = ['+', '−', '×', '÷'];

// ---- Number Bonds ---------------------------------------------------------------------------------------------------
const BONDS = [
  { goal: 17, tiles: [5, 9, 11, 4, 15, 7, 8, 3, 16], pair: [1, 6] },
  { goal: 23, tiles: [6, 12, 5, 14, 20, 15, 7, 2, 9], pair: [3, 8] },
  { goal: 31, tiles: [13, 10, 25, 4, 16, 18, 22, 7, 11], pair: [5, 0] }
];

// ---- Master Minds verbal boards -------------------------------------------------------------------------------------
const ROLE = { p: ['Premise', 'bg-sky-50 text-sky-800 ring-sky-300'], c: ['Conclusion', 'bg-violet-100 text-violet-800 ring-violet-400'] };
const ARG = [
  { lines: [['Breakfast eaters score higher on tests.', 'p'], ['Our school’s scores are low.', 'p'], ['So we should serve free breakfast.', 'c']], kind: 'weaken', opts: ['Breakfast is the most popular meal.', 'Breakfast eaters also sleep more, and sleep explains it.'], right: 1 },
  { lines: [['Cities with bike lanes have fewer crashes.', 'p'], ['Our city has few bike lanes.', 'p'], ['So more lanes will cut our crashes.', 'c']], kind: 'weaken', opts: ['Those cities also have lower speed limits.', 'Cycling is good for health.'], right: 0 },
  { lines: [['Daily reading time will improve our essays.', 'c'], ['Students who read daily write better.', 'p'], ['Our library is rarely used.', 'p']], kind: 'strengthen', opts: ['Essays are marked strictly.', 'In trials, added reading time raised essay marks.'], right: 1 }
];
const PARA = [
  { s: ['Bees are vital pollinators.', 'However, their numbers are falling.', 'This decline threatens crops.', 'As a result, farmers now rent hives.'], start: [1, 0, 3, 2], moves: [[0, 1], [2, 3]] },
  { s: ['Gandhi returned to India in 1915.', 'He soon led peasant protests.', 'These made him a national figure.', 'Finally, he led the Salt March.'], start: [3, 1, 0, 2], moves: [[0, 2], [2, 3]] },
  { s: ['Plastic is cheap and durable.', 'Yet it lasts for centuries.', 'As a result, oceans fill with waste.', 'So many countries now ban bags.'], start: [0, 3, 1, 2], moves: [[1, 2], [2, 3]] }
];
const NUANCE = [
  { idea: 'rain', ends: ['Weakest', 'Strongest'], words: ['drizzle', 'shower', 'downpour', 'deluge'], tray: [2, 0, 3, 1], place: [0, 3, 1, 2] },
  { idea: 'anger', ends: ['Weakest', 'Strongest'], words: ['irked', 'annoyed', 'angry', 'furious'], tray: [3, 1, 0, 2], place: [3, 0, 2, 1] },
  { idea: 'to start', ends: ['Informal', 'Formal'], words: ['kick off', 'start', 'begin', 'commence'], tray: [1, 3, 2, 0], place: [0, 3, 1, 2] }
];
const SLOT_X = [17, 39, 61, 83];
const MATRIX = [
  { cols: ['Maker', 'Tool', 'Work'], rows: [['potter', 'wheel', 'vase'], ['tailor', 'needle', 'suit'], ['sculptor', 'chisel', 'statue']], blanks: [[1, 2], [2, 0]], pool: ['loom', 'suit', 'sculptor'] },
  { cols: ['Country', 'Capital', 'Currency'], rows: [['Japan', 'Tokyo', 'yen'], ['India', 'New Delhi', 'rupee'], ['China', 'Beijing', 'yuan']], blanks: [[1, 1], [2, 2]], pool: ['yuan', 'baht', 'New Delhi'] },
  { cols: ['Animal', 'Young', 'Group'], rows: [['lion', 'cub', 'pride'], ['goose', 'gosling', 'gaggle'], ['wolf', 'pup', 'pack']], blanks: [[2, 2], [1, 1]], pool: ['gosling', 'pack', 'herd'] }
];
const COL_X = [19, 50, 81];

// ---- The demos ------------------------------------------------------------------------------------------------------
export const DEMOS = {
  'synonym-match': quiz(SYN, (d) => (d.text ? (
    <><p className={`${eyebrow} text-purple-600`}>{d.tag}</p><p className="mt-1 text-sm leading-snug font-bold text-[#1b2456]">{d.text[0]}<span className="mx-1 inline-block w-12 border-b-4 border-purple-400 align-bottom" />{d.text[1]}</p></>
  ) : (
    <><p className={`${eyebrow} ${d.tag === 'Opposite of' ? 'text-rose-600' : 'text-fuchsia-600'}`}>{d.tag}</p><p className="mt-1 text-3xl font-black tracking-wide text-[#1b2456]">{d.word}</p></>
  )), ['Read the word', 'Pick the match', 'Correct!']),

  'idiom-sense': quiz(IDIOM, (d) => (
    <><p className={`${eyebrow} text-pink-600`}>What does this mean?</p><p className="mt-1 text-xl font-black text-[#1b2456]">“{d.phrase}”</p></>
  ), ['Read the phrase', 'Not the literal one', 'Correct!'], { small: true }),

  'word-relation-matrix': {
    frames: 7,
    draw: (f, ex) => {
      const d = MATRIX[ex];
      const fill = d.blanks.map(([r, c]) => d.rows[r][c]);
      const filled = f >= 4 ? 2 : f >= 2 ? 1 : 0;
      const holding = f === 1 ? fill[0] : f === 3 ? fill[1] : null;
      const blankAt = (r, c) => d.blanks.findIndex(([br, bc]) => br === r && bc === c);
      const tap = [null, ['pool', fill[0]], ['cell', 0], ['pool', fill[1]], ['cell', 1]][f];
      return {
        body: (
          <div className="flex h-full flex-col px-3 pt-8 pb-3">
            <div className="grid grid-cols-3 gap-1">
              {d.cols.map((c) => <span key={c} className="grid h-6 place-items-center rounded-md bg-[#1b2456] text-xs font-bold tracking-wider text-white uppercase">{c}</span>)}
              {d.rows.flatMap((row, r) => row.map((w, c) => {
                const k = blankAt(r, c);
                if (k < 0) return <span key={w} className="grid h-7 place-items-center rounded-md bg-[#f7f6fd] text-xs font-semibold text-[#1b2456] ring-1 ring-[#e4e1f5]">{w}</span>;
                const got = k < filled;
                return <span key={w} className={`grid h-7 place-items-center rounded-md text-xs font-bold ${got ? (f >= 5 ? OPT.ok : 'bg-white text-[#1b2456] ring-2 ring-indigo-300') : holding ? 'border-2 border-dashed border-indigo-400 bg-indigo-50 text-indigo-400' : 'border-2 border-dashed border-[#d9d4f3] bg-white text-slate-300'}`}>{got ? w : '?'}</span>;
              }))}
            </div>
            <div className="mt-auto grid grid-cols-3 gap-1">{d.pool.map((w) => {
              const used = fill.indexOf(w) > -1 && fill.indexOf(w) < filled;
              return <span key={w} className={`grid h-8 place-items-center rounded-lg text-xs font-semibold ${used ? 'opacity-0' : holding === w ? OPT.hold : f >= 5 ? OPT.dim : OPT.idle}`}>{w}</span>;
            })}</div>
          </div>
        ),
        hand: !tap ? REST : tap[0] === 'pool' ? [COL_X[d.pool.indexOf(tap[1])], 87, true] : [COL_X[d.blanks[tap[1]][1]], 33 + d.blanks[tap[1]][0] * 14, true],
        step: f === 0 ? 0 : f < 5 ? 1 : 2,
        phase: f === 0 ? 'Rows share a relation' : f < 5 ? 'Fill the blanks' : 'Every relation holds'
      };
    }
  },

  'percent-snap': quiz(PCT, (d) => (
    <><p className="text-xs font-black text-slate-600">{d.ask}</p><p className="mt-1 text-2xl font-black text-[#1b2456] tabular-nums">{d.line}</p></>
  ), ['Read the question', 'Work it out', 'Correct!']),

  'number-forge': {
    frames: 8,
    draw: (f, ex) => {
      const d = FORGE[ex];
      const tiles = d.tiles.map((v, i) => (f >= 6 ? (i === d.a ? d.target : i === d.b || i === d.c ? null : v) : f >= 3 ? (i === d.a ? d.r1 : i === d.b ? null : v) : v));
      const sel = f === 1 || f === 2 || f === 4 || f === 5 ? d.a : null;
      const opOn = f === 2 ? d.op1 : f === 5 ? d.op2 : null;
      const n = d.tiles.length;
      const tx = (i) => (n === 3 ? 19.3 + i * 30.7 : 15.5 + i * 23);
      const done = f >= 6;
      return {
        body: (
          <div className="flex h-full flex-col gap-2 px-3 pt-8 pb-2">
            <div className={`grid h-12 shrink-0 place-items-center rounded-2xl text-white ${done ? 'bg-emerald-500' : 'bg-gradient-to-br from-amber-500 to-orange-600'}`}><span className="text-xs leading-none font-black tracking-[0.18em] uppercase opacity-80">Target</span><span className="text-2xl leading-none font-black tabular-nums">{d.target}</span></div>
            <div className={`grid h-12 gap-1.5 ${n === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>{tiles.map((v, i) => (
              <span key={i} className={`grid place-items-center rounded-xl text-xl font-black tabular-nums ${v === null ? 'opacity-0' : done && i === d.a ? OPT.ok : sel === i ? 'bg-amber-500 text-white ring-2 ring-amber-500' : 'bg-white text-[#1b2456] ring-1 ring-slate-200'}`}>{v}</span>))}</div>
            <div className="grid h-10 grid-cols-4 gap-1.5">{OPS.map((o, i) => <span key={o} className={`grid place-items-center rounded-xl text-xl font-black ${opOn === i ? 'bg-orange-600 text-white' : 'bg-white text-[#1b2456] ring-1 ring-slate-200'}`}>{o}</span>)}</div>
            {d.rule && <p className="rounded-lg bg-amber-50 text-center text-xs font-black text-amber-800 ring-1 ring-amber-200">Rule: {d.rule}</p>}
          </div>
        ),
        hand: [REST, [tx(d.a), 50, true], [15.5 + d.op1 * 23, 72, true], [tx(d.b), 50, true], [tx(d.a), 50, true], [15.5 + d.op2 * 23, 72, true], [tx(d.c), 50, true], REST][f],
        step: f === 0 ? 0 : f < 6 ? 1 : 2,
        phase: f === 0 ? 'Make the target' : f < 6 ? 'Tile, sign, tile' : 'Forged!'
      };
    }
  },

  'binary-blitz': quiz(BIN, (d, f) => (
    <>
      <p className={`${eyebrow} text-slate-400`}>{d.ask}</p>
      <div className="mt-1 rounded-2xl bg-slate-50 px-3 py-1.5 ring-1 ring-slate-200">
        <div className="flex justify-center font-mono text-3xl font-black text-[#1b2456]">{d.show.split('').map((b, i) => <span key={i} className="w-7 text-center">{b}</span>)}</div>
        {d.places && f >= 1 && <div className="flex justify-center font-mono text-xs font-bold text-teal-700">{d.places.map((p, i) => <span key={i} className="w-7 text-center">{d.show[i] === '1' ? p : '·'}</span>)}</div>}
      </div>
    </>
  ), ['Read the bits', 'Add the place values', 'Correct!'], { mono: true }),

  'number-bonds': {
    frames: 6,
    draw: (f, ex) => {
      const d = BONDS[ex];
      const picked = f >= 2 ? d.pair : f === 1 ? [d.pair[0]] : [];
      const pos = (i) => [30 + (i % 3) * 20, 39 + Math.floor(i / 3) * 23];
      return {
        body: (
          <div className="flex h-full flex-col items-center px-3 pt-7 pb-2">
            {score([3, 5, 7][ex] + (f >= 3 ? 1 : 0))}
            <p className="flex h-8 items-baseline gap-2"><span className={`${eyebrow} text-amber-600`}>Make</span><span className="text-2xl font-black text-[#1b2456] tabular-nums">{d.goal}</span></p>
            <div className="grid w-[60%] flex-1 grid-cols-3 gap-1.5">{d.tiles.map((n, i) => (
              <span key={i} className={`grid place-items-center rounded-xl text-lg font-black tabular-nums ring-1 ring-inset ${picked.includes(i) ? (f >= 3 ? 'bg-emerald-50 text-emerald-800 ring-emerald-400' : 'bg-amber-100 text-amber-900 ring-amber-400') : 'bg-white text-[#1b2456] ring-slate-200'}`}>{n}</span>))}</div>
          </div>
        ),
        hand: f === 1 || f === 2 ? [...pos(d.pair[f - 1]), true] : REST,
        step: f === 0 ? 0 : f < 3 ? 1 : 2,
        phase: f === 0 ? 'Find two that make it' : f < 3 ? 'Tap the pair' : `${d.tiles[d.pair[0]]} + ${d.tiles[d.pair[1]]} = ${d.goal}`
      };
    }
  },

  'rounding-rush': quiz(ROUND, (d, f) => (
    <>
      <p className={`${eyebrow} text-amber-600`}>Round to the nearest {d.place}</p>
      <p className="mt-1 text-4xl font-black text-[#1b2456] tabular-nums">{d.n.split('').map((c, i) => <span key={i} className={f >= 1 && i === d.dig ? 'text-amber-600 underline decoration-4 underline-offset-4' : ''}>{c}</span>)}</p>
    </>
  ), ['Read the place', 'Look one digit right', 'Correct!']),

  'clock-read': {
    frames: 6,
    draw: (f, ex) => {
      const d = CLOCK[ex];
      const p = pick(f, d.right, at4, ['', '', 'Correct!'], 2);
      return {
        body: <>{score([3, 5, 7][ex] + (p.done ? 1 : 0))}{board({ prompt: <div className="h-full py-1">{clock(d.h, d.m, f === 1 ? 'h' : f === 2 ? 'm' : null)}</div>, opts: d.opts, st: p.st, layout: 'row4' })}</>,
        hand: p.hand,
        step: f === 0 ? 0 : f < 4 ? 1 : 2,
        phase: ['Read the clock', 'Short hand: hour', 'Long hand: minutes', 'Pick the time', 'Correct!', 'Correct!'][f]
      };
    }
  }
};
