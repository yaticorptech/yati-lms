import { useState, useEffect } from 'react';
import GameShell from './GameShell';
import useGameProgress, { between, starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import useAnswerReveal from './useAnswerReveal';

const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const shuffle = (list) => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/** A board of distinct numbers, scattered. */
const makeBoard = (count, max) => {
  const set = new Set();
  while (set.size < count) set.add(rnd(1, max));
  return shuffle([...set]).map((value, i) => ({ value, key: `${value}-${i}` }));
};

/**
 * Ten seconds a board, on a bar above it (asked 2026-11-05, in place of one
 * clock for the level): run out and the board is lost and the next one comes.
 * A level is a fixed run of boards; clear enough of them to pass.
 */
const BOARD_MS = 10000;

const configFor = (difficulty, levelNo) => ({
  // Few enough numbers to sort in ten seconds, even at the top.
  count: between(5, 8, levelNo) + (difficulty - 1),
  max: between(20, 99, levelNo) * difficulty,
  target: between(3, 6, levelNo) + (difficulty - 1),
  boards: between(5, 8, levelNo) + (difficulty - 1)
});

/** ⚡ Math & speed: tap the numbers from smallest to largest. */
export default function SpeedSort({ onExit }) {
  const progress = useGameProgress('speed-sort');
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const config = configFor(progress.difficulty, progress.levelNo);
  const [board, setBoard] = useState(() => makeBoard(config.count, config.max));
  const [done, setDone] = useState([]); // values already tapped, in order
  const [cleared, setCleared] = useState(0);
  const { busy, showWrong, toneOf } = useAnswerReveal();
  const [started, setStarted] = useState(false);
  const [played, setPlayed] = useState(0);         // boards finished, cleared or lost
  const [boardAt, setBoardAt] = useState(0);       // when this board appeared
  const [now, setNow] = useState(0);
  const over = played >= config.boards;
  const left = Math.min(BOARD_MS, Math.max(0, BOARD_MS - (now - boardAt)));
  // How the last board went, shown on top for a moment while the next one is already running.
  const [notice, setNotice] = useState(null);    // { kind: 'won' | 'lost', at }
  const showNotice = notice && now - notice.at < 1800;
  const timedOut = started && !over && left <= 0;

  const passed = cleared >= config.target;
  const stars = over ? starsForFixed(cleared, config.target, config.boards) : 0;
  useRecordStars(progress, over, stars);

  const nextBoard = (won) => {
    const t = Date.now();
    setNotice({ kind: won ? 'won' : 'lost', at: t });
    if (won) setCleared((n) => n + 1);
    setPlayed((n) => n + 1);
    setBoard(makeBoard(config.count, config.max));
    setDone([]);
    setBoardAt(t);
    setNow(t);
  };

  useEffect(() => {
    if (!started || over) return undefined;
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, [started, over]);

  // Out of time: the board is lost and the next one comes at once.
  useEffect(() => {
    if (timedOut) nextBoard(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timedOut]);

  const remaining = board.filter((c) => !done.includes(c.value)).map((c) => c.value);
  const nextValue = Math.min(...remaining);

  const tap = (value) => {
    if (over || busy || done.includes(value)) return;
    if (value === nextValue) {
      const nextDone = [...done, value];
      if (nextDone.length === board.length) {
        nextBoard(true);
      } else {
        setDone(nextDone);
      }
    } else {
      // Start the board over: a wrong tap costs time off its ten seconds.
      // First the buzz, the tap red and the number that was due green, for a moment (the board clock keeps running).
      showWrong(value, nextValue, () => setDone([]));
    }
  };

  return (
    <GameShell
      title="Speed Sort"
      blurb={`Clear ${config.target} of ${config.boards} boards, smallest to largest — 10 seconds each.`}
      tone="bg-gradient-to-br from-amber-500 to-red-600"
      score={cleared}
      scoreLabel="Boards"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={
        !started
          ? {
              gameId: progress.gameId,
              level: progress.level,
              objective: `Tap every number from smallest to largest. Each board has 10 seconds — run out and it is lost. A wrong tap restarts the board. Clear ${config.target} of ${config.boards}.`,
              seconds: BOARD_MS / 1000,
              stars: starsOn(progress.gameId, progress.level),
              onStart: () => {
                const t = Date.now();
                setBoardAt(t);
                setNow(t);
                setStarted(true);
              }
            }
          : null
      }
      result={
        over
          ? {
              passed,
              stars,
              headline: passed ? `Level ${progress.level} cleared!` : 'So close',
              detail: `${cleared} of ${config.boards} boards cleared`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={<p className="text-center text-sm text-ink-500">Board {Math.min(played + 1, config.boards)} of {config.boards} · next up: the smallest number still on the board</p>}
    >
      {started && !over && (
        <div className="mx-auto mb-4 max-w-md">
          <p className={`mb-2 min-h-5 text-center text-sm font-black ${showNotice ? (notice.kind === 'won' ? 'text-emerald-600' : 'text-rose-600') : ''}`} role="status" aria-live="polite">
            {showNotice ? (notice.kind === 'won' ? 'Board cleared — well done! Keep the pace.' : 'Time’s up — that board is lost. Stay sharp on this one.') : ''}
          </p>
          <div className="h-2.5 overflow-hidden rounded-full bg-ink-900/10" role="progressbar" aria-label="Time left on this board" aria-valuemin={0} aria-valuemax={10} aria-valuenow={Math.ceil(left / 1000)}>
            <div className={`h-full rounded-full transition-[width] duration-100 ease-linear ${left <= 3000 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${(left / BOARD_MS) * 100}%` }} />
          </div>
          <div className="mt-1 flex items-center justify-between gap-2 text-xs font-black">
            <span className="text-rose-600" aria-live="polite">{left <= 3000 ? 'Time is running out — finish this board!' : ''}</span>
            <span className={`tabular-nums ${left <= 3000 ? 'text-rose-600' : 'text-ink-500'}`}>{Math.ceil(left / 1000)}s</span>
          </div>
        </div>
      )}
      {started && !over && (
        <div className="mx-auto grid max-w-md grid-cols-3 gap-2.5 sm:grid-cols-4">
          {board.map((cell) => {
            const tapped = done.includes(cell.value);
            return (
              <button
                key={cell.key}
                type="button"
                onClick={() => tap(cell.value)}
                disabled={tapped || busy}
                className={`fp-press min-h-16 rounded-2xl text-2xl font-black tabular-nums ring-1 transition-all ring-inset ${
                  tapped
                    ? `bg-emerald-500 text-white ring-emerald-500 ${busy ? 'opacity-45' : ''}`
                    : `bg-surface text-ink-900 ring-line-200 ${busy ? '' : 'hover:bg-amber-50 hover:ring-amber-300'} ${toneOf(cell.value)}`
                }`}
              >
                {cell.value}
              </button>
            );
          })}
        </div>
      )}
    </GameShell>
  );
}
