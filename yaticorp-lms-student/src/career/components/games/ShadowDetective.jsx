import { useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { seeded } from '../../data/seeded';
import { makeShadowLevel, shadowConfig } from '../../data/bands/shadow';

/** How long the happy (or "here it was") moment stays before the next shadow. */
const NEXT_MS = 1100;

const CHOICE_TONES = [
  'bg-amber-50 ring-amber-200 hover:bg-amber-100',
  'bg-sky-50 ring-sky-200 hover:bg-sky-100',
  'bg-emerald-50 ring-emerald-200 hover:bg-emerald-100',
  'bg-rose-50 ring-rose-200 hover:bg-rose-100',
  'bg-violet-50 ring-violet-200 hover:bg-violet-100',
  'bg-lime-50 ring-lime-200 hover:bg-lime-100'
];

/** Where the cloud sits when part of the shadow is hidden. */
const CLOUD = {
  top: 'inset-x-0 top-0 h-[40%] items-end',
  bottom: 'inset-x-0 bottom-0 h-[40%] items-start',
  left: 'inset-y-0 left-0 w-[40%] items-center',
  right: 'inset-y-0 right-0 w-[40%] items-center'
};

const freshSeed = () => Math.floor(Math.random() * 4294967296);
/** The wall clock, read only from handlers and timers. */
const clockNow = () => Date.now();

/** 🔦 Visual perception: whose shadow is this? Tap the thing that made it. */
export default function ShadowDetective({ onExit }) {
  const progress = useGameProgress('shadow-detective');
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

const START = { index: 0, picked: [], missed: false, solved: false, correct: 0, wrong: 0, feedback: null };

function Round({ progress, onExit }) {
  const config = shadowConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  const young = config.band === 'foundation';
  const roundMs = config.seconds * 1000;
  const [rounds] = useState(() => makeShadowLevel(seeded(freshSeed()), config));
  const [game, setGame] = useState(START);
  const [started, setStarted] = useState(false);
  const [roundAt, setRoundAt] = useState(0);
  const [now, setNow] = useState(0);
  const timers = useRef({});

  const over = game.index >= rounds.length;
  const round = over ? null : rounds[game.index];
  const passed = game.correct >= config.pass;
  const stars = over ? starsForFixed(game.correct, config.pass, rounds.length) : 0;
  useRecordStars(progress, over, stars, {
    correct: game.correct, wrong: game.wrong, hints: 0, score: game.correct, limitMs: roundMs * rounds.length
  });

  const left = Math.max(0, roundMs - (now - roundAt));

  useEffect(() => {
    const t = timers.current;
    return () => { clearTimeout(t.round); clearTimeout(t.next); };
  }, []);

  useEffect(() => {
    if (!started || over) return undefined;
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, [started, over]);

  /** Open shadow `idx`: its clock, and what happens when the clock runs out. */
  const openRound = (idx) => {
    clearTimeout(timers.current.round);
    clearTimeout(timers.current.next);
    const t = clockNow();
    setRoundAt(t);
    setNow(t);
    setGame((g) => (idx === 0 ? START : { ...g, index: idx, picked: [], missed: false, solved: false, feedback: null }));
    if (idx >= rounds.length) return;
    timers.current.round = setTimeout(() => {
      sfx.wrong();
      setGame((g) => (g.index !== idx || g.solved ? g : { ...g, solved: true, missed: true, wrong: g.wrong + 1, feedback: 'time' }));
      timers.current.next = setTimeout(() => openRound(idx + 1), NEXT_MS + 400);
    }, roundMs);
  };

  const tap = (choice) => {
    if (!started || over || game.solved || game.picked.includes(choice.emoji)) return;
    const isTarget = round.targets.some((t) => t.emoji === choice.emoji);
    const picked = [...game.picked, choice.emoji];
    if (!isTarget) {
      sfx.wrong();
      setGame({ ...game, picked, missed: true, wrong: game.wrong + 1, feedback: 'try' });
      return;
    }
    const found = round.targets.filter((t) => picked.includes(t.emoji)).length;
    if (found < round.targets.length) {
      setGame({ ...game, picked, feedback: 'one-more' });
      return;
    }
    clearTimeout(timers.current.round);
    setGame({ ...game, picked, solved: true, correct: game.correct + (game.missed ? 0 : 1), feedback: game.missed ? 'found' : 'yes' });
    const idx = game.index;
    timers.current.next = setTimeout(() => openRound(idx + 1), NEXT_MS);
  };

  // Number keys pick a choice: 1 is the first.
  useEffect(() => {
    if (!started || over) return undefined;
    const onKey = (e) => {
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= round.choices.length) tap(round.choices[n - 1]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const names = round ? round.targets.map((t) => t.name).join(' and ') : '';
  const message = {
    yes: young ? `Yes! It is the ${names}! 🎉` : `Correct — the ${names}!`,
    found: `There it is — the ${names}. Next one!`,
    try: young ? 'Not that one. Try again! 💪' : 'Not that one — look at the outline again.',
    'one-more': 'Good! Now find the other one.',
    time: `Time is up. It was the ${names}.`
  }[game.feedback] || (round?.kind === 'pair' ? 'Two things made this shadow. Tap both of them!' : young ? 'Whose shadow is this? Tap it!' : 'Which thing made this shadow?');
  const happy = game.feedback === 'yes' || game.feedback === 'found' || game.feedback === 'one-more';
  const sad = game.feedback === 'try' || game.feedback === 'time';

  const objective = young
    ? `Look at the black shadow. Tap the thing that made it. Get ${config.pass} of ${rounds.length} right on the first try.`
    : config.band === 'developing'
      ? `A shadow appears — sometimes turned or half hidden. Tap the thing that made it; watch out for look-alikes. You have ${config.seconds} seconds for each. Get ${config.pass} of ${rounds.length} right on your first tap.`
      : `Each shadow was made by one thing — or by two things standing together. Tap the thing (or both things) that made it. Shadows may be turned, half hidden, or have look-alikes. ${config.seconds} seconds each; get ${config.pass} of ${rounds.length} with no wrong tap.`;

  return (
    <GameShell
      title="Shadow Detective"
      blurb={young ? 'Find who made the shadow!' : `Match ${config.pass} of ${rounds.length} shadows to the thing that made them.`}
      tone="bg-gradient-to-br from-indigo-500 to-slate-800"
      score={game.correct}
      scoreLabel="Found"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={
        !started
          ? {
              gameId: progress.gameId,
              level: progress.level,
              objective,
              seconds: config.seconds,
              stars: starsOn(progress.gameId, progress.level),
              onStart: () => { setStarted(true); openRound(0); }
            }
          : null
      }
      result={
        over
          ? {
              passed,
              stars,
              headline: passed ? `Level ${progress.level} cleared!` : 'Nearly there',
              detail: `${game.correct} of ${rounds.length} shadows found on the first try`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={<p className="text-center text-sm text-ink-500">Shadow {Math.min(game.index + 1, rounds.length)} of {rounds.length} · keys 1–{round?.choices.length || config.choices} pick a choice</p>}
    >
      {started && round && (
        <div className="mx-auto w-full max-w-md">
          <div className="mb-3 h-2.5 overflow-hidden rounded-full bg-ink-900/10" role="progressbar" aria-label="Time left for this shadow" aria-valuemin={0} aria-valuemax={config.seconds} aria-valuenow={Math.ceil(left / 1000)}>
            <div className={`h-full rounded-full transition-[width] duration-200 ease-linear ${left <= 4000 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${(left / roundMs) * 100}%` }} />
          </div>

          <Shadow round={round} solved={game.solved} />

          <p
            className={`mt-3 mb-3 min-h-6 text-center font-black ${young ? 'text-lg' : 'text-base'} ${happy ? 'text-emerald-600' : sad ? 'text-rose-600' : 'text-ink-900'}`}
            role="status"
            aria-live="polite"
          >
            {message}
          </p>

          <div className={`grid gap-2.5 ${round.choices.length === 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {round.choices.map((choice, i) => {
              const isTarget = round.targets.some((t) => t.emoji === choice.emoji);
              const tapped = game.picked.includes(choice.emoji);
              const state = tapped && isTarget ? 'right' : tapped ? 'wrong' : game.solved && isTarget ? 'right' : null;
              return (
                <button
                  key={choice.emoji}
                  type="button"
                  onClick={() => tap(choice)}
                  disabled={game.solved || tapped}
                  aria-label={`${i + 1}: ${choice.name}`}
                  className={`fp-press flex min-h-[5.5rem] min-w-11 flex-col items-center justify-center gap-1 rounded-2xl p-2 ring-2 transition-all ring-inset focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
                    state === 'right'
                      ? 'gs-right bg-emerald-100 ring-emerald-500'
                      : state === 'wrong'
                        ? 'gs-wrong bg-rose-100 opacity-60 ring-rose-400'
                        : CHOICE_TONES[i % CHOICE_TONES.length]
                  }`}
                >
                  <span className="text-4xl leading-none sm:text-5xl" aria-hidden="true">{choice.emoji}</span>
                  <span className="text-xs font-bold text-ink-700 capitalize">{choice.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </GameShell>
  );
}

/** The shadow: the same emoji drawn pitch black, turned or partly under a cloud; two of them for a pair scene. */
function Shadow({ round, solved }) {
  const black = { filter: 'brightness(0)' };
  return (
    <div
      className="relative mx-auto grid aspect-square w-40 place-items-center overflow-hidden rounded-3xl bg-gradient-to-b from-amber-50 to-orange-100 ring-1 ring-orange-200 sm:w-48"
      role="img"
      aria-label={round.kind === 'pair' ? 'A shadow made by two things' : 'A shadow of one thing'}
    >
      {round.kind === 'pair' ? (
        <>
          <span className="absolute text-[4.5rem] leading-none sm:text-[5.5rem]" style={{ ...black, transform: 'translateX(-22%)' }} aria-hidden="true">{round.targets[0].emoji}</span>
          <span className="absolute text-[4.5rem] leading-none sm:text-[5.5rem]" style={{ ...black, transform: 'translateX(22%) translateY(8%)' }} aria-hidden="true">{round.targets[1].emoji}</span>
        </>
      ) : (
        <span
          className="text-[5.5rem] leading-none transition-transform duration-500 sm:text-[6.5rem]"
          style={{ ...black, transform: `rotate(${solved ? 0 : round.turn}deg)` }}
          aria-hidden="true"
        >
          {round.targets[0].emoji}
        </span>
      )}
      {round.kind === 'single' && round.hide && !solved && (
        <span className={`absolute flex justify-center bg-sky-100 ${CLOUD[round.hide]}`} aria-hidden="true">
          <span className="text-4xl leading-none">☁️</span>
        </span>
      )}
    </div>
  );
}
