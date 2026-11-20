import { useEffect, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { contextConfig, makeContextLevel, scoreClues, scoreMeaning } from '../../data/bands/dContext';

const freshSeed = () => Math.floor(Math.random() * 4294967296);

/** 🔍 Vocabulary: find the clue words in the passage, then decide what the strange word means. */
export default function ContextDetective({ onExit }) {
  const progress = useGameProgress('context-detective', { bands: SECTION_BANDS.smart });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

const START = { index: 0, phase: 'clues', tapped: [], choice: null, cluePts: 0, points: 0, clueRounds: 0, meanings: 0 };

function Round({ progress, onExit }) {
  const [config] = useState(() => contextConfig(progress.ageBand, progress.difficulty, progress.levelNo));
  const [rounds] = useState(() => makeContextLevel(seeded(freshSeed()), config));
  const [game, setGame] = useState(START);
  const [started, setStarted] = useState(false);

  const over = game.index >= rounds.length;
  const round = over ? null : rounds[game.index];
  const passed = game.points >= config.pass;
  const stars = over ? starsForFixed(game.points, config.pass, config.max) : 0;
  useRecordStars(progress, over, stars, { correct: game.meanings, wrong: rounds.length - game.meanings, hints: 0, score: game.points });

  const tap = (i) => {
    if (!started || over || game.phase !== 'clues') return;
    const t = round.passage.tokens[i];
    if (t.target) return;
    const has = game.tapped.includes(i);
    if (!has && game.tapped.length >= config.maxTaps) return;
    setGame({ ...game, tapped: has ? game.tapped.filter((x) => x !== i) : [...game.tapped, i] });
  };

  const lockClues = () => {
    if (game.phase !== 'clues' || !game.tapped.length) return;
    const s = scoreClues(round.passage, game.tapped);
    if (!s.points) sfx.wrong();
    setGame({ ...game, phase: 'meaning', cluePts: s.points, points: game.points + s.points, clueRounds: game.clueRounds + (s.points === 2 ? 1 : 0) });
  };

  const choose = (opt) => {
    if (game.phase !== 'meaning') return;
    const p = scoreMeaning(round.passage, opt);
    if (!p) sfx.wrong();
    setGame({ ...game, phase: 'done', choice: opt, points: game.points + p, meanings: game.meanings + (p ? 1 : 0) });
  };

  const next = () => setGame((g) => ({ ...g, index: g.index + 1, phase: 'clues', tapped: [], choice: null, cluePts: 0 }));

  useEffect(() => {
    if (!started || over) return undefined;
    const onKey = (e) => {
      const n = Number(e.key);
      if (game.phase === 'meaning' && n >= 1 && n <= round.options.length) choose(round.options[n - 1]);
      else if (game.phase === 'clues' && e.key === 'Enter') lockClues();
      else if (game.phase === 'done' && e.key === 'Enter') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const objective = `Each passage hides an unusual word. First tap the clue words that give its meaning away (up to ${config.maxTaps}), then pick what the word means. Clues are worth 2 points, the meaning 2 more. Score ${config.pass} of ${config.max} points.`;
  const word = round?.passage.word;
  const reveal = game.phase !== 'clues';

  return (
    <GameShell
      title="Context Detective"
      blurb="Let the sentence tell you what the word means."
      tone="bg-gradient-to-br from-teal-500 to-sky-700"
      score={`${game.points}/${config.max}`}
      scoreLabel="Points"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) } : null}
      result={over ? {
        passed, stars,
        headline: passed ? `Case closed — level ${progress.level} cleared!` : 'The trail went cold',
        detail: `${game.meanings} of ${rounds.length} meanings right · clean clue hunts on ${game.clueRounds} · ${game.points} of ${config.max} points`,
        atEnd: progress.atEnd, onNext: progress.advance, onRetry: progress.retry
      } : null}
      footer={<p className="text-center text-sm text-ink-500">Passage {Math.min(game.index + 1, rounds.length)} of {rounds.length} · Enter locks clues · keys 1–4 pick a meaning</p>}
    >
      {started && round && (
        <div className="mx-auto w-full max-w-lg">
          <div className="mb-2 flex items-center justify-between text-xs font-black tracking-wide text-teal-700 uppercase">
            <span>Step {game.phase === 'clues' ? '1 · Find the clues' : '2 · Pick the meaning'}</span>
            {game.phase === 'clues' && <span>{game.tapped.length}/{config.maxTaps} marked</span>}
          </div>
          <p className="rounded-2xl bg-white p-4 text-[17px] leading-[2.1] text-ink-900 shadow-sm ring-1 ring-teal-100 sm:text-lg" aria-label="Passage. Tap words that are clues.">
            {round.passage.tokens.map((t, i) => {
              const tapped = game.tapped.includes(i);
              const cls = t.target
                ? 'rounded-md bg-amber-300 px-1 font-black text-amber-950'
                : reveal
                  ? tapped && t.clue ? 'rounded-md bg-emerald-200 px-0.5 font-bold text-emerald-900'
                    : tapped ? 'rounded-md bg-rose-200 px-0.5 text-rose-900 line-through'
                      : t.clue ? 'rounded-md underline decoration-emerald-500 decoration-2 underline-offset-4' : ''
                  : tapped ? 'rounded-md bg-teal-600 px-0.5 font-bold text-white' : 'rounded-md hover:bg-teal-50';
              return (
                <span key={i}>
                  {t.target || reveal ? (
                    <span className={cls}>{t.text}</span>
                  ) : (
                    <button type="button" onClick={() => tap(i)} aria-pressed={tapped} className={`cursor-pointer ${cls}`}>{t.text}</button>
                  )}{' '}
                </span>
              );
            })}
          </p>

          {game.phase === 'clues' && (
            <>
              <p className="mt-3 text-center text-sm font-bold text-ink-700">Which words hint at what <b className="text-amber-700">{word}</b> means? Tap them.</p>
              <button type="button" onClick={lockClues} disabled={!game.tapped.length}
                className="fp-press mt-3 w-full rounded-xl bg-teal-600 py-3 text-sm font-black text-white disabled:opacity-40">
                Lock in my clues
              </button>
            </>
          )}

          {reveal && (
            <p className={`mt-3 text-center text-sm font-black ${game.cluePts === 2 ? 'text-emerald-600' : game.cluePts ? 'text-amber-600' : 'text-rose-600'}`} role="status" aria-live="polite">
              {game.cluePts === 2 ? 'Sharp eyes — clean clues! +2' : game.cluePts ? 'A real clue, plus one that is not. +1' : 'Those were not the clues — the underlined words were.'}
            </p>
          )}

          {game.phase !== 'clues' && (
            <div className="mt-3 grid gap-2">
              <p className="text-center text-sm font-bold text-ink-700">What does <b className="text-amber-700">{word}</b> mean here?</p>
              {round.options.map((opt, i) => {
                const state = game.phase === 'done' ? (opt === round.passage.meaning ? 'right' : opt === game.choice ? 'wrong' : null) : null;
                return (
                  <button key={opt} type="button" onClick={() => choose(opt)} disabled={game.phase !== 'meaning'} aria-label={`${i + 1}: ${opt}`}
                    className={`fp-press min-h-12 rounded-xl px-4 py-2 text-left text-base font-bold ring-2 ring-inset ${
                      state === 'right' ? 'gs-right bg-emerald-100 text-emerald-900 ring-emerald-500' : state === 'wrong' ? 'gs-wrong bg-rose-100 text-rose-900 ring-rose-400' : 'bg-white text-ink-900 ring-slate-200'
                    }`}>
                    <span className="mr-2 text-ink-500">{i + 1}.</span>{opt}
                  </button>
                );
              })}
            </div>
          )}

          {game.phase === 'done' && (
            <button type="button" onClick={next} autoFocus className="fp-press mt-3 w-full rounded-xl bg-sky-700 py-3 text-sm font-black text-white">
              {game.index + 1 < rounds.length ? 'Next passage →' : 'See result'}
            </button>
          )}
        </div>
      )}
    </GameShell>
  );
}
