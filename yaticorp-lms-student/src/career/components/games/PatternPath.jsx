import { useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useTimedRound from './useTimedRound';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { GAP, makePatternLevel, patternConfig } from '../../data/patternPath';

/**
 * Pattern Path (2026-11-18 redesign, the user: "make it attractive"): the young section's pattern game, in pictures.
 * Each round lays the pattern out as something to look at — beads on a necklace, a train's carriages, stepping stones
 * over a river — with a glowing "?" to fill, and four big picture choices. After the tap the repeating part is shown
 * and the next round comes on its own. Rounds: data/patternPath.js.
 */
export default function PatternPath({ onExit }) {
  const progress = useGameProgress('pattern-path', { bands: SECTION_BANDS.young });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

const RIGHT_MS = 2200;
const WRONG_MS = 3800;
const freshSeed = () => Math.floor(Math.random() * 4294967296);

/** Each look has its own stage and its own way of holding a picture. */
const STAGE = {
  beads: { bg: 'from-fuchsia-400 via-pink-400 to-rose-300', title: '📿 Finish the necklace!' },
  train: { bg: 'from-sky-300 via-sky-400 to-emerald-300', title: '🚂 Fill the train!' },
  stones: { bg: 'from-cyan-400 via-sky-500 to-blue-600', title: '🪨 Cross the river!' }
};
const CARRIAGE = ['bg-rose-400', 'bg-amber-400', 'bg-emerald-400', 'bg-sky-400', 'bg-violet-400'];

/** A picture, or a little group of one picture (growing rounds). */
function Pic({ item, size = 'row' }) {
  if (item && typeof item === 'object' && item.type === 'group') {
    return (
      <span className={`flex flex-wrap items-center justify-center leading-none ${size === 'row' ? 'max-w-[3rem] text-[0.95rem]' : 'max-w-[85%] text-2xl sm:text-3xl'}`}>
        {Array.from({ length: item.n }, (_, i) => <span key={i}>{item.e}</span>)}
      </span>
    );
  }
  const e = item && typeof item === 'object' ? item.e : item;
  return <span className={`leading-none drop-shadow-[0_3px_2px_rgba(0,0,0,0.25)] ${size === 'row' ? 'text-3xl' : 'text-5xl sm:text-6xl'}`}>{e}</span>;
}

/** One spot in the row, dressed for the round's look. The gap glows until it is filled. */
function Spot({ style, item, index, filled, right }) {
  const gap = item === GAP;
  const content = gap ? (filled != null ? <span className="oo-pop"><Pic item={filled} /></span> : <span className="text-2xl font-black text-white drop-shadow">?</span>) : <Pic item={item} />;
  const gapRing = gap ? (filled != null ? (right ? 'ring-4 ring-emerald-300' : 'ring-4 ring-rose-300') : 'pp-glow ring-4 ring-white/90 ring-dashed') : '';
  if (style === 'train') {
    return (
      <span className="relative flex flex-col items-center">
        <span className={`grid h-14 w-14 place-items-center rounded-t-xl rounded-b-md shadow-[inset_0_-4px_0_rgba(0,0,0,0.15)] ${gap && filled == null ? 'bg-white/30' : CARRIAGE[index % CARRIAGE.length]} ${gapRing}`}>
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-white/85">{content}</span>
        </span>
        <span className="-mt-1 flex gap-4" aria-hidden><span className="size-3 rounded-full bg-slate-700 ring-2 ring-slate-400" /><span className="size-3 rounded-full bg-slate-700 ring-2 ring-slate-400" /></span>
      </span>
    );
  }
  if (style === 'stones') {
    return (
      <span className={`grid h-14 w-16 place-items-center rounded-[50%] shadow-[0_5px_0_rgba(15,23,42,0.35)] ${gap && filled == null ? 'bg-white/25' : 'bg-gradient-to-b from-stone-200 to-stone-400'} ${gapRing}`}>
        {content}
      </span>
    );
  }
  // beads
  return (
    <span className={`grid h-14 w-14 place-items-center rounded-full shadow-[inset_0_-5px_0_rgba(0,0,0,0.12),0_3px_6px_rgba(0,0,0,0.2)] ${gap && filled == null ? 'bg-white/30' : 'bg-gradient-to-br from-white to-pink-100'} ${gapRing}`}>
      {content}
    </span>
  );
}

function Round({ progress, onExit }) {
  const cfg = patternConfig(progress.levelNo);
  const [rounds] = useState(() => makePatternLevel(seeded(freshSeed()), progress.levelNo));
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState(null);
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [started, setStarted] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const finished = index >= rounds.length;
  const { seconds, over: timeUp } = useTimedRound(cfg.seconds, started, finished);
  const over = started && (finished || timeUp);
  const passed = score >= cfg.pass;
  const stars = over ? starsForFixed(score, cfg.pass, rounds.length) : 0;
  useRecordStars(progress, over, stars, { correct: score, wrong, hints: 0, score, limitMs: cfg.seconds * 1000 });

  const round = rounds[Math.min(index, rounds.length - 1)];
  const stage = STAGE[round.style];
  const answered = chosen !== null;
  const right = answered && chosen === round.answerIndex;

  const next = () => { clearTimeout(timer.current); setChosen(null); setIndex((i) => i + 1); };
  const choose = (i) => {
    if (answered || over) return;
    setChosen(i);
    if (i === round.answerIndex) { sfx.right(); setScore((s) => s + 1); timer.current = setTimeout(next, RIGHT_MS); }
    else { sfx.wrong(); setWrong((w) => w + 1); timer.current = setTimeout(next, WRONG_MS); }
  };

  const answerItem = round.options[round.answerIndex];
  const filled = answered ? (round.kind === 'grow' ? answerItem : answerItem.e) : null;

  return (
    <GameShell
      title="Pattern Path"
      blurb="Find what comes next in the pattern."
      tone="bg-gradient-to-br from-sky-500 to-indigo-700"
      score={`${score}/${rounds.length}`}
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      seconds={started ? seconds : undefined}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective: `Look at the row of pictures and find what repeats. Then tap the picture that fills the “?”. Get ${cfg.pass} of ${rounds.length} right!`, seconds: cfg.seconds, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) } : null}
      result={over ? { passed, stars, headline: passed ? `Level ${progress.level} cleared!` : 'Good try — play again!', detail: `${score} of ${rounds.length} patterns right`, atEnd: progress.atEnd, onNext: progress.advance, onRetry: progress.retry } : null}
      footer={<p className="text-center text-sm text-ink-500">Pattern {Math.min(index + 1, rounds.length)} of {rounds.length}</p>}
    >
      {started && !over && (
        <div className="mx-auto w-full max-w-md">
          {/* The stage: the pattern laid out as a necklace, a train or stepping stones. */}
          <div key={index} className={`oo-stage relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br ${stage.bg} px-3 pt-3 pb-4 shadow-[0_12px_28px_-12px_rgba(30,41,59,0.55)]`}>
            {round.style === 'stones' && <span aria-hidden className="pp-river pointer-events-none absolute" style={{ inset: "-10% -25%" }} />}
            {round.style === 'train' && <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-emerald-500/70 to-transparent" />}
            <div className="relative mb-3 flex items-center justify-between gap-2">
              <span className="rounded-full bg-white/90 px-3 py-1 text-sm font-black text-ink-900 shadow-sm">{stage.title}</span>
            </div>
            <div className={`relative flex flex-wrap items-end justify-center ${round.style === 'beads' ? 'gap-0' : 'gap-1.5'}`} aria-label={`Pattern: ${round.row.map((x) => (x === GAP ? 'blank' : typeof x === 'object' ? `${x.n} ${x.e}` : x)).join(', ')}`}>
              {round.style === 'train' && <span className="mr-0.5 text-5xl leading-none drop-shadow" aria-hidden>🚂</span>}
              {round.row.map((item, i) => (
                <span key={i} className="oo-card relative flex items-center" style={{ animationDelay: `${i * 60}ms` }}>
                  {round.style === 'beads' && i > 0 && <span aria-hidden className="h-1 w-2 rounded bg-amber-200 shadow-sm" />}
                  <Spot style={round.style} item={item} index={i} filled={item === GAP ? filled : null} right={right} />
                </span>
              ))}
            </div>
          </div>

          {/* Four big picture choices. */}
          <div className="mt-4 grid grid-cols-2 gap-3" role="group" aria-label="What goes in the gap?">
            {round.options.map((opt, i) => {
              const isAnswer = i === round.answerIndex;
              const state = !answered ? 'idle' : isAnswer ? 'odd' : i === chosen ? 'miss' : 'rest';
              return (
                <button
                  key={`${index}-${i}`}
                  type="button"
                  onClick={() => choose(i)}
                  disabled={answered}
                  aria-label={opt.type === 'group' ? `${opt.n} ${opt.e}` : opt.e}
                  style={{ animationDelay: `${200 + i * 70}ms` }}
                  className={`oo-card relative grid h-24 place-items-center rounded-3xl bg-white transition-all duration-200 sm:h-28 ${
                    state === 'idle' ? 'shadow-[0_6px_0_rgba(15,23,42,0.15)] ring-2 ring-slate-100 hover:-translate-y-1 active:translate-y-0.5 active:shadow-[0_2px_0_rgba(15,23,42,0.15)]'
                      : state === 'odd' ? 'oo-win -translate-y-1 shadow-[0_6px_0_#047857] ring-4 ring-emerald-400'
                        : state === 'miss' ? 'gs-wrong shadow-[0_6px_0_#be123c] ring-4 ring-rose-400'
                          : 'scale-95 opacity-50'
                  }`}
                >
                  <Pic item={opt} size="choice" />
                  {state === 'odd' && <span className="absolute -top-2 -right-2 grid size-8 place-items-center rounded-full bg-emerald-500 text-lg font-black text-white shadow-md">✓</span>}
                  {state === 'miss' && <span className="absolute -top-2 -right-2 grid size-8 place-items-center rounded-full bg-rose-500 text-lg font-black text-white shadow-md">✗</span>}
                </button>
              );
            })}
          </div>

          {/* Why — the part that repeats, every round. Tap to go on sooner. */}
          <div className="mt-3 min-h-[5.5rem]" aria-live="polite">
            {answered ? (
              <button type="button" onClick={next} className={`oo-pop w-full rounded-3xl p-3 text-left shadow-sm ring-2 ${right ? 'bg-emerald-50 ring-emerald-200' : 'bg-amber-50 ring-amber-200'}`}>
                <p className={`text-lg font-black ${right ? 'text-emerald-700' : 'text-amber-800'}`}>{right ? ['Yay! 🎉', 'Super! ⭐', 'You got it! 🙌', 'Clever! 🧠'][index % 4] : 'Oops! Look again:'}</p>
                {round.unit && (
                  <p className="mt-1 flex flex-wrap items-center gap-1 text-base font-bold text-ink-900">
                    🔁 It repeats:
                    <span className="inline-flex gap-1 rounded-full bg-white px-2 py-0.5 text-2xl shadow-sm ring-1 ring-slate-200">{round.unit.map((u, k) => <span key={k}>{u}</span>)}</span>
                  </p>
                )}
                <p className="mt-1 text-sm font-semibold text-ink-700">{round.why}</p>
              </button>
            ) : (
              <p className="pt-2 text-center text-base font-black text-ink-900">Which picture fills the <span className="rounded-md bg-sky-100 px-1.5 text-sky-700">?</span> 👆</p>
            )}
          </div>
        </div>
      )}
    </GameShell>
  );
}
