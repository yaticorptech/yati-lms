import { useState } from 'react';
import { ArrowDown, ArrowUp, GripVertical, Lock } from 'lucide-react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { architectConfig, isSolved, makeArchitectLevel, placedRight } from '../../data/bands/gArchitect';
import { Eyebrow, Panel, Status, btnGhost, btnPrimary } from './GVerbalKit';
import { DRAG_TYPE, freshSeed } from './gDrag';

/** Verbal Architect: rebuild a paragraph from its shuffled sentences, using connectives and references as cues. */
export default function VerbalArchitect({ onExit }) {
  const progress = useGameProgress('verbal-architect', { bands: SECTION_BANDS.master });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const config = architectConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  const [rounds] = useState(() => makeArchitectLevel(seeded(freshSeed()), config));
  const max = rounds.reduce((n, r) => n + r.sentences.length + 1, 0);
  const pass = Math.ceil(max * 0.65);
  const [index, setIndex] = useState(0);
  const [order, setOrder] = useState(() => rounds[0].start);
  const [checksUsed, setChecksUsed] = useState(0);
  const [marks, setMarks] = useState(null); // after a check: per position true/false
  const [done, setDone] = useState(false);
  const [held, setHeld] = useState(null); // position held in tap mode
  const [points, setPoints] = useState(0);
  const [tally, setTally] = useState({ correct: 0, wrong: 0 });
  const [started, setStarted] = useState(false);

  const over = index >= rounds.length;
  const round = over ? null : rounds[index];
  const stars = over ? starsForFixed(points, pass, max) : 0;
  useRecordStars(progress, over, stars, { correct: tally.correct, wrong: tally.wrong, hints: 0, score: points });

  const locked = (pos) => config.lockFirst && pos === 0;

  /** Move the sentence at `from` to position `to`, the others shifting. */
  const move = (from, to) => {
    if (done || from === to || locked(from) || locked(to)) return;
    const next = [...order];
    const [s] = next.splice(from, 1);
    next.splice(to, 0, s);
    setOrder(next);
    setMarks(null);
    setHeld(null);
  };

  const tapCard = (pos) => {
    if (done || locked(pos)) return;
    if (held === null) setHeld(pos);
    else if (held === pos) setHeld(null);
    else move(held, pos);
  };

  const check = () => {
    const right = placedRight(order);
    const solved = isSolved(order);
    const used = checksUsed + 1;
    setChecksUsed(used);
    setHeld(null);
    if (solved || used >= config.checks) {
      if (solved) sfx.right(); else sfx.wrong();
      const gained = right + (solved && used === 1 ? 1 : 0);
      setPoints(points + gained);
      setTally({ correct: tally.correct + right, wrong: tally.wrong + (order.length - right) });
      setMarks(order.map((v, i) => v === i));
      setDone(true);
      return;
    }
    sfx.wrong();
    setMarks(order.map((v, i) => v === i));
  };

  const next = () => {
    const ni = index + 1;
    setIndex(ni);
    if (ni < rounds.length) setOrder(rounds[ni].start);
    setChecksUsed(0);
    setMarks(null);
    setDone(false);
    setHeld(null);
  };

  const right = round ? placedRight(order) : 0;
  const solved = round ? isSolved(order) : false;
  const status = !round
    ? ''
    : done
      ? solved ? (checksUsed === 1 ? 'Perfect structure on the first check (+1 bonus).' : 'Structured correctly.') : `${right} of ${order.length} in place. The intended order is shown below.`
      : marks
        ? `${right} of ${order.length} sentences are in the right place (green). ${config.checks - checksUsed} check left.`
        : held !== null
          ? 'Now tap the place where this sentence should go.'
          : 'Drag sentences (or tap one, then tap its new place). Look for "however", "this", "then"…';

  return (
    <GameShell
      title="Verbal Architect"
      blurb="Rebuild the paragraph so its logic flows."
      tone="bg-gradient-to-br from-sky-700 to-slate-900"
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
              objective: `The ${config.length} sentences of a paragraph are jumbled. Drag them into the one order that reads logically — the opening introduces the topic; connectives (however, as a result, finally) and references back (this, these, he) tell you what must come before.${config.lockFirst ? ' The first sentence is locked in place for you.' : ''} ${config.checks === 1 ? 'One check' : `${config.checks} checks`} per paragraph; 1 point per sentence in place, +1 for a first-check solve. ${pass} of ${max} clears the level.`,
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
              headline: points >= pass ? `Level ${progress.level} cleared` : 'The structure did not hold',
              detail: `${points} of ${max} points across ${rounds.length} paragraphs`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={<p className="text-center text-sm text-slate-500">Paragraph {Math.min(index + 1, rounds.length)} of {rounds.length}</p>}
    >
      {started && round && (
        <div className="mx-auto grid w-full max-w-3xl gap-3">
          <Panel label="Paragraph">
            <Eyebrow>Your paragraph</Eyebrow>
            <ol className="grid gap-2">
              {order.map((s, pos) => {
                const mark = marks ? marks[pos] : null;
                const lock = locked(pos);
                return (
                  <li
                    key={s}
                    draggable={!done && !lock}
                    onDragStart={(e) => e.dataTransfer.setData(DRAG_TYPE, String(pos))}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); const from = Number(e.dataTransfer.getData(DRAG_TYPE)); if (Number.isInteger(from)) move(from, pos); }}
                    className={`flex items-stretch gap-2 rounded-xl ring-2 ring-inset transition ${
                      mark === true ? 'bg-emerald-50 ring-emerald-400' : mark === false ? 'bg-rose-50 ring-rose-300' : held === pos ? 'bg-indigo-50 ring-indigo-500 shadow-md' : 'bg-[#f7f6fd] ring-transparent'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => tapCard(pos)}
                      disabled={done || lock}
                      aria-pressed={held === pos}
                      aria-label={`Position ${pos + 1}: ${round.sentences[s]}${lock ? ' (locked)' : ''}`}
                      className={`flex min-h-12 flex-1 items-start gap-2 rounded-xl p-2.5 text-left text-sm leading-relaxed text-[#1b2456] sm:text-base ${lock || done ? 'cursor-default' : 'cursor-grab'}`}
                    >
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-xs font-black text-slate-500 ring-1 ring-[#e4e1f5]">{pos + 1}</span>
                      {lock ? <Lock className="mt-1 h-4 w-4 shrink-0 text-slate-400" aria-hidden /> : <GripVertical className="mt-1 h-4 w-4 shrink-0 text-slate-300" aria-hidden />}
                      <span>{round.sentences[s]}</span>
                    </button>
                    {!done && !lock && (
                      <span className="flex flex-col justify-center gap-1 pr-1.5">
                        <button type="button" aria-label="Move up" disabled={pos === 0 || locked(pos - 1)} onClick={() => move(pos, pos - 1)} className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-[#e4e1f5] disabled:opacity-30 sm:h-8 sm:w-8">
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button type="button" aria-label="Move down" disabled={pos === order.length - 1} onClick={() => move(pos, pos + 1)} className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-[#e4e1f5] disabled:opacity-30 sm:h-8 sm:w-8">
                          <ArrowDown className="h-4 w-4" />
                        </button>
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
            {!done && (
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {held !== null && <button type="button" className={btnGhost} onClick={() => setHeld(null)}>Cancel</button>}
                <button type="button" className={btnPrimary} onClick={check}>Check order</button>
              </div>
            )}
          </Panel>

          {done && !solved && (
            <Panel label="Intended order">
              <Eyebrow>Intended order</Eyebrow>
              <p className="text-sm leading-relaxed text-[#1b2456] sm:text-base">{round.sentences.join(' ')}</p>
            </Panel>
          )}

          <Status tone={done ? (solved ? 'good' : 'bad') : marks ? 'bad' : 'idle'}>{status}</Status>
          {done && (
            <div className="flex justify-center">
              <button type="button" className={btnPrimary} onClick={next} autoFocus>
                {index + 1 >= rounds.length ? 'See result' : 'Next paragraph'}
              </button>
            </div>
          )}
        </div>
      )}
    </GameShell>
  );
}
