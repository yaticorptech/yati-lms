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
  // At the end of each block of swimmers: straight into that block's search board (no break screen, 2026-11-18).
  const blockOf = (t) => Math.floor(t / level.chunk);
  const nextTrial = (s) => {
    const endOfBlock = s.trial + 1 >= level.trials.length || blockOf(s.trial + 1) !== blockOf(s.trial);
    if (endOfBlock && blockOf(s.trial) < level.boards.length) return { ...s, part: 'search', board: blockOf(s.trial), boardAt: s.ms, tapped: [], boardDone: false };
    if (s.trial + 1 >= level.trials.length) return { ...s, part: 'done' };
    return { ...s, trial: s.trial + 1, stage: 'gap', stageAt: s.ms, verdict: null };
  };
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
            // Back to the swimmers for the next block, else the next board, else done.
            if (t.trial + 1 < level.trials.length) return { ...t, part: 'arrows', trial: t.trial + 1, stage: 'gap', stageAt: t.ms, verdict: null };
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

  const objective = `Swimmers and search boards take turns. Swimmers (fish, then birds, paper planes and arrows as levels rise): which way is the MIDDLE one going? Ignore the others! Answer with Left / Right (or the arrow keys) within ${(config.windowMs / 1000).toFixed(1)} s.${
    flipRule ? ' A GOLDEN school 🐠 means answer the OPPOSITE way.' : ''
  } Search boards (${level.boards.length}): tap every target symbol before ${config.boardSeconds} s run out; a wrong tap costs a point. Score ${level.pass} of ${level.max} to clear the level.`;

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
      {started && !over && (() => {
        const kind = level.creatures[Math.min(Math.floor(s.trial / level.chunk), level.creatures.length - 1)];
        const look = SCENE[kind];
        const block = Math.floor(s.trial / level.chunk);
        const inBlock = s.trial - block * level.chunk;
        const blockLen = Math.min(level.chunk, level.trials.length - block * level.chunk);
        return (
        <div className="mx-auto flex w-full max-w-xl flex-col max-sm:flex-1">
          {/* The rounds: swimmers and search boards taking turns (2026-11-18). */}
          <div className="mb-3 flex items-center justify-center gap-1.5" aria-hidden>
            {level.boards.map((_, k) => {
              const doneFish = s.trial >= (k + 1) * level.chunk - 1 && (s.part !== 'arrows' || block > k);
              const doneBoard = s.points.length > k;
              const nowFish = s.part === 'arrows' && block === k;
              const nowBoard = s.part === 'search' && s.board === k;
              return (
                <span key={k} className="flex items-center gap-1.5">
                  <span className={`grid h-7 min-w-7 place-items-center rounded-full px-2 text-xs font-black ${nowFish ? 'bg-indigo-600 text-white shadow-md' : doneFish ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>{SCENE[level.creatures[k]].icon}</span>
                  <span className={`grid h-7 min-w-7 place-items-center rounded-full px-2 text-xs font-black ${nowBoard ? 'bg-fuchsia-600 text-white shadow-md' : doneBoard ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>🔎</span>
                  {k < level.boards.length - 1 && <span className="h-0.5 w-3 rounded bg-slate-200" />}
                </span>
              );
            })}
          </div>

          {s.part === 'arrows' && (
            <div className={`ff-stage relative flex flex-col overflow-hidden rounded-[1.75rem] p-4 shadow-[0_22px_44px_-22px_rgba(15,23,42,0.7)] ring-1 ring-white/20 max-sm:flex-1 sm:p-5 ${look.bg}`}>
              <span aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_0%,rgba(255,255,255,0.35),transparent_60%)]" />
              <div className="relative flex items-center justify-between gap-2">
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-black text-white ring-1 ring-white/30 backdrop-blur">{look.icon} {look.name} · {inBlock + 1} of {blockLen}</span>
                <span className="flex items-center gap-1.5">
                  {s.lastRt !== null && s.stage === 'fb' && s.verdict === 'ok' && <span className="gs-rise rounded-full bg-white/90 px-2.5 py-1 text-xs font-black text-slate-800">⚡ {s.lastRt} ms</span>}
                  {flipRule && <span className="rounded-full bg-amber-300 px-2.5 py-1 text-[0.7rem] font-black text-amber-950">Gold = opposite</span>}
                </span>
              </div>
              <div className="relative mt-3 flex flex-1 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/25 backdrop-blur-sm" style={{ minHeight: '9.5rem' }}
                role="img" aria-label={s.stage === 'show' ? `${look.name}: ${trialArrows(trial).map((d) => (d === 'L' ? 'left' : 'right')).join(', ')}${trial.flip ? ', golden: answer the opposite' : ''}` : 'Get ready'}>
                {s.stage === 'show' && (
                  <div className="flex gap-1 sm:gap-2">
                    {trialArrows(trial).map((d, i) => (
                      <Swimmer key={i} kind={kind} dir={d} golden={trial.flip} className={`w-14 drop-shadow-[0_6px_6px_rgba(2,6,23,0.35)] sm:w-[4.5rem] ${i === 2 ? 'scale-110' : ''}`} />
                    ))}
                  </div>
                )}
                {s.stage === 'gap' && <span className="text-4xl font-black text-white/60" aria-hidden="true">+</span>}
                {s.stage === 'fb' && (
                  <span className={`gs-rise grid h-16 w-16 place-items-center rounded-full text-3xl font-black text-white shadow-lg ring-4 ring-white/60 ${s.verdict === 'ok' ? 'bg-emerald-500' : 'bg-rose-500'}`} role="status">{s.verdict === 'ok' ? '✓' : s.verdict === 'miss' ? '⏱' : '✗'}</span>
                )}
              </div>
              <p className="relative mt-4 text-center text-base font-black text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.3)]">Which way is the <span className="rounded-md bg-white/25 px-1.5">middle</span> one going?</p>
              <div className="relative mt-3 grid grid-cols-2 gap-3">
                {[['L', 'Left', ArrowLeft], ['R', 'Right', ArrowRight]].map(([dir, name, Icon]) => (
                  <button key={dir} type="button" onClick={() => dispatch({ type: 'answer', dir })} aria-label={name}
                    className="fp-press flex min-h-16 items-center justify-center gap-2 rounded-2xl bg-white text-lg font-black text-slate-900 shadow-[0_6px_0_rgba(15,23,42,0.25)] transition hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_2px_0_rgba(15,23,42,0.25)]">
                    {dir === 'L' && <Icon className={`h-6 w-6 ${look.text}`} aria-hidden="true" />}{name}{dir === 'R' && <Icon className={`h-6 w-6 ${look.text}`} aria-hidden="true" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {s.part === 'search' && (
            <div className="ff-search relative flex flex-col overflow-hidden rounded-[1.75rem] p-4 shadow-[0_22px_44px_-22px_rgba(76,29,149,0.7)] ring-1 ring-white/20 max-sm:flex-1 sm:p-5">
              <span aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_0%,rgba(255,255,255,0.3),transparent_60%)]" />
              <div className="relative mb-3 flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-black text-white">
                  🔎 Find every
                  <span className="grid h-11 min-w-11 place-items-center rounded-xl bg-white px-2 font-mono text-2xl font-black text-fuchsia-700 shadow-[0_4px_0_rgba(15,23,42,0.25)]">{board.target}</span>
                </span>
                <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-black text-white tabular-nums ring-1 ring-white/30">
                  {s.tapped.filter((i) => board.cells[i] === board.target).length}/{board.targets.length} found
                </span>
              </div>
              <div className="relative mb-3 h-2.5 overflow-hidden rounded-full bg-white/20" role="progressbar" aria-label="Board time left" aria-valuemin={0} aria-valuemax={config.boardSeconds} aria-valuenow={Math.ceil(boardLeft / 1000)}>
                <div className={`h-full rounded-full transition-[width] duration-75 ease-linear ${boardLeft < 4000 ? 'bg-rose-300' : 'bg-gradient-to-r from-amber-200 to-yellow-300'}`} style={{ width: `${s.boardDone ? 0 : (boardLeft / (config.boardSeconds * 1000)) * 100}%` }} />
              </div>
              <div className="relative grid flex-1 content-center gap-1.5 sm:gap-2" style={{ gridTemplateColumns: `repeat(${board.cols}, minmax(0, 1fr))` }}>
                {board.cells.map((glyph, i) => {
                  const tapped = s.tapped.includes(i);
                  const isT = glyph === board.target;
                  const missed = s.boardDone && isT && !tapped;
                  return (
                    <button key={i} type="button" onClick={() => { tapWrong(i); dispatch({ type: 'tap', i }); }} disabled={s.boardDone || tapped}
                      aria-label={`${glyph}${tapped ? (isT ? ', found' : ', wrong') : ''}`}
                      className={`relative flex aspect-square min-h-11 items-center justify-center rounded-xl font-mono text-2xl font-black transition sm:text-3xl ${
                        tapped
                          ? (isT ? 'scale-95 bg-emerald-400 text-white shadow-[0_0_14px_2px_rgba(52,211,153,0.6)]' : 'gs-wrong bg-rose-500 text-white')
                          : missed ? 'bg-amber-300 text-amber-950' : 'bg-white/90 text-slate-800 shadow-[0_3px_0_rgba(15,23,42,0.18)] hover:-translate-y-0.5 hover:bg-white'
                      }`}>
                      {glyph}
                    </button>
                  );
                })}
              </div>
              {s.boardDone && (
                <p className="relative mt-3 text-center text-sm font-black text-white" role="status" aria-live="polite">
                  +{s.points[s.points.length - 1]} points{board.targets.some((i) => !s.tapped.includes(i)) ? ' — the gold ones were missed' : ' — all found! ✨'}
                </p>
              )}
            </div>
          )}
        </div>
        );
      })()}
    </GameShell>
  );
}

/** Each kind of swimmer's stage (2026-11-18, premium): ocean, sunset sky, mint sky, night. */
const SCENE = {
  fish: { name: 'Fish', icon: '🐟', bg: 'bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-700', text: 'text-blue-600' },
  bird: { name: 'Birds', icon: '🐦', bg: 'bg-gradient-to-br from-amber-300 via-rose-400 to-violet-600', text: 'text-rose-600' },
  plane: { name: 'Paper planes', icon: '✈️', bg: 'bg-gradient-to-br from-emerald-300 via-teal-500 to-cyan-700', text: 'text-teal-600' },
  arrow: { name: 'Arrows', icon: '➤', bg: 'bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-700', text: 'text-violet-600' }
};

/** A swimmer of any kind, facing `dir` ('L' or 'R'); gold means "answer the opposite way". */
export function Swimmer({ kind = 'fish', dir, golden = false, className = '' }) {
  if (kind === 'fish') return <Fish dir={dir} golden={golden} className={className} />;
  const flip = dir === 'L' ? { transform: 'scaleX(-1)' } : undefined;
  const [main, dark] = golden ? ['#fbbf24', '#d97706'] : kind === 'bird' ? ['#fb7185', '#be123c'] : kind === 'plane' ? ['#ffffff', '#99f6e4'] : ['#ffffff', '#c4b5fd'];
  if (kind === 'bird') {
    return (
      <svg viewBox="0 0 64 40" className={className} style={flip} aria-hidden="true">
        <path d="M8 22 L0 16 L2 24 L0 30 Z" fill={dark} />
        <ellipse cx="30" cy="24" rx="22" ry="11" fill={main} />
        <path d="M22 22 Q32 2 42 20 Z" fill={dark} />
        <circle cx="46" cy="18" r="9" fill={main} />
        <path d="M54 17 L63 20 L54 22 Z" fill="#f59e0b" />
        <circle cx="48" cy="16" r="2.2" fill="#0f172a" />
      </svg>
    );
  }
  if (kind === 'plane') {
    return (
      <svg viewBox="0 0 64 40" className={className} style={flip} aria-hidden="true">
        <path d="M2 20 L62 4 L36 36 L28 24 Z" fill={main} stroke="#0f766e" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M28 24 L62 4 L24 32 Z" fill={dark} stroke="#0f766e" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 40" className={className} style={flip} aria-hidden="true">
      <path d="M4 14 H38 V4 L62 20 L38 36 V26 H4 Z" fill={main} stroke={dark} strokeWidth="2" strokeLinejoin="round" />
    </svg>
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
