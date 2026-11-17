import { useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { checkSchedule, constraintConfig, makeConstraintLevel, ruleText } from '../../data/bands/hConstraint';

/**
 * Strategic Constraint Lab (Master Minds): schedule tasks into days under a checklist of rules that turns green as
 * they are met — order, together/apart, banned days, day capacities. On cost levels each day charges a fee per hour
 * and the schedule must also be the cheapest valid one (or within a margin). Every puzzle is dealt from a hidden
 * valid schedule; the optimum comes from an exhaustive search.
 */

const freshSeed = () => Math.floor(Math.random() * 2 ** 31);

export default function StrategicConstraintLab({ onExit }) {
  const progress = useGameProgress('strategic-constraint-lab', { bands: SECTION_BANDS.master });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

const emptyFor = (p) => Array(p.items).fill(null);

function Round({ progress, onExit }) {
  const config = constraintConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  const [puzzles] = useState(() => makeConstraintLevel(seeded(freshSeed()), config));
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [assign, setAssign] = useState(() => emptyFor(puzzles[0]));
  const [selected, setSelected] = useState(null);
  const [tries, setTries] = useState(0);
  const [note, setNote] = useState(null);       // { tone, text }
  const [done, setDone] = useState(null);       // { ok } once the puzzle is finished
  const [solved, setSolved] = useState(0);
  const [wrong, setWrong] = useState(0);
  const over = index >= puzzles.length;
  const p = puzzles[Math.min(index, puzzles.length - 1)];
  const stars = over ? starsForFixed(solved, config.pass, puzzles.length) : 0;
  useRecordStars(progress, over, stars, { correct: solved, wrong, hints: 0, score: solved });

  const state = checkSchedule(p, assign);
  const partialCost = p.fees ? assign.reduce((s, d, i) => (d === null ? s : s + p.hours[i] * p.fees[d]), 0) : 0;

  const place = (task, day) => {
    if (done || task === null) return;
    const next = [...assign];
    next[task] = day;
    setAssign(next);
    setSelected(null);
    setNote(null);
  };

  const tapTask = (i) => { if (!done) setSelected(selected === i ? null : i); };
  const tapDay = (s) => { if (selected !== null) place(selected, s); };
  const tapTray = () => { if (selected !== null && assign[selected] !== null) place(selected, null); };

  const submit = () => {
    if (done || !state.complete) return;
    const used = tries + 1;
    setTries(used);
    if (state.ok) {
      sfx.right?.();
      setSolved((n) => n + 1);
      setDone({ ok: true });
      setNote({ tone: 'good', text: p.fees ? `Valid, and it costs ₹${state.cost} — ${state.cost === p.optimum ? 'the cheapest possible' : `within the target (best ₹${p.optimum})`}.` : 'Every rule is met.' });
      return;
    }
    sfx.wrong();
    setWrong((n) => n + 1);
    const why = !state.valid
      ? `${state.rules.filter((x) => x === false).length + state.capsOk.filter((x) => !x).length} rule(s) broken — the red lines in the checklist.`
      : `Valid, but it costs ₹${state.cost}; the target is ₹${p.target} or less.`;
    if (used >= config.attempts) {
      setAssign(p.solution);
      setDone({ ok: false });
      setNote({ tone: 'bad', text: `${why} Out of checks — here is ${p.fees ? 'the cheapest' : 'a'} valid schedule.` });
    } else {
      setNote({ tone: 'bad', text: `${why} ${config.attempts - used} check${config.attempts - used === 1 ? '' : 's'} left.` });
    }
  };

  const next = () => {
    const i = index + 1;
    setIndex(i);
    setTries(0);
    setNote(null);
    setDone(null);
    setSelected(null);
    if (i < puzzles.length) setAssign(emptyFor(puzzles[i]));
  };

  // Keys: a task's initial selects it, 1–5 puts it on that day, 0 sends it back, Enter checks.
  useEffect(() => {
    if (!started || over || done) return undefined;
    const onKey = (e) => {
      const k = e.key;
      if (k === 'Enter') { e.preventDefault(); submit(); return; }
      const n = Number(k);
      if (Number.isInteger(n) && selected !== null) {
        if (n === 0) place(selected, null);
        else if (n >= 1 && n <= p.slots) place(selected, n - 1);
        return;
      }
      const t = p.tasks.findIndex((name) => name[0].toLowerCase() === k.toLowerCase());
      if (t >= 0) setSelected(t);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const objective = config.cost
    ? `${puzzles.length} scheduling puzzles. Put every task on a day so all rules hold and no day is over capacity — and keep the cost (hours × that day's fee) ${config.tolerance ? `within ${Math.round(config.tolerance * 100)}% of the cheapest possible` : 'at the cheapest possible'}. ${config.attempts} checks per puzzle; solve ${config.pass} to pass.`
    : `${puzzles.length} scheduling puzzles. Put every task on a day so all the rules in the checklist turn green and no day is over capacity. ${config.attempts} checks per puzzle; solve ${config.pass} to pass.`;

  const tray = p.tasks.map((_, i) => i).filter((i) => assign[i] === null);

  return (
    <GameShell
      title="Strategic Constraint Lab"
      blurb={`Schedule under constraints${config.cost ? ' — at the lowest cost' : ''}. ${config.pass} of ${puzzles.length} to pass.`}
      tone="bg-gradient-to-br from-slate-800 to-violet-800"
      variant="premium"
      score={`${solved}/${puzzles.length}`}
      scoreLabel="Solved"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) } : null}
      result={
        over
          ? {
              passed: stars > 0,
              stars,
              headline: stars > 0 ? `Level ${progress.level} cleared` : 'Not this time',
              detail: `${solved} of ${puzzles.length} schedules solved · ${wrong} failed check${wrong === 1 ? '' : 's'}`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={<p>Tap a task, then tap a day (or drag it). Tap the tray to unplace. Keys: task initial, then 1–{p.slots}; 0 unplaces; Enter checks.</p>}
    >
      {started && !over && (
        <div className="mx-auto w-full max-w-3xl">
          <p className="mb-3 text-[0.68rem] font-bold tracking-[0.16em] text-violet-600 uppercase">
            Puzzle {index + 1} of {puzzles.length} · checks used {tries}/{config.attempts}
          </p>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
            <div>
              {/* Tray */}
              <div
                onClick={tapTray}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { const t = Number(e.dataTransfer.getData('text/plain')); if (Number.isInteger(t)) place(t, null); }}
                className={`mb-3 flex min-h-14 flex-wrap items-center gap-2 rounded-2xl border-2 border-dashed p-2 ${selected !== null && assign[selected] !== null ? 'border-violet-400 bg-violet-50' : 'border-slate-200 bg-slate-50'}`}
                aria-label="Unplaced tasks"
              >
                {tray.length === 0 ? <span className="px-2 text-sm font-semibold text-ink-500">All tasks placed.</span> : tray.map((i) => (
                  <Chip key={i} p={p} i={i} selected={selected === i} disabled={Boolean(done)} onTap={tapTask} />
                ))}
              </div>

              {/* Days */}
              <div className={`grid gap-2 sm:[grid-template-columns:repeat(var(--slots),minmax(0,1fr))] ${p.slots >= 4 ? 'grid-cols-2' : 'grid-cols-3'}`} style={{ '--slots': p.slots }}>
                {p.days.map((day, s) => {
                  const load = state.loads[s];
                  const full = load >= p.caps[s];
                  return (
                    <div
                      key={day}
                      role="button"
                      tabIndex={0}
                      onClick={() => tapDay(s)}
                      onKeyDown={(e) => { if (e.key === ' ') { e.preventDefault(); tapDay(s); } }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => { const t = Number(e.dataTransfer.getData('text/plain')); if (Number.isInteger(t)) place(t, s); }}
                      aria-label={`${day}: ${load} of ${p.caps[s]} places used${p.fees ? `, ₹${p.fees[s]} per hour` : ''}`}
                      className={`flex min-h-40 min-w-0 flex-col gap-1.5 rounded-2xl p-2 ring-2 ring-inset transition ${!state.capsOk[s] ? 'bg-rose-50 ring-rose-300' : selected !== null ? 'bg-violet-50/60 ring-violet-300' : 'bg-white ring-slate-200'}`}
                    >
                      <div className="text-center">
                        <p className="text-sm font-black text-ink-900">{day}</p>
                        <p className={`text-[0.7rem] font-bold tabular-nums ${!state.capsOk[s] ? 'text-rose-600' : full ? 'text-ink-700' : 'text-ink-500'}`}>{load}/{p.caps[s]}{p.fees ? ` · ₹${p.fees[s]}/h` : ''}</p>
                      </div>
                      {p.tasks.map((_, i) => i).filter((i) => assign[i] === s).map((i) => (
                        <Chip key={i} p={p} i={i} selected={selected === i} disabled={Boolean(done)} onTap={tapTask} />
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Checklist */}
            <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200 ring-inset">
              <p className="mb-2 text-[0.66rem] font-bold tracking-[0.14em] text-ink-500 uppercase">Rules</p>
              <ul className="space-y-1.5">
                {p.rules.map((r, k) => <Check key={k} state={state.rules[k]} text={ruleText(r, p.tasks, p.days)} />)}
                <Check state={state.capsOk.every(Boolean) ? (state.complete ? true : null) : false} text={`No day over capacity (${p.caps.join('/')})`} />
                <Check state={state.complete ? true : null} text={`All ${p.items} tasks placed`} />
                {p.fees && (
                  <Check
                    state={state.complete && state.valid ? state.cost <= p.target : null}
                    text={`Cost ₹${state.complete ? state.cost : partialCost}${state.complete ? '' : ' so far'} · target ≤ ₹${p.target}`}
                  />
                )}
              </ul>
            </div>
          </div>

          {note && (
            <p role="status" aria-live="polite" className={`mt-3 rounded-xl px-3 py-2 text-sm font-bold ${note.tone === 'good' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{note.text}</p>
          )}

          <div className="mt-3 flex justify-center gap-2">
            {!done ? (
              <>
                <button type="button" onClick={() => { setAssign(emptyFor(p)); setSelected(null); }} className="fp-press min-h-11 rounded-xl bg-white px-4 text-sm font-bold text-ink-900 ring-1 ring-line-200 ring-inset">Clear</button>
                <button type="button" onClick={submit} disabled={!state.complete} className="fp-press min-h-11 rounded-xl bg-slate-900 px-6 text-sm font-black text-white disabled:opacity-40">Check schedule</button>
              </>
            ) : (
              <NextButton onNext={next} last={index === puzzles.length - 1} />
            )}
          </div>
        </div>
      )}
    </GameShell>
  );
}

function NextButton({ onNext, last }) {
  const btn = useRef(null);
  useEffect(() => { btn.current?.focus(); }, []);
  return (
    <button ref={btn} type="button" onClick={onNext} className="fp-press min-h-11 rounded-xl bg-slate-900 px-5 text-sm font-black text-white">
      {last ? 'Finish' : 'Next puzzle'}
    </button>
  );
}

function Chip({ p, i, selected, disabled, onTap }) {
  return (
    <button
      type="button"
      draggable={!disabled}
      onDragStart={(e) => e.dataTransfer.setData('text/plain', String(i))}
      onClick={(e) => { e.stopPropagation(); onTap(i); }}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={`${p.tasks[i]}${p.hours ? `, ${p.hours[i]} hours` : ''}`}
      className={`fp-press min-h-11 w-full min-w-0 truncate rounded-xl px-2 text-sm font-bold ring-2 ring-inset transition sm:w-auto ${selected ? 'bg-violet-600 text-white ring-violet-600' : 'bg-white text-ink-900 ring-slate-300 hover:ring-violet-300'}`}
    >
      {p.tasks[i]}{p.hours ? <span className={`ml-1 text-xs ${selected ? 'text-violet-100' : 'text-ink-500'}`}>{p.hours[i]}h</span> : null}
    </button>
  );
}

function Check({ state, text }) {
  const tone = state === true ? 'bg-emerald-500 text-white' : state === false ? 'bg-rose-500 text-white' : 'bg-white text-ink-400 ring-1 ring-slate-300';
  return (
    <li className="flex items-start gap-2 text-sm leading-snug">
      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-black ${tone}`} aria-hidden="true">
        {state === true ? '✓' : state === false ? '✕' : '·'}
      </span>
      <span className={state === false ? 'font-semibold text-rose-700' : state === true ? 'text-emerald-800' : 'text-ink-700'}>
        {text}<span className="sr-only">{state === true ? ' — met' : state === false ? ' — broken' : ' — not yet decided'}</span>
      </span>
    </li>
  );
}
