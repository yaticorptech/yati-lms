import { useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { checkMarks, isRotationOf, makeRotationLevel, mirror, rotationConfig } from '../../data/bands/fRotation';

const freshSeed = () => Math.floor(Math.random() * 4294967296);

/**
 * A clock that only runs while `running`: calls `onTick(dt)` every 100 ms with the time since the last tick, so a
 * pause simply stops the ticks and no wall-clock gap is ever counted.
 */
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

/** 🧊 Spatial Rotation Vault: remember a marked figure, find it turned among mirror decoys, place its marks. */
export default function SpatialRotationVault({ onExit }) {
  const progress = useGameProgress('spatial-rotation-vault', { bands: SECTION_BANDS.master });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

const keyOf = (x, y) => `${x},${y}`;

function Round({ progress, onExit }) {
  const cfg = rotationConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  const [rounds] = useState(() => makeRotationLevel(seeded(freshSeed()), cfg));
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState('study'); // study → pick → marks → reveal
  const [studied, setStudied] = useState(0);
  const [picked, setPicked] = useState(null);
  const [tapped, setTapped] = useState([]);
  const [score, setScore] = useState(0);
  const [tally, setTally] = useState({ shapes: 0, marks: 0, wrong: 0 });
  const [verdict, setVerdict] = useState(null);

  const over = index >= rounds.length;
  const round = over ? null : rounds[index];
  const right = round ? round.options.find((o) => o.right) : null;
  const passed = score >= cfg.pass;
  const stars = over ? starsForFixed(score, cfg.pass, cfg.max) : 0;
  useRecordStars(progress, over, stars, {
    correct: tally.shapes + tally.marks, wrong: tally.wrong, hints: 0, score
  });

  useRunningClock(started && !over && !paused && phase === 'study', (dt) => {
    const next = Math.min(studied + dt, cfg.studyMs);
    setStudied(next);
    if (next >= cfg.studyMs) setPhase('pick');
  });

  const choose = (opt) => {
    if (phase !== 'pick') return;
    setPicked(opt.id);
    if (opt.right) { sfx.right?.(); setScore((s) => s + 1); setTally((t) => ({ ...t, shapes: t.shapes + 1 })); }
    else { sfx.wrong(); setTally((t) => ({ ...t, wrong: t.wrong + 1 })); }
    setPhase('marks');
  };

  const tapCell = (k) => {
    if (phase !== 'marks') return;
    setTapped((list) => (list.includes(k) ? list.filter((x) => x !== k) : list.length >= cfg.marks ? list : [...list, k]));
  };

  const lockMarks = () => {
    if (phase !== 'marks' || tapped.length !== cfg.marks) return;
    const res = checkMarks(round, tapped);
    if (res.exact) { sfx.right?.(); setScore((s) => s + 1); setTally((t) => ({ ...t, marks: t.marks + 1 })); }
    else { sfx.wrong(); setTally((t) => ({ ...t, wrong: t.wrong + 1 })); }
    setVerdict({ shape: picked === right.id, marks: res.exact, hits: res.hits });
    setPhase('reveal');
  };

  const next = () => {
    setIndex((i) => i + 1);
    setPhase('study');
    setStudied(0);
    setPicked(null);
    setTapped([]);
    setVerdict(null);
  };

  const left = Math.max(0, Math.ceil((cfg.studyMs - studied) / 1000));
  const objective = `Each figure is shown with ${cfg.marks} gold-marked cells for about ${Math.round(cfg.studyMs / 1000)} seconds, then hidden. Pick the candidate that is the same figure turned — not flipped, not altered — then tap where the gold cells went. ${rounds.length} figures, 2 points each; score ${cfg.pass} of ${cfg.max} to clear.`;

  return (
    <GameShell
      title="Spatial Rotation Vault"
      blurb={`Track a figure through a turn — ${cfg.pass} of ${cfg.max} points to open the vault.`}
      tone="bg-gradient-to-br from-slate-700 to-indigo-900"
      variant="premium"
      score={`${score}/${cfg.max}`}
      scoreLabel="Points"
      seconds={started && !over && phase === 'study' ? left : undefined}
      totalSeconds={Math.round(cfg.studyMs / 1000)}
      paused={paused}
      onPause={() => setPaused((p) => !p)}
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={!started ? {
        gameId: progress.gameId,
        level: progress.level,
        objective,
        seconds: Math.round(cfg.studyMs / 1000),
        stars: starsOn(progress.gameId, progress.level),
        onStart: () => setStarted(true)
      } : null}
      result={over ? {
        passed,
        stars,
        headline: passed ? `Vault ${progress.level} open` : 'The vault stays shut',
        detail: `${tally.shapes} of ${rounds.length} figures identified · ${tally.marks} of ${rounds.length} mark sets placed exactly`,
        atEnd: progress.atEnd,
        onNext: progress.advance,
        onRetry: progress.retry
      } : null}
      footer={<p>Figure {Math.min(index + 1, rounds.length)} of {rounds.length}. A flipped copy can never be turned into the original — check handedness.</p>}
    >
      {started && round && (
        <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-4">
          <p className="text-[0.65rem] font-black tracking-[0.18em] text-indigo-500 uppercase" aria-live="polite">
            {phase === 'study' && `Memorise · ${left}s`}
            {phase === 'pick' && 'Which one is the same figure, turned?'}
            {phase === 'marks' && `Tap the ${cfg.marks} cells where the marks went (${tapped.length}/${cfg.marks})`}
            {phase === 'reveal' && 'Result'}
          </p>

          {phase === 'study' && (
            <Figure cells={round.base} cell={44} marks={round.base.filter((c) => c[2]).map(([x, y]) => keyOf(x, y))} label="The figure to remember, with marked cells" />
          )}

          {phase === 'pick' && (
            <div className={`grid w-full gap-3 ${round.options.length > 4 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'}`}>
              {round.options.map((o, i) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => choose(o)}
                  aria-label={`Candidate ${i + 1}`}
                  className="flex min-h-[8rem] min-w-0 items-center justify-center rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200 transition ring-inset hover:bg-indigo-50 hover:ring-indigo-300 focus-visible:outline-2 focus-visible:outline-indigo-500"
                >
                  <Figure cells={o.cells} cell={20} />
                </button>
              ))}
            </div>
          )}

          {(phase === 'marks' || phase === 'reveal') && (
            <>
              {picked !== right.id && (
                <p className="text-center text-sm font-bold text-rose-600" role="status">
                  Not that one — that was {isRotationOf(mirror(round.base), round.options.find((o) => o.id === picked).cells) ? 'a mirror image' : 'an altered shape'}. Here is the true turned figure.
                </p>
              )}
              {picked === right.id && phase === 'marks' && <p className="text-center text-sm font-bold text-emerald-600" role="status">Right figure. Now place the marks.</p>}
              <Figure
                cells={right.cells}
                cell={44}
                onTap={phase === 'marks' ? tapCell : null}
                tapped={tapped}
                marks={phase === 'reveal' ? round.answerMarks : []}
                reveal={phase === 'reveal'}
                label="The turned figure: tap the marked cells"
              />
              {phase === 'marks' ? (
                <button
                  type="button"
                  onClick={lockMarks}
                  disabled={tapped.length !== cfg.marks}
                  className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-black text-white shadow transition disabled:opacity-40"
                >
                  Lock in marks
                </button>
              ) : (
                <>
                  <p className={`text-center text-sm font-bold ${verdict?.marks ? 'text-emerald-600' : 'text-rose-600'}`} role="status">
                    {verdict?.marks ? 'Every mark placed exactly.' : `${verdict?.hits} of ${cfg.marks} marks right — gold shows where they were.`}
                    {' '}+{(verdict?.shape ? 1 : 0) + (verdict?.marks ? 1 : 0)} points
                  </p>
                  <button type="button" onClick={next} autoFocus className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-black text-white shadow">
                    {index + 1 >= rounds.length ? 'See result' : 'Next figure'}
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

/**
 * A block figure drawn on a grid of raised tiles. `marks` are gold; with `onTap`, each block is a button and
 * `tapped` blocks are violet; `reveal` colours taps right (gold) and wrong (rose) and outlines missed marks.
 */
function Figure({ cells, cell, marks = [], tapped = [], onTap = null, reveal = false, label }) {
  const w = Math.max(...cells.map((c) => c[0])) + 1;
  const h = Math.max(...cells.map((c) => c[1])) + 1;
  const has = new Set(cells.map(([x, y]) => keyOf(x, y)));
  const slots = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) slots.push(keyOf(x, y));
  const gap = Math.max(2, Math.round(cell / 12));
  return (
    <div
      role={onTap ? 'group' : 'img'}
      aria-label={label}
      className="grid max-w-full min-w-0"
      style={{ gridTemplateColumns: `repeat(${w}, minmax(0, ${cell}px))`, width: w * cell + (w - 1) * gap, gap }}
    >
      {slots.map((k) => {
        if (!has.has(k)) return <span key={k} aria-hidden="true" className="aspect-square" />;
        const isMark = marks.includes(k);
        const isTap = tapped.includes(k);
        let tone = 'bg-slate-600 shadow-[inset_0_-4px_0_rgba(15,23,42,0.45),inset_0_2px_0_rgba(255,255,255,0.15)]';
        if (reveal) {
          if (isMark && isTap) tone = 'bg-amber-400 shadow-[inset_0_-4px_0_rgba(146,64,14,0.45)]';
          else if (isTap) tone = 'bg-rose-500 shadow-[inset_0_-4px_0_rgba(127,29,29,0.45)]';
          else if (isMark) tone = 'bg-slate-600 ring-4 ring-amber-400 ring-inset';
        } else if (isMark) tone = 'bg-amber-400 shadow-[inset_0_-4px_0_rgba(146,64,14,0.45),inset_0_2px_0_rgba(255,255,255,0.3)]';
        else if (isTap) tone = 'bg-violet-500 shadow-[inset_0_-4px_0_rgba(76,29,149,0.5)]';
        const cls = `block aspect-square w-full rounded-md ${tone}`;
        return onTap ? (
          <button key={k} type="button" onClick={() => onTap(k)} aria-pressed={isTap} aria-label={`Block ${k}`} className={`${cls} transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500`} />
        ) : (
          <span key={k} className={cls} />
        );
      })}
    </div>
  );
}
