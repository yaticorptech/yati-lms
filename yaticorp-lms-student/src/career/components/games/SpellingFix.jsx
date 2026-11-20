import { useMemo } from 'react';
import QuizGame from './QuizGame';
import { currentAgeBand } from './levels';
import { bandKey, isYoung, spellingBands } from '../../data/bands/words';

/**
 * ✍️ Vocabulary: exactly one of the options is spelled correctly.
 *
 * Per age band (data/bands/words.js): Foundation picks the right spelling of a picture word from three
 * (🐱 cat / kat / catt); Developing, everyday primary words; Intermediate, the commonly misspelled
 * (separate, definitely); Analytical and Advanced, the generator's harder bands plus commonly confused
 * pairs, where a sentence decides which correctly spelled word belongs.
 * The picture (`picture`) and the reason (`explain`) are drawn by QuizGame.
 */
export default function SpellingFix({ onExit }) {
  const band = bandKey(currentAgeBand());
  const young = isYoung(band);
  const questions = useMemo(() => spellingBands()[band], [band]);

  return (
    <QuizGame
      gameId="spelling-fix"
      title="Spelling Fix"
      tone="bg-gradient-to-br from-rose-500 to-pink-700"
      questions={questions}
      onExit={onExit}
      stage="sf-stage relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-rose-400 via-pink-400 to-amber-300 p-4 shadow-[0_14px_30px_-14px_rgba(225,29,72,0.55)] sm:p-5"
      renderOption={(option, state, i) => <WordCard word={String(option)} state={state} i={i} young={young} />}
      renderPrompt={(q) =>
        q.kind === 'pair' ? (
          <>
            <Floaters />
            <span className="relative inline-block rounded-full bg-white/90 px-3 py-1 text-xs font-black text-rose-700 shadow-sm">✍️ Which word fits?</span>
            <p className="relative mt-3 rounded-2xl bg-white/95 px-3 py-3 text-lg font-black leading-snug text-ink-900 shadow-sm sm:text-xl">
              <Gap text={q.sentence} />
            </p>
          </>
        ) : (
          <>
            <Floaters />
            <span className="relative inline-block rounded-full bg-white/90 px-3 py-1 text-xs font-black text-rose-700 shadow-sm">✍️ Spot the right spelling</span>
            <p className={`relative mt-2 font-black text-white [text-shadow:0_2px_0_rgba(190,18,60,0.35)] ${young ? 'text-2xl' : 'text-xl'}`}>
              {young ? 'Which word is right?' : 'Which one is spelled correctly?'}
            </p>
          </>
        )
      }
    />
  );
}

/* The answers on the coloured stage (2026-11-18): a white card each with a coloured edge; green with a tick when right. */
const EDGE = ['border-l-violet-500', 'border-l-sky-500', 'border-l-amber-500', 'border-l-emerald-500'];
export function WordCard({ word, state, i, young }) {
  // A plain word on a clickable card (2026-11-18, the user: "keep the options normal clickable ones").
  const look = state === 'right' ? 'bg-emerald-500 text-white shadow-[0_5px_0_#047857]'
    : state === 'wrong' ? 'bg-rose-500 text-white shadow-[0_5px_0_#be123c]'
      : state === 'dim' ? 'bg-white/85 text-ink-400 shadow-none'
        : 'bg-white text-ink-900 shadow-[0_5px_0_rgba(15,23,42,0.14)] hover:-translate-y-0.5 hover:bg-rose-50 active:translate-y-0.5';
  return (
    <span className={`relative flex min-h-16 items-center justify-center gap-2 rounded-2xl border-l-[6px] px-3 py-3 font-black tracking-wide transition-[transform,box-shadow,background-color] [overflow-wrap:anywhere] ${young ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'} ${EDGE[i % EDGE.length]} ${look}`}>
      {state === 'right' && <span aria-hidden>✓</span>}
      {state === 'wrong' && <span aria-hidden>✗</span>}
      {word}
    </span>
  );
}

/** Faint letters drifting behind the stage. */
function Floaters() {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {[['A', 6, 10, -12], ['b', 86, 6, 10], ['C', 4, 72, 8], ['?', 90, 70, -8], ['e', 48, 92, 0], ['Z', 78, 38, 14]].map(([c, x, y, r]) => (
        <span key={c} className="absolute text-4xl font-black text-white/25" style={{ left: `${x}%`, top: `${y}%`, transform: `rotate(${r}deg)` }}>{c}</span>
      ))}
    </span>
  );
}

/** A sentence with its "___" drawn as a gap. */
function Gap({ text }) {
  const [before, after] = text.split('___');
  return (
    <>
      {before}
      <span className="mx-1 inline-block min-w-16 rounded border-b-4 border-dashed border-rose-500 bg-rose-50 align-baseline" aria-label="blank">&nbsp;</span>
      {after}
    </>
  );
}
