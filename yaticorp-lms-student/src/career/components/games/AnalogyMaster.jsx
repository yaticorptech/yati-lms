import { useEffect, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { analogyConfig, makeAnalogyLevel, scoreAnalogy, RELATIONS, relationLabel } from '../../data/bands/dAnalogy';

const freshSeed = () => Math.floor(Math.random() * 4294967296);
const TILE_TONES = ['bg-violet-50 ring-violet-200', 'bg-sky-50 ring-sky-200', 'bg-amber-50 ring-amber-200', 'bg-emerald-50 ring-emerald-200'];

/** 🔗 Vocabulary: A is to B as C is to …? Pick the word, then name the link. */
export default function AnalogyMaster({ onExit }) {
  const progress = useGameProgress('analogy-master', { bands: SECTION_BANDS.smart });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

const START = { index: 0, phase: 'word', word: null, rel: null, points: 0, won: 0, words: 0, rels: 0 };

function Round({ progress, onExit }) {
  const [config] = useState(() => analogyConfig(progress.ageBand, progress.difficulty, progress.levelNo));
  const [rounds] = useState(() => makeAnalogyLevel(seeded(freshSeed()), config));
  const [game, setGame] = useState(START);
  const [started, setStarted] = useState(false);

  const over = game.index >= rounds.length;
  const round = over ? null : rounds[game.index];
  const maxPoints = rounds.length * 3;
  const passed = game.won >= config.pass;
  const stars = over && passed ? Math.max(1, starsForFixed(game.points, Math.ceil(maxPoints * 0.6), maxPoints)) : 0;
  useRecordStars(progress, over, stars, { correct: game.won, wrong: rounds.length - game.won, hints: 0, score: game.points });

  const pickWord = (w) => {
    if (!started || over || game.phase !== 'word') return;
    if (w !== round.item.d) sfx.wrong();
    setGame({ ...game, word: w, phase: 'rel' });
  };

  const finish = (rel) => {
    const s = scoreAnalogy(round, game.word, rel, config.relationRequired);
    if (rel && !s.relOk) sfx.wrong();
    setGame({
      ...game, rel, phase: 'done',
      points: game.points + s.points, won: game.won + (s.won ? 1 : 0), words: game.words + (s.wordOk ? 1 : 0), rels: game.rels + (s.relOk ? 1 : 0)
    });
  };
  const pickRel = (rel) => { if (started && !over && game.phase === 'rel') finish(rel); };
  const next = () => setGame((g) => ({ ...g, index: g.index + 1, phase: 'word', word: null, rel: null }));

  useEffect(() => {
    if (!started || over) return undefined;
    const onKey = (e) => {
      const n = Number(e.key);
      if (game.phase === 'word' && n >= 1 && n <= round.tiles.length) pickWord(round.tiles[n - 1]);
      else if (game.phase === 'rel' && n >= 1 && n <= round.relations.length) pickRel(round.relations[n - 1]);
      else if (game.phase === 'done' && e.key === 'Enter') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const objective = config.relationRequired
    ? `Complete each analogy A : B :: C : ? — pick the word that relates to C the way B relates to A, then tag the relation (synonym, part → whole, cause → effect …). A round counts only when both are right. Win ${config.pass} of ${rounds.length}.`
    : `Complete each analogy A : B :: C : ? — pick the word that relates to C the way B relates to A. Then name the link for a bonus point. Get ${config.pass} of ${rounds.length} words right.`;

  const wordOk = round && game.word === round.item.d;
  const relOk = round && game.rel === round.item.rel;
  const relHint = round ? RELATIONS.find((r) => r.key === round.item.rel)?.hint : '';

  return (
    <GameShell
      title="Analogy Master"
      blurb="Spot the link, then carry it across."
      tone="bg-gradient-to-br from-violet-500 to-fuchsia-700"
      score={`${game.won}/${rounds.length}`}
      scoreLabel="Won"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) } : null}
      result={over ? {
        passed, stars,
        headline: passed ? `Level ${progress.level} cleared!` : 'Close — try again',
        detail: `${game.words} of ${rounds.length} words right · ${game.rels} relations named · ${game.points} of ${maxPoints} points`,
        atEnd: progress.atEnd, onNext: progress.advance, onRetry: progress.retry
      } : null}
      footer={<p className="text-center text-sm text-ink-500">Analogy {Math.min(game.index + 1, rounds.length)} of {rounds.length} · keys 1–{round?.tiles.length || 4} pick · Enter next</p>}
    >
      {started && round && (
        <div className="mx-auto w-full max-w-lg">
          {/* The analogy, built word by word. */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 p-3 ring-1 ring-violet-200 sm:gap-2 sm:p-4" aria-label={`${round.item.a} is to ${round.item.b} as ${round.item.c} is to what?`}>
            {[round.item.a, ':', round.item.b, '::', round.item.c, ':'].map((w, i) => (
              <span key={`${game.index}-${i}`} className={`gs-rise ${w.includes(':') ? 'px-0.5 text-lg font-black text-violet-400' : 'rounded-lg bg-white px-2.5 py-1.5 text-base font-black text-violet-900 shadow-sm sm:text-lg'}`} style={{ animationDelay: `${i * 90}ms` }}>
                {w}
              </span>
            ))}
            <span className={`gs-rise min-w-20 rounded-lg px-2.5 py-1.5 text-center text-base font-black sm:text-lg ${game.word ? (wordOk ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white') : 'border-2 border-dashed border-violet-400 text-violet-400'}`} style={{ animationDelay: '540ms' }}>
              {game.word || '?'}
            </span>
          </div>

          {game.phase === 'word' && (
            <>
              <p className="mt-4 mb-2 text-center text-sm font-bold text-ink-700">Which word completes it?</p>
              <div className="grid grid-cols-2 gap-2.5">
                {round.tiles.map((w, i) => (
                  <button key={w} type="button" onClick={() => pickWord(w)} aria-label={`${i + 1}: ${w}`}
                    className={`fp-press min-h-14 rounded-2xl px-3 text-base font-black text-ink-900 ring-2 ring-inset ${TILE_TONES[i % TILE_TONES.length]}`}>
                    {w}
                  </button>
                ))}
              </div>
            </>
          )}

          {game.phase !== 'word' && (
            <div className="mt-4">
              <p className={`text-center text-sm font-black ${wordOk ? 'text-emerald-600' : 'text-rose-600'}`} role="status" aria-live="polite">
                {wordOk ? 'Right word!' : `Not quite — it is “${round.item.d}”.`}
              </p>
              <p className="mt-1 mb-2 text-center text-sm font-bold text-ink-700">
                {game.phase === 'rel' ? (config.relationRequired ? 'Now tag the relation (needed to win the round):' : 'Bonus: what links A to B?') : null}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {round.relations.map((key, i) => {
                  const r = RELATIONS.find((x) => x.key === key);
                  const state = game.phase === 'done' ? (key === round.item.rel ? 'right' : key === game.rel ? 'wrong' : null) : null;
                  return (
                    <button key={key} type="button" onClick={() => pickRel(key)} disabled={game.phase !== 'rel'} aria-label={`${i + 1}: ${r.label}, ${r.hint}`}
                      className={`fp-press min-h-12 rounded-xl px-2 py-1.5 text-left ring-2 ring-inset ${
                        state === 'right' ? 'gs-right bg-emerald-100 ring-emerald-500' : state === 'wrong' ? 'gs-wrong bg-rose-100 ring-rose-400' : 'bg-white ring-slate-200'
                      }`}>
                      <span className="block text-sm font-black text-ink-900">{r.label}</span>
                      <span className="block text-xs font-semibold text-ink-500">{r.hint}</span>
                    </button>
                  );
                })}
              </div>
              {game.phase === 'rel' && !config.relationRequired && (
                <button type="button" onClick={() => finish(null)} className="mt-2 w-full text-center text-xs font-bold text-ink-500 underline">Skip the bonus</button>
              )}
              {game.phase === 'done' && (
                <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-ink-700 ring-1 ring-slate-200">
                  <p className="font-bold">
                    {relationLabel(round.item.rel)} ({relHint}): <b>{round.item.a} → {round.item.b}</b>, so <b>{round.item.c} → {round.item.d}</b>.
                  </p>
                  <p className={`mt-1 font-black ${relOk ? 'text-emerald-600' : 'text-ink-500'}`}>
                    {relOk ? 'Relation named — bonus point!' : game.rel ? `You tagged “${relationLabel(game.rel)}”.` : 'Bonus skipped.'}
                  </p>
                  <button type="button" onClick={next} autoFocus className="fp-press mt-3 w-full rounded-xl bg-violet-600 py-2.5 text-sm font-black text-white">
                    {game.index + 1 < rounds.length ? 'Next analogy →' : 'See result'}
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
