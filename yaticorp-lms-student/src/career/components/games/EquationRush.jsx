import { useEffect, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import useTimedRound from './useTimedRound';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { equationConfig, makeEquationLevel, equationMax, sameStep, stepLabel, treeText } from '../../data/bands/dEquation';

const freshSeed = () => Math.floor(Math.random() * 4294967296);
const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const MINUS = '−';
const VALUE_TRIES = 2;

/** Draws an expression tree; divisions as stacked fractions. */
function Expr({ node }) {
  if (node.t === 'x') return <i className="font-serif">x</i>;
  if (node.t === 'num') return <span>{node.v < 0 ? `${MINUS}${-node.v}` : node.v}</span>;
  if (node.t === 'xside') {
    const c = node.c === 1 ? '' : node.c === -1 ? MINUS : node.c < 0 ? `${MINUS}${-node.c}` : node.c;
    return <span>{c}<i className="font-serif">x</i> {node.d >= 0 ? '+' : MINUS} {Math.abs(node.d)}</span>;
  }
  if (node.t === 'mul') {
    const k = node.k === -1 ? MINUS : node.k < 0 ? `${MINUS}${-node.k}` : node.k;
    if (node.e.t === 'x') return <span>{k}<i className="font-serif">x</i></span>;
    return <span>{k}(<Expr node={node.e} />)</span>;
  }
  if (node.t === 'add') return <span><Expr node={node.e} /> {node.k >= 0 ? '+' : MINUS} {Math.abs(node.k)}</span>;
  if (node.t === 'div') {
    return (
      <span className="mx-0.5 inline-flex flex-col items-center align-middle leading-none">
        <span className="border-b-2 border-current px-1 pb-0.5"><Expr node={node.e} /></span>
        <span className="pt-0.5">{node.k}</span>
      </span>
    );
  }
  return null;
}

/** ⚡ Math: undo the equation one inverse step at a time, then work out x. */
export default function EquationRush({ onExit }) {
  const progress = useGameProgress('equation-rush', { bands: SECTION_BANDS.smart });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

const START = { index: 0, step: 0, phase: 'steps', missedStep: false, slipped: false, tries: 0, input: '', points: 0, solved: 0, clean: 0, feedback: null };

function Round({ progress, onExit }) {
  const [config] = useState(() => equationConfig(progress.ageBand, progress.difficulty, progress.levelNo));
  const [level] = useState(() => makeEquationLevel(seeded(freshSeed()), config));
  const [game, setGame] = useState(START);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [wrongPick, setWrongPick] = useState(null);

  const maxPoints = level.reduce((s, e) => s + equationMax(e), 0);
  const pass = Math.ceil(maxPoints * 0.6);
  const finished = game.index >= level.length;
  const { seconds } = useTimedRound(config.seconds, started && !paused, finished);
  const timeUp = started && seconds <= 0 && !finished;
  const over = finished || timeUp;
  const playing = started && !over && !paused;
  const passed = game.points >= pass;
  const stars = over ? starsForFixed(game.points, pass, maxPoints) : 0;
  useRecordStars(progress, over, stars, { correct: game.solved, wrong: level.length - game.clean, hints: 0, score: game.points, limitMs: config.seconds * 1000 });

  const eq = finished ? null : level[game.index];

  const pickStep = (opt) => {
    if (!playing || game.phase !== 'steps') return;
    if (!sameStep(opt, eq.steps[game.step])) {
      sfx.wrong();
      setWrongPick(stepLabel(opt));
      setGame({ ...game, missedStep: true, slipped: true, feedback: { tone: 'bad', text: game.step === 0 && eq.kind === 'both' ? 'First gather the x terms on the left.' : 'Undo the LAST thing done to x first.' } });
      return;
    }
    setWrongPick(null);
    const step = game.step + 1;
    const gained = game.missedStep ? 0 : 1;
    setGame({ ...game, step, missedStep: false, points: game.points + gained, phase: step >= eq.steps.length ? 'value' : 'steps', feedback: { tone: 'good', text: `${stepLabel(opt)} on both sides ✓` } });
  };

  const nextEquation = (g) => ({ ...g, index: g.index + 1, step: 0, phase: 'steps', missedStep: false, slipped: false, tries: 0, input: '' });

  const submitValue = () => {
    if (!playing || game.phase !== 'value' || !/^−?\d+$/.test(game.input)) return;
    const v = Number(game.input.replace(MINUS, '-'));
    if (v === eq.x) {
      const gained = game.tries === 0 ? 2 : 1;
      const clean = game.tries === 0 && !game.slipped;
      setGame({ ...game, phase: 'done', points: game.points + gained, solved: game.solved + 1, clean: game.clean + (clean ? 1 : 0), feedback: { tone: 'good', text: `x = ${game.input} ✓  (+${gained})` } });
      return;
    }
    sfx.wrong();
    const tries = game.tries + 1;
    if (tries >= VALUE_TRIES) {
      setGame({ ...game, tries, phase: 'done', feedback: { tone: 'bad', text: `Not quite: ${eq.finalText} = ${eq.x < 0 ? MINUS + -eq.x : eq.x}` } });
      return;
    }
    setGame({ ...game, tries, input: '', feedback: { tone: 'bad', text: 'Check the arithmetic and try once more.' } });
  };

  const type = (ch) => {
    if (!playing || game.phase !== 'value') return;
    setGame((g) => {
      if (ch === 'back') return { ...g, input: g.input.slice(0, -1) };
      if (ch === MINUS) return { ...g, input: g.input.startsWith(MINUS) ? g.input.slice(1) : MINUS + g.input };
      if (g.input.replace(MINUS, '').length >= 4) return g;
      return { ...g, input: g.input + ch };
    });
  };

  const advance = () => { if (game.phase === 'done') { setWrongPick(null); setGame((g) => ({ ...nextEquation(g), feedback: null })); } };

  useEffect(() => {
    if (!playing) return undefined;
    const onKey = (e) => {
      if (game.phase === 'steps') {
        const n = Number(e.key);
        if (n >= 1 && n <= 4) pickStep(eq.options[game.step][n - 1]);
      } else if (game.phase === 'value') {
        if (/^\d$/.test(e.key)) type(e.key);
        else if (e.key === '-' || e.key === '−') type(MINUS);
        else if (e.key === 'Backspace') type('back');
        else if (e.key === 'Enter') submitValue();
      } else if (game.phase === 'done' && e.key === 'Enter') advance();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const objective = config.band === 'intermediate'
    ? `Solve ${level.length} equations. Each step, choose the inverse operation that undoes the last thing done to x (− undoes +, ÷ undoes ×), until x is alone — then work out x. ${clock(config.seconds)} for the set; pause any time.`
    : `Solve ${level.length} equations with brackets, negatives and fractions${config.kinds.includes('both') ? ', and x on both sides (gather the x terms first)' : ''}. Pick each inverse step in the right order, then enter x. ${clock(config.seconds)} for the set; pause any time.`;

  // Working lines: the question and every line reached so far; at the value stage the last line is shown unworked.
  const shownLines = eq ? eq.lines.slice(0, game.step + (game.phase === 'steps' ? 1 : 0)) : [];
  const tone = { good: 'text-emerald-600', bad: 'text-rose-600' };

  return (
    <GameShell
      title="Equation Rush"
      blurb="Undo, undo, undo — then x."
      tone="bg-gradient-to-br from-orange-500 to-red-700"
      score={`${game.solved}/${level.length}`}
      scoreLabel="Solved"
      seconds={started ? seconds : undefined}
      totalSeconds={config.seconds}
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      paused={paused}
      onPause={started && !over ? () => setPaused((p) => !p) : undefined}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective, seconds: config.seconds, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) } : null}
      result={over ? {
        passed, stars,
        headline: passed ? `Level ${progress.level} cleared!` : timeUp ? 'Time is up' : 'Keep practising',
        detail: `${game.solved} of ${level.length} solved · ${game.points} of ${maxPoints} points (need ${pass})`,
        atEnd: progress.atEnd, onNext: progress.advance, onRetry: progress.retry
      } : null}
      footer={<p className="text-center text-sm text-ink-500">Equation {Math.min(game.index + 1, level.length)} of {level.length} · keys 1–4 choose a step · type x and Enter</p>}
    >
      {started && eq && (
        <div className="mx-auto w-full max-w-md">
          <div className="rounded-2xl bg-slate-900 p-4 font-mono text-white shadow-inner" aria-live="polite">
            {shownLines.map((line, i) => (
              <div key={i} className={`flex flex-wrap items-center justify-between gap-x-2 gap-y-1 py-1 ${i === 0 ? 'text-xl sm:text-2xl' : 'text-lg text-slate-200'} ${i > 0 ? 'gs-rise border-t border-white/10' : ''}`}>
                <span className="min-w-0 font-bold break-words" aria-label={`${treeText(line.left)} = ${treeText(line.right)}`}>
                  <Expr node={line.left} /> <span className="text-orange-300">=</span> <Expr node={line.right} />
                </span>
                {i > 0 && <span className="shrink-0 rounded-md bg-white/10 px-1.5 py-0.5 text-xs text-orange-200">{stepLabel(eq.steps[i - 1])}</span>}
              </div>
            ))}
            {game.phase !== 'steps' && (
              <div className="gs-rise flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-white/10 py-1 text-lg">
                <span className="font-bold">{eq.finalText.replace(/^x = /, '')} = <span className="text-orange-300">?</span></span>
                <span className="shrink-0 rounded-md bg-white/10 px-1.5 py-0.5 text-xs text-orange-200">{stepLabel(eq.steps[eq.steps.length - 1])}</span>
              </div>
            )}
          </div>

          <p className={`mt-2 min-h-5 text-center text-sm font-black ${game.feedback ? tone[game.feedback.tone] : 'text-ink-700'}`} role="status">
            {game.feedback?.text || `Step ${game.step + 1} of ${eq.steps.length}: what do you do to both sides?`}
          </p>

          {game.phase === 'steps' && (
            <div className="mt-2 grid grid-cols-2 gap-2.5">
              {eq.options[game.step].map((opt, i) => {
                const label = stepLabel(opt);
                return (
                  <button key={label} type="button" onClick={() => pickStep(opt)} disabled={!playing} aria-label={`${i + 1}: ${label} on both sides`}
                    className={`fp-press min-h-14 rounded-2xl font-mono text-xl font-black ring-2 ring-inset ${wrongPick === label ? 'gs-wrong bg-rose-100 text-rose-800 ring-rose-400' : 'bg-orange-50 text-orange-900 ring-orange-200'}`}>
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {game.phase === 'value' && (
            <div className="mt-2">
              <div className="mx-auto mb-2 flex max-w-xs items-center justify-center gap-2 rounded-xl bg-white py-2 text-2xl font-black ring-2 ring-orange-300">
                <i className="font-serif">x</i> = <span className="min-w-16 text-center text-orange-700">{game.input || '…'}</span>
              </div>
              <div className="mx-auto grid max-w-xs grid-cols-4 gap-2">
                {['7', '8', '9', 'back', '4', '5', '6', MINUS, '1', '2', '3', '0'].map((k) => (
                  <button key={k} type="button" onClick={() => type(k)} disabled={!playing} aria-label={k === 'back' ? 'Delete' : k === MINUS ? 'Minus sign' : k}
                    className="fp-press min-h-12 rounded-xl bg-slate-100 text-lg font-black text-slate-800 ring-1 ring-slate-200">
                    {k === 'back' ? '⌫' : k}
                  </button>
                ))}
              </div>
              <button type="button" onClick={submitValue} disabled={!playing || !/^−?\d+$/.test(game.input)}
                className="fp-press mx-auto mt-2 block w-full max-w-xs rounded-xl bg-orange-600 py-3 text-sm font-black text-white disabled:opacity-40">
                Check x ({VALUE_TRIES - game.tries} {VALUE_TRIES - game.tries === 1 ? 'try' : 'tries'})
              </button>
            </div>
          )}

          {game.phase === 'done' && (
            <button type="button" onClick={advance} autoFocus className="fp-press mt-3 w-full rounded-xl bg-red-700 py-3 text-sm font-black text-white">
              {game.index + 1 < level.length ? 'Next equation →' : 'See result'}
            </button>
          )}
        </div>
      )}
    </GameShell>
  );
}
