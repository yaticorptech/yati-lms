import { useState, useMemo } from 'react';
import { Check, X, Lightbulb } from 'lucide-react';
import GameShell from './GameShell';
import useGameProgress, { between, ramp, starsFor, starsOn } from './levels';
import useTimedRound from './useTimedRound';
import useRecordStars from './useRecordStars';
import { pickQuestions, remember, recordFor, keyOf } from './questionMemory';

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

  /**
   * The questions for this level.
   *
   * It used to deal a window that rotated with the level number —
   * `pool[(levelNo * size) + i]`. That reads as though consecutive levels must
   * differ, and over a single level they do, but the window wraps a fifteen-
   * question band almost at once: measured across a full band, 94% of
   * everything asked was a repeat, every question came round sixteen to
   * eighteen times, and level four re-asked two of level one's. Answer
   * something correctly and it was back within minutes.
   *
   * Now the deck is chosen from what this student has actually been asked:
   * never-seen questions first, then the ones they have not got right, then
   * whatever has waited longest. The whole band is exhausted before anything
   * returns, and what returns first is what they still get wrong.
   *
   * The shuffle stays, and stays separate: `pickQuestions` decides WHICH
   * questions, the shuffle decides what order they are shown in. Conflating
   * those two is what the old window did wrong.
   *
   * Among questions the memory ranks equal, the ones whose difficulty best
   * fits this level come first, so a band's easiest questions tend to arrive
   * at its first levels and its hardest at its last.
   *
   * Repetition is reduced, not abolished. Thirty levels asking five to twelve
   * questions need two hundred and fifty-five, and a hand-written band holds
   * about forty — so a question can come round again late in a band, but
   * never before everything else in the band and the band above has been
   * asked, and never while it has just been answered correctly.
   */
  const deck = useMemo(() => {
    const band = progress.difficulty;
    const graded = questions.filter((q) => (q.level || 1) === band);
    let pool = graded.length ? graded : questions;
    if (!pool.length) return [];

    // Once this band has nothing unseen left to fill a level, borrow from the
    // band above — its easiest questions first, which is the natural next
    // step anyway. The top band, having no band above, borrows the hardest
    // of the band below. Borrowed questions are still fresh, and a fresh
    // question beats a repeat.
    if (graded.length) {
      const record = recordFor(progress.gameId, band);
      const unseen = graded.filter((q) => !record[keyOf(q)]).length;
      if (unseen < config.count) {
        const neighbour = band < 3 ? band + 1 : band - 1;
        const shift = band < 3 ? 1 : -1;
        const borrowed = questions
          .filter((q) => (q.level || 1) === neighbour)
          .map((q) => ({ ...q, tierShift: shift }));
        pool = [...graded, ...borrowed];
      }
    }

    return shuffle(pickQuestions(pool, config.count, progress.gameId, band, ramp(progress.levelNo)));
    // No `attempt` dependency: QuizGame keys this component on level and
    // attempt, so a retry remounts it and the record is re-read on the way in.
    // The retry therefore leads with whatever was missed, without this memo
    // having to watch for it.
  }, [questions, progress.difficulty, progress.levelNo, progress.gameId, config.count]);

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
    const right = value === current.answer;
    setChosen(value);
    if (right) setScore((s) => s + 1);
    // Recorded as it happens rather than at the end of the round, so a student
    // who abandons a level half-way still keeps credit for what they answered.
    remember(progress.gameId, progress.difficulty, current, right);
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
                ? `Time ran out at ${score} correct`
                : `${score} correct`,
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
