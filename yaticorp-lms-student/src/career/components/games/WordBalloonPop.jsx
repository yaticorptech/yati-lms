import { useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { balloonConfig, makeBalloonLevel } from '../../data/bands/youngB';

const freshSeed = () => Math.floor(Math.random() * 4294967296);
const NEXT_MS = 1400;
const BALLOON_COLOURS = ['#f43f5e', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7'];

/** 🎈 Word Balloon Pop: balloons float up carrying words; pop the one that names the picture before it floats away. */
export default function WordBalloonPop({ onExit }) {
  const progress = useGameProgress('word-balloon-pop', { bands: SECTION_BANDS.young });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

const FRESH = { index: 0, popped: [], status: null, missesHere: 0, correct: 0, wrong: 0, lastWrong: null };

function Round({ progress, onExit }) {
  const config = balloonConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  const young = config.band === 'foundation';
  const [rounds] = useState(() => makeBalloonLevel(seeded(freshSeed()), config));
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [game, setGame] = useState(FRESH);
  const [t, setT] = useState(0); // ms this round has been playing (paused time not counted)
  const clock = useRef(0);
  const nextTimer = useRef(null);

  const over = game.index >= rounds.length;
  const round = over ? null : rounds[game.index];
  // A round counts when the right balloon is popped with at most one wrong pop for the youngest, none for older players.
  const allowedMisses = young ? 1 : 0;
  const stars = over ? starsForFixed(game.correct, config.pass, rounds.length) : 0;
  useRecordStars(progress, over, stars, { correct: game.correct, wrong: game.wrong, hints: 0, score: game.correct });

  const riseMs = config.riseSec * 1000;
  const progressOf = (b, at) => (at - b.delay * 1000) / riseMs;

  const goNext = () => {
    clock.current = 0;
    setT(0);
    setGame((g) => ({ ...g, index: g.index + 1, popped: [], status: null, missesHere: 0, lastWrong: null }));
  };

  useEffect(() => () => clearTimeout(nextTimer.current), []);

  // The float: advances only while playing, unpaused and the round is open.
  useEffect(() => {
    if (!started || over || paused || game.status) return undefined;
    let raf;
    let last = performance.now();
    const right = round.balloons.find((b) => b.correct);
    const frame = (now) => {
      clock.current += Math.min(100, now - last);
      last = now;
      setT(clock.current);
      if (progressOf(right, clock.current) > 1) {
        sfx.wrong();
        setGame((g) => ({ ...g, status: 'missed' }));
        nextTimer.current = setTimeout(goNext, NEXT_MS);
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, over, paused, game.status, game.index]);

  const pop = (i) => {
    if (paused || game.status || game.popped.includes(i)) return;
    const b = round.balloons[i];
    const p = progressOf(b, clock.current);
    if (p < 0 || p > 1) return;
    if (b.correct) {
      sfx.right?.();
      const scored = game.missesHere <= allowedMisses;
      setGame({ ...game, popped: [...game.popped, i], status: 'right', correct: game.correct + (scored ? 1 : 0) });
      nextTimer.current = setTimeout(goNext, NEXT_MS);
      return;
    }
    sfx.wrong();
    setGame({ ...game, popped: [...game.popped, i], missesHere: game.missesHere + 1, wrong: game.wrong + 1, lastWrong: b.text });
  };

  // Number keys pop the visible balloons, left to right.
  const visible = round ? round.balloons.map((b, i) => ({ b, i, p: progressOf(b, t) })).filter((x) => x.p >= 0 && x.p <= 1 && !game.popped.includes(x.i)).sort((a, z) => a.b.lane - z.b.lane) : [];
  useEffect(() => {
    if (!started || over) return undefined;
    const onKey = (e) => {
      if (e.key === 'p' || e.key === 'P') { setPaused((x) => !x); return; }
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= visible.length) pop(visible[n - 1].i);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const message = game.status === 'right'
    ? (game.missesHere <= allowedMisses ? `Pop! Yes, “${round.word}”! 🎉` : `There it is — “${round.word}”.`)
    : game.status === 'missed'
      ? `It floated away. The word was “${round?.word}”.`
      : game.lastWrong
        ? (young ? `Oops, that says “${game.lastWrong}”. Try another! 💪` : `“${game.lastWrong}” is not it — look carefully at the spelling.`)
        : config.picture ? 'Pop the balloon with the word for this picture!' : 'Read the clue. Pop the balloon with the right word!';

  const objective = young
    ? `Look at the picture. Balloons float up with words on them. Pop the balloon that names the picture before it floats away! Get ${config.pass} of ${rounds.length}.`
    : `Read the clue, then pop the balloon with the right word — watch out for tricky spellings. No wrong pops allowed for a point. Get ${config.pass} of ${rounds.length}.`;

  return (
    <GameShell
      title="Word Balloon Pop"
      blurb={young ? 'Pop the right word!' : `Pop ${config.pass} of ${rounds.length} right words.`}
      tone="bg-gradient-to-br from-sky-400 to-indigo-600"
      score={`${game.correct}/${rounds.length}`}
      scoreLabel="Popped"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      paused={paused}
      onPause={() => setPaused((x) => !x)}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) } : null}
      result={over ? {
        passed: stars > 0, stars,
        headline: stars > 0 ? `Level ${progress.level} cleared!` : 'Nearly there',
        detail: `${game.correct} of ${rounds.length} words popped · ${game.wrong} wrong ${game.wrong === 1 ? 'pop' : 'pops'}`,
        atEnd: progress.atEnd, onNext: progress.advance, onRetry: progress.retry
      } : null}
      footer={<p className="text-center text-sm text-ink-500">Picture {Math.min(game.index + 1, rounds.length)} of {rounds.length} · keys 1–5 pop balloons left to right · P pauses</p>}
    >
      {started && round && (
        <div className="mx-auto w-full max-w-md">
          <div className="mb-2 flex min-h-20 items-center justify-center gap-3 rounded-3xl bg-white px-4 py-2 ring-2 ring-sky-200 ring-inset">
            {config.picture && <span className="text-6xl leading-none" role="img" aria-label="The picture">{round.emoji}</span>}
            {config.clue && <p className="text-base font-bold text-ink-800">{round.clue}</p>}
          </div>
          <p className={`mb-2 min-h-6 text-center text-base font-black ${game.status === 'right' ? 'text-emerald-600' : game.status === 'missed' || game.lastWrong ? 'text-rose-600' : 'text-ink-900'}`} role="status" aria-live="polite">{message}</p>

          <div className="relative h-[22rem] overflow-hidden rounded-3xl bg-gradient-to-b from-sky-200 via-sky-100 to-emerald-100 ring-1 ring-sky-200" aria-label="Sky with balloons">
            <span className="absolute top-3 left-4 text-4xl opacity-80" aria-hidden="true">☁️</span>
            <span className="absolute top-10 right-6 text-3xl opacity-70" aria-hidden="true">☁️</span>
            {round.balloons.map((b, i) => {
              const p = progressOf(b, t);
              const isPopped = game.popped.includes(i);
              if (p < 0 || (p > 1 && !(isPopped && b.correct))) return null;
              const n = round.balloons.length;
              const left = ((b.lane + 0.5) / n) * 100;
              const bottom = -24 + Math.min(p, 1) * 128;
              const reveal = game.status && b.correct;
              return (
                <button
                  key={i}
                  type="button"
                  onPointerDown={(e) => { e.preventDefault(); pop(i); }}
                  onClick={(e) => { if (e.detail === 0) pop(i); }}
                  disabled={isPopped || !!game.status}
                  aria-label={`Balloon: ${b.text}`}
                  className="absolute flex -translate-x-1/2 flex-col items-center focus-visible:outline-3 focus-visible:outline-indigo-500"
                  style={{ left: `${left}%`, bottom: `${bottom}%`, width: `min(6rem, ${92 / n}%)` }}
                >
                  {isPopped && !b.correct ? (
                    <span className="text-4xl" aria-hidden="true">💥</span>
                  ) : (
                    <>
                      <span
                        className={`flex aspect-[5/6] w-full items-center justify-center rounded-[50%] px-1 shadow-md ${reveal ? 'ring-4 ring-yellow-300' : ''} ${isPopped && b.correct ? 'scale-110' : ''}`}
                        style={{ background: `radial-gradient(circle at 35% 30%, #ffffffaa, ${BALLOON_COLOURS[b.lane % BALLOON_COLOURS.length]} 45%)` }}
                      >
                        <span className="rounded-lg bg-white/85 px-1 text-sm font-black break-all text-ink-900 sm:text-base">{b.text}</span>
                      </span>
                      <span className="h-6 w-px bg-slate-500" aria-hidden="true" />
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </GameShell>
  );
}
