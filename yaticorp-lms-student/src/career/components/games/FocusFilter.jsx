import { useEffect, useReducer, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { makeFocusLevel, focusConfig, trialArrows, boardPoints } from '../../data/bands/cFocus';

const TICK = 50;
const FEEDBACK_MS = 450;
const GAP_MS = 350;
const BOARD_DONE_MS = 1100;
const freshSeed = () => Math.floor(Math.random() * 4294967296);

/** 🎯 Focus: answer the middle arrow and ignore the rest, then pick every target out of a crowd of look-alikes. */
export default function FocusFilter({ onExit }) {
  const progress = useGameProgress('focus-filter', { bands: SECTION_BANDS.smart });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

const START = {
  part: 'arrows', ms: 0,
  trial: 0, stage: 'gap', stageAt: 0, verdict: null, arrowsRight: 0, arrowsWrong: 0, rts: [], streak: 0, bestStreak: 0, lastRt: null,
  board: 0, boardAt: 0, tapped: [], boardDone: false, points: []
};

const makeReducer = (level, config) => {
  const nextTrial = (s) => (s.trial + 1 >= level.trials.length
    ? { ...s, part: 'break' }
    : { ...s, trial: s.trial + 1, stage: 'gap', stageAt: s.ms, verdict: null });
  const endBoard = (s) => ({ ...s, boardDone: true, boardAt: s.ms, points: [...s.points, boardPoints(level.boards[s.board], s.tapped)] });
  return (s, a) => {
    if (s.part === 'done') return s;
    switch (a.type) {
      case 'tick': {
        const t = { ...s, ms: s.ms + TICK };
        if (t.part === 'arrows') {
          const since = t.ms - t.stageAt;
          if (t.stage === 'gap' && since >= GAP_MS) return { ...t, stage: 'show', stageAt: t.ms };
          if (t.stage === 'show' && since >= config.windowMs) return { ...t, stage: 'fb', stageAt: t.ms, verdict: 'miss', arrowsWrong: t.arrowsWrong + 1, streak: 0, lastRt: null };
          if (t.stage === 'fb' && since >= FEEDBACK_MS) return nextTrial(t);
        }
        if (t.part === 'search') {
          const since = t.ms - t.boardAt;
          if (!t.boardDone && since >= config.boardSeconds * 1000) return endBoard(t);
          if (t.boardDone && since >= BOARD_DONE_MS) {
            return t.board + 1 >= level.boards.length
              ? { ...t, part: 'done' }
              : { ...t, board: t.board + 1, boardAt: t.ms, tapped: [], boardDone: false };
          }
        }
        return t;
      }
      case 'answer': {
        if (s.part !== 'arrows' || s.stage !== 'show') return s;
        const ok = a.dir === level.trials[s.trial].answer;
        return {
          ...s, stage: 'fb', stageAt: s.ms, verdict: ok ? 'ok' : 'bad',
          arrowsRight: s.arrowsRight + (ok ? 1 : 0), arrowsWrong: s.arrowsWrong + (ok ? 0 : 1),
          rts: ok ? [...s.rts, s.ms - s.stageAt] : s.rts,
          streak: ok ? s.streak + 1 : 0, bestStreak: ok ? Math.max(s.bestStreak, s.streak + 1) : s.bestStreak,
          lastRt: ok ? s.ms - s.stageAt : null
        };
      }
      case 'search':
        return s.part === 'break' ? { ...s, part: 'search', board: 0, boardAt: s.ms, tapped: [], boardDone: false } : s;
      case 'tap': {
        if (s.part !== 'search' || s.boardDone || s.tapped.includes(a.i)) return s;
        const board = level.boards[s.board];
        const tapped = [...s.tapped, a.i];
        const t = { ...s, tapped };
        return board.targets.every((i) => tapped.includes(i)) ? endBoard(t) : t;
      }
      default:
        return s;
    }
  };
};

function Round({ progress, onExit }) {
  const config = focusConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  const [level] = useState(() => makeFocusLevel(seeded(freshSeed()), config));
  const [reducer] = useState(() => makeReducer(level, config));
  const [s, dispatch] = useReducer(reducer, START);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);

  const over = s.part === 'done';
  const board = level.boards[Math.min(s.board, level.boards.length - 1)];
  const livePoints = s.part === 'search' && !s.boardDone ? boardPoints(board, s.tapped) : 0;
  const score = s.arrowsRight + s.points.reduce((a, b) => a + b, 0) + livePoints;
  const passed = score >= level.pass;
  const stars = over ? starsForFixed(score, level.pass, level.max) : 0;
  const avgRt = s.rts.length ? Math.round(s.rts.reduce((a, b) => a + b, 0) / s.rts.length) : null;
  const searchWrong = s.points.length ? level.boards.slice(0, s.points.length).reduce((n, b, i) => n + b.targets.length - s.points[i], 0) : 0;
  useRecordStars(progress, over, stars, { correct: score, wrong: s.arrowsWrong + searchWrong, hints: 0, score });

  const ticking = started && !paused && (s.part === 'arrows' || s.part === 'search');
  useEffect(() => {
    if (!ticking) return undefined;
    const t = setInterval(() => dispatch({ type: 'tick' }), TICK);
    return () => clearInterval(t);
  }, [ticking]);

  // A buzz for a wrong or missed arrow.
  const verdictKey = s.stage === 'fb' ? `${s.trial}:${s.verdict}` : null;
  useEffect(() => {
    if (!verdictKey) return;
    if (verdictKey.endsWith(':ok')) sfx.right(); else sfx.wrong();
  }, [verdictKey]);

  // Keyboard: ← / → (or F / J) answer arrows; Enter starts the search part.
  useEffect(() => {
    if (!started || over || paused) return undefined;
    const onKey = (e) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'f') { e.preventDefault(); dispatch({ type: 'answer', dir: 'L' }); }
      else if (k === 'arrowright' || k === 'j') { e.preventDefault(); dispatch({ type: 'answer', dir: 'R' }); }
      else if (k === 'enter') dispatch({ type: 'search' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [started, over, paused]);

  const tapWrong = (i) => {
    if (board.cells[i] !== board.target) sfx.wrong();
  };

  const trial = level.trials[Math.min(s.trial, level.trials.length - 1)];
  const boardLeft = Math.max(0, config.boardSeconds * 1000 - (s.ms - s.boardAt));
  const flipRule = config.switches > 0;

  const objective = `Part 1 — ${level.trials.length} schools of fish: which way is the MIDDLE fish swimming? Ignore the others! Answer with Left / Right (or the arrow keys) within ${(config.windowMs / 1000).toFixed(1)} s.${
    flipRule ? ' A GOLDEN school 🐠 means answer the OPPOSITE way.' : ''
  } Part 2 — ${level.boards.length} search boards: tap every target symbol before ${config.boardSeconds} s run out; a wrong tap costs a point. Score ${level.pass} of ${level.max} to clear the level.`;

  return (
    <GameShell
      title="Focus Filter"
      blurb={`Filter out the distractors: middle arrow first, then hunt the targets. ${level.pass} of ${level.max} to clear.`}
      tone="bg-gradient-to-br from-fuchsia-500 to-indigo-700"
      score={`${score}/${level.max}`}
      scoreLabel="Points"
      seconds={s.part === 'search' && started ? Math.ceil(boardLeft / 1000) : undefined}
      totalSeconds={config.boardSeconds}
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      paused={paused}
      onPause={() => setPaused((p) => !p)}
      intro={
        !started
          ? { gameId: progress.gameId, level: progress.level, objective, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) }
          : null
      }
      result={
        over
          ? {
              passed, stars,
              headline: passed ? `Level ${progress.level} cleared!` : 'Distracted this time',
              detail: `${s.arrowsRight}/${level.trials.length} arrows right${avgRt ? ` · average reaction ${avgRt} ms` : ''} · search ${s.points.reduce((a, b) => a + b, 0)}/${level.max - level.trials.length}`,
              atEnd: progress.atEnd, onNext: progress.advance, onRetry: progress.retry
            }
          : null
      }
      footer={<p className="text-sm">Fish: Left / Right buttons, ← → keys or F / J. Accuracy scores the points; your reaction time is shown at the end. Pause any time.</p>}
    >
      {started && !over && (
        <div className="mx-auto w-full max-w-xl">
          {/* Parts: 1 arrows · 2 search */}
          <div className="mb-3 flex items-center justify-center gap-2" aria-hidden>
            {[['arrows', '1 · Fish'], ['search', '2 · Search']].map(([k, label]) => {
              const on = s.part === k || (k === 'arrows' && s.part === 'break');
              const done = k === 'arrows' && (s.part === 'break' || s.part === 'search');
              return (
                <span key={k} className={`rounded-full px-3 py-1 text-xs font-black tracking-wide ${done ? 'bg-emerald-100 text-emerald-700' : on ? 'bg-gradient-to-r from-sky-400 to-teal-500 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>
                  {done ? '✓ ' : ''}{label}
                </span>
              );
            })}
          </div>

          {s.part === 'arrows' && (
            <>
              <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-b from-sky-100 via-cyan-100 to-teal-200 p-4 shadow-[0_16px_32px_-20px_rgba(14,116,144,0.6)] ring-1 ring-cyan-200">
                <span aria-hidden className="absolute bottom-2 left-4 text-2xl opacity-70">🪸</span>
                <span aria-hidden className="absolute right-5 bottom-3 text-xl opacity-70">🌿</span>
                <span aria-hidden className="absolute top-10 right-8 text-sm opacity-60">🫧</span>
                <span aria-hidden className="absolute top-16 left-10 text-xs opacity-50">🫧</span>
                <div className="relative mb-3 flex items-center justify-between gap-2">
                  <p className="text-xs font-black tracking-[0.14em] text-cyan-800 uppercase">Fish {s.trial + 1} / {level.trials.length}</p>
                  <div className="flex items-center gap-1.5">
                    {s.streak >= 2 && <span className="gs-rise rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-black text-orange-600 ring-1 ring-orange-200">🔥 {s.streak} in a row</span>}
                    {s.lastRt !== null && s.stage === 'fb' && s.verdict === 'ok' && <span className="gs-rise rounded-full bg-white px-2.5 py-0.5 text-xs font-black text-sky-700 ring-1 ring-sky-200">⚡ {s.lastRt} ms</span>}
                    {flipRule && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[0.7rem] font-black text-amber-700 ring-1 ring-amber-300">🐠 golden = opposite</span>}
                  </div>
                </div>
                <div
                  className={`relative flex h-36 items-center justify-center rounded-2xl ring-2 transition-colors duration-200 sm:h-40 ${
                    s.stage === 'fb' ? (s.verdict === 'ok' ? 'bg-emerald-50/80 ring-emerald-300' : 'bg-rose-50/80 ring-rose-300') : trial.flip && s.stage === 'show' ? 'bg-amber-50/80 ring-amber-300' : 'bg-white/50 ring-white'
                  }`}
                  role="img"
                  aria-label={s.stage === 'show' ? `Fish swimming ${trialArrows(trial).map((d) => (d === 'L' ? 'left' : 'right')).join(', ')}${trial.flip ? ', golden: answer the opposite' : ''}` : 'Get ready'}
                >
                  {s.stage === 'show' && (
                    <div className="flex gap-1 sm:gap-2">
                      {trialArrows(trial).map((d, i) => (
                        <Fish key={i} dir={d} golden={trial.flip} className="w-14 drop-shadow-[0_4px_3px_rgba(8,47,73,0.25)] sm:w-[4.5rem]" />
                      ))}
                    </div>
                  )}
                  {s.stage === 'gap' && <span className="text-4xl font-black text-cyan-700/40" aria-hidden="true">+</span>}
                  {s.stage === 'fb' && (
                    <span className={`flex items-center gap-2 text-2xl font-black ${s.verdict === 'ok' ? 'text-emerald-600' : 'text-rose-600'}`} role="status">
                      <span className={`grid h-10 w-10 place-items-center rounded-full text-xl text-white ${s.verdict === 'ok' ? 'bg-emerald-500' : 'bg-rose-500'}`} aria-hidden>{s.verdict === 'ok' ? '✓' : '✗'}</span>
                      {s.verdict === 'ok' ? 'Right!' : s.verdict === 'miss' ? 'Too slow' : 'Wrong way'}
                    </span>
                  )}
                </div>
                <div className="relative mt-3 flex justify-center gap-1" aria-hidden>
                  {level.trials.map((_, i) => (
                    <span key={i} className={`h-1.5 rounded-full transition-all ${i < s.trial ? 'w-3 bg-cyan-500' : i === s.trial ? 'w-6 bg-sky-700' : 'w-3 bg-white'}`} />
                  ))}
                </div>
              </div>
              <p className="mt-3 text-center text-sm font-bold text-slate-500">Which way is the <b className="text-slate-800">middle</b> fish swimming?</p>
              <div className="mt-2 grid grid-cols-2 gap-3">
                {[['L', 'Left', ArrowLeft, '← / F', 'from-sky-400 to-blue-500'], ['R', 'Right', ArrowRight, '→ / J', 'from-teal-400 to-emerald-500']].map(([dir, name, Icon, keys, tone]) => (
                  <button
                    key={dir}
                    type="button"
                    onClick={() => dispatch({ type: 'answer', dir })}
                    aria-label={name}
                    className={`fp-press flex min-h-[4.5rem] flex-col items-center justify-center rounded-2xl bg-gradient-to-b ${tone} text-white shadow-[0_10px_20px_-10px_rgba(14,116,144,0.8)] ring-2 ring-white transition active:translate-y-0.5`}
                  >
                    <span className="flex items-center gap-2 text-lg font-black">
                      {dir === 'L' && <Icon className="h-6 w-6" aria-hidden="true" />}{name}{dir === 'R' && <Icon className="h-6 w-6" aria-hidden="true" />}
                    </span>
                    <span className="mt-0.5 rounded-md bg-white/25 px-1.5 text-[0.65rem] font-bold">{keys}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {s.part === 'break' && (
            <div className="gs-rise overflow-hidden rounded-[1.75rem] bg-white text-center shadow-[0_16px_36px_-20px_rgba(79,70,229,0.6)] ring-1 ring-indigo-100">
              <div className="bg-gradient-to-r from-sky-400 to-teal-500 px-5 py-4 text-white">
                <p className="text-xs font-black tracking-[0.16em] uppercase opacity-80">Part 1 done</p>
                <p className="mt-1 text-2xl font-black">Fish school complete 🐟</p>
              </div>
              <div className="grid grid-cols-2 gap-3 p-4">
                <div className="rounded-2xl bg-emerald-50 p-3 ring-1 ring-emerald-200">
                  <p className="text-3xl font-black text-emerald-700 tabular-nums">{s.arrowsRight}/{level.trials.length}</p>
                  <p className="text-xs font-bold text-emerald-700/70">arrows right</p>
                </div>
                <div className="rounded-2xl bg-sky-50 p-3 ring-1 ring-sky-200">
                  <p className="text-3xl font-black text-sky-700 tabular-nums">{avgRt ? `${avgRt}` : '—'}<span className="text-base">{avgRt ? ' ms' : ''}</span></p>
                  <p className="text-xs font-bold text-sky-700/70">average reaction</p>
                </div>
                <div className="col-span-2 rounded-2xl bg-orange-50 p-2 ring-1 ring-orange-200">
                  <p className="text-sm font-black text-orange-600">🔥 Best streak: {s.bestStreak}</p>
                </div>
              </div>
              <p className="px-5 text-sm font-semibold text-slate-600">
                Part 2: {level.boards.length} search boards. Tap every target — and only the targets — within {config.boardSeconds} seconds each.
              </p>
              <button type="button" onClick={() => dispatch({ type: 'search' })} className="fp-press my-4 rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-600 px-8 py-3 text-base font-black text-white shadow-lg shadow-indigo-500/30" autoFocus>
                Start the search →
              </button>
            </div>
          )}

          {s.part === 'search' && (
            <div className="overflow-hidden rounded-[1.75rem] bg-gradient-to-b from-fuchsia-50 to-indigo-50 p-3 shadow-[0_16px_36px_-22px_rgba(79,70,229,0.6)] ring-1 ring-indigo-100 sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black tracking-wide text-slate-500 uppercase">Board {s.board + 1}/{level.boards.length} · find</span>
                  <span className="grid h-11 min-w-11 place-items-center rounded-xl bg-gradient-to-b from-fuchsia-500 to-violet-600 px-2 font-mono text-2xl font-black text-white shadow-md">{board.target}</span>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-slate-700 tabular-nums shadow-sm ring-1 ring-slate-200">
                  {s.tapped.filter((i) => board.cells[i] === board.target).length}/{board.targets.length} found
                </span>
              </div>
              <div className="mb-3 h-2.5 overflow-hidden rounded-full bg-white ring-1 ring-slate-200" role="progressbar" aria-label="Board time left" aria-valuemin={0} aria-valuemax={config.boardSeconds} aria-valuenow={Math.ceil(boardLeft / 1000)}>
                <div className={`h-full rounded-full bg-gradient-to-r transition-[width] duration-75 ease-linear ${boardLeft < 4000 ? 'from-rose-400 to-rose-600' : 'from-fuchsia-400 to-indigo-500'}`} style={{ width: `${s.boardDone ? 0 : (boardLeft / (config.boardSeconds * 1000)) * 100}%` }} />
              </div>
              <div className="grid gap-1.5 sm:gap-2" style={{ gridTemplateColumns: `repeat(${board.cols}, minmax(0, 1fr))` }}>
                {board.cells.map((glyph, i) => {
                  const tapped = s.tapped.includes(i);
                  const isT = glyph === board.target;
                  const missed = s.boardDone && isT && !tapped;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => { tapWrong(i); dispatch({ type: 'tap', i }); }}
                      disabled={s.boardDone || tapped}
                      aria-label={`${glyph}${tapped ? (isT ? ', found' : ', wrong') : ''}`}
                      className={`relative flex aspect-square min-h-11 items-center justify-center rounded-xl font-mono text-2xl font-black shadow-sm transition sm:text-3xl ${
                        tapped
                          ? (isT ? 'scale-95 bg-gradient-to-b from-emerald-300 to-emerald-400 text-emerald-950 ring-2 ring-emerald-500' : 'gs-wrong bg-gradient-to-b from-rose-300 to-rose-400 text-rose-950 ring-2 ring-rose-500')
                          : missed ? 'bg-amber-200 text-amber-900 ring-2 ring-amber-400' : 'bg-white text-slate-800 ring-1 ring-slate-200 hover:-translate-y-0.5 hover:ring-fuchsia-300'
                      }`}
                    >
                      {glyph}
                      {tapped && isT && <span aria-hidden className="absolute top-0.5 right-1 text-[0.6rem] text-emerald-800">✓</span>}
                    </button>
                  );
                })}
              </div>
              {s.boardDone && (
                <p className="mt-3 text-center text-sm font-black text-slate-700" role="status" aria-live="polite">
                  +{s.points[s.points.length - 1]} points{board.targets.some((i) => !s.tapped.includes(i)) ? ' — the yellow ones were missed' : ' — all found! ✨'}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </GameShell>
  );
}

/**
 * A fish, drawn (not an emoji, whose facing differs between devices): it swims the way `dir` says ('L' or 'R').
 * Golden fish mean "answer the opposite way".
 */
export function Fish({ dir, golden = false, className = '' }) {
  const [body, fin] = golden ? ['#f59e0b', '#d97706'] : ['#38bdf8', '#0284c7'];
  return (
    <svg viewBox="0 0 64 40" className={className} style={{ transform: dir === 'L' ? 'scaleX(-1)' : undefined }} aria-hidden="true">
      <path d="M14 20 L2 8 L5 20 L2 32 Z" fill={fin} />
      <ellipse cx="34" cy="20" rx="24" ry="14" fill={body} />
      <path d="M26 7 Q34 1 42 8 Z" fill={fin} />
      <path d="M30 33 Q36 38 40 32 Z" fill={fin} />
      <path d="M20 12 Q24 20 20 28" fill="none" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" />
      <circle cx="48" cy="16" r="4.2" fill="#ffffff" />
      <circle cx="49.2" cy="16" r="2.3" fill="#0f172a" />
      <path d="M55 23 Q52 25 55 26" fill="none" stroke="#0f172a" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
