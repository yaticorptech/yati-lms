import { useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { QC_OPTIONS, checkQuant, makeQuantLevel, parseNumber, quantConfig } from '../../data/bands/hQuant';

/**
 * Quantitative Arena (Master Minds; extends Quick Compare): GRE-style quantitative comparison — Quantity A against
 * Quantity B under a condition: A greater, B greater, equal, or cannot be determined (decided by sampling values that
 * satisfy the condition) — mixed with multi-step word problems answered by typing a number. Each question has its own
 * clock (pausable); correctness is what scores.
 */

const freshSeed = () => Math.floor(Math.random() * 2 ** 31);
const TICK = 250;

export default function QuantitativeArena({ onExit }) {
  const progress = useGameProgress('quantitative-arena', { bands: SECTION_BANDS.master });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const config = quantConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  const [rounds] = useState(() => makeQuantLevel(seeded(freshSeed()), config));
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);      // ms on this question, paused time excluded
  const [typed, setTyped] = useState('');
  const [locked, setLocked] = useState(null);     // { ok, given, timeout }
  const [correct, setCorrect] = useState(0);
  const over = index >= rounds.length;
  const round = rounds[Math.min(index, rounds.length - 1)];
  const limit = (round.kind === 'qc' ? config.qcSeconds : config.wordSeconds) * 1000;
  const left = Math.max(0, Math.ceil((limit - elapsed) / 1000));
  const stars = over ? starsForFixed(correct, config.pass, rounds.length) : 0;
  const totalLimit = rounds.reduce((s, r) => s + (r.kind === 'qc' ? config.qcSeconds : config.wordSeconds), 0) * 1000;
  useRecordStars(progress, over, stars, { correct, wrong: Math.min(index, rounds.length) - correct, hints: 0, score: correct, limitMs: totalLimit });

  // The question clock: advances only while playing, not paused, and not yet answered.
  const running = started && !over && !paused && !locked;

  const answer = (given, timeout = false) => {
    if (locked || over) return;
    const ok = !timeout && checkQuant(round, given);
    if (ok) { setCorrect((c) => c + 1); sfx.right?.(); } else sfx.wrong();
    setLocked({ ok, given, timeout });
  };

  // Ticks resume from the time already spent (a pause stops the clock; no wall-clock gaps count).
  useEffect(() => {
    if (!running) return undefined;
    let spent = elapsed;
    const t = setInterval(() => {
      spent += TICK;
      setElapsed(spent);
      if (spent >= limit) { clearInterval(t); answer(null, true); }
    }, TICK);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, index]);

  const next = () => {
    setIndex((i) => i + 1);
    setElapsed(0);
    setTyped('');
    setLocked(null);
  };

  useEffect(() => {
    if (!running || round.kind !== 'qc') return undefined;
    const onKey = (e) => {
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= 4) answer(QC_OPTIONS[n - 1].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const typedOk = Number.isFinite(parseNumber(typed));

  return (
    <GameShell
      title="Quantitative Arena"
      blurb={`Compare quantities and solve multi-step problems. ${config.pass} of ${rounds.length} to pass.`}
      tone="bg-gradient-to-br from-slate-800 to-sky-800"
      variant="premium"
      score={`${correct}/${rounds.length}`}
      scoreLabel="Correct"
      seconds={started && !over ? left : undefined}
      totalSeconds={limit / 1000}
      paused={paused}
      onPause={() => setPaused((p) => !p)}
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={
        !started
          ? {
              gameId: progress.gameId,
              level: progress.level,
              objective: `${rounds.length} questions. Comparisons: decide whether Quantity A is greater, B is greater, they are equal, or it cannot be determined — test fractions, negatives and large values against the condition. Word problems: type the number (to 2 decimals). ${config.qcSeconds}s per comparison, ${config.wordSeconds}s per problem. Get ${config.pass} right to pass.`,
              seconds: config.qcSeconds,
              stars: starsOn(progress.gameId, progress.level),
              onStart: () => setStarted(true)
            }
          : null
      }
      result={
        over
          ? {
              passed: stars > 0,
              stars,
              headline: stars > 0 ? `Level ${progress.level} cleared` : 'Not this time',
              detail: `${correct} of ${rounds.length} correct`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={<p>Comparisons: keys 1–4 pick an answer. Word problems: type a number and press Enter. Pause any time.</p>}
    >
      {started && !over && (
        <div className="mx-auto w-full max-w-2xl">
          <p className="mb-3 text-xs font-bold tracking-[0.16em] text-sky-700 uppercase sm:text-[0.68rem]">
            Question {index + 1} of {rounds.length} · {round.kind === 'qc' ? 'Quantitative comparison' : 'Problem solving'}
          </p>

          {round.kind === 'qc' ? (
            <>
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 ring-inset">
                <p className="text-center text-sm font-bold text-ink-700">{round.cond === 'No condition' ? 'Compare the two quantities.' : <>Condition: <span className="font-black text-ink-900">{round.cond}</span></>}</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {[['Quantity A', round.a], ['Quantity B', round.b]].map(([k, v]) => (
                    <div key={k} className="rounded-xl bg-white p-3 text-center ring-1 ring-slate-200">
                      <p className="text-xs font-bold tracking-[0.14em] text-ink-500 uppercase sm:text-[0.66rem]">{k}</p>
                      <p className="mt-1 font-serif text-xl font-bold break-words text-ink-900 sm:text-2xl">{v}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {QC_OPTIONS.map((o, i) => {
                  const verdict = locked ? (o.id === round.answer ? 'bg-emerald-50 ring-emerald-500' : locked.given === o.id ? 'bg-rose-50 ring-rose-400' : 'bg-white ring-slate-200 opacity-70') : 'bg-white ring-slate-200 hover:ring-sky-400';
                  return (
                    <button key={o.id} type="button" disabled={Boolean(locked)} onClick={() => answer(o.id)} className={`fp-press min-h-12 rounded-xl px-3 text-left text-sm font-bold text-ink-900 ring-2 ring-inset transition ${verdict}`}>
                      <span className="mr-2 text-ink-400 tabular-nums">{i + 1}</span>{o.label}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <form
              onSubmit={(e) => { e.preventDefault(); if (typedOk) answer(typed); }}
              className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 ring-inset"
            >
              <p className="text-base leading-relaxed font-semibold text-ink-900">{round.text}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor="qa-answer">Your answer</label>
                <input
                  id="qa-answer"
                  inputMode="decimal"
                  autoComplete="off"
                  autoFocus
                  value={typed}
                  disabled={Boolean(locked)}
                  onChange={(e) => setTyped(e.target.value)}
                  className="min-h-12 w-40 max-w-full rounded-xl bg-white px-3 text-lg font-bold text-ink-900 tabular-nums ring-2 ring-slate-300 ring-inset focus:ring-sky-500 focus:outline-none"
                  placeholder="0.00"
                />
                {round.unit && <span className="text-sm font-bold text-ink-600">{round.unit}</span>}
                {!locked && (
                  <button type="submit" disabled={!typedOk} className="fp-press min-h-12 rounded-xl bg-slate-900 px-5 text-sm font-black text-white disabled:opacity-40">Submit</button>
                )}
              </div>
              {typed && !typedOk && !locked && <p className="mt-1 text-xs font-semibold text-rose-600">Enter a number, e.g. 12.5 or −4.</p>}
            </form>
          )}

          {locked && <Verdict round={round} locked={locked} onNext={next} last={index === rounds.length - 1} />}
        </div>
      )}
    </GameShell>
  );
}

function Verdict({ round, locked, onNext, last }) {
  const btn = useRef(null);
  useEffect(() => { btn.current?.focus(); }, []);
  const right = round.kind === 'qc' ? QC_OPTIONS.find((o) => o.id === round.answer).label : `${round.answer}${round.unit && round.unit !== '₹' ? ` ${round.unit}` : ''}`;
  return (
    <div role="status" aria-live="polite" className={`mt-3 rounded-2xl p-4 ring-1 ring-inset ${locked.ok ? 'bg-emerald-50 ring-emerald-200' : 'bg-rose-50 ring-rose-200'}`}>
      <p className={`text-base font-black ${locked.ok ? 'text-emerald-700' : 'text-rose-700'}`}>
        {locked.ok ? 'Correct.' : locked.timeout ? 'Time is up.' : 'Not quite.'} <span className="font-bold text-ink-900">Answer: {right}</span>
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-700">{round.why}</p>
      <div className="mt-3 flex justify-end">
        <button ref={btn} type="button" onClick={onNext} className="fp-press min-h-11 rounded-xl bg-slate-900 px-5 text-sm font-black text-white">{last ? 'Finish' : 'Next question'}</button>
      </div>
    </div>
  );
}
