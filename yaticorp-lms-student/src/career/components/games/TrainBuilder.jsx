import { useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { makeTrainLevel, trainConfig, trainWorks } from '../../data/bands/trainBuilder';

const freshSeed = () => Math.floor(Math.random() * 4294967296);
const LEAVE_MS = 2200;
const CAR_TONES = [
  'from-rose-400 to-red-500', 'from-sky-400 to-blue-500', 'from-amber-300 to-orange-400',
  'from-emerald-400 to-green-500', 'from-violet-400 to-purple-500', 'from-pink-400 to-fuchsia-500'
];

/**
 * 🚂 Train Builder (2026-11-16, replaces Pizza Party; same id "shape-count-dash" so records are kept). Hook numbered
 * carriages onto the engine so they add up to the station's number, then Go — the train chugs off. Later: exactly N
 * carriages, and number-pattern trains with a gap. data/bands/trainBuilder.js builds the stations.
 */
export default function TrainBuilder({ onExit }) {
  const progress = useGameProgress('shape-count-dash', { bands: SECTION_BANDS.young });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const config = trainConfig(progress.ageBand, progress.levelNo);
  const [stations] = useState(() => makeTrainLevel(seeded(freshSeed()), config));
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [hooked, setHooked] = useState([]); // yard ids, in order
  const [tries, setTries] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [shake, setShake] = useState(null); // message after a wrong Go
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const timers = useRef([]);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);

  const over = idx >= stations.length;
  const st = over ? null : stations[idx];
  const stars = over ? starsForFixed(correct, config.pass, stations.length) : 0;
  useRecordStars(progress, over, stars, { correct, wrong, hints: 0, score: correct, limitMs: null });

  const values = st ? hooked.map((id) => st.yard[id].value) : [];
  const total = values.reduce((a, b) => a + b, 0);

  const hook = (id) => {
    if (leaving) return;
    setShake(null);
    if (st.kind === 'pattern') { setHooked([id]); return; }
    setHooked((h) => (h.includes(id) ? h.filter((x) => x !== id) : [...h, id]));
  };

  const go = () => {
    if (leaving || !hooked.length) return;
    if (trainWorks(st, values)) {
      sfx.right?.();
      setLeaving(true);
      if (tries === 0) setCorrect((c) => c + 1); else setWrong((w) => w + 1);
      timers.current.push(setTimeout(() => { setIdx((i) => i + 1); setHooked([]); setTries(0); setLeaving(false); }, LEAVE_MS));
    } else {
      sfx.wrong?.();
      setTries((t) => t + 1);
      setShake(
        st.kind === 'pattern'
          ? 'That carriage does not fit the pattern. Look at the jumps!'
          : st.kind === 'exact' && hooked.length !== st.count && total === st.target
            ? `Right total — but use exactly ${st.count} carriages!`
            : total > st.target ? `Too heavy! ${total} is more than ${st.target}.` : `Not enough! ${total} is less than ${st.target}.`
      );
    }
  };

  const objective = `Each station has a number. Tap carriages to hook them onto the train so they ADD UP to the station number, then press Go! Some stations want exactly 3 carriages, and some trains are number patterns with a gap to fill. Get ${config.pass} of ${stations.length} right first time.`;

  return (
    <GameShell
      title="Train Builder"
      blurb="Build trains that add up to the station number!"
      tone="bg-gradient-to-br from-sky-400 to-emerald-500"
      score={`${correct}/${stations.length}`}
      scoreLabel="Stations"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) } : null}
      result={over ? {
        passed: correct >= config.pass,
        stars,
        headline: correct >= config.pass ? `Level ${progress.level} cleared! All aboard!` : 'Some trains missed the station!',
        detail: `${correct} of ${stations.length} stations right first time`,
        atEnd: progress.atEnd, onNext: progress.advance, onRetry: progress.retry
      } : null}
      footer={<p className="text-center text-sm text-ink-500">Station {Math.min(idx + 1, stations.length)} of {stations.length} · tap a hooked carriage to unhook it</p>}
    >
      {started && st && (
        <div className="mx-auto w-full max-w-2xl select-none">
          {/* The scene */}
          <div className="relative h-56 overflow-hidden rounded-[1.75rem] bg-gradient-to-b from-sky-300 via-sky-100 to-lime-100 ring-1 ring-sky-200 sm:h-64">
            <span aria-hidden className="absolute top-3 left-6 text-3xl opacity-90">☁️</span>
            <span aria-hidden className="absolute top-8 right-1/3 text-2xl opacity-70">☁️</span>
            <span aria-hidden className="absolute top-4 right-6 h-10 w-10 rounded-full bg-gradient-to-br from-yellow-200 to-amber-400 shadow-[0_0_24px_8px_rgba(253,224,71,0.5)]" />
            <span aria-hidden className="absolute inset-x-0 bottom-10 h-16 rounded-t-[50%] bg-gradient-to-b from-lime-300 to-green-400 opacity-80" />
            <span aria-hidden className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-b from-green-400 to-green-500" />
            {/* Track */}
            <span aria-hidden className="absolute inset-x-0 bottom-7 h-1.5 bg-slate-600" />
            <span aria-hidden className="absolute inset-x-0 bottom-4 h-3 bg-[repeating-linear-gradient(90deg,#78350f_0_8px,transparent_8px_22px)]" />

            {/* Station sign */}
            <div className="absolute top-3 left-1/2 z-10 -translate-x-1/2 text-center">
              <div className="rounded-xl bg-gradient-to-b from-emerald-600 to-emerald-800 px-4 py-1.5 text-white shadow-lg ring-4 ring-white">
                {st.kind === 'pattern' ? (
                  <>
                    <p className="text-[0.6rem] font-black tracking-widest uppercase opacity-80">Pattern station</p>
                    <p className="text-lg font-black">Fill the gap!</p>
                  </>
                ) : (
                  <>
                    <p className="text-[0.6rem] font-black tracking-widest uppercase opacity-80">{st.kind === 'exact' ? `Station · exactly ${st.count} carriages` : 'Station'}</p>
                    <p className="text-3xl leading-none font-black tabular-nums">{st.target}</p>
                  </>
                )}
              </div>
              <span aria-hidden className="mx-auto block h-6 w-1.5 bg-slate-500" />
            </div>

            {/* The train */}
            <div
              className={`absolute bottom-7 left-2 flex origin-bottom-left scale-[0.78] items-end transition-transform ease-in sm:scale-100 ${leaving ? 'translate-x-[130%] duration-[2000ms]' : 'duration-300'} ${shake ? 'gs-wrong' : ''}`}
              aria-label={`Train: ${st.kind === 'pattern' ? st.seq.map((v, i) => (i === st.gap ? (values[0] ?? 'gap') : v)).join(', ') : `${values.join(' + ') || 'no carriages yet'}`}`}
            >
              <Engine moving={leaving} />
              {st.kind === 'pattern'
                ? st.seq.map((v, i) => (
                    <Car key={i} value={i === st.gap ? values[0] : v} tone={i === st.gap ? (values.length ? CAR_TONES[st.yard[hooked[0]].id % CAR_TONES.length] : null) : 'from-slate-300 to-slate-400'} gap={i === st.gap && !values.length} />
                  ))
                : hooked.map((id) => <Car key={id} value={st.yard[id].value} tone={CAR_TONES[id % CAR_TONES.length]} onClick={() => hook(id)} />)}
            </div>
          </div>

          {/* The running total / message */}
          <div className="mt-3 flex min-h-11 items-center justify-center">
            {leaving ? (
              <p className="rounded-full bg-emerald-100 px-4 py-2 text-base font-black text-emerald-800 ring-2 ring-emerald-300" role="status">
                Choo choo! {st.kind === 'pattern' ? `${st.missing} fits the pattern!` : `${values.join(' + ')} = ${st.target}`} 🎉
              </p>
            ) : shake ? (
              <p className="rounded-full bg-rose-100 px-4 py-2 text-base font-black text-rose-700 ring-2 ring-rose-300" role="status">{shake}</p>
            ) : st.kind !== 'pattern' ? (
              <p className="rounded-full bg-white px-4 py-2 text-base font-black text-slate-700 shadow-sm ring-1 ring-slate-200 tabular-nums">
                {values.length ? `${values.join(' + ')} = ${total}` : 'Tap carriages to hook them on'} <span className="text-slate-400">/ {st.target}</span>
              </p>
            ) : (
              <p className="rounded-full bg-white px-4 py-2 text-base font-black text-slate-700 shadow-sm ring-1 ring-slate-200">Which carriage fills the gap?</p>
            )}
          </div>

          {/* The yard */}
          <div className="mt-3 rounded-[1.5rem] bg-gradient-to-b from-amber-50 to-orange-100 p-3 ring-1 ring-orange-200">
            <p className="mb-2 text-center text-[0.65rem] font-black tracking-[0.16em] text-orange-700 uppercase">Carriage yard · tap to hook on</p>
            <div className="flex flex-wrap justify-center gap-2.5">
              {st.yard.map((c) => {
                const used = hooked.includes(c.id);
                return (
                  <button key={c.id} type="button" onClick={() => hook(c.id)} disabled={leaving || (used && st.kind !== 'pattern')}
                    aria-label={`Carriage ${c.value}${used ? ', hooked on' : ''}`}
                    className={`fp-press transition ${used ? 'opacity-30' : 'hover:-translate-y-1'}`}>
                    <Car value={c.value} tone={CAR_TONES[c.id % CAR_TONES.length]} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3 flex justify-center gap-3">
            <button type="button" onClick={() => setHooked([])} disabled={leaving || !hooked.length} className="fp-press min-h-12 rounded-full bg-white px-5 text-sm font-black text-slate-600 shadow-sm ring-1 ring-slate-200 disabled:opacity-40">Unhook all</button>
            <button type="button" onClick={go} disabled={leaving || !hooked.length}
              className="fp-press min-h-12 rounded-full bg-gradient-to-b from-emerald-400 to-emerald-600 px-9 text-base font-black text-white shadow-[0_10px_20px_-8px_rgba(5,150,105,0.8)] ring-2 ring-white disabled:opacity-40">
              Go! 🚦
            </button>
          </div>
        </div>
      )}
    </GameShell>
  );
}

/** The engine, with a puffing chimney while it moves. */
function Engine({ moving }) {
  return (
    <span className="relative mr-1 block h-16 w-20 shrink-0" aria-hidden>
      {moving && <span className="absolute -top-6 left-3 animate-ping text-xl">💨</span>}
      <span className="absolute bottom-3 left-2 h-9 w-3.5 rounded-t-md bg-slate-700" />
      <span className="absolute bottom-3 left-0 h-7 w-20 rounded-lg rounded-tr-3xl bg-gradient-to-b from-red-500 to-red-700 shadow" />
      <span className="absolute right-1 bottom-6 h-7 w-8 rounded-t-lg bg-gradient-to-b from-red-600 to-red-800" />
      <span className="absolute right-2.5 bottom-8 h-3.5 w-5 rounded-sm bg-sky-200" />
      <span className="absolute bottom-0 left-2 h-5 w-5 rounded-full bg-slate-800 ring-2 ring-slate-400" />
      <span className="absolute right-2 bottom-0 h-5 w-5 rounded-full bg-slate-800 ring-2 ring-slate-400" />
    </span>
  );
}

/** A carriage with its number; `gap` draws an empty dashed one. */
function Car({ value, tone, gap, onClick }) {
  const body = (
    <span className="relative block h-14 w-14 shrink-0 sm:h-16 sm:w-16">
      <span className={`absolute inset-x-0 top-0 bottom-3 grid place-items-center rounded-lg text-2xl font-black tabular-nums shadow ${gap ? 'border-2 border-dashed border-slate-400 bg-white/70 text-slate-400' : `bg-gradient-to-b text-white ${tone}`}`}>
        {gap ? '?' : value}
      </span>
      <span className="absolute bottom-0 left-1.5 h-4 w-4 rounded-full bg-slate-800 ring-2 ring-slate-400" />
      <span className="absolute right-1.5 bottom-0 h-4 w-4 rounded-full bg-slate-800 ring-2 ring-slate-400" />
      <span className="absolute top-1/2 -left-1 h-1 w-1 bg-slate-600" />
    </span>
  );
  return onClick ? <button type="button" onClick={onClick} aria-label={`Unhook ${value}`} className="fp-press ml-1">{body}</button> : <span className="ml-1">{body}</span>;
}
