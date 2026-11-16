import { useState } from 'react';
import { Megaphone, PlaneTakeoff } from 'lucide-react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import useEClock from './useEClock';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { boardConfig, clock, makeBoardLevel } from '../../data/bands/departureBoard';

const freshSeed = () => Math.floor(Math.random() * 4294967296);
const HEAD = { time: 'Time', dest: 'Destination', flight: 'Flight', gate: 'Gate' };
const ORDER = ['time', 'dest', 'flight', 'gate'];

/**
 * ✈️ Departure Board (2026-11-16, Master Minds · Memory & Focus; id "departure-board"). Memorise an airport board,
 * hear the announcements, then answer from memory about the board as it is NOW. Data: data/bands/departureBoard.js.
 */
export default function DepartureBoard({ onExit }) {
  const progress = useGameProgress('departure-board', { bands: SECTION_BANDS.master });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const cfg = boardConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  const [boards] = useState(() => makeBoardLevel(seeded(freshSeed()), cfg));
  const [bi, setBi] = useState(0);
  const [qi, setQi] = useState(0);
  const [showFrom, setShowFrom] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const [heard, setHeard] = useState(false); // announcements read
  const [answered, setAnswered] = useState(null); // the option picked
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);

  const showMs = cfg.seconds * 1000;
  const over = bi >= boards.length;
  const elapsed = useEClock(started && !paused && !over && !skipped, showFrom + showMs);
  const showing = started && !over && !skipped && elapsed < showFrom + showMs;
  const total = boards.reduce((n, b) => n + b.questions.length, 0);
  const pass = Math.ceil(total * 0.6);
  const stars = over ? starsForFixed(correct, pass, total) : 0;
  useRecordStars(progress, over, stars, { correct, wrong, hints: 0, score: correct, limitMs: null });

  const b = over ? null : boards[bi];
  const announcing = !!b && !showing && b.notes.length > 0 && !heard;
  const q = b && !showing && !announcing ? b.questions[qi] : null;
  const lastQ = b && qi === b.questions.length - 1;
  const showLeft = Math.max(0, showFrom + showMs - elapsed);

  const choose = (opt) => {
    if (!q || answered || paused) return;
    if (opt === q.answer) { sfx.right?.(); setCorrect((n) => n + 1); } else { sfx.wrong?.(); setWrong((n) => n + 1); }
    setAnswered(opt);
  };
  const next = () => {
    setAnswered(null);
    if (!lastQ) { setQi(qi + 1); return; }
    setBi(bi + 1);
    setQi(0);
    setSkipped(false);
    setHeard(false);
    setShowFrom(elapsed);
  };

  const cols = ORDER.filter((f) => cfg.fields.includes(f));
  const objective = `${boards.length} departure boards of ${cfg.flights} flights, each shown for ${cfg.seconds} seconds. Then the board goes blank and you answer ${cfg.questions} questions from memory.${cfg.changes ? ` Listen out: ${cfg.changes === 1 ? 'an announcement changes' : 'announcements change'} a gate or a time after the board is gone — answer for the board as it is NOW.` : ''} Get ${pass} of ${total} right to clear.`;

  return (
    <GameShell
      variant="premium"
      title="Departure Board"
      blurb="Memorise the flights — then keep up with the changes."
      tone="bg-gradient-to-br from-slate-800 to-indigo-950"
      score={`${correct}/${total}`}
      scoreLabel="Correct"
      seconds={showing ? Math.ceil(showLeft / 1000) : undefined}
      totalSeconds={showing ? cfg.seconds : undefined}
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      paused={paused}
      onPause={showing ? () => setPaused((v) => !v) : undefined}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective, seconds: cfg.seconds, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) } : null}
      result={over ? {
        passed: correct >= pass, stars,
        headline: correct >= pass ? `Level ${progress.level} cleared — all flights on time` : 'A few flights missed — try again',
        detail: `${correct} of ${total} answered correctly`,
        atEnd: progress.atEnd, onNext: progress.advance, onRetry: progress.retry
      } : null}
      footer={<p className="text-center text-sm text-slate-500">Board {Math.min(bi + 1, boards.length)} of {boards.length}{q ? ` · question ${qi + 1} of ${b.questions.length}` : ''}</p>}
    >
      {started && b && (
        <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-3">
          {showing && (
            <div className="h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label="Study time left" aria-valuemin={0} aria-valuemax={cfg.seconds} aria-valuenow={Math.ceil(showLeft / 1000)}>
              <div className="h-full rounded-full bg-amber-400 transition-[width] duration-100 ease-linear" style={{ width: `${(showLeft / showMs) * 100}%` }} />
            </div>
          )}

          <Board rows={showing ? b.shown : answered && lastQ ? b.rows : null} count={cfg.flights} cols={cols} />

          {showing && (
            <button type="button" onClick={() => setSkipped(true)} className="fp-press min-h-11 rounded-xl bg-white px-5 text-sm font-bold text-indigo-700 ring-1 ring-indigo-200 ring-inset">I have it — ask me</button>
          )}

          {announcing && (
            <div className="gs-rise w-full max-w-md rounded-2xl bg-amber-50 p-4 ring-2 ring-amber-300" role="status" aria-live="polite">
              <p className="flex items-center gap-2 text-xs font-black tracking-[0.16em] text-amber-700 uppercase"><Megaphone className="h-4 w-4" aria-hidden /> Announcement</p>
              <ul className="mt-2 space-y-1.5">
                {b.notes.map((n) => <li key={n.dest} className="text-base font-extrabold text-amber-950">{n.text}</li>)}
              </ul>
              <button type="button" onClick={() => setHeard(true)} className="fp-press mt-3 min-h-11 w-full rounded-xl bg-amber-500 text-sm font-black text-white" autoFocus>Got it</button>
            </div>
          )}

          {q && (
            <div className="w-full max-w-md">
              <p className="min-h-6 text-center text-base font-extrabold text-[#1b2456]">{q.prompt}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {q.options.map((opt) => {
                  const tone = !answered ? 'bg-white text-[#1b2456] ring-[#e4e1f5] hover:ring-indigo-300'
                    : opt === q.answer ? 'bg-emerald-50 text-emerald-800 ring-emerald-500'
                      : opt === answered ? 'bg-rose-50 text-rose-700 ring-rose-400' : 'bg-white text-slate-400 ring-[#e4e1f5]';
                  return (
                    <button key={opt} type="button" onClick={() => choose(opt)} disabled={!!answered}
                      className={`fp-press min-h-12 rounded-xl px-3 text-base font-extrabold ring-2 ring-inset transition ${tone}`}>{opt}</button>
                  );
                })}
              </div>
              {answered && (
                <div className="mt-3 flex flex-col items-center gap-2">
                  <p className={`text-sm font-extrabold ${answered === q.answer ? 'text-emerald-600' : 'text-rose-600'}`} role="status" aria-live="polite">
                    {answered === q.answer ? 'Correct.' : `The answer was ${q.answer}.`}
                  </p>
                  <button type="button" onClick={next} className="fp-press min-h-11 rounded-xl bg-indigo-600 px-6 text-sm font-bold text-white" autoFocus>
                    {!lastQ ? 'Next question' : bi + 1 < boards.length ? 'Next board' : 'See result'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </GameShell>
  );
}

/** The airport board: amber letters on black, flap by flap. Blank (dashes) while you answer from memory. */
function Board({ rows, count, cols }) {
  const cell = (f, r) => (f === 'time' ? clock(r.time) : r[f]);
  return (
    <div className="w-full overflow-hidden rounded-2xl bg-[#0b1020] p-3 shadow-[0_14px_36px_-16px_rgba(15,23,42,0.7)] ring-4 ring-slate-700 sm:p-4">
      <div className="mb-2 flex items-center gap-2 border-b border-slate-700 pb-2 text-amber-300">
        <PlaneTakeoff className="h-5 w-5" aria-hidden />
        <span className="text-sm font-black tracking-[0.25em] uppercase">Departures</span>
      </div>
      <table className="w-full table-fixed border-separate border-spacing-y-1.5 font-mono" aria-label={rows ? 'Departure board' : 'Departure board, hidden'}>
        <thead>
          <tr>{cols.map((f) => <th key={f} className={`px-1 text-left text-[0.6rem] font-bold tracking-widest text-slate-400 uppercase ${f === 'dest' ? 'w-[40%]' : ''}`}>{HEAD[f]}</th>)}</tr>
        </thead>
        <tbody>
          {Array.from({ length: count }, (_, i) => (
            <tr key={i}>
              {cols.map((f) => (
                <td key={f} className="px-0.5">
                  <span className={`block truncate rounded-md px-1.5 py-1.5 text-xs font-black tracking-wider uppercase sm:text-base ${rows ? 'bg-slate-800 text-amber-300' : 'bg-slate-800/60 text-slate-600'}`}>
                    {rows ? cell(f, rows[i]) : '— —'}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
