import { useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { SCALE_ENDS, SLOT_NAMES, makeNuanceLevel, nuanceConfig, nuanceRight } from '../../data/bands/gNuance';
import { Chip, Eyebrow, Panel, Status, btnPrimary } from './GVerbalKit';
import { dropProps, freshSeed } from './gDrag';

const KIND_TITLE = {
  intensity: 'Order by intensity',
  connotation: 'Sort by connotation',
  register: 'Sort by register'
};
const KIND_HINT = {
  intensity: 'Same idea, different strength: weakest on the left (top), strongest on the right (bottom).',
  connotation: 'Same basic meaning: which word flatters, which is neutral, which disapproves?',
  register: 'Same meaning: which word belongs in a chat, which in plain writing, which in a formal report?'
};

/** Nuance Navigator: place words on a scale of intensity, connotation or register. */
export default function NuanceNavigator({ onExit }) {
  const progress = useGameProgress('nuance-navigator', { bands: SECTION_BANDS.master });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const config = nuanceConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  const [rounds] = useState(() => makeNuanceLevel(seeded(freshSeed()), config));
  const max = rounds.reduce((n, r) => n + r.order.length, 0);
  const pass = Math.ceil(max * 0.7);
  const [index, setIndex] = useState(0);
  const [slots, setSlots] = useState(() => rounds[0].order.map(() => null));
  const [held, setHeld] = useState(null);
  const [done, setDone] = useState(false);
  const [points, setPoints] = useState(0);
  const [tally, setTally] = useState({ correct: 0, wrong: 0 });
  const [started, setStarted] = useState(false);

  const over = index >= rounds.length;
  const round = over ? null : rounds[index];
  const stars = over ? starsForFixed(points, pass, max) : 0;
  useRecordStars(progress, over, stars, { correct: tally.correct, wrong: tally.wrong, hints: 0, score: points });

  /** Put `word` in slot `i`; whatever was there goes back to the tray (or to where `word` came from). */
  const place = (word, i) => {
    if (done || !word) return;
    const next = [...slots];
    const from = next.indexOf(word);
    const there = next[i];
    if (from >= 0) next[from] = there; // swap when moving between slots
    next[i] = word;
    setSlots(next);
    setHeld(null);
  };

  const tapSlot = (i) => {
    if (done) return;
    if (held) { place(held, i); return; }
    if (slots[i]) { // pick it back up
      setHeld(slots[i]);
    }
  };

  const unplace = (word) => {
    const next = slots.map((w) => (w === word ? null : w));
    setSlots(next);
  };

  const check = () => {
    const right = nuanceRight(round, slots);
    if (right === round.order.length) sfx.right(); else sfx.wrong();
    setPoints(points + right);
    setTally({ correct: tally.correct + right, wrong: tally.wrong + round.order.length - right });
    setDone(true);
    setHeld(null);
  };

  const next = () => {
    const ni = index + 1;
    setIndex(ni);
    if (ni < rounds.length) setSlots(rounds[ni].order.map(() => null));
    setDone(false);
    setHeld(null);
  };

  const tray = round ? round.chips.filter((w) => !slots.includes(w)) : [];
  const full = round && slots.every(Boolean);
  const right = round && done ? nuanceRight(round, slots) : 0;
  const labels = round ? (SLOT_NAMES[round.kind] || round.order.map((_, i) => (i === 0 ? 'Weakest' : i === round.order.length - 1 ? 'Strongest' : `${i + 1}`))) : [];
  const [lo, hi] = round ? SCALE_ENDS[round.kind] : ['', ''];
  const status = !round
    ? ''
    : done
      ? right === round.order.length ? 'Every word on its mark.' : `${right} of ${round.order.length} placed correctly — the right word is shown under each slot.`
      : held
        ? `Holding "${held}" — tap a slot on the scale.`
        : full ? 'Scale complete — check it when ready.' : 'Drag each word onto the scale (or tap a word, then a slot).';

  return (
    <GameShell
      title="Nuance Navigator"
      blurb="Place words by strength, colour and register."
      tone="bg-gradient-to-br from-fuchsia-700 to-slate-900"
      variant="premium"
      score={`${points}/${max}`}
      scoreLabel="Points"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={
        !started
          ? {
              gameId: progress.gameId,
              level: progress.level,
              objective: `Words that share a meaning still differ in strength (drizzle → deluge), colour (slender / thin / scrawny) and register (start / commence). Drag each word onto its mark on the scale, then check. 1 point per word in the right slot; ${pass} of ${max} clears the level.`,
              stars: starsOn(progress.gameId, progress.level),
              onStart: () => setStarted(true)
            }
          : null
      }
      result={
        over
          ? {
              passed: points >= pass,
              stars,
              headline: points >= pass ? `Level ${progress.level} cleared` : 'Close shades — try again',
              detail: `${points} of ${max} words placed correctly across ${rounds.length} scales`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={<p className="text-center text-sm text-slate-500">Scale {Math.min(index + 1, rounds.length)} of {rounds.length}</p>}
    >
      {started && round && (
        <div className="mx-auto grid w-full max-w-4xl gap-3">
          <Panel label="Scale">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <Eyebrow>{KIND_TITLE[round.kind]}</Eyebrow>
              <span className="text-sm font-semibold text-[#1b2456]">Idea: {round.idea}</span>
            </div>
            <p className="mb-3 text-sm text-slate-600">{KIND_HINT[round.kind]}</p>
            <div className="relative">
              <div aria-hidden className="absolute top-0 bottom-0 left-4 w-1 rounded-full bg-gradient-to-b from-sky-300 via-violet-300 to-rose-400 sm:top-auto sm:right-0 sm:bottom-[-0.6rem] sm:left-0 sm:h-1 sm:w-auto sm:bg-gradient-to-r" />
              <ol className="relative grid gap-2 pl-8 sm:pl-0 sm:[grid-template-columns:repeat(var(--n),minmax(0,1fr))]" style={{ '--n': round.order.length }}>
                  {slots.map((w, i) => {
                    const ok = done && w === round.order[i];
                    return (
                      <li key={i} className="flex flex-col items-stretch gap-1">
                        <span className="text-xs font-bold tracking-[0.12em] text-slate-500 uppercase sm:text-center sm:text-[0.62rem]">{labels[i]}</span>
                        <div
                          {...dropProps((word) => place(word, i), () => tapSlot(i))}
                          role="button"
                          tabIndex={done ? -1 : 0}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tapSlot(i); } }}
                          aria-label={`Slot ${labels[i]}: ${w || 'empty'}`}
                          className={`flex min-h-12 items-center justify-center rounded-xl px-2 py-2 text-center text-sm font-bold transition sm:text-base ${
                            done
                              ? ok ? 'bg-emerald-50 text-emerald-800 ring-2 ring-emerald-400 ring-inset' : 'gs-wrong bg-rose-50 text-rose-700 ring-2 ring-rose-300 ring-inset'
                              : w
                                ? held === w ? 'bg-indigo-600 text-white' : 'bg-white text-[#1b2456] ring-2 ring-[#d9d4f3] ring-inset'
                                : held ? 'border-2 border-dashed border-indigo-400 bg-indigo-50 text-indigo-400' : 'border-2 border-dashed border-[#d9d4f3] bg-[#f7f6fd] text-slate-400'
                          }`}
                        >
                          {w || 'drop here'}
                        </div>
                        {done && !ok && <span className="text-xs font-semibold text-emerald-700 sm:text-center">{round.order[i]}</span>}
                      </li>
                    );
                  })}
              </ol>
            </div>
            <div className="mt-4 hidden justify-between text-xs font-bold tracking-wider text-slate-500 uppercase sm:flex">
              <span>← {lo}</span>
              <span>{hi} →</span>
            </div>
          </Panel>

          {!done && (
            <Panel label="Word tray">
              <Eyebrow>Words</Eyebrow>
              <div
                className="flex min-h-12 flex-wrap gap-2"
                {...dropProps((word) => unplace(word), (e) => { if (e.target === e.currentTarget && held && slots.includes(held)) { unplace(held); setHeld(null); } })}
              >
                {tray.map((w) => (
                  <Chip key={w} label={w} dragId={w} held={held === w} onPick={(id) => setHeld(held === id ? null : id)} />
                ))}
                {!tray.length && <span className="self-center text-sm text-slate-400">All placed — drag one back here to remove it.</span>}
              </div>
              <div className="mt-3 flex justify-center">
                <button type="button" className={btnPrimary} disabled={!full} onClick={check}>Check scale</button>
              </div>
            </Panel>
          )}

          <Status tone={done ? (right === round.order.length ? 'good' : 'bad') : 'idle'}>{status}</Status>
          {done && (
            <div className="flex justify-center">
              <button type="button" className={btnPrimary} onClick={next} autoFocus>
                {index + 1 >= rounds.length ? 'See result' : 'Next scale'}
              </button>
            </div>
          )}
        </div>
      )}
    </GameShell>
  );
}
