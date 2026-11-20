import { useState, useEffect, useMemo } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsFor, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import useTimedRound from './useTimedRound';
import { COLOURS, bookConfig, coloursOf, paletteFor, pickPicture } from '../../data/bands/colouringBook';

const SOLVED_MS = 1700;
const MISS_MS = 500;
const PEEK_MS = 2000;
const INK = '#1f2937';

const MODE_BADGE = { copy: '🖍️ Colour it in', numbers: '🔢 Colour by number', remember: '🧠 Remember the colours' };

/**
 * 🖍️ Colouring Book (2026-11-16, replaces Pixel Painter; same id so records are kept). An outline picture as in a
 * drawing book, crayons on the right: pick a colour, tap a part to fill it. A small example shows the colours (copy),
 * or numbers say them (colour by number), or the example hides after a look (remember). See data/bands/colouringBook.js.
 * A wrong colour flashes red and the part stays white, so a mistake never needs undoing.
 */
export default function PictureLogic({ onExit }) {
  const progress = useGameProgress('picture-logic');
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

/** One picture as an outline: `fills` per part (a colour key or null). Taps go to `onPart`. */
function Drawing({ pic, fills, numbers = null, miss = null, onPart = null, small = false, glow = false }) {
  return (
    <svg viewBox="-2 -2 104 104" className={`h-auto w-full ${glow ? 'drop-shadow-[0_0_12px_rgba(16,185,129,0.55)]' : ''}`} role={onPart ? 'group' : 'img'} aria-label={pic.name}>
      {pic.parts.map((p, i) => {
        const fill = fills[i] ? COLOURS[fills[i]].hex : miss === i ? '#fecdd3' : '#ffffff';
        return (
          <path
            key={i}
            d={p.d}
            fill={fill}
            stroke={miss === i ? '#e11d48' : INK}
            strokeWidth={small ? 2 : miss === i ? 2.4 : 1.6}
            strokeLinejoin="round"
            className={onPart ? 'cursor-pointer transition-[fill] duration-200 hover:brightness-95' : ''}
            onClick={onPart ? () => onPart(i) : undefined}
            role={onPart ? 'button' : undefined}
            tabIndex={onPart ? 0 : undefined}
            aria-label={onPart ? `Part ${i + 1}${fills[i] ? `, ${COLOURS[fills[i]].name}` : ', white'}` : undefined}
            onKeyDown={onPart ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPart(i); } } : undefined}
          />
        );
      })}
      {(pic.decor || []).map((d, i) => (
        <path key={`d${i}`} d={d.d} fill={d.fill || 'none'} stroke={INK} strokeWidth={small ? 2 : 1.6} strokeLinecap="round" pointerEvents="none" />
      ))}
      {numbers &&
        pic.parts.map((p, i) =>
          fills[i] ? null : (
            <text key={`n${i}`} x={p.at[0]} y={p.at[1]} textAnchor="middle" dominantBaseline="central" fontSize="7" fontWeight="900" fill={INK} pointerEvents="none">
              {numbers[p.c]}
            </text>
          )
        )}
    </svg>
  );
}

function Round({ progress, onExit }) {
  const band = progress.ageBand || 'foundation';
  const config = useMemo(() => bookConfig(band, progress.levelNo), [band, progress.levelNo]);
  const { mode } = config;
  const [pic, setPic] = useState(() => pickPicture(config));
  const [palette, setPalette] = useState(() => paletteFor(pic, config.extraColours));
  const [seen, setSeen] = useState(() => [pic.name]);
  const [fills, setFills] = useState(() => pic.parts.map(() => null));
  const [crayon, setCrayon] = useState(null);
  const [miss, setMiss] = useState(null);
  const [misses, setMisses] = useState(0);
  const [solved, setSolved] = useState(0);
  const [reveal, setReveal] = useState(false);
  const [started, setStarted] = useState(false);
  const [showing, setShowing] = useState(true); // remember mode: the example is still up
  const [peeksLeft, setPeeksLeft] = useState(config.peeks);
  const [peeking, setPeeking] = useState(false);
  const [nudge, setNudge] = useState(false); // tapped the picture before picking a crayon
  const complete = solved >= config.puzzles;
  const { seconds, over: timedOut } = useTimedRound(config.seconds, started, complete);

  const over = started && (timedOut || (complete && !reveal));
  const passed = complete;
  const peeksUsed = config.peeks - peeksLeft;
  const timeStars = Math.max(1, starsFor(seconds + 1, Math.max(1, Math.round(config.seconds * 0.15))));
  const stars = over && passed ? Math.max(1, timeStars - (misses > 4 ? 1 : 0) - (peeksUsed > 1 ? 1 : 0)) : 0;
  useRecordStars(progress, over, stars, { correct: solved, hints: peeksUsed, score: solved, limitMs: config.seconds * 1000 });

  const numbers = useMemo(() => (mode === 'numbers' ? Object.fromEntries(coloursOf(pic).map((k, i) => [k, i + 1])) : null), [mode, pic]);
  const left = pic.parts.filter((p, i) => fills[i] !== p.c).length;
  const exampleUp = mode === 'copy' || (mode === 'remember' && (showing || peeking)) || reveal;
  const looking = mode === 'remember' && showing && !reveal;

  // Remember mode: the example shows for a while after each new picture, then hides.
  useEffect(() => {
    if (mode !== 'remember' || !started || !showing) return undefined;
    const t = setTimeout(() => setShowing(false), config.showMs);
    return () => clearTimeout(t);
  }, [mode, started, showing, pic, config.showMs]);

  useEffect(() => {
    if (!peeking) return undefined;
    const t = setTimeout(() => setPeeking(false), PEEK_MS);
    return () => clearTimeout(t);
  }, [peeking]);

  useEffect(() => {
    if (miss === null) return undefined;
    const t = setTimeout(() => setMiss(null), MISS_MS);
    return () => clearTimeout(t);
  }, [miss]);

  useEffect(() => {
    if (!nudge) return undefined;
    const t = setTimeout(() => setNudge(false), 1200);
    return () => clearTimeout(t);
  }, [nudge]);

  // After the picture lights up, the next page of the book (or the end of the level).
  useEffect(() => {
    if (!reveal) return undefined;
    const t = setTimeout(() => {
      if (solved < config.puzzles) {
        const next = pickPicture(config, seen);
        setPic(next);
        setPalette(paletteFor(next, config.extraColours));
        setSeen((s) => [...s, next.name]);
        setFills(next.parts.map(() => null));
        setCrayon(null);
        setShowing(true);
        setPeeksLeft(config.peeks);
      }
      setReveal(false);
    }, SOLVED_MS);
    return () => clearTimeout(t);
  }, [reveal, solved, config, seen]);

  const colourPart = (i) => {
    if (over || reveal || looking || fills[i] === pic.parts[i].c) return;
    if (!crayon) { setNudge(true); return; }
    if (pic.parts[i].c !== crayon) {
      setMiss(i);
      setMisses((n) => n + 1);
      return;
    }
    const next = [...fills];
    next[i] = crayon;
    setFills(next);
    if (pic.parts.every((p, k) => next[k] === p.c)) {
      setSolved((n) => n + 1);
      setReveal(true);
    }
  };

  const objective = {
    copy: `Pick a crayon on the right, then tap a part of the picture to colour it. Use the same colours as the small picture. Colour ${config.puzzles} pictures before time runs out!`,
    numbers: `Colour by number! Each crayon has a number. Pick a crayon, then tap every part with the same number. Colour ${config.puzzles} pictures before time runs out!`,
    remember: `Look at the small picture — it hides after a few seconds. Then colour the big picture from memory. Stuck? Press Peek (2 peeks). Colour ${config.puzzles} pictures!`
  }[mode];

  const status = reveal
    ? `You coloured ${pic.name}! ${pic.emoji}`
    : looking
      ? 'Look at the colours carefully… 👀'
      : nudge
        ? 'First pick a crayon on the right 👉'
        : !crayon
          ? 'Pick a crayon on the right 👉'
          : `${left} part${left === 1 ? '' : 's'} left to colour`;

  return (
    <GameShell
      title="Colouring Book"
      blurb={`Colour ${config.puzzles} pictures before time runs out.`}
      tone="bg-gradient-to-br from-pink-500 to-orange-400"
      score={`${solved}/${config.puzzles}`}
      scoreLabel="Coloured"
      seconds={seconds}
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={
        !started
          ? { gameId: progress.gameId, level: progress.level, objective, seconds: config.seconds, stars: starsOn(progress.gameId, progress.level), onStart: () => setStarted(true) }
          : null
      }
      result={
        over
          ? {
              passed,
              stars,
              headline: passed ? `Level ${progress.level} cleared!` : 'Time’s up',
              detail: `${Math.min(solved, config.puzzles)} of ${config.puzzles} pictures coloured`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={<p className="text-center text-sm text-ink-500">Pick a crayon · tap a part to colour it · a wrong colour flashes red</p>}
    >
      {started && !over && (
        <div className="mx-auto max-w-2xl select-none">
          <div className="mb-3 flex flex-wrap items-center justify-center gap-2 text-center">
            <span className="rounded-full bg-pink-100 px-3 py-1 text-xs font-black text-pink-700">{MODE_BADGE[mode]}</span>
            <p className={`text-base font-black ${reveal ? 'text-emerald-600' : nudge ? 'text-rose-600' : 'text-ink-700'}`} aria-live="polite">{status}</p>
          </div>

          <div className="flex items-start gap-3 sm:gap-5">
            {/* The page: the small example on top, the outline picture big under it. */}
            <div className="min-w-0 flex-1 rounded-3xl bg-white p-3 shadow-sm ring-1 ring-line-200 sm:p-4">
              {mode !== 'numbers' && (
                <div className="mx-auto mb-2 w-24 rounded-xl bg-amber-50 p-1.5 shadow-sm ring-1 ring-amber-200 sm:w-28">
                  <p className="mb-0.5 text-center text-[0.6rem] leading-tight font-black text-amber-800">Colour it like this</p>
                  <div className="relative">
                    <Drawing pic={pic} fills={pic.parts.map((p) => p.c)} small />
                    {!exampleUp && <div className="absolute inset-0 grid place-items-center rounded-lg bg-amber-100 text-3xl" aria-label="Example hidden">🙈</div>}
                  </div>
                  {mode === 'remember' && !showing && !reveal && (
                    <button
                      type="button"
                      onClick={() => { setPeeking(true); setPeeksLeft((n) => n - 1); }}
                      disabled={peeksLeft <= 0 || peeking}
                      className="fp-press mt-1 w-full rounded-lg bg-amber-400 py-1 text-[0.7rem] font-black text-ink-900 disabled:opacity-40"
                    >
                      👀 Peek ({peeksLeft})
                    </button>
                  )}
                </div>
              )}
              <div className={`mx-auto w-full max-w-[22rem] transition-transform duration-300 ${reveal ? 'scale-[1.03]' : ''} ${looking ? 'opacity-40' : ''}`}>
                <Drawing pic={pic} fills={fills} numbers={numbers} miss={miss} onPart={colourPart} glow={reveal} />
              </div>
            </div>

            {/* The crayons, on the right. */}
            <div className={`flex w-16 shrink-0 flex-col items-center gap-2 rounded-3xl bg-surface-100 p-2 ring-1 ring-line-200 sm:w-24 ${nudge ? 'animate-pulse ring-2 ring-rose-400' : ''}`} role="radiogroup" aria-label="Crayons">
              <span className="text-[0.6rem] font-black tracking-wider text-ink-500 uppercase">Crayons</span>
              {palette.map((k) => {
                const on = crayon === k;
                return (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={`${COLOURS[k].name}${numbers?.[k] ? `, number ${numbers[k]}` : ''}`}
                    onClick={() => setCrayon(k)}
                    className={`fp-press flex w-full flex-col items-center gap-0.5 rounded-2xl py-1.5 transition-all ${on ? 'scale-105 bg-white shadow-md ring-2 ring-ink-900' : 'hover:bg-white/70'}`}
                  >
                    <span
                      className="relative grid h-10 w-10 place-items-center rounded-full text-sm font-black text-white shadow-inner ring-2 ring-white sm:h-12 sm:w-12"
                      style={{ backgroundColor: COLOURS[k].hex, textShadow: '0 1px 2px rgba(0,0,0,0.45)' }}
                    >
                      {numbers?.[k] || ''}
                    </span>
                    <span className="hidden text-[0.7rem] font-black text-ink-700 sm:block">{COLOURS[k].name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </GameShell>
  );
}
