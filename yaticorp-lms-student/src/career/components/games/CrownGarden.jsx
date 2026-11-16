import { useEffect, useRef, useState } from 'react';
import { Lightbulb, RotateCcw } from 'lucide-react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { gardenClashes, gardenConfig, gardenSolved, gardenStars, makeGarden } from '../../data/bands/logic2';

const freshSeed = () => Math.floor(Math.random() * 4294967296);
const GARDENS = ['#fecdd3', '#bae6fd', '#bbf7d0', '#fde68a', '#ddd6fe', '#fed7aa', '#a5f3fc', '#f5d0fe'];

/**
 * 👑 Crown Garden (2026-11-16; id "clue-chain"). Place one crown in every row, every column and every coloured garden —
 * and no two crowns may touch, not even corner to corner. Tap: ✕ (a note), tap again: 👑, again: empty. Every board
 * has exactly one solution (data/bands/logic2.js). Faster and without hints earns more stars.
 */
export default function CrownGarden({ onExit }) {
  const progress = useGameProgress('clue-chain', { bands: SECTION_BANDS.smart });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const config = gardenConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  const [boards] = useState(() => { const rng = seeded(freshSeed()); return Array.from({ length: config.puzzles }, () => makeGarden(rng, config)); });
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [marks, setMarks] = useState(() => Array(config.size * config.size).fill(0));
  const [hints, setHints] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [earned, setEarned] = useState([]);
  const [won, setWon] = useState(false);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const b = boards[Math.min(idx, boards.length - 1)];
  const n = b.size;
  const max = boards.length * 3;
  const pass = Math.ceil(max * 0.5);
  const score = earned.reduce((x, y) => x + y, 0);
  const over = earned.length >= boards.length;
  const stars = over ? starsForFixed(score, pass, max) : 0;
  useRecordStars(progress, over, stars, { correct: score, wrong: max - score, hints, score });

  // The clock for this board (for the stars).
  useEffect(() => {
    if (!started || won || over) return undefined;
    const t = setTimeout(() => setSeconds((s) => s + 1), 1000);
    return () => clearTimeout(t);
  }, [started, won, over, seconds]);

  const clashes = gardenClashes(n, b.regions, marks);
  const placed = marks.filter((m) => m === 2).length;

  const check = (next, usedHints) => {
    if (!gardenSolved(n, b.regions, next)) return;
    sfx.right?.();
    setWon(true);
    const got = gardenStars(n, seconds, usedHints);
    timers.current.push(setTimeout(() => {
      setEarned((e) => [...e, got]);
      if (idx + 1 < boards.length) {
        setIdx((i) => i + 1);
        setMarks(Array(n * n).fill(0));
        setHints(0);
        setSeconds(0);
        setWon(false);
      }
    }, 2200));
  };

  const tap = (i) => {
    if (!started || won || over) return;
    const next = [...marks];
    next[i] = (next[i] + 1) % 3;
    setMarks(next);
    check(next, hints);
  };

  const hint = () => {
    if (won || over) return;
    // Place one right crown that is not on the board yet (and clear any wrong crown in its way).
    const missing = b.crowns.map((c, r) => r * n + c).find((i) => marks[i] !== 2);
    if (missing === undefined) return;
    const next = marks.map((m, i) => (m === 2 && !b.crowns.some((c, r) => r * n + c === i) ? 0 : m));
    next[missing] = 2;
    setMarks(next);
    setHints((h) => h + 1);
    check(next, hints + 1);
  };

  const objective = `Place ${n} crowns 👑: exactly ONE in every row, every column and every coloured garden — and no two crowns may touch, not even corner to corner. Tap once for ✕ (a note), twice for a crown. ${boards.length} gardens; faster and without hints earns more stars.`;

  return (
    <GameShell
      title="Crown Garden"
      blurb="One crown in every row, column and garden — no touching!"
      tone="bg-gradient-to-br from-amber-400 to-pink-500"
      score={`${score}/${max}`}
      scoreLabel="Stars"
      seconds={started && !over ? seconds : undefined}
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) } : null}
      result={over ? {
        passed: score >= pass, stars,
        headline: score >= pass ? `Level ${progress.level} cleared — royal gardener!` : 'Try again — look for rows with only one spot left',
        detail: `${score} of ${max} garden stars`,
        atEnd: progress.atEnd, onNext: progress.advance, onRetry: progress.retry
      } : null}
      footer={<p className="text-sm">Garden {Math.min(idx + 1, boards.length)} of {boards.length} · tap: ✕ → 👑 → empty</p>}
    >
      {started && !over && (
        <div className="mx-auto w-full max-w-md select-none">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-slate-700 shadow-sm ring-1 ring-slate-200">👑 {placed} / {n}</span>
            <div className="flex gap-1.5">
              <button type="button" onClick={hint} disabled={won} className="fp-press inline-flex h-10 items-center gap-1.5 rounded-full bg-amber-50 px-3 text-sm font-black text-amber-700 ring-1 ring-amber-200 disabled:opacity-40">
                <Lightbulb className="h-4 w-4" aria-hidden /> Hint
              </button>
              <button type="button" onClick={() => !won && setMarks(Array(n * n).fill(0))} disabled={won || !marks.some(Boolean)} aria-label="Clear the board"
                className="fp-press grid h-10 w-10 place-items-center rounded-full bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 disabled:opacity-40"><RotateCcw className="h-4 w-4" /></button>
            </div>
          </div>

          <div className={`rounded-[1.5rem] bg-white p-2 shadow-[0_16px_32px_-18px_rgba(219,39,119,0.45)] ring-4 transition ${won ? 'ring-emerald-300' : 'ring-white'}`}>
            <div className="grid overflow-hidden rounded-xl" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
              {b.regions.map((g, i) => {
                const r = Math.floor(i / n);
                const c = i % n;
                // Thick lines where gardens meet.
                const edge = (rr, cc) => rr < 0 || cc < 0 || rr >= n || cc >= n || b.regions[rr * n + cc] !== g;
                const m = marks[i];
                const bad = clashes.has(i);
                return (
                  <button key={i} type="button" onClick={() => tap(i)}
                    aria-label={`Row ${r + 1}, column ${c + 1}${m === 2 ? ', crown' : m === 1 ? ', crossed' : ''}${bad ? ', clashes' : ''}`}
                    className="relative grid aspect-square place-items-center transition active:scale-95"
                    style={{
                      backgroundColor: GARDENS[g % GARDENS.length],
                      borderTop: `${edge(r - 1, c) ? 3 : 1}px solid ${edge(r - 1, c) ? '#334155' : 'rgba(51,65,85,0.15)'}`,
                      borderLeft: `${edge(r, c - 1) ? 3 : 1}px solid ${edge(r, c - 1) ? '#334155' : 'rgba(51,65,85,0.15)'}`,
                      borderRight: c === n - 1 ? '3px solid #334155' : undefined,
                      borderBottom: r === n - 1 ? '3px solid #334155' : undefined
                    }}>
                    {m === 1 && <span className="text-lg font-black text-slate-500/70" aria-hidden>✕</span>}
                    {m === 2 && <span className={`text-[min(7vw,2rem)] ${bad ? 'gs-wrong' : won ? 'gs-right' : ''}`} aria-hidden>👑</span>}
                    {m === 2 && bad && <span aria-hidden className="absolute inset-1 rounded-lg ring-4 ring-rose-500/70" />}
                  </button>
                );
              })}
            </div>
          </div>

          <p className={`mt-3 text-center text-sm font-black ${won ? 'text-emerald-600' : clashes.size ? 'text-rose-600' : 'text-slate-500'}`} role="status" aria-live="polite">
            {won ? `Royal garden complete! ${'⭐'.repeat(gardenStars(n, seconds, hints))}` : clashes.size ? 'Red crowns clash — same row, column, garden, or touching.' : 'One crown per row, column and garden. No touching!'}
          </p>
        </div>
      )}
    </GameShell>
  );
}
