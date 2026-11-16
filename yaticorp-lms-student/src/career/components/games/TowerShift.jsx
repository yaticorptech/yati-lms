import { useState, useEffect, useMemo } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsOn } from './levels';
import useRecordStars from './useRecordStars';
import useTimedRound from './useTimedRound';
import { sfx } from './gameSfx';
import { legalHop, movesLeft, starsForMoves, towerConfig } from '../../data/bands/towers';

const PEG_NAMES = ['Left', 'Middle', 'Right'];
// Smallest ring first: each size keeps its own colour on every level.
const RING_TONES = [
  'from-rose-400 to-rose-600',
  'from-amber-300 to-orange-500',
  'from-yellow-300 to-lime-500',
  'from-emerald-400 to-teal-600',
  'from-sky-400 to-blue-600',
  'from-violet-400 to-purple-600',
  'from-fuchsia-400 to-pink-600'
];
const RING_H = 22;   // px per ring in the stack
const BASE_H = 18;   // px of wooden base under the pegs

/** Each peg holds ring sizes bottom to top (1 is the smallest). */
const startPegs = (rings) => [Array.from({ length: rings }, (_, i) => rings - i), [], []];

/**
 * 🧠 Logic & deduction: move the whole tower to the right peg, never a big ring on a small one. By age band
 * (data/bands/towers.js): 2–3 rings for Classes 1–2, 3–4 for 3–5, 4–6 rings and
 * move optimisation for 6–10, and for 11–12 the planning rule "next-door pegs only" (best 3^n − 1) under a move budget.
 */
export default function TowerShift({ onExit }) {
  const progress = useGameProgress('tower-shift');
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const band = progress.ageBand || 'analytical';
  const config = useMemo(() => towerConfig(band, progress.difficulty, progress.levelNo), [band, progress.difficulty, progress.levelNo]);
  const young = band === 'foundation' || band === 'developing';
  const ringH = young ? 30 : RING_H;
  const [started, setStarted] = useState(false);
  const [pegs, setPegs] = useState(() => startPegs(config.rings));
  const [held, setHeld] = useState(null);          // peg index whose top ring is lifted
  const [history, setHistory] = useState([]);      // [from, to] of every move made, for Undo
  const [moves, setMoves] = useState(0);
  const [warn, setWarn] = useState(null);          // { peg, n, text } after an illegal drop
  const [wrong, setWrong] = useState(0);

  const solved = pegs[2].length === config.rings;
  const broke = config.budget !== null && moves >= config.budget && !solved;
  const { seconds, over: timedOut } = useTimedRound(config.seconds, started, solved || broke);
  const over = solved || timedOut || broke;
  const stars = solved ? starsForMoves(moves, config.best, config.adjacent) : 0;
  useRecordStars(progress, over, stars, { correct: solved ? 1 : 0, wrong, hints: 0, score: moves, limitMs: config.seconds * 1000 });
  const left = movesLeft(pegs, config.rings, config.adjacent);

  useEffect(() => {
    if (!warn) return undefined;
    const t = setTimeout(() => setWarn(null), 1400);
    return () => clearTimeout(t);
  }, [warn]);

  const shift = (from, to) => {
    setPegs((p) => {
      const next = p.map((s) => [...s]);
      next[to].push(next[from].pop());
      return next;
    });
  };

  const tapPeg = (i) => {
    if (over) return;
    if (held === null) {
      if (pegs[i].length) setHeld(i);
      return;
    }
    if (held === i) { setHeld(null); return; }  // put it back down
    const ring = pegs[held][pegs[held].length - 1];
    const top = pegs[i][pegs[i].length - 1];
    const tooFar = !legalHop(held, i, config.adjacent);
    if (tooFar || (top !== undefined && top < ring)) {
      sfx.wrong();
      setWrong((n) => n + 1);
      setWarn((w) => ({
        peg: i, n: (w?.n || 0) + 1,
        text: tooFar ? 'Next-door towers only: go through the middle tower.' : young ? 'Big rings can’t go on small rings!' : 'A ring can’t go on a smaller ring.'
      }));
      return;  // still held: pick another peg
    }
    shift(held, i);
    setHistory((h) => [...h, [held, i]]);
    setMoves((m) => m + 1);
    setHeld(null);
  };

  // Undo puts the last ring back and counts as a move: it cannot buy back stars.
  const undo = () => {
    if (over || !history.length) return;
    const [from, to] = history[history.length - 1];
    shift(to, from);
    setHistory((h) => h.slice(0, -1));
    setMoves((m) => m + 1);
    setHeld(null);
  };

  // Keyboard: 1, 2, 3 (or A, S, D) tap the left, middle and right pegs.
  useEffect(() => {
    if (!started || over) return undefined;
    const onKey = (e) => {
      const at = { 1: 0, 2: 1, 3: 2, a: 0, s: 1, d: 2 }[e.key.toLowerCase()];
      if (at !== undefined) tapPeg(at);
      if (e.key === 'Escape') setHeld(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const maxW = 92;   // % of a third, for the largest ring
  const minW = 34;
  const widthOf = (size) => minW + ((maxW - minW) * (size - 1)) / Math.max(1, config.rings - 1);
  const boardH = BASE_H + (config.rings + 2.5) * ringH;
  const ruleLine = config.adjacent ? ' Rings may only move to a next-door tower (left↔middle, middle↔right).' : '';
  const objective = band === 'foundation'
    ? `Move all ${config.rings} rings to the GOAL tower on the right. Tap a tower to pick up its top ring, then tap where it goes. Big rings never go on small rings! Best: ${config.best} moves.`
    : `Move all ${config.rings} rings from the left tower to the right tower. Tap a tower to lift its top ring, then tap another to drop it (or press 1, 2, 3). A ring may never sit on a smaller one.${ruleLine} Best possible: ${config.best} moves.${config.budget ? ` You have ${config.budget} moves at most.` : ''}`;

  return (
    <GameShell
      title="Tower Shift"
      blurb={`Move all ${config.rings} rings to the right tower — never a bigger ring on a smaller one${config.adjacent ? ', next-door towers only' : ''}.`}
      tone="bg-gradient-to-br from-indigo-500 to-sky-600"
      score={moves}
      scoreLabel="Moves"
      seconds={started ? seconds : undefined}
      totalSeconds={config.seconds}
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={
        !started
          ? {
              gameId: progress.gameId,
              level: progress.level,
              objective,
              seconds: config.seconds,
              stars: starsOn(progress.gameId, progress.level),
              onStart: () => setStarted(true)
            }
          : null
      }
      result={
        over
          ? {
              passed: solved,
              stars,
              headline: solved ? `Level ${progress.level} cleared!` : broke ? 'Out of moves' : 'Time’s up',
              detail: solved
                ? `${moves} moves · best possible ${config.best}`
                : `${pegs[2].length} of ${config.rings} rings on the right tower`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={
        <p className="text-center text-sm text-ink-500">
          Undo counts as a move · 3★ at {config.best}, 2★ within {Math.ceil(config.best * (config.adjacent ? 1.15 : 1.5))}
          {config.budget ? ` · limit ${config.budget}` : ''}
        </p>
      }
    >
      {started && !over && (
        <div className="mx-auto max-w-md">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-black text-ink-900 tabular-nums">
              Moves: {moves}{config.budget ? `/${config.budget}` : ''}{' '}
              <span className="text-ink-500">· Best possible: {config.best}{young && moves > 0 ? ` · ${left} to go at best` : ''}</span>
            </p>
            <div className="flex gap-2">
            <button
              type="button"
              onClick={undo}
              disabled={!history.length}
              className={`fp-press rounded-xl bg-surface px-3 text-sm font-black text-ink-900 ring-1 ring-line-200 ring-inset disabled:opacity-40 ${young ? 'min-h-11' : 'min-h-11 sm:min-h-9'}`}
            >
              Undo
            </button>
            </div>
          </div>
          <p className={`mb-2 min-h-5 text-center text-sm font-black ${warn ? 'text-rose-600' : 'text-ink-500'}`} role="status" aria-live="polite">
            {warn
              ? warn.text
              : held !== null
                ? `Ring lifted from the ${PEG_NAMES[held].toLowerCase()} tower — tap where to drop it.`
                : 'Tap a tower to lift its top ring.'}
          </p>
          <div
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-b from-sky-50 to-indigo-100 ring-1 ring-line-200 ring-inset ${warn ? 'gs-wrong' : ''}`}
            style={{ height: boardH }}
          >
            {/* Pegs: the tappable thirds of the board, with a wooden pole each. */}
            {pegs.map((stack, i) => (
              <button
                key={i}
                type="button"
                onClick={() => tapPeg(i)}
                aria-label={`${PEG_NAMES[i]} tower, ${stack.length} ring${stack.length === 1 ? '' : 's'}${stack.length ? `, top ring size ${stack[stack.length - 1]}` : ''}${held === i ? ', ring lifted' : ''}`}
                aria-pressed={held === i}
                className={`absolute top-0 bottom-0 flex justify-center rounded-2xl transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-indigo-500 ${
                  held === i ? 'bg-amber-200/40' : held !== null && legalHop(held, i, config.adjacent) ? 'hover:bg-emerald-200/40' : 'hover:bg-white/40'
                } ${warn?.peg === i ? 'bg-rose-200/50' : ''}`}
                style={{ left: `${(i * 100) / 3}%`, width: `${100 / 3}%` }}
              >
                <span
                  className="absolute w-2.5 rounded-t-full bg-gradient-to-r from-amber-700 via-amber-500 to-amber-800 shadow"
                  style={{ bottom: BASE_H, height: (config.rings + 0.8) * ringH }}
                />
                {i === 2 && <span className="absolute top-1 text-[0.6rem] font-black tracking-widest text-indigo-500 uppercase">Goal{young ? ' 🏁' : ''}</span>}
              </button>
            ))}
            <div className="pointer-events-none absolute inset-x-2 bottom-1 rounded-lg bg-gradient-to-b from-amber-600 to-amber-900 shadow-md" style={{ height: BASE_H - 4 }} />
            {/* Rings: drawn over the pegs, sliding between spots on CSS transitions. */}
            {pegs.flatMap((stack, p) =>
              stack.map((size, h) => {
                const lifted = held === p && h === stack.length - 1;
                const bottom = lifted ? boardH - ringH * 1.6 : BASE_H + h * ringH;
                return (
                  <span
                    key={size}
                    aria-hidden="true"
                    className={`pointer-events-none absolute rounded-full bg-gradient-to-b shadow-md ring-1 ring-black/10 ring-inset transition-all duration-300 ease-out ${RING_TONES[size - 1]} ${lifted ? 'shadow-xl' : ''}`}
                    style={{
                      height: ringH - 3,
                      bottom,
                      width: `${(widthOf(size) * 100) / 300}%`,
                      left: `${((p + 0.5) * 100) / 3}%`,
                      transform: 'translateX(-50%)'
                    }}
                  />
                );
              })
            )}
          </div>
        </div>
      )}
    </GameShell>
  );
}
