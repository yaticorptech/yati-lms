import { useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsForFixed, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { SECTION_BANDS } from './catalog';
import { seeded } from '../../data/seeded';
import { hopCheck, hopConfig, makeHopLevel } from '../../data/bands/youngA';

const freshSeed = () => Math.floor(Math.random() * 4294967296);
const HOP_MS = 170;
const NEXT_MS = 1300;
const BACK_MS = 900;

/** 🐸 Math: tap the lily pad the frog should hop to — it hops there; the wrong pad is a splash. */
export default function NumberHop({ onExit }) {
  const progress = useGameProgress('number-hop', { bands: SECTION_BANDS.young });
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const config = hopConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  const young = config.band === 'foundation';
  const [rounds] = useState(() => makeHopLevel(seeded(freshSeed()), config));
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [frogAt, setFrogAt] = useState(() => rounds[0].pads.indexOf(rounds[0].start));
  const [busy, setBusy] = useState(false);
  const [splash, setSplash] = useState(null);
  const [tried, setTried] = useState([]);
  const [solved, setSolved] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const timers = useRef([]);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);

  const over = idx >= rounds.length;
  const round = over ? null : rounds[idx];
  const stars = over ? starsForFixed(correct, config.pass, rounds.length) : 0;
  useRecordStars(progress, over, stars, { correct, wrong, hints: 0, score: correct, limitMs: null });

  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));

  const nextRound = () => {
    const n = idx + 1;
    setIdx(n);
    setTried([]);
    setSolved(false);
    setSplash(null);
    setBusy(false);
    if (n < rounds.length) setFrogAt(rounds[n].pads.indexOf(rounds[n].start));
  };

  const tap = (i) => {
    if (!started || busy || solved || over || tried.includes(i)) return;
    const startIdx = round.pads.indexOf(round.start);
    if (i === frogAt) return;
    setBusy(true);
    setSplash(null);
    // Hop pad by pad to the tapped one.
    const dir = i > frogAt ? 1 : -1;
    const steps = Math.abs(i - frogAt);
    for (let s = 1; s <= steps; s++) later(() => setFrogAt(frogAt + dir * s), s * HOP_MS);
    later(() => {
      if (hopCheck(round, round.pads[i])) {
        sfx.right?.();
        setSolved(true);
        if (tried.length === 0) setCorrect((c) => c + 1); else setWrong((w) => w + 1);
        later(nextRound, NEXT_MS);
      } else {
        sfx.wrong();
        setSplash(i);
        setTried((t) => [...t, i]);
        later(() => { setFrogAt(startIdx); setSplash(null); setBusy(false); }, BACK_MS);
      }
    }, steps * HOP_MS + 60);
  };

  // Pads are plain buttons, so Tab + Enter plays the game from the keyboard.
  const objective = young
    ? `Read the question, then tap the lily pad with the right number. The frog 🐸 hops there! Get ${config.pass} of ${rounds.length} right on the first try.`
    : `Solve each hop — adding, taking away, counting in 2s, 5s or 10s, or finding the missing hop — and tap the right lily pad. Get ${config.pass} of ${rounds.length} right on the first try.`;

  const message = !round ? '' : solved
    ? (tried.length ? `Yes, ${round.answer}! Next one.` : young ? `Hop hop! ${round.answer} is right! 🎉` : `Correct — ${round.answer}!`)
    : splash !== null
      ? (young ? 'Splash! 💦 Not that pad. Try again!' : `Splash — not ${round.pads[splash]}. Try again.`)
      : busy ? 'Hop…' : 'Tap a lily pad!';

  return (
    <GameShell
      title="Number Hop"
      blurb={young ? 'Help the frog hop to the right number!' : 'Hop the frog along the number line.'}
      tone="bg-gradient-to-br from-emerald-400 to-sky-600"
      score={`${correct}/${rounds.length}`}
      scoreLabel="Hops"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={!started ? { gameId: progress.gameId, level: progress.level, objective, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) } : null}
      result={over ? {
        passed: correct >= config.pass,
        stars,
        headline: correct >= config.pass ? `Level ${progress.level} cleared!` : 'Good hopping — try again!',
        detail: `${correct} of ${rounds.length} right on the first hop`,
        atEnd: progress.atEnd,
        onNext: progress.advance,
        onRetry: progress.retry
      } : null}
      footer={<p className="text-center text-sm text-ink-500">Question {Math.min(idx + 1, rounds.length)} of {rounds.length}</p>}
    >
      {started && round && (
        <div className="mx-auto w-full max-w-2xl">
          {/* The question on a wooden sign. */}
          <div className="relative mx-auto mb-4 w-fit max-w-full">
            <div className="rounded-2xl bg-gradient-to-b from-amber-300 via-amber-400 to-orange-400 p-[3px] shadow-[0_10px_24px_-10px_rgba(194,65,12,0.6)]">
              <p className={`rounded-[14px] bg-gradient-to-b from-amber-50 to-yellow-100 px-5 py-3 text-center font-black text-amber-950 ${young ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'}`}>
                {round.prompt}
              </p>
            </div>
            <span aria-hidden className="absolute -top-3 -left-3 rotate-[-14deg] text-2xl">🌼</span>
            <span aria-hidden className="absolute -right-3 -bottom-3 rotate-12 text-2xl">🐞</span>
          </div>

          {/* The pond. */}
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-b from-sky-300 via-cyan-400 to-blue-500 px-3 pt-20 pb-6 shadow-[inset_0_-12px_30px_rgba(30,64,175,0.35),0_18px_36px_-18px_rgba(14,116,144,0.7)] ring-4 ring-emerald-300 sm:px-6" aria-label="Lily pads">
            {/* Grass bank, sun glints, reeds, a fish and ripples. */}
            <div aria-hidden className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-lime-300 to-emerald-400 [clip-path:polygon(0_0,100%_0,100%_55%,92%_75%,80%_60%,66%_80%,52%_62%,38%_82%,24%_62%,12%_78%,0_60%)]" />
            <span aria-hidden className="absolute top-1 left-3 text-2xl">🌿</span>
            <span aria-hidden className="absolute top-0 right-6 text-3xl">🌾</span>
            <span aria-hidden className="absolute top-1 left-1/3 text-xl">🌸</span>
            <span aria-hidden className="absolute top-1 right-1/4 text-xl">🌷</span>
            <span aria-hidden className="nh-drift absolute bottom-2 left-6 text-2xl">🐟</span>
            <span aria-hidden className="nh-drift absolute right-8 bottom-3 text-xl [animation-delay:-3s]">🐠</span>
            <span aria-hidden className="absolute right-3 bottom-10 text-2xl">🪷</span>
            {[18, 46, 78].map((left, k) => (
              <span key={k} aria-hidden className="nh-ripple pointer-events-none absolute h-16 w-28 rounded-[50%] border-2 border-white/50" style={{ left: `${left}%`, top: `${58 + (k % 2) * 22}%`, animationDelay: `${k * -0.9}s` }} />
            ))}

            <div className="relative flex flex-wrap justify-center gap-x-2 gap-y-16 sm:gap-x-3">
              {round.pads.map((n, i) => {
                const isFrog = frogAt === i && splash !== i;
                const isSplash = splash === i;
                const isWrong = tried.includes(i);
                const isRight = solved && n === round.answer;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => tap(i)}
                    disabled={busy || solved || isWrong}
                    aria-label={`Pad ${n}${frogAt === i ? ', the frog is here' : ''}`}
                    className={`fp-press group relative h-[4.6rem] w-[4.6rem] sm:h-24 sm:w-24 ${isWrong ? 'opacity-50' : ''}`}
                  >
                    <span className="nh-pad absolute inset-0 block" style={{ '--nh-i': i }}>
                      <LilyPad tone={isRight ? 'right' : isSplash ? 'splash' : 'pad'} />
                      <span className={`absolute top-1/2 left-1/2 grid h-10 min-w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full px-1.5 text-lg font-black tabular-nums shadow-md transition-transform group-hover:scale-110 sm:h-12 sm:min-w-12 sm:text-xl ${
                        isRight ? 'bg-yellow-300 text-amber-950 ring-4 ring-white' : isSplash ? 'bg-rose-100 text-rose-700 ring-2 ring-rose-400' : 'bg-white text-emerald-900 ring-2 ring-emerald-700/20'
                      }`}>
                        {n}
                      </span>
                    </span>
                    {isSplash && (
                      <>
                        <span aria-hidden className="nh-splash pointer-events-none absolute top-1/2 left-1/2 h-24 w-24 rounded-full border-4 border-white/80" />
                        <span aria-hidden className="absolute -top-8 left-1/2 -translate-x-1/2 text-4xl">💦</span>
                      </>
                    )}
                    {isRight && <span aria-hidden className="nh-cheer absolute -top-6 left-1/2 text-3xl">⭐</span>}
                    {isFrog && (
                      <span key={`frog-${frogAt}`} aria-hidden className="nh-frog pointer-events-none absolute -top-14 left-1/2 z-10 block w-20 sm:-top-16 sm:w-24">
                        <Frog happy={solved} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <p className={`mx-auto mt-4 w-fit rounded-full px-5 py-2 text-center text-lg font-black shadow-sm ${solved ? 'bg-emerald-100 text-emerald-700' : splash !== null ? 'bg-rose-100 text-rose-700' : 'bg-violet-100 text-violet-800'}`} role="status" aria-live="polite">
            {message}
          </p>
        </div>
      )}
    </GameShell>
  );
}

/** A lily pad: a round leaf with its notch and veins. */
function LilyPad({ tone }) {
  const [from, to] = tone === 'right' ? ['#86efac', '#16a34a'] : tone === 'splash' ? ['#bae6fd', '#38bdf8'] : ['#4ade80', '#15803d'];
  const id = `nh-pad-${tone}`;
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow-[0_6px_6px_rgba(12,74,110,0.35)]" aria-hidden>
      <defs>
        <radialGradient id={id} cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </radialGradient>
      </defs>
      <path d="M50 50 L62 4 A47 47 0 1 1 38 4 Z" fill={`url(#${id})`} stroke="#14532d" strokeOpacity="0.35" strokeWidth="2" />
      <g stroke="#14532d" strokeOpacity="0.22" strokeWidth="2" strokeLinecap="round">
        <path d="M50 50 L14 34 M50 50 L10 62 M50 50 L28 88 M50 50 L60 95 M50 50 L88 76 M50 50 L92 44 M50 50 L82 16" />
      </g>
    </svg>
  );
}

/** The frog: big, round and friendly. Blinks; smiles wider when it lands on the right pad. */
function Frog({ happy }) {
  return (
    <svg viewBox="0 0 120 100" className="h-auto w-full drop-shadow-[0_8px_6px_rgba(0,0,0,0.25)]">
      <defs>
        <radialGradient id="nh-frog-body" cx="45%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#a3e635" />
          <stop offset="100%" stopColor="#16a34a" />
        </radialGradient>
      </defs>
      {/* Back legs */}
      <ellipse cx="20" cy="82" rx="18" ry="10" fill="#22c55e" stroke="#14532d" strokeWidth="2.5" />
      <ellipse cx="100" cy="82" rx="18" ry="10" fill="#22c55e" stroke="#14532d" strokeWidth="2.5" />
      {/* Body */}
      <ellipse cx="60" cy="62" rx="42" ry="32" fill="url(#nh-frog-body)" stroke="#14532d" strokeWidth="2.5" />
      <ellipse cx="60" cy="72" rx="26" ry="18" fill="#ecfccb" />
      {/* Eyes */}
      <circle cx="38" cy="28" r="17" fill="url(#nh-frog-body)" stroke="#14532d" strokeWidth="2.5" />
      <circle cx="82" cy="28" r="17" fill="url(#nh-frog-body)" stroke="#14532d" strokeWidth="2.5" />
      <g className="nh-frog-eye">
        <circle cx="38" cy="27" r="11" fill="#fff" />
        <circle cx="82" cy="27" r="11" fill="#fff" />
        <circle cx="40" cy="28" r="6" fill="#111827" />
        <circle cx="84" cy="28" r="6" fill="#111827" />
        <circle cx="42" cy="25" r="2.2" fill="#fff" />
        <circle cx="86" cy="25" r="2.2" fill="#fff" />
      </g>
      {/* Cheeks and smile */}
      <ellipse cx="32" cy="56" rx="7" ry="4.5" fill="#fb7185" opacity="0.7" />
      <ellipse cx="88" cy="56" rx="7" ry="4.5" fill="#fb7185" opacity="0.7" />
      {happy
        ? <path d="M42 52 Q60 72 78 52 Q60 62 42 52 Z" fill="#be123c" stroke="#14532d" strokeWidth="2.5" strokeLinejoin="round" />
        : <path d="M44 54 Q60 66 76 54" fill="none" stroke="#14532d" strokeWidth="3" strokeLinecap="round" />}
      {/* Front feet */}
      <ellipse cx="40" cy="92" rx="10" ry="5" fill="#22c55e" stroke="#14532d" strokeWidth="2.5" />
      <ellipse cx="80" cy="92" rx="10" ry="5" fill="#22c55e" stroke="#14532d" strokeWidth="2.5" />
    </svg>
  );
}
