import { useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { canMove, makeTowerPuzzle, moveBlock, towerConfig, towersSolved } from '../../data/bands/logicNew';

const freshSeed = () => Math.floor(Math.random() * 4294967296);
const RING = ['#ef4444', '#3b82f6', '#facc15'];
const RING_DARK = ['#b91c1c', '#1d4ed8', '#ca8a04'];
const RING_LIGHT = ['#fecaca', '#bfdbfe', '#fef9c3'];
const SLACK = 4; // a puzzle counts as "solved well" within the best number of moves + SLACK
// The scene picture's size and where its pegs stand, in percent (measured from the picture).
const SCENE_W = 944;
const SCENE_H = 564;
const PEG_X = [20.76, 49.84, 79.34]; // peg centres, % of width
const PEG_TOP = 34.2; // top of the pegs, % of height
const BOARD_Y = 87.6; // top of the board, % of height
const RING_W = 16; // a ring's width, % of the scene's width
const RING_STEP = 6.6; // one ring above the next, % of height
const RING_BOTTOM = 84; // centre of the lowest ring, % of height
const LIFT_Y = 27; // a lifted ring floats here, above the pegs

/**
 * 🧱 Tower Strategy (2026-11-16, the user's design: a wooden board with three pegs and flat rings on a soft scene).
 * Tap a peg to lift its top ring, tap the NEXT peg to drop it (1 ⇄ 2, 2 ⇄ 3). Sort so each peg holds one colour.
 * Scored like the other games: puzzles solved well (within a few moves of the best) out of the level's puzzles.
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
      setWarn(Math.abs(lifted - t) !== 1 ? 'Rings move only to the next peg!' : 'That peg is full.');
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

  const objective = `Three pegs of mixed coloured rings. Tap a peg to lift its top ring, then tap the NEXT peg to drop it — rings move only 1 ⇄ 2 or 2 ⇄ 3. Sort them so each peg holds ONE colour. Solve each puzzle in as few moves as you can — ${puzzles.length} puzzles.`;

  return (
    <GameShell
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
      {started && !over && (
        <div className="mx-auto w-full max-w-3xl select-none">
          {/* The scene is the user's own picture (public/games/smart/tower-scene.jpg: its rings removed); the rings are
              drawn over its pegs, at the pegs' places in the picture (percent of its width and height). */}
          <div className="relative w-full overflow-hidden rounded-[1.75rem] shadow-[0_16px_36px_-20px_rgba(109,40,217,0.45)]"
            style={{ aspectRatio: `${SCENE_W} / ${SCENE_H}`, backgroundImage: 'url(/games/smart/tower-scene.jpg)', backgroundSize: '100% 100%' }}>
            <p className={`absolute inset-x-0 top-[5%] z-20 text-center text-sm font-black sm:text-base ${warn ? 'text-rose-600' : 'text-violet-900/75'}`} role="status" aria-live="polite">
              {won ? `Sorted in ${moves} moves! 🎉` : warn || (lifted === null ? 'Tap a peg to lift its top ring' : 'Tap the next peg to drop it')}
            </p>

            {towers.map((t, i) => {
              const isLifted = lifted === i;
              const canDrop = lifted !== null && lifted !== i && canMove(towers, lifted, i, rules);
              const pure = t.length === config.per && t.every((c) => c === t[0]);
              return (
                <div key={i}>
                  {/* A soft glow behind a peg that can take the ring, or a sorted one */}
                  {(canDrop || pure || won) && (
                    <span aria-hidden className="absolute rounded-full blur-md" style={{
                      left: `${PEG_X[i] - 3}%`, width: '6%', top: `${PEG_TOP}%`, height: `${BOARD_Y - PEG_TOP}%`,
                      background: canDrop ? 'rgba(255,255,255,0.75)' : 'rgba(52,211,153,0.55)'
                    }} />
                  )}
                  {t.map((c, k) => {
                    const up = k === t.length - 1 && isLifted;
                    const centre = up ? LIFT_Y : RING_BOTTOM - k * RING_STEP;
                    return <Ring key={k} colour={c} x={PEG_X[i]} y={centre} lifted={up} />;
                  })}
                  <button type="button" onClick={() => tapPeg(i)} aria-label={`Peg ${i + 1}: ${t.length} rings${isLifted ? ', top ring lifted' : ''}`}
                    className={`absolute z-10 h-full ${shake === i ? 'gs-wrong' : ''}`} style={{ left: `${i * 33.33}%`, width: '33.34%', top: 0 }} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </GameShell>
  );
}

/**
 * A thin round ring seen a little from above, like the rings in the picture: a coloured band with a light top edge.
 * The peg is drawn over the back half of the band, so the ring sits around the peg.
 */
function Ring({ colour, x, y, lifted }) {
  const [main, dark, light] = [RING[colour], RING_DARK[colour], RING_LIGHT[colour]];
  return (
    <svg viewBox="0 0 160 40" aria-hidden className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 transition-[top] duration-200 ease-out ${lifted ? 'drop-shadow-[0_6px_6px_rgba(60,30,10,0.35)]' : 'drop-shadow-[0_2px_2px_rgba(60,30,10,0.35)]'}`}
      style={{ left: `${x}%`, top: `${y}%`, width: `${RING_W}%` }}>
      <ellipse cx="80" cy="21" rx="73" ry="13" fill="none" stroke={dark} strokeWidth="11" />
      <ellipse cx="80" cy="19" rx="73" ry="13" fill="none" stroke={main} strokeWidth="9" />
      <path d="M12 16 A73 13 0 0 1 148 16" fill="none" stroke={light} strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
      {/* the peg in front of the ring's back half (hidden while the ring is lifted off the peg) */}
      {!lifted && <rect x="67" y="0" width="26" height="19" fill="url(#ts-peg)" />}
      <defs>
        <linearGradient id="ts-peg" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#7a3f17" /><stop offset="0.4" stopColor="#b8672c" /><stop offset="0.55" stopColor="#d48a4a" /><stop offset="1" stopColor="#9a5524" />
        </linearGradient>
      </defs>
    </svg>
  );
}
