import { useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsFor, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { makeSafariDeck, safariConfig, safariMatch } from '../../data/bands/youngA';

const freshSeed = () => Math.floor(Math.random() * 4294967296);

/** Says a word aloud when the browser can; silent otherwise. */
const speak = (text) => {
  try {
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    if (!synth || typeof window.SpeechSynthesisUtterance !== 'function') return;
    synth.cancel();
    const u = new window.SpeechSynthesisUtterance(text);
    u.rate = 0.85;
    u.pitch = 1.1;
    synth.speak(u);
  } catch { /* no voice: the word is printed on the card too */ }
};

const KIND_LABEL = { sound: 'says', home: 'lives in', baby: 'baby' };

/** 🦁 Memory & focus: pair each animal with its sound, home or baby — the two cards of a pair look different. */
export default function AnimalPairSafari({ onExit }) {
  const progress = useGameProgress('animal-pair-safari', { bands: SECTION_BANDS.young });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const config = safariConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  const young = config.band === 'foundation';
  const [deck] = useState(() => makeSafariDeck(seeded(freshSeed()), config));
  const [started, setStarted] = useState(false);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);
  const [note, setNote] = useState(null);
  const timers = useRef([]);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);

  const pairsFound = matched.length / 2;
  const won = pairsFound === config.pairs;
  const passed = won && moves <= config.moveBudget;
  const stars = won ? starsFor(moves, config.moveBudget, true) : 0;
  useRecordStars(progress, won, stars, { correct: pairsFound, wrong: Math.max(0, moves - pairsFound), hints: 0, score: moves, limitMs: null });

  const turn = (index) => {
    if (!started || locked || won) return;
    const card = deck[index];
    if (flipped.includes(index) || matched.includes(card.id)) return;
    speak(card.kind === 'sound' ? `${card.say}!` : card.say);
    const next = [...flipped, index];
    setFlipped(next);
    setNote(null);
    if (next.length < 2) return;
    setMoves((m) => m + 1);
    const [a, b] = next.map((i) => deck[i]);
    if (safariMatch(a, b)) {
      const animal = a.kind === 'animal' ? a : b;
      const partner = a.kind === 'animal' ? b : a;
      sfx.right?.();
      setMatched((m) => [...m, a.id, b.id]);
      setFlipped([]);
      const line = partner.kind === 'sound'
        ? `The ${animal.word} says “${partner.word}!”`
        : partner.kind === 'home'
          ? `The ${animal.word} lives in a ${partner.word}.`
          : `A baby ${animal.word} is a ${partner.word}.`;
      setNote({ good: true, text: `${line} ${pairsFound + 1 === config.pairs ? 'All pairs found! 🎉' : 'Yay!'}` });
      return;
    }
    sfx.wrong();
    setLocked(true);
    const bothAnimals = a.kind === 'animal' && b.kind === 'animal';
    const noAnimal = a.kind !== 'animal' && b.kind !== 'animal';
    setNote({
      good: false,
      text: bothAnimals ? 'Two animals! Find an animal and its match.' : noAnimal ? 'Find the animal to go with it.' : 'Not a pair — remember where they are!'
    });
    timers.current.push(setTimeout(() => { setFlipped([]); setLocked(false); }, 1100));
  };

  const objective = young
    ? `Turn over two cards. Find each animal and the sound it makes — listen when a card turns! Find all ${config.pairs} pairs in ${config.moveBudget} turns or fewer.`
    : `Each animal pairs with its sound, its home or its baby. Turn two cards at a time and find all ${config.pairs} pairs in ${config.moveBudget} turns or fewer.`;

  return (
    <GameShell
      title="Animal Pair Safari"
      blurb={young ? 'Match each animal to its sound!' : 'Match animals to their sounds, homes and babies.'}
      tone="bg-gradient-to-br from-lime-500 to-emerald-700"
      score={`${moves}/${config.moveBudget}`}
      scoreLabel="Turns"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) } : null}
      result={won ? {
        passed,
        stars,
        headline: passed ? `Level ${progress.level} cleared!` : 'All pairs found — now try in fewer turns!',
        detail: `${moves} turns used of ${config.moveBudget}`,
        atEnd: progress.atEnd,
        onNext: progress.advance,
        onRetry: progress.retry
      } : null}
      footer={
        <p className="text-center text-sm text-ink-500" aria-live="polite">
          {note ? <span className={`font-bold ${note.good ? 'text-emerald-600' : 'text-rose-600'}`}>{note.text}</span> : `${pairsFound} of ${config.pairs} pairs found`}
        </p>
      }
    >
      {started && (
        <div
          className="mx-auto grid grid-cols-4 gap-1.5 sm:gap-3"
          style={{ maxWidth: `${config.cols * 7}rem` }}
        >
          {deck.map((card, index) => {
            const solved = matched.includes(card.id);
            const faceUp = flipped.includes(index) || solved;
            const wrong = faceUp && !solved && locked;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => turn(index)}
                disabled={solved}
                aria-label={faceUp ? (card.kind === 'animal' ? card.word : `${KIND_LABEL[card.kind]} ${card.word}`) : `Hidden card ${index + 1}`}
                className={`fp-press relative flex aspect-[3/4] min-h-[5.5rem] flex-col items-center justify-center gap-0.5 rounded-xl p-1 sm:rounded-2xl transition-all duration-200 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
                  solved
                    ? 'gs-right scale-95 bg-emerald-50 ring-2 ring-emerald-300 ring-inset'
                    : wrong
                      ? 'gs-wrong bg-rose-50 ring-2 ring-rose-300 ring-inset'
                      : faceUp
                        ? card.kind === 'animal' ? 'bg-amber-50 shadow-md ring-2 ring-amber-300 ring-inset' : 'bg-sky-50 shadow-md ring-2 ring-sky-300 ring-inset'
                        : 'bg-gradient-to-br from-lime-400 to-emerald-600 shadow-md'
                }`}
              >
                {faceUp ? (
                  <>
                    <span className="text-3xl leading-none sm:text-5xl" aria-hidden="true">{card.pic}</span>
                    {card.kind !== 'animal' && (
                      <span className="text-[0.6rem] font-black tracking-wide text-sky-700 uppercase sm:text-[0.7rem]">{KIND_LABEL[card.kind]}</span>
                    )}
                    <span className={`w-full text-center leading-tight font-black break-words text-ink-900 [overflow-wrap:anywhere] ${card.word.length > 10 ? 'text-[0.7rem] sm:text-xs' : 'text-sm sm:text-sm'} ${card.kind === 'animal' ? 'capitalize' : ''}`}>
                      {card.kind === 'sound' ? `${card.word}!` : card.word}
                    </span>
                  </>
                ) : (
                  <span className="text-3xl opacity-90" aria-hidden="true">🌿</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </GameShell>
  );
}
