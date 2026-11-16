import { useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsFor, starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import RecallMistake from './RecallMistake';
import { NumberPad } from './NumberRecall';
import { sfx } from './gameSfx';
import { reverseConfig, reverseAnswer, pictureRound, makeDigits } from '../../data/bands/memory';

/**
 * 🔢 Memory & focus: hold a sequence, then give it back backwards.
 *
 * The reverse is not a gimmick. Repeating forward can be done by echoing sound; reversing cannot, so it forces the
 * sequence to actually be held and worked on.
 *
 * Per age band (data/bands/memory.js): Young Thinkers reverse short rows of pictures (2–3 to start), tapping them
 * back last-first, before Developing moves on to digits on a big number pad; Rising Brains reverse longer
 * numbers; Master Minds reverse AND add 1 to every digit (9 becomes 0) — two operations on one held number.
 */
export default function ReverseRecall({ onExit }) {
  const progress = useGameProgress('reverse-recall');
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

const newRound = (config, length) => {
  if (config.mode === 'pictures') {
    const r = pictureRound(length, config.padSize);
    return { shown: r.shown, pad: r.pad, answer: r.answer };
  }
  const digits = makeDigits(length);
  return { shown: digits, pad: null, answer: reverseAnswer(digits, config.mode) };
};

const objectiveFor = (config) => {
  if (config.mode === 'plus1') {
    return `Memorise the number, then type it BACKWARDS with every digit 1 bigger (9 becomes 0). Example: 3 7 9 → 0 8 4. Reach ${config.target} digits.`;
  }
  if (config.mode === 'pictures') return `Look at the pictures. Then tap them back from the LAST one to the first. Get to ${config.target}!`;
  if (config.young) return `Look at the number. Then tap it in BACKWARDS — last digit first. Get to ${config.target} digits!`;
  return `Memorise the number, then type it BACKWARDS. Reach ${config.target} digits.`;
};

function Round({ progress, onExit }) {
  const [config] = useState(() => reverseConfig({ ageBand: progress.ageBand, difficulty: progress.difficulty, levelNo: progress.levelNo }));
  const [started, setStarted] = useState(false);
  const [round, setRound] = useState(() => newRound(config, config.start));
  const [showing, setShowing] = useState(true);
  const [guess, setGuess] = useState('');
  const [tapped, setTapped] = useState([]);
  const [best, setBest] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [dead, setDead] = useState(false);
  const [won, setWon] = useState(false);
  const [mistake, setMistake] = useState(null);   // shown before the round ends (2026-11-06)
  const [reveal, setReveal] = useState(0);
  const inputRef = useRef(null);
  const pending = useRef(null);
  useEffect(() => () => clearTimeout(pending.current), []);
  const length = round.shown.length;

  useEffect(() => {
    if (!started) return undefined;
    const t = setTimeout(() => setShowing(false), config.baseMs + config.perItemMs * length);
    return () => clearTimeout(t);
  }, [started, reveal, config, length]);

  // Focused once the form has mounted: focusing in the timer above ran
  // before the re-render, when the input did not exist yet.
  useEffect(() => {
    if (started && !showing) inputRef.current?.focus();
  }, [started, showing]);

  const passed = best >= config.target;
  const finishedRound = dead || won;
  const stars = finishedRound
    ? config.young ? starsForFixed(best, config.target, config.maxLen) : starsFor(best, config.target)
    : 0;
  useRecordStars(progress, finishedRound, stars, { correct, wrong: dead ? 1 : 0, score: best });

  const succeed = () => {
    setBest(length);
    setCorrect((c) => c + 1);
    setGuess('');
    setTapped([]);
    if (length >= config.maxLen) { setWon(true); return; }
    setRound(newRound(config, length + 1));
    setShowing(true);
    setReveal((n) => n + 1);
  };

  const check = () => {
    if (showing || finishedRound || mistake) return;
    const typed = guess.trim();
    if (!typed) return;
    if (typed === round.answer) succeed();
    else {
      sfx.wrong();
      setMistake({ asked: round.answer, typed, shown: round.shown });
    }
  };

  const submit = (event) => {
    event.preventDefault();
    check();
  };

  const tapPicture = (face) => {
    if (showing || finishedRound || mistake || tapped.length >= round.answer.length) return;
    const next = [...tapped, face];
    setTapped(next);
    if (face !== round.answer[next.length - 1]) {
      sfx.wrong();
      setMistake({ pictures: true, typed: next });
      return;
    }
    if (next.length === round.answer.length) pending.current = setTimeout(succeed, 350);
  };

  const askedLabel = config.mode === 'plus1' ? 'Backwards, each +1' : 'Backwards it is';

  return (
    <GameShell
      title="Reverse Recall"
      blurb={config.mode === 'pictures' ? `Tap them back, last first. Reach ${config.target}!` : config.mode === 'plus1' ? `Backwards, +1 each. Reach ${config.target} digits.` : `Reach ${config.target} digits, backwards.`}
      tone="bg-gradient-to-br from-violet-600 to-indigo-700"
      score={config.mode === 'pictures' ? `${length} pictures` : `${length} digits`}
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={
        !started
          ? {
              gameId: progress.gameId,
              level: progress.level,
              objective: objectiveFor(config),
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
              headline: passed ? `Level ${progress.level} cleared!` : config.young ? 'Great effort — try again!' : 'Good run',
              detail: `${best} ${config.mode === 'pictures' ? 'pictures' : 'digits'} reversed`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={
        <p className="text-center text-sm text-ink-500">
          {config.mode === 'plus1' ? 'Backwards, and every digit +1 (9 → 0)' : config.mode === 'pictures' ? 'Last picture first!' : 'Type the digits in reverse order'}
        </p>
      }
    >
      {started && !finishedRound && mistake && !mistake.pictures && (
        <RecallMistake {...mistake} askedLabel={askedLabel} onContinue={() => setDead(true)} />
      )}

      {started && !finishedRound && mistake?.pictures && (
        <div className="mx-auto max-w-md text-center" role="alert">
          <p className="inline-flex rounded-full bg-rose-50 px-4 py-1.5 text-sm font-black text-rose-600 ring-1 ring-rose-100">Oops! Not that one</p>
          <p className="mt-4 text-[0.65rem] font-bold tracking-[0.16em] text-ink-400 uppercase">You saw</p>
          <p className="mt-1 text-4xl">{round.shown.join(' ')}</p>
          <p className="mt-3 text-[0.65rem] font-bold tracking-[0.16em] text-ink-400 uppercase">Backwards it is</p>
          <p className="mt-1 text-4xl">{round.answer.join(' ')}</p>
          <p className="mt-3 text-[0.65rem] font-bold tracking-[0.16em] text-ink-400 uppercase">You tapped</p>
          <p className="mt-1 text-4xl">
            {mistake.typed.map((f, i) => (
              <span key={i} className={f === round.answer[i] ? '' : 'rounded-lg bg-rose-100 ring-2 ring-rose-300'}>{f} </span>
            ))}
          </p>
          <button
            type="button"
            onClick={() => setDead(true)}
            autoFocus
            className="fp-press mt-6 min-h-11 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-6 text-sm font-black text-white"
          >
            See my result
          </button>
        </div>
      )}

      {started && !finishedRound && !mistake && (
        <div className="mx-auto flex max-w-md flex-col items-center gap-5">
          {showing ? (
            <>
              <p className="text-[0.7rem] font-black tracking-[0.14em] text-violet-600 uppercase">{config.young ? 'Look carefully' : 'Memorise'}</p>
              {config.mode === 'pictures' ? (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {round.shown.map((face, i) => (
                    <span key={i} className="gs-pop flex h-20 w-20 items-center justify-center rounded-2xl bg-violet-50 text-5xl ring-2 ring-violet-200">{face}</span>
                  ))}
                </div>
              ) : (
                <p className={`font-black tracking-[0.2em] break-all text-center text-ink-900 tabular-nums ${config.young ? 'text-6xl' : 'text-5xl sm:text-6xl'}`}>
                  {round.shown}
                </p>
              )}
            </>
          ) : config.mode === 'pictures' ? (
            <>
              <p className="text-[0.7rem] font-black tracking-[0.14em] text-violet-600 uppercase">Tap them backwards — last one first</p>
              <div className="flex min-h-20 flex-wrap items-center justify-center gap-2" aria-live="polite" aria-label="Your answer">
                {round.answer.map((_, i) => (
                  <span key={i} className={`flex h-16 w-16 items-center justify-center rounded-2xl text-4xl ${tapped[i] ? 'bg-emerald-50 ring-2 ring-emerald-300' : 'bg-surface-100 ring-1 ring-line-200'}`}>
                    {tapped[i] || ''}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3" role="group" aria-label="Pictures">
                {round.pad.map((face) => (
                  <button
                    key={face}
                    type="button"
                    onClick={() => tapPicture(face)}
                    aria-label={`Picture ${face}`}
                    className="fp-press flex h-20 w-20 items-center justify-center rounded-2xl bg-surface text-5xl shadow-sm ring-2 ring-violet-200 hover:bg-violet-50"
                  >
                    {face}
                  </button>
                ))}
              </div>
            </>
          ) : config.young ? (
            <>
              <p className="text-[0.7rem] font-black tracking-[0.14em] text-violet-600 uppercase">Now tap it backwards</p>
              <NumberPad value={guess} onChange={setGuess} onSubmit={check} maxLength={length} label="The number, backwards" />
            </>
          ) : (
            <form onSubmit={submit} className="flex w-full flex-col items-center gap-4">
              <p className="text-[0.7rem] font-black tracking-[0.14em] text-violet-600 uppercase">
                {config.mode === 'plus1' ? 'Backwards, every digit +1' : 'Now type it backwards'}
              </p>
              <input
                ref={inputRef}
                value={guess}
                onChange={(e) => setGuess(e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                autoComplete="off"
                aria-label={config.mode === 'plus1' ? 'The number, in reverse, each digit plus one' : 'The number, in reverse'}
                className="w-full rounded-2xl border-2 border-line-200 bg-surface px-4 py-4 text-center text-3xl font-black tracking-[0.2em] text-ink-900 tabular-nums outline-none focus:border-violet-400"
              />
              <button
                type="submit"
                className="fp-press rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-700 px-6 py-3 text-sm font-black text-white"
              >
                Check
              </button>
            </form>
          )}
        </div>
      )}
    </GameShell>
  );
}
