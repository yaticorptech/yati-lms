import { useState, useEffect } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { forgeConfig, forgeRound, applyOp } from '../../data/bands/math';

const OPS_SHOWN = [
  { op: '+', label: 'plus' },
  { op: '−', label: 'minus' },
  { op: '×', label: 'times' },
  { op: '÷', label: 'divided by' }
];

/**
 * By age band (data/bands/math.js, 2026-11-13): Classes 1–2 make a target up to 10 from three tiles with + only
 * (one tap on each tile, no operator to choose); 3–5 + and − to 30, then ×; 6–8 all four; 9–10 five tiles, longer
 * chains, bigger targets; 11–12 a constraint — every tile must be used, or only a few operators are allowed. Every
 * round is built backwards from a working chain, so it can always be forged.
 */
const OBJECTIVE = {
  foundation: 'Tap two tiles to add them. Make the target number!',
  developing: 'Tap a tile, a sign, then another tile to join them. Make the target.',
  intermediate: 'Join tiles with + − × ÷ to make the target.',
  analytical: 'Longer chains, bigger targets: join tiles with + − × ÷ to make the target.',
  advanced: 'Make the target — but follow the rule shown: use every tile, or only the signs given.'
};

/** Up to ten dots under a small target, for the youngest. */
function TargetDots({ n }) {
  return (
    <span className="mt-2 flex flex-wrap justify-center gap-1.5" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => <span key={i} className="h-4 w-4 rounded-full bg-white/90" />)}
    </span>
  );
}

const tilesOf = (values) => values.map((value, k) => ({ value, id: `s${k}` }));

/** ⚡ Math & speed: combine the tiles with + − × ÷ to forge the target. */
export default function NumberForge({ onExit }) {
  const progress = useGameProgress('number-forge');
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const config = forgeConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  const young = config.band === 'foundation';
  const [round, setRound] = useState(() => forgeRound(config));
  const [history, setHistory] = useState(() => [tilesOf(round.start)]);
  const [oopsCount, setOopsCount] = useState(0); // tile sets, latest last
  const [sel, setSel] = useState(null);   // selected tile id
  const [op, setOp] = useState(null);
  const [fresh, setFresh] = useState(null); // id of the tile just forged, for its pop
  const [solved, setSolved] = useState(0);
  const [started, setStarted] = useState(false);
  const [played, setPlayed] = useState(0);
  const [roundAt, setRoundAt] = useState(0);
  const [now, setNow] = useState(0);
  const [notice, setNotice] = useState(null); // { kind: 'won' | 'lost' | 'oops', text, at }
  const tiles = history[history.length - 1];
  const over = played >= config.rounds;
  const left = Math.min(config.ms, Math.max(0, config.ms - (now - roundAt)));
  const showNotice = notice && now - notice.at < (notice.kind === 'lost' ? 3200 : 1800);
  const timedOut = started && !over && left <= 0;
  const urgent = left <= 5000;

  const passed = solved >= config.target;
  const stars = over ? starsForFixed(solved, config.target, config.rounds) : 0;
  useRecordStars(progress, over, stars, { correct: solved, wrong: played - solved + oopsCount, hints: 0, score: solved, limitMs: config.ms * config.rounds });

  const nextRound = (won) => {
    const t = Date.now();
    setNotice(won ? { kind: 'won', text: 'Forged it — target hit!', at: t } : { kind: 'lost', text: `Time’s up. One way: ${round.solution.join(', ')}`, at: t });
    if (won) setSolved((n) => n + 1);
    setPlayed((n) => n + 1);
    const next = forgeRound(config);
    setRound(next);
    setHistory([tilesOf(next.start)]);
    setSel(null);
    setOp(null);
    setFresh(null);
    setRoundAt(t);
    setNow(t);
  };

  useEffect(() => {
    if (!started || over) return undefined;
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, [started, over]);

  useEffect(() => {
    if (timedOut) nextRound(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timedOut]);

  const oops = (text) => {
    sfx.wrong();
    setOopsCount((n) => n + 1);
    const t = Date.now();
    setNotice({ kind: 'oops', text, at: t });
    setNow(t);
  };

  const tapTile = (id) => {
    if (over) return;
    const useOp = op || (round.ops.length === 1 ? round.ops[0] : null);
    if (!sel || !useOp || id === sel) {
      setSel(id === sel ? null : id);
      if (id === sel) setOp(null);
      return;
    }
    const a = tiles.find((x) => x.id === sel);
    const b = tiles.find((x) => x.id === id);
    const r = applyOp(a.value, b.value, useOp);
    if (r.error) return oops(r.error);
    const made = { value: r.value, id: `f${Date.now()}` };
    const after = tiles.filter((x) => x.id !== id).map((x) => (x.id === sel ? made : x));
    if (r.value === round.target && (!round.mustUseAll || after.length === 1)) return nextRound(true);
    if (r.value === round.target) {
      const t = Date.now();
      setNotice({ kind: 'oops', text: 'That’s the target — but every tile must be used. Undo and try another way.', at: t });
      setNow(t);
    } else if (round.mustUseAll && after.length === 1) {
      oops(`All tiles used, but ${r.value} isn’t ${round.target}. Undo or reset.`);
    }
    setHistory([...history, after]);
    setSel(made.id);
    setOp(null);
    setFresh(made.id);
  };

  const tapOp = (o) => {
    if (sel) setOp(op === o ? null : o);
  };
  const undo = () => {
    if (history.length < 2) return;
    setHistory(history.slice(0, -1));
    setSel(null);
    setOp(null);
    setFresh(null);
  };
  const reset = () => {
    setHistory([tilesOf(round.start)]);
    setSel(null);
    setOp(null);
    setFresh(null);
  };

  const noticeTone = { won: 'text-emerald-600', lost: 'text-rose-600', oops: 'text-amber-700' };
  const secs = config.ms / 1000;
  const rule = round.mustUseAll
    ? 'use every tile'
    : round.ops.length < 4 && config.constraint === 'ops'
      ? `only ${round.ops.join(' ')} allowed`
      : young ? 'add two tiles together' : 'you don’t need every tile';
  const toolBtn = 'fp-press min-h-11 flex-1 rounded-2xl bg-surface text-sm font-black text-ink-900 ring-1 ring-line-200 ring-inset transition hover:bg-amber-50 disabled:opacity-40';

  return (
    <GameShell
      title="Number Forge"
      blurb={`Forge ${config.target} of ${config.rounds} targets — ${secs} seconds each.`}
      tone="bg-gradient-to-br from-amber-500 to-orange-600"
      score={solved}
      scoreLabel="Forged"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={
        !started
          ? {
              gameId: progress.gameId,
              level: progress.level,
              objective: `${OBJECTIVE[config.band]} ${secs} seconds a target. Forge ${config.target} of ${config.rounds}.`,
              seconds: secs,
              stars: starsOn(progress.gameId, progress.level),
              onStart: () => {
                const t = Date.now();
                setRoundAt(t);
                setNow(t);
                setStarted(true);
              }
            }
          : null
      }
      result={
        over
          ? {
              passed,
              stars,
              headline: passed ? `Level ${progress.level} cleared!` : 'So close',
              detail: `${solved} of ${config.rounds} targets forged`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={<p className="text-center text-sm text-ink-500">Target {Math.min(played + 1, config.rounds)} of {config.rounds} · {rule}</p>}
    >
      {started && !over && (
        <div className="mx-auto max-w-md">
          <p className={`mb-2 min-h-5 text-center text-sm font-black ${showNotice ? noticeTone[notice.kind] : ''}`} role="status" aria-live="polite">
            {showNotice ? notice.text : ''}
          </p>
          <div className="h-2.5 overflow-hidden rounded-full bg-ink-900/10" role="progressbar" aria-label="Time left on this target" aria-valuemin={0} aria-valuemax={secs} aria-valuenow={Math.ceil(left / 1000)}>
            <div className={`h-full rounded-full transition-[width] duration-100 ease-linear ${urgent ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${(left / config.ms) * 100}%` }} />
          </div>
          <div className="mt-1 flex items-center justify-between gap-2 text-xs font-black">
            <span className="text-rose-600" aria-live="polite">{urgent ? 'Hurry — forge it!' : ''}</span>
            <span className={`tabular-nums ${urgent ? 'text-rose-600' : 'text-ink-500'}`}>{Math.ceil(left / 1000)}s</span>
          </div>

          <div className="mt-3 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 px-4 py-4 text-center text-white shadow-lg">
            <span className="block text-[0.65rem] font-black tracking-[0.18em] uppercase opacity-80">Target</span>
            <span key={round.target + '-' + played} className="gs-num block text-5xl font-black tabular-nums">{round.target}</span>
            {young && <TargetDots n={round.target} />}
          </div>

          {(round.mustUseAll || round.ops.length < 4) && !young && (
            <p className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-center text-sm font-black text-amber-800 ring-1 ring-amber-200 ring-inset">
              Rule: {rule}
            </p>
          )}

          <div className={`mt-4 grid gap-2 sm:gap-2.5 ${tiles.length >= 5 ? 'grid-cols-5' : tiles.length === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
            {tiles.map((t) => {
              const on = t.id === sel;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => tapTile(t.id)}
                  aria-label={`Tile ${t.value}`}
                  aria-pressed={on}
                  className={`fp-press min-w-0 rounded-2xl font-black ${young ? 'min-h-20 text-4xl' : 'min-h-16 text-xl sm:text-2xl'} tabular-nums ring-1 ring-inset transition-all ${
                    on ? 'scale-105 bg-amber-500 text-white ring-amber-500 shadow-[0_0_0_4px_rgba(245,158,11,0.25)]' : 'bg-surface text-ink-900 ring-line-200 hover:bg-amber-50 hover:ring-amber-300'
                  }`}
                >
                  <span className={t.id === fresh ? 'gs-num inline-block' : ''}>{t.value}</span>
                </button>
              );
            })}
          </div>

          {round.ops.length > 1 && (
          <div className={`mt-3 grid gap-2.5 ${round.ops.length === 4 ? 'grid-cols-4' : round.ops.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {OPS_SHOWN.filter((o) => round.ops.includes(o.op)).map((o) => (
              <button
                key={o.op}
                type="button"
                onClick={() => tapOp(o.op)}
                disabled={!sel}
                aria-label={o.label}
                aria-pressed={op === o.op}
                className={`fp-press min-h-14 rounded-2xl text-3xl font-black ring-1 ring-inset transition-all disabled:opacity-40 ${
                  op === o.op ? 'bg-orange-600 text-white ring-orange-600' : 'bg-surface text-ink-900 ring-line-200 hover:bg-orange-50 hover:ring-orange-300'
                }`}
              >
                {o.op}
              </button>
            ))}
          </div>
          )}

          <div className="mt-4 flex gap-2.5">
            <button type="button" onClick={undo} disabled={history.length < 2} aria-label="Undo last move" className={toolBtn}>↶ Undo</button>
            <button type="button" onClick={reset} disabled={history.length < 2} aria-label="Reset to starting tiles" className={toolBtn}>⟲ Reset</button>
          </div>
        </div>
      )}
    </GameShell>
  );
}
