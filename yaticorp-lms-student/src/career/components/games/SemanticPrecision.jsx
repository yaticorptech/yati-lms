import { useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { checkSemanticWhy, checkSemanticWord, makeSemanticLevel, semanticConfig, semanticMax } from '../../data/bands/gSemantic';
import { Chip, Eyebrow, Panel, Status, btnPrimary } from './GVerbalKit';
import { dropProps, freshSeed } from './gDrag';

/** Semantic Precision: drag the most precise word onto the vague one; then say which words of the sentence decide it. */
export default function SemanticPrecision({ onExit }) {
  const progress = useGameProgress('semantic-precision', { bands: SECTION_BANDS.master });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

const START = { index: 0, phase: 'word', wrong: [], placed: null, why: null, points: 0, correct: 0, misses: 0 };

function Round({ progress, onExit }) {
  const config = semanticConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  const [rounds] = useState(() => makeSemanticLevel(seeded(freshSeed()), config));
  const [g, setG] = useState(START);
  const [held, setHeld] = useState(null);
  const [started, setStarted] = useState(false);

  const max = semanticMax(config);
  const pass = Math.ceil(max * 0.6);
  const over = g.index >= rounds.length;
  const round = over ? null : rounds[g.index];
  const stars = over ? starsForFixed(g.points, pass, max) : 0;
  useRecordStars(progress, over, stars, { correct: g.correct, wrong: g.misses, hints: 0, score: g.points });

  const place = (word) => {
    if (!round || g.phase !== 'word' || g.wrong.includes(word)) return;
    setHeld(null);
    if (checkSemanticWord(round, word)) {
      sfx.right();
      setG({ ...g, placed: word, points: g.points + (g.wrong.length ? 1 : 2), correct: g.correct + (g.wrong.length ? 0 : 1), phase: round.why ? 'why' : 'done' });
      return;
    }
    sfx.wrong();
    const wrong = [...g.wrong, word];
    if (wrong.length >= 2) setG({ ...g, wrong, placed: round.item.best, misses: g.misses + 1, phase: round.why ? 'why' : 'done' });
    else setG({ ...g, wrong, misses: g.misses + 1 });
  };

  const answerWhy = (phrase) => {
    if (g.phase !== 'why') return;
    const ok = checkSemanticWhy(round, phrase);
    if (ok) sfx.right(); else sfx.wrong();
    setG({ ...g, why: phrase, points: g.points + (ok ? 1 : 0), misses: g.misses + (ok ? 0 : 1), phase: 'done' });
  };

  const next = () => { setHeld(null); setG({ ...g, index: g.index + 1, phase: 'word', wrong: [], placed: null, why: null }); };

  const item = round?.item;
  const gotWord = g.placed && g.wrong.length < 2;
  const status = !round
    ? ''
    : g.phase === 'word'
      ? g.wrong.length
        ? `"${g.wrong[g.wrong.length - 1]}" is not the most precise fit. One more try.`
        : held
          ? `Holding "${held}" — tap the highlighted word to place it.`
          : 'Drag a word from the shelf onto the highlighted word (or tap the word, then tap the gap).'
      : g.phase === 'why'
        ? gotWord ? 'Right word. Now: which words in the sentence make it the precise choice?' : `The precise word is "${item.best}". Which words in the sentence point to it?`
        : `"${item.best}" fits because of: “${item.clue}”.`;
  const whyOk = !round?.why || (g.why !== null && checkSemanticWhy(round, g.why));
  const tone = g.phase === 'word' ? (g.wrong.length ? 'bad' : 'idle') : g.phase === 'why' ? (gotWord ? 'good' : 'bad') : gotWord && whyOk ? 'good' : 'bad';

  return (
    <GameShell
      title="Semantic Precision"
      blurb="Choose the word that says exactly what the sentence means."
      tone="bg-gradient-to-br from-indigo-700 to-slate-900"
      variant="premium"
      score={`${g.points}/${max}`}
      scoreLabel="Points"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={
        !started
          ? {
              gameId: progress.gameId,
              level: progress.level,
              objective: `Each sentence uses a vague word. Drag the most precise replacement from the shelf onto it — the near-synonyms differ in degree, register or exact meaning. 2 points on the first try, 1 on the second.${config.why ? ' Then pick the words in the sentence that decide it (+1).' : ''} ${rounds.length} sentences; ${pass} of ${max} points clears the level.`,
              stars: starsOn(progress.gameId, progress.level),
              onStart: () => setStarted(true)
            }
          : null
      }
      result={
        over
          ? {
              passed: g.points >= pass,
              stars,
              headline: g.points >= pass ? `Level ${progress.level} cleared` : 'Not quite precise enough',
              detail: `${g.points} of ${max} points · ${g.correct} of ${rounds.length} words right first time`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={<p className="text-center text-sm text-slate-500">Sentence {Math.min(g.index + 1, rounds.length)} of {rounds.length}</p>}
    >
      {started && round && (
        <div className="mx-auto grid w-full max-w-3xl gap-3">
          <Panel label="Sentence">
            <Eyebrow>Make it precise</Eyebrow>
            <p className="text-lg leading-relaxed text-[#1b2456] sm:text-xl">
              {item.before}
              <span
                {...dropProps((w) => place(w), () => held && place(held))}
                role="button"
                tabIndex={g.phase === 'word' ? 0 : -1}
                onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && held) { e.preventDefault(); place(held); } }}
                aria-label={g.placed ? `Placed: ${g.placed}` : `Vague word: ${item.vague}. Drop the precise word here.`}
                className={`mx-0.5 inline-flex min-h-10 items-center rounded-lg px-2 align-baseline font-bold transition ${
                  g.placed
                    ? gotWord ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                    : held
                      ? 'animate-pulse border-2 border-dashed border-indigo-400 bg-indigo-100 text-indigo-700'
                      : 'border-2 border-dashed border-amber-300 bg-amber-50 text-amber-800 underline decoration-amber-400 decoration-wavy underline-offset-4'
                }`}
              >
                {g.placed ? g.placed : item.vague}
              </span>
              {item.after}
            </p>
            {g.phase === 'done' && (
              <p className="mt-2 text-sm text-slate-500">
                Was: <span className="line-through">{item.vague}</span>
              </p>
            )}
          </Panel>

          {g.phase === 'word' && (
            <Panel label="Word shelf">
              <Eyebrow>Word shelf</Eyebrow>
              <div className="flex flex-wrap gap-2">
                {round.shelf.map((w) => (
                  <Chip
                    key={w}
                    label={w}
                    dragId={w}
                    held={held === w}
                    state={g.wrong.includes(w) ? 'wrong' : null}
                    disabled={g.wrong.includes(w)}
                    onPick={(id) => setHeld(held === id ? null : id)}
                  />
                ))}
              </div>
            </Panel>
          )}

          {g.phase !== 'word' && round.why && (
            <Panel label="Why">
              <Eyebrow>Why is “{item.best}” the precise choice?</Eyebrow>
              <div className="grid gap-2">
                {round.why.map((p) => {
                  const right = p === item.clue;
                  const chosen = g.why === p;
                  const cls = g.phase === 'done'
                    ? right ? 'bg-emerald-50 ring-emerald-400 text-emerald-800' : chosen ? 'bg-rose-50 ring-rose-300 text-rose-700' : 'bg-white ring-[#e4e1f5] text-slate-400'
                    : 'bg-white ring-[#d9d4f3] text-[#1b2456] hover:ring-indigo-400';
                  return (
                    <button key={p} type="button" disabled={g.phase !== 'why'} onClick={() => answerWhy(p)} className={`fp-press min-h-11 rounded-xl px-3 py-2 text-left text-sm font-semibold ring-2 ring-inset sm:text-base ${cls}`}>
                      “{p}”
                    </button>
                  );
                })}
              </div>
            </Panel>
          )}

          <Status tone={tone}>{status}</Status>
          {g.phase === 'done' && (
            <div className="flex justify-center">
              <button type="button" className={btnPrimary} onClick={next} autoFocus>
                {g.index + 1 >= rounds.length ? 'See result' : 'Next sentence'}
              </button>
            </div>
          )}
        </div>
      )}
    </GameShell>
  );
}
