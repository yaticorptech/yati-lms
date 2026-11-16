import { useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { interferenceConfig, makeInterferenceTrial, scoreRecall } from '../../data/bands/fInterference';

const freshSeed = () => Math.floor(Math.random() * 4294967296);
/** The blank between two words, so each one lands as a separate event. */
const GAP_MS = 250;

/** Ticks `onTick(dt)` every 100 ms while `running`; a pause stops the ticks, so no wall-clock gap counts. */
function useRunningClock(running, onTick) {
  const cb = useRef(onTick);
  useEffect(() => { cb.current = onTick; });
  useEffect(() => {
    if (!running) return undefined;
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      cb.current(now - last);
      last = now;
    }, 100);
    return () => clearInterval(id);
  }, [running]);
}

/** 🧠 Interference Recall: hold list A while a look-alike list B tries to overwrite it. */
export default function InterferenceRecall({ onExit }) {
  const progress = useGameProgress('interference-recall', { bands: SECTION_BANDS.master });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

const STAGES = ['A', 'B', 'sums', 'test'];
const STAGE_NAME = { A: 'List A', B: 'List B', sums: 'Clear your head', test: 'Recall', review: 'Review' };

function Round({ progress, onExit }) {
  const cfg = interferenceConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  const [trial] = useState(() => makeInterferenceTrial(seeded(freshSeed()), cfg));
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [stage, setStage] = useState('A'); // A → B → sums → test → review → done
  const [elapsed, setElapsed] = useState(0);
  const [sumIdx, setSumIdx] = useState(0);
  const [sumsRight, setSumsRight] = useState(0);
  const [sumFlash, setSumFlash] = useState(null);
  const [tapped, setTapped] = useState([]);
  const [done, setDone] = useState(false);

  const slot = cfg.studyMs + GAP_MS;
  const list = stage === 'A' ? trial.listA : trial.listB;
  const listing = stage === 'A' || stage === 'B';
  const wordIdx = Math.floor(elapsed / slot);
  const showing = listing && wordIdx < list.length && elapsed - wordIdx * slot < cfg.studyMs;

  const result = scoreRecall(trial, tapped);
  const over = done;
  const passed = result.score >= cfg.pass;
  const stars = over ? starsForFixed(result.score, cfg.pass, cfg.max) : 0;
  useRecordStars(progress, over, stars, { correct: result.hits, wrong: result.falseAlarms, hints: 0, score: result.score });

  // Called from the clock's interval (never during render), so `elapsed` and `stage` here are the latest rendered.
  useRunningClock(started && listing && !paused, (dt) => {
    const next = elapsed + dt;
    if (next >= list.length * slot) {
      setElapsed(0);
      setStage(stage === 'A' ? 'B' : 'sums');
    } else setElapsed(next);
  });

  const answerSum = (choice) => {
    if (stage !== 'sums' || sumFlash) return;
    const ok = choice === trial.sums[sumIdx].answer;
    if (ok) setSumsRight((n) => n + 1);
    setSumFlash(ok ? 'right' : 'wrong');
    setTimeout(() => {
      setSumFlash(null);
      if (sumIdx + 1 >= trial.sums.length) setStage('test');
      else setSumIdx((i) => i + 1);
    }, 450);
  };

  const toggle = (w) => {
    if (stage !== 'test') return;
    setTapped((t) => (t.includes(w) ? t.filter((x) => x !== w) : [...t, w]));
  };

  const submit = () => {
    if (stage !== 'test') return;
    if (result.falseAlarms === 0 && result.hits === trial.listA.length) sfx.right?.(); else if (result.falseAlarms > 0) sfx.wrong();
    setStage('review');
  };

  const stageNo = STAGES.indexOf(stage === 'review' ? 'test' : stage);
  const objective = `Study list A (${cfg.listSize} words, one at a time). A second list of similar-meaning words follows, then ${cfg.sums} quick sums. Finally tap only the list A words — each look-alike or new word you tap cancels a hit. Score ${cfg.pass} of ${cfg.max} to clear.`;

  return (
    <GameShell
      title="Interference Recall"
      blurb="Keep list A clean while list B tries to overwrite it."
      tone="bg-gradient-to-br from-indigo-800 to-slate-900"
      variant="premium"
      score={stage === 'review' || over ? `${result.score}/${cfg.max}` : `${stageNo + 1}/4`}
      scoreLabel={stage === 'review' || over ? 'Score' : 'Stage'}
      paused={paused}
      onPause={listing ? () => setPaused((p) => !p) : undefined}
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={!started ? {
        gameId: progress.gameId,
        level: progress.level,
        objective,
        stars: starsOn(progress.gameId, progress.level),
        onStart: () => setStarted(true)
      } : null}
      result={over ? {
        passed,
        stars,
        headline: passed ? `Level ${progress.level} cleared` : 'Interference won this time',
        detail: `${result.hits} of ${cfg.listSize} list A words · ${result.lureFA} list B lure${result.lureFA === 1 ? '' : 's'} · ${result.newFA} new word${result.newFA === 1 ? '' : 's'} tapped · score ${result.score}`,
        atEnd: progress.atEnd,
        onNext: progress.advance,
        onRetry: progress.retry
      } : null}
      footer={<p>Study A, read B, solve the sums, then recall only A. Similar meanings are the trap.</p>}
    >
      {started && !over && (
        <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-5">
          <ol className="flex w-full flex-wrap justify-center gap-1.5" aria-label="Stages">
            {STAGES.map((s, i) => (
              <li key={s} className={`rounded-full px-3 py-1 text-[0.65rem] font-black tracking-[0.12em] uppercase ${i === stageNo ? 'bg-indigo-600 text-white' : i < stageNo ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}>
                {STAGE_NAME[s]}
              </li>
            ))}
          </ol>

          {listing && (
            <>
              <p className="text-sm font-semibold text-slate-500">
                {stage === 'A' ? 'Memorise these words.' : 'Read these words — but list A is what you will be asked about.'}
              </p>
              <div className="flex h-36 w-full items-center justify-center rounded-3xl bg-slate-900 ring-1 ring-slate-700" aria-live="polite">
                {showing && (
                  <span key={`${stage}-${wordIdx}`} className={`animate-pop-in text-3xl font-black tracking-[0.08em] sm:text-4xl ${stage === 'A' ? 'text-amber-300' : 'text-sky-300'}`}>
                    {list[wordIdx]}
                  </span>
                )}
              </div>
              <p className="text-xs font-bold text-slate-400 tabular-nums">Word {Math.min(wordIdx + 1, list.length)} of {list.length}</p>
            </>
          )}

          {stage === 'sums' && (
            <>
              <p className="text-sm font-semibold text-slate-500">Quick sums ({sumIdx + 1} of {trial.sums.length}). Keep list A in mind.</p>
              <p className="text-4xl font-black text-[#1b2456] tabular-nums">{trial.sums[sumIdx].text} = ?</p>
              <div className="grid w-full max-w-sm grid-cols-3 gap-2.5">
                {trial.sums[sumIdx].choices.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => answerSum(c)}
                    className={`min-h-14 rounded-2xl text-xl font-black tabular-nums ring-1 ring-inset transition ${
                      sumFlash && c === trial.sums[sumIdx].answer ? 'bg-emerald-100 ring-emerald-400 text-emerald-700' : 'bg-white ring-slate-200 text-[#1b2456] hover:bg-indigo-50'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <p className="min-h-5 text-sm font-bold" role="status">{sumFlash === 'right' ? <span className="text-emerald-600">Correct</span> : sumFlash === 'wrong' ? <span className="text-rose-600">Not quite</span> : null}</p>
            </>
          )}

          {(stage === 'test' || stage === 'review') && (
            <>
              <p className="text-sm font-semibold text-slate-500">
                {stage === 'test' ? `Tap every word from list A (${tapped.length} selected), then submit.` : 'Gold: list A. Blue: list B lure. Grey: never shown.'}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {trial.test.map((it) => {
                  const on = tapped.includes(it.word);
                  let tone = on ? 'bg-indigo-600 text-white ring-indigo-600' : 'bg-white text-[#1b2456] ring-slate-200 hover:bg-indigo-50';
                  if (stage === 'review') {
                    const base = it.kind === 'A' ? 'bg-amber-100 text-amber-800 ring-amber-300' : it.kind === 'B' ? 'bg-sky-100 text-sky-800 ring-sky-300' : 'bg-slate-100 text-slate-600 ring-slate-300';
                    tone = `${base} ${on ? (it.kind === 'A' ? 'ring-2 ring-emerald-500' : 'ring-2 ring-rose-500 line-through') : it.kind === 'A' ? 'opacity-70' : ''}`;
                  }
                  return (
                    <button
                      key={it.word}
                      type="button"
                      onClick={() => toggle(it.word)}
                      aria-pressed={on}
                      disabled={stage === 'review'}
                      className={`min-h-11 rounded-xl px-3.5 py-2 text-sm font-black tracking-wide ring-1 ring-inset transition ${tone}`}
                    >
                      {it.word}
                    </button>
                  );
                })}
              </div>
              {stage === 'test' ? (
                <button type="button" onClick={submit} disabled={!tapped.length} className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-black text-white shadow disabled:opacity-40">
                  Submit recall
                </button>
              ) : (
                <>
                  <p className="text-center text-sm font-bold text-[#1b2456]" role="status">
                    {result.hits} hits − {result.falseAlarms} false alarm{result.falseAlarms === 1 ? '' : 's'} = {result.score}. Sums: {sumsRight}/{trial.sums.length}.
                  </p>
                  <button type="button" onClick={() => setDone(true)} autoFocus className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-black text-white shadow">
                    See result
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}
    </GameShell>
  );
}
