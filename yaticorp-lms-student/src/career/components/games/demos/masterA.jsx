/**
 * Game-specific demos (see GameDemo.jsx) for group masterA: Master Minds (Classes 11–12+) — premium, clean type and
 * SVG, no emoji. Every draw is a pure function of (frame, example); geometry is inline style, colour is Tailwind.
 */

// ---- Shared helpers (pure) ----------------------------------------------------------------------------------------
const REST = [93, 90, false];
/** Absolute placement in % of the 4:3 demo box. */
const box = (x, y, w, h) => ({ left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` });
/** A square n×n board: `top`/`size` in % of the box height, `left` in % of its width (centred when omitted). */
const square = (n, top, size, left) => {
  const w = size * 0.75;
  const l = left ?? (100 - w) / 2;
  return { style: box(l, top, w, size), pos: (i) => [l + ((i % n) + 0.5) * (w / n), top + (Math.floor(i / n) + 0.5) * (size / n)] };
};
/** Inline geometry of an n×n board placed by `square`. */
const boardStyle = (n, sq) => ({ ...sq.style, gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${n}, minmax(0, 1fr))` });
const range = (n) => [...Array(n).keys()];

// ---- Grid Recall (master: two patterns, the second recalled first) -----------------------------------------------
const GR_SETS = [[[1, 6, 11], [12, 9, 3]], [[0, 5, 14], [2, 7, 13]], [[4, 9, 2], [15, 10, 8]]];
const GR_PHASE = ['Watch pattern 1', 'Watch pattern 2', 'Second one first', 'Tap the amber', 'Tap the amber', 'Tap the amber', 'Now the violet', 'Now the violet', 'Now the violet', 'Round cleared'];
function gridRecall(f, ex) {
  const [first, second] = GR_SETS[ex];
  const sq = square(4, 14, 80, 32);
  const picked = f >= 3 && f <= 5 ? second.slice(0, f - 2) : f >= 6 ? first.slice(0, Math.min(3, f - 5)) : [];
  const target = f >= 3 && f <= 5 ? second[f - 3] : f >= 6 && f <= 8 ? first[f - 6] : null;
  const tone = (i) => (f === 0 && first.includes(i) ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-md shadow-violet-500/40'
    : f === 1 && second.includes(i) ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-md shadow-amber-500/40'
      : picked.includes(i) ? 'bg-emerald-400' : 'bg-white ring-1 ring-slate-200');
  const firstNow = f === 0 || f >= 6;
  return {
    body: (
      <div className="absolute inset-0 text-[#1b2456]">
        <div className="absolute top-[34%] left-[3%] flex w-[26%] flex-col gap-2 text-xs font-bold">
          <span className={`flex items-center gap-1.5 rounded-lg px-1.5 py-1 ${firstNow ? 'bg-violet-100 text-violet-800' : 'text-slate-500'}`}><span className="h-3 w-3 shrink-0 rounded bg-violet-500" />First</span>
          <span className={`flex items-center gap-1.5 rounded-lg px-1.5 py-1 ${firstNow ? 'text-slate-500' : 'bg-amber-100 text-amber-800'}`}><span className="h-3 w-3 shrink-0 rounded bg-amber-500" />Second</span>
        </div>
        <div className="absolute grid gap-1" style={boardStyle(4, sq)}>{range(16).map((i) => <div key={i} className={`rounded-md transition-colors duration-300 ${tone(i)}`} />)}</div>
      </div>
    ),
    hand: target === null ? REST : [...sq.pos(target), true],
    step: f < 2 ? 0 : f < 9 ? 1 : 2,
    phase: GR_PHASE[f]
  };
}

// ---- Reverse Recall (master: backwards, every digit +1) ------------------------------------------------------------
const PAD10 = '1234567890';
function reverseRecall(f, ex) {
  const shown = ['3792', '5186', '9402'][ex];
  const flipped = [...shown].reverse().join('');
  const answer = [...flipped].map((d) => String((Number(d) + 1) % 10)).join('');
  const typed = f >= 3 ? answer.slice(0, Math.min(4, f - 2)) : '';
  const keyPos = (d) => { const k = PAD10.indexOf(d); return [12 + ((k % 5) + 0.5) * 11, 72 + (Math.floor(k / 5) + 0.5) * 12]; };
  return {
    body: (
      <div className="absolute inset-0 text-[#1b2456]">
        {f < 2 ? (
          <div className="absolute inset-x-0 top-[24%] text-center">
            <p className="text-xs font-black tracking-[0.16em] text-violet-600 uppercase">Memorise</p>
            <p className="mt-2 text-5xl font-black tracking-[0.2em] tabular-nums">{shown}</p>
          </div>
        ) : (
          <>
            <p className="absolute inset-x-0 top-[13%] text-center text-xs font-black tracking-[0.12em] text-violet-600 uppercase">Backwards, every digit +1</p>
            <p className="absolute inset-x-0 top-[24%] text-center text-xs font-bold text-slate-500 tabular-nums">{shown} → {flipped} → +1 each</p>
            <div className={`absolute flex items-center justify-center rounded-2xl border-2 bg-white text-3xl font-black tracking-[0.2em] tabular-nums ${f === 7 ? 'border-emerald-400 text-emerald-700' : 'border-violet-300'}`} style={box(22, 36, 56, 22)}>{typed || ' '}</div>
            <div className="absolute grid grid-cols-5 gap-1" style={box(12, 72, 55, 24)}>
              {[...PAD10].map((d) => <span key={d} className="flex items-center justify-center rounded-md bg-white text-sm font-black ring-1 ring-slate-200">{d}</span>)}
            </div>
            <span className={`absolute flex items-center justify-center rounded-xl text-sm font-black text-white ${f === 7 ? 'bg-emerald-500' : 'bg-gradient-to-r from-violet-600 to-indigo-700'}`} style={box(71, 74, 22, 20)}>{f === 7 ? 'Right' : 'Check'}</span>
          </>
        )}
      </div>
    ),
    hand: f >= 3 && f <= 6 ? [...keyPos(answer[f - 3]), true] : f === 7 ? [82, 84, true] : REST,
    step: f < 2 ? 0 : f < 7 ? 1 : 2,
    phase: f < 2 ? 'Memorise' : f === 2 ? 'Flip, then +1' : f < 7 ? 'Type it in' : 'Correct · 5 digits next'
  };
}

// ---- Departure Board ------------------------------------------------------------------------------------------------
const DB = [
  { rows: [['08:10', 'TOKYO', 'B4'], ['08:35', 'PARIS', 'A7'], ['09:05', 'DUBAI', 'C2']], note: 'PARIS now leaves from gate D3', q: 'Which gate is the flight to Paris?', a: 'D3' },
  { rows: [['14:20', 'ROME', 'A2'], ['14:50', 'DELHI', 'C8'], ['15:15', 'OSLO', 'B6']], note: 'DELHI now leaves from gate A9', q: 'Which gate is the flight to Delhi?', a: 'A9' },
  { rows: [['19:05', 'SEOUL', 'D1'], ['19:40', 'LIMA', 'B3'], ['20:10', 'CAIRO', 'C5']], note: 'LIMA now leaves from gate C7', q: 'Which gate is the flight to Lima?', a: 'C7' }
];
function departureBoard(f, ex) {
  const d = DB[ex];
  const show = f < 3;
  const note = f === 3 || f === 4;
  const ask = f >= 5;
  const old = d.rows.find((r) => d.note.startsWith(r[1]))[2];
  const opts = [old, d.a, 'B9', 'A1'];
  return {
    body: (
      <div className="absolute inset-0 text-[#1b2456]">
        <div className="absolute rounded-xl bg-[#0b1020] p-2 ring-2 ring-slate-700" style={box(10, 6, 80, 44)}>
          <p className="text-[0.6rem] font-black tracking-[0.25em] text-amber-300">✈ DEPARTURES</p>
          {d.rows.map(([t, c, g]) => (
            <div key={c} className="mt-1 flex gap-1 font-mono text-xs font-black">
              <span className={`w-12 rounded px-1 ${show ? 'bg-slate-800 text-amber-300' : 'bg-slate-800/60 text-slate-600'}`}>{show ? t : '——'}</span>
              <span className={`flex-1 rounded px-1 ${show ? 'bg-slate-800 text-amber-300' : 'bg-slate-800/60 text-slate-600'}`}>{show ? c : '— —'}</span>
              <span className={`w-8 rounded px-1 ${show ? 'bg-slate-800 text-amber-300' : 'bg-slate-800/60 text-slate-600'}`}>{show ? g : '—'}</span>
            </div>
          ))}
        </div>
        {note && <div className="absolute rounded-xl bg-amber-50 p-2 text-center text-xs font-extrabold text-amber-900 ring-2 ring-amber-300" style={box(10, 56, 80, 22)}>📢 {d.note}</div>}
        {ask && (
          <div className="absolute" style={box(8, 54, 84, 44)}>
            <p className="text-center text-xs font-extrabold">{d.q}</p>
            <div className="mt-1 grid grid-cols-2 gap-1">
              {opts.map((o) => <span key={o} className={`rounded-lg py-1 text-center text-sm font-extrabold ring-2 ${f >= 6 && o === d.a ? 'bg-emerald-50 text-emerald-700 ring-emerald-500' : 'bg-white ring-[#e4e1f5]'}`}>{o}</span>)}
            </div>
          </div>
        )}
      </div>
    ),
    hand: f === 6 ? [72, 74, true] : f === 4 ? [50, 70, true] : REST,
    step: show ? 0 : note ? 1 : 2,
    phase: show ? 'Memorise the board' : note ? 'Announcement — remember the change' : f >= 6 ? `Correct — gate ${d.a}, not ${old}` : 'Answer from memory'
  };
}

// ---- Rule Switch (ColourMatch, master mode) -------------------------------------------------------------------------
const INK = {
  RED: { text: 'text-rose-500', key: 'bg-gradient-to-b from-rose-400 to-rose-500' },
  BLUE: { text: 'text-sky-500', key: 'bg-gradient-to-b from-sky-400 to-sky-500' },
  GREEN: { text: 'text-emerald-500', key: 'bg-gradient-to-b from-emerald-400 to-emerald-500' },
  YELLOW: { text: 'text-amber-400', key: 'bg-gradient-to-b from-amber-300 to-amber-400' }
};
const RS = [
  [['RED', 'BLUE', 'ink'], ['GREEN', 'RED', 'word'], ['YELLOW', 'GREEN', 'ink']],
  [['BLUE', 'YELLOW', 'word'], ['RED', 'GREEN', 'word'], ['GREEN', 'BLUE', 'ink']],
  [['YELLOW', 'RED', 'ink'], ['BLUE', 'GREEN', 'word'], ['RED', 'YELLOW', 'word']]
];
function ruleSwitch(f, ex) {
  const k = Math.min(2, Math.floor(f / 2));
  const [word, ink, rule] = RS[ex][k];
  const answer = rule === 'ink' ? ink : word;
  const keys = Object.keys(INK);
  const keyPos = (name) => { const i = keys.indexOf(name); return [32 + (i % 2) * 36, 67 + Math.floor(i / 2) * 19]; };
  const tapping = f % 2 === 1 && f < 6;
  const score = f >= 5 ? 3 : f >= 3 ? 2 : f >= 1 ? 1 : 0;
  const switched = k > 0 && RS[ex][k - 1][2] !== rule;
  return {
    body: (
      <div className="absolute inset-0 text-[#1b2456]">
        <span className="absolute top-[3%] right-[3%] text-xs font-extrabold tabular-nums text-slate-600">Score {score}</span>
        <p className={`absolute top-[12%] left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-black tracking-[0.12em] whitespace-nowrap uppercase ring-2 ring-inset ${rule === 'word' ? 'bg-amber-100 text-amber-800 ring-amber-400' : 'bg-teal-50 text-teal-700 ring-teal-300'}`}>
          {rule === 'word' ? 'Word — what it says' : 'Ink — what colour it is'}
        </p>
        <div className={`absolute flex items-center justify-center rounded-3xl bg-gradient-to-b from-[#f8f7fd] to-white ${rule === 'word' ? 'border-4 border-dashed border-amber-400' : 'ring-1 ring-[#ecebf6]'}`} style={box(10, 25, 80, 30)}>
          <span className={`text-4xl font-black tracking-[0.06em] ${INK[ink].text}`}>{word}</span>
        </div>
        <div className="absolute grid grid-cols-2 gap-2" style={box(14, 59, 72, 37)}>
          {keys.map((name) => <span key={name} className={`rounded-2xl ${INK[name].key} ${tapping && name === answer ? 'ring-4 ring-emerald-300' : ''}`} />)}
        </div>
      </div>
    ),
    hand: tapping ? [...keyPos(answer), true] : REST,
    step: f < 2 ? 0 : f < 4 ? 1 : 2,
    phase: f >= 6 ? '3 right in a row' : tapping ? `Tap ${answer.toLowerCase()}` : switched ? 'Rule switched!' : k === 0 ? `Rule: ${rule.toUpperCase()}` : 'Same rule'
  };
}

const SRV = [
  { cells: [[1, 0], [2, 0], [0, 1], [1, 1], [1, 2]], marks: [0, 4], k: 1, right: 2 },
  { cells: [[0, 0], [0, 1], [1, 1], [1, 2], [1, 3]], marks: [0, 3], k: 2, right: 0 },
  { cells: [[1, 0], [0, 1], [1, 1], [1, 2], [1, 3]], marks: [1, 4], k: 3, right: 3 }
];

// ---- Interference Recall --------------------------------------------------------------------------------------------
const IR = [
  { a: ['RIVER', 'FOREST'], b: ['STREAM', 'WOODS'], sum: ['7 + 6', 13, [12, 13, 14]], test: [['STREAM', 'B'], ['RIVER', 'A'], ['HILL', 'N'], ['WOODS', 'B'], ['LAKE', 'N'], ['FOREST', 'A']] },
  { a: ['DOCTOR', 'GARDEN'], b: ['PHYSICIAN', 'YARD'], sum: ['9 + 8', 17, [16, 17, 18]], test: [['GARDEN', 'A'], ['NURSE', 'N'], ['YARD', 'B'], ['PHYSICIAN', 'B'], ['DOCTOR', 'A'], ['LAWN', 'N']] },
  { a: ['BATTLE', 'QUIET'], b: ['COMBAT', 'SILENT'], sum: ['15 − 7', 8, [7, 8, 9]], test: [['SILENT', 'B'], ['WAR', 'N'], ['QUIET', 'A'], ['CALM', 'N'], ['COMBAT', 'B'], ['BATTLE', 'A']] }
];
const IR_STAGE = ['List A', 'List B', 'Sums', 'Recall'];
function interference(f, ex) {
  const d = IR[ex];
  const stage = f < 2 ? 0 : f < 4 ? 1 : f === 4 ? 2 : 3;
  const aSlots = d.test.map((t, i) => (t[1] === 'A' ? i : -1)).filter((i) => i >= 0);
  const tapped = f >= 5 ? aSlots.slice(0, Math.min(2, f - 4)) : [];
  const chipPos = (i) => [20.7 + (i % 3) * 29.3, 47 + Math.floor(i / 3) * 20];
  const review = f === 7;
  const chipTone = (t, i) => (review ? (t[1] === 'A' ? 'bg-amber-100 text-amber-800 ring-2 ring-emerald-500' : t[1] === 'B' ? 'bg-sky-100 text-sky-800 ring-1 ring-sky-300' : 'bg-slate-100 text-slate-600 ring-1 ring-slate-300')
    : tapped.includes(i) ? 'bg-indigo-600 text-white ring-1 ring-indigo-600' : 'bg-white ring-1 ring-slate-200');
  return {
    body: (
      <div className="absolute inset-0 text-[#1b2456]">
        <ol className="absolute inset-x-[3%] top-[14%] flex justify-center gap-1">
          {IR_STAGE.map((s, i) => <li key={s} className={`rounded-full px-2 py-0.5 text-xs font-black whitespace-nowrap ${i === stage ? 'bg-indigo-600 text-white' : i < stage ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}>{s}</li>)}
        </ol>
        {stage < 2 && (
          <>
            <div className="absolute flex items-center justify-center rounded-3xl bg-slate-900" style={box(10, 28, 80, 46)}>
              <span className={`text-3xl font-black tracking-[0.08em] ${stage === 0 ? 'text-amber-300' : 'text-sky-300'}`}>{(stage === 0 ? d.a : d.b)[f % 2]}</span>
            </div>
            <p className="absolute inset-x-0 top-[80%] text-center text-xs font-semibold text-slate-500">{stage === 0 ? 'Memorise list A' : 'Read list B — but A is what counts'}</p>
          </>
        )}
        {stage === 2 && (
          <>
            <p className="absolute inset-x-0 top-[32%] text-center text-4xl font-black tabular-nums">{d.sum[0]} = ?</p>
            <div className="absolute grid grid-cols-3 gap-2" style={box(14, 58, 72, 22)}>
              {d.sum[2].map((c) => <span key={c} className={`flex items-center justify-center rounded-2xl text-xl font-black ring-1 ${c === d.sum[1] ? 'bg-emerald-100 text-emerald-700 ring-emerald-400' : 'bg-white ring-slate-200'}`}>{c}</span>)}
            </div>
          </>
        )}
        {stage === 3 && (
          <>
            <div className="absolute grid grid-cols-3 gap-2" style={box(6, 37, 88, 40)}>
              {d.test.map((t, i) => <span key={t[0]} className={`flex min-w-0 items-center justify-center truncate rounded-xl px-1 text-xs font-black tracking-wide ${chipTone(t, i)}`}>{t[0]}</span>)}
            </div>
            <p className="absolute inset-x-0 top-[84%] text-center text-xs font-bold text-slate-600">{review ? 'Gold: list A · Blue: list B lure — 2 hits, 0 false' : 'Tap only the list A words'}</p>
          </>
        )}
      </div>
    ),
    hand: f === 4 ? [14 + (d.sum[2].indexOf(d.sum[1]) + 0.5) * 24, 69, true] : f === 5 || f === 6 ? [...chipPos(aSlots[f - 5]), true] : REST,
    step: f < 2 ? 0 : f < 5 ? 1 : 2,
    phase: ['Memorise list A', 'Memorise list A', 'List B: lures', 'List B: lures', 'Clear your head', 'Recall list A', 'Recall list A', 'Score 2 of 2'][f]
  };
}

// ---- Tower Shift (master: next-door towers only) --------------------------------------------------------------------
const TS_MOVES = [[0, 1], [1, 2], [0, 1], [2, 1], [1, 0], [1, 2], [0, 1], [1, 2]];
// ---- Cipher Lab (substitution) --------------------------------------------------------------------------------------
const CL = [
  { plain: 'THE TEETH', key: { T: 'Q', H: 'W', E: 'K' } },
  { plain: 'A BANANA', key: { A: 'R', B: 'F', N: 'M' } },
  { plain: 'NINE INN', key: { N: 'J', I: 'Y', E: 'P' } }
];
const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// ---- Algorithm Builder ----------------------------------------------------------------------------------------------
const LINE = { act: 'bg-sky-50 text-sky-900 ring-sky-200', loop: 'bg-amber-50 text-amber-900 ring-amber-300', end: 'bg-slate-50 text-slate-500 ring-slate-200' };
const AB = [
  {
    goal: 'Reach the gem', palette: ['Move forward', 'Turn left', 'Repeat n times'], taps: [2, 'plus', 0],
    progs: [[], [['Repeat 2 times', 0, 'loop'], ['end', 0, 'end']], [['Repeat 5 times', 0, 'loop'], ['end', 0, 'end']], [['Repeat 5 times', 0, 'loop'], ['Move forward', 1, 'act'], ['end', 0, 'end']]],
    states: [0, 2, 5]
  },
  {
    goal: 'Make A equal 32', palette: ['A = A + 1', 'A = A × 2', 'Repeat n times'], taps: [2, 'plus', 1],
    progs: [[], [['Repeat 2 times', 0, 'loop'], ['end', 0, 'end']], [['Repeat 5 times', 0, 'loop'], ['end', 0, 'end']], [['Repeat 5 times', 0, 'loop'], ['A = A × 2', 1, 'act'], ['end', 0, 'end']]],
    states: [1, 4, 32]
  },
  {
    goal: 'Sort the cards', palette: ['Swap 1 ↔ 2', 'Swap 2 ↔ 3', 'Repeat n times'], taps: [0, 1, 0],
    progs: [[], [['Swap 1 ↔ 2', 0, 'act']], [['Swap 1 ↔ 2', 0, 'act'], ['Swap 2 ↔ 3', 0, 'act']], [['Swap 1 ↔ 2', 0, 'act'], ['Swap 2 ↔ 3', 0, 'act'], ['Swap 1 ↔ 2', 0, 'act']]],
    states: [[3, 2, 1], [2, 1, 3], [1, 2, 3]]
  }
];

// ---- Deduction Chamber ----------------------------------------------------------------------------------------------
const DD = [
  { premises: ['All cats are mammals.', 'All mammals are animals.'], conclusion: 'All cats are animals.', answer: 'Follows', why: 'The chain links up: cats → mammals → animals.' },
  { premises: ['All roses are flowers.', 'Some flowers fade quickly.'], conclusion: 'Some roses fade quickly.', answer: 'Does not follow', why: 'The flowers that fade need not be the roses.' },
  { premises: ['No fish are birds.', 'All sparrows are birds.'], conclusion: 'No sparrows are fish.', answer: 'Follows', why: 'Sparrows sit inside birds, and birds are kept apart from fish.' }
];

// ---- Boolean Breaker ------------------------------------------------------------------------------------------------
const GATE_PATH = { AND: 'M0 0 H21 A15 15 0 0 1 21 30 H0 Z', OR: 'M0 0 Q10 15 0 30 Q26 30 39 15 Q26 0 0 0 Z', XOR: 'M5 0 Q15 15 5 30 Q29 30 42 15 Q29 0 5 0 Z', NOT: 'M2 2 L32 15 L2 28 Z' };
const BB = [
  { inputs: [[24, 40], [24, 90]], gates: [{ op: 'AND', a: 0, b: 1, x: 120, y: 65 }], start: [0, 0], toggles: [0, 1] },
  { inputs: [[24, 22], [24, 62], [24, 108]], gates: [{ op: 'OR', a: 0, b: 1, x: 95, y: 42 }, { op: 'NOT', a: 2, x: 95, y: 108 }, { op: 'AND', a: 3, b: 4, x: 185, y: 72 }], start: [0, 0, 1], toggles: [0, 2] },
  { inputs: [[24, 28], [24, 72], [24, 110]], gates: [{ op: 'XOR', a: 0, b: 1, x: 95, y: 50 }, { op: 'AND', a: 3, b: 2, x: 185, y: 78 }], start: [0, 0, 0], toggles: [0, 2] }
];
const NAMES = ['A', 'B', 'C'];

// ---- Network Logic --------------------------------------------------------------------------------------------------
const NL = [
  {
    kind: 'path', task: 'Cheapest route A → E', from: 'A', to: 'E', taps: ['B', 'D', 'E'], best: 7,
    nodes: { A: [45, 110], B: [145, 40], C: [150, 185], D: [255, 60], E: [345, 120] },
    edges: [['A', 'B', 2], ['A', 'C', 4], ['B', 'D', 3], ['B', 'C', 1], ['C', 'D', 5], ['D', 'E', 2], ['C', 'E', 6]]
  },
  {
    kind: 'path', task: 'Cheapest route A → E', from: 'A', to: 'E', taps: ['B', 'C', 'D', 'E'], best: 10,
    nodes: { A: [45, 60], B: [120, 180], C: [195, 50], D: [265, 175], E: [360, 80] },
    edges: [['A', 'B', 3], ['A', 'C', 6], ['B', 'C', 2], ['B', 'D', 7], ['C', 'D', 3], ['C', 'E', 8], ['D', 'E', 2]]
  },
  {
    kind: 'mst', task: 'Connect every hub, cheapest', taps: ['A-C', 'B-D', 'C-D'], best: 9,
    nodes: { A: [70, 45], B: [320, 45], C: [90, 180], D: [280, 175] },
    edges: [['A', 'B', 7], ['A', 'C', 2], ['A', 'D', 5], ['B', 'D', 3], ['C', 'D', 4], ['B', 'C', 9]]
  }
];
function networkLogic(f, ex) {
  const g = NL[ex];
  const k = Math.min(g.taps.length, f);
  const submitAt = g.taps.length + 1;
  const walk = g.kind === 'path' ? [g.from, ...g.taps.slice(0, k)] : [];
  const on = (e) => (g.kind === 'path'
    ? walk.some((v, i) => i > 0 && ((walk[i - 1] === e[0] && v === e[1]) || (walk[i - 1] === e[1] && v === e[0])))
    : g.taps.slice(0, k).includes(`${e[0]}-${e[1]}`));
  const cost = g.edges.filter(on).reduce((s, e) => s + e[2], 0);
  const done = f > submitAt;
  const mid = (id) => { const e = g.edges.find((x) => `${x[0]}-${x[1]}` === id); const [a, b] = [g.nodes[e[0]], g.nodes[e[1]]]; return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; };
  const tapAt = f >= 1 && f <= g.taps.length ? (g.kind === 'path' ? g.nodes[g.taps[f - 1]] : mid(g.taps[f - 1])) : null;
  return {
    body: (
      <div className="absolute inset-0 text-[#1b2456]">
        <p className="absolute inset-x-[3%] top-[12%] flex justify-between text-xs font-black">
          <span>{g.task}</span>
          <span className={done ? 'text-emerald-700' : ''}>{done ? `Optimal — ${cost}` : `${g.kind === 'path' ? 'Cost' : 'Weight'} ${cost}`}</span>
        </p>
        <svg viewBox="0 0 400 230" className="absolute" style={box(0, 23, 100, 76.7)} aria-hidden>
          {g.edges.map((e) => {
            const [a, b] = [g.nodes[e[0]], g.nodes[e[1]]];
            const [mx, my] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
            return (
              <g key={`${e[0]}${e[1]}`}>
                <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={on(e) ? '#4f46e5' : '#cbd5e1'} strokeWidth={on(e) ? 6 : 3} strokeLinecap="round" />
                <circle cx={mx} cy={my} r="13" fill="white" stroke={on(e) ? '#4f46e5' : '#e2e8f0'} />
                <text x={mx} y={my + 5.5} textAnchor="middle" fontSize="16" fontWeight="800" fill="#1e293b">{e[2]}</text>
              </g>
            );
          })}
          {Object.entries(g.nodes).map(([id, [x, y]]) => {
            const fill = id === g.from ? '#4f46e5' : id === g.to ? '#0f766e' : walk.includes(id) ? '#e0e7ff' : '#ffffff';
            return (
              <g key={id}>
                <circle cx={x} cy={y} r="18" fill={fill} stroke="#334155" strokeWidth="1.5" />
                <text x={x} y={y + 6} textAnchor="middle" fontSize="17" fontWeight="800" fill={id === g.from || id === g.to ? '#ffffff' : '#1e293b'}>{id}</text>
              </g>
            );
          })}
        </svg>
        <span className={`absolute flex items-center justify-center rounded-xl text-xs font-black text-white ${done ? 'bg-emerald-600' : 'bg-slate-900'}`} style={box(76, 86, 21, 11)}>{done ? 'Solved' : 'Submit'}</span>
      </div>
    ),
    hand: tapAt ? [tapAt[0] / 4, 23 + tapAt[1] / 3, true] : f === submitAt ? [86, 91, true] : [94, 60, false],
    step: f < 1 ? 0 : f < submitAt ? 1 : 2,
    phase: f === 0 ? 'Read the task' : f < submitAt ? (g.kind === 'path' ? 'Tap hubs in order' : 'Tap the links') : f === submitAt ? 'Submit' : 'Optimal!'
  };
}

// ---- Strategic Constraint Lab ---------------------------------------------------------------------------------------
const DAYS = ['Mon', 'Tue', 'Wed'];
const SC = [
  { tasks: ['Audit', 'Budget', 'Coding'], order: [[0, 0], [2, 1], [1, 2]], rules: [['Audit earlier than Coding', 4], ['Budget not on Mon', 6]] },
  { tasks: ['Design', 'Editing', 'Forecast'], order: [[2, 2], [0, 0], [1, 1]], rules: [['Forecast on Wed', 2], ['Design earlier than Editing', 6]] },
  { tasks: ['Graphics', 'Hiring', 'Budget'], order: [[1, 0], [2, 2], [0, 1]], rules: [['Hiring, Budget on different days', 4], ['Graphics not on Wed', 6]] }
];

export const DEMOS = {
  'grid-recall': { frames: 10, draw: gridRecall },
  'reverse-recall': { frames: 8, draw: reverseRecall },
  'departure-board': { frames: 8, draw: departureBoard },
  'rule-switch': { frames: 8, draw: ruleSwitch },
  'interference-recall': { frames: 8, draw: interference },
  'network-logic': { frames: 7, draw: networkLogic },
};
