import { useState, useEffect, useRef } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsFor, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { memoryMatchConfig, buildMemoryDeck } from '../../data/bands/memory';

/**
 * 🧠 Memory & focus: turn cards two at a time and pair them all.
 *
 * Per age band (data/bands/memory.js): Young Thinkers pair big picture cards (animals, fruit, things, shapes), few
 * of them, with near-look-alikes (🐶 🐕) mixed in later; Rising Brains get bigger boards of look-alike symbols
 * (★ ☆); Master Minds see every card for a moment, then must find the pairs in the order the queue asks for.
 */
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

const objectiveFor = (config, young) => {
  if (config.ordered) {
    return `All cards show for a moment — remember them! Then find the ${config.pairs} pairs in the order shown at the top, in ${config.moveBudget} moves or fewer.`;
  }
  if (young) return `Find all ${config.pairs} pairs of pictures. Try to use ${config.moveBudget} turns or fewer.`;
  return `Pair all ${config.pairs} in ${config.moveBudget} moves or fewer.`;
};

function Round({ progress, onExit }) {
  const [started, setStarted] = useState(false);
  const [config] = useState(() =>
    memoryMatchConfig({ ageBand: progress.ageBand, difficulty: progress.difficulty, levelNo: progress.levelNo, tier: progress.tier })
  );
  const young = config.kind === 'pictures';
  const [{ deck, order }] = useState(() => buildMemoryDeck(config));
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [note, setNote] = useState(null);
  const timers = useRef([]);

  // Every pending flip-back is cancelled on unmount, or a card turns over in a
  // component that no longer exists.
  useEffect(() => {
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);

  const start = () => {
    setStarted(true);
    if (config.previewMs > 0) {
      setPreviewing(true);
      timers.current.push(setTimeout(() => setPreviewing(false), config.previewMs));
    }
  };

  const pairsFound = matched.length / 2;
  const won = pairsFound === config.pairs;
  const passed = won && moves <= config.moveBudget;
  const finishedRound = won;
  const stars = finishedRound ? starsFor(moves, config.moveBudget, true) : 0;
  useRecordStars(progress, finishedRound, stars, {
    correct: pairsFound,
    wrong: Math.max(0, moves - pairsFound),
    score: moves,
    limitMs: null
  });

  const wanted = order ? order[pairsFound] : null;

  const turn = (index) => {
    if (locked || won || previewing) return;
    if (flipped.includes(index) || matched.includes(deck[index].id)) return;

    const next = [...flipped, index];
    setFlipped(next);
    setNote(null);
    if (next.length < 2) return;

    setMoves((m) => m + 1);
    const [a, b] = next;
    const same = deck[a].face === deck[b].face;
    if (same && (!order || deck[a].face === wanted)) {
      setMatched((m) => [...m, deck[a].id, deck[b].id]);
      setFlipped([]);
      if (young) setNote({ good: true, text: pairsFound + 1 === config.pairs ? 'All found — super!' : 'Yay, a pair!' });
      return;
    }

    // Held face-up for a moment (marked red, with the buzz) so the pair can actually be memorised.
    sfx.wrong();
    setLocked(true);
    setNote(
      same
        ? { good: false, text: `A pair, but not yet — find ${wanted} first.` }
        : { good: false, text: young ? 'Not a pair — look again!' : 'Not a pair.' }
    );
    timers.current.push(
      setTimeout(() => {
        setFlipped([]);
        setLocked(false);
      }, same ? 1100 : 800)
    );
  };

  const cardRem = young ? 6.5 : 5.5;

  return (
    <GameShell
      title="Memory Match"
      blurb={objectiveFor(config, young)}
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
              objective: objectiveFor(config, young),
              stars: starsOn(progress.gameId, progress.level),
              onStart: start
            }
          : null
      }
      result={
        finishedRound
          ? {
              passed,
              stars,
              headline: passed ? `Level ${progress.level} cleared!` : young ? 'Well done — try again for fewer turns!' : 'So close',
              detail: `${moves} moves used of ${config.moveBudget}`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={
        <p className="text-center text-sm text-ink-500" aria-live="polite">
          {previewing
            ? 'Remember where everything is…'
            : note
              ? <span className={`font-bold ${note.good ? 'text-emerald-600' : 'text-rose-600'}`}>{note.text}</span>
              : `${pairsFound} of ${config.pairs} pairs found`}
        </p>
      }
    >
      {started && order && (
        <div className="mx-auto mb-3 flex max-w-full flex-wrap items-center justify-center gap-1.5" aria-label="Order to find the pairs in">
          <span className="mr-1 text-[0.65rem] font-black tracking-[0.14em] text-ink-400 uppercase">Find in order</span>
          {order.map((face, i) => (
            <span
              key={face}
              className={`flex h-9 w-9 items-center justify-center rounded-lg text-xl font-black ${
                i < pairsFound
                  ? 'bg-emerald-50 text-emerald-600/60 line-through ring-1 ring-emerald-200'
                  : i === pairsFound
                    ? 'bg-journey-50 text-ink-900 ring-2 ring-journey-400 scale-110'
                    : 'bg-surface-100 text-ink-500'
              }`}
            >
              {face}
            </span>
          ))}
        </div>
      )}

      {started && (
      <div
        className="mx-auto grid gap-2 sm:gap-3"
        style={{ gridTemplateColumns: `repeat(${config.cols}, minmax(0, 1fr))`, maxWidth: `${config.cols * cardRem + (config.cols - 1) * 0.75}rem` }}
      >
        {deck.map((card, index) => {
          const solved = matched.includes(card.id);
          const faceUp = previewing || flipped.includes(index) || solved;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => turn(index)}
              aria-label={faceUp ? `Card showing ${card.face}` : `Face-down card ${index + 1}`}
              disabled={solved || previewing}
              className={`fp-press flex aspect-square min-h-11 items-center justify-center rounded-2xl transition-all duration-200 ${
                young ? 'text-4xl sm:text-5xl' : config.kind === 'emoji' ? 'text-3xl sm:text-4xl' : 'text-3xl font-black text-ink-900 sm:text-4xl'
              } ${
                solved
                  ? 'scale-95 bg-emerald-50 ring-2 ring-emerald-200 ring-inset'
                  : faceUp && locked
                    ? 'gs-wrong bg-rose-50 shadow-md ring-2 ring-rose-300 ring-inset'
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
