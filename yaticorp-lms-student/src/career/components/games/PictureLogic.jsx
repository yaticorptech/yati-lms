import { useState, useEffect, useMemo } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsFor, starsOn } from './levels';
import useRecordStars from './useRecordStars';
import useTimedRound from './useTimedRound';
import { COLOURS, bookConfig, paletteFor, pickPicture } from '../../data/bands/colouringBook';

const SOLVED_MS = 1700;
const MISS_MS = 500;
const PEEK_MS = 2000;
const INK = '#1f2937';


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

/** A crayon, standing up: a pointed tip, a paper wrapper with two bands, in its colour. */
function Crayon({ hex, label = '' }) {
  return (
    <span className="relative block h-12 w-7 sm:h-16 sm:w-9" aria-hidden>
      <svg viewBox="0 0 28 56" className="h-full w-full drop-shadow-sm">
        <path d="M8 16 L14 2 L20 16 Z" fill={hex} stroke="rgba(0,0,0,0.25)" strokeWidth="1" strokeLinejoin="round" />
        <path d="M11 9 L14 2 L17 9 Z" fill="rgba(0,0,0,0.25)" />
        <rect x="6" y="15" width="16" height="39" rx="3" fill={hex} stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
        <rect x="6" y="22" width="16" height="4" fill="rgba(255,255,255,0.55)" />
        <rect x="6" y="44" width="16" height="4" fill="rgba(255,255,255,0.55)" />
        <rect x="9" y="17" width="3" height="34" rx="1.5" fill="rgba(255,255,255,0.3)" />
      </svg>
      {label && <span className="absolute inset-x-0 top-[55%] text-center text-xs font-black text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">{label}</span>}
    </span>
  );
}

/**
 * One picture as an outline: `fills` per part (a colour key or null). Taps go to `onPart`.
 * Drawn like a colouring-book page (2026-11-18): smooth, thinner rounded lines; detail lines finer than the outlines;
 * a decor line may sit right after a part (`after`) so a background's pattern never runs over the character; and a
 * scene (`framed`) is a page with soft rounded corners rather than a hard black box.
 */
function Drawing({ pic, fills, numbers = null, miss = null, onPart = null, small = false, glow = false }) {
  const decorAfter = (i) => (pic.decor || []).filter((d) => d.after === i);
  const decorLine = (d, key) => (
    <path key={key} d={d.d} fill={d.fill || 'none'} stroke={d.stroke || INK} strokeWidth={small ? 1.6 : d.stroke === '#ffffff' ? 1.6 : 1} strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />
  );
  const clipId = `page-${pic.name.replace(/\W/g, '')}`;
  return (
    <svg viewBox="-2 -2 104 104" className={`h-auto w-full ${glow ? 'drop-shadow-[0_0_12px_rgba(16,185,129,0.55)]' : ''}`} role={onPart ? 'group' : 'img'} aria-label={pic.name}>
      {pic.framed && (
        <defs>
          <clipPath id={clipId}><rect x="0" y="0" width="100" height="100" rx="7" /></clipPath>
        </defs>
      )}
      <g clipPath={pic.framed ? `url(#${clipId})` : undefined}>
        {pic.parts.map((p, i) => {
          const fill = fills[i] ? COLOURS[fills[i]].hex : miss === i ? '#fecdd3' : '#ffffff';
          return [
            <path
              key={i}
              d={p.d}
              fill={fill}
              stroke={miss === i ? '#e11d48' : INK}
              strokeWidth={small ? 2 : miss === i ? 2 : 1.25}
              strokeLinejoin="round"
              strokeLinecap="round"
              className={onPart ? 'cursor-pointer transition-[fill] duration-200 hover:opacity-90' : ''}
              onClick={onPart ? () => onPart(i) : undefined}
              role={onPart ? 'button' : undefined}
              tabIndex={onPart ? 0 : undefined}
              aria-label={onPart ? `Part ${i + 1}${fills[i] ? `, ${COLOURS[fills[i]].name}` : ', white'}` : undefined}
              onKeyDown={onPart ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPart(i); } } : undefined}
            />,
            ...decorAfter(i).map((d, k) => decorLine(d, `a${i}-${k}`))
          ];
        })}
        {(pic.decor || []).filter((d) => d.after == null).map((d, i) => decorLine(d, `d${i}`))}
      </g>
      {pic.framed && <rect x="0" y="0" width="100" height="100" rx="7" fill="none" stroke={INK} strokeWidth="1.6" pointerEvents="none" />}
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
  const config = useMemo(() => bookConfig(band, progress.levelNo, progress.level), [band, progress.levelNo, progress.level]);
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

  const numbers = null; // colour-by-number retired (2026-11-17): every level is from memory
  const left = pic.parts.filter((p, i) => fills[i] !== p.c).length;
  const looking = showing && !reveal;
  // While looking or peeking the big scene shows its colours; then only the outline and what the student coloured.
  const shown = looking || peeking ? pic.parts.map((p) => p.c) : fills;
  // The 7-second look, counted down on screen.
  const [lookLeft, setLookLeft] = useState(Math.ceil(config.showMs / 1000));
  useEffect(() => {
    if (!started || !looking) return undefined;
    const t = setInterval(() => setLookLeft((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(t);
  }, [started, looking]);

  // Remember mode: the example shows for a while after each new picture, then hides.
  useEffect(() => {
    if (!started || !showing) return undefined;
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
        setLookLeft(Math.ceil(config.showMs / 1000));
        setPeeksLeft(config.peeks);
      }
      setReveal(false);
    }, SOLVED_MS);
    return () => clearTimeout(t);
  }, [reveal, solved, config, seen]);

  const colourPart = (i) => {
    if (over || reveal || looking || peeking || fills[i] === pic.parts[i].c) return;
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

  const thing = config.objects ? 'picture' : 'scene';
  const objective = `Look at the coloured ${thing} — it hides after ${config.showMs / 1000} seconds! Then pick a crayon below and colour every part from memory. Forgot a colour? Press Peek to see the coloured ${thing} again for 2 seconds (${config.peeks} peeks). Colour ${config.puzzles} ${thing}s before time runs out!`;

  const status = reveal
    ? `You coloured ${pic.name}! ${pic.emoji}`
    : looking
      ? 'Look at the colours carefully… 👀'
      : nudge
        ? 'First pick a crayon below 👇'
        : !crayon
          ? 'Pick a crayon below 👇'
          : `${left} part${left === 1 ? '' : 's'} left to colour`;

  return (
    <GameShell
      title="Colouring Book"
      blurb={`Remember ${config.puzzles} ${thing}s and colour them in.`}
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
              detail: `${Math.min(solved, config.puzzles)} of ${config.puzzles} ${thing}s coloured`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={<p className="text-center text-sm text-ink-500">Look for 7 seconds · pick a crayon · tap a part to colour it · a wrong colour flashes red</p>}
    >
      {started && !over && (
        <div className="mx-auto max-w-2xl select-none">
          <div className="mb-3 flex flex-wrap items-center justify-center gap-2 text-center">
            <span className="rounded-full bg-pink-100 px-3 py-1 text-xs font-black text-pink-700">🧠 {pic.emoji} Colour {pic.name} from memory</span>
            <p className={`text-base font-black ${reveal ? 'text-emerald-600' : nudge ? 'text-rose-600' : 'text-ink-700'}`} aria-live="polite">{status}</p>
          </div>

          {/* The drawing on top, the crayons in rows under it (2026-11-18, the user), on a phone and a desktop alike. */}
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* The page: the scene, big. Coloured for the look (and a peek), then the outline to colour. */}
            <div className="relative min-w-0 overflow-hidden rounded-3xl bg-[#fffaf0] p-3 shadow-[0_6px_20px_-8px_rgba(120,80,20,0.25)] ring-1 ring-amber-200/70 sm:p-4" style={{ backgroundImage: 'radial-gradient(rgba(180,140,60,0.13) 1px, transparent 1px)', backgroundSize: '14px 14px' }}>
              {/* Washi-tape corners: a page stuck into the book. */}
              <span aria-hidden className="pointer-events-none absolute -top-1 -left-3 h-5 w-14 -rotate-[30deg] rounded-sm bg-pink-300/60" />
              <span aria-hidden className="pointer-events-none absolute -top-1 -right-3 h-5 w-14 rotate-[30deg] rounded-sm bg-sky-300/60" />
              <div className={`relative mx-auto w-full max-w-[min(26rem,52vh)] overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-amber-100 transition-transform duration-300 ${reveal ? 'scale-[1.03]' : ''}`}>
                <Drawing pic={pic} fills={shown} numbers={numbers} miss={miss} onPart={colourPart} glow={reveal} />
                {looking && (
                  <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-ink-900/85 px-3 py-1 text-sm font-black text-white tabular-nums shadow-lg" aria-hidden>⏳ {lookLeft}s</span>
                )}
              </div>
              {!showing && !reveal && (
                <button
                  type="button"
                  onClick={() => { setPeeking(true); setPeeksLeft((n) => n - 1); }}
                  disabled={peeksLeft <= 0 || peeking}
                  aria-label={`Peek: see the coloured ${thing} again for 2 seconds. ${peeksLeft} left`}
                  className="fp-press mx-auto mt-3 flex flex-col items-center rounded-xl bg-amber-400 px-4 py-1.5 text-sm font-black text-ink-900 disabled:opacity-40"
                >
                  <span>👀 Peek · {peeksLeft} left</span>
                  <span className="text-[0.7rem] font-bold text-ink-800">See the colours again for 2 seconds</span>
                </button>
              )}
            </div>

            {/* The crayons, under the drawing: 4 to a row, at most 2 rows (2026-11-18, the user). */}
            <div className={`rounded-3xl bg-gradient-to-b from-amber-50 to-orange-50 p-2 ring-1 ring-amber-200/70 sm:p-3 ${nudge ? 'animate-pulse ring-2 ring-rose-400' : ''}`} role="radiogroup" aria-label="Crayons">
              <p className="mb-1 text-center text-xs font-black tracking-wider text-ink-900 uppercase">Crayons</p>
              <div className="mx-auto grid max-w-md grid-cols-4 gap-1.5 sm:gap-2">
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
                    className={`fp-press flex w-full flex-col items-center gap-0.5 rounded-2xl pt-1 pb-1.5 transition-all ${on ? '-translate-y-1 bg-white shadow-md ring-2 ring-ink-900' : 'hover:-translate-y-0.5 hover:bg-white/70'}`}
                  >
                    <Crayon hex={COLOURS[k].hex} label={numbers?.[k] || ''} />
                    <span className="text-[0.65rem] font-black text-ink-900 sm:text-[0.7rem]">{COLOURS[k].name}</span>
                  </button>
                );
              })}
              </div>
            </div>
          </div>
        </div>
      )}
    </GameShell>
  );
}
