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

// ---- Matrix Recall ---------------------------------------------------------------------------------------------------
const MR = [
  { m: [4, 7, 2, 9, 1, 5, 3, 8, 6], cell: 5, row: 0 },
  { m: [8, 3, 6, 2, 9, 4, 7, 5, 1], cell: 1, row: 2 },
  { m: [5, 2, 9, 6, 4, 8, 1, 7, 3], cell: 6, row: 1 }
];
const PAD12 = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'OK'];
function matrixRecall(f, ex) {
  const { m, cell, row } = MR[ex];
  const sum = m[row * 3] + m[row * 3 + 1] + m[row * 3 + 2];
  const sq = square(3, 24, 70, 6);
  const q = f < 2 ? null : f < 5 ? 'cell' : 'row';
  const inRow = (i) => Math.floor(i / 3) === row;
  const reveal = (i) => f < 2 || (f >= 4 && i === cell) || (f === 7 && inRow(i));
  const asked = (i) => (q === 'cell' && i === cell) || (q === 'row' && inRow(i));
  const typed = f === 3 || f === 4 ? String(m[cell]) : f >= 6 ? String(sum) : '';
  const keyPos = (k) => [62 + ((PAD12.indexOf(k) % 3) + 0.5) * 11.3, 50 + (Math.floor(PAD12.indexOf(k) / 3) + 0.5) * 11.5];
  return {
    body: (
      <div className="absolute inset-0 text-[#1b2456]">
        <p className="absolute inset-x-0 top-[12%] text-center text-xs font-extrabold">
          {f < 2 ? 'Memorise the matrix' : q === 'cell' ? 'Which digit was in the gold cell?' : `What did row ${row + 1} add up to?`}
        </p>
        {f < 2 && <div className="absolute h-1.5 rounded-full bg-violet-500" style={box(6, 20, f === 0 ? 52 : 26, 2)} />}
        <div className="absolute grid gap-1" style={boardStyle(3, sq)}>
          {m.map((v, i) => (
            <span key={i} className={`flex items-center justify-center rounded-lg text-xl font-extrabold tabular-nums ${asked(i) ? 'bg-amber-50 text-amber-800 ring-2 ring-amber-300' : f < 2 ? 'bg-white ring-1 ring-[#e4e1f5]' : 'bg-slate-100 text-slate-500'}`}>
              {reveal(i) ? v : ''}
            </span>
          ))}
        </div>
        {f >= 2 && (
          <>
            <span className={`absolute flex items-center justify-center rounded-xl bg-white text-2xl font-extrabold tabular-nums ring-1 ${f === 4 || f === 7 ? 'text-emerald-600 ring-emerald-400' : 'ring-[#e4e1f5]'}`} style={box(64, 26, 30, 18)}>{typed || '…'}</span>
            <div className="absolute grid grid-cols-3 gap-1" style={box(62, 50, 34, 46)}>
              {PAD12.map((k) => <span key={k} className="flex items-center justify-center rounded-md bg-white text-xs font-black ring-1 ring-slate-200">{k}</span>)}
            </div>
          </>
        )}
      </div>
    ),
    hand: f === 3 ? [...keyPos(String(m[cell])), true] : f === 6 ? [...keyPos(String(sum % 10)), true] : f === 4 || f === 7 ? [...keyPos('OK'), true] : REST,
    step: f < 2 ? 0 : f < 7 ? 1 : 2,
    phase: f < 2 ? 'Memorise' : f === 2 || f === 3 ? 'Recall a cell' : f === 4 ? 'Correct' : f < 7 ? 'Recall a total' : 'Correct · 2 of 2'
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

// ---- Spatial Rotation Vault -----------------------------------------------------------------------------------------
const norm = (cs) => {
  const mx = Math.min(...cs.map((c) => c[0]));
  const my = Math.min(...cs.map((c) => c[1]));
  return cs.map(([x, y, m]) => [x - mx, y - my, m]);
};
const turn = (cs, k = 1) => (k === 0 ? cs : turn(norm(cs.map(([x, y, m]) => [-y, x, m])), k - 1));
const flip = (cs) => norm(cs.map(([x, y, m]) => [-x, y, m]));
const dims = (cs) => [Math.max(...cs.map((c) => c[0])) + 1, Math.max(...cs.map((c) => c[1])) + 1];
const SRV = [
  { cells: [[1, 0], [2, 0], [0, 1], [1, 1], [1, 2]], marks: [0, 4], k: 1, right: 2 },
  { cells: [[0, 0], [0, 1], [1, 1], [1, 2], [1, 3]], marks: [0, 3], k: 2, right: 0 },
  { cells: [[1, 0], [0, 1], [1, 1], [1, 2], [1, 3]], marks: [1, 4], k: 3, right: 3 }
];
/** A block figure as SVG; `tone(cell)` gives each block's fill class. */
function fig(cells, style, tone) {
  const [w, h] = dims(cells);
  return (
    <svg viewBox={`0 0 ${w * 10} ${h * 10}`} className="absolute" style={style} aria-hidden>
      {cells.map((c) => <rect key={`${c[0]},${c[1]}`} x={c[0] * 10 + 0.6} y={c[1] * 10 + 0.6} width="8.8" height="8.8" rx="1.6" className={tone(c)} />)}
    </svg>
  );
}
/** Where a block of the big centred figure sits, in % of the box (the figure fits 60% × 64% from 20%, 18%). */
const figPos = (cells, [x, y]) => {
  const [w, h] = dims(cells);
  const s = Math.min(0.6 / w, 0.48 / h);
  return [(0.2 + (0.6 - w * s) / 2 + (x + 0.5) * s) * 100, ((0.18 * 0.75 + (0.48 - h * s) / 2 + (y + 0.5) * s) / 0.75) * 100];
};
function rotationVault(f, ex) {
  const { cells, marks, k, right } = SRV[ex];
  const base = cells.map(([x, y], i) => [x, y, marks.includes(i) ? 1 : 0]);
  const turned = turn(base, k);
  const decoys = [flip(base), turn(flip(base), 1), turn(flip(base), 2)];
  const options = [...decoys.slice(0, right), turned, ...decoys.slice(right)];
  const goldCells = turned.filter((c) => c[2]);
  const tapped = f >= 5 ? goldCells.slice(0, f - 4) : [];
  const isTapped = (c) => tapped.some((t) => t[0] === c[0] && t[1] === c[1]);
  const big = box(20, 18, 60, 64);
  return {
    body: (
      <div className="absolute inset-0 text-[#1b2456]">
        <p className="absolute inset-x-0 top-[10%] text-center text-xs font-black tracking-[0.14em] text-indigo-500 uppercase">
          {f < 2 ? `Memorise · ${5 - f}s` : f < 4 ? 'Same figure, turned?' : f < 7 ? `Tap the 2 marks (${tapped.length}/2)` : 'Every mark exact · +2'}
        </p>
        {f < 2 && fig(base, big, (c) => (c[2] ? 'fill-amber-400' : 'fill-slate-600'))}
        {(f === 2 || f === 3) && options.map((o, j) => (
          <div key={j} className={`absolute rounded-2xl ${f === 3 && j === right ? 'bg-emerald-50 ring-2 ring-emerald-500' : 'bg-slate-50 ring-1 ring-slate-200'}`} style={box(4 + j * 23.5, 26, 21.5, 52)}>
            {fig(o, box(12, 12, 76, 76), () => 'fill-slate-600')}
          </div>
        ))}
        {f >= 4 && fig(turned, big, (c) => (f === 7 && c[2] ? 'fill-amber-400' : isTapped(c) ? 'fill-violet-500' : 'fill-slate-600'))}
        {(f === 5 || f === 6) && <span className="absolute flex items-center justify-center rounded-xl bg-indigo-600 text-xs font-black text-white" style={box(34, 86, 32, 11)}>Lock in marks</span>}
      </div>
    ),
    hand: f === 3 ? [4 + right * 23.5 + 10.75, 54, true] : f === 5 || f === 6 ? [...figPos(turned, goldCells[f - 5]), true] : f === 7 ? [50, 91, true] : REST,
    step: f < 2 ? 0 : f < 4 ? 1 : 2,
    phase: f < 2 ? 'Memorise the marks' : f === 2 ? 'Find the turned one' : f === 3 ? 'Not the mirror' : f < 7 ? 'Place the marks' : 'Vault +2 points'
  };
}

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
const TS = [
  { start: [[2, 1], [], []], pre: 'lift' },
  { start: [[2, 1], [], [3]], pre: 'lift' },
  { start: [[2, 1], [], []], pre: 'far' }
];
const RING = ['bg-gradient-to-b from-rose-400 to-rose-600', 'bg-gradient-to-b from-amber-300 to-orange-500', 'bg-gradient-to-b from-sky-400 to-blue-600'];
const RING_W = [13, 19, 25];
const towerX = (i) => 4 + (i + 0.5) * (92 / 3);
function towerShift(f, ex) {
  const { start, pre } = TS[ex];
  const done = Math.max(0, Math.min(8, f - 1));
  const pegs = start.map((s) => [...s]);
  TS_MOVES.slice(0, done).forEach(([a, b]) => pegs[b].push(pegs[a].pop()));
  const lifted = f === 1 ? 0 : null;
  const move = f >= 2 && f <= 9 ? TS_MOVES[f - 2] : null;
  const total = start.flat().length;
  return {
    body: (
      <div className="absolute inset-0 text-[#1b2456]">
        <p className={`absolute inset-x-0 top-[11%] text-center text-xs font-black ${f === 1 && pre === 'far' ? 'text-rose-600' : 'text-slate-600'}`}>
          {f === 0 ? 'All rings to the right tower · next-door towers only' : f === 1 ? (pre === 'far' ? 'Next-door towers only: go through the middle' : 'Ring lifted — tap where to drop it') : f <= 9 ? `Move ${f - 1} of 8 · best possible 8` : `Solved in 8 moves — the best`}
        </p>
        <div className="absolute rounded-2xl bg-gradient-to-b from-sky-50 to-indigo-100 ring-1 ring-slate-200" style={box(3, 19, 94, 77)} />
        {f === 1 && pre === 'far' && <div className="absolute rounded-2xl bg-rose-200/60" style={box(4 + (92 / 3) * 2, 20, 92 / 3, 75)} />}
        <span className="absolute text-xs font-black tracking-widest text-indigo-500 uppercase" style={{ left: `${towerX(2) - 5}%`, top: '21%' }}>Goal</span>
        {[0, 1, 2].map((i) => <span key={i} className="absolute rounded-t-full bg-gradient-to-r from-amber-700 via-amber-500 to-amber-800" style={box(towerX(i) - 1, 34, 2, 52)} />)}
        <span className="absolute rounded-lg bg-gradient-to-b from-amber-600 to-amber-900" style={box(5, 86, 90, 6)} />
        {pegs.flatMap((stack, p) => stack.map((size, h) => {
          const up = lifted === p && h === stack.length - 1;
          return <span key={size} className={`absolute rounded-full shadow-md ring-1 ring-black/10 transition-all duration-500 ${RING[size - 1]}`} style={box(towerX(p) - RING_W[size - 1] / 2, up ? 24 : 86 - (h + 1) * 11 + 1, RING_W[size - 1], 9.5)} />;
        }))}
      </div>
    ),
    hand: f === 1 ? [towerX(pre === 'far' ? 2 : 0), 58, true] : move ? [towerX(move[1]), 58, true] : REST,
    step: f < 2 ? 0 : f < 9 ? 1 : 2,
    phase: f === 0 ? `${total} rings, one tower` : f === 1 ? (pre === 'far' ? 'Too far!' : 'Lift the top ring') : f <= 9 ? `Move ${f - 1} of 8` : 'All on the goal'
  };
}

// ---- Cipher Lab (substitution) --------------------------------------------------------------------------------------
const CL = [
  { plain: 'THE TEETH', key: { T: 'Q', H: 'W', E: 'K' } },
  { plain: 'A BANANA', key: { A: 'R', B: 'F', N: 'M' } },
  { plain: 'NINE INN', key: { N: 'J', I: 'Y', E: 'P' } }
];
const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
function cipherLab(f, ex) {
  const { plain, key } = CL[ex];
  const cipher = [...plain].map((ch) => key[ch] || ch).join('');
  const counts = Object.values(key).map((c) => [c, [...cipher].filter((x) => x === c).length]).sort((a, b) => b[1] - a[1]);
  const plainOf = Object.fromEntries(Object.entries(key).map(([p, c]) => [c, p]));
  const done = counts.slice(0, Math.min(3, Math.floor(f / 2))).map((r) => r[0]);
  const sel = f >= 1 && f <= 6 ? counts[Math.floor((f - 1) / 2)][0] : null;
  const max = counts[0][1];
  const keyPos = (p) => { const i = ABC.indexOf(p); return [3 + ((i % 13) + 0.5) * (94 / 13), 74 + Math.floor(i / 13) * 11.5 + 5.5]; };
  return {
    body: (
      <div className="absolute inset-0 text-[#1b2456]">
        <div className="absolute flex flex-wrap items-center justify-center gap-x-4 rounded-2xl bg-slate-900 px-2" style={box(4, 13, 92, 27)}>
          {cipher.split(' ').map((w, wi) => (
            <span key={wi} className="flex gap-0.5">
              {[...w].map((c, j) => (
                <span key={j} className={`flex w-5 flex-col items-center rounded font-mono ${c === sel ? 'bg-emerald-500/30 ring-1 ring-emerald-400' : ''}`}>
                  <span className="text-xs text-slate-400">{c}</span>
                  <span className={`text-base font-black ${done.includes(c) ? 'text-emerald-300' : 'text-slate-600'}`}>{done.includes(c) ? plainOf[c] : '_'}</span>
                </span>
              ))}
            </span>
          ))}
        </div>
        {counts.map(([c, n], j) => (
          <div key={c} className="absolute flex flex-col items-center justify-end" style={box(6 + j * 12, 43, 9, 27)}>
            <span className={`w-full rounded-t ${c === sel ? 'bg-emerald-500' : 'bg-slate-300'}`} style={{ height: `${(n / max) * 60}%` }} />
            <span className={`font-mono text-xs font-black ${c === sel ? 'text-emerald-700' : 'text-slate-600'}`}>{c}</span>
          </div>
        ))}
        <p className="absolute text-xs leading-snug font-bold" style={box(44, 46, 53, 22)}>
          {f === 7 ? 'Broken · +3 points' : sel ? <>Cipher <span className="font-mono text-emerald-700">{sel}</span> → {done.includes(sel) ? <span className="font-mono">{plainOf[sel]}</span> : 'pick a letter'}</> : 'Most common cipher letter: likely E or A'}
        </p>
        <div className="absolute grid grid-cols-[repeat(13,minmax(0,1fr))] gap-0.5" style={box(3, 74, 94, 23)}>
          {[...ABC].map((p) => <span key={p} className={`flex items-center justify-center rounded font-mono text-xs font-black ring-1 ${Object.keys(key).includes(p) && done.some((c) => plainOf[c] === p) ? 'bg-slate-100 text-slate-400 ring-slate-200' : 'bg-white ring-slate-300'}`}>{p}</span>)}
        </div>
        {f === 7 && <div className="absolute flex items-center justify-center rounded-2xl bg-emerald-50 font-serif text-xl text-[#1b2456] ring-1 ring-emerald-200" style={box(10, 42, 80, 28)}>“{plain.charAt(0) + plain.slice(1).toLowerCase()}”</div>}
      </div>
    ),
    hand: f >= 1 && f <= 6 ? (f % 2 === 1 ? [10.5 + Math.floor((f - 1) / 2) * 12, 66, true] : [...keyPos(plainOf[sel]), true]) : REST,
    step: f < 1 ? 0 : f < 7 ? 1 : 2,
    phase: f === 0 ? 'Count the letters' : f === 7 ? 'Message decoded' : f % 2 === 1 ? 'Pick a cipher letter' : 'Give its plain letter'
  };
}

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
function machine(ex, s) {
  if (ex === 0) {
    return (
      <div className="absolute grid grid-cols-6 gap-px overflow-hidden rounded-xl bg-slate-300 ring-1 ring-slate-300" style={box(14, 18, 72, 19)}>
        {range(6).map((x) => (
          <div key={x} className="relative bg-white">
            {x === 5 && <svg viewBox="0 0 20 20" className={`absolute inset-[18%] ${s === 5 ? 'opacity-20' : ''}`} aria-hidden><path d="M10 1 L18 8 L10 19 L2 8 Z" className="fill-emerald-500" /><path d="M10 1 L14 8 L10 19 L6 8 Z" className="fill-emerald-300" /></svg>}
            {x === s && <svg viewBox="0 0 20 20" className="absolute inset-[10%] rotate-90" aria-hidden><rect x="4" y="5" width="12" height="12" rx="3" className="fill-indigo-600" /><path d="M10 1 L15 7 H5 Z" className="fill-amber-400" /><circle cx="10" cy="11" r="2" className="fill-white" /></svg>}
          </div>
        ))}
      </div>
    );
  }
  if (ex === 1) {
    return (
      <div className="absolute flex items-center justify-center gap-3" style={box(10, 15, 80, 24)}>
        <span className="flex min-w-16 flex-col items-center rounded-xl bg-indigo-50 px-3 py-1 ring-2 ring-indigo-400"><span className="text-xs font-black text-slate-500">A</span><span className="text-2xl font-black tabular-nums">{s}</span></span>
        <span className="text-xs font-bold text-slate-500">goal: A = 32</span>
      </div>
    );
  }
  return (
    <div className="absolute flex items-center justify-center gap-2" style={box(10, 15, 80, 25)}>
      {s.map((v, i) => <span key={i} className="flex h-full w-[16%] items-center justify-center rounded-lg bg-white text-2xl font-black text-slate-900 shadow-sm ring-2 ring-slate-300">{v}</span>)}
    </div>
  );
}
function algorithmBuilder(f, ex) {
  const d = AB[ex];
  const prog = d.progs[Math.min(3, f)];
  const s = d.states[f < 5 ? 0 : f === 5 ? 1 : 2];
  const tap = f >= 1 && f <= 3 ? d.taps[f - 1] : null;
  return {
    body: (
      <div className="absolute inset-0 text-[#1b2456]">
        <span className="absolute top-[3%] right-[3%] text-xs font-extrabold text-slate-600">Goal: {d.goal}</span>
        {machine(ex, s)}
        <div className="absolute grid grid-cols-3 gap-1.5" style={box(3, 41, 94, 11)}>
          {d.palette.map((p, i) => <span key={p} className={`flex items-center justify-center truncate rounded-xl px-1 text-xs font-black ring-1 ${i === 2 ? LINE.loop : LINE.act} ${tap === i ? 'ring-2 ring-indigo-500' : ''}`}>+ {p}</span>)}
        </div>
        <ol className="absolute space-y-1 rounded-xl bg-slate-50 p-1 ring-1 ring-slate-200" style={box(3, 55, 66, 42)}>
          {prog.length === 0 && <li className="p-2 text-center text-xs font-bold text-slate-400">Tap blocks to build the program</li>}
          {prog.map(([label, depth, kind], i) => (
            <li key={i} className={`flex h-[28%] items-center justify-between rounded-lg px-2 text-xs font-black ring-1 ${LINE[kind]} ${f === 5 && i === 1 ? 'outline-2 outline-indigo-600' : ''}`} style={{ marginLeft: depth ? '12%' : 0 }}>
              {label}{kind === 'loop' && f < 4 && <span className="text-slate-500">− +</span>}
            </li>
          ))}
        </ol>
        <span className={`absolute flex items-center justify-center rounded-xl text-sm font-black text-white ${f >= 6 ? 'bg-emerald-600' : 'bg-indigo-700'}`} style={box(72, 58, 25, 36)}>{f >= 6 ? '★★★' : 'Run'}</span>
      </div>
    ),
    hand: tap === 'plus' ? [65, 61, true] : tap !== null ? [3 + (tap + 0.5) * (94 / 3), 47, true] : f === 4 ? [84, 76, true] : REST,
    step: f < 1 ? 0 : f < 4 ? 1 : 2,
    phase: f === 0 ? 'See the goal' : f < 4 ? 'Build the program' : f === 4 ? 'Run it' : f === 5 ? 'Running…' : f === 6 ? 'It works!' : 'Optimal: 3 blocks'
  };
}

// ---- Deduction Chamber ----------------------------------------------------------------------------------------------
const DD = [
  { premises: ['All cats are mammals.', 'All mammals are animals.'], conclusion: 'All cats are animals.', answer: 'Follows', why: 'The chain links up: cats → mammals → animals.' },
  { premises: ['All roses are flowers.', 'Some flowers fade quickly.'], conclusion: 'Some roses fade quickly.', answer: 'Does not follow', why: 'The flowers that fade need not be the roses.' },
  { premises: ['No fish are birds.', 'All sparrows are birds.'], conclusion: 'No sparrows are fish.', answer: 'Follows', why: 'Sparrows sit inside birds, and birds are kept apart from fish.' }
];
function deduction(f, ex) {
  const q = DD[ex];
  const x = q.answer === 'Follows' ? 27 : 73;
  return {
    body: (
      <div className="absolute inset-0 text-[#1b2456]">
        <ul className="absolute space-y-1" style={box(5, 12, 90, 30)}>
          {q.premises.map((p) => <li key={p} className="rounded-xl bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">{p}</li>)}
        </ul>
        <p className={`absolute rounded-xl bg-blue-50 px-3 py-1.5 text-sm font-black text-blue-900 transition-opacity duration-500 ${f >= 1 ? 'opacity-100' : 'opacity-0'}`} style={{ left: '5%', top: '45%', width: '90%' }}>Therefore: {q.conclusion}</p>
        {['Follows', 'Does not follow'].map((o, i) => (
          <span key={o} className={`absolute flex items-center justify-center rounded-xl text-sm font-black ring-1 ${f >= 3 && o === q.answer ? 'bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500' : 'bg-white ring-slate-200'}`} style={box(5 + i * 46, 65, 44, 15)}>{o}</span>
        ))}
        {f >= 3 && <p className="absolute text-center text-xs font-bold text-emerald-700" style={box(5, 83, 90, 15)}>Correct — {q.why}</p>}
      </div>
    ),
    hand: f === 2 ? [x, 73, false] : f === 3 ? [x, 73, true] : REST,
    step: f < 1 ? 0 : f < 3 ? 1 : 2,
    phase: ['Read the facts', 'Read the claim', 'Does it follow?', 'Correct!', 'Validity, not truth', 'Validity, not truth'][f]
  };
}

// ---- Boolean Breaker ------------------------------------------------------------------------------------------------
const GATE_PATH = { AND: 'M0 0 H21 A15 15 0 0 1 21 30 H0 Z', OR: 'M0 0 Q10 15 0 30 Q26 30 39 15 Q26 0 0 0 Z', XOR: 'M5 0 Q15 15 5 30 Q29 30 42 15 Q29 0 5 0 Z', NOT: 'M2 2 L32 15 L2 28 Z' };
const BB = [
  { inputs: [[24, 40], [24, 90]], gates: [{ op: 'AND', a: 0, b: 1, x: 120, y: 65 }], start: [0, 0], toggles: [0, 1] },
  { inputs: [[24, 22], [24, 62], [24, 108]], gates: [{ op: 'OR', a: 0, b: 1, x: 95, y: 42 }, { op: 'NOT', a: 2, x: 95, y: 108 }, { op: 'AND', a: 3, b: 4, x: 185, y: 72 }], start: [0, 0, 1], toggles: [0, 2] },
  { inputs: [[24, 28], [24, 72], [24, 110]], gates: [{ op: 'XOR', a: 0, b: 1, x: 95, y: 50 }, { op: 'AND', a: 3, b: 2, x: 185, y: 78 }], start: [0, 0, 0], toggles: [0, 2] }
];
const NAMES = ['A', 'B', 'C'];
const evalCircuit = (c, bits) => {
  const v = [...bits];
  c.gates.forEach((g) => { v.push(g.op === 'NOT' ? 1 - v[g.a] : g.op === 'AND' ? v[g.a] & v[g.b] : g.op === 'OR' ? v[g.a] | v[g.b] : v[g.a] ^ v[g.b]); });
  return v;
};
function booleanBreaker(f, ex) {
  const c = BB[ex];
  const n = c.inputs.length;
  const bits = [...c.start];
  if (f >= 1) bits[c.toggles[0]] ^= 1;
  if (f >= 3) bits[c.toggles[1]] ^= 1;
  const tested = f === 2 || f >= 4 ? evalCircuit(c, bits) : null;
  const out = c.inputs.length + c.gates.length - 1;
  const lampOn = tested ? tested[out] === 1 : false;
  const outPt = (node) => (node < n ? [c.inputs[node][0] + 11, c.inputs[node][1]] : [c.gates[node - n].x + (c.gates[node - n].op === 'NOT' ? 36 : 42), c.gates[node - n].y]);
  const stroke = (node) => (tested ? (tested[node] ? '#f59e0b' : '#475569') : '#94a3b8');
  const wire = (from, [tx, ty], key) => { const [ax, ay] = outPt(from); const mx = (ax + tx) / 2; return <path key={key} d={`M${ax} ${ay} C${mx} ${ay} ${mx} ${ty} ${tx} ${ty}`} fill="none" stroke={stroke(from)} strokeWidth={tested && tested[from] ? 3.5 : 2.5} />; };
  const lamp = [268, c.gates[c.gates.length - 1].y];
  const start = 50 - (n * 22 + (n - 1) * 2) / 2;
  const swX = (k) => start + k * 24 + 11;
  const tk = f === 1 ? c.toggles[0] : f === 3 ? c.toggles[1] : null;
  return {
    body: (
      <div className="absolute inset-0 text-[#1b2456]">
        <svg viewBox="0 0 300 126" className="absolute rounded-2xl bg-slate-50 ring-1 ring-slate-200" style={box(2, 12, 96, 54)} aria-hidden>
          {c.gates.map((g, i) => (g.op === 'NOT' ? wire(g.a, [g.x + 2, g.y], `w${i}`) : [wire(g.a, [g.x + 2, g.y - 8], `w${i}a`), wire(g.b, [g.x + 2, g.y + 8], `w${i}b`)]))}
          {wire(out, [lamp[0] - 14, lamp[1]], 'wl')}
          {c.inputs.map(([x, y], k) => (
            <g key={k}>
              <circle cx={x} cy={y} r="11" fill={bits[k] ? '#fbbf24' : '#1e293b'} />
              <text x={x} y={y + 4.5} textAnchor="middle" fontSize="13" fontWeight="800" fill={bits[k] ? '#0f172a' : '#e2e8f0'}>{NAMES[k]}</text>
            </g>
          ))}
          {c.gates.map((g, i) => {
            const lit = tested ? tested[n + i] === 1 : false;
            return (
              <g key={i} transform={`translate(${g.x} ${g.y - 15})`}>
                <path d={GATE_PATH[g.op]} fill={lit ? '#fef3c7' : '#ffffff'} stroke={lit ? '#d97706' : '#334155'} strokeWidth="2" strokeLinejoin="round" />
                {g.op === 'XOR' && <path d="M0 0 Q10 15 0 30" fill="none" stroke="#334155" strokeWidth="2" />}
                {g.op === 'NOT' && <circle cx="36" cy="15" r="4" fill="#fff" stroke="#334155" strokeWidth="2" />}
                <text x={g.op === 'NOT' ? 16 : 18} y={g.op === 'NOT' ? -3 : 19.5} textAnchor="middle" fontSize="12" fontWeight="800" fill="#334155">{g.op}</text>
              </g>
            );
          })}
          <circle cx={lamp[0]} cy={lamp[1]} r="14" fill={lampOn ? '#fde047' : '#334155'} stroke={lampOn ? '#ca8a04' : '#1e293b'} strokeWidth="2.5" />
          {lampOn && <circle cx={lamp[0]} cy={lamp[1]} r="21" fill="none" stroke="#fde047" strokeWidth="3" opacity="0.6" />}
        </svg>
        {c.inputs.map((_, k) => (
          <span key={k} className={`absolute flex items-center justify-center rounded-xl font-mono text-sm font-black ${bits[k] ? 'bg-amber-400 text-slate-900' : 'bg-slate-800 text-slate-300'}`} style={box(swX(k) - 11, 69, 22, 13)}>{NAMES[k]} = {bits[k]}</span>
        ))}
        <span className={`absolute flex items-center justify-center rounded-xl text-xs font-black ${lampOn ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-slate-900'}`} style={box(22, 85, 56, 12)}>
          {lampOn ? 'Lamp lit · solved' : f === 2 || f === 3 ? 'Lamp stayed dark · 1 test left' : 'Power on · 2 tests left'}
        </span>
      </div>
    ),
    hand: tk !== null ? [swX(tk), 76, true] : f === 2 || f === 4 ? [50, 91, true] : REST,
    step: f < 1 ? 0 : f < 5 ? 1 : 2,
    phase: f === 0 ? 'Read the circuit' : tk !== null ? `Set ${NAMES[tk]} = ${bits[tk]}` : f === 2 ? 'Still dark — think' : f === 4 ? 'Lamp on!' : 'Solved in 2 tests'
  };
}

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
function constraintLab(f, ex) {
  const d = SC[ex];
  const placed = d.order.slice(0, Math.min(3, Math.floor(f / 2)));
  const dayOf = (t) => { const p = placed.find((o) => o[0] === t); return p ? p[1] : null; };
  const sel = f >= 1 && f <= 6 ? d.order[Math.floor((f - 1) / 2)][0] : null;
  const chip = (t) => `flex items-center justify-center truncate rounded-xl px-1 text-xs font-bold ring-2 ${sel === t ? 'bg-violet-600 text-white ring-violet-600' : 'bg-white ring-slate-300'}`;
  const dayX = (s) => 3 + s * 20.5 + 9.5;
  const checks = [...d.rules, ['All 3 tasks placed', 6]];
  return {
    body: (
      <div className="absolute inset-0 text-[#1b2456]">
        <div className="absolute rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50" style={box(3, 13, 94, 15)}>
          {f === 7 && <span className="absolute inset-y-[12%] right-[2%] flex w-[34%] items-center justify-center rounded-xl bg-emerald-600 text-xs font-black text-white">Solved</span>}
          {f === 6 && <span className="absolute inset-y-[12%] right-[2%] flex w-[34%] items-center justify-center rounded-xl bg-slate-900 text-xs font-black text-white">Check schedule</span>}
        </div>
        {d.tasks.map((t, i) => (dayOf(i) === null ? <span key={t} className={`absolute ${chip(i)}`} style={box(5 + i * 20, 15, 18.5, 11)}>{t}</span> : null))}
        {DAYS.map((day, s) => (
          <div key={day} className="absolute flex flex-col items-center gap-1 rounded-2xl bg-white p-1 ring-2 ring-slate-200" style={box(3 + s * 20.5, 31, 19.5, 66)}>
            <span className="text-xs font-black">{day}</span>
            {d.tasks.map((t, i) => (dayOf(i) === s ? <span key={t} className={`h-[16%] w-full ${chip(i)}`}>{t}</span> : null))}
          </div>
        ))}
        <ul className="absolute space-y-1.5 rounded-2xl bg-slate-50 p-2 ring-1 ring-slate-200" style={box(66, 31, 31, 66)}>
          {checks.map(([text, at]) => (
            <li key={text} className="flex items-start gap-1 text-xs leading-tight">
              <span className={`mt-px flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${f >= at ? 'bg-emerald-500 text-white' : 'bg-white ring-1 ring-slate-300'}`}>{f >= at ? '✓' : ''}</span>
              <span className={f >= at ? 'text-emerald-800' : 'text-slate-700'}>{text}</span>
            </li>
          ))}
        </ul>
      </div>
    ),
    hand: sel === null ? (f === 7 ? [80, 20, true] : REST) : f % 2 === 1 ? [5 + sel * 20 + 9.25, 20, true] : [dayX(d.order[f / 2 - 1][1]), 50, true],
    step: f < 1 ? 0 : f < 6 ? 1 : 2,
    phase: f === 0 ? 'Read the rules' : f === 7 ? 'Schedule solved' : f % 2 === 1 ? 'Pick a task' : 'Place it on a day'
  };
}

export const DEMOS = {
  'grid-recall': { frames: 10, draw: gridRecall },
  'reverse-recall': { frames: 8, draw: reverseRecall },
  'matrix-recall': { frames: 8, draw: matrixRecall },
  'departure-board': { frames: 8, draw: departureBoard },
  'rule-switch': { frames: 8, draw: ruleSwitch },
  'spatial-rotation-vault': { frames: 8, draw: rotationVault },
  'interference-recall': { frames: 8, draw: interference },
  'tower-shift': { frames: 11, draw: towerShift },
  'cipher-lab': { frames: 8, draw: cipherLab },
  'algorithm-builder': { frames: 8, draw: algorithmBuilder },
  deduction: { frames: 6, draw: deduction },
  'boolean-breaker': { frames: 7, draw: booleanBreaker },
  'network-logic': { frames: 7, draw: networkLogic },
  'strategic-constraint-lab': { frames: 8, draw: constraintLab }
};
