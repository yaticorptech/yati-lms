import { useState, useMemo } from 'react';
import { Check, X, Lightbulb } from 'lucide-react';
import GameShell from './GameShell';
import useGameProgress, { between, starsFor, starsOn } from './levels';
import useTimedRound from './useTimedRound';
import useRecordStars from './useRecordStars';

const shuffle = (list) => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/**
 * One quiz engine, four games.
 *
 * They differ only in what a question looks like and how the prompt is drawn —
 * deck building, scoring, the reveal after an answer and the level verdict are
 * identical. Written once so the four cannot drift apart.
 *
 * Difficulty picks which questions can appear; the level inside that band sets
 * how many are asked and how many must be right to move up.
 */
const configFor = (levelNo) => ({
  count: between(5, 12, levelNo),
  passMark: between(3, 10, levelNo),
  // A clock, because an untimed quiz is a worksheet. Generous at level 1 and
  // tight by level 20.
  seconds: between(90, 45, levelNo)
});

export default function QuizGame({ gameId, title, tone, questions, renderPrompt, onExit }) {
  const progress = useGameProgress(gameId);
  return (
    <Round
      key={`${progress.level}-${progress.attempt}`}
      progress={progress}
      title={title}
      tone={tone}
      questions={questions}
      renderPrompt={renderPrompt}
      onExit={onExit}
    />
  );
}

function Round({ progress, title, tone, questions, renderPrompt, onExit }) {
  const config = configFor(progress.levelNo);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [chosen, setChosen] = useState(null);
  const [started, setStarted] = useState(false);

  const deck = useMemo(() => {
    const pool = questions.filter((q) => (q.level || 1) === progress.difficulty);
    return shuffle(pool.length ? pool : questions).slice(0, config.count);
  }, [questions, progress.difficulty, config.count]);

  const { seconds, over: timeUp } = useTimedRound(config.seconds, started);
  const current = deck[index];
  const finished = index >= deck.length;
  const over = finished || timeUp;
  const passMark = Math.min(config.passMark, deck.length);
  const passed = score >= passMark;
  const stars = over ? starsFor(score, passMark) : 0;
  useRecordStars(progress, over, stars);

  // Options shuffled per question, so the right answer is not always in the
  // same place when a question comes round again.
  const options = useMemo(() => (current ? shuffle(current.options) : []), [current]);

  const answer = (value) => {
    if (chosen !== null) return;
    setChosen(value);
    if (value === current.answer) setScore((s) => s + 1);
  };

  return (
    <GameShell
      title={title}
      blurb={`Get ${Math.min(config.passMark, deck.length)} of ${deck.length} right to clear this level.`}
      tone={tone}
      score={`${score}/${deck.length}`}
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      seconds={started ? seconds : undefined}
      intro={
        !started
          ? {
              gameId: progress.gameId,
              level: progress.level,
              objective: `Answer ${passMark} of ${deck.length} correctly.`,
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
              detail: timeUp && !finished
                ? `Time ran out on ${score} of ${passMark} needed`
                : `${score} of ${passMark} needed`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={
        chosen !== null && current?.note ? (
          <p className="flex items-center justify-center gap-1.5 text-center text-sm text-ink-500">
            <Lightbulb className="h-3.5 w-3.5 shrink-0 text-amber-500" />
            {current.note}
          </p>
        ) : (
          <p className="text-center text-sm text-ink-500">
            Question {Math.min(index + 1, deck.length)} of {deck.length}
          </p>
        )
      }
    >
      {started && !over && (
        <div className="mx-auto max-w-md text-center">
          {renderPrompt(current)}

          <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
            {options.map((option) => {
              const isAnswer = option === current.answer;
              const picked = chosen === option;
              const show = chosen !== null;
              return (
                <button
                  key={String(option)}
                  type="button"
                  onClick={() => answer(option)}
                  disabled={show}
                  className={`fp-press flex min-h-14 items-center justify-center gap-2 rounded-2xl px-3 text-base font-black ring-1 transition-all ring-inset ${
                    show && isAnswer
                      ? 'bg-emerald-50 text-emerald-800 ring-emerald-300'
                      : show && picked
                        ? 'bg-rose-50 text-rose-700 ring-rose-300'
                        : show
                          ? 'bg-surface-50 text-ink-400 ring-line-200'
                          : 'bg-surface-50 text-ink-900 ring-line-200 hover:bg-journey-50 hover:ring-journey-300'
                  }`}
                >
                  {show && isAnswer && <Check className="h-4 w-4 shrink-0" strokeWidth={3} />}
                  {show && picked && !isAnswer && <X className="h-4 w-4 shrink-0" strokeWidth={3} />}
                  {option}
                </button>
              );
            })}
          </div>

          {chosen !== null && (
            <button
              type="button"
              onClick={() => {
                setChosen(null);
                setIndex((i) => i + 1);
              }}
              className="fp-press mt-5 min-h-11 rounded-xl bg-gradient-to-r from-journey-500 to-indigo-600 px-6 text-sm font-black text-white"
            >
              {index + 1 === deck.length ? 'See result' : 'Next question'}
            </button>
          )}
        </div>
      )}
    </GameShell>
  );
}
