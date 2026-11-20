import { useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { changedAt, ladderConfig, makeLadderLevel } from '../../data/bands/wordLadder';

const freshSeed = () => Math.floor(Math.random() * 4294967296);
const NEXT_MS = 1900;

/** One rung: the word's letters as tiles; the letter that changed from the rung below is lit. */
function Tiles({ word, changed, tone, length }) {
  return (
    <div className="flex justify-center gap-1.5">
      {Array.from({ length }, (_, i) => (
        <span key={i} className={`grid h-11 w-10 place-items-center rounded-xl text-xl font-black uppercase shadow-sm sm:h-12 sm:w-11 sm:text-2xl ${
          i === changed && word ? 'bg-amber-300 text-amber-950 ring-2 ring-amber-500' : tone
        }`}>{word ? word[i] : ''}</span>
      ))}
    </div>
  );
}

/**
 * 🪜 Word Ladder (2026-11-16, Rising Brains · Vocabulary; id "word-ladder"). Climb from the start word to the goal,
 * changing one letter at a time; each rung has a clue. Ladders and levels: data/bands/wordLadder.js. A ladder counts
 * when climbed without a revealed letter.
 */
export default function WordLadder({ onExit }) {
  const progress = useGameProgress('word-ladder', { bands: SECTION_BANDS.smart });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const config = ladderConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  const [list] = useState(() => makeLadderLevel(seeded(freshSeed()), config));
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [step, setStep] = useState(0); // rungs climbed on this ladder
  const [typed, setTyped] = useState('');
  const [tries, setTries] = useState(0);
  const [helped, setHelped] = useState(false); // any letter revealed on this ladder
  const [note, setNote] = useState('');
  const [shake, setShake] = useState(false);
  const [climbed, setClimbed] = useState(null); // the ladder just finished
  const [clean, setClean] = useState(0);
  const input = useRef(null);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const over = idx >= list.length;
  const L = over ? null : list[idx];
  const stars = over ? starsForFixed(clean, config.pass, list.length) : 0;
  useRecordStars(progress, over, stars, { correct: clean, wrong: list.length - clean, hints: helped ? 1 : 0, score: clean });

  useEffect(() => { if (started && !climbed) input.current?.focus(); }, [started, idx, step, climbed]);

  const len = L ? L.start.length : 3;
  const prev = L ? (step === 0 ? L.start : L.steps[step - 1].word) : '';
  const rung = L && !climbed ? L.steps[step] : null;

  const submit = (e) => {
    e.preventDefault();
    if (!rung) return;
    const guess = typed.trim().toLowerCase();
    if (guess.length !== len) { setNote(`The word has ${len} letters.`); return; }
    if (changedAt(prev, guess) < 0) { setNote(`Change exactly ONE letter of “${prev.toUpperCase()}”.`); bump(); return; }
    if (guess !== rung.word) {
      const t = tries + 1;
      setTries(t);
      setNote(t >= config.tries ? 'Here is a letter to help ↓' : 'That is a word, but not the one the clue means — try again!');
      if (t >= config.tries) reveal();
      bump();
      return;
    }
    sfx.right?.();
    setTyped('');
    setNote('');
    setTries(0);
    if (step + 1 < L.steps.length) { setStep((s) => s + 1); return; }
    // The goal!
    setClimbed(L);
    if (!helped) setClean((n) => n + 1);
    timers.current.push(setTimeout(() => {
      setIdx((i) => i + 1);
      setStep(0);
      setHelped(false);
      setClimbed(null);
    }, NEXT_MS));
  };

  const bump = () => { sfx.wrong?.(); setShake(true); timers.current.push(setTimeout(() => setShake(false), 450)); };
  const reveal = () => {
    if (!rung) return;
    const at = changedAt(prev, rung.word);
    setHelped(true);
    setTyped([...prev].map((ch, i) => (i === at ? rung.word[i] : ch)).join(''));
  };

  const objective = `Climb the ladder from the bottom word to the GOAL at the top. Each rung changes just ONE letter, and the clue tells you which word it is: COLD → CORD (a thick string) → CARD → WARD → WARM. ${list.length} ladders — climb ${config.pass} without help.`;

  return (
    <GameShell
      title="Word Ladder"
      blurb="Change one letter at a time to reach the goal word!"
      tone="bg-gradient-to-br from-amber-500 to-rose-500"
      score={`${clean}/${list.length}`}
      scoreLabel="Climbed"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) } : null}
      result={over ? {
        passed: clean >= config.pass, stars,
        headline: clean >= config.pass ? `Level ${progress.level} cleared — top of the ladder!` : 'Nearly at the top — try again',
        detail: `${clean} of ${list.length} ladders climbed without help`,
        atEnd: progress.atEnd, onNext: progress.advance, onRetry: progress.retry
      } : null}
      footer={<p className="text-sm">Ladder {Math.min(idx + 1, list.length)} of {list.length} · {len}-letter words</p>}
    >
      {started && L && (
        <div className="vx-t6 mx-auto flex w-full max-w-md select-none flex-col justify-start max-sm:flex-1">
          <div className="relative overflow-hidden rounded-[1.75rem] px-5 pt-5 pb-6 ring-1 ring-white/10"
            style={{ background: 'radial-gradient(80% 55% at 50% 0%,rgba(139,92,246,0.4) 0%,transparent 70%), linear-gradient(180deg,#171c33 0%,#0d1020 100%)' }}>
            {/* The goal at the top */}
            <div className="mb-4 text-center">
              <p className="text-[0.65rem] font-black tracking-[0.18em] text-rose-300 uppercase">Goal 🏁</p>
              <Tiles word={L.goal} changed={-1} tone="bg-gradient-to-b from-rose-400 to-rose-600 text-white" length={len} />
            </div>

            {/* The ladder: rails, then the rungs from the top (goal side) down to the start */}
            <div className="relative mx-auto max-w-xs">
              <span aria-hidden className="absolute inset-y-0 left-1 w-2.5 rounded-full bg-gradient-to-b from-amber-400 to-amber-700" />
              <span aria-hidden className="absolute inset-y-0 right-1 w-2.5 rounded-full bg-gradient-to-b from-amber-400 to-amber-700" />
              <div className="relative flex flex-col-reverse gap-2 px-5 py-2">
                {/* Start word (bottom rung) */}
                <div className="rounded-2xl bg-amber-400/15 py-1.5">
                  <Tiles word={L.start} changed={-1} tone="bg-white text-amber-900 ring-1 ring-amber-300" length={len} />
                </div>
                {L.steps.map((st, i) => {
                  const done = i < step || climbed;
                  const current = i === step && !climbed;
                  const below = i === 0 ? L.start : L.steps[i - 1].word;
                  return (
                    <div key={i} className={`rounded-2xl py-1.5 transition ${current ? 'bg-violet-500/25 ring-2 ring-violet-400' : done ? 'bg-emerald-500/20' : 'bg-white/[0.05]'} ${current && shake ? 'gs-wrong' : ''}`}>
                      {done
                        ? <Tiles word={st.word} changed={changedAt(below, st.word)} tone="bg-emerald-500 text-white" length={len} />
                        : current
                          ? <Tiles word={typed.toLowerCase().padEnd(len, ' ').slice(0, len)} changed={-1} tone="bg-white text-violet-700 ring-2 ring-dashed ring-violet-300" length={len} />
                          : <Tiles word="" changed={-1} tone="bg-white/10 ring-1 ring-white/15" length={len} />}
                    </div>
                  );
                })}
              </div>
            </div>

            {climbed && (
              <p className="gs-rise mt-3 text-center text-base font-black text-emerald-300" role="status">
                🎉 {climbed.start.toUpperCase()} → {climbed.goal.toUpperCase()} — you reached the top!
              </p>
            )}
          </div>

          {/* The clue and your word */}
          {rung && (
            <form onSubmit={submit} className="vx-card mt-3 p-4">
              <p className="text-[0.65rem] font-black tracking-[0.16em] text-white/90 uppercase">Rung {step + 1} of {L.steps.length} · clue</p>
              <p className="mt-1 text-lg font-black text-white">“{rung.clue}”</p>
              <p className="mt-1 text-sm font-semibold text-white">Change one letter of <b className="text-amber-300 uppercase">{prev}</b>.</p>
              <div className="mt-3 flex gap-2">
                <input ref={input} value={typed} onChange={(e) => setTyped(e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, len))} maxLength={len} autoComplete="off" autoCapitalize="off" spellCheck={false}
                  aria-label="Your word" placeholder={'?'.repeat(len)}
                  className="min-h-12 w-full min-w-0 flex-1 rounded-xl border-0 bg-white/10 px-2 text-center text-2xl font-black tracking-[0.3em] text-white uppercase ring-2 ring-white/20 outline-none placeholder:text-white/30 focus:ring-violet-400" />
                <button type="submit" disabled={typed.length !== len} className="vx-cta fp-press min-h-12 shrink-0 px-4 text-sm disabled:opacity-40">Climb ↑</button>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className={`min-h-5 text-sm font-bold ${note ? 'text-amber-200' : 'text-white/70'}`} role="status" aria-live="polite">{note || ' '}</p>
              </div>
            </form>
          )}
        </div>
      )}
    </GameShell>
  );
}
