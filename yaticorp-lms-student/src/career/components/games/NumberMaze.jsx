import { useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import useEClock from './useEClock';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { adjacent, makeMazeLevel, mazeConfig, mazeSolved } from '../../data/bands/numberMaze';

/**
 * 🧭 Number Maze (2026-11-19, the user's pick for Rising Brains · Maths; game id "number-pattern-lab", so the server
 * already accepts it). Draw a path from 🚩 to 🏁 with your finger, one square at a time, keeping the maze's rule.
 * data/bands/numberMaze.js builds the mazes.
 */
export default function NumberMaze({ onExit }) {
  const progress = useGameProgress('number-pattern-lab', { bands: SECTION_BANDS.smart });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

const freshSeed = () => Math.floor(Math.random() * 4294967296);

function Round({ progress, onExit }) {
  const cfg = mazeConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  const [mazes] = useState(() => makeMazeLevel(seeded(freshSeed()), cfg));
  const [idx, setIdx] = useState(0);
  const [path, setPath] = useState(() => [mazes[0].start]);
  const [solved, setSolved] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [bad, setBad] = useState(null); // { cell, why }
  const [won, setWon] = useState(false);
  const [started, setStarted] = useState(false);
  const timers = useRef([]);
  const grid = useRef(null);
  const drawing = useRef(false);
  useEffect(() => { const l = timers.current; return () => l.forEach(clearTimeout); }, []);

  const limitMs = cfg.seconds * 1000;
  const allDone = idx >= mazes.length;
  const elapsed = useEClock(started && !allDone, limitMs);
  const timeUp = elapsed >= limitMs;
  const over = allDone || timeUp;
  const left = Math.max(0, Math.ceil((limitMs - elapsed) / 1000));
  const pass = 2;
  const stars = over ? starsForFixed(solved, pass, mazes.length) : 0;
  useRecordStars(progress, over, stars, { correct: solved, wrong: mistakes, hints: 0, score: solved, limitMs });

  const m = mazes[Math.min(idx, mazes.length - 1)];
  const at = path[path.length - 1];
  const val = (i) => m.values[i];

  // Try to step onto square i (from a tap or a finger sliding over it).
  const step = (i) => {
    if (!started || over || won) return;
    const k = path.indexOf(i);
    if (k >= 0) { if (k < path.length - 1) setPath(path.slice(0, k + 1)); return; } // back up to an earlier square
    if (!adjacent(at, i, m.cols)) return;
    if (!m.rule.ok(val(at), val(i))) {
      sfx.wrong?.();
      setMistakes((n) => n + 1);
      setBad({ cell: i, why: whyNot(m.rule.key, val(at), val(i), m.rule) });
      timers.current.push(setTimeout(() => setBad(null), 1300));
      return;
    }
    sfx.tap?.();
    const next = [...path, i];
    setPath(next);
    setBad(null);
    if (mazeSolved(m, next)) {
      sfx.right?.();
      setWon(true);
      drawing.current = false;
      timers.current.push(setTimeout(() => {
        setSolved((n) => n + 1);
        setWon(false);
        if (idx + 1 < mazes.length) setPath([mazes[idx + 1].start]);
        setIdx((n) => n + 1);
      }, 1500));
    }
  };

  const cellAt = (e) => {
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-cell]');
    return el && grid.current?.contains(el) ? Number(el.dataset.cell) : null;
  };
  const onDown = (e) => { const i = cellAt(e); if (i === null) return; drawing.current = true; e.currentTarget.setPointerCapture?.(e.pointerId); step(i); };
  const onMove = (e) => { if (!drawing.current) return; const i = cellAt(e); if (i !== null && i !== at && (adjacent(at, i, m.cols) || path.includes(i))) step(i); };
  const onUp = () => { drawing.current = false; };

  const centre = (i) => [((i % m.cols) + 0.5) * (100 / m.cols), (Math.floor(i / m.cols) + 0.5) * (100 / m.rows)];
  const objective = `Draw a path from the 🚩 to the 🏁 — slide your finger, or tap one square at a time (up, down, left or right). Every step must keep the maze's rule, shown at the top. ${mazes.length} mazes in ${cfg.seconds} seconds — solve ${pass} to clear the level.`;

  return (
    <GameShell
      title="Number Maze"
      blurb="Find the path that keeps the rule."
      tone="bg-gradient-to-br from-indigo-500 to-teal-500"
      score={`${solved}/${mazes.length}`}
      scoreLabel="Mazes"
      seconds={left}
      totalSeconds={cfg.seconds}
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective, seconds: cfg.seconds, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) } : null}
      result={over ? {
        passed: solved >= pass, stars,
        headline: solved >= pass ? `Level ${progress.level} cleared — maze master!` : 'Time is up — try again!',
        detail: `${solved} of ${mazes.length} mazes solved · ${mistakes} wrong step${mistakes === 1 ? '' : 's'}`,
        atEnd: progress.atEnd, onNext: progress.advance, onRetry: progress.retry
      } : null}
      footer={<p className="text-center text-sm text-ink-500">Maze {Math.min(idx + 1, mazes.length)} of {mazes.length}</p>}
    >
      {started && !over && (
        <div className="mx-auto flex w-full max-w-md select-none flex-col justify-start gap-3 max-sm:flex-1">
          {/* The rule */}
          <div className="vx-card px-4 py-3.5 text-center">
            <p className="text-[0.65rem] font-black tracking-[0.16em] uppercase opacity-90">Maze {idx + 1} of {mazes.length} · {m.rule.name}</p>
            <p className="mt-1 text-lg leading-snug font-black">{m.rule.text}</p>
          </div>

          {/* The maze */}
          <div className="nm-board relative rounded-[1.6rem] p-2.5">
            <div ref={grid} className="relative touch-none" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
              role="group" aria-label={`Number maze, ${m.rows} by ${m.cols}`}>
              <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${m.cols}, minmax(0, 1fr))` }}>
                {m.values.map((v, i) => {
                  const k = path.indexOf(i);
                  const on = k >= 0;
                  const head = i === at;
                  const next = !won && !on && adjacent(at, i, m.cols);
                  return (
                    <button key={`${idx}-${i}`} type="button" data-cell={i} tabIndex={-1} aria-label={`${v}${i === m.start ? ', start' : ''}${i === m.exit ? ', exit' : ''}${on ? ', on your path' : ''}`}
                      className={`relative grid aspect-square place-items-center rounded-xl text-lg font-black tabular-nums transition duration-150 sm:text-xl ${
                        bad?.cell === i ? 'gs-wrong bg-rose-500 text-white'
                          : won && on ? 'bg-emerald-400 text-emerald-950'
                            : head ? 'z-10 scale-105 bg-amber-300 text-amber-950 shadow-[0_0_18px_rgba(252,211,77,0.9)]'
                              : on ? 'bg-amber-200 text-amber-950'
                                : i === m.exit ? 'bg-white text-slate-900 ring-4 ring-emerald-400'
                                  : next ? 'bg-white text-slate-900 ring-2 ring-sky-300' : 'bg-white/90 text-slate-800'
                      }`}>
                      {v}
                      {i === m.start && <span className="absolute -top-1.5 -left-1 text-base" aria-hidden>🚩</span>}
                      {i === m.exit && <span className="absolute -top-1.5 -right-1 text-base" aria-hidden>🏁</span>}
                    </button>
                  );
                })}
              </div>
              {/* The path drawn as a line through the squares */}
              {path.length > 1 && (
                <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
                  <polyline points={path.map((i) => centre(i).join(',')).join(' ')} fill="none" stroke={won ? '#059669' : '#f59e0b'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.75" vectorEffect="non-scaling-stroke" style={{ strokeWidth: 6 }} />
                </svg>
              )}
            </div>
          </div>

          {/* What happened */}
          <p className={`min-h-12 rounded-2xl px-3 py-2.5 text-center text-sm font-black ${won ? 'gs-rise bg-emerald-500 text-white' : bad ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200' : 'bg-violet-50 text-violet-800 ring-1 ring-violet-100'}`} role="status" aria-live="polite">
            {won ? '🏁 You made it out! Next maze …' : bad ? `✕ ${bad.why}` : path.length === 1 ? 'Start at 🚩 — slide or tap to the next square.' : `${path.length} squares · tap an earlier square to go back`}
          </p>
          <div className="flex items-center justify-between gap-2">
            <button type="button" onClick={() => setPath([m.start])} disabled={path.length === 1 || won} className="fp-press min-h-11 flex-1 rounded-xl bg-white text-sm font-black text-violet-800 ring-1 ring-violet-200 disabled:opacity-40">↺ Start again</button>
            <span className={`min-h-11 flex-1 rounded-xl px-3 py-2.5 text-center text-sm font-black tabular-nums ${left <= 15 ? 'bg-rose-500 text-white' : 'bg-violet-50 text-violet-800 ring-1 ring-violet-100'}`}>⏱ {left}s</span>
          </div>
        </div>
      )}
    </GameShell>
  );
}

const whyNot = (key, a, b, rule) => {
  if (key === 'bigger') return `${b} is not bigger than ${a}.`;
  if (key === 'smaller') return `${b} is not smaller than ${a}.`;
  if (key === 'plus') return `${a} + ${rule.name.replace(/\D/g, '')} is not ${b}.`;
  if (key === 'oddEven') return a === null ? 'Start on an odd number.' : `${a} and ${b} are both ${a % 2 ? 'odd' : 'even'}.`;
  if (key === 'even') return `${b} is odd.`;
  return `${b} is not in the ${rule.name.replace(/\D/g, '')} times table.`;
};
