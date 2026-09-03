import { useState, useEffect, useRef } from 'react';
import GameShell from './GameShell';
import useGameProgress, { between, starsFor, starsOn } from './levels';
import useRecordStars from './useRecordStars';

const FACES = ['🚀', '🎯', '💡', '🧠', '⚡', '🏆', '🔭', '🧩', '🎨', '🔑', '🎲', '🛰️'];

const shuffled = (pairs) => {
  const deck = FACES.slice(0, pairs).flatMap((face, i) => [
    { id: `${i}a`, face },
    { id: `${i}b`, face }
  ]);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

/** More pairs, and a tighter move budget, the further up the band you go. */
const configFor = (difficulty, levelNo) => {
  const pairs = Math.min(12, between(4, 8, levelNo) + (difficulty - 1) * 2);
  return { pairs, moveBudget: Math.round(pairs * (difficulty === 1 ? 2.6 : difficulty === 2 ? 2.2 : 1.9)) };
};

/** 🧠 Memory & focus: turn cards two at a time and pair them all. */
export default function MemoryMatch({ onExit }) {
  const progress = useGameProgress('memory-match');
  return (
    <Round
      key={`${progress.level}-${progress.attempt}`}
      progress={progress}
      onExit={onExit}
    />
  );
}

function Round({ progress, onExit }) {
  const [started, setStarted] = useState(false);
  const config = configFor(progress.difficulty, progress.levelNo);
  const [deck] = useState(() => shuffled(config.pairs));
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);
  const timers = useRef([]);

  // Every pending flip-back is cancelled on unmount, or a card turns over in a
  // component that no longer exists.
  useEffect(() => {
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);

  const won = matched.length === config.pairs * 2;
  const passed = won && moves <= config.moveBudget;
  const finishedRound = won;
  const stars = finishedRound ? starsFor(moves, config.moveBudget, true) : 0;
  useRecordStars(progress, finishedRound, stars);

  const turn = (index) => {
    if (locked || won) return;
    if (flipped.includes(index) || matched.includes(deck[index].id)) return;

    const next = [...flipped, index];
    setFlipped(next);
    if (next.length < 2) return;

    setMoves((m) => m + 1);
    const [a, b] = next;
    if (deck[a].face === deck[b].face) {
      setMatched((m) => [...m, deck[a].id, deck[b].id]);
      setFlipped([]);
      return;
    }

    // Held face-up for a moment so the pair can actually be memorised.
    setLocked(true);
    timers.current.push(
      setTimeout(() => {
        setFlipped([]);
        setLocked(false);
      }, 800)
    );
  };

  return (
    <GameShell
      title="Memory Match"
      blurb={`Pair all ${config.pairs} in ${config.moveBudget} moves or fewer.`}
      tone="fp-journey-gradient"
      score={`${moves}/${config.moveBudget}`}
      scoreLabel="Moves"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={
        !started
          ? {
              gameId: progress.gameId,
              level: progress.level,
              objective: `Pair all ${config.pairs} in ${config.moveBudget} moves or fewer.`,
              stars: starsOn(progress.gameId, progress.level),
              onStart: () => setStarted(true)
            }
          : null
      }
      result={
        finishedRound
          ? {
              passed,
              stars,
              headline: passed ? `Level ${progress.level} cleared!` : 'So close',
              detail: `${moves} moves used of ${config.moveBudget}`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={
        <p className="text-center text-sm text-ink-500">
          {matched.length / 2} of {config.pairs} pairs found
        </p>
      }
    >
      {started && (
      <div className="mx-auto grid max-w-md grid-cols-4 gap-2.5 sm:gap-3">
        {deck.map((card, index) => {
          const faceUp = flipped.includes(index) || matched.includes(card.id);
          const solved = matched.includes(card.id);
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => turn(index)}
              aria-label={faceUp ? `Card showing ${card.face}` : 'Face-down card'}
              disabled={solved}
              className={`fp-press flex aspect-square items-center justify-center rounded-2xl text-3xl transition-all duration-200 ${
                solved
                  ? 'scale-95 bg-emerald-50 ring-2 ring-emerald-200 ring-inset'
                  : faceUp
                    ? 'bg-surface shadow-md ring-2 ring-journey-300 ring-inset'
                    : 'fp-journey-gradient shadow-sm hover:brightness-110'
              }`}
            >
              <span className={faceUp ? '' : 'opacity-0'}>{card.face}</span>
            </button>
          );
        })}
      </div>
      )}
    </GameShell>
  );
}
