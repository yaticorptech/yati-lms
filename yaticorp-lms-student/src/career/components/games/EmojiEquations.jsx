import { useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { emojiConfig, makeEmojiPuzzle } from '../../data/bands/logicNew';

const freshSeed = () => Math.floor(Math.random() * 4294967296);
const NEXT_MS = 2600;

/** A line of terms: emoji and numbers with + − ×. */
function Terms({ terms, items, big = false }) {
  return (
    <span className="inline-flex flex-wrap items-center justify-center gap-1.5">
      {terms.map((t, i) => (typeof t === 'string'
        ? <span key={i} className={`font-black text-slate-400 ${big ? 'text-2xl' : 'text-xl'}`}>{t}</span>
        : typeof t === 'number'
          ? <span key={i} className={`font-black text-slate-800 tabular-nums ${big ? 'text-3xl' : 'text-2xl'}`}>{t}</span>
          : <span key={i} className={`grid place-items-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200 ${big ? 'h-14 w-14 text-4xl' : 'h-11 w-11 text-3xl'}`}>{items[t.item]}</span>))}
    </span>
  );
}

/**
 * 🍎 Emoji Equations (2026-11-16, new; id "emoji-equations"). Each line gives away one more picture's value; work them
 * out in order, then answer the last line — × before + and −. data/bands/logicNew.js builds the puzzles.
 */
export default function EmojiEquations({ onExit }) {
  const progress = useGameProgress('emoji-equations', { bands: SECTION_BANDS.smart });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const config = emojiConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  const [puzzles] = useState(() => { const rng = seeded(freshSeed()); return Array.from({ length: config.puzzles }, () => makeEmojiPuzzle(rng, config)); });
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState(null);
  const [right, setRight] = useState(0);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const over = idx >= puzzles.length;
  const p = over ? null : puzzles[idx];
  const stars = over ? starsForFixed(right, config.pass, puzzles.length) : 0;
  useRecordStars(progress, over, stars, { correct: right, wrong: puzzles.length - right, hints: 0, score: right });

  const answer = (n) => {
    if (picked !== null) return;
    setPicked(n);
    if (n === p.answer) { sfx.right?.(); setRight((r) => r + 1); } else sfx.wrong?.();
    timers.current.push(setTimeout(() => { setPicked(null); setIdx((i) => i + 1); }, NEXT_MS));
  };

  const objective = `Each picture stands for a number. Read the lines from the top — each one tells you one more picture — then answer the last line. Remember: × comes before + and −! ${puzzles.length} puzzles, get ${config.pass} right.`;

  return (
    <GameShell
      title="Emoji Equations"
      blurb="Crack what each picture is worth!"
      tone="bg-gradient-to-br from-pink-500 to-amber-500"
      score={`${right}/${puzzles.length}`}
      scoreLabel="Solved"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) } : null}
      result={over ? {
        passed: right >= config.pass, stars,
        headline: right >= config.pass ? `Level ${progress.level} cleared — code cracked!` : 'Nearly — check the order of operations',
        detail: `${right} of ${puzzles.length} puzzles solved`,
        atEnd: progress.atEnd, onNext: progress.advance, onRetry: progress.retry
      } : null}
      footer={<p className="text-sm">Puzzle {Math.min(idx + 1, puzzles.length)} of {puzzles.length} · × before + and −</p>}
    >
      {started && p && (
        <div key={idx} className="gs-rise mx-auto w-full max-w-lg select-none">
          <div className="rounded-[1.75rem] bg-gradient-to-br from-pink-50 via-white to-amber-50 p-4 shadow-[0_16px_32px_-20px_rgba(219,39,119,0.5)] ring-1 ring-pink-100 sm:p-5">
            <div className="space-y-2.5">
              {p.lines.map((l, i) => (
                <div key={i} className="flex items-center justify-center gap-2 rounded-2xl bg-white/70 px-3 py-2 ring-1 ring-slate-100">
                  <Terms terms={l.terms} items={p.items} />
                  <span className="text-xl font-black text-slate-400">=</span>
                  <span className="min-w-10 text-2xl font-black text-slate-800 tabular-nums">{l.total}</span>
                </div>
              ))}
              <div className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-amber-500 px-3 py-3 text-white shadow-md">
                <span className="rounded-xl bg-white/15 p-1"><Terms terms={p.question.terms} items={p.items} big /></span>
                <span className="text-2xl font-black">=</span>
                <span className="grid h-14 min-w-14 place-items-center rounded-xl bg-white px-2 text-3xl font-black text-pink-600">{picked !== null ? p.answer : '?'}</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2">
              {p.options.map((n) => {
                const look = picked === null ? 'bg-white text-slate-800 ring-pink-200 hover:-translate-y-0.5 hover:ring-pink-400'
                  : n === p.answer ? 'bg-emerald-500 text-white ring-emerald-600 gs-right' : n === picked ? 'bg-rose-500 text-white ring-rose-600 gs-wrong' : 'bg-white text-slate-300 ring-slate-100';
                return (
                  <button key={n} type="button" onClick={() => answer(n)} disabled={picked !== null}
                    className={`fp-press min-h-16 rounded-2xl text-2xl font-black tabular-nums shadow-sm ring-2 transition ${look}`}>{n}</button>
                );
              })}
            </div>

            {picked !== null && (
              <div className="mt-3 rounded-2xl bg-white p-3 text-center ring-1 ring-slate-100" role="status" aria-live="polite">
                <p className={`text-base font-black ${picked === p.answer ? 'text-emerald-600' : 'text-rose-600'}`}>{picked === p.answer ? 'Cracked it! 🎉' : `Not quite — it was ${p.answer}.`}</p>
                <p className="mt-1 flex flex-wrap justify-center gap-2 text-sm font-black text-slate-700">
                  {p.items.map((e, i) => <span key={e} className="rounded-lg bg-slate-50 px-2 py-0.5 ring-1 ring-slate-200">{e} = {p.values[i]}</span>)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </GameShell>
  );
}
