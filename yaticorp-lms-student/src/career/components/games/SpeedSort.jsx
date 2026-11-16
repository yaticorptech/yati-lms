import { useState, useEffect } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import useAnswerReveal from './useAnswerReveal';
import { sortConfig, sortBoard } from '../../data/bands/math';

/**
 * What gets sorted, by age band (data/bands/math.js, 2026-11-13): Classes 1–2 three or four small numbers or shapes
 * by size, on big tiles, with a slip costing nothing but the buzz; 3–5 numbers to 100 then 1000, then unit and
 * same-denominator fractions; 6–8 negatives and decimals; 9–10 fractions and decimals mixed; 11–12 fractions,
 * decimals, signed values, powers and roots together. Values are exact rationals — never two that tie.
 */
const OBJECTIVE = {
  foundation: 'Tap from smallest to biggest!',
  developing: 'Tap the numbers from smallest to largest.',
  intermediate: 'Smallest to largest — watch the minus signs and decimals.',
  analytical: 'Smallest to largest — fractions and decimals mixed.',
  advanced: 'Smallest to largest — fractions, decimals, negatives, powers and roots.'
};

/** Text with a/b drawn as a stacked fraction. */
function MathText({ text }) {
  return String(text).split(/(\d+\/\d+)/).map((part, i) => {
    const m = part.match(/^(\d+)\/(\d+)$/);
    if (!m) return <span key={i}>{part}</span>;
    return (
      <span key={i} className="mx-0.5 inline-flex flex-col items-center align-middle text-[0.72em] leading-none" aria-label={`${m[1]} over ${m[2]}`}>
        <span>{m[1]}</span>
        <span className="my-0.5 h-0.5 w-full min-w-[1.1em] rounded bg-current" />
        <span>{m[2]}</span>
      </span>
    );
  });
}

/** A shape tile for the youngest: a circle whose size is its value. */
function Blob({ size }) {
  const r = 10 + size * 6;
  return (
    <svg viewBox="0 0 100 100" className="h-14 w-14" aria-hidden="true">
      <circle cx="50" cy="50" r={r} fill="#f59e0b" stroke="#b45309" strokeWidth="3" />
    </svg>
  );
}

const nameOf = (item) => (item.size ? 'that shape' : item.label);

/** ⚡ Math & speed: tap the values from smallest to largest. */
export default function SpeedSort({ onExit }) {
  const progress = useGameProgress('speed-sort');
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const config = sortConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  const young = config.band === 'foundation';
  const boardMs = config.ms;
  const [board, setBoard] = useState(() => sortBoard(config));
  const [done, setDone] = useState([]); // keys already tapped, in order
  const [cleared, setCleared] = useState(0);
  const [taps, setTaps] = useState({ right: 0, wrong: 0 });
  const { busy, showWrong, toneOf } = useAnswerReveal();
  const [started, setStarted] = useState(false);
  const [played, setPlayed] = useState(0);         // boards finished, cleared or lost
  const [boardAt, setBoardAt] = useState(0);       // when this board appeared
  const [now, setNow] = useState(0);
  const over = played >= config.boards;
  const left = Math.min(boardMs, Math.max(0, boardMs - (now - boardAt)));
  // How the last board went (or why a tap was wrong), shown on top for a moment.
  const [notice, setNotice] = useState(null);    // { kind: 'won' | 'lost' | 'oops', text, at }
  const showNotice = notice && now - notice.at < (notice.kind === 'oops' ? 2600 : 1800);
  const timedOut = started && !over && left <= 0;

  const passed = cleared >= config.target;
  const stars = over ? starsForFixed(cleared, config.target, config.boards) : 0;
  useRecordStars(progress, over, stars, { correct: taps.right, wrong: taps.wrong, hints: 0, score: cleared, limitMs: boardMs * config.boards });

  const nextBoard = (won) => {
    const t = Date.now();
    setNotice(won ? { kind: 'won', text: 'Board cleared — well done!', at: t } : { kind: 'lost', text: 'Time’s up — that board is lost.', at: t });
    if (won) setCleared((n) => n + 1);
    setPlayed((n) => n + 1);
    setBoard(sortBoard(config));
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

  // Ranks run 0…count-1 from smallest, so the one due next is the rank equal to how many are done.
  const due = board.items.find((it) => it.rank === done.length);

  const tap = (item) => {
    if (over || busy || done.includes(item.key)) return;
    if (item.key === due.key) {
      setTaps((t) => ({ ...t, right: t.right + 1 }));
      const nextDone = [...done, item.key];
      if (nextDone.length === board.items.length) nextBoard(true);
      else setDone(nextDone);
      return;
    }
    setTaps((t) => ({ ...t, wrong: t.wrong + 1 }));
    const t = Date.now();
    setNotice({ kind: 'oops', text: young ? `Not yet! Find the smallest one left.` : `${nameOf(due)} comes first — it is smaller than ${nameOf(item)}.`, at: t });
    setNow(t);
    // The youngest keep what they have; everyone else starts the board over (its clock keeps running).
    showWrong(item.key, due.key, config.restartOnWrong ? () => setDone([]) : undefined);
  };

  const secs = Math.round(boardMs / 1000);
  const tone = { won: 'text-emerald-600', lost: 'text-rose-600', oops: 'text-amber-700' };

  return (
    <GameShell
      title="Speed Sort"
      blurb={`Clear ${config.target} of ${config.boards} boards, smallest to largest — ${secs} seconds each.`}
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
              objective: `${OBJECTIVE[config.band]} ${secs} seconds a board.${config.restartOnWrong ? ' A wrong tap restarts the board.' : ''} Clear ${config.target} of ${config.boards}.`,
              seconds: secs,
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
      footer={<p className="text-center text-sm text-ink-500">Board {Math.min(played + 1, config.boards)} of {config.boards} · {board.prompt}</p>}
    >
      {started && !over && (
        <div className="mx-auto mb-4 max-w-md">
          <p className={`mb-2 min-h-5 text-center text-sm font-black ${showNotice ? tone[notice.kind] : ''}`} role="status" aria-live="polite">
            {showNotice ? notice.text : ''}
          </p>
          <div className="h-2.5 overflow-hidden rounded-full bg-ink-900/10" role="progressbar" aria-label="Time left on this board" aria-valuemin={0} aria-valuemax={secs} aria-valuenow={Math.ceil(left / 1000)}>
            <div className={`h-full rounded-full transition-[width] duration-100 ease-linear ${left <= 3000 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${(left / boardMs) * 100}%` }} />
          </div>
          <div className="mt-1 flex items-center justify-between gap-2 text-xs font-black">
            <span className="text-rose-600" aria-live="polite">{left <= 3000 ? 'Time is running out!' : ''}</span>
            <span className={`tabular-nums ${left <= 3000 ? 'text-rose-600' : 'text-ink-500'}`}>{Math.ceil(left / 1000)}s</span>
          </div>
        </div>
      )}
      {started && !over && (
        <div className={`mx-auto grid max-w-md gap-2.5 ${young ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3 sm:grid-cols-4'}`}>
          {board.items.map((item) => {
            const tapped = done.includes(item.key);
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => tap(item)}
                disabled={tapped || busy}
                aria-label={item.size ? `Circle size ${item.size}` : item.label}
                className={`fp-press flex items-center justify-center rounded-2xl font-black tabular-nums ring-1 transition-all ring-inset ${young ? 'min-h-20 text-4xl' : 'min-h-16 text-xl sm:text-2xl'} ${
                  tapped
                    ? `bg-emerald-500 text-white ring-emerald-500 ${busy ? 'opacity-45' : ''}`
                    : `bg-surface text-ink-900 ring-line-200 ${busy ? '' : 'hover:bg-amber-50 hover:ring-amber-300'} ${toneOf(item.key)}`
                }`}
              >
                {item.size ? <Blob size={item.size} /> : <MathText text={item.label} />}
                {tapped && <span className="sr-only"> (done)</span>}
              </button>
            );
          })}
        </div>
      )}
    </GameShell>
  );
}
