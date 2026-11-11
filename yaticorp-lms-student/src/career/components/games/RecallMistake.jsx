/**
 * Oops, for the recall games (Number Recall, Reverse Recall): the answer wanted over the one typed, each wrong
 * digit marked, before the round ends. `shown` is the number as it was flashed, when the answer differs from it
 * (backwards).
 */
export default function RecallMistake({ asked, typed, shown, askedLabel = 'The number', onContinue }) {
  const len = Math.max(asked.length, typed.length);
  const wrongAt = Array.from({ length: len }, (_, i) => asked[i] !== typed[i]);
  const wrongCount = wrongAt.filter(Boolean).length;
  const cell = 'flex h-12 w-9 items-center justify-center rounded-xl text-2xl font-black tabular-nums sm:h-14 sm:w-11';
  return (
    <div className="mx-auto max-w-lg text-center" role="alert">
      <p className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-4 py-1.5 text-sm font-black text-rose-600 ring-1 ring-rose-100">
        Oops, wrong answer
      </p>
      <p className="mt-2 text-sm text-ink-500">
        {typed.length !== asked.length
          ? `The answer had ${asked.length} digits — you typed ${typed.length}.`
          : `${wrongCount} ${wrongCount === 1 ? 'digit was' : 'digits were'} wrong.`}
      </p>

      {shown && (
        <p className="mt-3 text-sm font-semibold text-ink-500">
          The number shown was <span className="font-black tracking-[0.12em] text-ink-900 tabular-nums">{shown}</span>
        </p>
      )}

      <p className="mt-4 text-[0.65rem] font-bold tracking-[0.16em] text-ink-400 uppercase">{askedLabel}</p>
      <div className="mt-1.5 flex flex-wrap justify-center gap-1.5">
        {asked.split('').map((d, i) => (
          <span key={i} className={`${cell} ${wrongAt[i] ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-300' : 'bg-indigo-50 text-indigo-700'}`}>{d}</span>
        ))}
      </div>

      <p className="mt-4 text-[0.65rem] font-bold tracking-[0.16em] text-ink-400 uppercase">You typed</p>
      <div className="mt-1.5 flex flex-wrap justify-center gap-1.5">
        {Array.from({ length: len }, (_, i) => (
          <span
            key={i}
            className={`${cell} ${wrongAt[i] ? 'bg-rose-100 text-rose-600 ring-2 ring-rose-300' : 'bg-surface-100 text-ink-700'}`}
            aria-label={wrongAt[i] ? `position ${i + 1}: ${typed[i] ?? 'missing'}, should be ${asked[i] ?? 'nothing'}` : undefined}
          >
            {typed[i] ?? '–'}
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={onContinue}
        autoFocus
        className="fp-press mt-6 min-h-11 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-6 text-sm font-black text-white"
      >
        See my result
      </button>
    </div>
  );
}
