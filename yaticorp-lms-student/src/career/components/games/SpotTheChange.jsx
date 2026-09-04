import { useState, useEffect } from 'react';
import GameShell from './GameShell';
import useGameProgress, { between, starsFor, starsOn } from './levels';
import useRecordStars from './useRecordStars';

const COLOURS = ['bg-rose-400', 'bg-sky-400', 'bg-emerald-400', 'bg-amber-300', 'bg-violet-400', 'bg-orange-400'];
const rnd = (n) => Math.floor(Math.random() * n);

const makeGrid = (size, palette) =>
  Array.from({ length: size * size }, () => COLOURS[rnd(palette)]);

/** Change exactly one tile, and say which. */
const mutate = (grid, palette) => {
  const at = rnd(grid.length);
  const next = [...grid];
  do {
    next[at] = COLOURS[rnd(palette)];
  } while (next[at] === grid[at]);
  return { grid: next, at };
};

const configFor = (difficulty, levelNo) => ({
  size: Math.min(5, 3 + Math.floor((levelNo - 1) / 5) + (difficulty - 1)),
  palette: Math.min(6, 3 + (difficulty - 1)),
  showMs: Math.max(600, between(2400, 1200, levelNo) - (difficulty - 1) * 300),
  rounds: 5
});

/**
 * 👁️ Memory & focus: one tile changes while the grid is hidden. Which one?
 *
 * Change blindness rather than recall — you are holding a whole scene, not a
 * list, which is a different job from the other memory games here.
 */
export default function SpotTheChange({ onExit }) {
  const progress = useGameProgress('spot-the-change');
  return (
    <Round
      key={`${progress.level}-${progress.attempt}`}
      progress={progress}
      onExit={onExit}
    />
  );
}

function Round({ progress, onExit }) {
  const [started, setStarted] = useState(false);
  const config = configFor(progress.difficulty, progress.levelNo);
  const [grid, setGrid] = useState(() => makeGrid(config.size, config.palette));
  const [changed, setChanged] = useState(null);
  const [phase, setPhase] = useState('study'); // study | guess | reveal
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState(null);

  // The reveal is scheduled by an effect rather than state being set inside
  // one: `phase` drives it, and only the timer callback writes state.
  useEffect(() => {
    // The tile changed behind the intro panel, so the round was already lost
    // by the time the student pressed Start.
    if (!started || phase !== 'study') return undefined;
    const t = setTimeout(() => {
      const next = mutate(grid, config.palette);
      setGrid(next.grid);
      setChanged(next.at);
      setPhase('guess');
    }, config.showMs);
    return () => clearTimeout(t);
  }, [started, phase, grid, config.showMs, config.palette]);

  const done = round > config.rounds;
  const passed = score >= Math.ceil(config.rounds * 0.6);
  const finishedRound = done;
  const stars = finishedRound ? starsFor(score, Math.ceil(config.rounds * 0.6), false) : 0;
  useRecordStars(progress, finishedRound, stars);

  const choose = (index) => {
    if (phase !== 'guess') return;
    setPicked(index);
    if (index === changed) setScore((s) => s + 1);
    setPhase('reveal');
  };

  const nextRound = () => {
    setPicked(null);
    setChanged(null);
    setGrid(makeGrid(config.size, config.palette));
    setRound((r) => r + 1);
    setPhase('study');
  };

  return (
    <GameShell
      title="Spot the Change"
      blurb={`One tile changes each round. Get ${Math.ceil(config.rounds * 0.6)} of ${config.rounds}.`}
      tone="bg-gradient-to-br from-purple-500 to-indigo-700"
      score={`${score}/${config.rounds}`}
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={
        !started
          ? {
              gameId: progress.gameId,
              level: progress.level,
              objective: `Spot ${Math.ceil(config.rounds * 0.6)} of ${config.rounds} changes.`,
              stars: starsOn(progress.gameId, progress.level),
              onStart: () => setStarted(true)
            }
          : null
      }
      result={
        finishedRound
          ? {
              passed,
              stars,
              headline: passed ? `Level ${progress.level} cleared!` : 'So close',
              detail: `${score} of ${config.rounds} spotted`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={
        <p className="text-center text-sm text-ink-500">
          {phase === 'study'
            ? 'Study the grid…'
            : phase === 'guess'
              ? 'One tile changed — tap it'
              : picked === changed
                ? '✅ That was the one'
                : '❌ The outlined tile was the change'}
        </p>
      }
    >
      {started && !done && (
        <div className="mx-auto max-w-xs">
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${config.size}, minmax(0, 1fr))` }}
          >
            {grid.map((colour, i) => (
              <button
                key={i}
                type="button"
                onClick={() => choose(i)}
                disabled={phase !== 'guess'}
                aria-label={`Tile ${i + 1}`}
                className={`aspect-square rounded-xl transition-all ${colour} ${
                  phase === 'reveal' && i === changed ? 'ring-4 ring-ink-900' : ''
                } ${phase === 'reveal' && i === picked && i !== changed ? 'opacity-40' : ''}`}
              />
            ))}
          </div>

          {phase === 'reveal' && (
            <button
              type="button"
              onClick={nextRound}
              className="fp-press mx-auto mt-5 block min-h-11 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 px-6 text-sm font-black text-white"
            >
              {round === config.rounds ? 'See result' : `Round ${round + 1}`}
            </button>
          )}
        </div>
      )}
    </GameShell>
  );
}
