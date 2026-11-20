import { useEffect, useReducer, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { makeDualLevel, dualConfig, checkChanges, checkBoth } from '../../data/bands/cDual';

const TICK = 100;
const BLANK_MS = 900;
// Glossy colour tiles (2026-11-18 redesign): a soft gradient, a light edge on top, a coloured shadow under.
const TINTS = {
  sky: 'bg-gradient-to-br from-sky-200 to-sky-400 shadow-[0_5px_0_#0284c7]',
  rose: 'bg-gradient-to-br from-rose-200 to-rose-400 shadow-[0_5px_0_#e11d48]',
  amber: 'bg-gradient-to-br from-amber-200 to-amber-400 shadow-[0_5px_0_#d97706]',
  emerald: 'bg-gradient-to-br from-emerald-200 to-emerald-400 shadow-[0_5px_0_#059669]',
  violet: 'bg-gradient-to-br from-violet-200 to-violet-400 shadow-[0_5px_0_#7c3aed]'
};
const freshSeed = () => Math.floor(Math.random() * 4294967296);

/** 🖼️ Memory: compare two scenes from memory — what changed, or what appeared in both. */
export default function DualImageRecall({ onExit }) {
  const progress = useGameProgress('dual-image-recall', { bands: SECTION_BANDS.smart });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

/* Phases of a round. change: studyA → blank → answer → review. both: studyA → blank → studyB → blank2 → answer → review. */
const TIMED = { studyA: 'study', blank: 'blank', studyB: 'study', blank2: 'blank' };

const makeReducer = (rounds, config) => {
  const after = (round, phase) => {
    if (phase === 'studyA') return 'blank';
    if (phase === 'blank') return round.kind === 'both' ? 'studyB' : 'answer';
    if (phase === 'studyB') return 'blank2';
    return 'answer';
  };
  const advance = (s) => ({ ...s, phase: after(rounds[s.round], s.phase), phaseAt: s.ms });
  return (s, a) => {
    if (s.phase === 'done') return s;
    const round = rounds[s.round];
    switch (a.type) {
      case 'tick': {
        const t = { ...s, ms: s.ms + TICK };
        const kind = TIMED[t.phase];
        if (kind && t.ms - t.phaseAt >= (kind === 'study' ? config.study * 1000 : BLANK_MS)) return advance(t);
        return t;
      }
      case 'ready':
        return TIMED[s.phase] === 'study' ? advance(s) : s;
      case 'toggle': {
        if (s.phase !== 'answer') return s;
        const picked = s.picked.includes(a.id) ? s.picked.filter((x) => x !== a.id) : [...s.picked, a.id];
        return { ...s, picked };
      }
      case 'submit': {
        if (s.phase !== 'answer' || !s.picked.length) return s;
        const res = round.kind === 'both' ? checkBoth(round, s.picked) : checkChanges(round, s.picked);
        return { ...s, phase: 'review', res, perfect: s.perfect + (res.perfect ? 1 : 0), hits: s.hits + res.hits, wrong: s.wrong + res.wrong + res.missed };
      }
      case 'next': {
        if (s.phase !== 'review') return s;
        const n = s.round + 1;
        return n >= rounds.length ? { ...s, phase: 'done', round: n } : { ...s, round: n, phase: 'studyA', phaseAt: s.ms, picked: [], res: null };
      }
      default:
        return s;
    }
  };
};

function Round({ progress, onExit }) {
  const config = dualConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  const [rounds] = useState(() => makeDualLevel(seeded(freshSeed()), config));
  const [reducer] = useState(() => makeReducer(rounds, config));
  const [s, dispatch] = useReducer(reducer, { ms: 0, round: 0, phase: 'studyA', phaseAt: 0, picked: [], res: null, perfect: 0, hits: 0, wrong: 0 });
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);

  const over = s.phase === 'done';
  const passed = s.perfect >= config.pass;
  const stars = over ? starsForFixed(s.perfect, config.pass, rounds.length) : 0;
  useRecordStars(progress, over, stars, { correct: s.perfect, wrong: rounds.length - s.perfect, hints: 0, score: s.perfect });

  const ticking = started && !paused && Boolean(TIMED[s.phase]);
  useEffect(() => {
    if (!ticking) return undefined;
    const t = setInterval(() => dispatch({ type: 'tick' }), TICK);
    return () => clearInterval(t);
  }, [ticking]);

  const verdict = s.res ? s.res.perfect : null;
  useEffect(() => {
    if (verdict === null) return;
    if (verdict) sfx.right(); else sfx.wrong();
  }, [verdict, s.round]);

  useEffect(() => {
    if (!started || over || paused) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Enter') return;
      if (TIMED[s.phase] === 'study') dispatch({ type: 'ready' });
      else if (s.phase === 'answer') dispatch({ type: 'submit' });
      else if (s.phase === 'review') dispatch({ type: 'next' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [started, over, paused, s.phase]);

  const round = rounds[Math.min(s.round, rounds.length - 1)];
  const studyLeft = Math.max(0, config.study * 1000 - (s.ms - s.phaseAt));

  const objective = config.both
    ? `Two kinds of round, ${rounds.length} in all. CHANGE: study a scene for ${config.study} s; it hides and comes back altered — tap every tile that changed (picture, colour, or two pictures that swapped). You are not told how many. BOTH: two scenes are shown one after the other — then tap every picture that appeared in BOTH. Get ${config.pass} rounds perfect.`
    : `Study the scene for ${config.study} s. It hides, then comes back with some tiles changed${config.kinds.includes('tint') ? ' (a new picture or a new colour)' : ' (a new picture)'}. Tap every changed tile, then Check.${config.tell ? ' You are told how many changed.' : ' You are NOT told how many changed.'} Get ${config.pass} of ${rounds.length} rounds perfect.`;

  const studyBar = (
    <div className="mt-3">
      <div className="h-2.5 overflow-hidden rounded-full bg-ink-900/10" role="progressbar" aria-label="Study time left" aria-valuemin={0} aria-valuemax={config.study} aria-valuenow={Math.ceil(studyLeft / 1000)}>
        <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-indigo-500 transition-[width] duration-100 ease-linear" style={{ width: `${(studyLeft / (config.study * 1000)) * 100}%` }} />
      </div>
      <button type="button" onClick={() => dispatch({ type: 'ready' })} className="fp-press mt-3 w-full rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 py-3 text-sm font-black text-white shadow-[0_4px_0_#4338ca]">
        Got it — hide ({Math.ceil(studyLeft / 1000)}s)
      </button>
    </div>
  );

  let body = null;
  if (round.kind === 'change') {
    const tiles = s.phase === 'studyA' ? round.a : round.b;
    const showGrid = s.phase === 'studyA' || s.phase === 'answer' || s.phase === 'review';
    body = (
      <>
        <p className="mb-2 text-center text-sm font-black text-ink-900" role="status" aria-live="polite">
          {s.phase === 'studyA' ? 'Scene A — remember every tile' : s.phase === 'blank' ? 'Hiding…' : s.phase === 'answer'
            ? `Scene B — tap every tile that changed${round.told ? ` (${round.told} changed)` : ''}`
            : s.res.perfect ? 'Perfect — every change found!' : `${s.res.hits} found · ${s.res.missed} missed · ${s.res.wrong} wrong tap${s.res.wrong === 1 ? '' : 's'}`}
        </p>
        {showGrid ? (
          <div className="mx-auto grid w-full max-w-[22rem] gap-2.5" style={{ gridTemplateColumns: `repeat(${round.cols}, minmax(0, 1fr))` }}>
            {tiles.map((t, i) => {
              const picked = s.picked.includes(i);
              const changed = round.changed.includes(i);
              const review = s.phase === 'review';
              // The item is highlighted, not the card (2026-11-18, the user): a glowing disc behind the picture.
              const ring = 'ring-2 ring-white/70';
              const glow = review
                ? changed ? (picked ? 'bg-emerald-400 ring-emerald-200' : 'bg-amber-300 ring-amber-100') : picked ? 'bg-rose-400 ring-rose-200' : null
                : picked ? 'bg-indigo-500 ring-indigo-200' : null;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={s.phase !== 'answer'}
                  onClick={() => dispatch({ type: 'toggle', id: i })}
                  aria-pressed={s.phase === 'answer' ? picked : undefined}
                  aria-label={`${t.name} on ${t.tint}${review && changed ? `, changed (was ${round.a[i].name} on ${round.a[i].tint})` : ''}`}
                  className={`relative flex aspect-square items-center justify-center rounded-2xl text-4xl ring-inset transition-all before:absolute before:inset-x-2 before:top-1.5 before:h-1/3 before:rounded-xl before:bg-white/35 before:content-[''] sm:text-5xl ${TINTS[t.tint]} ${ring} ${s.phase === 'answer' ? 'hover:-translate-y-0.5' : ''}`}
                >
                  {glow && <span aria-hidden="true" className={`absolute top-1/2 left-1/2 size-[68%] -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 shadow-[0_0_18px_4px_rgba(255,255,255,0.6)] ${glow}`} />}
                  <span aria-hidden="true" className={`relative ${glow ? 'scale-110' : ''} transition-transform`}>{t.emoji}</span>
                  {/* What changed, in green (2026-11-16, the user): the old picture or colour, on the tile. */}
                  {review && changed && (
                    <span className="absolute inset-x-1 bottom-1 flex items-center justify-center gap-1 rounded-lg bg-emerald-500 px-1 py-0.5 text-[0.65rem] font-black text-white shadow sm:text-xs" aria-hidden="true">
                      was
                      {round.a[i].emoji !== t.emoji
                        ? <span className="text-sm leading-none sm:text-base">{round.a[i].emoji}</span>
                        : <span className={`inline-block h-3 w-3 rounded-sm ring-1 ring-white ${TINTS[round.a[i].tint]}`} />}
                      {round.a[i].emoji === t.emoji && <span className="capitalize">{round.a[i].tint}</span>}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mx-auto flex aspect-square w-full max-w-[22rem] items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-100 to-violet-100 text-6xl font-black text-indigo-300 ring-2 ring-white" aria-hidden="true">?</div>
        )}
      </>
    );
  } else {
    const scene = s.phase === 'studyA' ? round.a : s.phase === 'studyB' ? round.b : null;
    body = (
      <>
        <p className="mb-2 text-center text-sm font-black text-ink-900" role="status" aria-live="polite">
          {s.phase === 'studyA' ? 'Scene 1 of 2 — remember these' : s.phase === 'studyB' ? 'Scene 2 of 2 — remember these too' : s.phase === 'answer'
            ? 'Tap every picture that was in BOTH scenes'
            : s.res.perfect ? 'Perfect!' : `${s.res.hits} found · ${s.res.missed} missed · ${s.res.wrong} wrong`}
        </p>
        {scene ? (
          <div className={`mx-auto flex max-w-[22rem] flex-wrap justify-center gap-2 rounded-2xl p-3 ${s.phase === 'studyA' ? 'bg-sky-50 ring-2 ring-sky-200' : 'bg-violet-50 ring-2 ring-violet-200'}`}>
            {scene.map((x) => (
              <span key={x.emoji} className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-4xl shadow-[0_4px_0_rgba(79,70,229,0.18)] ring-1 ring-indigo-100" role="img" aria-label={x.name}>{x.emoji}</span>
            ))}
          </div>
        ) : s.phase === 'answer' || s.phase === 'review' ? (
          <div className="mx-auto grid max-w-[22rem] grid-cols-4 gap-2">
            {round.pool.map((x) => {
              const picked = s.picked.includes(x.emoji);
              const right = round.answer.includes(x.emoji);
              const review = s.phase === 'review';
              return (
                <button
                  key={x.emoji}
                  type="button"
                  disabled={s.phase !== 'answer'}
                  onClick={() => dispatch({ type: 'toggle', id: x.emoji })}
                  aria-pressed={!review ? picked : undefined}
                  aria-label={`${x.name}${review ? (right ? ', in both' : ', not in both') : ''}`}
                  className={`flex aspect-square items-center justify-center rounded-xl text-3xl ring-inset ${
                    review
                      ? right ? (picked ? 'bg-emerald-100 ring-4 ring-emerald-500' : 'bg-amber-50 ring-4 ring-amber-400') : picked ? 'bg-rose-100 ring-4 ring-rose-500' : 'bg-white opacity-60 ring-1 ring-line-200'
                      : picked ? 'bg-indigo-50 ring-4 ring-indigo-600' : 'bg-white ring-1 ring-line-200 hover:bg-indigo-50'
                  }`}
                >
                  <span aria-hidden="true">{x.emoji}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mx-auto flex h-32 max-w-[22rem] items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-100 to-violet-100 text-6xl font-black text-indigo-300 ring-2 ring-white" aria-hidden="true">?</div>
        )}
      </>
    );
  }

  return (
    <GameShell
      title="Dual-Image Recall"
      blurb={config.both ? 'Spot what changed — and what two scenes shared.' : 'Spot every tile that changed between two scenes.'}
      tone="bg-gradient-to-br from-sky-500 to-violet-700"
      score={`${s.perfect}/${rounds.length}`}
      scoreLabel="Perfect rounds"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      paused={paused}
      onPause={() => setPaused((p) => !p)}
      intro={
        !started
          ? { gameId: progress.gameId, level: progress.level, objective, seconds: config.study, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) }
          : null
      }
      result={
        over
          ? {
              passed, stars,
              headline: passed ? `Level ${progress.level} cleared!` : 'Some details slipped by',
              detail: `${s.perfect} of ${rounds.length} rounds perfect · ${s.hits} correct taps`,
              atEnd: progress.atEnd, onNext: progress.advance, onRetry: progress.retry
            }
          : null
      }
      footer={<p className="text-sm">Tap a tile to mark it, tap again to unmark. A round counts when every change is found with no wrong taps. Enter checks.</p>}
    >
      {started && !over && (
        <div className="mx-auto flex w-full max-w-md flex-col justify-between gap-3 rounded-[1.75rem] bg-gradient-to-b from-indigo-50 via-white to-sky-50 p-4 max-sm:flex-1 shadow-[0_16px_34px_-22px_rgba(79,70,229,0.5)] ring-1 ring-indigo-100">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-indigo-700 shadow-sm ring-1 ring-indigo-100">Round {s.round + 1} of {rounds.length}</span>
            <span className={`rounded-full px-3 py-1 text-xs font-black text-white shadow-sm ${round.kind === 'both' ? 'bg-violet-500' : 'bg-sky-500'}`}>{round.kind === 'both' ? '🔁 In both scenes' : '🔍 What changed?'}</span>
          </div>
          {body}
          {TIMED[s.phase] === 'study' && studyBar}
          {s.phase === 'answer' && (
            <button
              type="button"
              onClick={() => dispatch({ type: 'submit' })}
              disabled={!s.picked.length}
              className="fp-press mt-3 w-full rounded-xl bg-emerald-600 py-3 text-sm font-black text-white disabled:opacity-40"
            >
              Check ({s.picked.length} marked)
            </button>
          )}
          {s.phase === 'review' && (
            <button type="button" onClick={() => dispatch({ type: 'next' })} className="fp-press mt-3 w-full rounded-xl bg-indigo-600 py-3 text-sm font-black text-white" autoFocus>
              {s.round + 1 < rounds.length ? 'Next round' : 'See result'}
            </button>
          )}
        </div>
      )}
    </GameShell>
  );
}
