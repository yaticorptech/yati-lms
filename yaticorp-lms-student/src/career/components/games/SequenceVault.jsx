import { useEffect, useReducer, useState } from 'react';
import { Lock, LockOpen, Delete, Check, Zap } from 'lucide-react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { makeVaultLevel, vaultConfig, checkCode, ruleHint } from '../../data/bands/cVault';

const TICK = 100;
const FEEDBACK_MS = 1700;
const DOOR_TONES = {
  red: { band: 'from-rose-500 to-red-600', glow: 'shadow-rose-500/50', text: 'text-rose-600' },
  blue: { band: 'from-sky-500 to-blue-600', glow: 'shadow-sky-500/50', text: 'text-blue-600' },
  green: { band: 'from-emerald-500 to-green-600', glow: 'shadow-emerald-500/50', text: 'text-emerald-600' },
  amber: { band: 'from-amber-400 to-orange-500', glow: 'shadow-amber-500/50', text: 'text-amber-600' },
  violet: { band: 'from-violet-500 to-purple-600', glow: 'shadow-violet-500/50', text: 'text-violet-600' }
};

const freshSeed = () => Math.floor(Math.random() * 4294967296);

/**
 * 🔐 Memory: every round is a fresh vault (2026-11-16, the user: the codes must keep changing). Study the door codes;
 * they lock; code-change cards turn a digit or rotate a code; then unlock the door asked for — its code after every
 * change. data/bands/cVault.js builds the rounds.
 */
export default function SequenceVault({ onExit }) {
  const progress = useGameProgress('sequence-vault', { bands: SECTION_BANDS.smart });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

const START = { phase: 'study', ms: 0, phaseAt: 0, step: 0, ruleIdx: 0, entry: '', correct: 0, wrong: 0, last: null, results: [] };

/** After studying (or after a change card): the next change card, or the question. */
const afterStudy = (s, steps, ruleIdx) =>
  ruleIdx < steps[s.step].changes.length ? { ...s, phase: 'rule', ruleIdx } : { ...s, phase: 'ask', ruleIdx, entry: '' };

const makeReducer = (level, config) => (s, a) => {
  const steps = level.steps;
  if (s.phase === 'done') return s;
  switch (a.type) {
    case 'tick': {
      const ms = s.ms + TICK;
      if (s.phase === 'study' && ms - s.phaseAt >= config.study * 1000) return afterStudy({ ...s, ms }, steps, 0);
      if (s.phase === 'feedback' && ms - s.phaseAt >= FEEDBACK_MS) {
        const next = s.step + 1;
        return next >= steps.length
          ? { ...s, ms, phase: 'done', step: next }
          : { ...s, ms, phase: 'study', step: next, ruleIdx: 0, entry: '', phaseAt: ms };
      }
      return { ...s, ms };
    }
    case 'ready':
      return s.phase === 'study' ? afterStudy(s, steps, 0) : s;
    case 'ruleSeen':
      return s.phase === 'rule' ? afterStudy(s, steps, s.ruleIdx + 1) : s;
    case 'digit':
      return s.phase === 'ask' && s.entry.length < config.length ? { ...s, entry: s.entry + a.d } : s;
    case 'back':
      return s.phase === 'ask' ? { ...s, entry: s.entry.slice(0, -1) } : s;
    case 'submit': {
      if (s.phase !== 'ask' || s.entry.length !== config.length) return s;
      const step = steps[s.step];
      const ok = checkCode(step.answer, s.entry);
      return {
        ...s, phase: 'feedback', phaseAt: s.ms,
        correct: s.correct + (ok ? 1 : 0), wrong: s.wrong + (ok ? 0 : 1),
        last: { ok, entry: s.entry, answer: step.answer.join('') },
        results: [...s.results, ok]
      };
    }
    default:
      return s;
  }
};

function Round({ progress, onExit }) {
  const config = vaultConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  const [level] = useState(() => makeVaultLevel(seeded(freshSeed()), config));
  const [reducer] = useState(() => makeReducer(level, config));
  const [s, dispatch] = useReducer(reducer, START);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);

  const total = level.steps.length;
  const over = s.phase === 'done';
  const passed = s.correct >= config.pass;
  const stars = over ? starsForFixed(s.correct, config.pass, total) : 0;
  useRecordStars(progress, over, stars, { correct: s.correct, wrong: s.wrong, hints: 0, score: s.correct });

  const ticking = started && !paused && (s.phase === 'study' || s.phase === 'feedback');
  useEffect(() => {
    if (!ticking) return undefined;
    const t = setInterval(() => dispatch({ type: 'tick' }), TICK);
    return () => clearInterval(t);
  }, [ticking]);

  const lastOk = s.last?.ok;
  const answered = s.phase === 'feedback' ? s.step : -1;
  useEffect(() => {
    if (answered < 0) return;
    if (lastOk) sfx.right(); else sfx.wrong();
  }, [answered, lastOk]);

  useEffect(() => {
    if (!started || over || paused) return undefined;
    const onKey = (e) => {
      if (/^[0-9]$/.test(e.key)) dispatch({ type: 'digit', d: e.key });
      else if (e.key === 'Backspace') dispatch({ type: 'back' });
      else if (e.key === 'Enter') {
        if (s.phase === 'study') dispatch({ type: 'ready' });
        else if (s.phase === 'rule') dispatch({ type: 'ruleSeen' });
        else dispatch({ type: 'submit' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [started, over, paused, s.phase]);

  const step = level.steps[Math.min(s.step, total - 1)];
  const doors = step.doors;
  const asked = doors[step.door];
  const change = s.phase === 'rule' ? step.changes[s.ruleIdx] : null;
  const studyLeft = Math.max(0, config.study * 1000 - (s.ms - s.phaseAt));

  const objective = `Every round is a NEW vault. Study the ${config.doors} door codes (${config.length} digits each) — then the doors lock. Code-change cards will turn a digit up or down${config.kinds.includes('rotate') ? ', or move the first digit to the end' : ''}: change the code in your head! Then type the code of the door you are asked for. Open ${config.pass} of ${total} vaults.`;

  return (
    <GameShell
      title="Sequence Vault"
      blurb={`A new vault every round — remember the codes as they change. Open ${config.pass} of ${total}.`}
      tone="bg-gradient-to-br from-slate-700 to-indigo-700"
      score={`${s.correct}/${total}`}
      scoreLabel="Opened"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      paused={paused}
      onPause={() => setPaused((p) => !p)}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective, seconds: config.study, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) } : null}
      result={over ? {
        passed, stars,
        headline: passed ? `Level ${progress.level} cleared!` : 'The vault stayed shut',
        detail: `${s.correct} of ${total} vaults opened`,
        atEnd: progress.atEnd, onNext: progress.advance, onRetry: progress.retry
      } : null}
      footer={<p className="text-sm">Type with the keypad or your keyboard (0–9, Backspace, Enter).</p>}
    >
      {started && !over && (
        <div className="mx-auto w-full max-w-xl">
          {/* A light, clean vault room (2026-11-18, the user: "clean, clear — no black backgrounds"). */}
          <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-b from-indigo-50 via-white to-violet-50 p-3 shadow-[0_18px_40px_-22px_rgba(79,70,229,0.45)] ring-1 ring-indigo-100 sm:p-5">

            {/* Rounds */}
            <div className="relative mb-3 flex items-center justify-between gap-2">
              <p className="text-xs font-black tracking-[0.18em] text-indigo-600 uppercase">Vault {s.step + 1} of {total}</p>
              <div className="flex gap-1" aria-hidden>
                {level.steps.map((_, i) => (
                  <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < s.results.length ? (s.results[i] ? 'bg-emerald-400' : 'bg-rose-500') : i === s.step ? 'bg-amber-300 ring-2 ring-amber-300/40' : 'bg-indigo-100'}`} />
                ))}
              </div>
            </div>

            {/* The doors */}
            <div className={`relative grid gap-2 sm:gap-3 ${doors.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : doors.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {doors.map((door, i) => {
                const tone = DOOR_TONES[door.key];
                const isAsked = (s.phase === 'ask' || s.phase === 'feedback') && step.door === i;
                const isChanging = change?.rule.door === i;
                const reveal = s.phase === 'study' || (s.phase === 'feedback' && isAsked);
                const code = s.phase === 'study' ? door.code.join('') : s.last?.answer;
                const open = s.phase === 'feedback' && isAsked && s.last?.ok;
                return (
                  <div
                    key={`${s.step}-${door.key}`}
                    className={`gs-rise relative overflow-hidden rounded-2xl bg-white p-[3px] ring-1 ring-slate-200 transition-all duration-300 ${
                      isAsked || isChanging ? `scale-[1.04] shadow-xl ${tone.glow} ring-4 ring-amber-300` : s.phase !== 'study' ? 'opacity-60' : 'shadow-lg'
                    } ${s.phase === 'feedback' && isAsked ? (s.last?.ok ? 'gs-right' : 'gs-wrong') : ''}`}
                    aria-label={`${door.name} door${reveal ? `, code ${code.split('').join(' ')}` : ', locked'}`}
                  >
                    <div className="relative flex flex-col items-center rounded-[13px] bg-gradient-to-b from-white to-slate-50 pb-2.5">
                      {[['left-1.5 top-9'], ['right-1.5 top-9'], ['left-1.5 bottom-1.5'], ['right-1.5 bottom-1.5']].map(([pos]) => (
                        <span key={pos} aria-hidden className={`absolute ${pos} h-1.5 w-1.5 rounded-full bg-slate-300`} />
                      ))}
                      <span className={`w-full bg-gradient-to-r py-1 text-center text-[0.7rem] font-black tracking-widest text-white uppercase ${tone.band}`}>{door.name}</span>
                      {/* The dial */}
                      <span className={`relative mt-2 grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-indigo-50 to-indigo-100 ring-4 ring-white shadow-[0_2px_6px_rgba(79,70,229,0.2)] transition-transform duration-500 sm:h-14 sm:w-14 ${isChanging ? 'rotate-90' : ''} ${open ? 'rotate-180' : ''}`}>
                        <span aria-hidden className="absolute inset-1 rounded-full border-2 border-dashed border-indigo-200" />
                        {open ? <LockOpen className={`h-5 w-5 ${tone.text}`} aria-hidden /> : <Lock className="h-5 w-5 text-indigo-500" aria-hidden />}
                      </span>
                      {/* The LED code */}
                      <span className={`mt-2 rounded-lg px-2.5 py-1 font-mono text-lg font-black tracking-[0.22em] tabular-nums ring-1 sm:text-xl ${reveal ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-slate-400 ring-slate-200'}`}>
                        {reveal ? code : '•'.repeat(config.length)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Study */}
            {s.phase === 'study' && (
              <div className="relative mt-4">
                <p className="mb-2 text-center text-sm font-black text-slate-800">Remember these codes! 🔍</p>
                <div className="h-2.5 overflow-hidden rounded-full bg-indigo-100" role="progressbar" aria-label="Study time left" aria-valuemin={0} aria-valuemax={config.study} aria-valuenow={Math.ceil(studyLeft / 1000)}>
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-[width] duration-100 ease-linear" style={{ width: `${(studyLeft / (config.study * 1000)) * 100}%` }} />
                </div>
                <button type="button" onClick={() => dispatch({ type: 'ready' })} className="fp-press mt-3 w-full rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 py-3 text-sm font-black text-white shadow-[0_4px_0_#4338ca]">
                  Got them — lock the doors ({Math.ceil(studyLeft / 1000)}s)
                </button>
              </div>
            )}

            {/* A code change (2026-11-18 redesign): plain words, and a picture of which number changes. */}
            {change && (() => {
              const r = change.rule;
              const door = step.doors.find((d) => change.ruleText.startsWith(d.name)) || step.doors[0];
              const n = door.code.length;
              return (
                <div key={`${s.step}-${s.ruleIdx}`} className="gs-rise relative mt-4 rounded-2xl bg-white p-4 text-center shadow-[0_14px_30px_-14px_rgba(0,0,0,0.6)]" role="status" aria-live="polite">
                  <p className="flex items-center justify-center gap-1.5 text-[11px] font-black tracking-[0.18em] text-indigo-600 uppercase">
                    <Zap className="h-3.5 w-3.5" aria-hidden /> Code change{step.changes.length > 1 ? ` · ${s.ruleIdx + 1} of ${step.changes.length}` : ''}
                  </p>
                  <p className="mt-2 text-lg leading-snug font-black text-slate-900">{change.ruleText}</p>
                  <div className="mt-3 flex items-center justify-center gap-1.5" aria-hidden>
                    {r.kind === 'rotate'
                      ? Array.from({ length: n }, (_, i) => <span key={i} className={`grid h-10 w-9 place-items-center rounded-lg text-sm font-black ${i === 0 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{i === 0 ? '1st' : '•'}</span>).concat(<span key="arr" className="ml-1 text-lg font-black text-indigo-600">↻ to end</span>)
                      : Array.from({ length: n }, (_, i) => (
                        <span key={i} className={`grid h-10 w-10 place-items-center rounded-lg text-sm font-black ${i === r.pos ? 'bg-indigo-600 text-white shadow-[0_3px_0_#3730a3]' : 'bg-slate-100 text-slate-400'}`}>{i === r.pos ? `${r.delta > 0 ? '+' : '−'}${Math.abs(r.delta)}` : '•'}</span>
                      ))}
                  </div>
                  <p className="mt-2 text-xs font-semibold text-slate-500">{ruleHint(r)} Change it in your head.</p>
                  <button type="button" onClick={() => dispatch({ type: 'ruleSeen' })} className="fp-press mt-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-2.5 text-sm font-black text-white shadow-[0_4px_0_#3730a3]">
                    Got it
                  </button>
                </div>
              );
            })()}

            {/* The question and the keypad */}
            {(s.phase === 'ask' || s.phase === 'feedback') && (
              <div className="relative mt-4">
                <p className={`text-center text-base font-black ${s.phase === 'feedback' ? (s.last?.ok ? 'text-emerald-600' : 'text-rose-600') : 'text-slate-900'}`} role="status" aria-live="polite">
                  {s.phase === 'feedback'
                    ? s.last.ok ? `Open! The ${asked.name} vault is unlocked. 🔓` : `Locked. The ${asked.name} code was ${s.last.answer}.`
                    : <>Unlock the <span className={`rounded-md bg-gradient-to-r px-2 py-0.5 text-white ${DOOR_TONES[asked.key].band}`}>{asked.name.toUpperCase()}</span> door</>}
                </p>
                <div className="mt-3 flex justify-center gap-2" aria-label={`Code typed: ${s.entry.split('').join(' ') || 'nothing yet'}`}>
                  {Array.from({ length: config.length }, (_, i) => {
                    const ch = (s.phase === 'feedback' ? s.last.entry : s.entry)[i];
                    return (
                      <span key={i} className={`flex h-12 w-10 items-center justify-center rounded-xl bg-white font-mono text-2xl font-black ring-2 ${ch ? 'text-indigo-700 ring-indigo-400' : 'text-slate-300 ring-slate-200'}`}>
                        {ch || '–'}
                      </span>
                    );
                  })}
                </div>
                <div className="mx-auto mt-3 grid max-w-xs grid-cols-3 gap-2 rounded-2xl bg-white p-2.5 shadow-[0_8px_20px_-12px_rgba(79,70,229,0.35)] ring-1 ring-indigo-100">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                    <Key key={d} label={d} onClick={() => dispatch({ type: 'digit', d })} disabled={s.phase !== 'ask'} />
                  ))}
                  <Key label={<Delete className="mx-auto h-5 w-5" />} aria="Delete" onClick={() => dispatch({ type: 'back' })} disabled={s.phase !== 'ask'} muted />
                  <Key label="0" onClick={() => dispatch({ type: 'digit', d: '0' })} disabled={s.phase !== 'ask'} />
                  <Key label={<Check className="mx-auto h-5 w-5" />} aria="Unlock" onClick={() => dispatch({ type: 'submit' })} disabled={s.phase !== 'ask' || s.entry.length !== config.length} go />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </GameShell>
  );
}

function Key({ label, aria, onClick, disabled, muted, go }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={aria}
      className={`fp-press min-h-12 rounded-xl text-xl font-black shadow-[0_3px_0_rgba(79,70,229,0.18)] transition active:translate-y-0.5 active:shadow-none disabled:opacity-40 ${
        go ? 'bg-gradient-to-b from-emerald-400 to-emerald-600 text-white' : muted ? 'bg-rose-50 text-rose-500 ring-1 ring-rose-100' : 'bg-indigo-50 text-indigo-900 ring-1 ring-indigo-100 hover:bg-indigo-100'
      }`}
    >
      {label}
    </button>
  );
}
