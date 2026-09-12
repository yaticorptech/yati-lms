import { useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { between, starsCap, starsFor, starsOn } from './levels';
import useTimedRound from './useTimedRound';
import useRecordStars from './useRecordStars';

const rnd = (n) => Math.floor(Math.random() * n);

const shuffle = (list) => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const label = (h, m) => `${h}:${String(m).padStart(2, '0')}`;
const wrapHour = (h) => ((h - 1 + 12) % 12) + 1;

/**
 * A time, and three others that are the usual misreadings of it: the hands
 * swapped, the hour read from the wrong side of the hour hand, and the
 * minutes off by a tick.
 */
const makeRound = (difficulty) => {
  const h = 1 + rnd(12);
  const m = difficulty === 1 ? [0, 30][rnd(2)] : difficulty === 2 ? rnd(12) * 5 : rnd(60);
  const answer = label(h, m);
  const seen = new Set([answer]);
  const wrongs = [];
  const step = difficulty === 3 ? 1 : 5;
  const candidates = shuffle([
    [wrapHour(h + 1), m],
    [wrapHour(h - 1), m],
    [h, (m + 30) % 60],
    m % 5 === 0 ? [m / 5 || 12, (h % 12) * 5] : [h, (m + step) % 60],
    [h, (m + 60 - step) % 60],
    [h, (m + step) % 60]
  ]);
  for (const [ch, cm] of candidates) {
    if (wrongs.length >= 3) break;
    const text = label(ch, cm);
    if (seen.has(text)) continue;
    seen.add(text);
    wrongs.push(text);
  }
  return { h, m, answer, options: shuffle([answer, ...wrongs]) };
};

const configFor = (difficulty, levelNo) => ({
  seconds: between(60, 45, levelNo),
  target: between(6, 12, levelNo) + (difficulty - 1) * 2
});

/** An analogue face with the hands at the given time. */
function Clock({ h, m }) {
  const hourAngle = (h % 12) * 30 + m * 0.5;
  const minuteAngle = m * 6;
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden>
      <circle cx="60" cy="60" r="56" fill="#fff" stroke="#c7d2fe" strokeWidth="4" />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i * Math.PI) / 6;
        const big = i % 3 === 0;
        return (
          <line
            key={i}
            x1={60 + Math.sin(a) * (big ? 44 : 48)}
            y1={60 - Math.cos(a) * (big ? 44 : 48)}
            x2={60 + Math.sin(a) * 52}
            y2={60 - Math.cos(a) * 52}
            stroke={big ? '#4338ca' : '#a5b4fc'}
            strokeWidth={big ? 3 : 2}
            strokeLinecap="round"
          />
        );
      })}
      {[12, 3, 6, 9].map((n, i) => {
        const a = (i * Math.PI) / 2;
        return (
          <text
            key={n}
            x={60 + Math.sin(a) * 36}
            y={60 - Math.cos(a) * 36 + 4}
            textAnchor="middle"
            fontSize="11"
            fontWeight="800"
            fill="#312e81"
          >
            {n}
          </text>
        );
      })}
      <line x1="60" y1="60" x2="60" y2="32" stroke="#1e1b4b" strokeWidth="5" strokeLinecap="round" transform={`rotate(${hourAngle} 60 60)`} />
      <line x1="60" y1="60" x2="60" y2="18" stroke="#6c3bff" strokeWidth="3.5" strokeLinecap="round" transform={`rotate(${minuteAngle} 60 60)`} />
      <circle cx="60" cy="60" r="3.5" fill="#1e1b4b" />
    </svg>
  );
}

/**
 * 🕒 Numbers & speed: read the clock face and pick the time.
 *
 * Reading an analogue clock is arithmetic in disguise — twelfths, sixtieths
 * and the half-step the hour hand makes between numbers — and it is a skill
 * plenty of adults quietly lack.
 */
export default function ClockRead({ onExit }) {
  const progress = useGameProgress('clock-read');
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const config = configFor(progress.difficulty, progress.levelNo);
  const [round, setRound] = useState(() => makeRound(progress.difficulty));
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState(null);
  const [started, setStarted] = useState(false);
  const { seconds, over } = useTimedRound(config.seconds, started, score >= starsCap(config.target));

  const passed = score >= config.target;
  const stars = over ? starsFor(score, config.target) : 0;
  useRecordStars(progress, over, stars);

  const choose = (text) => {
    if (over || picked !== null) return;
    setPicked(text);
    if (text === round.answer) setScore((s) => s + 1);
    setTimeout(() => {
      setPicked(null);
      setRound(makeRound(progress.difficulty));
    }, 380);
  };

  return (
    <GameShell
      title="Clock Read"
      blurb={`Read the time off the face. Reach ${config.target}.`}
      tone="bg-gradient-to-br from-amber-500 to-orange-600"
      score={score}
      seconds={seconds}
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={
        !started
          ? {
              gameId: progress.gameId,
              level: progress.level,
              objective: `Pick the time the clock shows. Reach ${config.target} correct before the clock runs out.`,
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
              detail: `${score} correct`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={
        <p className="text-center text-sm text-ink-500">
          Short hand for the <strong className="font-black">hour</strong>, long hand for the minutes
        </p>
      }
    >
      {started && !over && (
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto h-40 w-40 sm:h-44 sm:w-44">
            <Clock h={round.h} m={round.m} />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {round.options.map((text) => {
              const show = picked !== null;
              const state =
                show && text === round.answer
                  ? 'bg-emerald-50 text-emerald-800 ring-emerald-400'
                  : show && picked === text
                    ? 'bg-rose-50 text-rose-700 ring-rose-300'
                    : 'bg-surface-50 text-ink-900 ring-line-200 hover:bg-journey-50 hover:ring-journey-300';
              return (
                <button
                  key={text}
                  type="button"
                  onClick={() => choose(text)}
                  className={`fp-press min-h-14 rounded-2xl text-lg font-black ring-1 transition-colors ring-inset tabular-nums ${state}`}
                >
                  {text}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </GameShell>
  );
}
