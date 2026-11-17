import { useEffect, useMemo, useRef, useState } from 'react';
import { Lightbulb, SkipForward, Delete } from 'lucide-react';
import GameShell from './GameShell';
import useGameProgress, { starsCap, starsFor, starsOn } from './levels';
import useTimedRound from './useTimedRound';
import useRecordStars from './useRecordStars';
import useFresh from './useFresh';
import useAnswerReveal from './useAnswerReveal';
import { sfx } from './gameSfx';
import { scramble, scrambleConfig } from '../../data/bands/words';

/**
 * 🔤 Vocabulary: unscramble the word from its letters and a clue.
 *
 * Per age band (data/bands/words.js): Foundation, three-letter picture words built by tapping (or dragging)
 * letter tiles into place; Developing, familiar 4–6 letter words, tiles again; Intermediate, school vocabulary
 * with a context sentence; Analytical, advanced vocabulary; Advanced, the workplace bank and words built from
 * a prefix and suffix.
 */
export default function WordScramble({ onExit, gameId = 'word-scramble', bands, title = 'Word Scramble' }) {
  const progress = useGameProgress(gameId, { bands });
  return <Round key={`${progress.level}-${progress.attempt}-${progress.ageBand}`} progress={progress} onExit={onExit} title={title} />;
}

const randomOf = (list) => list[Math.floor(Math.random() * list.length)];

function Round({ progress, onExit, title }) {
  const config = useMemo(
    () => scrambleConfig(progress.ageBand, progress.difficulty, progress.levelNo),
    [progress.ageBand, progress.difficulty, progress.levelNo]
  );
  const fresh = useFresh((w) => w.word);
  const pickWord = (exclude) => {
    const pool = config.pool.filter((w) => w.word !== exclude);
    return randomOf(pool.length ? pool : config.pool);
  };
  const [entry, setEntry] = useState(() => fresh(() => pickWord(null)));
  const [letters, setLetters] = useState(() => scramble(entry.word));
  /* Tile mode: the indices of `letters` placed, in order. Typing mode: the text typed. */
  const [placed, setPlaced] = useState([]);
  const [guess, setGuess] = useState('');
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [flash, setFlash] = useState(null);
  const { busy, showWrong } = useAnswerReveal();
  const [started, setStarted] = useState(false);
  const { seconds, over } = useTimedRound(config.seconds, started, score >= starsCap(config.target));
  const inputRef = useRef(null);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const passed = score >= config.target;
  const stars = over ? starsFor(score, config.target) : 0;
  useRecordStars(progress, over, stars, { correct: score, wrong, hints: 0, score, limitMs: config.seconds * 1000 });

  const word = entry.word;
  const built = placed.map((i) => letters[i]).join('');
  const locked = over || busy || flash !== null;

  const nextWord = (current) => {
    const chosen = fresh(() => pickWord(current));
    setEntry(chosen);
    setLetters(scramble(chosen.word));
    setPlaced([]);
    setGuess('');
  };

  const later = (fn, ms) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(fn, ms);
  };

  const solved = () => {
    setScore((s) => s + 1);
    setFlash('right');
    later(() => {
      setFlash(null);
      nextWord(word);
    }, 550);
  };

  /* ---- Tile mode ---- */
  const place = (next) => {
    setPlaced(next);
    if (next.length !== word.length) return;
    if (next.map((i) => letters[i]).join('') === word) {
      solved();
    } else {
      // Young players keep the same word: the tiles shake red, then go back to try again.
      sfx.wrong();
      setWrong((w) => w + 1);
      setFlash('wrong');
      later(() => {
        setFlash(null);
        setPlaced([]);
      }, 700);
    }
  };
  const tap = (i) => {
    if (locked || placed.includes(i)) return;
    place([...placed, i]);
  };
  const unplace = (slot) => {
    if (locked) return;
    setPlaced(placed.filter((_, k) => k !== slot));
  };

  /* ---- Typing mode ---- */
  const check = (event) => {
    event.preventDefault();
    if (locked || !guess.trim()) return;
    if (guess.trim().toUpperCase() === word) {
      setGuess('');
      solved();
    } else {
      // The buzz and the word in green under the box, a pause, then a new word: once the answer
      // has been shown, staying on the same word would hand over a free point.
      setWrong((w) => w + 1);
      showWrong(guess, word, () => nextWord(word));
    }
    inputRef.current?.focus();
  };

  // Tile mode answers the physical keyboard too: a letter places a matching tile, Backspace takes one back.
  const keyRef = useRef(null);
  useEffect(() => {
    keyRef.current = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Backspace') {
        e.preventDefault();
        if (placed.length) unplace(placed.length - 1);
        return;
      }
      const ch = e.key.length === 1 ? e.key.toUpperCase() : '';
      if (!/^[A-Z]$/.test(ch)) return;
      const i = letters.split('').findIndex((c, k) => c === ch && !placed.includes(k));
      if (i >= 0) tap(i);
    };
  });
  useEffect(() => {
    if (!config.tiles || !started || over) return undefined;
    const onKey = (e) => keyRef.current?.(e);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [config.tiles, started, over]);

  const young = config.tiles;

  return (
    <GameShell
      title={title}
      blurb={young ? `Make ${config.target} words.` : `Solve ${config.target} words before the clock runs out.`}
      tone="bg-gradient-to-br from-fuchsia-500 to-purple-700"
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
              objective: young
                ? `Tap the letters in the right order to make the word. Make ${config.target} words.`
                : `Unscramble ${config.target} words before the clock runs out.`,
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
        entry.picture ? (
          <p className="text-center text-base font-bold text-ink-600">{entry.clue}</p>
        ) : (
          <p className="flex items-center justify-center gap-1.5 text-center text-sm text-ink-500">
            <Lightbulb className="h-3.5 w-3.5 shrink-0 text-amber-500" />
            {entry.clue}
          </p>
        )
      }
    >
      {started && !over && (
        <div className="mx-auto max-w-md text-center">
          {entry.picture && (
            <div className="mb-3 text-7xl leading-none sm:text-8xl" role="img" aria-label={entry.clue}>
              {entry.picture}
            </div>
          )}

          {young ? (
            <>
              {/* The answer slots: tap a placed letter to send it back. Drop a tile here with a mouse. */}
              <div
                className={`flex flex-wrap justify-center gap-2 ${flash === 'wrong' ? 'gs-wrong' : ''}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const i = Number(e.dataTransfer.getData('text/plain'));
                  if (Number.isInteger(i)) tap(i);
                }}
                aria-label="Your word"
              >
                {word.split('').map((_, slot) => {
                  const ch = placed[slot] !== undefined ? letters[placed[slot]] : '';
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => ch && unplace(slot)}
                      disabled={!ch || locked}
                      aria-label={ch ? `Remove ${ch}` : `Empty space ${slot + 1}`}
                      className={`flex h-14 w-12 items-center justify-center rounded-xl border-2 border-dashed text-2xl font-black transition-colors ${
                        flash === 'right'
                          ? 'border-emerald-400 bg-emerald-100 text-emerald-700'
                          : flash === 'wrong'
                            ? 'border-rose-400 bg-rose-50 text-rose-600'
                            : ch
                              ? 'border-fuchsia-300 bg-fuchsia-50 text-ink-900'
                              : 'border-line-200 bg-surface text-transparent'
                      }`}
                    >
                      {ch || '·'}
                    </button>
                  );
                })}
              </div>

              {/* The letter tiles. */}
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {letters.split('').map((letter, i) => {
                  const used = placed.includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      draggable={!used && !locked}
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', String(i))}
                      onClick={() => tap(i)}
                      disabled={used || locked}
                      aria-label={`Letter ${letter}`}
                      className={`fp-press flex h-14 w-12 items-center justify-center rounded-xl text-2xl font-black shadow-sm transition-all ${
                        used ? 'bg-surface-100 text-transparent shadow-none' : 'bg-gradient-to-b from-fuchsia-400 to-purple-600 text-white'
                      }`}
                    >
                      {letter}
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => placed.length && unplace(placed.length - 1)}
                  disabled={locked || !placed.length}
                  aria-label="Take back the last letter"
                  className="fp-press inline-flex min-h-12 items-center gap-1.5 rounded-xl bg-surface-100 px-4 text-sm font-black text-ink-600 disabled:opacity-50"
                >
                  <Delete className="h-4 w-4" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => nextWord(word)}
                  disabled={locked}
                  className="fp-press inline-flex min-h-12 items-center gap-1.5 rounded-xl bg-surface-100 px-4 text-sm font-black text-ink-600 disabled:opacity-50"
                >
                  <SkipForward className="h-4 w-4" />
                  Skip
                </button>
              </div>
              <p className="sr-only" role="status">{built}</p>
            </>
          ) : (
            <>
              <div className="flex flex-wrap justify-center gap-1.5">
                {letters.split('').map((letter, i) => (
                  <span
                    key={i}
                    className={`flex h-11 w-9 items-center justify-center rounded-xl text-xl font-black transition-colors sm:h-12 sm:w-10 ${
                      flash === 'right' ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-100 text-ink-900'
                    }`}
                  >
                    {letter}
                  </span>
                ))}
              </div>

              <form onSubmit={check} className="mt-5 flex flex-wrap justify-center gap-2">
                <input
                  ref={inputRef}
                  value={guess}
                  onChange={(e) => !busy && setGuess(e.target.value)}
                  readOnly={busy}
                  placeholder="Your answer"
                  aria-label="Your answer"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  className={`min-h-11 min-w-0 flex-1 basis-48 rounded-xl border bg-surface px-4 text-center text-base font-black tracking-widest text-ink-900 uppercase transition-colors placeholder:font-semibold placeholder:tracking-normal placeholder:normal-case focus:outline-none ${
                    busy ? 'border-rose-400 text-rose-600' : 'border-line-200 focus:border-journey-400'
                  }`}
                />
                <button
                  type="submit"
                  disabled={locked}
                  className="fp-press min-h-11 shrink-0 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 px-5 text-sm font-black text-white"
                >
                  Check
                </button>
                <button
                  type="button"
                  onClick={() => nextWord(word)}
                  disabled={locked}
                  className="min-h-11 shrink-0 rounded-xl bg-surface-100 px-4 text-sm font-black text-ink-600"
                >
                  <SkipForward className="mr-1 inline h-3.5 w-3.5" />
                  Skip
                </button>
              </form>
              {busy && (
                <p className="mt-3 text-sm font-bold text-ink-500" role="status">
                  It was <span className="font-black tracking-widest text-emerald-600">{word}</span>
                </p>
              )}
            </>
          )}
        </div>
      )}
    </GameShell>
  );
}
