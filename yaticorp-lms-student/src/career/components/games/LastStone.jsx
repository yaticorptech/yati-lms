import { useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { between, ramp, starsCap, starsFor, starsOn } from './levels';
import useTimedRound from './useTimedRound';
import useRecordStars from './useRecordStars';

const rnd = (n) => Math.floor(Math.random() * n);

/*
 * The trick: whoever leaves a multiple of four stones wins, because the
 * other player's one-to-three can always be answered to make four. The
 * student always moves first from a pile that is NOT a multiple of four, so
 * every game is winnable — by them, if they find the rule.
 */
const startFor = (difficulty) => {
  const [lo, hi] = [[9, 15], [13, 19], [17, 23]][difficulty - 1];
  let n;
  do {
    n = lo + rnd(hi - lo + 1);
  } while (n % 4 === 0);
  return n;
};

const configFor = (difficulty, levelNo) => ({
  // How often the computer plays the winning move rather than a random one.
  skill: Math.min(0.97, 0.35 + ramp(levelNo) * 0.4 + (difficulty - 1) * 0.2),
  seconds: between(90, 70, levelNo),
  target: between(2, 4, levelNo) + (difficulty - 1)
});

/** The computer's move: the winning one when it plays well, any one when it does not. */
const cpuTake = (stones, skill) => {
  const best = stones % 4;
  const max = Math.min(3, stones);
  if (best > 0 && Math.random() < skill) return best;
  return 1 + rnd(max);
};

/**
 * 🪨 Logic & deduction: take one, two or three stones; take the last and win.
 *
 * The oldest strategy game there is, and the cleanest lesson in thinking
 * backwards from the end: the student who works out what to leave, rather
 * than what to take, cannot be beaten.
 */
export default function LastStone({ onExit }) {
  const progress = useGameProgress('last-stone');
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const config = configFor(progress.difficulty, progress.levelNo);
  const [stones, setStones] = useState(() => startFor(progress.difficulty));
  const [turn, setTurn] = useState('you');
  const [verdict, setVerdict] = useState(null);
  const [wins, setWins] = useState(0);
  const [played, setPlayed] = useState(0);
  const [started, setStarted] = useState(false);
  const { seconds, over } = useTimedRound(config.seconds, started, wins >= starsCap(config.target));

  const passed = wins >= config.target;
  const stars = over ? starsFor(wins, config.target) : 0;
  useRecordStars(progress, over, stars);

  const finish = (winner) => {
    setVerdict(winner);
    if (winner === 'you') setWins((w) => w + 1);
    setPlayed((p) => p + 1);
    setTimeout(() => {
      setStones(startFor(progress.difficulty));
      setTurn('you');
      setVerdict(null);
    }, 1100);
  };

  const take = (n) => {
    if (over || turn !== 'you' || verdict || n > stones) return;
    const left = stones - n;
    setStones(left);
    if (left === 0) {
      finish('you');
      return;
    }
    setTurn('cpu');
    setTimeout(() => {
      const reply = cpuTake(left, config.skill);
      const after = left - reply;
      setStones(after);
      if (after === 0) finish('cpu');
      else setTurn('you');
    }, 650);
  };

  return (
    <GameShell
      title="Last Stone"
      blurb={`Take the last stone to win. Win ${config.target} games.`}
      tone="bg-gradient-to-br from-blue-600 to-indigo-800"
      score={wins}
      scoreLabel="Wins"
      seconds={seconds}
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={
        !started
          ? {
              gameId: progress.gameId,
              level: progress.level,
              objective: `Take 1, 2 or 3 stones a turn. Whoever takes the last one wins. Win ${config.target} games before the clock runs out.`,
              seconds: config.seconds,
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
              detail: `${wins} won of ${played} played`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={
        <p className="text-center text-sm text-ink-500">
          Think about what you <strong className="font-black">leave</strong>, not what you take
        </p>
      }
    >
      {started && !over && (
        <div className="mx-auto max-w-md text-center">
          <p className="text-xs font-black tracking-[0.18em] text-ink-400 uppercase">Game {played + 1}</p>
          <p className="mt-1 text-lg font-black text-ink-900 tabular-nums">
            {stones} stone{stones === 1 ? '' : 's'} left
          </p>

          <div className="mx-auto mt-4 flex max-w-xs flex-wrap justify-center gap-2 rounded-2xl bg-surface-50 p-3 ring-1 ring-line-200 ring-inset">
            {Array.from({ length: stones }).map((_, i) => (
              <span
                key={i}
                className="h-7 w-7 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 shadow-sm ring-1 ring-white/70 ring-inset"
              />
            ))}
            {stones === 0 && <span className="text-sm font-bold text-ink-400">Empty</span>}
          </div>

          <p
            className={`mt-4 min-h-6 text-sm font-black ${
              verdict === 'you' ? 'text-emerald-700' : verdict === 'cpu' ? 'text-rose-600' : 'text-ink-500'
            }`}
          >
            {verdict === 'you'
              ? 'You took the last stone — you win!'
              : verdict === 'cpu'
                ? 'The computer took the last stone.'
                : turn === 'you'
                  ? 'Your move.'
                  : 'Thinking…'}
          </p>

          <div className="mt-3 grid grid-cols-3 gap-2.5">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => take(n)}
                disabled={turn !== 'you' || !!verdict || n > stones}
                className="fp-press min-h-14 rounded-2xl bg-surface-50 text-base font-black text-ink-900 ring-1 ring-line-200 transition-colors ring-inset hover:bg-journey-50 hover:ring-journey-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Take {n}
              </button>
            ))}
          </div>
        </div>
      )}
    </GameShell>
  );
}
