import { useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsCap, starsFor, starsOn } from './levels';
import useTimedRound from './useTimedRound';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import { colourConfig, makeColourCard, shuffle, INKS } from '../../data/bands/memory';

/** The shapes a Young Thinker's colour card can be, drawn in the card's ink (currentColor). */
function Blob({ shape, className }) {
  const common = { viewBox: '0 0 100 100', className, fill: 'currentColor', 'aria-hidden': true };
  if (shape === 'square') return <svg {...common}><rect x="12" y="12" width="76" height="76" rx="14" /></svg>;
  if (shape === 'triangle') return <svg {...common}><path d="M50 8 L94 88 Q96 92 91 92 L9 92 Q4 92 6 88 Z" /></svg>;
  if (shape === 'star') return <svg {...common}><path d="M50 5 L62 37 L96 38 L69 59 L79 93 L50 73 L21 93 L31 59 L4 38 L38 37 Z" /></svg>;
  if (shape === 'heart') return <svg {...common}><path d="M50 90 C20 68 4 50 4 32 C4 16 16 6 30 6 C40 6 47 12 50 20 C53 12 60 6 70 6 C84 6 96 16 96 32 C96 50 80 68 50 90 Z" /></svg>;
  return <svg {...common}><circle cx="50" cy="50" r="44" /></svg>;
}

/**
 * 🎨 Memory & focus: tap the colour.
 *
 * Per age band (data/bands/memory.js): Foundation is pure colour recognition — a coloured shape, tap its colour, no
 * reading; Developing brings in a simple colour word (tap the ink) at its higher levels; Rising Brains play the
 * full Stroop — the word and its ink nearly always disagree, and in Classes 9–10 the keys reshuffle every card;
 * Master Minds switch rules: a cue says whether to tap the INK or the WORD, it flips without warning, and every
 * wrong tap costs a point.
 */
export default function ColourMatch({ onExit, gameId = 'colour-match', bands, title = 'Colour Match' }) {
  const progress = useGameProgress(gameId, { bands });
  return (
    <Round
      key={`${progress.level}-${progress.attempt}`}
      progress={progress}
      onExit={onExit}
      title={title}
    />
  );
}

const objectiveFor = (config) => {
  if (config.mode === 'switch') {
    return `Look at the cue: INK — tap the colour the word is printed in; WORD — tap the colour the word says. It switches! Wrong taps cost a point. Reach ${config.target}.`;
  }
  if (config.mode === 'stroop') return `Tap the colour the word is PRINTED in, not the word. Reach ${config.target} before the clock runs out.`;
  if (config.stroopShare > 0) return `Tap the colour you see. For a word, tap the colour of its letters! Get ${config.target}.`;
  return `Tap the colour of the shape. Get ${config.target}!`;
};

function Round({ progress, onExit, title }) {
  const [config] = useState(() => colourConfig({ ageBand: progress.ageBand, difficulty: progress.difficulty, levelNo: progress.levelNo }));
  const palette = INKS.slice(0, config.colours);
  const [card, setCard] = useState(() => makeColourCard(config));
  const [keys, setKeys] = useState(palette);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  // Visual feedback only: which way the last answer went, and a counter so
  // the same animation replays on two answers in a row.
  const [feedback, setFeedback] = useState({ kind: null, id: 0, answer: null });
  const [started, setStarted] = useState(false);
  const score = config.penalty ? Math.max(0, correct - wrong) : correct;
  const { seconds, over } = useTimedRound(config.seconds, started, score >= starsCap(config.target));

  const passed = score >= config.target;
  const stars = over ? starsFor(score, config.target) : 0;
  useRecordStars(progress, over, stars, { correct, wrong, score, limitMs: config.seconds * 1000 });

  const choose = (name) => {
    if (over || !started) return;
    const right = name === card.answer;
    if (right) setCorrect((s) => s + 1);
    else { setWrong((w) => w + 1); sfx.wrong(); }
    setFeedback((f) => ({ kind: right ? 'right' : 'wrong', id: f.id + 1, answer: card.answer }));
    setCard(makeColourCard(config, card.rule));
    if (config.shuffleKeys) setKeys(shuffle(palette));
  };

  // Keys 1…5 pick the answer keys in the order shown.
  const chooseRef = useRef(choose);
  useEffect(() => { chooseRef.current = choose; });
  useEffect(() => {
    if (!started) return undefined;
    const onKey = (e) => {
      const n = Number(e.key);
      if (n >= 1 && n <= keys.length) { e.preventDefault(); chooseRef.current(keys[n - 1].name); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [started, keys]);

  const missed = feedback.kind === 'wrong' ? INKS.find((c) => c.name === feedback.answer) : null;
  const cols = keys.length === 4 ? 'grid-cols-2' : keys.length === 3 ? 'grid-cols-3' : 'grid-cols-3 sm:grid-cols-5';
  const wordRule = card.rule === 'word';

  return (
    <GameShell
      title={title}
      blurb={objectiveFor(config)}
      tone="bg-gradient-to-br from-teal-500 to-cyan-700"
      variant="premium"
      score={score}
      seconds={seconds}
      totalSeconds={config.seconds}
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={
        !started
          ? {
              gameId: progress.gameId,
              level: progress.level,
              objective: objectiveFor(config),
              seconds: config.seconds,
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
              headline: passed ? `Level ${progress.level} cleared!` : config.young ? 'Good try — play again!' : 'So close',
              detail: config.penalty ? `${correct} right, ${wrong} wrong — score ${score}` : `${correct} correct`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={
        <p className="text-center text-sm text-ink-500" aria-live="polite">
          {missed ? (
            <span className="font-bold text-rose-600">{config.young ? `Oops! That was ${missed.label}.` : `It was ${missed.label}.`}</span>
          ) : feedback.kind === 'right' && config.young ? (
            <span className="font-bold text-emerald-600">Great!</span>
          ) : config.mode === 'switch' ? (
            'Follow the cue: INK or WORD'
          ) : card.kind === 'blob' ? (
            'Tap the matching colour'
          ) : (
            <>Name the colour it is <strong className="font-extrabold text-violet-700">printed</strong> in</>
          )}
        </p>
      }
    >
      {started && !over && (
        <div className="mx-auto w-full max-w-2xl text-center">
          {config.mode === 'switch' ? (
            <p
              key={`${card.rule}-${feedback.id}`}
              className={`mx-auto w-fit rounded-full px-4 py-1.5 text-sm font-black tracking-[0.14em] uppercase ring-2 ring-inset ${
                wordRule ? 'bg-amber-100 text-amber-800 ring-amber-400' : 'bg-teal-50 text-teal-700 ring-teal-300'
              }`}
              role="status"
            >
              {wordRule ? '🔤 Word — what it SAYS' : '🎨 Ink — what colour it IS'}
            </p>
          ) : (
            <p className="text-xs font-bold tracking-[0.2em] text-slate-900 uppercase">
              {card.kind === 'blob' ? 'What colour is it?' : 'What colour is the ink?'}
            </p>
          )}

          {/* The stage: replays a green ring on a right answer, a shake on a wrong one. Under the WORD rule the
              frame turns dashed amber too, so the cue is seen without reading it. */}
          <div
            key={feedback.id}
            className={`relative mx-auto mt-3 flex h-28 min-[400px]:h-32 items-center justify-center rounded-3xl bg-gradient-to-b from-[#f8f7fd] to-white px-3 ring-inset sm:mt-4 sm:h-44 lg:h-48 ${
              wordRule ? 'border-4 border-dashed border-amber-400' : 'ring-1 ring-[#ecebf6]'
            } ${feedback.kind === 'right' ? 'gs-right' : feedback.kind === 'wrong' ? 'gs-wrong' : ''}`}
          >
            {card.kind === 'blob' ? (
              <Blob shape={card.shape} className={`gs-pop h-20 w-20 min-[400px]:h-24 min-[400px]:w-24 sm:h-32 sm:w-32 ${card.ink.class}`} />
            ) : (
              <span
                className={`gs-pop max-w-full leading-none font-black tracking-[0.06em] select-none ${card.ink.class}`}
                style={{ fontSize: 'clamp(2.5rem, 14vw, 6rem)' }}
              >
                {card.word}
              </span>
            )}
            {feedback.kind === 'right' && (
              <span aria-hidden className="gs-plus absolute top-3 right-4 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-extrabold text-emerald-600 ring-1 ring-emerald-100">
                +1
              </span>
            )}
            {feedback.kind === 'wrong' && config.penalty && (
              <span aria-hidden className="gs-plus absolute top-3 right-4 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-extrabold text-rose-600 ring-1 ring-rose-100">
                −1
              </span>
            )}
          </div>

          <div className={`mx-auto mt-5 grid max-w-xl gap-2.5 min-[400px]:gap-3 sm:mt-8 sm:gap-4 ${cols}`} role="group" aria-label="Colours">
            {keys.map((c, i) => (
              <button
                key={c.name}
                type="button"
                onClick={() => choose(c.name)}
                aria-label={`${c.label} (key ${i + 1})`}
                style={{ '--edge': c.edge }}
                className={`cm-key group relative block h-20 overflow-hidden rounded-[18px] min-[400px]:h-24 sm:h-28 sm:rounded-[22px] ${c.button}`}
              >
                {/* Gloss: a soft light falling across the top of the card. */}
                <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-[inherit] bg-gradient-to-b from-white/35 to-transparent" />
                <span aria-hidden className="pointer-events-none absolute -top-10 -right-8 h-28 w-28 rounded-full bg-white/15 transition-transform duration-300 group-hover:scale-125" />
                <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-white/25 ring-inset" />
                {!config.young && (
                  <span aria-hidden className="absolute bottom-1.5 left-2.5 text-[0.65rem] font-black text-white/80">{i + 1}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </GameShell>
  );
}
