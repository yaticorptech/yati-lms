import { useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import useEClock from './useEClock';
import ENumPad from './ENumPad';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { checkPattern, makePatternLevel, patternConfig } from '../../data/bands/eSmartMath';

const freshSeed = () => Math.floor(Math.random() * 4294967296);

const KIND_NAME = { pyramid: 'Number pyramid', magic: 'Magic square', step: 'Step grid', grow: 'Growth grid', sumgrid: 'Totals grid' };
const KIND_ICON = { pyramid: '🔺', magic: '✨', step: '📶', grow: '🌱', sumgrid: '➕' };
// Brick colours, top row first (2026-11-16, the user: make it attractive).
const ROW_TONE = [
  'from-amber-300 to-orange-400 text-amber-950',
  'from-orange-400 to-rose-500 text-white',
  'from-rose-500 to-fuchsia-500 text-white',
  'from-fuchsia-500 to-violet-500 text-white',
  'from-violet-500 to-indigo-500 text-white',
  'from-indigo-500 to-sky-500 text-white'
];

/** 🧮 Number Pattern Lab: find the hidden rule in a 2-D number structure and fill its missing cells. */
export default function NumberPatternLab({ onExit }) {
  const progress = useGameProgress('number-pattern-lab', { bands: SECTION_BANDS.smart });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const cfg = patternConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  const [puzzles] = useState(() => makePatternLevel(seeded(freshSeed()), cfg));
  const [idx, setIdx] = useState(0);
  const [entries, setEntries] = useState({});
  const [selected, setSelected] = useState(() => puzzles[0].hidden[0]);
  const [checks, setChecks] = useState(0);
  const [wrongIds, setWrongIds] = useState([]);
  const [status, setStatus] = useState(null); // null | 'solved' | 'revealed'
  const [points, setPoints] = useState(0);
  const [tally, setTally] = useState({ correct: 0, wrong: 0 });
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);

  const max = puzzles.length * 2;
  const pass = Math.ceil(max * 0.6);
  const limitMs = cfg.seconds * 1000;
  const allDone = idx >= puzzles.length;
  const elapsed = useEClock(started && !paused && !allDone, limitMs);
  const timeUp = elapsed >= limitMs;
  const over = allDone || timeUp;
  const stars = over ? starsForFixed(points, pass, max) : 0;
  useRecordStars(progress, over, stars, { correct: tally.correct, wrong: tally.wrong, hints: 0, score: points, limitMs });

  const p = allDone ? null : puzzles[idx];
  const locked = !started || over || paused || status !== null;
  const left = Math.max(0, limitMs - elapsed);

  const setEntry = (v) => {
    if (locked || !selected) return;
    setEntries((e) => ({ ...e, [selected]: v }));
    setWrongIds((w) => w.filter((id) => id !== selected));
  };

  const check = () => {
    if (locked) return;
    const wrong = checkPattern(p, entries);
    if (!wrong.length) {
      sfx.right?.();
      setPoints((n) => n + (checks === 0 ? 2 : 1));
      setTally((t) => ({ ...t, correct: t.correct + 1 }));
      setStatus('solved');
      return;
    }
    sfx.wrong();
    if (checks === 0) {
      setChecks(1);
      setWrongIds(wrong);
      setSelected(wrong[0]);
    } else {
      setTally((t) => ({ ...t, wrong: t.wrong + 1 }));
      setWrongIds(wrong);
      setStatus('revealed');
    }
  };

  const next = () => {
    const n = idx + 1;
    setIdx(n);
    setEntries({});
    setChecks(0);
    setWrongIds([]);
    setStatus(null);
    setSelected(n < puzzles.length ? puzzles[n].hidden[0] : null);
  };

  const onEnter = () => {
    if (locked) return;
    const empty = p.hidden.filter((id) => !entries[id]);
    if (!empty.length) { check(); return; }
    const after = p.hidden.indexOf(selected);
    setSelected(empty.find((id) => p.hidden.indexOf(id) > after) || empty[0]);
  };

  const filled = p ? p.hidden.every((id) => entries[id]) : false;

  const objective = cfg.band === 'intermediate'
    ? `Each board follows a hidden rule — pyramids, magic squares and grids whose rows and columns change in steps. Work out the missing numbers. ${puzzles.length} boards, ${cfg.seconds} seconds. Right on the first check earns 2 points, on the second 1. Score ${pass} of ${max} to clear.`
    : `Pyramids, magic squares, growth and totals grids: each hides its rule in two directions. Fill every missing cell. ${puzzles.length} boards in ${cfg.seconds} seconds — 2 points on the first check, 1 on the second. Score ${pass} of ${max} to clear.`;

  return (
    <GameShell
      title="Number Pattern Lab"
      blurb="Crack the rule, fill the gaps."
      tone="bg-gradient-to-br from-cyan-500 to-indigo-700"
      score={`${points}/${max}`}
      scoreLabel="Points"
      seconds={Math.ceil(left / 1000)}
      totalSeconds={cfg.seconds}
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      paused={paused}
      onPause={() => setPaused((v) => !v)}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective, seconds: cfg.seconds, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) } : null}
      result={over ? {
        passed: points >= pass,
        stars,
        headline: points >= pass ? `Level ${progress.level} cleared!` : timeUp && !allDone ? 'Time is up' : 'Nearly there',
        detail: `${points} of ${max} points · ${tally.correct} of ${puzzles.length} boards solved`,
        atEnd: progress.atEnd,
        onNext: progress.advance,
        onRetry: progress.retry
      } : null}
      footer={<p className="text-center text-sm text-ink-500">Board {Math.min(idx + 1, puzzles.length)} of {puzzles.length} · tap a ? cell, type with the pad or keys, Enter moves on</p>}
    >
      {started && p && (
        <div className="relative mx-auto w-full max-w-lg overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 p-4 shadow-[0_20px_44px_-22px_rgba(109,40,217,0.75)] sm:p-5">
          {/* Lab glow and grid */}
          <span aria-hidden className="pointer-events-none absolute -top-16 -right-10 h-48 w-48 rounded-full bg-amber-300/30 blur-3xl" />
          <span aria-hidden className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-sky-300/30 blur-3xl" />
          <span aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:24px_24px]" />

          <div className="relative flex flex-col items-center gap-4">
            {/* The rule */}
            <div className="flex w-full items-center gap-3 rounded-2xl bg-white/15 px-4 py-3 ring-1 ring-white/30 backdrop-blur-sm">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-2xl shadow-sm" aria-hidden>{KIND_ICON[p.kind]}</span>
              <div className="min-w-0">
                <p className="text-[0.65rem] font-black tracking-[0.16em] text-white/80 uppercase">{KIND_NAME[p.kind]} · board {Math.min(idx + 1, puzzles.length)}/{puzzles.length}</p>
                <p className="text-sm leading-snug font-bold text-white sm:text-base">{p.rule}</p>
              </div>
            </div>

            {/* The board */}
            <div className="w-full rounded-3xl bg-white/95 p-4 shadow-lg sm:p-5">
              <Board p={p} entries={entries} selected={selected} wrongIds={wrongIds} status={status} onSelect={(id) => !locked && setSelected(id)} />
            </div>

            <p className={`rounded-full px-4 py-1.5 text-center text-sm font-black shadow-sm ${status === 'solved' ? 'bg-emerald-100 text-emerald-700' : wrongIds.length || status === 'revealed' ? 'bg-rose-100 text-rose-700' : 'bg-white/90 text-violet-800'}`} role="status" aria-live="polite">
              {status === 'solved' ? (checks === 0 ? 'Perfect — the rule holds everywhere! +2' : 'Fixed it! +1')
                : status === 'revealed' ? 'Not quite — the right numbers are shown in amber.'
                  : wrongIds.length ? `${wrongIds.length} cell${wrongIds.length > 1 ? 's' : ''} break the rule — one more check.`
                    : 'Tap a ? brick, then type its number.'}
            </p>

            {status ? (
              <button type="button" onClick={next} className="fp-press min-h-12 rounded-full bg-white px-8 text-sm font-black text-violet-700 shadow-lg" autoFocus>
                {idx + 1 < puzzles.length ? 'Next board →' : 'See result'}
              </button>
            ) : (
              <div className="w-full rounded-3xl bg-white/15 p-3 ring-1 ring-white/25 backdrop-blur-sm">
                <ENumPad value={entries[selected] || ''} onChange={setEntry} onEnter={onEnter} active={!locked} disabled={locked} maxLen={4} enterLabel="Next" premium />
                <button type="button" onClick={check} disabled={locked || !filled}
                  className="fp-press mx-auto mt-3 block min-h-12 w-full max-w-xs rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 text-sm font-black text-white shadow-md disabled:opacity-50">
                  ✓ Check board
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </GameShell>
  );
}

/** The structure: bricks for a pyramid, a square grid for the rest; a totals grid shades its totals. */
function Board({ p, entries, selected, wrongIds, status, onSelect }) {
  const rows = p.values.length;
  const cell = (r, c, v) => {
    const id = `${r}-${c}`;
    const hidden = p.hidden.includes(id);
    const isTotal = p.kind === 'sumgrid' && (r === rows - 1 || c === p.values[0].length - 1);
    const base = 'relative flex h-12 min-w-0 items-center justify-center rounded-xl text-lg font-black tabular-nums transition sm:h-14 sm:text-xl';
    if (!hidden) {
      const tone = p.kind === 'pyramid' ? `bg-gradient-to-b ${ROW_TONE[r % ROW_TONE.length]} shadow-[inset_0_-3px_0_rgba(0,0,0,0.12)]`
        : isTotal ? 'bg-gradient-to-b from-amber-200 to-amber-300 text-amber-900' : 'bg-gradient-to-b from-violet-50 to-indigo-100 text-indigo-900 ring-1 ring-indigo-200';
      return <div key={id} className={`${base} ${tone}`}>{v}</div>;
    }
    const wrong = wrongIds.includes(id);
    const shown = status === 'revealed' ? v : entries[id] || '?';
    const tone = status === 'solved' ? 'bg-emerald-400 text-white shadow-[inset_0_-3px_0_rgba(0,0,0,0.12)]'
      : status === 'revealed' ? (wrong ? 'bg-amber-300 text-amber-900' : 'bg-emerald-300 text-emerald-900')
        : wrong ? 'gs-wrong bg-rose-100 text-rose-700 ring-2 ring-rose-400'
          : selected === id ? 'scale-105 bg-yellow-100 text-violet-800 ring-4 ring-yellow-300 shadow-[0_0_18px_rgba(250,204,21,0.7)]'
            : entries[id] ? 'bg-white text-violet-700 ring-2 ring-violet-300' : 'border-2 border-dashed border-violet-300 bg-violet-50/60 text-violet-400';
    return (
      <button key={id} type="button" onClick={() => onSelect(id)} aria-label={`Missing cell, row ${r + 1}, column ${c + 1}${entries[id] ? `, entered ${entries[id]}` : ''}`} className={`${base} ${tone}`}>
        {shown}
      </button>
    );
  };

  if (p.kind === 'pyramid') {
    return (
      <div className="flex w-full flex-col items-center gap-2" role="group" aria-label="Number pyramid">
        {p.values.map((row, r) => (
          <div key={r} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 4rem))` }}>
            {row.map((v, c) => cell(r, c, v))}
          </div>
        ))}
      </div>
    );
  }
  const cols = p.values[0].length;
  return (
    <div className="mx-auto grid w-full max-w-xs gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }} role="group" aria-label={KIND_NAME[p.kind]}>
      {p.values.map((row, r) => row.map((v, c) => cell(r, c, v)))}
    </div>
  );
}
