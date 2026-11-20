import { useEffect, useMemo, useRef, useState } from 'react';
import GameShell from './GameShell';
import { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { GAP } from '../../data/bands/sequences';
import { makeQuadLevel, matchSolved, quadStep, readMatch, sticksMoved } from '../../data/bands/logicQuad';

/**
 * 🧠 Next in Sequence — four kinds of reasoning in every level (2026-11-19, the user's brief). Always in this order:
 * 1 Number Sequence (type the number) → 2 Visual Pattern Logic (pick the picture) → 3 Odd One Out (tap the one that
 * does not belong) → 4 Matchstick Challenge (drag real matchsticks). Each has its own way of answering, a hint and a
 * short explanation. data/bands/logicQuad.js builds the problems; this file draws and scores them.
 */
const STAGES = [
  { key: 'number', icon: '🔢', name: 'Number Sequence', short: 'Numbers' },
  { key: 'visual', icon: '🔷', name: 'Visual Pattern Logic', short: 'Patterns' },
  { key: 'odd', icon: '🔍', name: 'Odd One Out', short: 'Odd one' },
  { key: 'match', icon: '🔥', name: 'Matchstick Challenge', short: 'Matchsticks' }
];
const PASS = 3; // of 4
const store = {
  get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage off */ } }
};
const SEEN = 'yati:nis-seen';
const LAST = 'yati:nis-last';
const TOTAL = 'yati:nis-total';
const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function SequenceQuest({ progress, onExit }) {
  return <Level key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Level({ progress, onExit }) {
  const band = progress.ageBand === 'analytical' ? 'analytical' : 'intermediate';
  const step = quadStep(band, progress.difficulty, progress.levelNo);
  const [problems] = useState(() => makeQuadLevel(Math.random, { band, step, seen: new Set(store.get(SEEN, [])), last: store.get(LAST, {}) }));
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState([]); // { right, hinted, points }
  const [secs, setSecs] = useState(0);
  const [stageSecs, setStageSecs] = useState(0);
  const [total] = useState(() => store.get(TOTAL, 0));
  const saved = useRef(false);

  const over = results.length >= problems.length && idx >= problems.length;
  const answered = results.length > idx; // this problem is answered, its explanation is showing
  const correct = results.filter((r) => r.right).length;
  const score = results.reduce((n, r) => n + r.points, 0);
  const stars = over ? starsForFixed(correct, PASS, problems.length) : 0;
  useRecordStars(progress, over, stars, { correct, wrong: problems.length - correct, hints: results.filter((r) => r.hinted).length, score });

  useEffect(() => {
    if (!started || over) return undefined;
    const t = setInterval(() => { setSecs((s) => s + 1); setStageSecs((s) => s + 1); }, 1000);
    return () => clearInterval(t);
  }, [started, over]);

  useEffect(() => {
    if (!over || saved.current) return;
    saved.current = true;
    store.set(TOTAL, store.get(TOTAL, 0) + score);
    store.set(SEEN, [...store.get(SEEN, []), ...problems.map((p) => p.key)].slice(-120));
    store.set(LAST, { visual: problems[1].kind, odd: problems[2].kind, match: problems[3].type });
  }, [over, score, problems]);

  const finish = ({ right, hinted, lost = false }) => {
    if (answered) return;
    const cap = problems[idx].stage === 'match' ? 60 : 30;
    const points = right ? 100 - (hinted ? 40 : 0) + Math.max(0, cap - stageSecs) : 0;
    if (right) sfx.right?.(); else sfx.wrong?.();
    setResults((r) => [...r, { right, hinted, points, lost }]);
  };
  const next = () => { sfx.tap?.(); setIdx((i) => i + 1); setStageSecs(0); };

  const p = problems[Math.min(idx, problems.length - 1)];
  const res = results[idx];
  const objective = 'Four brain challenges in every level: a number sequence, a picture pattern, an odd one out and a matchstick puzzle. Each one is answered in its own way. Get 3 of the 4 right to clear the level — faster answers and fewer hints score more.';

  return (
    <GameShell
      title="Next in Sequence"
      blurb="Four kinds of reasoning in every level."
      tone="bg-gradient-to-br from-violet-600 to-purple-800"
      score={total + score}
      scoreLabel="Score"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) } : null}
      result={over ? {
        passed: correct >= PASS, stars,
        headline: correct >= PASS ? `Level ${progress.level} completed! 🎉` : 'Almost — 3 of 4 clears the level',
        detail: `${correct} of 4 correct · ${score} points · time ${clock(secs)}`,
        atEnd: progress.atEnd, onNext: progress.advance, onRetry: progress.retry
      } : null}
      footer={<p className="text-center text-sm text-ink-500">Problem {Math.min(idx + 1, 4)} of 4</p>}
    >
      {started && !over && (
        <div className="mx-auto flex w-full max-w-2xl select-none flex-col gap-3 max-sm:flex-1">
          {/* The four steps */}
          <ol className="flex items-start" aria-label="The four problems of this level">
            {STAGES.map((s, i) => {
              const r = results[i];
              const state = r ? (r.right ? 'right' : 'wrong') : i === idx ? 'now' : 'next';
              return (
                <li key={s.key} className="relative flex flex-1 flex-col items-center gap-1" aria-current={state === 'now' ? 'step' : undefined}>
                  {i > 0 && <span aria-hidden className={`absolute right-1/2 top-[1.125rem] h-1 w-full -translate-y-1/2 rounded-full ${results[i - 1] ? 'bg-violet-500' : 'bg-violet-100'}`} />}
                  <span className={`relative z-10 grid h-9 w-9 place-items-center rounded-full text-base font-black transition-all duration-300 sm:h-10 sm:w-10 ${
                    state === 'right' ? 'bg-emerald-500 text-white' : state === 'wrong' ? 'bg-rose-500 text-white' : state === 'now' ? 'scale-110 bg-violet-600 text-white shadow-[0_0_0_5px_rgba(139,92,246,0.25)]' : 'bg-white text-violet-300 ring-2 ring-violet-100'
                  }`}>{state === 'right' ? '✓' : state === 'wrong' ? '✕' : s.icon}</span>
                  <span className={`text-center text-[10px] font-black leading-tight sm:text-xs ${state === 'now' ? 'text-violet-700' : 'text-slate-400'}`}>{s.short}</span>
                </li>
              );
            })}
          </ol>

          {/* Tracking */}
          <div className="grid grid-cols-4 gap-1.5 text-center">
            {[['Problem', `${Math.min(idx + 1, 4)}/4`], ['Correct', `${correct}`], ['Points', `${score}`], ['Time', clock(secs)]].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-violet-50 px-1 py-1.5 ring-1 ring-violet-100">
                <p className="text-[9px] font-black uppercase tracking-wider text-violet-400">{k}</p>
                <p className="text-sm font-black tabular-nums text-violet-900">{v}</p>
              </div>
            ))}
          </div>

          {/* The problem */}
          <div key={idx} className="nq-in flex flex-col rounded-[1.5rem] bg-white p-3.5 shadow-[0_18px_40px_-24px_rgba(109,40,217,0.55)] ring-1 ring-violet-100 max-sm:flex-1 sm:p-5">
            <p className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-violet-500">
              <span className="grid h-6 w-6 place-items-center rounded-lg bg-violet-600 text-[11px] text-white">{idx + 1}</span>{STAGES[idx].name}
            </p>
            <div className="flex flex-1 flex-col justify-center">
              {p.stage === 'number' && <NumberStage p={p} done={res} onDone={finish} />}
              {p.stage === 'visual' && <VisualStage p={p} done={res} onDone={finish} />}
              {p.stage === 'odd' && <OddStage p={p} done={res} onDone={finish} />}
              {p.stage === 'match' && <MatchStage p={p} done={res} onDone={finish} />}
            </div>

            {res && (
              <div className={`gs-rise mt-4 rounded-2xl p-3 ring-1 ${res.right ? 'bg-emerald-50 ring-emerald-200' : 'bg-rose-50 ring-rose-200'}`} role="status">
                <p className={`text-sm font-black ${res.right ? 'text-emerald-700' : 'text-rose-700'}`}>{res.right ? `✓ Correct! +${res.points} points` : res.lost ? '⏰ Time up — you lost this one. The answer is shown above.' : '✕ Not this time'}</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-700">{p.note}</p>
                <button type="button" onClick={next} className="mt-3 w-full rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 py-3 text-base font-black text-white shadow-[0_5px_0_#5b21b6] transition active:translate-y-1 active:shadow-none">
                  {idx + 1 < problems.length ? `Next: ${STAGES[idx + 1].name} →` : 'Finish the level →'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </GameShell>
  );
}

const HintButton = ({ shown, onClick, text }) => (
  shown
    ? <p className="gs-rise rounded-xl bg-amber-50 px-3 py-2 text-center text-sm font-bold text-amber-800 ring-1 ring-amber-200">💡 {text}</p>
    : <button type="button" onClick={onClick} className="mx-auto block rounded-full bg-violet-50 px-4 py-1.5 text-xs font-black text-violet-700 ring-1 ring-violet-200 hover:bg-violet-100">💡 Hint (−40 points)</button>
);

/* ───────────────────────────── 1 · Number sequence: type the missing number ───────────────────────────── */

function NumberStage({ p, done, onDone }) {
  const [entry, setEntry] = useState('');
  const [hint, setHint] = useState(false);
  const shown = p.run.includes(GAP) ? p.run : [...p.run, GAP];
  const full = shown.map((v) => (v === GAP ? p.answer : v));
  const gapAt = shown.indexOf(GAP);
  const jump = (i) => {
    if (!done && (i === gapAt || i + 1 === gapAt)) return '?';
    const d = full[i + 1] - full[i]; const a = full[i]; const b = full[i + 1];
    if (a !== 0 && b % a === 0 && Math.abs(b / a) > 1 && Math.abs(d) > 9) return `×${b / a}`;
    if (b !== 0 && a % b === 0 && Math.abs(a / b) > 1 && Math.abs(d) > 9) return `÷${a / b}`;
    return d >= 0 ? `+${d}` : `−${-d}`;
  };
  const press = (k) => {
    if (done) return;
    sfx.tap?.();
    setEntry((e) => (k === '⌫' ? e.slice(0, -1) : k === '±' ? (e.startsWith('-') ? e.slice(1) : `-${e}`) : e.replace('-', '').length >= 6 ? e : e + k));
  };
  const submit = () => { if (!done && /\d/.test(entry)) onDone({ right: Number(entry) === p.answer, hinted: hint }); };
  return (
    <div className="flex flex-col gap-4">
      <p className="text-center text-base font-black text-slate-800">{gapAt < shown.length - 1 ? 'Type the missing number' : 'Type the number that comes next'}</p>
      <div className="flex flex-wrap items-center justify-center gap-y-5 pt-3" aria-label={`Sequence: ${shown.join(', ')}`}>
        {shown.map((v, i) => (
          <div key={i} className="flex items-center">
            <span className={`grid min-h-12 min-w-12 place-items-center rounded-2xl px-2 text-lg font-black tabular-nums ${
              v === GAP
                ? done ? (done.right ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white') : 'border-2 border-dashed border-violet-400 bg-violet-50 text-violet-700'
                : 'bg-gradient-to-br from-violet-500 to-purple-700 text-white shadow-md'
            }`}>{v === GAP ? (done ? p.answer : entry || '?') : v}</span>
            {i < shown.length - 1 && (
              <span className="relative mx-0.5 flex w-6 justify-center sm:w-8">
                <span className={`absolute -top-7 whitespace-nowrap rounded-full bg-amber-100 px-1.5 text-[10px] font-black text-amber-800 transition-opacity duration-300 sm:text-xs ${hint || done ? 'opacity-100' : 'opacity-0'}`}>{jump(i)}</span>
                <span className="h-0.5 w-full rounded-full bg-violet-200" />
              </span>
            )}
          </div>
        ))}
      </div>
      {!done && (
        <>
          <HintButton shown={hint} onClick={() => setHint(true)} text="Look at the jump between each pair of numbers." />
          <div className="mx-auto grid w-full max-w-xs grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '±', '0', '⌫'].map((k) => (
              <button key={k} type="button" onClick={() => press(k)} className="rounded-xl bg-white py-2.5 text-xl font-black text-violet-900 shadow-[0_3px_0_#ddd6fe] ring-1 ring-violet-200 transition active:translate-y-0.5 active:shadow-none">{k}</button>
            ))}
          </div>
          <button type="button" onClick={submit} disabled={!/\d/.test(entry)} className="mx-auto w-full max-w-xs rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 py-3 text-base font-black text-white shadow-[0_5px_0_#5b21b6] transition active:translate-y-1 active:shadow-none disabled:opacity-40">Check answer</button>
        </>
      )}
    </div>
  );
}

/* ───────────────────────────── Drawing a cell ───────────────────────────── */

const poly = (n, r, turn = -90) => Array.from({ length: n }, (_, i) => { const a = ((turn + (360 / n) * i) * Math.PI) / 180; return `${(r * Math.cos(a)).toFixed(1)},${(r * Math.sin(a)).toFixed(1)}`; }).join(' ');
const STAR = Array.from({ length: 10 }, (_, i) => { const a = ((-90 + 36 * i) * Math.PI) / 180; const r = i % 2 ? 17 : 40; return `${(r * Math.cos(a)).toFixed(1)},${(r * Math.sin(a)).toFixed(1)}`; }).join(' ');
const Shape = ({ shape, color }) => {
  switch (shape) {
    case 'square': return <rect x="-33" y="-33" width="66" height="66" rx="8" fill={color} />;
    case 'triangle': return <polygon points={poly(3, 42)} fill={color} strokeLinejoin="round" stroke={color} strokeWidth="6" transform="scale(0.88) translate(0 6)" />;
    case 'diamond': return <polygon points="0,-42 30,0 0,42 -30,0" fill={color} />;
    case 'star': return <polygon points={STAR} fill={color} strokeLinejoin="round" stroke={color} strokeWidth="4" />;
    case 'pentagon': return <polygon points={poly(5, 40)} fill={color} />;
    case 'hexagon': return <polygon points={poly(6, 40, 0)} fill={color} />;
    case 'cross': return <path d="M-12 -38 H12 V-12 H38 V12 H12 V38 H-12 V12 H-38 V-12 H-12 Z" fill={color} />;
    case 'arrow': return <path d="M0 -42 L30 -4 H12 V40 H-12 V-4 H-30 Z" fill={color} strokeLinejoin="round" stroke={color} strokeWidth="4" />;
    case 'half': return <g><circle r="36" fill="#fff" stroke={color} strokeWidth="7" /><path d="M-36 0 A36 36 0 0 1 36 0 Z" fill={color} /></g>;
    case 'flag': return <g><rect x="-22" y="-40" width="8" height="80" rx="4" fill="#475569" /><path d="M-14 -38 L32 -20 L-14 -2 Z" fill={color} /></g>;
    default: return <circle r="37" fill={color} />;
  }
};
const SPOTS = { 2: [[-24, 0], [24, 0]], 3: [[-26, 18], [26, 18], [0, -22]], 4: [[-24, -24], [24, -24], [-24, 24], [24, 24]] };
const spots = (n) => SPOTS[n] || Array.from({ length: n }, (_, i) => [-30 + (i % 3) * 30, -30 + Math.floor(i / 3) * 30 + (n <= 6 ? 15 : 0)]);
export function Glyph({ cell, className = '' }) {
  const { shape, color, rot, count, pos } = cell;
  return (
    <svg viewBox="-50 -50 100 100" className={className} aria-hidden>
      {pos !== null && pos !== undefined ? (
        <>
          <path d="M-16.5 -46 V46 M16.5 -46 V46 M-46 -16.5 H46 M-46 16.5 H46" stroke="#ddd6fe" strokeWidth="2" strokeLinecap="round" />
          <g transform={`translate(${-33 + (pos % 3) * 33} ${-33 + Math.floor(pos / 3) * 33}) scale(0.3) rotate(${rot})`}><Shape shape={shape} color={color} /></g>
        </>
      ) : count > 1 ? (
        spots(count).map(([x, y], i) => <g key={i} transform={`translate(${x} ${y}) scale(${count <= 4 ? 0.42 : 0.3})`}><Shape shape={shape} color={color} /></g>)
      ) : (
        <g transform={`rotate(${rot})`}><Shape shape={shape} color={color} /></g>
      )}
    </svg>
  );
}

/* ───────────────────────────── 2 · Visual pattern: pick the picture ───────────────────────────── */

function VisualStage({ p, done, onDone }) {
  const [hint, setHint] = useState(false);
  const [picked, setPicked] = useState(null);
  const choose = (i) => { if (done) return; setPicked(i); onDone({ right: i === p.answer, hinted: hint }); };
  const box = 'grid aspect-square place-items-center rounded-2xl bg-violet-50 ring-1 ring-violet-100';
  return (
    <div className="flex flex-col gap-4">
      <p className="text-center text-base font-black text-slate-800">{p.grid ? 'Which picture completes the grid?' : 'Which picture comes next?'}</p>
      {p.grid ? (
        <div className="mx-auto grid w-full max-w-[15rem] grid-cols-3 gap-1.5 rounded-3xl bg-violet-100/60 p-2">
          {p.grid.map((c, i) => (
            <div key={i} className={c ? 'grid aspect-square place-items-center rounded-xl bg-white' : 'grid aspect-square place-items-center rounded-xl border-2 border-dashed border-violet-400 bg-violet-50 text-2xl font-black text-violet-500'}>
              {c ? <Glyph cell={c} className="h-[78%] w-[78%]" /> : done ? <Glyph cell={p.options[p.answer]} className="gs-pop h-[78%] w-[78%]" /> : '?'}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center gap-1.5">
          {p.frames.map((c, i) => <div key={i} className={`${box} w-[17%] max-w-20`}><Glyph cell={c} className="h-[80%] w-[80%]" /></div>)}
          <div className="grid aspect-square w-[17%] max-w-20 place-items-center rounded-2xl border-2 border-dashed border-violet-400 bg-white text-2xl font-black text-violet-500">
            {done ? <Glyph cell={p.options[p.answer]} className="gs-pop h-[80%] w-[80%]" /> : '?'}
          </div>
        </div>
      )}
      {!done && <HintButton shown={hint} onClick={() => setHint(true)} text={p.hint} />}
      <div className="grid grid-cols-4 gap-2" role="group" aria-label="Answer pictures">
        {p.options.map((c, i) => {
          const state = !done ? 'idle' : i === p.answer ? 'right' : i === picked ? 'wrong' : 'dim';
          return (
            <button key={i} type="button" onClick={() => choose(i)} disabled={!!done} aria-label={`Picture ${'ABCD'[i]}`}
              className={`relative grid aspect-square place-items-center rounded-2xl bg-white shadow-[0_4px_0_#ddd6fe] ring-2 transition active:translate-y-0.5 active:shadow-none ${
                state === 'right' ? 'gs-right ring-emerald-500' : state === 'wrong' ? 'gs-wrong ring-rose-500' : state === 'dim' ? 'opacity-40 ring-violet-100' : 'ring-violet-200 hover:ring-violet-500'
              }`}>
              <span className="absolute left-1.5 top-1 text-[10px] font-black text-violet-300">{'ABCD'[i]}</span>
              <Glyph cell={c} className="h-[74%] w-[74%]" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────────────────────── 3 · Odd one out: tap the thing itself ───────────────────────────── */

function OddStage({ p, done, onDone }) {
  const [hint, setHint] = useState(false);
  const [picked, setPicked] = useState(null);
  const choose = (i) => { if (done) return; setPicked(i); onDone({ right: i === p.odd, hinted: hint }); };
  return (
    <div className="flex flex-col gap-4">
      <p className="text-center text-base font-black text-slate-800">Tap the one that does NOT belong</p>
      <div className="flex flex-wrap justify-center gap-2.5">
        {p.items.map((it, i) => {
          const state = !done ? 'idle' : i === p.odd ? 'right' : i === picked ? 'wrong' : 'dim';
          return (
            <button key={i} type="button" onClick={() => choose(i)} disabled={!!done}
              className={`nq-bob grid h-[5.25rem] place-items-center rounded-3xl bg-gradient-to-b from-white to-violet-50 shadow-[0_5px_0_#ddd6fe] ring-2 transition active:translate-y-1 active:shadow-none ${it.word ? 'min-w-[7rem] px-3' : 'w-[5.25rem]'} ${
                state === 'right' ? 'gs-right ring-emerald-500' : state === 'wrong' ? 'gs-wrong ring-rose-500' : state === 'dim' ? 'opacity-45 ring-violet-100' : 'ring-violet-200 hover:ring-violet-500'
              }`} style={{ animationDelay: `${i * 140}ms` }}>
              {it.emoji && <span className="text-[2.6rem] leading-none">{it.emoji}</span>}
              {it.cell && <Glyph cell={it.cell} className="h-14 w-14" />}
              {it.text && <span className={`font-black text-violet-900 ${it.word ? 'text-base' : 'text-3xl tabular-nums'}`}>{it.text}</span>}
            </button>
          );
        })}
      </div>
      {!done && <HintButton shown={hint} onClick={() => setHint(true)} text={p.hint} />}
    </div>
  );
}

/* ───────────────────────────── 4 · Matchsticks: drag a stick to a new place ───────────────────────────── */

const DW = 52; // a digit's width
const DH = 100; // and height
const SEG = { a: [6, 0, DW - 6, 0], g: [6, DH / 2, DW - 6, DH / 2], d: [6, DH, DW - 6, DH], f: [0, 6, 0, DH / 2 - 6], b: [DW, 6, DW, DH / 2 - 6], e: [0, DH / 2 + 6, 0, DH - 6], c: [DW, DH / 2 + 6, DW, DH - 6] };
/** Where everything stands: { slots: { id: [x1, y1, x2, y2] }, fixed: [[x1, y1, x2, y2]…], width }. */
const layoutFor = (p) => {
  const slots = {}; const fixed = [];
  const digit = (i, x) => Object.entries(SEG).forEach(([s, [x1, y1, x2, y2]]) => { slots[`${i}${s}`] = [x + x1, y1, x + x2, y2]; });
  if (p.type === 'largest') { for (let i = 0; i < p.digits; i += 1) digit(i, i * (DW + 30)); return { slots, fixed, width: p.digits * (DW + 30) - 30 }; }
  digit(0, 0);
  const ox = DW + 38; // the sign's centre
  fixed.push([ox - 18, DH / 2, ox + 18, DH / 2]);
  slots.op = [ox, DH / 2 - 18, ox, DH / 2 + 18];
  digit(1, ox + 38);
  const ex = ox + 38 + DW + 22;
  fixed.push([ex, DH / 2 - 10, ex + 34, DH / 2 - 10], [ex, DH / 2 + 10, ex + 34, DH / 2 + 10]);
  digit(2, ex + 34 + 22);
  return { slots, fixed, width: ex + 34 + 22 + DW };
};
const Stick = ({ at, tone = 'plain', ...rest }) => {
  const [x1, y1, x2, y2] = at;
  return (
    <g {...rest}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth="26" strokeLinecap="round" />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={tone === 'take' ? '#f43f5e' : '#b45309'} strokeWidth="9" strokeLinecap="round" />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fcd9a0" strokeWidth="5.5" strokeLinecap="round" />
      <circle cx={x1} cy={y1} r="5.5" fill="#dc2626" stroke="#7f1d1d" strokeWidth="1" />
    </g>
  );
};

function MatchStage({ p, done, onDone }) {
  const lay = useMemo(() => layoutFor(p), [p]);
  const [sticks, setSticks] = useState(p.start);
  const [selected, setSelected] = useState(null);
  const [drag, setDrag] = useState(null); // { slot, x, y, sx, sy, moved }
  const [hint, setHint] = useState(false);
  const [left, setLeft] = useState(p.seconds); // the clock: at 3 … 2 … 1 it counts down on screen, at 0 the answer shows and the puzzle is lost
  const hintRef = useRef(false);
  const svg = useRef(null);
  useEffect(() => { hintRef.current = hint; }, [hint]);
  useEffect(() => {
    if (done) return undefined;
    const end = Date.now() + p.seconds * 1000;
    const t = setInterval(() => {
      const s = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setLeft(s);
      if (s <= 0) { clearInterval(t); onDone({ right: false, hinted: hintRef.current, lost: true }); }
    }, 200);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, p]);
  const moved = sticksMoved(p, sticks);
  const read = readMatch(sticks, p.digits);
  const show = done && !done.right ? p.solution : sticks; // given up: the answer is shown
  const empty = Object.keys(lay.slots).filter((s) => !show.includes(s));
  const take = hint && !done ? p.start.find((s) => !p.solution.includes(s) && sticks.includes(s)) : null;
  const put = hint && !done ? p.solution.find((s) => !p.start.includes(s) && !sticks.includes(s)) : null;

  const point = (e) => { const m = svg.current.getScreenCTM().inverse(); const pt = svg.current.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const q = pt.matrixTransform(m); return [q.x, q.y]; };
  const place = (from, to) => {
    if (done || from === to || sticks.includes(to)) return;
    const next = sticks.map((s) => (s === from ? to : s));
    sfx.tap?.();
    setSticks(next); setSelected(null);
    if (matchSolved(p, next)) setTimeout(() => onDone({ right: true, hinted: hint }), 450);
  };
  const nearest = (x, y, from) => {
    let best = null; let bd = 34;
    for (const [id, [x1, y1, x2, y2]] of Object.entries(lay.slots)) {
      if (id !== from && sticks.includes(id)) continue;
      const d = Math.hypot((x1 + x2) / 2 - x, (y1 + y2) / 2 - y);
      if (d < bd) { bd = d; best = id; }
    }
    return best;
  };
  const down = (e, slot) => { if (done) return; e.preventDefault(); svg.current.setPointerCapture?.(e.pointerId); const [x, y] = point(e); setDrag({ slot, x, y, sx: x, sy: y, moved: false }); };
  const move = (e) => { if (!drag) return; const [x, y] = point(e); setDrag((d) => (d ? { ...d, x, y, moved: d.moved || Math.hypot(x - d.sx, y - d.sy) > 7 } : d)); };
  const up = () => {
    if (!drag) return;
    const d = drag; setDrag(null);
    if (!d.moved) { setSelected((s) => (s === d.slot ? null : d.slot)); return; } // a tap: pick the stick up
    const to = nearest(d.x, d.y, d.slot);
    if (to && to !== d.slot) place(d.slot, to);
  };
  const target = drag?.moved ? nearest(drag.x, drag.y, drag.slot) : null;
  const dragAt = () => { const [x1, y1, x2, y2] = lay.slots[target || drag.slot]; const hx = (x2 - x1) / 2; const hy = (y2 - y1) / 2; return [drag.x - hx, drag.y - hy, drag.x + hx, drag.y + hy]; };
  const shown = p.type === 'largest' ? read.digits.map((d) => (d === null ? '?' : d)).join('') : `${read.digits[0] ?? '?'} ${read.plus ? '+' : '−'} ${read.digits[1] ?? '?'} = ${read.digits[2] ?? '?'}`;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-center text-base font-black text-slate-800">{p.goal}</p>
      {!done && (
        <div className="flex items-center gap-2">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-violet-100"><div className={`h-full rounded-full transition-[width] duration-200 ease-linear ${left <= 10 ? 'bg-rose-500' : 'bg-gradient-to-r from-violet-500 to-fuchsia-500'}`} style={{ width: `${(left / p.seconds) * 100}%` }} /></div>
          <span className={`w-10 text-right text-sm font-black tabular-nums ${left <= 10 ? 'text-rose-600' : 'text-violet-800'}`}>{left}s</span>
        </div>
      )}
      <div className="relative rounded-3xl bg-gradient-to-b from-violet-950 to-purple-900 p-3 shadow-inner">
        {!done && left <= 3 && left > 0 && <span key={left} className="gs-pop pointer-events-none absolute inset-0 z-10 grid place-items-center text-8xl font-black text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.7)]" aria-live="assertive">{left}</span>}
        <svg ref={svg} viewBox={`-22 -24 ${lay.width + 44} ${DH + 48}`} className="mx-auto block w-full max-w-md touch-none" onPointerMove={move} onPointerUp={up} onPointerCancel={up} role="group" aria-label={`Matchsticks showing ${shown}`}>
          {/* empty places */}
          {empty.map((id) => {
            const [x1, y1, x2, y2] = lay.slots[id];
            const live = !done && (selected || drag?.moved);
            return (
              <g key={id} onClick={() => selected && place(selected, id)} className={selected ? 'cursor-pointer' : ''}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth="24" strokeLinecap="round" />
                <line x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth="7" strokeLinecap="round" strokeDasharray={id === target || id === put ? undefined : '1 9'}
                  stroke={id === target ? '#34d399' : id === put ? '#34d399' : live ? '#c4b5fd' : '#6d4bb0'} className={id === put ? 'nq-pulse' : ''} opacity={id === target || id === put ? 0.9 : live ? 0.8 : 0.45} />
              </g>
            );
          })}
          {lay.fixed.map((at, i) => <Stick key={`f${i}`} at={at} />)}
          {show.map((id) => (drag?.moved && drag.slot === id ? null : (
            <Stick key={id} at={lay.slots[id]} tone={id === take ? 'take' : 'plain'} onPointerDown={(e) => down(e, id)}
              className={`${done ? '' : 'cursor-grab'} ${id === selected ? 'nq-lift' : ''} ${id === take ? 'nq-pulse' : ''}`} />
          )))}
          {drag?.moved && <Stick at={dragAt()} className="pointer-events-none opacity-90" />}
        </svg>
      </div>
      <div className="flex items-center justify-between gap-2 text-xs font-black">
        <span className="rounded-full bg-violet-50 px-3 py-1.5 text-violet-800 ring-1 ring-violet-200">It reads: <span className="tabular-nums">{shown}</span></span>
        <span className={`rounded-full px-3 py-1.5 ring-1 ${moved > p.moves ? 'bg-rose-50 text-rose-700 ring-rose-200' : 'bg-violet-50 text-violet-800 ring-violet-200'}`}>Moved {moved} / {p.moves}{moved > p.moves ? ' — put one back' : ''}</span>
      </div>
      {!done && (
        <>
          <p className="text-center text-xs font-bold text-slate-500">Drag a matchstick to an empty place — or tap a stick, then tap where it should go.</p>
          <HintButton shown={hint} onClick={() => setHint(true)} text={`${p.hint} The red stick is one to move.`} />
        </>
      )}
    </div>
  );
}
