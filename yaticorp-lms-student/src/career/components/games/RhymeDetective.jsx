import { useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { checkRhyme, makeRhymeLevel, rhymeConfig } from '../../data/bands/youngB';

const freshSeed = () => Math.floor(Math.random() * 4294967296);
const TONES = ['bg-amber-50 ring-amber-200', 'bg-sky-50 ring-sky-200', 'bg-emerald-50 ring-emerald-200', 'bg-rose-50 ring-rose-200', 'bg-violet-50 ring-violet-200', 'bg-lime-50 ring-lime-200'];

/** Say a word aloud where the browser can, so a child who cannot read it yet can still hear the rhyme. */
const say = (text) => {
  try {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new window.SpeechSynthesisUtterance(text);
    u.rate = 0.85;
    window.speechSynthesis.speak(u);
  } catch { /* no voice: the word is written on the card */ }
};

/** 🔍 Rhyme Detective: tap every card that rhymes with the target word (or, for older players, the one that does not). */
export default function RhymeDetective({ onExit }) {
  const progress = useGameProgress('rhyme-detective', { bands: SECTION_BANDS.young });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const config = rhymeConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  const young = config.band === 'foundation';
  const [rounds] = useState(() => makeRhymeLevel(seeded(freshSeed()), config));
  const [started, setStarted] = useState(false);
  const [game, setGame] = useState({ index: 0, picked: [], checked: null, correct: 0, wrong: 0 });

  const over = game.index >= rounds.length;
  const round = over ? null : rounds[game.index];
  const stars = over ? starsForFixed(game.correct, config.pass, rounds.length) : 0;
  useRecordStars(progress, over, stars, { correct: game.correct, wrong: game.wrong, hints: 0, score: game.correct });

  const toggle = (word) => {
    if (game.checked) return;
    say(word);
    if (round.mode === 'odd') { setGame({ ...game, picked: game.picked[0] === word ? [] : [word] }); return; }
    setGame({ ...game, picked: game.picked.includes(word) ? game.picked.filter((w) => w !== word) : [...game.picked, word] });
  };

  const check = () => {
    if (game.checked || !game.picked.length) return;
    const ok = checkRhyme(round, game.picked);
    if (ok) sfx.right?.(); else sfx.wrong();
    setGame({ ...game, checked: ok ? 'right' : 'wrong', correct: game.correct + (ok ? 1 : 0), wrong: game.wrong + (ok ? 0 : 1) });
  };

  const next = () => setGame((g) => ({ ...g, index: g.index + 1, picked: [], checked: null }));

  const objective = young
    ? `Look at the big picture word. Tap ALL the cards that rhyme with it (they end with the same sound, like cat and hat), then press Check. Get ${config.pass} of ${rounds.length} right.`
    : `Tap every card that rhymes with the target word, then Check — some rhymes are spelled differently (bee, key, tea). Sometimes there is no target: three cards rhyme and you must find the odd one out. Get ${config.pass} of ${rounds.length} right.`;

  const answerText = round ? round.answer.join(', ') : '';
  const message = game.checked === 'right'
    ? (round.mode === 'odd' ? `Yes! ${answerText} does not rhyme. 🎉` : `Great rhyming! 🎉`)
    : game.checked === 'wrong'
      ? (round.mode === 'odd' ? `Good try! The odd one out was ${answerText}.` : `Good try! The rhymes were: ${answerText}.`)
      : round?.mode === 'odd'
        ? 'Three of these rhyme. Tap the one that does NOT rhyme.'
        : young ? 'Tap the pictures that rhyme. Then press Check.' : 'Tap every word that rhymes, then Check.';

  return (
    <GameShell
      title="Rhyme Detective"
      blurb={young ? 'Find the words that rhyme!' : `Solve ${config.pass} of ${rounds.length} rhyme cases.`}
      tone="bg-gradient-to-br from-fuchsia-500 to-indigo-600"
      score={`${game.correct}/${rounds.length}`}
      scoreLabel="Solved"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) } : null}
      result={over ? {
        passed: stars > 0, stars,
        headline: stars > 0 ? `Level ${progress.level} cleared!` : 'Nearly there',
        detail: `${game.correct} of ${rounds.length} rhyme cases solved`,
        atEnd: progress.atEnd, onNext: progress.advance, onRetry: progress.retry
      } : null}
      footer={<p className="text-center text-sm text-ink-500">Case {Math.min(game.index + 1, rounds.length)} of {rounds.length} · tap a card to hear it</p>}
    >
      {started && round && (
        <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 p-4 shadow-[0_14px_30px_-14px_rgba(124,58,237,0.6)] sm:p-5">
          {/* A detective's case board (2026-11-18 redesign): faint clues behind, the case on top. */}
          <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            {[['🔍', 6, 6, -10], ['🎵', 86, 6, 12], ['❓', 4, 74, 0], ['👣', 88, 74, -8]].map(([c, x, y, r]) => <span key={c} className="absolute text-3xl opacity-25" style={{ left: `${x}%`, top: `${y}%`, transform: `rotate(${r}deg)` }}>{c}</span>)}
          </span>
          {round.mode === 'all' ? (
            <button type="button" onClick={() => say(round.target.word)} className="fp-press relative mx-auto mb-3 flex max-w-full items-center gap-3 rounded-3xl bg-white px-4 py-3 shadow-[0_6px_0_rgba(30,27,75,0.25)] sm:px-6" aria-label={`Target word: ${round.target.word}. Tap to hear it.`}>
              <span className="text-6xl leading-none" aria-hidden="true">{round.target.emoji}</span>
              <span className="text-3xl font-black text-ink-900">{round.target.word}</span>
              <span className="text-xl" aria-hidden="true">🔊</span>
            </button>
          ) : (
            <p className="relative mx-auto mb-3 w-fit rounded-full bg-white px-4 py-1.5 text-base font-black text-indigo-800 shadow-[0_4px_0_rgba(30,27,75,0.25)]">🕵️ Odd one out</p>
          )}

          <p className={`relative mb-3 min-h-6 rounded-2xl px-3 py-1.5 text-center text-base font-black ${game.checked === 'right' ? 'bg-emerald-50 text-emerald-700' : game.checked === 'wrong' ? 'bg-rose-50 text-rose-700' : 'text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.25)]'}`} role="status" aria-live="polite">{message}</p>

          <div className={`relative grid gap-3 ${round.cards.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {round.cards.map((c, i) => {
              const picked = game.picked.includes(c.word);
              const isAnswer = round.answer.includes(c.word);
              const state = game.checked
                ? isAnswer ? 'gs-right bg-emerald-50 ring-4 ring-emerald-400 shadow-[0_5px_0_#047857]' : picked ? 'bg-rose-50 ring-4 ring-rose-400 shadow-[0_5px_0_#be123c]' : 'bg-white/80 opacity-60 ring-0'
                : picked ? '-translate-y-1 bg-amber-50 ring-4 ring-amber-400 shadow-[0_6px_0_#d97706]' : 'bg-white ring-0 shadow-[0_5px_0_rgba(30,27,75,0.25)] hover:-translate-y-0.5';
              return (
                <button
                  key={c.word}
                  type="button"
                  onClick={() => toggle(c.word)}
                  aria-pressed={picked}
                  aria-label={`${c.word}${picked ? ', picked' : ''}`}
                  className={`fp-press relative flex min-h-[6rem] flex-col items-center justify-center gap-1 rounded-2xl p-2 ring-inset transition-all focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${state}`}
                >
                  <span className={`grid size-16 place-items-center rounded-full ${['bg-amber-100', 'bg-sky-100', 'bg-emerald-100', 'bg-pink-100', 'bg-violet-100', 'bg-orange-100'][i % 6]}`}><span className="text-5xl leading-none drop-shadow-sm" aria-hidden="true">{c.emoji}</span></span>
                  <span className="text-lg font-black text-ink-900">{c.word}</span>
                  {picked && !game.checked && <span className="absolute -top-2 -right-2 grid size-7 place-items-center rounded-full bg-amber-400 text-sm font-black text-white ring-2 ring-white" aria-hidden="true">✓</span>}
                  {game.checked && isAnswer && <span className="absolute -top-2 -right-2 grid size-7 place-items-center rounded-full bg-emerald-500 text-sm font-black text-white ring-2 ring-white" aria-hidden="true">✓</span>}
                </button>
              );
            })}
          </div>

          <div className="relative mt-4 flex justify-center">
            {game.checked ? (
              <button type="button" onClick={next} autoFocus className="fp-press min-h-14 rounded-2xl bg-white px-8 text-lg font-black text-indigo-700 shadow-[0_5px_0_rgba(30,27,75,0.3)]">Next ➜</button>
            ) : (
              <button type="button" onClick={check} disabled={!game.picked.length} className="fp-press min-h-14 rounded-2xl bg-gradient-to-b from-amber-300 to-orange-500 px-8 text-lg font-black text-white shadow-[0_5px_0_#c2410c] disabled:from-white/40 disabled:to-white/30 disabled:text-white/80 disabled:shadow-none">Check ✓</button>
            )}
          </div>
        </div>
      )}
    </GameShell>
  );
}
