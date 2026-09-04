import { useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { between, ramp, starsFor, starsOn } from './levels';
import useTimedRound from './useTimedRound';
import useRecordStars from './useRecordStars';

const INKS = [
  { name: 'RED', class: 'text-rose-500', button: 'bg-rose-500' },
  { name: 'BLUE', class: 'text-sky-500', button: 'bg-sky-500' },
  { name: 'GREEN', class: 'text-emerald-500', button: 'bg-emerald-500' },
  { name: 'YELLOW', class: 'text-amber-400', button: 'bg-amber-400' },
  { name: 'PURPLE', class: 'text-violet-500', button: 'bg-violet-500' }
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
  colours: Math.min(5, 3 + (difficulty - 1)),
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
  const [flash, setFlash] = useState(null);
  const [started, setStarted] = useState(false);
  const { seconds, over } = useTimedRound(config.seconds, started);

  const passed = score >= config.target;
  const stars = over ? starsFor(score, config.target) : 0;
  useRecordStars(progress, over, stars);

  const choose = (name) => {
    if (over) return;
    if (name === card.ink.name) {
      setScore((s) => s + 1);
      setFlash('right');
    } else {
      setFlash('wrong');
    }
    setCard(makeCard(palette, config.matchChance));
    setTimeout(() => setFlash(null), 220);
  };

  return (
    <GameShell
      title="Colour Match"
      blurb={`Tap the ink colour, not the word. Reach ${config.target}.`}
      tone="bg-gradient-to-br from-teal-500 to-cyan-700"
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
              detail: `${score} of ${config.target} needed`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={
        <p className="text-center text-sm text-ink-500">
          Name the colour it is <strong className="font-black">printed</strong> in
        </p>
      }
    >
      {started && !over && (
        <div className="mx-auto max-w-md text-center">
          <p
            className={`text-5xl font-black tracking-wide transition-transform sm:text-6xl ${card.ink.class} ${
              flash === 'right' ? 'scale-110' : flash === 'wrong' ? 'scale-95 opacity-60' : ''
            }`}
          >
            {card.word}
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-2.5">
            {palette.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => choose(c.name)}
                aria-label={c.name}
                className={`fp-press h-14 w-14 rounded-2xl ring-2 ring-white transition-transform hover:scale-110 ${c.button}`}
              />
            ))}
          </div>
        </div>
      )}
    </GameShell>
  );
}
