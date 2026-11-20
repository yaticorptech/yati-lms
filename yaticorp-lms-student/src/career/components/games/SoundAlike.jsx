import { useMemo } from 'react';
import QuizGame from './QuizGame';
import { currentAgeBand } from './levels';
import { SOUND_BANDS, SOUND_MEANING, bandOrDefault } from '../../data/bands/vocab';

const meaning = (word) => SOUND_MEANING[word] || SOUND_MEANING[word.toLowerCase()];

/** “sea” = the big salty water · “see” = to look with your eyes — when every word in the question is known. */
const explainOf = (h) => {
  const words = [h.answer, ...h.wrong];
  if (!words.every(meaning)) return undefined;
  return words.map((w) => `“${w.toLowerCase() === 'i' ? 'I' : w.toLowerCase()}” = ${meaning(w)}`).join(' · ');
};

/**
 * 👂 Grammar: the words sound the same; only one fits the sentence.
 *
 * Banded by age (2026-11-13, data/bands/vocab.js): picture pairs (sea/see,
 * sun/son) in tiny sentences for Classes 1–2, the common ones (their/there,
 * to/two/too) for Classes 3–5, context distinctions for Classes 6–10 and the
 * exam bank for Classes 11–12. After each answer, what each word means.
 */
export default function SoundAlike({ onExit }) {
  const band = bandOrDefault(currentAgeBand());
  const questions = useMemo(
    () =>
      SOUND_BANDS[band].map((h) => ({
        text: h.text,
        answer: h.answer,
        options: [h.answer, ...h.wrong],
        note: h.text.replace('___', h.answer),
        explain: h.explain || explainOf(h),
        picture: h.picture,
        level: h.level
      })),
    [band]
  );

  return (
    <QuizGame
      gameId="sound-alike"
      title="Sound Alike"
      tone="bg-gradient-to-br from-purple-500 to-fuchsia-700"
      questions={questions}
      onExit={onExit}
      // A coloured stage and clear word cards (2026-11-18, "attractive, professional"), as Spelling Fix.
      // A clean professional card (2026-11-18): the picture in a soft tile, the sentence, lettered answer buttons.
      stage="sa-page relative overflow-hidden rounded-2xl px-4 pt-6 pb-5 sm:px-6"
      renderOption={(option, state, i) => <Choice word={String(option)} state={state} i={i} />}
      renderPrompt={(q) => (
        <>
          <p className="relative text-[11px] font-bold tracking-[0.18em] text-slate-400 uppercase">Choose the word that fits</p>
          <p className="relative mt-2 text-xl leading-snug font-black text-slate-900 sm:text-2xl">
            {q.text.split('___').map((part, i, all) => (
              <span key={i}>
                {part}
                {i < all.length - 1 && <span className="mx-1 inline-block min-w-16 rounded-md bg-indigo-50 px-2 text-center align-baseline text-indigo-600 ring-1 ring-indigo-200">?</span>}
              </span>
            ))}
          </p>
        </>
      )}
    />
  );
}

/** An answer: a letter badge (A, B, C…) and the word; green with a tick when right, red with a cross when wrong. */
const BADGE = ['bg-indigo-500', 'bg-violet-500', 'bg-sky-500', 'bg-slate-500'];
function Choice({ word, state, i }) {
  const box = state === 'right' ? 'border-emerald-500 bg-emerald-50' : state === 'wrong' ? 'border-rose-500 bg-rose-50' : state === 'dim' ? 'border-slate-200 bg-white opacity-55' : 'border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/40';
  const badge = state === 'right' ? 'bg-emerald-500' : state === 'wrong' ? 'bg-rose-500' : BADGE[i % BADGE.length];
  return (
    <span className={`flex min-h-14 items-center gap-3 rounded-xl border px-3 py-2.5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-colors ${box}`}>
      <span className={`grid size-8 shrink-0 place-items-center rounded-lg text-sm font-black text-white ${badge}`}>{state === 'right' ? '✓' : state === 'wrong' ? '✗' : String.fromCharCode(65 + i)}</span>
      <span className="min-w-0 flex-1 text-lg font-bold text-slate-800">{word}</span>
    </span>
  );
}
