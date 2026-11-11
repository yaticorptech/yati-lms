import { useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { between, ramp, starsCap, starsFor, starsOn } from './levels';
import useTimedRound from './useTimedRound';
import useRecordStars from './useRecordStars';

// `edge` is the deeper shade each answer key sinks into (see .cm-key).
const INKS = [
  { name: 'RED', label: 'Red', class: 'text-rose-500', button: 'bg-gradient-to-b from-rose-400 to-rose-500', edge: '#be123c' },
  { name: 'BLUE', label: 'Blue', class: 'text-sky-500', button: 'bg-gradient-to-b from-sky-400 to-sky-500', edge: '#0369a1' },
  { name: 'GREEN', label: 'Green', class: 'text-emerald-500', button: 'bg-gradient-to-b from-emerald-400 to-emerald-500', edge: '#047857' },
  { name: 'YELLOW', label: 'Yellow', class: 'text-amber-400', button: 'bg-gradient-to-b from-amber-300 to-amber-400', edge: '#b45309' },
  { name: 'PURPLE', label: 'Purple', class: 'text-violet-500', button: 'bg-gradient-to-b from-violet-400 to-violet-500', edge: '#6d28d9' }
];

const rnd = (n) => Math.floor(Math.random() * n);

/**
 * Show a colour word printed in a different colour.
 *
 * The mismatch is the game — reading is automatic, so naming the ink instead
 * of the word takes deliberate effort. At higher levels the word and ink agree
 * only rarely, which makes it harder rather than easier.
 */
const makeCard = (palette, matchChance) => {
  const word = palette[rnd(palette.length)];
  const agree = Math.random() < matchChance;
  let ink = word;
  if (!agree) {
    do {
      ink = palette[rnd(palette.length)];
    } while (ink.name === word.name && palette.length > 1);
  }
  return { word: word.name, ink };
};

const configFor = (difficulty, levelNo) => ({
  // Always four inks, laid out as a 2×2 grid of answer cards.
  colours: 4,
  matchChance: Math.max(0.05, 0.4 - ramp(levelNo) * 0.3),
  seconds: between(45, 35, levelNo),
  target: between(8, 20, levelNo) + (difficulty - 1) * 3
});

/**
 * 🎨 Memory & focus: tap the colour the word is *printed* in, not the word.
 *
 * A different kind of focus from the recall games — this is inhibition, the
 * work of overriding an automatic response.
 */
export default function ColourMatch({ onExit }) {
  const progress = useGameProgress('colour-match');
  return (
    <Round
      key={`${progress.level}-${progress.attempt}`}
      progress={progress}
      onExit={onExit}
    />
  );
}

function Round({ progress, onExit }) {
  const config = configFor(progress.difficulty, progress.levelNo);
  const palette = INKS.slice(0, config.colours);
  const [card, setCard] = useState(() => makeCard(palette, config.matchChance));
  const [score, setScore] = useState(0);
  // Visual feedback only: which way the last answer went, and a counter so
  // the same animation replays on two answers in a row.
  const [feedback, setFeedback] = useState({ kind: null, id: 0 });
  const [started, setStarted] = useState(false);
  const { seconds, over } = useTimedRound(config.seconds, started, score >= starsCap(config.target));

  const passed = score >= config.target;
  const stars = over ? starsFor(score, config.target) : 0;
  useRecordStars(progress, over, stars);

  const choose = (name) => {
    if (over) return;
    const right = name === card.ink.name;
    if (right) setScore((s) => s + 1);
    setFeedback((f) => ({ kind: right ? 'right' : 'wrong', id: f.id + 1 }));
    setCard(makeCard(palette, config.matchChance));
  };

  return (
    <GameShell
      title="Colour Match"
      blurb={`Tap the ink colour, not the word. Reach ${config.target}.`}
      tone="bg-gradient-to-br from-teal-500 to-cyan-700"
      variant="premium"
      score={score}
      seconds={seconds}
      totalSeconds={config.seconds}
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={
        !started
          ? {
              gameId: progress.gameId,
              level: progress.level,
              objective: `Reach ${config.target} correct answers before the clock runs out.`,
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
          Name the colour it is <strong className="font-extrabold text-violet-700">printed</strong> in
        </p>
      }
    >
      {started && !over && (
        <div className="mx-auto w-full max-w-2xl text-center">
          <p className="text-[0.66rem] font-bold tracking-[0.2em] text-slate-400 uppercase">What colour is the ink?</p>

          {/* The stage: replays a green ring on a right answer, a shake on a wrong one. */}
          <div
            key={feedback.id}
            className={`relative mx-auto mt-3 flex h-28 min-[400px]:h-32 items-center justify-center rounded-3xl bg-gradient-to-b from-[#f8f7fd] to-white px-3 ring-1 ring-[#ecebf6] ring-inset sm:mt-4 sm:h-44 lg:h-48 ${
              feedback.kind === 'right' ? 'gs-right' : feedback.kind === 'wrong' ? 'gs-wrong' : ''
            }`}
          >
            <span
              className={`gs-pop max-w-full leading-none font-black tracking-[0.06em] select-none ${card.ink.class}`}
              style={{ fontSize: 'clamp(2.5rem, 14vw, 6rem)' }}
            >
              {card.word}
            </span>
            {feedback.kind === 'right' && (
              <span aria-hidden className="gs-plus absolute top-3 right-4 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-extrabold text-emerald-600 ring-1 ring-emerald-100">
                +1
              </span>
            )}
          </div>

          <div className="mx-auto mt-5 grid max-w-xl grid-cols-2 gap-2.5 min-[400px]:gap-3 sm:mt-8 sm:gap-4" role="group" aria-label="Ink colours">
            {palette.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => choose(c.name)}
                aria-label={c.name}
                style={{ '--edge': c.edge }}
                className={`cm-key group relative block h-20 overflow-hidden rounded-[18px] min-[400px]:h-24 sm:h-28 sm:rounded-[22px] ${c.button}`}
              >
                {/* Gloss: a soft light falling across the top of the card. */}
                <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-[inherit] bg-gradient-to-b from-white/35 to-transparent" />
                <span aria-hidden className="pointer-events-none absolute -top-10 -right-8 h-28 w-28 rounded-full bg-white/15 transition-transform duration-300 group-hover:scale-125" />
                <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-white/25 ring-inset" />

              </button>
            ))}
          </div>
        </div>
      )}
    </GameShell>
  );
}
