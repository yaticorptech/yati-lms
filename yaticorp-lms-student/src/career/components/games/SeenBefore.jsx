import { useEffect, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { between, starsFor, starsOn } from './levels';
import useTimedRound from './useTimedRound';
import useRecordStars from './useRecordStars';

/**
 * 👀 Memory & focus: a set flashes up, then one question — which of these did
 * you just see?
 *
 * Recognition rather than recall, and deliberately so: the set is shown and
 * taken away, so nothing can be compared side by side. The only way through is
 * to actually hold the group in mind for a few seconds.
 */
const SYMBOLS = '🍎🍌🍇🍊🍓🥝🍑🍒🥥🍍🌶️🥕🌽🍄🧄🧅🥦🥑🍆🥔🐝🦋🐞🐢🦊🐼🐨🐧🦉🦆⚽🏀🏈🎾🎱🎯🎲🎸🎺🥁'.match(/./gu);

const pick = (from, n) => {
  const pool = [...from];
  const out = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
};

const configFor = (difficulty, levelNo) => ({
  setSize: between(4, 8, levelNo) + (difficulty - 1),
  showMs: Math.max(900, between(2600, 1500, levelNo) - (difficulty - 1) * 300),
  seconds: between(70, 55, levelNo),
  target: between(6, 14, levelNo) + (difficulty - 1) * 2
});

/** One question: a set to memorise, then four options with one from it. */
const makeRound = (setSize) => {
  const shown = pick(SYMBOLS, setSize);
  const unseen = pick(SYMBOLS.filter((s) => !shown.includes(s)), 3);
  const answer = shown[Math.floor(Math.random() * shown.length)];
  const options = [answer, ...unseen].sort(() => Math.random() - 0.5);
  return { shown, options, answer };
};

export default function SeenBefore({ onExit }) {
  const progress = useGameProgress('seen-before');
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const config = configFor(progress.difficulty, progress.levelNo);
  const [started, setStarted] = useState(false);
  const [round, setRound] = useState(() => makeRound(config.setSize));
  const [showing, setShowing] = useState(true);
  const [score, setScore] = useState(0);
  const [flash, setFlash] = useState(null);
  const [reveal, setReveal] = useState(0);
  const { seconds, over } = useTimedRound(config.seconds, started);

  // The effect only ever hides the set. Showing it again is done where the
  // next round is built, so nothing is set from inside an effect body.
  useEffect(() => {
    if (!started) return undefined;
    const t = setTimeout(() => setShowing(false), config.showMs);
    return () => clearTimeout(t);
  }, [started, reveal, config.showMs]);

  const passed = score >= config.target;
  const stars = over ? starsFor(score, config.target) : 0;
  useRecordStars(progress, over, stars);

  const choose = (symbol) => {
    if (over || showing) return;
    if (symbol === round.answer) {
      setScore((s) => s + 1);
      setFlash('right');
    } else {
      setFlash('wrong');
    }
    setTimeout(() => {
      setFlash(null);
      setRound(makeRound(config.setSize));
      setShowing(true);
      setReveal((n) => n + 1);
    }, 350);
  };

  return (
    <GameShell
      title="Seen Before"
      blurb={`Reach ${config.target} correct before the clock runs out.`}
      tone="bg-gradient-to-br from-indigo-500 to-violet-700"
      score={`${score}/${config.target}`}
      seconds={seconds}
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={
        !started
          ? {
              gameId: progress.gameId,
              level: progress.level,
              objective: `A set flashes up. Then pick the one you saw. Reach ${config.target} correct.`,
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
              detail: `${score} of ${config.target} needed`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={<p className="text-center text-sm text-ink-500">Watch the set, then pick the one you saw</p>}
    >
      {started && !over && (
        <div className="mx-auto flex max-w-lg flex-col items-center gap-5">
          {showing ? (
            <>
              <p className="text-xs font-black tracking-[0.16em] text-indigo-600 uppercase">Memorise</p>
              <div className="flex flex-wrap justify-center gap-2.5">
                {round.shown.map((s, i) => (
                  <span
                    key={`${s}-${i}`}
                    className="animate-pop-in flex h-20 w-20 items-center justify-center rounded-2xl bg-surface text-4xl shadow-card ring-1 ring-line-200 ring-inset"
                    style={{ animationDelay: `${i * 45}ms` }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="text-base font-black text-ink-900 sm:text-lg">Which one did you see?</p>
              <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
                {round.options.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => choose(s)}
                    className={`fp-press flex h-24 w-24 items-center justify-center rounded-3xl text-5xl shadow-card ring-2 transition-all ring-inset hover:-translate-y-1 ${
                      flash === 'right' && s === round.answer
                        ? 'bg-emerald-50 ring-emerald-400'
                        : flash === 'wrong' && s !== round.answer
                          ? 'bg-rose-50 ring-rose-300'
                          : 'bg-surface ring-line-200 hover:ring-indigo-400'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </GameShell>
  );
}
