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

/* A fat tap and a fat potted plant (2026-11-19, the user: "plain, no circle, fat and clearly visible"). */
const TapArt = () => (
  <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden>
    <rect x="17" y="3" width="14" height="6" rx="3" fill="#ef4444" stroke="#7f1d1d" strokeWidth="2" />
    <rect x="21" y="8" width="6" height="8" fill="#94a3b8" stroke="#1e293b" strokeWidth="2" />
    <path d="M4 16 H32 a10 10 0 0 1 10 10 V34 H30 V28 H4 Z" fill="#e2e8f0" stroke="#1e293b" strokeWidth="2.5" strokeLinejoin="round" />
    <rect x="28" y="33" width="16" height="5" rx="2" fill="#94a3b8" stroke="#1e293b" strokeWidth="2" />
    <path d="M36 40 q5 6 0 7 q-5 -1 0 -7 Z" fill="#38bdf8" stroke="#0369a1" strokeWidth="1.5" />
  </svg>
);
const PlantArt = ({ bloom }) => (
  <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden>
    <path d="M24 30 V16" stroke="#166534" strokeWidth="4" strokeLinecap="round" />
    <path d="M24 22 C12 22 8 14 8 8 C18 8 24 13 24 22 Z" fill="#22c55e" stroke="#14532d" strokeWidth="2" strokeLinejoin="round" />
    <path d="M24 18 C36 18 40 11 40 5 C30 5 24 10 24 18 Z" fill="#4ade80" stroke="#14532d" strokeWidth="2" strokeLinejoin="round" />
    {bloom && <g><circle cx="24" cy="12" r="7" fill="#facc15" stroke="#a16207" strokeWidth="2" /><circle cx="24" cy="12" r="3" fill="#92400e" /></g>}
    <path d="M11 30 H37 L33.5 45 H14.5 Z" fill="#ea580c" stroke="#7c2d12" strokeWidth="2.5" strokeLinejoin="round" />
    <rect x="9" y="27" width="30" height="6" rx="2" fill="#f97316" stroke="#7c2d12" strokeWidth="2.5" />
  </svg>
);

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
      dark
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
        /* A full-screen game on a phone (2026-11-19, the user: "like Candy Crush"): pure dark around, one bright board. */
        <div className="mx-auto flex w-full max-w-lg select-none flex-col justify-center gap-4 max-sm:flex-1 max-sm:justify-center">

          {/* The one board: bright against the dark */}
          <div className="relative rounded-[1.4rem] bg-gradient-to-b from-slate-400 to-slate-500 px-8 py-2.5 shadow-[0_0_50px_-14px_rgba(148,163,184,0.8)] ring-2 ring-white/25">
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${p.cols}, 1fr)` }}>
              {tiles.map((t, i) => {
                const isWet = wet.has(i);
                const col = i % p.cols; const row = Math.floor(i / p.cols);
                return (
                  <button key={`${idx}-${i}`} type="button" onClick={() => turn(i)} aria-label={`Pipe ${t.shape}, row ${row + 1}, column ${col + 1}${isWet ? ', water flowing' : ''}`}
                    className={`fp-press relative aspect-square rounded-xl shadow-[inset_0_-3px_0_rgba(0,0,0,0.12)] ring-1 transition ${isWet ? 'bg-gradient-to-br from-sky-100 to-sky-200 ring-sky-400' : 'bg-gradient-to-br from-slate-100 to-slate-200 ring-slate-300'}`}>
                    <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full transition-transform duration-200 ease-out" style={{ transform: `rotate(${spins[i] * 90}deg)` }} aria-hidden>
                      {ARMS[t.shape].map((a) => <path key={a} d={ARM_PATH[a]} stroke="#334155" strokeWidth="30" strokeLinecap="round" />)}
                      {ARMS[t.shape].map((a) => <path key={`w${a}`} d={ARM_PATH[a]} stroke={isWet ? '#0ea5e9' : '#f8fafc'} strokeWidth="17" strokeLinecap="round" className="transition-[stroke] duration-300" />)}
                      <circle cx="50" cy="50" r="13" fill={isWet ? '#38bdf8' : '#cbd5e1'} />
                    </svg>
                    {col === 0 && row === p.source && <span className="pointer-events-none absolute right-full top-1/2 z-10 -mr-1.5 h-11 w-11 -translate-y-1/2 drop-shadow-[0_2px_3px_rgba(0,0,0,0.45)]" role="img" aria-label="Water tap"><TapArt /></span>}
                    {col === p.cols - 1 && row === p.sink && <span className={`pointer-events-none absolute left-full top-1/2 z-10 -ml-1.5 h-11 w-11 -translate-y-1/2 drop-shadow-[0_2px_3px_rgba(0,0,0,0.45)] transition-transform duration-500 ${flowing ? 'scale-125' : ''}`} role="img" aria-label={flowing ? 'Plant in bloom' : 'Thirsty plant'}><PlantArt bloom={flowing} /></span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status */}
          <p className={`rounded-2xl px-4 py-3 text-center text-base font-black ${flowing ? 'gs-rise bg-emerald-400 text-emerald-950' : 'bg-white/10 text-white ring-1 ring-white/15'}`} role="status">
            {flowing ? <>Water is flowing! 🌻 {'⭐'.repeat(pipeStars(p.par, turns))}</> : <>Tap a pipe to turn it · bring water 🚰 to the plant 🌱</>}
          </p>
        </div>
      )}
    </GameShell>
  );
}
