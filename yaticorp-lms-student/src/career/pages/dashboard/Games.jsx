import { lazy, Suspense, useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Brain, Puzzle, Type, Zap, Play, Gamepad2, Layers, Star, Sparkles, History, Timer, Moon, User, Users, Loader2, Link2, DoorOpen, Globe, Trophy, X, ChevronRight, Check, Info, Lock, Plus } from 'lucide-react';
import api from '../../services/api';
import useBackClose from '../../../native/useBackClose';
import { useToast } from '../../components/ui/Toast';
import GameThumb from '../../components/games/GameThumb';
import { GameTokensArt, HeroScene, PlayLearnGrow } from '../../components/games/GamesHeroArt';
// Each game is downloaded when it is first opened, not with the hub: most visits play one or two.
const MemoryMatch = lazy(() => import('../../components/games/MemoryMatch'));
const SequenceRecall = lazy(() => import('../../components/games/SequenceRecall'));
const NumberRecall = lazy(() => import('../../components/games/NumberRecall'));
const CodeBreaker = lazy(() => import('../../components/games/CodeBreaker'));
const NextInSequence = lazy(() => import('../../components/games/NextInSequence'));
const OddOneOut = lazy(() => import('../../components/games/OddOneOut'));
const WordScramble = lazy(() => import('../../components/games/WordScramble'));
const SynonymMatch = lazy(() => import('../../components/games/SynonymMatch'));
const SentenceGap = lazy(() => import('../../components/games/SentenceGap'));
const MathSprint = lazy(() => import('../../components/games/MathSprint'));
const QuickCompare = lazy(() => import('../../components/games/QuickCompare'));
const MissingOperator = lazy(() => import('../../components/games/MissingOperator'));
const ColourMatch = lazy(() => import('../../components/games/ColourMatch'));
const SpotTheChange = lazy(() => import('../../components/games/SpotTheChange'));
const Deduction = lazy(() => import('../../components/games/Deduction'));
const LightsOut = lazy(() => import('../../components/games/LightsOut'));
const SpellingFix = lazy(() => import('../../components/games/SpellingFix'));
const WordRoots = lazy(() => import('../../components/games/WordRoots'));
const PercentSnap = lazy(() => import('../../components/games/PercentSnap'));
const RunningTotal = lazy(() => import('../../components/games/RunningTotal'));
const GridRecall = lazy(() => import('../../components/games/GridRecall'));
const TicTacToe = lazy(() => import('../../components/games/TicTacToe'));
const MiniSudoku = lazy(() => import('../../components/games/MiniSudoku'));
const TypingSprint = lazy(() => import('../../components/games/TypingSprint'));
const BinaryBlitz = lazy(() => import('../../components/games/BinaryBlitz'));
const SpeedSort = lazy(() => import('../../components/games/SpeedSort'));
// The second wave.
const ReverseRecall = lazy(() => import('../../components/games/ReverseRecall'));
const SeenBefore = lazy(() => import('../../components/games/SeenBefore'));
const ScaleBalance = lazy(() => import('../../components/games/ScaleBalance'));
const ShapeMatrix = lazy(() => import('../../components/games/ShapeMatrix'));
const AntonymMatch = lazy(() => import('../../components/games/AntonymMatch'));
const IdiomSense = lazy(() => import('../../components/games/IdiomSense'));
const NumberBonds = lazy(() => import('../../components/games/NumberBonds'));
const RoundingRush = lazy(() => import('../../components/games/RoundingRush'));
const DotCount = lazy(() => import('../../components/games/DotCount'));
const MatchBack = lazy(() => import('../../components/games/MatchBack'));
const SpinMatch = lazy(() => import('../../components/games/SpinMatch'));
const LastStone = lazy(() => import('../../components/games/LastStone'));
const TensePick = lazy(() => import('../../components/games/TensePick'));
const SoundAlike = lazy(() => import('../../components/games/SoundAlike'));
const FractionMatch = lazy(() => import('../../components/games/FractionMatch'));
const ClockRead = lazy(() => import('../../components/games/ClockRead'));
import GameLeaderboard from '../../components/games/GameLeaderboard';
import { starsForGame, levelReached, pullProgress, markPlayed, lastPlayed, setGameXpTable, GAME_XP } from '../../components/games/levels';
import { useHideLoop } from '../../../components/loopVisibility';
import { PlayClockContext, clock, limitWords } from '../../components/games/playClock';

// Group Brain (asked 2026-10-27): the group games, played in rooms with a code.
import { roomsApi, GROUP_GAMES, DIFFICULTIES, ROOM_SIZES, isTwo } from '../../../competitions/api';
import useGroupTime from '../../../competitions/useGroupTime';
import Portal from '../../../components/Portal';

/**
 * Today's play time against the admin's daily limit.
 *
 * The server keeps the count, from a heartbeat every fifteen seconds while a
 * level is being played and the tab is in view; between beats the figure
 * ticks down here so the student sees it move. A game's briefing before
 * "Start level" and its result screen do not count: `playing` is true only
 * between the two (GameShell reports it, see playClock.js). `left` is null
 * when there is no limit.
 */
function usePlayTime(playing, onTimeUp) {
  const [state, setState] = useState(null);
  const [left, setLeft] = useState(null);
  // Called from the timer and the server's answer, never from render or an
  // effect body: the moment the clock reaches zero is an event, not a state.
  const timeUp = useRef(onTimeUp);
  useEffect(() => { timeUp.current = onTimeUp; }, [onTimeUp]);
  // Seconds the server has counted today, for the head start below.
  const used = useRef(0);

  const take = (data) => {
    used.current = data?.usedSeconds || 0;
    setState(data);
    setLeft(data?.limitSeconds ? data.remainingSeconds : null);
    setGameXpTable(data?.xpByStars);
    if (data?.limitSeconds && data.remainingSeconds === 0) timeUp.current?.();
  };

  useEffect(() => {
    api.get('/games/time').then(({ data }) => take(data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!playing) return undefined;
    let last = Date.now();
    let pending = 0;
    const send = () => {
      if (pending < 1) return;
      const seconds = Math.round(pending);
      pending = 0;
      api.post('/games/time', { seconds }).then(({ data }) => take(data)).catch(() => {});
    };
    const tick = setInterval(() => {
      const now = Date.now();
      // Only time in view counts: a game left open in a background tab is not play.
      if (document.visibilityState === 'visible') {
        pending += (now - last) / 1000;
        setLeft((l) => {
          if (l === null) return l;
          if (l === 1) setTimeout(() => timeUp.current?.(), 0);
          return Math.max(0, l - 1);
        });
      }
      last = now;
    }, 1000);
    // One second straight away, so the server has counted some play today
    // before the first level can end: it banks and pays nothing until it
    // has, and a quick first level would otherwise beat the first beat.
    // Only the day's first level needs it: the clock now starts at every
    // "Start level", and a second each time would add up over a day.
    if (used.current === 0) {
      pending = 1;
      send();
    }
    const beat = setInterval(send, 15000);
    return () => {
      clearInterval(tick);
      clearInterval(beat);
      send();
    };
  }, [playing]);

  return { state, left, outOfTime: left === 0 };
}

/*
 * Palettes written out in full: Tailwind scans source text, so a class name
 * built from a variable compiles to no CSS at all.
 */
const CATEGORIES = [
  {
    key: 'memory',
    name: 'Memory & Focus',
    blurb: 'Hold more in your head, and hold it longer.',
    icon: Brain,
    band: 'from-violet-500 to-indigo-600',
    tint: 'bg-violet-50/60',
    ring: 'ring-violet-100 group-hover:ring-violet-300',
    chip: 'bg-violet-100 text-violet-700',
    pill: 'bg-violet-600',
    thumb: 'bg-violet-50',
    glow: 'shadow-violet-500/30',
    games: [
      { id: 'memory-match', name: 'Memory Match', blurb: 'Turn two cards at a time and pair them all.', Component: MemoryMatch },
      { id: 'sequence-recall', name: 'Sequence Recall', blurb: 'Watch a growing pattern and play it back.', Component: SequenceRecall },
      { id: 'number-recall', name: 'Number Recall', blurb: 'Memorise a number, then type it back.', Component: NumberRecall },
      { id: 'colour-match', name: 'Colour Match', blurb: 'Tap the ink colour, not the word.', Component: ColourMatch },
      { id: 'spot-the-change', name: 'Spot the Change', blurb: 'One tile changes. Which one was it?', Component: SpotTheChange },
      { id: 'grid-recall', name: 'Grid Recall', blurb: 'Tiles light up, then go dark. Tap the ones that lit.', Component: GridRecall },
      { id: 'reverse-recall', name: 'Reverse Recall', blurb: 'Memorise a number, then type it backwards.', Component: ReverseRecall },
      { id: 'seen-before', name: 'Seen Before', blurb: 'A set flashes up. Which one did you see?', Component: SeenBefore },
      { id: 'dot-count', name: 'Dot Count', blurb: 'How many dots of one colour? Count fast.', Component: DotCount },
      { id: 'match-back', name: 'Match Back', blurb: 'Is this letter the same as the one before?', Component: MatchBack }
    ]
  },
  {
    key: 'logic',
    name: 'Logic & Deduction',
    blurb: 'Reason from clues to the only answer that fits.',
    icon: Puzzle,
    band: 'from-sky-500 to-blue-700',
    tint: 'bg-sky-50/60',
    ring: 'ring-sky-100 group-hover:ring-sky-300',
    chip: 'bg-sky-100 text-sky-700',
    pill: 'bg-sky-600',
    thumb: 'bg-sky-50',
    glow: 'shadow-sky-500/30',
    games: [
      { id: 'code-breaker', name: 'Code Breaker', blurb: 'Crack a four-colour code from the feedback.', Component: CodeBreaker },
      { id: 'next-in-sequence', name: 'Next in Sequence', blurb: 'Spot the rule, then continue the run.', Component: NextInSequence },
      { id: 'odd-one-out', name: 'Odd One Out', blurb: 'Three belong together. One does not.', Component: OddOneOut },
      { id: 'deduction', name: 'Deduction', blurb: 'Does the conclusion actually follow?', Component: Deduction },
      { id: 'lights-out', name: 'Lights Out', blurb: 'Turn every light off. Taps flip neighbours.', Component: LightsOut },
      { id: 'tic-tac-toe', name: 'Tic-Tac-Toe', blurb: 'Beat a computer that gets sharper every level.', Component: TicTacToe },
      { id: 'mini-sudoku', name: 'Mini Sudoku', blurb: 'A four-by-four grid, solved against the clock.', Component: MiniSudoku },
      { id: 'scale-balance', name: 'Scale Balance', blurb: 'Read the scales and find the heaviest.', Component: ScaleBalance },
      { id: 'shape-matrix', name: 'Shape Matrix', blurb: 'Spot the rule and finish the grid.', Component: ShapeMatrix },
      { id: 'spin-match', name: 'Spin Match', blurb: 'Which one is the same shape, only turned?', Component: SpinMatch },
      { id: 'last-stone', name: 'Last Stone', blurb: 'Take one, two or three. Take the last and win.', Component: LastStone }
    ]
  },
  {
    key: 'vocab',
    name: 'Vocabulary & Linguistics',
    blurb: 'Words worth knowing, found under pressure.',
    icon: Type,
    band: 'from-fuchsia-500 to-purple-700',
    tint: 'bg-fuchsia-50/60',
    ring: 'ring-fuchsia-100 group-hover:ring-fuchsia-300',
    chip: 'bg-fuchsia-100 text-fuchsia-700',
    pill: 'bg-fuchsia-600',
    thumb: 'bg-fuchsia-50',
    glow: 'shadow-fuchsia-500/30',
    games: [
      { id: 'word-scramble', name: 'Word Scramble', blurb: 'Unscramble the word from its letters and a clue.', Component: WordScramble },
      { id: 'synonym-match', name: 'Synonym Match', blurb: 'Pick the option that means the same.', Component: SynonymMatch },
      { id: 'sentence-gap', name: 'Sentence Gap', blurb: 'Choose the word that fits the sentence.', Component: SentenceGap },
      { id: 'spelling-fix', name: 'Spelling Fix', blurb: 'One of these four is spelled correctly.', Component: SpellingFix },
      { id: 'word-roots', name: 'Word Roots', blurb: 'What does this prefix or root mean?', Component: WordRoots },
      { id: 'typing-sprint', name: 'Typing Sprint', blurb: 'Type the word exactly, fast, and learn it on the way.', Component: TypingSprint },
      { id: 'antonym-match', name: 'Antonym Match', blurb: 'Pick the word that means the opposite.', Component: AntonymMatch },
      { id: 'idiom-sense', name: 'Idiom Sense', blurb: 'What does the phrase really mean?', Component: IdiomSense },
      { id: 'tense-pick', name: 'Tense Pick', blurb: 'Go, went, gone — pick the right past tense.', Component: TensePick },
      { id: 'sound-alike', name: 'Sound Alike', blurb: 'Their, there or they’re? Only one fits.', Component: SoundAlike }
    ]
  },
  {
    key: 'math',
    name: 'Math & Speed Processing',
    blurb: 'Arithmetic, fast, while the clock runs.',
    icon: Zap,
    band: 'from-amber-500 to-orange-600',
    tint: 'bg-amber-50/60',
    ring: 'ring-amber-100 group-hover:ring-amber-300',
    chip: 'bg-amber-100 text-amber-700',
    pill: 'bg-amber-600',
    thumb: 'bg-amber-50',
    glow: 'shadow-amber-500/30',
    games: [
      { id: 'math-sprint', name: 'Math Sprint', blurb: 'Sixty seconds. Answer as many as you can.', Component: MathSprint },
      { id: 'quick-compare', name: 'Quick Compare', blurb: 'Tap the side with the larger value.', Component: QuickCompare },
      { id: 'missing-operator', name: 'Missing Operator', blurb: 'Which sign makes the equation true?', Component: MissingOperator },
      { id: 'percent-snap', name: 'Percent Snap', blurb: 'Percentages, in your head, against the clock.', Component: PercentSnap },
      { id: 'running-total', name: 'Running Total', blurb: 'Numbers arrive one at a time. Keep the total.', Component: RunningTotal },
      { id: 'binary-blitz', name: 'Binary Blitz', blurb: 'Read binary as fast as you read decimal.', Component: BinaryBlitz },
      { id: 'speed-sort', name: 'Speed Sort', blurb: 'Tap the numbers from smallest to largest.', Component: SpeedSort },
      { id: 'number-bonds', name: 'Number Bonds', blurb: 'Tap the two tiles that make the target.', Component: NumberBonds },
      { id: 'rounding-rush', name: 'Rounding Rush', blurb: 'Round it to the nearest ten, hundred or thousand.', Component: RoundingRush },
      { id: 'fraction-match', name: 'Fraction Match', blurb: 'Which fraction is worth the same amount?', Component: FractionMatch },
      { id: 'clock-read', name: 'Clock Read', blurb: 'Read the hands and pick the time.', Component: ClockRead }
    ]
  }
];

/*
 * The reference sheet gives each card its own pastel rather than one colour
 * per category, so a row reads as a set of distinct things instead of five
 * copies. Six themes, cycled by position.
 *
 * Written out in full for the same reason as the category palettes above:
 * Tailwind scans the source text, so a class built from a variable compiles
 * to no CSS at all.
 */
const CARD_THEMES = [
  {
    wash: 'from-violet-50 via-purple-50 to-fuchsia-50',
    ring: 'ring-violet-100',
    chip: 'bg-violet-100 text-violet-700',
    play: 'bg-violet-600 hover:bg-violet-700 shadow-violet-500/30',
    glow: 'rgb(139 92 246 / 0.42)'
  },
  {
    wash: 'from-amber-50 via-orange-50 to-yellow-50',
    ring: 'ring-amber-100',
    chip: 'bg-orange-100 text-orange-700',
    play: 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/30',
    glow: 'rgb(249 115 22 / 0.40)'
  },
  {
    wash: 'from-sky-50 via-blue-50 to-indigo-50',
    ring: 'ring-sky-100',
    chip: 'bg-sky-100 text-sky-700',
    play: 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30',
    glow: 'rgb(59 130 246 / 0.42)'
  },
  {
    wash: 'from-rose-50 via-pink-50 to-fuchsia-50',
    ring: 'ring-pink-100',
    chip: 'bg-pink-100 text-pink-700',
    play: 'bg-pink-600 hover:bg-pink-700 shadow-pink-500/30',
    glow: 'rgb(236 72 153 / 0.40)'
  },
  {
    wash: 'from-emerald-50 via-teal-50 to-green-50',
    ring: 'ring-emerald-100',
    chip: 'bg-emerald-100 text-emerald-700',
    play: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30',
    glow: 'rgb(16 185 129 / 0.40)'
  },
  {
    wash: 'from-teal-50 via-cyan-50 to-sky-50',
    ring: 'ring-teal-100',
    chip: 'bg-teal-100 text-teal-700',
    play: 'bg-teal-600 hover:bg-teal-700 shadow-teal-500/30',
    glow: 'rgb(20 184 166 / 0.40)'
  }
];

/**
 * The element that scrolls the page: the layout's main panel, or the window
 * when the page is not inside one. Found by walking up from the hub rather
 * than named, so a change to the layout cannot quietly break the return.
 */
const scrollerOf = (el) => {
  let node = el?.parentElement;
  while (node && node !== document.body) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) return node;
    node = node.parentElement;
  }
  return null;
};

/** A few sparkles scattered over the artwork, as on the reference sheet. */
const SPARKS = [
  { top: '12%', left: '9%', size: 'h-3.5 w-3.5', tint: 'text-amber-300' },
  { top: '24%', right: '11%', size: 'h-2.5 w-2.5', tint: 'text-violet-400' },
  { bottom: '20%', left: '14%', size: 'h-2.5 w-2.5', tint: 'text-pink-400' },
  { bottom: '30%', right: '8%', size: 'h-4 w-4', tint: 'text-amber-300' },
  { top: '50%', left: '5%', size: 'h-2 w-2', tint: 'text-sky-400' }
];

/**
 * One game card.
 *
 * Built to the reference sheet: the artwork leads on a pastel wash of the
 * card's own colour, the reward sits in a white pill top right, and the level
 * and the play button share the foot of the card. Each card takes a different
 * pastel so a row reads as a set of distinct games rather than five of the
 * same thing. The `fp-game-*` classes (career.css) carry the motion: a
 * staggered pop-in, artwork that bobs over a lit disc, sparkles that
 * twinkle in turn, a play button whose glow breathes, and under a mouse a
 * tilt that follows the pointer with the artwork floating in parallax.
 *
 * The pill shows stars, not XP. Games award no XP here, deliberately — XP
 * measures work on the roadmap, and a card promising some would be making a
 * promise the product does not keep.
 */
function GameCard({ game, theme, index, reached, stars, recent, onPlay, pill = null, chip = null, playLabel = null, disabled = false, art = null, action = null }) {
  const started = reached > 1;
  const ref = useRef(null);
  const frame = useRef(0);
  const [settling, setSettling] = useState(false);

  // The tilt. The pointer's offset from the card's centre, each axis
  // -1..1, goes into two custom properties; the CSS turns them into the
  // rotation, the drifting highlight and the artwork's parallax. Writes are
  // batched to one per frame so a fast mouse never queues up style work.
  const track = (e) => {
    const el = ref.current;
    if (!el || e.pointerType !== 'mouse') return;
    const rect = el.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const py = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty('--fp-px', Math.max(-1, Math.min(1, px)).toFixed(3));
      el.style.setProperty('--fp-py', Math.max(-1, Math.min(1, py)).toFixed(3));
      el.style.setProperty('--fp-hover', '1');
    });
    if (settling) setSettling(false);
  };
  const release = () => {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(frame.current);
    el.style.setProperty('--fp-px', '0');
    el.style.setProperty('--fp-py', '0');
    el.style.setProperty('--fp-hover', '0');
    setSettling(true);
  };
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onPlay(game)}
      disabled={disabled}
      onPointerMove={track}
      onPointerLeave={release}
      onBlur={release}
      data-settling={settling ? 'true' : undefined}
      data-game={game.id}
      style={{ '--fp-game-glow': theme.glow, '--fp-i': index }}
      className={`fp-press fp-game-card group flex h-full w-full flex-col overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br text-left ring-1 ring-inset ${theme.wash} ${theme.ring} ${recent ? 'fp-game-recent' : ''}`}
      aria-label={recent ? `${game.name}, your last game` : undefined}
    >
      {/* ---- The artwork, floating over a lit disc ---------------------- */}
      {/* A group card's artwork: the picture's own shape (800 × 500) at any width, so it is never cropped. */}
      <span className={`relative flex items-center justify-center overflow-hidden ${art ? 'w-full shrink-0' : 'h-24 sm:h-36'}`} style={art ? { aspectRatio: '8 / 5' } : undefined}>
        {/* Only one card on the page carries this: the game opened last. */}
        {recent && (
          <span className="fp-game-recent-tag absolute top-2 left-2 z-10 inline-flex sm:top-3 sm:left-3 items-center gap-1 rounded-full bg-[#173a63] px-2.5 py-1 text-[0.65rem] font-black tracking-wide text-white uppercase">
            <History className="h-3 w-3" />
            Last played
          </span>
        )}
        {/* The group games (2026-11-02, the reference sheets): the game's own 3D artwork fills the top,
            fading into the card's wash. The solo games keep their icon on its lit disc. */}
        {art ? <>
          <img src={art} alt="" aria-hidden loading="lazy" draggable="false" className="absolute inset-0 h-full w-full object-cover" />
          {/* The art ends in a soft wave of the card's wash, as on the reference (2026-11-02), a fine light line along it. */}
          <svg aria-hidden viewBox="0 0 100 16" preserveAspectRatio="none" className="absolute inset-x-0 -bottom-px h-[18%] w-full">
            <path d="M0,16 L0,9 C18,2 34,3 52,8 C70,13 86,10 100,4 L100,16 Z" fill={theme.fade} />
            <path d="M0,9 C18,2 34,3 52,8 C70,13 86,10 100,4" fill="none" stroke="rgb(255 255 255 / 0.85)" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
          </svg>
        </> : <>
        <span aria-hidden className="fp-game-disc" />
        <span aria-hidden className="fp-game-floor" />
        {SPARKS.map((sp, i) => (
          <Sparkles
            key={i}
            aria-hidden
            className={`fp-game-spark pointer-events-none absolute ${sp.size} ${sp.tint}`}
            style={{
              top: sp.top,
              left: sp.left,
              right: sp.right,
              bottom: sp.bottom,
              '--fp-spark-i': i
            }}
          />
        ))}

        <span className="fp-game-float">
          <GameThumb id={game.thumb || game.id} className="fp-game-art h-16 w-16 sm:h-24 sm:w-24" />
        </span>
        </>}

        {/* The reward, in a white pill, exactly where the sheet puts it. */}
        {/* `pill={false}`: none (the group games). */}
        {pill !== false && (
          <span className="fp-game-pill absolute top-2 right-2 inline-flex sm:top-3 sm:right-3 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[0.7rem] font-black text-ink-800 tabular-nums">
            {pill || <><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{stars}</>}
          </span>
        )}
      </span>

      {/* ---- The words and the two controls ---------------------------- */}
      <span className="flex flex-1 flex-col px-3 pb-3 sm:px-4 sm:pb-4">
        <span className={`block truncate leading-tight font-black ${art ? '-mt-1 text-sm text-[#1b1d3a] sm:text-xl' : 'text-sm text-[#173a63] sm:text-base'}`}>{game.name}</span>
        {/* Two lines at most, and room for two always: every card the same height. */}
        <span className={`mt-1.5 hidden sm:block ${art ? 'line-clamp-3 min-h-[3.4rem] text-[13px] leading-snug text-[#2b2f4a]' : 'line-clamp-2 min-h-[2.1rem] text-xs leading-snug text-slate-500'}`}>{game.blurb}</span>

        <span className="mt-auto flex items-center justify-between gap-2 pt-2 sm:pt-3.5">
          {/* `chip={false}`: none (a group game that is on); the play button keeps its place on the right. */}
          {/* `action`: a second button in the chip's place, on a phone too (Join room on the group cards, 2026-11-04). */}
          {action ? (
            <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); action.onClick(); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); action.onClick(); } }}
              className={`inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-black transition hover:brightness-95 sm:px-3 sm:py-2 sm:text-sm ${theme.chip}`} data-card-action>
              {action.label}
            </span>
          ) : chip !== false ? (
            <span className={`fp-game-chip hidden min-w-0 items-center sm:inline-flex gap-1.5 truncate rounded-xl px-2.5 py-1.5 text-xs font-black ${theme.chip}`}>
              {chip || <><Layers className="h-3.5 w-3.5" />Level {started ? reached : 1}</>}
            </span>
          ) : <span />}

          <span className={`fp-game-play inline-flex ${action ? 'flex-1' : 'w-full'} shrink-0 items-center justify-center gap-1.5 rounded-full py-1.5 pr-3 pl-1.5 text-xs font-black sm:w-auto sm:justify-start sm:py-2 sm:pr-4 sm:pl-2 sm:text-sm text-white transition-colors ${theme.play}`}>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/25">
              <Play className="h-2.5 w-2.5 fill-current" />
            </span>
            {playLabel || (recent ? 'Continue' : 'Play')}
          </span>
        </span>
      </span>
    </button>
  );
}

/* ---- Group games (Group Brain) ------------------------------------------
 *
 * The same page as the solo games — the banner over the sky, the category
 * pills, the very same cards — for the ten games played with friends in
 * rooms. A card's button makes a room (after picking how many play); the
 * banner's panel, where the solo games show their leaderboard, joins a
 * friend's room by its code. The room's lobby and its game are the live
 * game page (competitions/GamePage.jsx). Each game pays XP by finishing
 * place: 1st the most.
 */
// The ten, mixed rather than grouped by kind: a memory game, a logic game,
// a word game, a strategy game, and round again.
// Then the solo games that are questions and answers, as group games too (2026-10-29).
const GROUP_ORDER = ['chess', 'memorymatrix', 'patternmaster', 'wordlogic', 'sequence', 'numberlogic', 'spatialiq', 'sudoku', 'deduction', 'finalvault', 'lostkingdom', 'synonymmatch', 'antonymmatch', 'idiomsense', 'sentencegap', 'soundalike', 'wordroots', 'spellingfix', 'tensepick', 'oddoneout', 'percentsnap', 'binaryblitz', 'roundingrush', 'fractionmatch', 'quickcompare', 'scalebalance', 'colourmatch', 'dotcount', 'clockread', 'shapematrix', 'numberrecall', 'reverserecall', 'seenbefore', 'spotthechange', 'matchback', 'runningtotal', 'memorymatch', 'lightsout', 'codebreaker', 'typingsprint', 'speedsort', 'numberbonds', 'mathsprint', 'tictactoe', 'laststone'];
/* The group cards' accents (2026-11-02, the reference sheets): a pale wash of the accent under the artwork, a
   glowing edge, a tinted chip and a glossy Play in the accent. `fade` is the wash's top, where the art fades in. */
const GROUP_ACCENTS = {
  gold: { wash: 'from-[#fff6e6] via-[#fdf0dc] to-[#f9e5c4]', ring: 'ring-2 ring-[#e9b25a]/80', chip: 'bg-[#fbe8c6] text-[#8a5a12]', play: 'bg-gradient-to-b from-[#e7a23a] to-[#9a5a0e] hover:brightness-110', glow: 'rgb(233 178 90 / 0.55)', fade: '#fff6e6' },
  violet: { wash: 'from-[#f6f0ff] via-[#efe6ff] to-[#e6d9ff]', ring: 'ring-2 ring-[#a78bfa]/80', chip: 'bg-[#ece3ff] text-[#6d28d9]', play: 'bg-gradient-to-b from-[#8b5cf6] to-[#5b21b6] hover:brightness-110', glow: 'rgb(139 92 246 / 0.55)', fade: '#f6f0ff' },
  blue: { wash: 'from-[#eff6ff] via-[#e6efff] to-[#dbe7ff]', ring: 'ring-2 ring-[#60a5fa]/80', chip: 'bg-[#dfeaff] text-[#1d4ed8]', play: 'bg-gradient-to-b from-[#3b82f6] to-[#1e3a8a] hover:brightness-110', glow: 'rgb(59 130 246 / 0.55)', fade: '#eff6ff' },
  pink: { wash: 'from-[#fff0f6] via-[#ffe6f1] to-[#ffd9ea]', ring: 'ring-2 ring-[#f472b6]/80', chip: 'bg-[#ffe1ee] text-[#be185d]', play: 'bg-gradient-to-b from-[#ec4899] to-[#9d174d] hover:brightness-110', glow: 'rgb(236 72 153 / 0.5)', fade: '#fff0f6' },
  green: { wash: 'from-[#effdf3] via-[#e5f9ec] to-[#d6f3e0]', ring: 'ring-2 ring-[#4ade80]/80', chip: 'bg-[#dcf6e5] text-[#15803d]', play: 'bg-gradient-to-b from-[#22c55e] to-[#14532d] hover:brightness-110', glow: 'rgb(34 197 94 / 0.5)', fade: '#effdf3' },
  orange: { wash: 'from-[#fff5ec] via-[#ffeedd] to-[#ffe2c7]', ring: 'ring-2 ring-[#fb923c]/80', chip: 'bg-[#ffe7d1] text-[#c2410c]', play: 'bg-gradient-to-b from-[#f97316] to-[#9a3412] hover:brightness-110', glow: 'rgb(249 115 22 / 0.5)', fade: '#fff5ec' },
  teal: { wash: 'from-[#ecfdfa] via-[#e1f8f4] to-[#d0f1eb]', ring: 'ring-2 ring-[#2dd4bf]/80', chip: 'bg-[#d6f5ef] text-[#0f766e]', play: 'bg-gradient-to-b from-[#14b8a6] to-[#115e59] hover:brightness-110', glow: 'rgb(20 184 166 / 0.5)', fade: '#ecfdfa' }
};
const GROUP_ACCENT = {
  chess: 'gold', memorymatrix: 'violet', patternmaster: 'blue', wordlogic: 'pink', sequence: 'green',
  numberlogic: 'green', spatialiq: 'violet', sudoku: 'orange', deduction: 'blue', finalvault: 'pink',
  lostkingdom: 'green', synonymmatch: 'teal', antonymmatch: 'violet', idiomsense: 'orange', sentencegap: 'blue',
  soundalike: 'pink', wordroots: 'green', spellingfix: 'teal', tensepick: 'violet', oddoneout: 'orange',
  percentsnap: 'blue', binaryblitz: 'pink', roundingrush: 'green', fractionmatch: 'teal', quickcompare: 'violet',
  scalebalance: 'orange', colourmatch: 'blue', dotcount: 'pink', clockread: 'green', shapematrix: 'teal',
  numberrecall: 'gold', reverserecall: 'violet', seenbefore: 'blue', spotthechange: 'pink', matchback: 'green',
  runningtotal: 'green', memorymatch: 'violet', lightsout: 'orange', codebreaker: 'blue', typingsprint: 'pink',
  speedsort: 'green', numberbonds: 'teal', mathsprint: 'violet', tictactoe: 'orange', laststone: 'blue'
};
// The artwork each group game borrows from the solo games' set.
const GROUP_THUMBS = { chess: 'chess', memorymatrix: 'grid-recall', sequence: 'sequence-recall', patternmaster: 'next-in-sequence', numberlogic: 'missing-operator', sudoku: 'mini-sudoku', deduction: 'scale-balance', lostkingdom: 'compass', finalvault: 'vault', wordlogic: 'word-scramble', spatialiq: 'spin-match', synonymmatch: 'synonym-match', antonymmatch: 'antonym-match', idiomsense: 'idiom-sense', sentencegap: 'sentence-gap', soundalike: 'sound-alike', wordroots: 'word-roots', spellingfix: 'spelling-fix', tensepick: 'tense-pick', oddoneout: 'odd-one-out', percentsnap: 'percent-snap', binaryblitz: 'binary-blitz', roundingrush: 'rounding-rush', fractionmatch: 'fraction-match', quickcompare: 'quick-compare', scalebalance: 'scale-balance', colourmatch: 'colour-match', dotcount: 'dot-count', clockread: 'clock-read', shapematrix: 'shape-matrix', numberrecall: 'number-recall', reverserecall: 'reverse-recall', seenbefore: 'seen-before', spotthechange: 'spot-the-change', matchback: 'match-back', runningtotal: 'running-total', memorymatch: 'memory-match', lightsout: 'lights-out', codebreaker: 'code-breaker', typingsprint: 'typing-sprint', speedsort: 'speed-sort', numberbonds: 'number-bonds', mathsprint: 'math-sprint', tictactoe: 'tic-tac-toe', laststone: 'last-stone' };
const playRoom = (navigate, id) => navigate(`/games/play/${id}`, { state: { from: 'group' } });

// Every solo game's name, by id, for the unlock notes.
const SOLO_NAMES = Object.fromEntries(CATEGORIES.flatMap((c) => c.games.map((g) => [g.id, g.name])));
const needOf = (unlocks, players) => {
  const sizes = Object.keys(unlocks?.need || {}).map(Number).sort((a, b) => a - b);
  return unlocks?.need?.[sizes.find((s) => s >= players) || sizes[sizes.length - 1]] || 0;
};
const soloOf = (unlocks, id) => (unlocks?.games?.[id]?.solo ? SOLO_NAMES[unlocks.games[id].solo] || 'its solo game' : 'any solo game');
/** "Clear 20 levels of Grid Recall in Solo games to play with 2 players (you have cleared 7)." */
const lockText = (unlocks, id, players) => `Clear ${needOf(unlocks, players)} levels of ${soloOf(unlocks, id)} in Solo games to play with ${players} players (you have cleared ${unlocks?.games?.[id]?.cleared || 0}).`;
/** The next room size to unlock, and what it takes. */
const nextUnlock = (unlocks, id) => {
  const g = unlocks?.games?.[id];
  const next = ROOM_SIZES.find((n) => !g?.sizes?.includes(n));
  return next ? `🔒 ${next}+ players: clear ${needOf(unlocks, next)} levels of ${soloOf(unlocks, id)} (you have ${g?.cleared || 0}).` : '';
};


/* How each group game is played, in four clear points (2026-11-02), shown in its popup. */
const QUIZ_RULES = (what) => [
  `Everyone gets the same ${what} at the same time.`,
  'Pick the right answer before the timer runs out — tap it, or press 1–4.',
  'A right answer scores +100, a wrong one −20. No answer scores nothing.',
  'After each question the answer is shown. Highest score after the last question wins.'
];
const HOW_TO_PLAY = {
  chess: ['Two players, full chess rules: castling, en passant and promotion.', 'Tap one of your pieces, then the square to move it to — the dots show where it can go.', 'Each player has a clock that runs on their turn. Run out of time and you lose.', 'Checkmate wins. You can also offer a draw; stalemate is a draw.'],
  memorymatrix: ['Cells on the grid light up for a moment, then go dark.', 'Tap exactly the cells that lit up — every cell, no extras.', 'The grid grows and more cells light up each round.', 'A wrong tap ends your run. Most rounds cleared wins.'],
  sequence: ['Watch the sequence of tiles light up, one after another.', 'Tap them back in the same order.', 'Each round the sequence gets longer; some rounds test your reaction — tap as fast as you can.', 'Highest score after the last round wins.'],
  sudoku: ['Everyone solves the same 9×9 Sudoku against the clock.', 'Fill each row, column and 3×3 box with the numbers 1 to 9.', 'Mistakes and hints cost points; five mistakes and you are out.', 'Finish first with the fewest mistakes to win.'],
  wordlogic: ['Anagrams, analogies, odd one out, opposites and spelling.', 'Everyone gets the same question at once: pick the right word before time runs out — tap it or press 1–4.', 'Right +100, wrong −20. No answer scores nothing.', 'Highest score after the last question wins.'],
  patternmaster: QUIZ_RULES('pattern — find the missing shape, arrow or number'),
  numberlogic: QUIZ_RULES('number puzzle'),
  deduction: QUIZ_RULES('logic puzzle — read the clues and rule things out'),
  spatialiq: QUIZ_RULES('picture puzzle — rotations, mirrors, folds and nets'),
  lostkingdom: ['Five trials stand between you and the treasure of Aurelia.', 'Each trial is a puzzle of numbers, knowledge or logic — solve it to move on.', 'Wrong answers cost you time; the puzzles are new every game.', 'Reach the treasure first to win.'],
  finalvault: ['Five temple chambers, the same puzzles for everyone.', 'Solve each chamber’s puzzle to open the next.', 'Wrong answers cost you time.', 'The first to open the treasure vault wins.'],
  tictactoe: ['Two players take turns placing X and O on a 3×3 board.', 'Three in a row — across, down or diagonally — wins the round.', 'A full board with no line is a draw.', 'Best of five rounds wins the game.'],
  laststone: ['Two players take turns taking 1, 2 or 3 stones from the pile.', 'You must take at least one stone each turn.', 'Think ahead: leave your opponent a pile they cannot win from.', 'Whoever takes the last stone wins the round — best of five wins.']
};
const howToPlay = (id) => {
  if (HOW_TO_PLAY[id]) return HOW_TO_PLAY[id];
  const g = GROUP_GAMES[id];
  if (g?.table === 'race') return ['Everyone gets the same puzzle at the same time.', g.blurb, 'Solve it as fast and as accurately as you can — mistakes cost points.', 'Highest score when everyone has finished wins.'];
  return QUIZ_RULES(`question — ${(g?.blurb || '').replace(/\.$/, '').replace(/^./, (c) => c.toLowerCase())}`);
};

function GroupHub() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState(null);
  const [room, setRoom] = useState(null);
  const [catalog, setCatalog] = useState({});
  const [picking, setPicking] = useState(null);     // the game whose room is being made
  const [level] = useState('medium');
  const [size, setSize] = useState(4);              // how many the room is for: 2 to 20
  const [choosing, setChoosing] = useState(null);   // the game whose card was pressed: Create room or Play online
  const [joining, setJoining] = useState(false);     // that popup showing its "Join room" code box
  const [joinFor, setJoinFor] = useState(null);     // a card's Join: the code popup (2026-11-04)
  const [online, setOnline] = useState(null);       // Play online: { game, players, fee }
  const [fees, setFees] = useState({ fees: [0, 10, 25, 50], prizeShare: 0.9, waitSeconds: 30 });
  // Earned in the solo games (2026-10-31): each group game's sizes open as its solo twin's levels are cleared.
  const [unlocks, setUnlocks] = useState(null);
  const openSizes = (id) => unlocks?.games?.[id]?.sizes || [];
  const lockNote = (id, players) => lockText(unlocks, id, players);
  // Group games: 30 minutes a day; used up, the section locks until midnight.
  const { left: groupLeft, limit: groupLimit, outOfTime: groupOut } = useGroupTime(false);

  useEffect(() => {
    roomsApi.mine().then(setRoom).catch(() => {});
    roomsApi.games().then((rows) => setCatalog(Object.fromEntries(rows.map((g) => [g.id, g])))).catch(() => {});
    roomsApi.onlineInfo().then(setFees).catch(() => {});
    roomsApi.unlocks().then(setUnlocks).catch(() => {});
  }, []);
  const fail = (e) => setError({ message: e.message, roomId: e.roomId });

  // A shared invitation card's link (/games?mode=group&code=K7Q2XM, 2026-11-03): the code waits in Join a Room.
  const sharedCode = (params.get('code') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  useEffect(() => {
    if (sharedCode.length !== 6) return;
    setCode(sharedCode);
    const next = new URLSearchParams(params); next.delete('code'); setParams(next, { replace: true });
    setTimeout(() => [...document.querySelectorAll('[data-join-room] input')].find((el) => el.offsetParent)?.focus(), 300);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedCode]);
  // An older invitation link (/games?mode=group&join=CODE) joins that room at once.
  const invited = (params.get('join') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  useEffect(() => {
    if (invited.length !== 6) return;
    const next = new URLSearchParams(params); next.delete('join'); setParams(next, { replace: true });
    roomsApi.join(invited).then((r) => playRoom(navigate, r.game.id)).catch(fail);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invited]);

  const join = (e) => {
    e.preventDefault();
    setBusy('join'); setError(null);
    roomsApi.join(code).then((r) => playRoom(navigate, r.game.id)).catch(fail).finally(() => setBusy(''));
  };

  // Play online: a seat at a table of 2 or 4 at the chosen fee; the page then shows the search.
  const playOnline = () => {
    setBusy('online'); setError(null);
    // Create room (2026-11-02): the same card, a private room with a code for friends.
    if (online.room) {
      roomsApi.create(online.game.id, { difficulty: 'medium', players: online.players }).then((r) => { setOnline(null); playRoom(navigate, r.game.id); })
        .catch((e) => { setOnline(null); fail(e); }).finally(() => setBusy(''));
      return;
    }
    roomsApi.online(online.game.id, online.players, online.fee).then((r) => { setOnline(null); playRoom(navigate, r.game.id); })
      .catch((e) => { setOnline(null); fail(e); }).finally(() => setBusy(''));
  };
  const create = () => {
    setBusy('create'); setError(null);
    roomsApi.create(picking.id, { difficulty: level, players: size }).then((r) => playRoom(navigate, r.game.id)).catch((e) => { setPicking(null); fail(e); }).finally(() => setBusy(''));
  };

  return (
    <>
      {/* ---- The banner (2026-11-02): the reference picture itself (public/games/banner, 2910 × 540), with the live parts
          laid exactly over its own — the play time over its pill, the code box and Join Room over its own box and
          button. Positions are the picture's, in % of it; text in cqw of the banner. On a phone: the picture's left
          part (the art and the words), and Join a Room under it. ---- */}
      <section className="relative" data-group-hero>
        <form onSubmit={join} className="relative hidden overflow-hidden rounded-[28px] md:block" style={{ aspectRatio: '2910 / 540', containerType: 'inline-size' }} data-join-room>
          <img src="/games/banner/group-banner.jpg" alt="Group games — Bring your friends. Battle brains together!" draggable="false" className="absolute inset-0 h-full w-full select-none" />
          {groupLeft !== null && (
            <span className="absolute flex items-center justify-center gap-[0.5cqw] bg-[#15130f] font-black whitespace-nowrap text-white"
              style={{ left: '23.7%', top: '78.1%', width: '16.3%', height: '10.4%', fontSize: '1.15cqw' }} data-group-time>
              {groupOut ? <Moon style={{ width: '1.3cqw', height: '1.3cqw' }} /> : <Timer style={{ width: '1.3cqw', height: '1.3cqw' }} />}
              {groupOut ? 'Play time used — back at midnight' : `${clock(groupLeft)} of play left today`}
            </span>
          )}
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} aria-label="Room code" autoCapitalize="characters" data-room-code-input
            className={`absolute rounded-[1.1cqw] text-center font-mono tracking-[0.3em] text-slate-900 outline-none focus:ring-2 focus:ring-violet-500/50 ${code ? 'bg-white' : 'bg-transparent'}`}
            style={{ left: '73.75%', top: '40.2%', width: '22.8%', height: '19.4%', fontSize: '1.5cqw' }} />
          <button type="submit" disabled={code.length !== 6 || !!busy || groupOut} aria-label="Join room"
            className="absolute rounded-full transition hover:bg-white/10 disabled:cursor-not-allowed"
            style={{ left: '73.65%', top: '65.2%', width: '23%', height: '18.5%' }}>
            {busy === 'join' && <span className="absolute inset-0 flex items-center justify-center rounded-full bg-[#5b2ee0]"><Loader2 className="animate-spin text-white" style={{ width: '1.6cqw', height: '1.6cqw' }} /></span>}
          </button>
          {groupOut && <span aria-hidden className="pointer-events-none absolute rounded-[2cqw] bg-black/35" style={{ left: '71.6%', top: '10%', width: '27%', height: '81%' }} />}
        </form>

        {/* A phone: the banner tall (2026-11-04) — the one wide picture in three pieces: its words and play-time pill
            across the top, its two sides (the knight; the trophy and controller) side by side under them. Each piece is
            the picture itself, cut by background size and position, so nothing is cropped away. */}
        <div className="md:hidden">
          {(() => {
            const IMG = 'url(/games/banner/group-banner-left.jpg)';
            // A piece from a to b across the picture (shares of its width), its whole height (insetting the rounded corners on the sides).
            const piece = (a, b, inset = 0) => ({
              aspectRatio: `${((b - a) * 2070)} / ${540 * (1 - inset * 2)}`,
              backgroundImage: IMG, backgroundRepeat: 'no-repeat',
              backgroundSize: `${100 / (b - a)}% ${100 / (1 - inset * 2)}%`,
              backgroundPosition: `${(a / (1 - (b - a))) * 100}% 50%`
            });
            return (
              <div role="img" aria-label="Group games — Bring your friends. Battle brains together!" className="overflow-hidden rounded-3xl bg-[#121016] shadow-[0_18px_36px_-16px_rgba(30,20,90,.7)] ring-1 ring-[#e9b25a]/40">
                <div className="relative w-full" style={{ ...piece(0.27, 0.73), containerType: 'inline-size' }}>
                  {groupLeft !== null && (
                    <span className="absolute flex items-center justify-center gap-[1.4cqw] rounded-full bg-[#15130f] font-black whitespace-nowrap text-white"
                      style={{ left: '13%', top: '77.4%', width: '51%', height: '11.8%', fontSize: '3.5cqw' }} data-group-time>
                      {groupOut ? <Moon style={{ width: '3.8cqw', height: '3.8cqw' }} /> : <Timer style={{ width: '3.8cqw', height: '3.8cqw' }} />}
                      {groupOut ? 'Play time used' : `${clock(groupLeft)} of play left today`}
                    </span>
                  )}
                </div>
                <div className="flex">
                  <div style={{ ...piece(0.015, 0.29, 0.06), flex: '1.198 1 0' }} />
                  <div style={{ ...piece(0.64, 0.985, 0.06), flex: '1.503 1 0' }} />
                </div>
              </div>
            );
          })()}
          {/* Join a Room, small (2026-11-04): the code box and the button on one line. */}
          <form onSubmit={join} className="mt-3 rounded-2xl border border-[#e9b25a] bg-[#f8efe0] p-2.5 shadow-[0_0_16px_rgba(245,180,70,.3)]" data-join-room>
            <p className="flex items-center gap-1.5 px-1 text-sm font-black text-[#14122a]"><Link2 className="h-4 w-4 text-violet-600" /> Join a Room</p>
            <div className="mt-2 flex gap-2">
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} placeholder="Paste code" autoCapitalize="characters" aria-label="Room code"
                className="min-w-0 flex-1 rounded-xl bg-white px-3 py-2 text-center font-mono text-base tracking-[0.25em] text-slate-900 shadow-sm placeholder:font-sans placeholder:text-sm placeholder:tracking-normal placeholder:text-slate-400 focus:ring-2 focus:ring-violet-500/30 focus:outline-none" />
              <button type="submit" disabled={code.length !== 6 || !!busy || groupOut}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-[#7442f0] to-[#4f22c9] px-4 text-sm font-black text-white shadow-md disabled:opacity-60">
                {busy === 'join' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />} Join
              </button>
            </div>
          </form>
        </div>

        {room && (
          <button type="button" onClick={() => playRoom(navigate, room.id)} data-my-room
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-black text-emerald-700 shadow-sm ring-1 ring-emerald-200 ring-inset">
            <DoorOpen className="h-3.5 w-3.5" /> You are in a {room.label} room ({room.code}) — open it
          </button>
        )}
      </section>

      {error && (
        <p role="alert" className="flex flex-wrap items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200 ring-inset">
          {error.message}
          {error.roomId && <button type="button" onClick={() => playRoom(navigate, error.roomId)} className="rounded-full bg-white px-3 py-1 text-xs font-black text-rose-700 ring-1 ring-rose-200">Open my room</button>}
        </p>
      )}

      {/* Today's 30 minutes used: the section is locked until midnight. */}
      {groupOut && (
        <div className="flex items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3.5 text-white shadow-lg" role="status" data-group-locked>
          <Lock className="h-5 w-5 shrink-0 text-amber-300" />
          <p className="text-sm font-semibold"><span className="font-black">Group games are locked for today.</span> You have played your {limitWords(groupLimit)} — they open again at midnight. Solo games are still open.</p>
        </div>
      )}

      {/* ---- Every group game, four to a row, in the solo games' cards ---- */}
      <div className={`grid auto-rows-fr grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 ${groupOut ? 'pointer-events-none opacity-50 grayscale' : ''}`} aria-disabled={groupOut || undefined} data-group-games>
        {GROUP_ORDER.map((id, i) => {
          const g = GROUP_GAMES[id];
          const off = catalog[id]?.enabled === false;
          const locked = unlocks && !openSizes(id).length;
          return (
            // As the solo cards (2026-10-31): the pop-in staggered row by row, not down all forty-odd cards (the last
            // ones sat hidden for seconds, and would not take the hover), and a chip on the left of Play.
            // Each card its own 3D stage (2026-11-02): one stage round all forty-odd cards (nine rows) viewed the ones far
            // from its middle at a slant, so their tilt skewed — the solo categories are short, so theirs looked right.
            <div key={id} className="fp-game-stage h-full">
            <GameCard index={i % 8} theme={GROUP_ACCENTS[GROUP_ACCENT[id]] || CARD_THEMES[i % CARD_THEMES.length]}
              art={GROUP_ACCENT[id] ? `/games/group/${id}.jpg` : null}
              game={{ id, thumb: GROUP_THUMBS[id], name: g.label, blurb: g.blurb }}
              pill={false} chip={off ? <span className="whitespace-nowrap">Not available</span>
                : locked ? <span className="inline-flex items-center gap-1 whitespace-nowrap" title={lockNote(id, 2)} data-group-locked={id}><Lock className="h-3.5 w-3.5 shrink-0" />{unlocks.games[id]?.cleared || 0}/{unlocks.need[2]}</span>
                  : null}
              action={off || locked ? null : { label: <><Link2 className="h-3.5 w-3.5 shrink-0" />Join</>, onClick: () => { setError(null); setCode(''); setJoinFor({ id, ...g }); } }}
              playLabel={<span className="whitespace-nowrap">Play</span>} disabled={off || !!busy} onPlay={(game) => { setError(null); setChoosing(game); }} />
            </div>
          );
        })}
      </div>

      {/* ---- A card's Join: paste the code a friend shared; Join only once it is all there. ---- */}
      {joinFor && (
        <Portal>
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md" onClick={() => setJoinFor(null)}>
            <form onSubmit={join} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Join a ${joinFor.label} room`} data-join-popup
              className="relative w-full max-w-sm rounded-[28px] border border-white/10 bg-[#0b1020] p-5 text-white shadow-[0_40px_80px_-20px_rgba(0,0,0,.9)] sm:p-6">
              <button type="button" onClick={() => setJoinFor(null)} aria-label="Close" className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"><X className="h-4 w-4" /></button>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-b from-amber-300 to-amber-600 text-amber-950 shadow-[0_10px_20px_-6px_rgba(245,158,11,.6)]"><Link2 className="h-5 w-5" /></span>
              <p className="mt-3 text-xl font-black">Join a friend’s room</p>
              <p className="mt-1 text-sm text-slate-400">Paste the 6-character code your friend shared for {joinFor.label}.</p>
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} placeholder="K7Q2XM" autoFocus autoCapitalize="characters" autoComplete="off" aria-label="Room code" data-room-code-input
                className="mt-4 w-full rounded-xl border border-white/10 bg-black/40 py-3.5 text-center font-mono text-2xl font-bold tracking-[0.45em] text-white shadow-[inset_0_2px_6px_rgba(0,0,0,.6)] outline-none placeholder:text-slate-600 focus:border-amber-400/60" />
              {error && <p className="mt-2 text-xs font-semibold text-rose-400" role="alert">{error.message}</p>}
              <button type="submit" disabled={code.length !== 6 || !!busy || groupOut} data-join-submit
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 py-3 text-base font-black text-amber-950 shadow-[0_8px_20px_-6px_rgba(245,158,11,.6),inset_0_1px_0_rgba(255,255,255,.6)] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40">
                {busy === 'join' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-5 w-5" />} Join room
              </button>
            </form>
          </div>
        </Portal>
      )}

      {/* ---- A card pressed: three choices — Play online, Create room, Join room (a friend's code,
          typed here). A premium dark-glass look with cards that tilt in 3D (asked 2026-10-29). ---- */}
      {choosing && (() => {
        const info = GROUP_GAMES[choosing.id];
        const close = () => { setChoosing(null); setJoining(false); };
        const lockedNow = !!(unlocks && !openSizes(choosing.id).length);
        const seat = (g) => { const open = openSizes(g.id); return isTwo(g.id) ? 2 : open.includes(4) ? 4 : open[0] || 2; };
        // Tilt a card toward the pointer.
        const tilt = (e) => {
          const el = e.currentTarget; const r = el.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width - 0.5; const y = (e.clientY - r.top) / r.height - 0.5;
          el.style.transform = `perspective(700px) rotateX(${(-y * 14).toFixed(2)}deg) rotateY(${(x * 14).toFixed(2)}deg) translateZ(6px)`;
          el.style.setProperty('--gx', `${(x + 0.5) * 100}%`); el.style.setProperty('--gy', `${(y + 0.5) * 100}%`);
        };
        const untilt = (e) => { e.currentTarget.style.transform = ''; };
        const Card = ({ choice, onClick, icon: Icon, accent, glow, label, sub, badge }) => (
          <button type="button" onClick={onClick} disabled={choice !== 'join' && lockedNow} onMouseMove={tilt} onMouseLeave={untilt} data-choice={choice}
            className="group relative flex flex-row items-center gap-3 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[.09] to-white/[.02] p-3 text-left sm:flex-col sm:items-start sm:gap-0 sm:p-4 shadow-[0_18px_40px_-12px_rgba(0,0,0,.8),inset_0_1px_0_rgba(255,255,255,.12)] transition-[transform,border-color] duration-200 ease-out [transform-style:preserve-3d] hover:border-white/25 disabled:cursor-not-allowed disabled:opacity-45 sm:min-h-[12.5rem]">
            {/* A light that follows the pointer. */}
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: `radial-gradient(240px circle at var(--gx,50%) var(--gy,0%), ${glow}, transparent 60%)` }} />
            <span aria-hidden="true" className="pointer-events-none absolute -bottom-10 -left-6 h-24 w-24 rounded-full blur-2xl" style={{ background: glow }} />
            {badge}
            {/* A glossy orb for the icon. */}
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white sm:h-12 sm:w-12 sm:rounded-2xl shadow-[0_10px_20px_-6px_rgba(0,0,0,.7),inset_0_1px_0_rgba(255,255,255,.45),inset_0_-6px_10px_rgba(0,0,0,.25)] [transform:translateZ(30px)]" style={{ background: accent }}>
              <span aria-hidden="true" className="absolute inset-x-1.5 top-1 h-1/2 rounded-xl bg-gradient-to-b from-white/45 to-transparent" />
              <Icon className="relative h-5 w-5" strokeWidth={2.2} />
            </span>
            <span className="relative min-w-0 flex-1 sm:mt-auto sm:flex-none sm:pt-6">
              <span className="block text-sm font-bold tracking-tight text-white sm:text-[15px] [transform:translateZ(20px)]">{label}</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-slate-400 sm:text-xs">{sub}</span>
            </span>
            <ChevronRight aria-hidden className="relative h-4 w-4 shrink-0 text-slate-400 sm:hidden" />
            <span className="relative mt-3 hidden items-center gap-1 sm:inline-flex text-xs font-semibold text-slate-300 transition-colors group-hover:text-white">Continue <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></span>
          </button>
        );
        return (
        <Portal>
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md" onClick={close}>
          <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Play ${info.label}`}
            className="relative max-h-[92dvh] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-[28px] border border-white/10 bg-[#0b1020] p-4 text-white shadow-[0_40px_80px_-20px_rgba(0,0,0,.9),inset_0_1px_0_rgba(255,255,255,.08)] sm:p-7" data-play-choice>
            {/* Soft studio light. */}
            <span aria-hidden="true" className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-indigo-500/25 blur-3xl" />
            <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            <button type="button" onClick={close} aria-label="Close"
              className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white">
              <X className="h-4 w-4" />
            </button>

            <div className="relative flex items-center gap-4 pr-10">
              <span className="relative shrink-0 rounded-2xl bg-gradient-to-b from-white to-slate-200 p-2 shadow-[0_14px_28px_-8px_rgba(0,0,0,.8),inset_0_-3px_0_rgba(0,0,0,.08)]">
                <GameThumb id={GROUP_THUMBS[choosing.id]} className="h-12 w-12 sm:h-14 sm:w-14" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold tracking-[0.2em] text-indigo-300/80 uppercase">Group game</p>
                <p className="truncate text-2xl font-bold tracking-tight">{info.label}</p>
                <p className="mt-0.5 text-xs text-slate-400">{info.players} · XP by place</p>
              </div>
            </div>
            <p className="relative mt-3 text-[13px] leading-relaxed text-slate-300 sm:mt-4 sm:text-sm">{info.blurb}</p>
            <div className="relative mt-3 rounded-2xl border border-white/10 bg-white/[.04] p-3 sm:mt-4 sm:p-4" data-how-to-play>
              <p className="text-[11px] font-semibold tracking-[0.2em] text-indigo-300/80 uppercase">How to play</p>
              <ol className="mt-2.5 space-y-2.5">
                {howToPlay(choosing.id).map((t, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[13px] leading-snug text-slate-200 sm:gap-3 sm:text-sm">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-200 ring-1 ring-indigo-400/40">{i + 1}</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ol>
            </div>
            {lockedNow && (
              <p className="relative mt-3 flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>{lockNote(choosing.id, 2)}</span>
              </p>
            )}

            {!joining ? (
              <div className="relative mt-4 grid gap-2 sm:mt-6 sm:grid-cols-3 sm:gap-3">
                <Card choice="online" icon={Globe} label="Play online" sub="Matched with players online. Winner takes the pot."
                  accent="linear-gradient(160deg,#34d399,#047857)" glow="rgba(16,185,129,.28)"
                  badge={<span className="absolute top-2 right-8 inline-flex sm:top-3.5 sm:right-3.5 items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-emerald-300"><span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" /></span>LIVE</span>}
                  onClick={() => { const g = choosing; close(); setOnline({ game: g, players: seat(g), fee: fees.fees[0] ?? 0 }); }} />
                <Card choice="room" icon={Users} label="Create room" sub="A private room for friends. Share the code."
                  accent="linear-gradient(160deg,#818cf8,#4338ca)" glow="rgba(99,102,241,.28)"
                  onClick={() => { const g = choosing; close(); setOnline({ game: g, room: true, players: seat(g), fee: 0 }); }} />
                <Card choice="join" icon={Link2} label="Join room" sub="Have a code from a friend? Enter it here."
                  accent="linear-gradient(160deg,#fbbf24,#b45309)" glow="rgba(245,158,11,.25)"
                  onClick={() => { setError(null); setJoining(true); }} />
              </div>
            ) : (
              <form onSubmit={join} className="relative mt-6 rounded-2xl border border-white/10 bg-white/[.04] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.08)]" data-join-room>
                <p className="text-base font-bold">Join a friend’s room</p>
                <p className="mt-0.5 text-xs text-slate-400">Enter the 6-character code they shared.</p>
                <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} placeholder="K7Q2XM" autoFocus autoCapitalize="characters" aria-label="Room code" data-room-code-input
                  className="mt-4 w-full rounded-xl border border-white/10 bg-black/40 py-3.5 text-center font-mono text-2xl font-bold tracking-[0.45em] text-white shadow-[inset_0_2px_6px_rgba(0,0,0,.6)] outline-none placeholder:text-slate-600 focus:border-amber-400/60" />
                {error && <p className="mt-2 text-xs font-semibold text-rose-400">{error.message}</p>}
                <div className="mt-4 flex gap-2.5">
                  <button type="button" onClick={() => setJoining(false)} className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-slate-300 hover:bg-white/10">Back</button>
                  <button type="submit" disabled={code.length !== 6 || !!busy || groupOut}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 py-3 text-sm font-bold text-amber-950 shadow-[0_8px_20px_-6px_rgba(245,158,11,.6),inset_0_1px_0_rgba(255,255,255,.6)] hover:brightness-105 disabled:opacity-40">
                    {busy === 'join' ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Join room
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
        </Portal>
        );
      })()}

      {/* ---- Play online: table size and entry fee, then the search ----
          As the reference picture (2026-10-29, "exactly"): its stage, table and seats are the picture
          (public/games/lobby/lobby-bg.jpg, the parts that change painted off it), and every control is drawn
          live in the same place — the game, 1 vs 1 / 4 players, the fee, the prize, the note, Find players
          and ✕. Positions are the picture's, as % of its 1054 × 1493; sizes in cqw of the panel. ---- */}
      {online && <OnlineLobby online={online} setOnline={setOnline} fees={fees} busy={busy} onPlay={playOnline} open={unlocks ? openSizes(online.game.id) : null} />}

      {/* ---- Make a room: how many players, then the room (no level to pick: medium, or the game's own) ---- */}
      {/* In a portal on the body: the page's entrance animation (a transform)
          would otherwise hold this "fixed" layer to the page, leaving part of
          the screen uncovered. */}
      {picking && (
        <Portal>
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => setPicking(null)}>
          <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Create a ${GROUP_GAMES[picking.id].label} room`} className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <GameThumb id={GROUP_THUMBS[picking.id]} className="h-14 w-14" />
              <div className="min-w-0">
                <p className="text-lg font-black text-[#173a63]">{GROUP_GAMES[picking.id].label}</p>
                <p className="text-xs font-semibold text-slate-500">{isTwo(picking.id) ? '2 players' : `${size} players`} · XP by place</p>
              </div>
            </div>
            <p className="mt-4 text-xs font-black tracking-wide text-slate-500 uppercase">Players</p>
            {isTwo(picking.id) ? (
              <p className="mt-1.5 rounded-xl bg-slate-100 py-2 text-center text-sm font-black text-slate-600">2 players — {GROUP_GAMES[picking.id].label} is one against one</p>
            ) : (
              <div className="mt-1.5 grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Players">
                {ROOM_SIZES.map((n) => {
                  const shut = unlocks && !openSizes(picking.id).includes(n);
                  return (
                    <button key={n} type="button" role="radio" aria-checked={size === n} onClick={() => setSize(n)} disabled={shut} title={shut ? lockNote(picking.id, n) : undefined} data-size={n}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-black disabled:cursor-not-allowed disabled:opacity-45 ${size === n ? 'bg-violet-600 text-white shadow-md shadow-violet-500/30' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                      {shut ? <Lock className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />} {n}
                    </button>
                  );
                })}
              </div>
            )}
            <p className="mt-1.5 text-[11px] text-slate-500">Only this many can join the room.</p>
            {unlocks && ROOM_SIZES.some((n) => !openSizes(picking.id).includes(n)) && !isTwo(picking.id) && (
              <p className="mt-1 text-[11px] font-semibold text-amber-700" data-size-unlock-note>{nextUnlock(unlocks, picking.id)}</p>
            )}
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => setPicking(null)} className="flex-1 rounded-full py-2.5 text-sm font-bold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={create} disabled={busy === 'create'} data-create-room={picking.id}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-violet-600 py-2.5 text-sm font-black text-white shadow-md shadow-violet-500/30 hover:bg-violet-700 disabled:opacity-60">
                {busy === 'create' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-3.5 w-3.5 fill-current" />} Create room
              </button>
            </div>
          </div>
        </div>
        </Portal>
      )}
    </>
  );
}

/**
 * 🎮 Brain games — a short, deliberate break that still asks something of you.
 *
 * Four categories, five games each, three difficulties per game and ten earned
 * levels inside every one. Everything is played and scored in the browser.
 * The server keeps a copy of each student's level and stars so progress
 * follows the account and the leaderboard has something to rank — but it
 * awards no XP, streaks or badges for it. That is a decision rather than an
 * omission: XP measures real work on the roadmap, and letting a student farm
 * it from a memory game would quietly make every number on their progress
 * page mean less.
 */
const LOBBY = '/games/lobby';
const XP_BY_PLACE = '1st 50 · 2nd 30 · 3rd 20 · 4th 10 XP';
/** A length in the reference pictures' pixels (1055 wide), as a share of the card's width. */
const u = (px) => `${(px * 100) / 1055}cqw`;
/**
 * The table for each size, cut from its reference picture (2026-10-29: 2 → 2 chairs, 4 → 4, 6 → 6):
 * its size in those pixels, and where the felt's middle is (for the prize written on it), as %.
 */
const TABLES = {
  2: { w: 920, h: 360, felt: [50, 62] },
  4: { w: 865, h: 523, felt: [50.3, 58.7] },
  6: { w: 895, h: 512, felt: [50.3, 57] }
};

/** Play online: how many at the table (its picture changes with it), the entry fee and the prize, then Create room. */
function OnlineLobby({ online, setOnline, fees, busy, onPlay, open = null }) {
  const [why, setWhy] = useState(false);                    // the prize, explained (the Winner bar's ›)
  const finding = busy === 'online';
  const close = () => { if (!finding) setOnline(null); };
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  const chess = isTwo(online.game.id);
  // Every group game: 2 to 20 at a table; Chess and the other games for two: 2.
  // …and only the sizes the student's solo levels have unlocked.
  const sizes = (chess ? [2] : (fees.sizes || ROOM_SIZES)).filter((x) => !open || open.includes(x));
  const [more, setMore] = useState(![2, 4, 6].includes(online.players));  // "+": a typed number of players
  const [typed, setTyped] = useState(() => (![2, 4, 6].includes(online.players) ? String(online.players) : ''));
  const maxSeats = chess ? 2 : 20;
  const n = online.players;
  const pot = online.fee * n;
  const prize = Math.round(pot * fees.prizeShare * 100) / 100;
  const info = GROUP_GAMES[online.game.id];
  const big = ![2, 4, 6].includes(n);                      // a typed number: the six table's picture, with the count on it
  const table = TABLES[n] || TABLES[6];
  const tick = (
    <span className="absolute flex items-center justify-center rounded-full bg-[#4c1d95] text-white shadow-[0_3px_8px_rgba(76,29,149,.45)]" style={{ right: u(-12), top: u(-12), width: u(44), height: u(44), boxShadow: `0 0 0 ${u(4)} #fff` }}>
      <Check style={{ width: '58%', height: '58%' }} strokeWidth={3.5} />
    </span>
  );
  const label = 'font-extrabold uppercase text-[#5b6074]';
  return (
    <Portal>
      <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-slate-900/50 p-3 backdrop-blur-sm" onClick={close}>
        {/* The outer box sets the size (and is what the card's units measure); the card inside is styled against it. */}
        <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Play ${info.label} online`} data-online-setup
          className="relative my-auto select-none" style={{ width: 'min(94vw, 470px, calc((100dvh - 24px) * 1055 / 1490))', containerType: 'inline-size' }}>
        <div className="relative w-full bg-[#fefdfe] shadow-[0_30px_70px_rgba(40,30,90,.28)]"
          style={{ borderRadius: u(56), border: `${u(2)} solid #eeecf5`, padding: `${u(46)} ${u(38)} ${u(40)}` }}>

          {/* The game, Online match, and the table's size. */}
          <div className="flex items-start" style={{ gap: u(26) }}>
            <span className="flex shrink-0 items-center justify-center bg-white shadow-[0_10px_26px_rgba(60,40,140,.14)]" style={{ width: u(128), height: u(128), borderRadius: u(30), border: `${u(2)} solid #f1eff7` }}>
              <GameThumb id={GROUP_THUMBS[online.game.id]} className="h-[70%] w-[70%]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-black leading-none tracking-tight text-[#111633]" style={{ fontSize: u(50), marginTop: u(6) }}>{info.label}</p>
              <span className="inline-flex items-center rounded-full bg-[#0e5752] font-extrabold text-[#4ff0d9] shadow-[0_0_0_1px_rgba(79,240,217,.35)]" style={{ marginTop: u(14), gap: u(10), padding: `${u(5)} ${u(18)} ${u(5)} ${u(8)}`, fontSize: u(23) }}>
                <span className="rounded-full bg-[#4ff0d9] shadow-[0_0_8px_#4ff0d9]" style={{ width: u(22), height: u(22), border: `${u(4)} solid #d6fff8` }} />
                {online.room ? 'Private room' : 'Online match'}
              </span>
              <p className="font-semibold text-[#6b7088]" style={{ fontSize: u(25), marginTop: u(10) }}>
                {n} players · {online.room ? 'share the code with friends' : online.fee ? `${prize} XP to the winner` : 'XP by place'}
              </p>
            </div>
            <button type="button" onClick={close} disabled={finding} aria-label="Close" title="Close" data-online-close
              className="flex shrink-0 items-center justify-center rounded-full bg-white text-[#111633] shadow-[0_6px_18px_rgba(40,30,90,.16)] transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
              style={{ width: u(68), height: u(68) }}>
              <X style={{ width: '48%', height: '48%' }} strokeWidth={2.6} />
            </button>
          </div>

          {/* The table: its own picture for 2, 4 or 6 (more than six: the six's, with the count), the prize on its felt. */}
          <div className="relative flex items-center justify-center" style={{ height: u(530), marginTop: u(14) }} data-online-table={n}>
            <div key={n} className="relative" style={{ width: `${(table.w / 920) * 100}%`, aspectRatio: `${table.w} / ${table.h}`, animation: 'lobby-table-in .3s ease-out both' }}>
              <img src={`${LOBBY}/table-${big ? 6 : n}.jpg`} alt="" draggable="false" className="h-full w-full"
                style={{ maskImage: 'linear-gradient(to right, transparent, #000 3%, #000 97%, transparent), linear-gradient(to bottom, transparent, #000 4%, #000 96%, transparent)', maskComposite: 'intersect', WebkitMaskImage: 'linear-gradient(to right, transparent, #000 3%, #000 97%, transparent), linear-gradient(to bottom, transparent, #000 4%, #000 96%, transparent)', WebkitMaskComposite: 'source-in' }} />
              <div className="pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center" style={{ left: `${table.felt[0]}%`, top: `${table.felt[1]}%` }}>
                <span className="bg-gradient-to-b from-[#fff3c4] via-[#f6c35a] to-[#d68a13] bg-clip-text font-black leading-none text-transparent drop-shadow-[0_2px_2px_rgba(0,0,0,.45)]" style={{ fontSize: u(online.fee ? 44 : 50) }}>{online.fee ? `${prize} XP` : 'XP'}</span>
                <span className="font-extrabold tracking-wide whitespace-nowrap text-white uppercase" style={{ fontSize: u(21), marginTop: u(6) }}>{online.fee ? `Pot ${pot} XP` : 'Free table'}</span>
              </div>
              {big && <span className="absolute left-1/2 top-[4%] -translate-x-1/2 rounded-full bg-gradient-to-b from-[#8f5cff] to-[#6a2ff0] font-black whitespace-nowrap text-white shadow-[0_8px_20px_rgba(106,47,240,.45)]" style={{ padding: `${u(6)} ${u(22)}`, fontSize: u(26), border: `${u(3)} solid #fff` }}>{n} players</span>}
            </div>
            <style>{'@keyframes lobby-table-in { from { opacity: 0; transform: scale(.96) } to { opacity: 1; transform: none } }'}</style>
          </div>

          {/* Players: 2, 4, 6, or More (8 to 20, on a second row). */}
          <p className={label} style={{ fontSize: u(22), letterSpacing: '0.2em', marginTop: u(6) }}>Players</p>
          <div role="radiogroup" aria-label="Players" className="grid grid-cols-4" style={{ gap: u(16), marginTop: u(14) }}>
            {[2, 4, 6, 'more'].map((k) => {
              if (k === 'more') {
                // "+": any number of players, typed (2026-10-31) — up to what the game seats.
                const allowed = !chess;
                const on = more || ![2, 4, 6].includes(n);
                return (
                  <button key={k} type="button" aria-expanded={on} disabled={!allowed || finding} data-online-size="more"
                    onClick={() => setMore(true)} title={allowed ? 'Any number of players' : `${info.label} is one against one`}
                    className={`relative flex items-center justify-center font-black transition-[transform,box-shadow] disabled:cursor-not-allowed ${on ? 'bg-gradient-to-b from-[#8f5cff] to-[#6a2ff0] text-white shadow-[0_10px_24px_rgba(106,47,240,.4)]' : `border bg-[#f8f8fb] text-[#343a52] shadow-[0_4px_12px_rgba(40,30,90,.06)] ${allowed ? 'hover:-translate-y-0.5' : 'opacity-45'}`}`}
                    style={{ height: u(90), borderRadius: u(24), gap: u(10), fontSize: u(40), borderColor: '#ececf3' }}>
                    {![2, 4, 6].includes(n) ? <><Users style={{ width: u(34), height: u(34) }} strokeWidth={2} />{n}</> : <Plus style={{ width: u(40), height: u(40) }} strokeWidth={3} />}
                    {![2, 4, 6].includes(n) && tick}
                  </button>
                );
              }
              const allowed = sizes.includes(k);
              const on = n === k;
              return (
                <button key={k} type="button" role="radio" aria-checked={on} disabled={!allowed || finding} data-online-size={k}
                  onClick={() => { setMore(false); setTyped(''); setOnline((o) => ({ ...o, players: k })); }} title={allowed ? undefined : `${info.label} is one against one`}
                  className={`relative flex items-center justify-center font-black transition-[transform,box-shadow] disabled:cursor-not-allowed ${on ? 'bg-gradient-to-b from-[#8f5cff] to-[#6a2ff0] text-white shadow-[0_10px_24px_rgba(106,47,240,.4)]' : `border bg-[#f8f8fb] text-[#343a52] shadow-[0_4px_12px_rgba(40,30,90,.06)] ${allowed ? 'hover:-translate-y-0.5' : 'opacity-45'}`}`}
                  style={{ height: u(90), borderRadius: u(24), gap: u(14), fontSize: u(40), borderColor: '#ececf3' }}>
                  <Users style={{ width: u(36), height: u(36) }} strokeWidth={2} />{k}
                  {on && tick}
                </button>
              );
            })}
          </div>
          {more && !chess && (
            <label className="flex items-center" style={{ gap: u(12), marginTop: u(14) }} data-online-more>
              <span className="font-bold text-[#4b5066]" style={{ fontSize: u(22) }}>Number of players</span>
              <input type="number" inputMode="numeric" min={2} max={maxSeats} value={typed} autoFocus disabled={finding} data-online-players-input
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 3);
                  setTyped(v);
                  const num = Number(v);
                  if (num >= 2 && num <= maxSeats) setOnline((o) => ({ ...o, players: num }));
                }}
                className="flex-1 rounded-2xl border border-[#ececf3] bg-white text-center font-black text-[#343a52] outline-none focus:border-[#7c3aed]"
                style={{ height: u(64), fontSize: u(28) }} placeholder={`2 to ${maxSeats}`} />
            </label>
          )}
          {more && !chess && typed !== '' && (Number(typed) < 2 || Number(typed) > maxSeats) && (
            <p className="font-semibold text-rose-600" style={{ fontSize: u(20), marginTop: u(8) }}>{info.label} takes 2 to {maxSeats} players.</p>
          )}
          <p className="text-[#4b5066]" style={{ fontSize: u(22), marginTop: u(14) }}>{chess ? `${info.label} is one against one.` : 'Only this many can join the room.'}</p>

          {/* Entry fee (online tables only: a private room is free). */}
          {!online.room && <>
          <p className={label} style={{ fontSize: u(22), letterSpacing: '0.2em', marginTop: u(30) }}>Entry fee</p>
          <div role="radiogroup" aria-label="Entry fee" className="grid grid-cols-4" style={{ gap: u(16), marginTop: u(14) }}>
            {fees.fees.map((f) => {
              const on = online.fee === f;
              return (
                <button key={f} type="button" role="radio" aria-checked={on} disabled={finding} data-online-fee={f}
                  onClick={() => setOnline((o) => ({ ...o, fee: f }))}
                  className={`relative flex flex-col items-center justify-center transition-transform hover:-translate-y-0.5 active:translate-y-0 ${on ? 'bg-gradient-to-b from-[#8f5cff] to-[#6a2ff0] text-white shadow-[0_10px_24px_rgba(106,47,240,.4)]' : 'border bg-white text-[#232842] shadow-[0_4px_12px_rgba(40,30,90,.06)]'}`}
                  style={{ height: u(146), borderRadius: u(24), gap: u(8), borderColor: '#efedf5' }}>
                  {on && tick}
                  {f
                    ? <img src={`${LOBBY}/coins.png`} alt="" draggable="false" style={{ width: u(66), height: u(66), borderRadius: u(14) }} />
                    : <span className={`flex items-center justify-center rounded-full ${on ? 'bg-white' : 'bg-[#efe8ff]'} text-[#6a2ff0]`} style={{ width: u(64), height: u(64) }}><Star style={{ width: '50%', height: '50%' }} fill="currentColor" /></span>}
                  <span className="font-black leading-none" style={{ fontSize: u(30) }}>{f ? `${f} XP` : 'Free'}</span>
                </button>
              );
            })}
          </div>

          {/* The prize; its › says how it is worked out. */}
          <button type="button" onClick={() => setWhy((w) => !w)} aria-expanded={why} data-online-prize
            className="flex w-full items-center bg-[#fff8ee] text-left transition-colors hover:bg-[#fff3e2]"
            style={{ height: u(88), marginTop: u(20), borderRadius: u(24), border: `${u(2.5)} solid #f2c98c`, padding: `0 ${u(36)} 0 ${u(26)}`, gap: u(30) }}>
            <img src={`${LOBBY}/trophy.png`} alt="" draggable="false" style={{ width: u(62), height: u(66), borderRadius: u(12) }} />
            <span className="flex-1 font-extrabold text-[#151a33]" style={{ fontSize: u(27) }}>Winner gets</span>
            <span className="font-black text-[#4c1fd1]" style={{ fontSize: u(34) }}>{online.fee ? `${prize} XP` : 'XP only'}</span>
            <ChevronRight className={`text-[#4c1fd1] transition-transform ${why ? 'rotate-90' : ''}`} style={{ width: u(32), height: u(32) }} strokeWidth={2.6} />
          </button>
          <p className="flex items-center bg-[#f9f9fc] text-[#4b5066]" style={{ minHeight: u(90), marginTop: u(16), borderRadius: u(22), border: `${u(2)} solid #f1f0f6`, padding: `${u(12)} ${u(26)}`, gap: u(22), fontSize: u(19.5), lineHeight: 1.45 }} data-online-note>
            <Info className="shrink-0 text-[#3b4160]" style={{ width: u(36), height: u(36) }} strokeWidth={2} />
            <span>
              {why
                ? (online.fee ? `Pot ${pot} XP: ${n} players × ${online.fee} XP. The winner takes ${Math.round(fees.prizeShare * 100)}% of it, ${prize} XP.` : `A free table: no entry fee and no pot. Places earn XP — ${XP_BY_PLACE}.`)
                : <>{online.fee ? `${online.fee} XP is taken from your XP when you sit down. ` : ''}We look for players for {fees.waitSeconds || 30} seconds. If the table isn&apos;t full, it starts with whoever is there; if nobody comes, {online.fee ? 'your fee comes back' : 'the table closes'}.</>}
            </span>
          </p>
          </>}
          {online.room && (
            <p className="flex items-center bg-[#f9f9fc] text-[#4b5066]" style={{ minHeight: u(90), marginTop: u(26), borderRadius: u(22), border: `${u(2)} solid #f1f0f6`, padding: `${u(12)} ${u(26)}`, gap: u(22), fontSize: u(19.5), lineHeight: 1.45 }} data-room-note>
              <Info className="shrink-0 text-[#3b4160]" style={{ width: u(36), height: u(36) }} strokeWidth={2} />
              <span>A private room, free to play: you get a code to share with your friends, and you start the game when everyone is in. Places earn XP — {XP_BY_PLACE}.</span>
            </p>
          )}

          {/* Cancel, and Create room (sits you at an online table of this size and fee). */}
          <div className="grid grid-cols-[1fr_1.1fr]" style={{ gap: u(20), marginTop: u(28) }}>
            <button type="button" onClick={close} disabled={finding} data-online-cancel
              className="rounded-full bg-white font-extrabold text-[#2d3348] transition-colors hover:bg-slate-50 disabled:opacity-60"
              style={{ height: u(92), fontSize: u(31), border: `${u(2.5)} solid #e6e5ee` }}>Cancel</button>
            <button type="button" onClick={onPlay} disabled={finding} data-find-players title={online.fee ? `${online.fee} XP entry` : undefined}
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#8f5cff] to-[#5b21e6] font-extrabold text-white shadow-[0_12px_26px_rgba(91,33,230,.38)] transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-80"
              style={{ height: u(92), fontSize: u(31), gap: u(18) }}>
              {finding ? <Loader2 className="animate-spin" style={{ width: u(34), height: u(34) }} /> : <Play style={{ width: u(34), height: u(34) }} fill="currentColor" />}
              {finding ? (online.room ? 'Creating…' : 'Finding players…') : 'Create room'}
            </button>
          </div>
        </div>
        </div>
      </div>
    </Portal>
  );
}

export default function Games() {
  const [active, setActive] = useState(null);
  const [categoryKey, setCategoryKey] = useState(CATEGORIES[0].key);
  // Solo games (Brain Boosters, below) or Group games (Group Brain): in the
  // address (?mode=group), so a room's Back lands on the group games.
  const [params, setParams] = useSearchParams();
  const group = params.get('mode') === 'group';
  // Opening Games asks which (2026-11-03): a popup, Solo games or Group games, in place of the tabs.
  const choosing = !params.get('mode');
  const setMode = (m) => {
    const next = new URLSearchParams(params);
    next.set('mode', m === 'group' ? 'group' : 'solo');
    setParams(next, { replace: true });
  };
  const toast = useToast();
  // Android's back button leaves the game for the hub, the same as the
  // game's own exit — not the Games page, and never the app.
  useBackClose(() => setActive(null), Boolean(active));
  // Loop the mascot stays away while a game is open, and comes back with the hub.
  useHideLoop(Boolean(active));
  // The day's minutes ran out mid-game: the game closes, the hub says why.
  const activeRef = useRef(null);
  useEffect(() => { activeRef.current = active; }, [active]);
  const onTimeUp = () => {
    if (!activeRef.current) return;
    activeRef.current = null;
    setActive(null);
    // Only levels already finished were banked: the one open when the clock
    // ran out closes unfinished, so the toast must not promise its stars.
    toast.info("That's today's play time. Levels you finished are saved; the one in progress wasn't — come back tomorrow.", 'Time for a break');
  };
  // A level in play, as GameShell reports it: the clock runs only then.
  const [inPlay, setInPlay] = useState(false);
  const { state: playTime, left, outOfTime } = usePlayTime(Boolean(active) && inPlay, onTimeUp);
  const playClock = useMemo(() => ({ report: setInPlay, left }), [left]);

  // XP for a level, as soon as the server has paid it.
  useEffect(() => {
    // Not while the level's celebration is up: it shows the XP itself.
    const onXp = (e) => { if (!document.querySelector('[data-game-celebration]')) toast.success(`+${e.detail.xp} XP for your stars`, 'Level saved'); };
    window.addEventListener(GAME_XP, onXp);
    return () => window.removeEventListener(GAME_XP, onXp);
  }, [toast]);
  // Bumped when the account's copy of progress brings something new to this
  // browser, so the tally and the level chips re-read storage.
  const [, setSynced] = useState(0);
  /* ---- Landing back where the student left ----------------------------
   *
   * The hub is never unmounted. While a game plays it stays in the page,
   * collapsed to no height and hidden, with the game rendered above it. So
   * when the game closes there is nothing to rebuild: the leaderboard is
   * still loaded, the sections have already played their entrance, every
   * height is exactly what it was — and the scroll position saved when the
   * game opened is put back before the first frame is painted. A hub that
   * was torn down and remounted always showed the hero for a moment, because
   * it came back shorter than it had been and grew under the student.
   */
  const hubRef = useRef(null);
  const returnTo = useRef(null);

  useLayoutEffect(() => {
    if (active || returnTo.current === null) return;
    const { top, gameId, offset } = returnTo.current;
    returnTo.current = null;
    const scroller = scrollerOf(hubRef.current);
    // The card is the anchor where it can be: if the leaderboard above it
    // refreshed while the game was played, the card is still put back on the
    // same spot of the screen. The raw position is the fallback.
    const card = hubRef.current?.querySelector(`[data-game="${gameId}"]`);
    if (card && typeof offset === 'number') {
      const base = scroller ? scroller.getBoundingClientRect().top : 0;
      const delta = card.getBoundingClientRect().top - base - offset;
      if (scroller) scroller.scrollTop += delta;
      else window.scrollBy(0, delta);
    } else if (scroller) {
      scroller.scrollTop = top;
    } else {
      window.scrollTo(0, top);
    }
  }, [active]);

  useEffect(() => {
    let cancelled = false;
    pullProgress().then((changed) => {
      if (changed && !cancelled) setSynced((n) => n + 1);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Read on every render of the hub, so coming back from a game marks it.
  const recentId = lastPlayed();
  const play = (game) => {
    if (outOfTime) {
      toast.info("You've used today's play time. Games open again at midnight.", 'Back tomorrow');
      return;
    }
    markPlayed(game.id);
    const scroller = scrollerOf(hubRef.current);
    const card = hubRef.current?.querySelector(`[data-game="${game.id}"]`);
    const base = scroller ? scroller.getBoundingClientRect().top : 0;
    returnTo.current = {
      gameId: game.id,
      top: scroller ? scroller.scrollTop : window.scrollY,
      offset: card ? card.getBoundingClientRect().top - base : null
    };
    setActive(game);
  };

  const Game = active?.Component;

  return (
    <div className="relative">
      {Game && (
        <div className="fp-enter space-y-3">
          {/* During play a wide screen shows the clock in the game's left rail
              (GameShell), beside the board; this pill covers the briefing,
              the result and narrower screens, where there is no rail. */}
          {left !== null && (
            <p className={`mx-auto flex w-fit items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-black tabular-nums shadow-sm ring-1 ring-inset ${
              inPlay ? 'xl:hidden' : ''
            } ${
              left <= 60 ? 'bg-rose-50 text-rose-700 ring-rose-200' : 'bg-surface text-ink-700 ring-line-200'
            }`}>
              <Timer className="h-3.5 w-3.5" />
              {clock(left)} of play left today
            </p>
          )}
          <PlayClockContext.Provider value={playClock}>
            <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center"><span className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" aria-label="Loading the game" /></div>}>
              <Game onExit={() => setActive(null)} />
            </Suspense>
          </PlayClockContext.Provider>
        </div>
      )}

      {/* Solo or group: asked each time Games opens. Black and gold, as the reference (2026-11-04): a crown, a cube
          and a bulb for Individual games, a trophy and three players for Group games (public/games/choose). */}
      {choosing && !active && (
        <Portal>
          <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-black/80 p-3 backdrop-blur-md sm:p-6" data-games-choose>
            <div role="dialog" aria-modal="true" aria-label="Choose games"
              className="relative my-auto w-full max-w-3xl overflow-hidden rounded-[28px] bg-[radial-gradient(90%_60%_at_50%_0%,#2a2216_0%,#0d0c0a_55%,#070707_100%)] px-4 pt-6 pb-5 text-white shadow-[0_50px_100px_-30px_rgba(0,0,0,.95)] ring-1 ring-[#e8b04b]/25 sm:px-8 sm:pt-8 sm:pb-8">
              {/* The heading: a gold pad between two gold lines, GAMES, the question, a gold glow under it. */}
              <div className="flex items-center justify-center gap-3 sm:gap-5" aria-hidden>
                <span className="h-px w-10 bg-gradient-to-r from-transparent to-[#e8b04b] sm:w-16" />
                <Gamepad2 className="h-7 w-7 text-[#f5c055] drop-shadow-[0_2px_8px_rgba(245,192,85,.6)] sm:h-9 sm:w-9" />
                <span className="h-px w-10 bg-gradient-to-l from-transparent to-[#e8b04b] sm:w-16" />
              </div>
              <p className="mt-1 text-center text-[11px] font-semibold tracking-[0.45em] text-slate-300 uppercase sm:text-xs">Games</p>
              <h2 className="mt-1.5 text-center text-2xl leading-tight font-black tracking-tight sm:text-4xl">
                <span className="bg-gradient-to-b from-white to-slate-300 bg-clip-text text-transparent">What do you want to </span>
                <span className="bg-gradient-to-b from-[#ffe39a] to-[#d99a2b] bg-clip-text text-transparent">play?</span>
              </h2>
              <span aria-hidden className="mx-auto mt-3 block h-[3px] w-40 rounded-full bg-[radial-gradient(closest-side,#ffb43a,transparent)] sm:w-64" />

              <div className="mt-5 grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 sm:mt-7 sm:gap-6">
                {[
                  ['solo', 'Individual games', 'Quick brain games on your own', User, '/games/choose/solo.jpg'],
                  ['group', 'Group games', 'Play with friends in a room', Users, '/games/choose/group.jpg']
                ].map(([m, label, note, Icon, art]) => (
                  <button key={m} type="button" onClick={() => setMode(m)} data-games-mode={m}
                    className="group relative flex flex-col overflow-hidden rounded-[24px] bg-[linear-gradient(160deg,#1c1a17,#0b0a09)] p-3 text-left shadow-[0_0_0_1.5px_rgba(232,176,75,.7),0_0_24px_-4px_rgba(232,176,75,.45),0_30px_50px_-20px_rgba(0,0,0,.9),inset_0_1px_0_rgba(255,255,255,.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_0_1.5px_rgba(255,200,90,.95),0_0_36px_-2px_rgba(255,190,80,.6),0_36px_56px_-20px_rgba(0,0,0,.9)] active:translate-y-0 sm:p-4">
                    {/* The art, its own dark ground faded into the card's. */}
                    <span className="relative block overflow-hidden rounded-2xl" style={{ aspectRatio: '520 / 370' }}>
                      <img src={art} alt="" draggable="false" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        style={{ maskImage: 'radial-gradient(75% 80% at 50% 50%, black 60%, transparent 100%)', WebkitMaskImage: 'radial-gradient(75% 80% at 50% 50%, black 60%, transparent 100%)' }} />
                    </span>
                    <span className="mt-2 flex items-center gap-3 px-1 sm:mt-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#5a3a17] to-[#2a1a0a] text-[#f5c055] shadow-[0_6px_14px_-4px_rgba(0,0,0,.8),inset_0_1px_0_rgba(255,220,150,.35),0_0_0_1px_rgba(232,176,75,.35)] sm:h-12 sm:w-12">
                        <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-lg leading-tight font-black text-white sm:text-xl">{label}</span>
                        <span className="mt-0.5 block text-xs text-slate-300 sm:text-sm">{note}</span>
                      </span>
                    </span>
                    <span className="mt-4 flex items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#ffe08a] via-[#f5b53f] to-[#c98316] py-2.5 text-base font-black text-[#2a1a05] shadow-[0_0_0_1px_rgba(255,230,160,.6),0_8px_22px_-6px_rgba(245,181,63,.75),inset_0_2px_0_rgba(255,255,255,.55),inset_0_-3px_0_rgba(120,70,0,.35)] transition-transform group-active:scale-[.98] sm:py-3 sm:text-lg">
                      <Play className="h-4 w-4 fill-current sm:h-5 sm:w-5" /> Play
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* The hub. Collapsed and hidden while a game plays, never removed:
          see the note above the layout effect. `inert` keeps its buttons out
          of the tab order and away from screen readers meanwhile. */}
      <div ref={hubRef} className={`fp-enter space-y-6 ${active ? 'invisible h-0 overflow-hidden' : ''}`} aria-hidden={active ? 'true' : undefined} inert={active ? '' : undefined}>
        {/* ---- One card: the pitch and the standings on the same ground ----
          They were two cards butted together, which left a seam down the
          middle of the most important thing on the page. The scene now runs
          under both, and the board sits on it as a panel of frosted glass, so
          the whole strip reads as one object. */}
        {/* ---- Individual or group ---------------------------------------- */}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center" role="tablist" aria-label="Games">
          {/* Just the two names: no game counts on this page (2026-10-31). */}
          {[['solo', 'Individual games', User], ['group', 'Group games', Users]].map(([m, label, Icon]) => {
            const on = (m === 'group') === group;
            return (
              <button key={m} type="button" role="tab" aria-selected={on} onClick={() => setMode(m)} data-games-mode={m}
                className={`inline-flex min-h-12 items-center gap-2.5 rounded-2xl px-4 py-2 text-left transition-colors ${on ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/30' : 'bg-white text-ink-700 ring-1 ring-line-200 hover:ring-violet-300'}`}>
                <span className={`flex h-8 w-8 items-center justify-center rounded-full ${on ? 'bg-white/20' : 'bg-violet-50 text-violet-600'}`}><Icon className="h-4 w-4" /></span>
                <span className="block text-sm font-black leading-tight">{label}</span>
              </button>
            );
          })}
        </div>

        {!group && (
        <section className="relative isolate overflow-hidden rounded-3xl shadow-card ring-1 ring-sky-200/70 ring-inset">
          <HeroScene className="absolute inset-0 h-full w-full" />

          {/* `minmax(0,1fr)` and not a bare column: the leaderboard's rows
              keep their names on one line, so as an auto column this sized
              itself to "Bhagyashree YOU ★ 117" and on a narrow phone ran the
              pitch and the board out through the banner's right padding. A
              zero minimum lets the column be the banner's width and the name
              shorten instead. */}
          <div className="relative grid grid-cols-[minmax(0,1fr)] items-center gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_20.5rem]">
            {/* The pitch */}
            <div className="flex items-end gap-4">
              <GameTokensArt className="hidden h-[10.5rem] w-[10.5rem] shrink-0 self-end lg:block" />

              <div className="min-w-0 flex-1 pb-1">
                <span className="inline-flex items-center rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3.5 py-1.5 text-[0.68rem] font-black tracking-[0.12em] text-white uppercase shadow-md shadow-violet-500/30">
                  Brain Boosters
                </span>

                <h1 className="mt-2.5 text-2xl leading-[1.15] font-black text-[#173a63] sm:text-3xl lg:text-[2.1rem]">
                  <span className="block">Your brain&apos;s next</span>
                  <span className="block">
                    <span className="text-violet-600">boss</span> <span className="text-pink-500">battle</span> starts here!
                  </span>
                </h1>

                <p className="mt-2.5 hidden max-w-md text-sm leading-relaxed text-slate-700 sm:block">
                  Where every challenge makes you <span className="font-bold text-[#173a63]">sharper</span>. <span className="font-bold text-[#173a63]">Quick</span> games for memory,
                  logic, words and numbers.
                </p>

                {/* Today's play allowance, from the admin's rules. */}
                {playTime && left !== null && (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 shadow-sm ring-1 ring-inset ${
                      outOfTime ? 'bg-slate-100 text-slate-600 ring-slate-200' : 'bg-white/90 text-[#173a63] ring-sky-200'
                    }`}>
                      {outOfTime ? <Moon className="h-3.5 w-3.5" /> : <Timer className="h-3.5 w-3.5" />}
                      {outOfTime ? 'Play time used — back at midnight' : `${clock(left)} of play left today`}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* The standings, on frosted glass so the scene still reads behind
              them and the two halves stay one picture. */}
            <div className="rounded-2xl bg-white/80 p-4 shadow-lg ring-1 ring-white/70 backdrop-blur-md ring-inset">
              <GameLeaderboard dense />
            </div>
          </div>

          {/* The lettering, floating over the sky between the two halves. */}
          <PlayLearnGrow className="pointer-events-none absolute top-[6%] left-[46%] hidden h-24 w-24 xl:block" />
        </section>
        )}

        {group && <GroupHub />}

        {/* ---- Categories: one row, the one picked shows its games (2026-11-03) ---- */}
        {!group && (() => {
          const category = CATEGORIES.find((c) => c.key === categoryKey) || CATEGORIES[0];
          return (
            <section>
              <div className="mb-3 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Game categories">
                {CATEGORIES.map((c) => {
                  const Icon = c.icon;
                  const on = c.key === category.key;
                  return (
                    <button key={c.key} type="button" role="tab" aria-selected={on} onClick={() => setCategoryKey(c.key)} data-games-category={c.key}
                      className={`inline-flex shrink-0 items-center gap-2.5 rounded-full py-2 pr-5 pl-2 text-sm font-black transition-colors ${on ? `bg-gradient-to-r text-white shadow-md ${c.band} ${c.glow}` : 'bg-white text-ink-700 ring-1 ring-line-200 hover:ring-violet-300'}`}>
                      <span className={`flex h-7 w-7 items-center justify-center rounded-full ${on ? 'bg-white/25' : 'bg-violet-50 text-violet-600'}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      {c.name}
                    </button>
                  );
                })}
              </div>
              <p className="mb-4 flex items-center gap-2 text-sm text-ink-500"><Sparkles aria-hidden className="h-4 w-4 shrink-0 text-amber-400" />{category.blurb}</p>

              {/* Five across on a wide screen, as on the sheet. */}
              <div key={category.key} className="fp-game-stage grid auto-rows-fr grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {category.games.map((game, i) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    theme={CARD_THEMES[i % CARD_THEMES.length]}
                    index={i}
                    reached={levelReached(game.id)}
                    stars={starsForGame(game.id)}
                    recent={game.id === recentId}
                    onPlay={play}
                  />
                ))}
              </div>
            </section>
          );
        })()}

        <p className={`hidden px-1 text-xs leading-relaxed text-ink-400 ${group ? '' : 'sm:block'}`}>
          Your level and stars in each game are saved to your account when a level ends, so they follow you between devices and count on the leaderboard. A level pays XP for its best stars, once per star — replaying at the same stars pays nothing.
        </p>
      </div>
    </div>
  );
}
