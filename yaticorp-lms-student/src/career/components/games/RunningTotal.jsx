import { useState, useEffect } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import useAnswerReveal from './useAnswerReveal';
import { runningConfig, runningStream, fmt, LANE_NAME } from '../../data/bands/math';

/**
 * By age band (data/bands/math.js, 2026-11-13): Classes 1–2 add three or four small groups of dots, slowly; 3–5 add
 * and take away within 50; 6–8 run longer and below zero; 9–10 mix in ×2 and ÷2; 11–12 either follow a fixed
 * + × − ÷ cycle or keep two running totals at once (Blue and Orange) and are asked for one of them.
 */
const OBJECTIVE = {
  foundation: 'Dots pop up one by one. Add them all up!',
  developing: 'Numbers pop up one by one. Add and take away in your head.',
  intermediate: 'Keep the total in your head — it can go below zero.',
  analytical: 'Keep the total: +, −, double (×2) and halve (÷2).',
  advanced: 'Keep the total as + × − ÷ come in turn — or keep two totals, Blue and Orange, at once.'
};

const OP_TONE = { '+': 'text-emerald-600', '−': 'text-rose-600', '×': 'text-violet-600', '÷': 'text-sky-600' };
const LANE_TONE = { A: 'bg-sky-100 ring-sky-300 text-sky-800', B: 'bg-amber-100 ring-amber-300 text-amber-800' };

/**
 * ➕ Math & speed: numbers appear one at a time. Keep the running total.
 *
 * Arithmetic under memory load — you cannot write it down and the next number
 * arrives whether you are ready or not.
 */
export default function RunningTotal({ onExit }) {
  const progress = useGameProgress('running-total');
  return (
    <Round
      key={`${progress.level}-${progress.attempt}`}
      progress={progress}
      onExit={onExit}
    />
  );
}

function Dots({ n }) {
  return (
    <span className="mt-3 flex flex-wrap justify-center gap-2" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => <span key={i} className="h-9 w-9 rounded-full bg-emerald-500 shadow-sm" />)}
    </span>
  );
}

function Step({ step, dots }) {
  return (
    <div className="animate-badge-burst">
      {step.lane && (
        <span className={`mb-2 inline-block rounded-full px-3 py-1 text-sm font-black ring-1 ring-inset ${LANE_TONE[step.lane]}`}>{LANE_NAME[step.lane]}</span>
      )}
      <p className={`text-6xl font-black tabular-nums ${OP_TONE[step.op]}`}>
        {step.op}
        {step.value}
      </p>
      {dots && <Dots n={step.value} />}
    </div>
  );
}

function Round({ progress, onExit }) {
  const [started, setStarted] = useState(false);
  const config = runningConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  const young = config.band === 'foundation';
  const [stream, setStream] = useState(() => runningStream(config));
  const [shown, setShown] = useState(0);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [verdict, setVerdict] = useState(null);
  const { busy, showWrong, toneOf } = useAnswerReveal();

  const playing = shown < stream.steps.length;

  // Only the timer callback writes state, so nothing is set during the effect.
  useEffect(() => {
    // The number stream ran behind the intro panel.
    if (!started || !playing) return undefined;
    const t = setTimeout(() => setShown((n) => n + 1), config.stepMs);
    return () => clearTimeout(t);
  }, [started, playing, shown, config.stepMs]);

  const done = round > config.rounds;
  // Two of three.
  const passMark = Math.round((config.rounds * 2) / 3);
  const passed = score >= passMark;
  const stars = done ? starsForFixed(score, passMark, config.rounds) : 0;
  useRecordStars(progress, done, stars, { correct: score, wrong: config.rounds - score, hints: 0, score });

  const answer = (value) => {
    if (verdict !== null || busy) return;
    if (value !== stream.total) {
      // The buzz and the pick red; the total stays green with its working until the student moves on.
      showWrong(value, stream.total);
      setVerdict('wrong');
      return;
    }
    setScore((s) => s + 1);
    setVerdict('right');
  };

  const nextRound = () => {
    setStream(runningStream(config));
    setShown(0);
    setVerdict(null);
    setRound((r) => r + 1);
  };

  const asked = stream.ask ? `${LANE_NAME[stream.ask]} total?` : 'Total?';

  return (
    <GameShell
      title="Running Total"
      blurb={`Keep the total in your head. Get ${passMark} of ${config.rounds}.`}
      tone="bg-gradient-to-br from-emerald-500 to-teal-700"
      score={`${score}/${config.rounds}`}
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={
        !started
          ? {
              gameId: progress.gameId,
              level: progress.level,
              objective: `${OBJECTIVE[config.band]} Get ${passMark} of ${config.rounds} right.`,
              stars: starsOn(progress.gameId, progress.level),
              onStart: () => setStarted(true)
            }
          : null
      }
      result={
        done
          ? {
              passed,
              stars,
              headline: passed ? `Level ${progress.level} cleared!` : 'So close',
              detail: `${score} of ${config.rounds} correct`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={
        <p className="text-center text-sm text-ink-500">
          {playing
            ? `Round ${round} of ${config.rounds} — ${stream.mode === 'lanes' ? 'keep both totals' : young ? 'count them up' : 'keep going'}`
            : verdict === null
              ? 'What is the total?'
              : verdict === 'right'
                ? '✅ Correct'
                : `❌ It was ${fmt(stream.total)}`}
        </p>
      }
    >
      {started && !done && (
        <div className="mx-auto max-w-md text-center">
          {playing ? (
            <Step key={shown} step={stream.steps[shown]} dots={!!config.dots} />
          ) : (
            <>
              <p className="text-2xl font-black text-ink-900">{asked}</p>
              <div className={`mt-6 grid gap-2.5 ${stream.options.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                {stream.options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => answer(option)}
                    disabled={verdict !== null || busy}
                    className={`fp-press rounded-2xl font-black ring-1 transition-all ring-inset tabular-nums ${young ? 'min-h-16 text-3xl' : 'min-h-14 text-xl'} ${
                      verdict !== null && option === stream.total
                        ? 'bg-emerald-50 text-emerald-800 ring-emerald-300'
                        : `bg-surface-50 text-ink-900 ring-line-200 ${busy || verdict !== null ? '' : 'hover:bg-emerald-50 hover:ring-emerald-300'}`
                    } ${toneOf(option)}`}
                  >
                    {fmt(option)}
                  </button>
                ))}
              </div>
              {verdict === 'wrong' && (
                <p className="mt-4 rounded-2xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-800 ring-1 ring-rose-200 ring-inset" role="status">
                  The working: {stream.explain}
                </p>
              )}
              {verdict !== null && (
                <button
                  type="button"
                  onClick={nextRound}
                  disabled={busy}
                  className="fp-press mt-5 min-h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 text-sm font-black text-white disabled:opacity-60"
                >
                  {round === config.rounds ? 'See result' : `Round ${round + 1}`}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </GameShell>
  );
}
