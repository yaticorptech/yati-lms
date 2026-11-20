import { useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useTimedRound from './useTimedRound';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { seeded } from '../../data/seeded';
import { makeLevel, oddConfig } from '../../data/oddPictures';

/**
 * 🧩 Odd One Out, in pictures (2026-11-18, the user: "too basic — use four images as options, keep changing the
 * pattern, students should learn from every play and want to play again"). Four picture cards; three share a hidden
 * rule, one breaks it. The rule changes every round (data/oddPictures.js), each round has its own coloured scene, and
 * after the tap the rule and a short fact are shown — then the next round comes on its own.
 */
export default function OddOneOut({ onExit }) {
  const progress = useGameProgress('odd-one-out');
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

const RIGHT_MS = 2600;
const WRONG_MS = 4400;
const freshSeed = () => Math.floor(Math.random() * 4294967296);

/** Each kind of round has its own scene: a background, a few faint pictures, and a title that hints where to look. */
const THEMES = {
  kind: { bg: 'from-emerald-400 via-teal-400 to-cyan-500', deco: ['🌿', '🍃', '🌱'], title: 'Who doesn’t fit in? 🕵️' },
  colour: { bg: 'from-pink-400 via-fuchsia-400 to-amber-300', deco: ['🎨', '🖌️', '🌈'], title: 'Look closely… 🎨' },
  count: { bg: 'from-indigo-500 via-violet-500 to-purple-500', deco: ['✨', '⭐', '🌟'], title: 'Count carefully! 🔢' },
  mirror: { bg: 'from-sky-400 via-indigo-400 to-violet-500', deco: ['🪞', '✨', '💫'], title: 'Mirror, mirror… 🪞' },
  shapes: { bg: 'from-blue-500 via-sky-500 to-cyan-400', deco: ['📐', '📏', '✏️'], title: 'Shape spy 📐' },
  sky: { bg: 'from-sky-300 via-sky-400 to-blue-500', deco: ['☁️', '☁️', '🌤️'], title: 'Up in the sky? ☁️' },
  garden: { bg: 'from-lime-400 via-green-400 to-emerald-500', deco: ['🌼', '🌱', '🍀'], title: 'Alive or not? 🌱' },
  letters: { bg: 'from-amber-300 via-orange-400 to-rose-400', deco: ['🔤', '💬', '🅰️'], title: 'Say them out loud 🔤' },
  numbers: { bg: 'from-slate-700 via-emerald-800 to-slate-800', deco: ['➕', '🧮', '✖️'], title: 'Number twins ➕' },
  words: { bg: 'from-violet-400 via-purple-400 to-indigo-500', deco: ['📖', '✏️', '🔤'], title: 'Read and think 📖' }
};
// Faint pictures scattered over the scene, fixed spots so they do not jump.
const DECO_SPOTS = [[6, 8, -12], [84, 6, 10], [4, 70, 8], [88, 74, -8], [46, 92, 0], [70, 40, 14], [18, 40, -6]];

/** One card's face, by type: a picture (maybe mirrored or turned), a group to count, a drawn shape, or a sum. */
function Face({ face, young }) {
  if (face.type === 'pic') {
    return (
      <span
        className={`leading-none drop-shadow-[0_4px_3px_rgba(0,0,0,0.25)] select-none ${young ? 'text-6xl sm:text-7xl' : 'text-5xl sm:text-6xl'}`}
        style={{ transform: `${face.flip ? 'scaleX(-1) ' : ''}${face.turn ? `rotate(${face.turn}deg)` : ''}`, display: 'inline-block' }}
        aria-hidden
      >
        {face.e}
      </span>
    );
  }
  if (face.type === 'word') {
    return <span className={`px-2 text-center font-black break-words text-ink-900 capitalize ${face.text.length > 8 ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'}`}>{face.text}</span>;
  }
  if (face.type === 'group') {
    return (
      <span className="flex max-w-[90%] flex-wrap items-center justify-center gap-0.5 text-2xl leading-none select-none sm:text-3xl" aria-hidden>
        {face.items.map((e, i) => <span key={i} className="drop-shadow-sm">{e}</span>)}
      </span>
    );
  }
  if (face.type === 'shape') {
    const r = 40 * face.size;
    const points = face.sides
      ? Array.from({ length: face.sides }, (_, k) => {
        const a = (k * 2 * Math.PI) / face.sides - Math.PI / 2;
        return `${50 + Math.cos(a) * r},${50 + Math.sin(a) * r}`;
      }).join(' ')
      : null;
    return (
      <svg viewBox="0 0 100 100" className="h-[78%] w-[78%] drop-shadow-[0_4px_3px_rgba(0,0,0,0.2)]" aria-hidden>
        <g transform={`rotate(${face.turn} 50 50)`}>
          {points ? <polygon points={points} fill={face.hue} stroke="#1f2937" strokeWidth="3" strokeLinejoin="round" /> : <circle cx="50" cy="50" r={r} fill={face.hue} stroke="#1f2937" strokeWidth="3" />}
        </g>
      </svg>
    );
  }
  return (
    <span className="font-black tracking-tight text-emerald-50 tabular-nums [text-shadow:0_2px_0_rgba(0,0,0,0.25)] text-3xl sm:text-4xl" aria-hidden>
      {face.a} + {face.b}
    </span>
  );
}

const describe = (face) => {
  if (face.type === 'pic') return `${face.name || 'picture'}${face.flip ? ', facing the other way' : ''}${face.turn ? ', upside down' : ''}`;
  if (face.type === 'word') return face.text;
  if (face.type === 'group') return `${face.items.length} pictures`;
  if (face.type === 'shape') return face.sides ? `a shape with ${face.sides} sides` : 'a circle';
  return `${face.a} plus ${face.b}`;
};

function Round({ progress, onExit }) {
  const young = progress.ageBand === 'foundation' || progress.ageBand === 'developing';
  const cfg = oddConfig(progress.levelNo, young);
  const [rounds] = useState(() => makeLevel(seeded(freshSeed()), { rounds: cfg.rounds, young, levelNo: progress.levelNo }));
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState(null);
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [started, setStarted] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const finished = index >= rounds.length;
  const { seconds, over: timeUp } = useTimedRound(cfg.seconds, started, finished);
  const over = started && (finished || timeUp);
  const passed = score >= cfg.pass;
  const stars = over ? starsForFixed(score, cfg.pass, rounds.length) : 0;
  useRecordStars(progress, over, stars, { correct: score, wrong, hints: 0, score, limitMs: cfg.seconds * 1000 });

  const round = rounds[Math.min(index, rounds.length - 1)];
  const theme = THEMES[round.theme] || THEMES.kind;
  const answered = chosen !== null;
  const right = answered && chosen === round.odd;

  const next = () => {
    clearTimeout(timer.current);
    setChosen(null);
    setIndex((i) => i + 1);
  };

  const choose = (i) => {
    if (answered || over) return;
    setChosen(i);
    if (i === round.odd) {
      sfx.right();
      setScore((s) => s + 1);
      timer.current = setTimeout(next, RIGHT_MS);
    } else {
      sfx.wrong();
      setWrong((w) => w + 1);
      timer.current = setTimeout(next, WRONG_MS);
    }
  };

  return (
    <GameShell
      title="Odd One Out"
      blurb="Four pictures — three follow a secret rule. Find the one that does not!"
      tone="bg-gradient-to-br from-cyan-500 to-blue-700"
      score={`${score}/${rounds.length}`}
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      seconds={started ? seconds : undefined}
      intro={
        !started
          ? {
              gameId: progress.gameId,
              level: progress.level,
              objective: `Three pictures follow a secret rule — the same kind, colour, number, shape… One does not! Tap the odd one out. The rule changes every round, so look carefully. Get ${cfg.pass} of ${rounds.length} right.`,
              seconds: cfg.seconds,
              stars: starsOn(progress.gameId, progress.level),
              onStart: () => setStarted(true)
            }
          : null
      }
      result={
        over
          ? {
              passed,
              stars,
              headline: passed ? `Level ${progress.level} cleared!` : 'So close — try again!',
              detail: `${score} of ${rounds.length} right${timeUp && !finished ? ' · time ran out' : ''}`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={<p className="text-center text-sm text-ink-500">Round {Math.min(index + 1, rounds.length)} of {rounds.length} · a new rule every round</p>}
    >
      {started && !over && (
        <div className="mx-auto w-full max-w-md">
          {/* The scene: a coloured stage for this kind of round, faint pictures over it. */}
          <div key={index} className={`oo-stage relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br ${theme.bg} p-3 shadow-[0_12px_28px_-12px_rgba(30,41,59,0.55)] sm:p-4`}>
            {DECO_SPOTS.map(([x, y, rot], k) => (
              <span key={k} aria-hidden className="pointer-events-none absolute text-3xl opacity-20 select-none" style={{ left: `${x}%`, top: `${y}%`, transform: `rotate(${rot}deg)` }}>
                {theme.deco[k % theme.deco.length]}
              </span>
            ))}

            <div className="relative mb-3 flex items-center justify-between gap-2">
              <span className="rounded-full bg-white/90 px-3 py-1 text-sm font-black text-ink-900 shadow-sm">{theme.title}</span>
            </div>

            <div className="relative grid grid-cols-2 gap-3" role="group" aria-label="Which one does not belong?">
              {round.cards.map((c, i) => {
                const isOdd = i === round.odd;
                const state = !answered ? 'idle' : isOdd ? 'odd' : i === chosen ? 'miss' : 'rest';
                return (
                  <button
                    key={`${index}-${c.id}`}
                    type="button"
                    onClick={() => choose(i)}
                    disabled={answered}
                    aria-label={describe(c.face)}
                    style={{ animationDelay: `${i * 70}ms` }}
                    className={`oo-card relative grid aspect-square place-items-center rounded-3xl transition-all duration-200 ${
                      round.theme === 'numbers' ? 'bg-emerald-900/80 ring-2 ring-emerald-200/40' : round.theme === 'words' ? ['bg-amber-50', 'bg-sky-50', 'bg-pink-50', 'bg-lime-50'][i] : 'bg-white/95'
                    } ${
                      state === 'idle' ? 'shadow-[0_6px_0_rgba(15,23,42,0.18)] hover:-translate-y-1 active:translate-y-0.5 active:shadow-[0_2px_0_rgba(15,23,42,0.18)]'
                        : state === 'odd' ? 'oo-win -translate-y-1 shadow-[0_6px_0_#047857] ring-4 ring-emerald-400'
                          : state === 'miss' ? 'gs-wrong shadow-[0_6px_0_#be123c] ring-4 ring-rose-400'
                            : 'scale-95 opacity-60 shadow-none'
                    }`}
                  >
                    <Face face={c.face} young={young} />
                    {state === 'odd' && <span className="absolute -top-2 -right-2 grid size-8 place-items-center rounded-full bg-emerald-500 text-lg font-black text-white shadow-md">✓</span>}
                    {state === 'miss' && <span className="absolute -top-2 -right-2 grid size-8 place-items-center rounded-full bg-rose-500 text-lg font-black text-white shadow-md">✗</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* What the rule was, and something to learn — every round, right or wrong. Tap to go on sooner. */}
          <div className="mt-3 min-h-[7.5rem]" aria-live="polite">
            {answered ? (
              <button type="button" onClick={next} className={`oo-pop w-full rounded-3xl p-4 text-left shadow-sm ring-2 ${right ? 'bg-emerald-50 ring-emerald-200' : 'bg-amber-50 ring-amber-200'}`}>
                <p className={`text-lg font-black ${right ? 'text-emerald-700' : 'text-amber-800'}`}>{right ? pickPraise(index) : 'Not quite — here is the secret rule:'}</p>
                <p className="mt-1 text-base font-bold text-ink-900">{round.rule}</p>
                <p className="mt-2 flex gap-1.5 text-sm font-semibold text-ink-700"><span aria-hidden>💡</span><span>{round.fact}</span></p>
                <p className="mt-2 text-right text-xs font-black text-ink-500">Tap to go on ➜</p>
              </button>
            ) : (
              <p className="pt-2 text-center text-base font-black text-ink-900">Tap the one that does not belong 👆</p>
            )}
          </div>
        </div>
      )}
    </GameShell>
  );
}

const PRAISE = ['Brilliant! 🎉', 'Super spotting! ⭐', 'You cracked it! 🔓', 'Sharp eyes! 👀', 'Genius! 🧠', 'Spot on! 🎯'];
const pickPraise = (i) => PRAISE[i % PRAISE.length];
