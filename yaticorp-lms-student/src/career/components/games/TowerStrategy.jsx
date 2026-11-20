import { useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import ringRed from '../../assets/tower/ring-red.png';
import ringBlue from '../../assets/tower/ring-blue.png';
import ringYellow from '../../assets/tower/ring-yellow.png';
import { canMove, makeTowerPuzzle, moveBlock, towerConfig, towersSolved } from '../../data/bands/logicNew';

const freshSeed = () => Math.floor(Math.random() * 4294967296);
const SLACK = 4; // a puzzle counts as "solved well" within the best number of moves + SLACK
// The rings are cut from the user's own picture (2026-11-19, "same as the uploaded image"): assets/tower/ring-*.png.
const RING_IMG = [ringRed, ringBlue, ringYellow];
// The scene, in SVG units.
const VW = 300;
const PEG_X = [52, 150, 248];
const BOARD_Y = 300; // top of the board
const RING_H = 30; // the picture's ring is 146 × 51
const RING_STEP = 21;
const RING_RX = 43;
const pegTop = (cap) => BOARD_Y - cap * RING_STEP - 34;
const LIFT_GAP = 30; // a lifted ring floats this far above the peg's top

/**
 * 🧱 Tower Strategy (2026-11-16; colour sorting again from 2026-11-19 — the user tried Tower of Hanoi for a day and
 * asked for this back). Three pegs of mixed coloured rings. Tap a peg to lift its top ring, tap the NEXT peg to drop
 * it: rings move only 1 ⇄ 2 and 2 ⇄ 3, so a ring going from peg 1 to peg 3 must pass through the middle. Sort so
 * each peg holds one colour. Scored like the other games: puzzles solved well (within a few moves of the best).
 */
export default function TowerStrategy({ onExit }) {
  const progress = useGameProgress('tower-strategy', { bands: SECTION_BANDS.smart });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const config = towerConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  const [puzzles] = useState(() => { const rng = seeded(freshSeed()); return Array.from({ length: config.puzzles }, () => makeTowerPuzzle(rng, config)); });
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [towers, setTowers] = useState(() => puzzles[0].towers);
  const [moves, setMoves] = useState(0);
  const [lifted, setLifted] = useState(null);
  const [shake, setShake] = useState(null);
  const [warn, setWarn] = useState(null);
  const [won, setWon] = useState(false);
  const [results, setResults] = useState([]); // true = solved well
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const p = puzzles[Math.min(idx, puzzles.length - 1)];
  const rules = { ...config, strict: p.strict };
  const solved = results.filter(Boolean).length;
  const pass = Math.ceil(puzzles.length * 0.67);
  const over = results.length >= puzzles.length;
  const stars = over ? starsForFixed(solved, pass, puzzles.length) : 0;
  useRecordStars(progress, over, stars, { correct: solved, wrong: puzzles.length - solved, hints: 0, score: solved });

  const tapPeg = (t) => {
    if (!started || won || over) return;
    if (lifted === null) { if (towers[t].length) setLifted(t); return; }
    if (lifted === t) { setLifted(null); return; }
    if (!canMove(towers, lifted, t, rules)) {
      setShake(t);
      sfx.wrong?.();
      setWarn(Math.abs(lifted - t) !== 1 ? 'No jumping! Go through the middle peg.' : 'That peg is full.');
      timers.current.push(setTimeout(() => { setShake(null); setWarn(null); }, 1400));
      return;
    }
    const next = moveBlock(towers, lifted, t);
    const n = moves + 1;
    setTowers(next);
    setMoves(n);
    setLifted(null);
    if (towersSolved(next, config.per)) {
      sfx.right?.();
      setWon(true);
      const well = n <= p.par + SLACK;
      timers.current.push(setTimeout(() => {
        setResults((r) => [...r, well]);
        if (idx + 1 < puzzles.length) {
          setIdx((i) => i + 1);
          setTowers(puzzles[idx + 1].towers);
          setMoves(0);
          setWon(false);
        }
      }, 1800));
    }
  };

  const objective = `Three pegs of mixed coloured rings. Tap a peg to lift its top ring, then tap the NEXT peg to drop it. Rings cannot jump: from peg 1 to peg 3 (or 3 to 1) they must pass through the middle peg. Sort them so each peg holds ONE colour. Solve each puzzle in as few moves as you can — ${puzzles.length} puzzles.`;

  return (
    <GameShell
      dark
      title="Tower Strategy"
      blurb="Sort the rings: one colour on each peg."
      tone="bg-gradient-to-br from-violet-400 to-amber-300"
      score={`${solved}/${puzzles.length}`}
      scoreLabel="Solved"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) } : null}
      result={over ? {
        passed: solved >= pass, stars,
        headline: solved >= pass ? `Level ${progress.level} cleared — master planner!` : 'Plan fewer moves and try again',
        detail: `${solved} of ${puzzles.length} puzzles solved in good time`,
        atEnd: progress.atEnd, onNext: progress.advance, onRetry: progress.retry
      } : null}
      footer={<p className="text-sm font-bold text-indigo-900/80">Goal: one colour on each peg. Rings move only to the next peg.</p>}
    >
      {started && !over && (() => {
        const top = pegTop(config.cap);
        const vTop = top - LIFT_GAP - RING_H; // the view starts above a lifted ring
        const ringY = (k) => BOARD_Y - RING_H + 4 - k * RING_STEP; // top edge of ring k on a peg
        return (
          /* Pure dark, full screen on a phone (2026-11-19, the user: "like Pipe Flow"); pegs, board and rings are drawn. */
          <div className="mx-auto flex w-full max-w-xl select-none flex-col justify-center gap-4 max-sm:flex-1 max-sm:justify-center">

            <div className="relative w-full">
              <svg viewBox={`0 ${vTop} ${VW} ${BOARD_Y + 34 - vTop}`} className="block w-full" role="group" aria-label="Three pegs with coloured rings">
                <defs>
                  <linearGradient id="ts-wood" x1="0" x2="1"><stop offset="0" stopColor="#5a2a10" /><stop offset="0.35" stopColor="#a85a26" /><stop offset="0.55" stopColor="#c9783a" /><stop offset="1" stopColor="#6b3414" /></linearGradient>
                  <linearGradient id="ts-board" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#b5652b" /><stop offset="0.35" stopColor="#8a4519" /><stop offset="1" stopColor="#4a220b" /></linearGradient>
                  <linearGradient id="ts-gold" x1="0" x2="1"><stop offset="0" stopColor="#a16207" /><stop offset="0.45" stopColor="#fde68a" /><stop offset="1" stopColor="#b45309" /></linearGradient>
                </defs>

                {/* The board */}
                <ellipse cx={VW / 2} cy={BOARD_Y + 30} rx="150" ry="6" fill="#f59e0b" opacity="0.18" />
                <rect x="2" y={BOARD_Y} width={VW - 4} height="28" rx="9" fill="url(#ts-board)" />
                <rect x="6" y={BOARD_Y + 2} width={VW - 12} height="5" rx="2.5" fill="#e0a063" opacity="0.55" />

                {/* Pegs, with a glow where the ring can drop / where a colour is sorted */}
                {towers.map((t, i) => {
                  const canDrop = lifted !== null && lifted !== i && canMove(towers, lifted, i, rules);
                  const pure = won || (lifted !== i && t.length === config.per && t.every((c) => c === t[0]));
                  return (
                    <g key={i}>
                      {(canDrop || pure) && <rect x={PEG_X[i] - 14} y={top - 6} width="28" height={BOARD_Y - top + 6} rx="14" fill={canDrop ? '#ffffff' : '#34d399'} opacity="0.28" style={{ filter: 'blur(6px)' }} />}
                      <rect x={PEG_X[i] - 6} y={top} width="12" height={BOARD_Y - top + 2} fill="url(#ts-wood)" />
                    </g>
                  );
                })}

                {/* Rings */}
                {towers.map((t, i) => t.map((c, k) => {
                  const up = k === t.length - 1 && lifted === i;
                  const y = up ? top - LIFT_GAP - RING_H + 4 : ringY(k);
                  return (
                    /* Placed with the SVG's own transform (not CSS): the same in every browser and under the desktop zoom. */
                    <g key={`${i}-${k}`} transform={`translate(${PEG_X[i]} ${y})`} className={up ? 'ts-float' : ''}>
                      <image href={RING_IMG[c]} x={-RING_RX} y="0" width={RING_RX * 2} height={RING_H} preserveAspectRatio="none" />
                    </g>
                  );
                }))}

                {/* Each peg again, above its top ring (so the ring sits around the peg), and its gold cap */}
                {towers.map((t, i) => {
                  const n = lifted === i ? t.length - 1 : t.length;
                  const to = n > 0 ? ringY(n - 1) + 9 : BOARD_Y;
                  return (
                    <g key={i}>
                      {n > 0 && <rect x={PEG_X[i] - 6} y={top} width="12" height={Math.max(0, to - top)} fill="url(#ts-wood)" />}
                      {n > 0 && <ellipse cx={PEG_X[i]} cy={to} rx="6" ry="2" fill="#6b3414" />}
                      <rect x={PEG_X[i] - 7.5} y={top - 9} width="15" height="11" rx="4.5" fill="url(#ts-gold)" />
                      <ellipse cx={PEG_X[i] - 2} cy={top - 6} rx="2.2" ry="1.4" fill="#fff" opacity="0.8" />
                    </g>
                  );
                })}
              </svg>
              {towers.map((t, i) => (
                <button key={i} type="button" onClick={() => tapPeg(i)} aria-label={`Peg ${i + 1}: ${t.length} rings${lifted === i ? ', top ring lifted' : ''}`}
                  className={`absolute top-0 z-10 h-full touch-manipulation rounded-2xl ${shake === i ? 'gs-wrong bg-rose-500/15' : ''}`} style={{ left: `${i * 33.33}%`, width: '33.34%' }} />
              ))}
            </div>

            <p className={`rounded-2xl px-4 py-3 text-center text-base font-black ${won ? 'gs-rise bg-emerald-400 text-emerald-950' : warn ? 'bg-rose-500 text-white' : 'bg-white/10 text-white ring-1 ring-white/15'}`} role="status" aria-live="polite">
              {won ? `Sorted in ${moves} moves! 🎉` : warn || (lifted === null ? 'One colour on each peg · tap a peg to lift its top ring' : 'Tap the NEXT peg to drop it · no jumping over the middle')}
            </p>
          </div>
        );
      })()}
    </GameShell>
  );
}
