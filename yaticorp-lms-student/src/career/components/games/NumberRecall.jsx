import { useState, useEffect, useRef } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsFor, starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import RecallMistake from './RecallMistake';
import { sfx } from './gameSfx';
import { numberRecallConfig, makeDigits, dualRound, showMsFor } from '../../data/bands/memory';

/**
 * A big on-screen number pad for the young bands (also used by Reverse Recall): the digits typed so far in large
 * boxes, then 1–9, delete, 0 and OK, every key at least 56px. The physical keyboard works too — digits, Backspace,
 * Enter — while it is on screen.
 */
export function NumberPad({ value, onChange, onSubmit, maxLength, label = 'Your answer' }) {
  const latest = useRef({ value, onChange, onSubmit, maxLength });
  useEffect(() => { latest.current = { value, onChange, onSubmit, maxLength }; });
  useEffect(() => {
    const onKey = (e) => {
      const { value: v, onChange: change, onSubmit: submit, maxLength: max } = latest.current;
      if (/^[0-9]$/.test(e.key)) { e.preventDefault(); if (v.length < max) change(v + e.key); }
      else if (e.key === 'Backspace') { e.preventDefault(); change(v.slice(0, -1)); }
      else if (e.key === 'Enter') { e.preventDefault(); if (v) submit(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const key = 'fp-press flex h-14 items-center justify-center rounded-2xl text-2xl font-black sm:h-16';
  return (
    <div className="mx-auto w-full max-w-xs">
      <div className="flex min-h-16 flex-wrap items-center justify-center gap-1.5" aria-label={label} aria-live="polite">
        {Array.from({ length: maxLength }, (_, i) => (
          <span
            key={i}
            className={`flex h-14 w-11 items-center justify-center rounded-xl text-3xl font-black tabular-nums ${
              value[i] !== undefined ? 'bg-indigo-100 text-indigo-800 ring-2 ring-indigo-300' : 'bg-surface-100 text-ink-300'
            }`}
          >
            {value[i] ?? '·'}
          </span>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2" role="group" aria-label="Number pad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button key={n} type="button" className={`${key} bg-surface text-ink-900 ring-1 ring-line-200 hover:bg-indigo-50`}
            onClick={() => value.length < maxLength && onChange(value + n)}>
            {n}
          </button>
        ))}
        <button type="button" aria-label="Delete" className={`${key} bg-rose-50 text-rose-600 ring-1 ring-rose-200`} onClick={() => onChange(value.slice(0, -1))}>
          ⌫
        </button>
        <button type="button" className={`${key} bg-surface text-ink-900 ring-1 ring-line-200 hover:bg-indigo-50`}
          onClick={() => value.length < maxLength && onChange(`${value}0`)}>
          0
        </button>
        <button type="button" aria-label="Check" disabled={!value} className={`${key} bg-gradient-to-r from-indigo-500 to-violet-600 text-white disabled:opacity-40`} onClick={onSubmit}>
          ✓
        </button>
      </div>
    </div>
  );
}

/**
 * 🔢 Memory & focus: hold a number in your head, then type it back.
 *
 * Per age band (data/bands/memory.js): Young Thinkers start at 2–3 digits shown for a long time and type on a big
 * number pad, rising slowly to 5 (Foundation) or 6 (Developing); Rising Brains play the long classic; Master Minds
 * see TWO numbers, one after the other, and are then asked for one of them — the second one pushes on the first.
 */
export default function NumberRecall({ onExit }) {
  const progress = useGameProgress('number-recall');
  return (
    <Round
      key={`${progress.level}-${progress.attempt}`}
      progress={progress}
      onExit={onExit}
    />
  );
}

const newRound = (config, length) => {
  if (config.mode === 'dual') {
    const r = dualRound(length);
    return { shown: [r.first, r.second], ask: r.ask, answer: r.answer };
  }
  const digits = makeDigits(length);
  return { shown: [digits], ask: null, answer: digits };
};

const objectiveFor = (config) => {
  if (config.mode === 'dual') {
    return `Two numbers appear, one after the other. Remember BOTH — then you are asked to type the first or the second. Reach ${config.target} digits.`;
  }
  if (config.young) return `Look at the number. When it hides, type it back. Get to ${config.target} digits!`;
  return `Recall ${config.target} digits to clear this level.`;
};

function Round({ progress, onExit }) {
  const [started, setStarted] = useState(false);
  const [config] = useState(() => numberRecallConfig({ ageBand: progress.ageBand, difficulty: progress.difficulty, levelNo: progress.levelNo }));
  const [round, setRound] = useState(() => newRound(config, config.start));
  // Which part of the round is up: 0…shown.length-1 a number on show, shown.length the answer.
  const [phase, setPhase] = useState(0);
  const [guess, setGuess] = useState('');
  const [best, setBest] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [dead, setDead] = useState(false);
  const [won, setWon] = useState(false);
  // A wrong answer is shown first — what was asked, what was typed, the wrong
  // digits marked — and the round ends only when the student moves on.
  const [mistake, setMistake] = useState(null);
  const inputRef = useRef(null);

  const length = round.answer.length;
  const showing = phase < round.shown.length;

  useEffect(() => {
    // The digits were revealed and hidden again behind the intro panel.
    if (!started || !showing) return undefined;
    const t = setTimeout(() => setPhase((p) => p + 1), showMsFor(config, length));
    return () => clearTimeout(t);
  }, [started, showing, phase, config, length]);

  const passed = best >= config.target;
  const finishedRound = dead || won;
  const stars = finishedRound
    ? config.young ? starsForFixed(best, config.target, config.maxLen) : starsFor(best, config.target, false)
    : 0;
  useRecordStars(progress, finishedRound, stars, { correct, wrong: dead ? 1 : 0, score: best });

  const check = () => {
    if (showing || finishedRound || mistake) return;
    const typed = guess.trim();
    if (!typed) return;
    if (typed === round.answer) {
      setBest(length);
      setCorrect((c) => c + 1);
      setGuess('');
      if (length >= config.maxLen) {
        setWon(true);
        return;
      }
      setRound(newRound(config, length + 1));
      setPhase(0);
    } else {
      sfx.wrong();
      setMistake({ asked: round.answer, typed });
    }
  };

  const submit = (event) => {
    event.preventDefault();
    check();
  };

  const askLabel = round.ask === 'first' ? 'the FIRST number' : round.ask === 'second' ? 'the SECOND number' : null;

  return (
    <GameShell
      title="Number Recall"
      blurb={config.mode === 'dual' ? `Hold two numbers. Reach ${config.target} digits.` : `Recall ${config.target} digits to clear this level.`}
      tone="bg-gradient-to-br from-indigo-500 to-violet-700"
      score={length}
      scoreLabel="Digits"
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
              headline: passed ? `Level ${progress.level} cleared!` : config.young ? 'Nice try — you can do it!' : 'So close',
              detail: `${best} digits remembered`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={
        <p className="text-center text-sm text-ink-500" aria-live="polite">
          {showing
            ? round.shown.length > 1 ? `Number ${phase + 1} of 2 — memorise it…` : config.young ? 'Look carefully…' : 'Memorise it…'
            : askLabel ? `Type ${askLabel}` : config.young ? 'Now tap the number you saw' : 'Now type what you saw'}
        </p>
      }
    >
      {started && !finishedRound && mistake && (
        <RecallMistake
          {...mistake}
          askedLabel={askLabel ? `The ${round.ask} number` : 'The number'}
          onContinue={() => setDead(true)}
        />
      )}

      {started && !finishedRound && !mistake && (
        <div className="mx-auto max-w-md text-center">
          {round.shown.length > 1 && showing && (
            <p className={`mb-2 text-[0.7rem] font-black tracking-[0.14em] uppercase ${phase === 0 ? 'text-indigo-600' : 'text-fuchsia-600'}`}>
              {phase === 0 ? 'First number' : 'Second number'}
            </p>
          )}
          {askLabel && !showing && (
            <p className="gs-pop mx-auto mb-3 w-fit rounded-2xl bg-fuchsia-50 px-4 py-2 text-base font-black text-fuchsia-700 ring-2 ring-fuchsia-200" role="status">
              Type {askLabel}
            </p>
          )}

          {(showing || !config.young) && (
            <div className="flex min-h-20 flex-wrap items-center justify-center gap-2">
              {(showing ? round.shown[phase] : round.answer).split('').map((d, i) => (
                <span
                  key={`${phase}-${i}`}
                  className={`flex items-center justify-center rounded-2xl font-black tabular-nums ${
                    config.young ? 'h-20 w-16 text-5xl' : 'h-16 w-12 text-3xl'
                  } ${
                    showing ? (phase === 1 ? 'bg-fuchsia-50 text-fuchsia-700' : 'bg-indigo-50 text-indigo-700') : 'bg-surface-100 text-ink-300'
                  }`}
                >
                  {showing ? d : '?'}
                </span>
              ))}
            </div>
          )}

          {!showing && config.young && (
            <NumberPad value={guess} onChange={setGuess} onSubmit={check} maxLength={length} label="The number you saw" />
          )}

          {!showing && !config.young && (
            <form onSubmit={submit} className="mt-5 flex flex-wrap justify-center gap-2">
              <input
                ref={inputRef}
                // The hide timer's focus() runs before this input is mounted,
                // so it found nothing; focus it as it appears instead.
                autoFocus
                value={guess}
                onChange={(e) => setGuess(e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                placeholder="The number"
                aria-label={askLabel ? `Type ${askLabel}` : 'The number you saw'}
                autoComplete="off"
                className="min-h-11 min-w-0 flex-1 basis-48 rounded-xl border border-line-200 bg-surface px-4 text-center text-lg font-black tracking-widest text-ink-900 focus:border-journey-400 focus:outline-none"
              />
              <button
                type="submit"
                className="fp-press min-h-11 shrink-0 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-5 text-sm font-black text-white"
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
