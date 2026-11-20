import { useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsFor, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { makeTrailBoard, trailConfig } from '../../data/bands/masterMath';

const freshSeed = () => Math.floor(Math.random() * 4294967296);
const PENALTY = 1; // seconds added for a wrong tap

/**
 * 🔢 Number Trail (2026-11-17, Master Minds · Math & Speed; Class 11+ the same day). Values are scattered across the
 * board, each written a different way — 3/8, 45%, √10, 2³, log₂ 8, −1.5 — tap them smallest to largest, fast. The
 * trail draws itself as you go; a wrong tap costs a second.
 */
export default function NumberTrail({ onExit }) {
  const progress = useGameProgress('number-trail', { bands: SECTION_BANDS.master });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const config = trailConfig(progress.difficulty, progress.levelNo);
  const [boards] = useState(() => { const rng = seeded(freshSeed()); return Array.from({ length: config.boards }, () => makeTrailBoard(rng, config)); });
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [next, setNext] = useState(0);
  const [times, setTimes] = useState([]); // seconds per finished board
  const [elapsed, setElapsed] = useState(0);
  const [penalty, setPenalty] = useState(0);
  const [wrong, setWrong] = useState(null);
  const [misses, setMisses] = useState(0);
  const startAt = useRef(null);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const b = boards[Math.min(idx, boards.length - 1)];
  const over = times.length >= boards.length;
  const total = times.reduce((a, t) => a + t, 0);
  const target = Math.round(config.count * config.secondsPerItem * boards.length);
  const stars = over ? starsFor(total, target, true) : 0;
  useRecordStars(progress, over, stars, { correct: config.count * boards.length, wrong: misses, hints: 0, score: Math.round(total) });

  // A tenth-of-a-second clock while a board is being played.
  const playing = started && !over && next < b.length;
  useEffect(() => {
    if (!playing) return undefined;
    if (startAt.current === null) startAt.current = Date.now();
    const iv = setInterval(() => setElapsed((Date.now() - startAt.current) / 1000), 100);
    return () => clearInterval(iv);
  }, [playing, idx]);

  const tap = (k) => {
    if (!playing) return;
    if (k !== next) {
      if (k > next) { sfx.wrong?.(); setWrong(k); setPenalty((p) => p + PENALTY); setMisses((m) => m + 1); timers.current.push(setTimeout(() => setWrong(null), 350)); }
      return;
    }
    const n = next + 1;
    setNext(n);
    if (n === b.length) {
      sfx.right?.();
      const t = elapsed + penalty;
      timers.current.push(setTimeout(() => {
        setTimes((x) => [...x, t]);
        if (idx + 1 < boards.length) { setIdx((i) => i + 1); setNext(0); setPenalty(0); setElapsed(0); startAt.current = null; }
      }, 1100));
    }
  };

  const shown = (elapsed + penalty).toFixed(1);
  const objective = `Every bubble is a number written a different way — fractions, percentages, decimals${config.step >= 2 ? ', powers, square roots' : ''}${config.step >= 6 ? ', logs and factorials' : ''}. Tap them from smallest to largest, as fast as you can. A wrong tap adds ${PENALTY} second. ${boards.length} boards — about ${target} seconds for a star.`;

  return (
    <GameShell
      title="Number Trail"
      blurb="Order the values, smallest first."
      tone="bg-gradient-to-br from-orange-300 to-rose-500"
      score={`${Math.min(idx + (over ? 0 : 1), boards.length)}/${boards.length}`}
      scoreLabel="Board"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) } : null}
      result={over ? {
        passed: stars > 0, stars,
        headline: stars > 0 ? `Level ${progress.level} cleared — laser focus!` : `A little faster — aim for ${target} seconds`,
        detail: `${total.toFixed(1)} seconds over ${boards.length} boards (target ${target})`,
        atEnd: progress.atEnd, onNext: progress.advance, onRetry: progress.retry
      } : null}
    >
      {started && !over && (
        <div className="mx-auto w-full max-w-lg select-none">
          <div className="mb-2 flex items-center justify-between text-sm font-black text-rose-900/80">
            <span>Tapped <span className="rounded-lg bg-rose-500 px-2 py-0.5 text-white tabular-nums">{next}/{b.length}</span> · next: the smallest left</span>
            <span role="timer" className="tabular-nums">⏱ {shown}s</span>
          </div>
          <div className="relative aspect-square w-full overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-orange-50 sm:aspect-[4/3] via-rose-50 to-amber-50 shadow-[0_18px_36px_-20px_rgba(225,29,72,0.5)] ring-1 ring-rose-100">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
              <polyline points={b.slice(0, next).map((c) => `${c.x},${c.y}`).join(' ')} fill="none" stroke="#fb7185" strokeWidth="0.7" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
            </svg>
            {b.map((c) => {
              const done = c.order < next;
              const letter = c.value < 0;
              return (
                <button key={`${idx}-${c.order}`} type="button" onClick={() => tap(c.order)} aria-label={c.label}
                  className={`absolute flex h-9 min-w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full px-2 text-sm font-black whitespace-nowrap sm:h-11 sm:min-w-11 sm:text-base shadow-[0_6px_12px_-6px_rgba(15,23,42,0.45)] ring-2 transition-all duration-200 ${wrong === c.order ? 'gs-wrong bg-rose-500 text-white ring-rose-500' : done ? 'scale-90 bg-rose-400 text-white ring-rose-300' : letter ? 'bg-white text-violet-700 ring-violet-200 hover:ring-violet-400' : 'bg-white text-rose-700 ring-rose-200 hover:ring-rose-400'}`}
                  style={{ left: `${c.x}%`, top: `${c.y}%` }}>
                  {c.label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-center text-xs font-bold text-slate-500">Board {idx + 1} of {boards.length}{times.length ? ` · last ${times[times.length - 1].toFixed(1)}s` : ''}</p>
        </div>
      )}
    </GameShell>
  );
}
