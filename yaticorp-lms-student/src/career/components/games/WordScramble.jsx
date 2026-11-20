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
  // Rising Brains (2026-11-19, the user): a dark premium stage, full screen on a phone.
  const dark = !young && (progress.ageBand === 'intermediate' || progress.ageBand === 'analytical');

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
        <div className={`mx-auto w-full max-w-md text-center ${dark ? 'vx-t0 flex flex-col justify-start max-sm:flex-1' : ''}`}>
          {/* A coloured stage (2026-11-18 redesign): the picture in a glowing bubble, the word built on a wooden shelf,
              the letters as candy tiles. */}
          <div className={`relative overflow-hidden p-4 sm:p-5 ${dark ? 'vx-card py-7' : 'rounded-[1.75rem] bg-gradient-to-br from-sky-400 via-indigo-400 to-fuchsia-500 shadow-[0_14px_30px_-14px_rgba(79,70,229,0.6)]'}`}>
          <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            {[['A', 6, 8, -12], ['b', 86, 6, 10], ['✦', 4, 70, 0], ['Z', 88, 72, -8], ['c', 48, 90, 0]].map(([c, x, y, r]) => <span key={c} className="absolute text-4xl font-black text-white/20" style={{ left: `${x}%`, top: `${y}%`, transform: `rotate(${r}deg)` }}>{c}</span>)}
          </span>
          <span className="relative inline-block rounded-full bg-white/90 px-3 py-1 text-xs font-black text-indigo-700 shadow-sm">🔤 {young ? 'Build the word' : 'Unscramble the word'}</span>
          {entry.picture && (
            <div className="relative mx-auto mt-3 grid size-28 place-items-center rounded-full bg-white/95 shadow-[0_8px_20px_-8px_rgba(30,27,75,0.5)] ring-4 ring-white/50 sm:size-32" role="img" aria-label={entry.clue}>
              <span className="text-7xl leading-none drop-shadow sm:text-8xl">{entry.picture}</span>
            </div>
          )}
          <div className="relative mt-4">

          {young ? (
            <>
              {/* The answer slots: tap a placed letter to send it back. Drop a tile here with a mouse. */}
              <div
                className={`flex flex-wrap justify-center gap-2 rounded-2xl bg-white/25 px-3 pt-3 pb-4 shadow-[inset_0_-6px_0_rgba(120,53,15,0.35)] ring-1 ring-white/40 ${flash === 'wrong' ? 'gs-wrong' : ''}`}
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
                      className={`flex h-14 w-12 items-center justify-center rounded-xl text-2xl font-black transition-all ${
                        flash === 'right'
                          ? 'oo-win bg-emerald-500 text-white shadow-[0_4px_0_#047857]'
                          : flash === 'wrong'
                            ? 'bg-rose-500 text-white shadow-[0_4px_0_#be123c]'
                            : ch
                              ? 'bg-white text-indigo-800 shadow-[0_4px_0_rgba(15,23,42,0.18)]'
                              : 'border-2 border-dashed border-white/80 bg-white/15 text-transparent'
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
                      className={`fp-press flex h-14 w-12 items-center justify-center rounded-xl text-2xl font-black transition-all ${
                        used ? 'scale-90 bg-white/20 text-transparent shadow-none'
                          : ['bg-gradient-to-b from-amber-300 to-orange-500 shadow-[0_4px_0_#c2410c]', 'bg-gradient-to-b from-pink-400 to-rose-600 shadow-[0_4px_0_#9f1239]', 'bg-gradient-to-b from-emerald-300 to-teal-600 shadow-[0_4px_0_#115e59]', 'bg-gradient-to-b from-sky-300 to-blue-600 shadow-[0_4px_0_#1e40af]'][i % 4] + ' text-white hover:-translate-y-0.5 active:translate-y-0.5'
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
                  className="fp-press inline-flex min-h-12 items-center gap-1.5 rounded-xl bg-white px-4 text-sm font-black text-indigo-700 shadow-[0_3px_0_rgba(15,23,42,0.15)] disabled:opacity-50"
                >
                  <Delete className="h-4 w-4" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => nextWord(word)}
                  disabled={locked}
                  className="fp-press inline-flex min-h-12 items-center gap-1.5 rounded-xl bg-white/25 px-4 text-sm font-black text-white ring-1 ring-white/50 disabled:opacity-50"
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
                      flash === 'right' ? 'bg-emerald-500 text-white shadow-[0_4px_0_#047857]' : dark ? ['bg-gradient-to-b from-violet-400 to-purple-600 shadow-[0_4px_0_#4c1d95]', 'bg-gradient-to-b from-fuchsia-400 to-pink-600 shadow-[0_4px_0_#9d174d]', 'bg-gradient-to-b from-sky-400 to-blue-600 shadow-[0_4px_0_#1e3a8a]', 'bg-gradient-to-b from-amber-300 to-orange-500 shadow-[0_4px_0_#9a3412]'][i % 4] + ' text-white' : 'bg-white text-indigo-800 shadow-[0_4px_0_rgba(15,23,42,0.18)]'
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
                  className={`min-h-12 min-w-0 flex-1 basis-48 rounded-xl border px-4 text-center text-lg font-black tracking-widest uppercase transition-colors placeholder:font-semibold placeholder:tracking-normal placeholder:normal-case focus:outline-none ${dark ? 'bg-white/10 text-white placeholder:text-white/40' : 'bg-surface text-ink-900'} ${
                    busy ? 'border-rose-400 text-rose-400' : dark ? 'border-white/20 focus:border-violet-400' : 'border-line-200 focus:border-journey-400'
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
                  className="min-h-11 shrink-0 rounded-xl bg-white/25 px-4 text-sm font-black text-white ring-1 ring-white/50"
                >
                  <SkipForward className="mr-1 inline h-3.5 w-3.5" />
                  Skip
                </button>
              </form>
              {busy && (
                <p className="mt-3 text-sm font-bold text-white" role="status">
                  It was <span className="rounded-md bg-white px-2 font-black tracking-widest text-emerald-600">{word}</span>
                </p>
              )}
            </>
          )}
          </div>
          </div>
        </div>
      )}
    </GameShell>
  );
}
