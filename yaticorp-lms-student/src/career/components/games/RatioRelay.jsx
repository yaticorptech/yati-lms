import { useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import useEClock from './useEClock';
import ENumPad from './ENumPad';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { makeRelayLevel, relayConfig } from '../../data/bands/eSmartMath';

const freshSeed = () => Math.floor(Math.random() * 4294967296);
/** Tries on one leg before the baton is handed on for you. */
const TRIES = 3;

/** 🏃 Ratio Relay: each ratio answer is the baton for the next leg. */
export default function RatioRelay({ onExit }) {
  const progress = useGameProgress('ratio-relay', { bands: SECTION_BANDS.smart });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const cfg = relayConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  const [relays] = useState(() => makeRelayLevel(seeded(freshSeed()), cfg));
  const [ri, setRi] = useState(0);
  const [li, setLi] = useState(0);
  const [input, setInput] = useState('');
  const [tries, setTries] = useState(0);
  const [results, setResults] = useState(() => relays.map(() => []));
  const [points, setPoints] = useState(0);
  const [tally, setTally] = useState({ correct: 0, wrong: 0 });
  const [note, setNote] = useState(null); // { tone, text }
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);

  const legs = cfg.legs;
  const max = relays.length * legs * 2;
  const pass = Math.ceil(max * 0.6);
  const limitMs = cfg.seconds * 1000;
  const allDone = ri >= relays.length;
  const elapsed = useEClock(started && !paused && !allDone, limitMs);
  const timeUp = elapsed >= limitMs;
  const over = allDone || timeUp;
  const stars = over ? starsForFixed(points, pass, max) : 0;
  useRecordStars(progress, over, stars, { correct: tally.correct, wrong: tally.wrong, hints: 0, score: points, limitMs });

  const relay = allDone ? null : relays[ri];
  const relayDone = !!relay && li >= legs;
  const leg = relay && !relayDone ? relay.legs[li] : null;
  const locked = !started || over || paused || relayDone;

  const finishLeg = (result, gained) => {
    setResults((rs) => rs.map((r, i) => (i === ri ? [...r, result] : r)));
    setPoints((n) => n + gained);
    setLi((n) => n + 1);
    setTries(0);
    setInput('');
  };

  const submit = () => {
    if (locked || !input) return;
    if (Number(input) === leg.answer) {
      sfx.right?.();
      const gained = tries === 0 ? 2 : 1;
      setTally((t) => ({ ...t, correct: t.correct + 1 }));
      setNote({ tone: 'good', text: `Baton passed: ${leg.answer}${gained === 2 ? ' · +2' : ' · +1 (after a slip)'}` });
      finishLeg(tries === 0 ? 'clean' : 'slip', gained);
      return;
    }
    sfx.wrong();
    setTally((t) => ({ ...t, wrong: t.wrong + 1 }));
    if (tries + 1 >= TRIES) {
      setNote({ tone: 'bad', text: `Baton dropped — the answer was ${leg.answer}. The relay carries on from it.` });
      finishLeg('dropped', 0);
      return;
    }
    setTries(tries + 1);
    setInput('');
    setNote({ tone: 'bad', text: `The relay breaks — ${input} is not it. Try this leg again (${TRIES - tries - 1} ${TRIES - tries - 1 === 1 ? 'try' : 'tries'} left, worth 1 point now).` });
  };

  const nextRelay = () => {
    setRi((n) => n + 1);
    setLi(0);
    setNote(null);
  };

  const objective = `${relays.length} relays of ${legs} legs. Each leg is a ratio or proportion problem, and its answer is the baton: the next leg starts from it. A wrong answer breaks the relay — retry that leg for fewer points. ${cfg.seconds} seconds in all. Score ${pass} of ${max} to clear.`;

  return (
    <GameShell
      title="Ratio Relay"
      blurb="Solve each leg — your answer runs the next one."
      tone="bg-gradient-to-br from-orange-500 to-rose-600"
      score={`${points}/${max}`}
      scoreLabel="Points"
      seconds={Math.ceil(Math.max(0, limitMs - elapsed) / 1000)}
      totalSeconds={cfg.seconds}
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      paused={paused}
      onPause={() => setPaused((v) => !v)}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective, seconds: cfg.seconds, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) } : null}
      result={over ? {
        passed: points >= pass,
        stars,
        headline: points >= pass ? `Level ${progress.level} cleared!` : timeUp && !allDone ? 'Time is up' : 'Nearly there',
        detail: `${points} of ${max} points · ${results.flat().filter((r) => r === 'clean').length} legs run clean`,
        atEnd: progress.atEnd,
        onNext: progress.advance,
        onRetry: progress.retry
      } : null}
      footer={<p className="text-center text-sm text-ink-500">Relay {Math.min(ri + 1, relays.length)} of {relays.length} · type the answer, Enter passes the baton</p>}
    >
      {started && relay && (
        <div className="mx-auto flex w-full max-w-md flex-col gap-3">
          <Track legs={legs} results={results[ri]} current={li} relay={relay} />

          {leg ? (
            <>
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-orange-100">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-black tracking-[0.14em] text-orange-500 uppercase">Leg {li + 1} of {legs}</span>
                  <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-700">Baton: {leg.q}</span>
                </div>
                <p className="text-base leading-snug font-bold text-ink-900">{leg.text}</p>
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="text-sm font-bold text-ink-500">Answer</span>
                <span className={`flex h-12 min-w-28 items-center justify-center rounded-xl px-4 text-2xl font-black tabular-nums ring-2 ring-inset ${tries ? 'bg-rose-50 ring-rose-300' : 'bg-white ring-orange-300'}`} aria-live="polite">{input || '…'}</span>
              </div>
            </>
          ) : (
            <div className="rounded-2xl bg-emerald-50 p-4 text-center ring-1 ring-emerald-200">
              <p className="text-lg font-black text-emerald-700">Relay {ri + 1} finished!</p>
              <p className="text-sm text-ink-700">{relay.start} → {relay.legs.map((l) => l.answer).join(' → ')}</p>
            </div>
          )}

          <p className={`min-h-6 text-center text-sm font-black ${note?.tone === 'good' ? 'text-emerald-600' : note?.tone === 'bad' ? 'text-rose-600' : 'text-ink-700'}`} role="status" aria-live="polite">
            {note?.text || 'Work it out, then pass the baton.'}
          </p>

          {leg ? (
            <ENumPad value={input} onChange={setInput} onEnter={submit} active={!locked} disabled={locked} maxLen={4} enterLabel="Pass" />
          ) : (
            <button type="button" onClick={nextRelay} className="fp-press mx-auto min-h-12 rounded-xl bg-orange-600 px-6 text-sm font-black text-white" autoFocus>
              {ri + 1 < relays.length ? 'Start next relay' : 'See result'}
            </button>
          )}
        </div>
      )}
    </GameShell>
  );
}

/** The relay track: one station per leg, gold for a clean leg, amber after a slip, grey when the baton dropped. */
function Track({ legs, results, current, relay }) {
  return (
    <div className="rounded-2xl bg-gradient-to-r from-orange-50 to-rose-50 px-2 py-3 sm:px-3 ring-1 ring-orange-100" role="list" aria-label="Relay legs">
      <div className="relative flex items-start justify-between">
        <span className="absolute top-[1.125rem] right-5 left-5 h-1 sm:top-5 rounded-full bg-orange-200" aria-hidden="true" />
        <Station label="Start" value={relay.start} tone="bg-slate-700 text-white" />
        {Array.from({ length: legs }, (_, i) => {
          const r = results[i];
          const tone = r === 'clean' ? 'bg-amber-400 text-amber-950' : r === 'slip' ? 'bg-orange-300 text-orange-950' : r === 'dropped' ? 'bg-slate-300 text-slate-600'
            : i === current ? 'bg-white text-orange-600 ring-2 ring-orange-500 animate-pulse' : 'bg-white text-slate-400 ring-1 ring-orange-200';
          return <Station key={i} label={`Leg ${i + 1}`} value={r ? relay.legs[i].answer : i + 1} tone={tone} />;
        })}
      </div>
    </div>
  );
}

function Station({ label, value, tone }) {
  return (
    <span className="relative z-10 flex w-9 shrink-0 flex-col sm:w-11 items-center gap-1" role="listitem" aria-label={`${label}: ${value}`}>
      <span className={`flex h-9 w-9 items-center justify-center rounded-full text-xs sm:h-10 sm:w-10 font-black tabular-nums ${tone}`}>{value}</span>
      <span className="text-[0.65rem] font-bold whitespace-nowrap text-ink-500">{label}</span>
    </span>
  );
}
