import { useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { makePipePuzzle, pipeConfig, pipeFlows, pipeStars, wetCells } from '../../data/bands/logicNew';

const freshSeed = () => Math.floor(Math.random() * 4294967296);
// Pipe arms at rotation 0 (the tile turns as a whole): N = up, E = right, S = down.
const ARMS = { straight: ['N', 'S'], elbow: ['N', 'E'], tee: ['N', 'E', 'S'] };
const ARM_PATH = { N: 'M50 50 V0', E: 'M50 50 H100', S: 'M50 50 V100', W: 'M50 50 H0' };

/**
 * 🔧 Pipe Flow (2026-11-16; id "constraint-grid", replacing Constraint Grid). Tap tiles to turn them until water runs
 * from the tap to the plant. Water shows where it reaches as you turn. data/bands/logicNew.js builds solvable boards.
 */
export default function PipeFlow({ onExit }) {
  const progress = useGameProgress('constraint-grid', { bands: SECTION_BANDS.smart });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const config = pipeConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  const [puzzles] = useState(() => { const rng = seeded(freshSeed()); return Array.from({ length: config.puzzles }, () => makePipePuzzle(rng, config)); });
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [spins, setSpins] = useState(() => puzzles[0].tiles.map((t) => t.rot)); // keeps counting up, so turns always animate clockwise
  const [turns, setTurns] = useState(0);
  const [earned, setEarned] = useState([]);
  const [flowing, setFlowing] = useState(false);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const p = puzzles[Math.min(idx, puzzles.length - 1)];
  const tiles = p.tiles.map((t, i) => ({ ...t, rot: spins[i] % 4 }));
  const wet = wetCells(p, tiles);
  const max = puzzles.length * 3;
  const pass = Math.ceil(max * 0.55);
  const score = earned.reduce((a, b) => a + b, 0);
  const over = earned.length >= puzzles.length;
  const stars = over ? starsForFixed(score, pass, max) : 0;
  useRecordStars(progress, over, stars, { correct: score, wrong: max - score, hints: 0, score });

  const turn = (i) => {
    if (!started || flowing || over) return;
    const next = spins.map((v, k) => (k === i ? v + 1 : v));
    setSpins(next);
    setTurns((t) => t + 1);
    if (pipeFlows(p, p.tiles.map((t, k) => ({ ...t, rot: next[k] % 4 })))) {
      sfx.right?.();
      setFlowing(true);
      const got = pipeStars(p.par, turns + 1);
      timers.current.push(setTimeout(() => {
        setEarned((e) => [...e, got]);
        if (idx + 1 < puzzles.length) {
          setIdx((n) => n + 1);
          setSpins(puzzles[idx + 1].tiles.map((t) => t.rot));
          setTurns(0);
          setFlowing(false);
        }
      }, 2000));
    }
  };

  const objective = `Tap a pipe to turn it. Join the pipes so water runs from the tap 🚰 to the thirsty plant 🌱. Blue shows where the water reaches. Fewer turns earn more stars — ${puzzles.length} gardens to water.`;

  return (
    <GameShell
      title="Pipe Flow"
      blurb="Turn the pipes and water the plant!"
      tone="bg-gradient-to-br from-cyan-400 to-emerald-600"
      score={`${score}/${max}`}
      scoreLabel="Stars"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) } : null}
      result={over ? {
        passed: score >= pass, stars,
        headline: score >= pass ? `Level ${progress.level} cleared — the garden is blooming!` : 'The plants are still thirsty — try again',
        detail: `${score} of ${max} garden stars`,
        atEnd: progress.atEnd, onNext: progress.advance, onRetry: progress.retry
      } : null}
      footer={<p className="text-sm">Garden {Math.min(idx + 1, puzzles.length)} of {puzzles.length} · turns {turns} (best about {p.par})</p>}
    >
      {started && !over && (
        <div className="mx-auto w-full max-w-lg select-none">
          <div className="relative rounded-[1.75rem] bg-gradient-to-b from-lime-100 to-emerald-200 p-3 shadow-[0_16px_32px_-18px_rgba(5,150,105,0.6)] ring-1 ring-emerald-200 sm:p-4">
            <div className="flex items-stretch gap-1.5">
              {/* Tap side */}
              <div className="relative w-9 shrink-0">
                <span className="absolute -translate-y-1/2 text-3xl" style={{ top: `${((p.source + 0.5) / p.rows) * 100}%` }} aria-label="Water tap">🚰</span>
              </div>
              <div className="grid flex-1 gap-1 rounded-2xl bg-amber-900/15 p-1.5" style={{ gridTemplateColumns: `repeat(${p.cols}, 1fr)` }}>
                {tiles.map((t, i) => {
                  const isWet = wet.has(i);
                  return (
                    <button key={`${idx}-${i}`} type="button" onClick={() => turn(i)} aria-label={`Pipe ${t.shape}, row ${Math.floor(i / p.cols) + 1}, column ${(i % p.cols) + 1}${isWet ? ', water flowing' : ''}`}
                      className="fp-press relative aspect-square rounded-lg bg-gradient-to-br from-amber-50 to-amber-100 shadow-sm ring-1 ring-amber-200 hover:ring-amber-400">
                      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full transition-transform duration-200 ease-out" style={{ transform: `rotate(${spins[i] * 90}deg)` }} aria-hidden>
                        {ARMS[t.shape].map((a) => <path key={a} d={ARM_PATH[a]} stroke="#64748b" strokeWidth="30" strokeLinecap="round" />)}
                        {ARMS[t.shape].map((a) => <path key={`w${a}`} d={ARM_PATH[a]} stroke={isWet ? '#0ea5e9' : '#e2e8f0'} strokeWidth="16" strokeLinecap="round" className="transition-[stroke] duration-300" />)}
                        <circle cx="50" cy="50" r="14" fill={isWet ? '#0ea5e9' : '#cbd5e1'} />
                      </svg>
                    </button>
                  );
                })}
              </div>
              {/* Plant side */}
              <div className="relative w-9 shrink-0">
                <span className={`absolute -translate-y-1/2 text-3xl transition-transform duration-500 ${flowing ? 'scale-150' : ''}`} style={{ top: `${((p.sink + 0.5) / p.rows) * 100}%` }} aria-label={flowing ? 'Plant in bloom' : 'Thirsty plant'}>{flowing ? '🌻' : '🌱'}</span>
              </div>
            </div>
            {flowing && (
              <p className="gs-rise mt-3 text-center text-base font-black text-emerald-800" role="status">
                Water is flowing! 🌻 {'⭐'.repeat(pipeStars(p.par, turns))}
              </p>
            )}
          </div>
          <p className="mt-3 text-center text-sm font-bold text-slate-500">Tap a pipe to turn it a quarter turn.</p>
        </div>
      )}
    </GameShell>
  );
}
