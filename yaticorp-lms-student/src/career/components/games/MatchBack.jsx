import { useState } from 'react';
import { Check, X } from 'lucide-react';
import GameShell from './GameShell';
import useGameProgress, { between, starsCap, starsFor, starsOn } from './levels';
import useTimedRound from './useTimedRound';
import useRecordStars from './useRecordStars';

/* Few enough letters that a match comes round often, and none that look
   alike on a screen. */
const LETTERS = ['A', 'K', 'M', 'R', 'T', 'X'];

const rnd = (n) => Math.floor(Math.random() * n);

/**
 * The next letter in the stream. Roughly two in five repeat the one `back`
 * steps ago, so both answers stay live and neither can be given on autopilot.
 */
const nextLetter = (seq, back) => {
  const target = seq[seq.length - back];
  if (target !== undefined && Math.random() < 0.4) return target;
  let pick;
  do {
    pick = LETTERS[rnd(LETTERS.length)];
  } while (pick === target && LETTERS.length > 1);
  return pick;
};

const configFor = (difficulty, levelNo) => ({
  // How far back to compare: one step in the first band, two, then three.
  back: difficulty,
  seconds: between(50, 40, levelNo),
  target: between(8, 18, levelNo) + (difficulty - 1) * 2
});

/**
 * 🔁 Memory & focus: is this letter the same as the one N steps back?
 *
 * The n-back task, which is the closest thing there is to a pure working
 * memory exercise — each answer needs the last few letters held in mind
 * while a new one arrives to push them along.
 */
export default function MatchBack({ onExit }) {
  const progress = useGameProgress('match-back');
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const config = configFor(progress.difficulty, progress.levelNo);
  const [seq, setSeq] = useState(() => [LETTERS[rnd(LETTERS.length)]]);
  const [score, setScore] = useState(0);
  const [flash, setFlash] = useState(null);
  const [started, setStarted] = useState(false);
  const { seconds, over } = useTimedRound(config.seconds, started, score >= starsCap(config.target));

  const passed = score >= config.target;
  const stars = over ? starsFor(score, config.target) : 0;
  useRecordStars(progress, over, stars);

  const current = seq[seq.length - 1];
  // The first `back` letters have nothing to be compared with: they are
  // simply shown, and the student moves on when they have them.
  const warmingUp = seq.length <= config.back;

  const advance = () => setSeq((s) => [...s, nextLetter(s, config.back)]);

  const answer = (same) => {
    if (over || flash) return;
    const right = (current === seq[seq.length - 1 - config.back]) === same;
    if (right) setScore((s) => s + 1);
    setFlash(right ? 'right' : 'wrong');
    setTimeout(() => {
      setFlash(null);
      advance();
    }, 240);
  };

  const backWord = ['', 'one', 'two', 'three'][config.back] || config.back;

  return (
    <GameShell
      title="Match Back"
      blurb={`Same as ${backWord} back? Reach ${config.target}.`}
      tone="bg-gradient-to-br from-indigo-600 to-blue-800"
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
              objective: `Say whether each letter matches the letter ${backWord} step${config.back > 1 ? 's' : ''} back. Reach ${config.target} correct.`,
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
          Comparing with the letter <strong className="font-black">{backWord} back</strong> — keep the last few in your head
        </p>
      }
    >
      {started && !over && (
        <div className="mx-auto max-w-md text-center">
          <p className="text-xs font-black tracking-[0.18em] text-ink-400 uppercase">Letter {seq.length}</p>
          <p
            className={`mt-2 text-7xl font-black text-ink-900 transition-transform sm:text-8xl ${
              flash === 'right' ? 'scale-110 text-emerald-600' : flash === 'wrong' ? 'scale-95 text-rose-500' : ''
            }`}
          >
            {current}
          </p>

          {warmingUp ? (
            <div className="mt-8">
              <p className="text-sm font-semibold text-ink-500">Remember this one — nothing to compare with yet.</p>
              <button
                type="button"
                onClick={advance}
                className="fp-press mt-4 min-h-12 rounded-2xl bg-gradient-to-r from-journey-500 to-indigo-600 px-8 text-base font-black text-white"
              >
                Got it
              </button>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => answer(true)}
                className="fp-press flex min-h-16 items-center justify-center gap-2 rounded-2xl bg-emerald-50 text-lg font-black text-emerald-800 ring-1 ring-emerald-200 transition-colors ring-inset hover:bg-emerald-100"
              >
                <Check className="h-5 w-5" strokeWidth={3} /> Same
              </button>
              <button
                type="button"
                onClick={() => answer(false)}
                className="fp-press flex min-h-16 items-center justify-center gap-2 rounded-2xl bg-rose-50 text-lg font-black text-rose-700 ring-1 ring-rose-200 transition-colors ring-inset hover:bg-rose-100"
              >
                <X className="h-5 w-5" strokeWidth={3} /> Different
              </button>
            </div>
          )}
        </div>
      )}
    </GameShell>
  );
}
