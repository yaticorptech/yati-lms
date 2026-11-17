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
        <div className="mx-auto w-full max-w-md">
          {round.mode === 'all' ? (
            <button type="button" onClick={() => say(round.target.word)} className="fp-press mx-auto mb-3 flex max-w-full items-center gap-3 rounded-3xl bg-gradient-to-b from-fuchsia-50 to-indigo-50 px-4 py-3 sm:px-6 ring-2 ring-fuchsia-200 ring-inset" aria-label={`Target word: ${round.target.word}. Tap to hear it.`}>
              <span className="text-6xl leading-none" aria-hidden="true">{round.target.emoji}</span>
              <span className="text-3xl font-black text-ink-900">{round.target.word}</span>
              <span className="text-xl" aria-hidden="true">🔊</span>
            </button>
          ) : (
            <p className="mx-auto mb-3 w-fit rounded-2xl bg-indigo-50 px-4 py-2 text-lg font-black text-indigo-800 ring-2 ring-indigo-200 ring-inset">🕵️ Odd one out</p>
          )}

          <p className={`mb-3 min-h-6 text-center text-base font-black ${game.checked === 'right' ? 'text-emerald-600' : game.checked === 'wrong' ? 'text-rose-600' : 'text-ink-900'}`} role="status" aria-live="polite">{message}</p>

          <div className={`grid gap-2.5 ${round.cards.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {round.cards.map((c, i) => {
              const picked = game.picked.includes(c.word);
              const isAnswer = round.answer.includes(c.word);
              const state = game.checked
                ? isAnswer ? 'gs-right bg-emerald-100 ring-emerald-500' : picked ? 'bg-rose-100 opacity-70 ring-rose-400' : 'opacity-60 ' + TONES[i % TONES.length]
                : picked ? 'bg-indigo-100 ring-indigo-500 scale-[1.03]' : TONES[i % TONES.length];
              return (
                <button
                  key={c.word}
                  type="button"
                  onClick={() => toggle(c.word)}
                  aria-pressed={picked}
                  aria-label={`${c.word}${picked ? ', picked' : ''}`}
                  className={`fp-press relative flex min-h-[6rem] flex-col items-center justify-center gap-1 rounded-2xl p-2 ring-2 ring-inset transition-all focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${state}`}
                >
                  <span className="text-5xl leading-none" aria-hidden="true">{c.emoji}</span>
                  <span className="text-base font-black text-ink-800">{c.word}</span>
                  {picked && !game.checked && <span className="absolute top-1.5 right-2 text-lg" aria-hidden="true">✔️</span>}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex justify-center">
            {game.checked ? (
              <button type="button" onClick={next} autoFocus className="fp-press min-h-14 rounded-2xl bg-indigo-600 px-8 text-lg font-black text-white shadow">Next ➜</button>
            ) : (
              <button type="button" onClick={check} disabled={!game.picked.length} className="fp-press min-h-14 rounded-2xl bg-emerald-600 px-8 text-lg font-black text-white shadow disabled:opacity-40">Check ✓</button>
            )}
          </div>
        </div>
      )}
    </GameShell>
  );
}
