import { useEffect, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { between, starsFor, starsOn } from './levels';
import useRecordStars from './useRecordStars';

const shuffle = (list) => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const configFor = (difficulty, levelNo) => ({
  size: difficulty === 1 ? 3 : difficulty === 2 ? 4 : 5,
  lit: between(3, 6, levelNo) + (difficulty - 1) * 2,
  showMs: between(1600, 900, levelNo),
  rounds: 5,
  target: between(3, 5, levelNo)
});

/** 🧠 Memory & focus: tiles light up, then go dark. Tap the ones that lit. */
export default function GridRecall({ onExit }) {
  const progress = useGameProgress('grid-recall');
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const config = configFor(progress.difficulty, progress.levelNo);
  const cells = config.size * config.size;
  const [started, setStarted] = useState(false);
  const [round, setRound] = useState(0);
  // Every round's lit tiles, drawn once up front, so a round is a lookup.
  const [sets] = useState(() =>
    Array.from({ length: config.rounds }, () => shuffle([...Array(cells).keys()]).slice(0, config.lit))
  );
  const [showing, setShowing] = useState(true);
  const [picked, setPicked] = useState([]);
  const [verdict, setVerdict] = useState(null); // 'right' | 'wrong' while shown
  const [hits, setHits] = useState(0);

  const over = started && round >= config.rounds;
  const lit = sets[Math.min(round, config.rounds - 1)];
  const passed = hits >= config.target;
  const stars = over ? starsFor(hits, config.target) : 0;
  useRecordStars(progress, over, stars);

  // Each round shows its tiles for a moment, then hides them.
  useEffect(() => {
    if (!started || over || !showing) return undefined;
    const t = setTimeout(() => setShowing(false), config.showMs);
    return () => clearTimeout(t);
  }, [started, round, over, showing, config.showMs]);

  const nextRound = () => {
    setRound((r) => r + 1);
    setPicked([]);
    setVerdict(null);
    setShowing(true);
  };

  const tap = (i) => {
    if (showing || verdict || picked.includes(i)) return;
    const next = [...picked, i];
    setPicked(next);
    if (!lit.includes(i)) {
      setVerdict('wrong');
      setTimeout(nextRound, 700);
      return;
    }
    if (next.length === lit.length) {
      setVerdict('right');
      setHits((h) => h + 1);
      setTimeout(nextRound, 600);
    }
  };

  return (
    <GameShell
      title="Grid Recall"
      blurb={`Remember ${config.lit} tiles on a ${config.size}×${config.size} grid.`}
      tone="bg-gradient-to-br from-violet-500 to-purple-700"
      score={hits}
      scoreLabel="Rounds"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={
        !started
          ? {
              gameId: progress.gameId,
              level: progress.level,
              objective: `${config.lit} tiles light up for a moment. Tap exactly those tiles once they go dark. Get ${config.target} of ${config.rounds} rounds right.`,
              stars: starsOn(progress.gameId, progress.level),
              onStart: () => setStarted(true)
            }
          : null
      }
      result={
        over
          ? {
              passed,
              stars,
              headline: passed ? `Level ${progress.level} cleared!` : 'So close',
              detail: `${hits} of ${config.rounds} rounds right`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={
        <p className="text-center text-sm text-ink-500">
          Round {Math.min(round + 1, config.rounds)} of {config.rounds} · {showing ? 'Watch…' : 'Tap the tiles that were lit'}
        </p>
      }
    >
      {started && !over && (
        <div
          className="mx-auto grid gap-2"
          style={{ gridTemplateColumns: `repeat(${config.size}, minmax(0, 1fr))`, maxWidth: config.size * 72 }}
        >
          {[...Array(cells).keys()].map((i) => {
            const isLit = lit.includes(i);
            const isPicked = picked.includes(i);
            const tone = showing
              ? isLit
                ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-md shadow-violet-500/40'
                : 'bg-surface-100'
              : verdict === 'wrong' && isPicked && !isLit
                ? 'bg-rose-400'
                : isPicked
                  ? 'bg-emerald-400'
                  : verdict && isLit
                    ? 'bg-violet-200'
                    : 'bg-surface-100 hover:bg-violet-50';
            return (
              <button
                key={i}
                type="button"
                onClick={() => tap(i)}
                aria-label={`Tile ${i + 1}`}
                className={`aspect-square rounded-xl ring-1 ring-line-200 transition-all ring-inset ${tone}`}
              />
            );
          })}
        </div>
      )}
    </GameShell>
  );
}
