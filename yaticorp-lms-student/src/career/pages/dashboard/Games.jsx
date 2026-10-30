import { lazy, Suspense, useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Brain, Puzzle, Type, Zap, Play, Layers, Star, Sparkles, History, Timer, Moon, User, Users, Loader2, Link2, DoorOpen, Globe, Wallet, Trophy, X, ChevronRight, Check, Info, Lock } from 'lucide-react';
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
import { PlayClockContext, clock } from '../../components/games/playClock';

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
function GameCard({ game, theme, index, reached, stars, recent, onPlay, pill = null, chip = null, playLabel = null, disabled = false }) {
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
      className={`fp-press fp-game-card group flex h-full flex-col overflow-hidden rounded-3xl bg-gradient-to-br text-left ring-1 ring-inset ${theme.wash} ${theme.ring} ${recent ? 'fp-game-recent' : ''}`}
      aria-label={recent ? `${game.name}, your last game` : undefined}
    >
      {/* ---- The artwork, floating over a lit disc ---------------------- */}
      <span className="relative flex h-36 items-center justify-center overflow-hidden">
        {/* Only one card on the page carries this: the game opened last. */}
        {recent && (
          <span className="fp-game-recent-tag absolute top-3 left-3 z-10 inline-flex items-center gap-1 rounded-full bg-[#173a63] px-2.5 py-1 text-[0.65rem] font-black tracking-wide text-white uppercase">
            <History className="h-3 w-3" />
            Last played
          </span>
        )}
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
          <GameThumb id={game.thumb || game.id} className="fp-game-art h-24 w-24" />
        </span>

        {/* The reward, in a white pill, exactly where the sheet puts it. */}
        {/* `pill={false}`: none (the group games). */}
        {pill !== false && (
          <span className="fp-game-pill absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[0.7rem] font-black text-ink-800 tabular-nums">
            {pill || <><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{stars}</>}
          </span>
        )}
      </span>

      {/* ---- The words and the two controls ---------------------------- */}
      <span className="flex flex-1 flex-col px-4 pb-4">
        <span className="block truncate text-base leading-tight font-black text-[#173a63]">{game.name}</span>
        {/* Two lines at most, and room for two always: every card the same height. */}
        <span className="mt-1.5 line-clamp-2 block min-h-[2.1rem] text-xs leading-snug text-slate-500">{game.blurb}</span>

        <span className="mt-auto flex items-center justify-between gap-2 pt-3.5">
          {/* `chip={false}`: none (a group game that is on); the play button keeps its place on the right. */}
          {chip !== false ? (
            <span className={`fp-game-chip inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-black ${theme.chip}`}>
              {chip || <><Layers className="h-3.5 w-3.5" />Level {started ? reached : 1}</>}
            </span>
          ) : <span />}

          <span className={`fp-game-play inline-flex items-center gap-1.5 rounded-full py-2 pr-4 pl-2 text-sm font-black text-white transition-colors ${theme.play}`}>
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
// The artwork each group game borrows from the solo games' set.
const GROUP_THUMBS = { chess: 'chess', memorymatrix: 'grid-recall', sequence: 'sequence-recall', patternmaster: 'next-in-sequence', numberlogic: 'missing-operator', sudoku: 'mini-sudoku', deduction: 'scale-balance', lostkingdom: 'compass', finalvault: 'vault', wordlogic: 'word-scramble', spatialiq: 'spin-match', synonymmatch: 'synonym-match', antonymmatch: 'antonym-match', idiomsense: 'idiom-sense', sentencegap: 'sentence-gap', soundalike: 'sound-alike', wordroots: 'word-roots', spellingfix: 'spelling-fix', tensepick: 'tense-pick', oddoneout: 'odd-one-out', percentsnap: 'percent-snap', binaryblitz: 'binary-blitz', roundingrush: 'rounding-rush', fractionmatch: 'fraction-match', quickcompare: 'quick-compare', scalebalance: 'scale-balance', colourmatch: 'colour-match', dotcount: 'dot-count', clockread: 'clock-read', shapematrix: 'shape-matrix', numberrecall: 'number-recall', reverserecall: 'reverse-recall', seenbefore: 'seen-before', spotthechange: 'spot-the-change', matchback: 'match-back', runningtotal: 'running-total', memorymatch: 'memory-match', lightsout: 'lights-out', codebreaker: 'code-breaker', typingsprint: 'typing-sprint', speedsort: 'speed-sort', numberbonds: 'number-bonds', mathsprint: 'math-sprint', tictactoe: 'tic-tac-toe', laststone: 'last-stone' };
const playRoom = (navigate, id) => navigate(`/games/play/${id}`, { state: { from: 'group' } });

function GroupHub() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState(null);
  const [room, setRoom] = useState(null);
  const [catalog, setCatalog] = useState({});
  const [picking, setPicking] = useState(null);     // the game whose room is being made
  const [level, setLevel] = useState('medium');
  const [size, setSize] = useState(4);              // how many the room is for: 2 to 20
  const [choosing, setChoosing] = useState(null);   // the game whose card was pressed: Create room or Play online
  const [joining, setJoining] = useState(false);     // that popup showing its "Join room" code box
  const [online, setOnline] = useState(null);       // Play online: { game, players, fee }
  const [fees, setFees] = useState({ fees: [0, 10, 25, 50], prizeShare: 0.9, waitSeconds: 30 });
  // Group games: 30 minutes a day; used up, the section locks until midnight.
  const { left: groupLeft, outOfTime: groupOut } = useGroupTime(false);

  useEffect(() => {
    roomsApi.mine().then(setRoom).catch(() => {});
    roomsApi.games().then((rows) => setCatalog(Object.fromEntries(rows.map((g) => [g.id, g])))).catch(() => {});
    roomsApi.onlineInfo().then(setFees).catch(() => {});
  }, []);
  const fail = (e) => setError({ message: e.message, roomId: e.roomId });

  // An invitation link (/games?mode=group&join=CODE) joins that room at once.
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
  const allowed = (id) => DIFFICULTIES.filter(([k]) => !catalog[id]?.difficulties || catalog[id].difficulties.includes(k));
  const pick = (game) => {
    // Chess and the turn games are always one against one: no choices to make.
    if (isTwo(game.id)) {
      setBusy('create'); setError(null);
      roomsApi.create(game.id, { difficulty: 'medium', players: 2 }).then((r) => playRoom(navigate, r.game.id)).catch(fail).finally(() => setBusy(''));
      return;
    }
    const levels = allowed(game.id);
    setLevel(levels.some(([k]) => k === 'medium') ? 'medium' : levels[0]?.[0] || 'medium');
    setSize(isTwo(game.id) ? 2 : 4);
    setError(null);
    setPicking(game);
  };
  // Play online: a seat at a table of 2 or 4 at the chosen fee; the page then shows the search.
  const playOnline = () => {
    setBusy('online'); setError(null);
    roomsApi.online(online.game.id, online.players, online.fee).then((r) => { setOnline(null); playRoom(navigate, r.game.id); })
      .catch((e) => { setOnline(null); fail(e); }).finally(() => setBusy(''));
  };
  const create = () => {
    setBusy('create'); setError(null);
    roomsApi.create(picking.id, { difficulty: level, players: size }).then((r) => playRoom(navigate, r.game.id)).catch((e) => { setPicking(null); fail(e); }).finally(() => setBusy(''));
  };

  return (
    <>
      {/* ---- The banner: the pitch, and Join a room where the leaderboard sits ---- */}
      <section className="relative isolate overflow-hidden rounded-3xl shadow-card ring-1 ring-sky-200/70 ring-inset" data-group-hero>
        <HeroScene className="absolute inset-0 h-full w-full" />
        <div className="relative grid grid-cols-[minmax(0,1fr)] items-center gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_20.5rem]">
          <div className="flex items-end gap-4">
            <GameTokensArt className="hidden h-[10.5rem] w-[10.5rem] shrink-0 self-end lg:block" />
            <div className="min-w-0 flex-1 pb-1">
              <span className="inline-flex items-center rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3.5 py-1.5 text-[0.68rem] font-black tracking-[0.12em] text-white uppercase shadow-md shadow-violet-500/30">
                Group games
              </span>
              <h1 className="mt-2.5 text-2xl leading-[1.15] font-black text-[#173a63] sm:text-3xl lg:text-[2.1rem]">
                <span className="block">Bring your friends.</span>
                <span className="block"><span className="text-violet-600">Battle</span> <span className="text-pink-500">brains</span> together!</span>
              </h1>
              {/* Today's Group games time: 30 minutes, running only while a group game is played (useGroupTime). */}
              {groupLeft !== null && (
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 shadow-sm ring-1 ring-inset ${
                    groupOut ? 'bg-slate-100 text-slate-600 ring-slate-200' : 'bg-white/90 text-[#173a63] ring-sky-200'
                  }`} data-group-time>
                    {groupOut ? <Moon className="h-3.5 w-3.5" /> : <Timer className="h-3.5 w-3.5" />}
                    {groupOut ? 'Play time used — back at midnight' : `${clock(groupLeft)} of play left today`}
                  </span>
                </div>
              )}
              {room && (
                <button type="button" onClick={() => playRoom(navigate, room.id)} data-my-room
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-black text-emerald-700 shadow-sm ring-1 ring-emerald-200 ring-inset">
                  <DoorOpen className="h-3.5 w-3.5" /> You are in a {room.label} room ({room.code}) — open it
                </button>
              )}
            </div>
          </div>
          <form onSubmit={join} className="rounded-2xl bg-white/80 p-4 shadow-lg ring-1 ring-white/70 backdrop-blur-md ring-inset" data-join-room>
            <p className="flex items-center gap-2 text-base font-black text-[#173a63]"><Link2 className="h-4 w-4 text-violet-600" /> Join a room</p>
            <p className="mt-0.5 text-xs text-slate-600">Paste the 6-character code your friend shared.</p>
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} placeholder="e.g. K7Q2XM" autoCapitalize="characters" aria-label="Room code" data-room-code-input
              className="mt-2.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-center font-mono text-lg tracking-[0.3em] text-slate-900 shadow-sm placeholder:font-sans placeholder:text-sm placeholder:tracking-normal placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
            <button type="submit" disabled={code.length !== 6 || !!busy || groupOut}
              className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-violet-600 py-2.5 text-sm font-black text-white shadow-md shadow-violet-500/30 transition-colors hover:bg-violet-700 disabled:opacity-50">
              {busy === 'join' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />} Join room
            </button>
          </form>
        </div>
        <PlayLearnGrow className="pointer-events-none absolute top-[6%] left-[46%] hidden h-24 w-24 xl:block" />
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
          <p className="text-sm font-semibold"><span className="font-black">Group games are locked for today.</span> You have played your 30 minutes — they open again at midnight. Solo games are still open.</p>
        </div>
      )}

      {/* ---- Every group game, four to a row, in the solo games' cards ---- */}
      <div className={`fp-game-stage grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-4 ${groupOut ? 'pointer-events-none opacity-50 grayscale' : ''}`} aria-disabled={groupOut || undefined} data-group-games>
        {GROUP_ORDER.map((id, i) => {
          const g = GROUP_GAMES[id];
          const off = catalog[id]?.enabled === false;
          return (
            <GameCard key={id} index={i} theme={CARD_THEMES[i % CARD_THEMES.length]}
              game={{ id, thumb: GROUP_THUMBS[id], name: g.label, blurb: g.blurb }}
              pill={false} chip={off ? <span className="whitespace-nowrap">Not available</span> : false}
              playLabel={<span className="whitespace-nowrap">Play</span>} disabled={off || !!busy} onPlay={(game) => { setError(null); setChoosing(game); }} />
          );
        })}
      </div>

      {/* ---- A card pressed: three choices — Play online, Create room, Join room (a friend's code,
          typed here). A premium dark-glass look with cards that tilt in 3D (asked 2026-10-29). ---- */}
      {choosing && (() => {
        const info = GROUP_GAMES[choosing.id];
        const close = () => { setChoosing(null); setJoining(false); };
        // Tilt a card toward the pointer.
        const tilt = (e) => {
          const el = e.currentTarget; const r = el.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width - 0.5; const y = (e.clientY - r.top) / r.height - 0.5;
          el.style.transform = `perspective(700px) rotateX(${(-y * 14).toFixed(2)}deg) rotateY(${(x * 14).toFixed(2)}deg) translateZ(6px)`;
          el.style.setProperty('--gx', `${(x + 0.5) * 100}%`); el.style.setProperty('--gy', `${(y + 0.5) * 100}%`);
        };
        const untilt = (e) => { e.currentTarget.style.transform = ''; };
        const Card = ({ choice, onClick, icon: Icon, accent, glow, label, sub, badge }) => (
          <button type="button" onClick={onClick} onMouseMove={tilt} onMouseLeave={untilt} data-choice={choice}
            className="group relative flex flex-col items-start overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[.09] to-white/[.02] p-4 text-left shadow-[0_18px_40px_-12px_rgba(0,0,0,.8),inset_0_1px_0_rgba(255,255,255,.12)] transition-[transform,border-color] duration-200 ease-out [transform-style:preserve-3d] hover:border-white/25 sm:min-h-[12.5rem]">
            {/* A light that follows the pointer. */}
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: `radial-gradient(240px circle at var(--gx,50%) var(--gy,0%), ${glow}, transparent 60%)` }} />
            <span aria-hidden="true" className="pointer-events-none absolute -bottom-10 -left-6 h-24 w-24 rounded-full blur-2xl" style={{ background: glow }} />
            {badge}
            {/* A glossy orb for the icon. */}
            <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-[0_10px_20px_-6px_rgba(0,0,0,.7),inset_0_1px_0_rgba(255,255,255,.45),inset_0_-6px_10px_rgba(0,0,0,.25)] [transform:translateZ(30px)]" style={{ background: accent }}>
              <span aria-hidden="true" className="absolute inset-x-1.5 top-1 h-1/2 rounded-xl bg-gradient-to-b from-white/45 to-transparent" />
              <Icon className="relative h-5 w-5" strokeWidth={2.2} />
            </span>
            <span className="relative mt-auto block pt-6 text-[15px] font-bold tracking-tight text-white [transform:translateZ(20px)]">{label}</span>
            <span className="relative mt-0.5 block text-xs leading-snug text-slate-400">{sub}</span>
            <span className="relative mt-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-300 transition-colors group-hover:text-white">Continue <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></span>
          </button>
        );
        return (
        <Portal>
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md" onClick={close}>
          <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Play ${info.label}`}
            className="relative w-full max-w-2xl overflow-hidden rounded-[28px] border border-white/10 bg-[#0b1020] p-5 text-white shadow-[0_40px_80px_-20px_rgba(0,0,0,.9),inset_0_1px_0_rgba(255,255,255,.08)] sm:p-7" data-play-choice>
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
            <p className="relative mt-4 text-sm leading-relaxed text-slate-300">{info.blurb}</p>

            {!joining ? (
              <div className="relative mt-6 grid gap-3 sm:grid-cols-3">
                <Card choice="online" icon={Globe} label="Play online" sub="Matched with players online. Winner takes the pot."
                  accent="linear-gradient(160deg,#34d399,#047857)" glow="rgba(16,185,129,.28)"
                  badge={<span className="absolute top-3.5 right-3.5 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-emerald-300"><span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" /></span>LIVE</span>}
                  onClick={() => { const g = choosing; close(); setOnline({ game: g, players: isTwo(g.id) ? 2 : 4, fee: fees.fees[0] ?? 0 }); }} />
                <Card choice="room" icon={Users} label="Create room" sub="A private room for friends. Share the code."
                  accent="linear-gradient(160deg,#818cf8,#4338ca)" glow="rgba(99,102,241,.28)"
                  onClick={() => { const g = choosing; close(); pick(g); }} />
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
      {online && <OnlineLobby online={online} setOnline={setOnline} fees={fees} busy={busy} onPlay={playOnline} />}

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
                {ROOM_SIZES.map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={size === n} onClick={() => setSize(n)} data-size={n}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-black ${size === n ? 'bg-violet-600 text-white shadow-md shadow-violet-500/30' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    <Users className="h-3.5 w-3.5" /> {n}
                  </button>
                ))}
              </div>
            )}
            <p className="mt-1.5 text-[11px] text-slate-500">Only this many can join the room.</p>
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
function OnlineLobby({ online, setOnline, fees, busy, onPlay }) {
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
  const sizes = chess ? [2] : (fees.sizes || ROOM_SIZES);
  const [more, setMore] = useState(online.players > 6);  // 8, 10 and more: a second row
  const n = online.players;
  const pot = online.fee * n;
  const prize = Math.round(pot * fees.prizeShare * 100) / 100;
  const info = GROUP_GAMES[online.game.id];
  const big = n > 6;                                       // more than six: the six table's picture, with the count on it
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
                Online match
              </span>
              <p className="font-semibold text-[#6b7088]" style={{ fontSize: u(25), marginTop: u(10) }}>
                {n} players · {online.fee ? `₹${prize} to the winner` : 'XP by place'}
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
                <span className="bg-gradient-to-b from-[#fff3c4] via-[#f6c35a] to-[#d68a13] bg-clip-text font-black leading-none text-transparent drop-shadow-[0_2px_2px_rgba(0,0,0,.45)]" style={{ fontSize: u(online.fee ? 44 : 50) }}>{online.fee ? `₹${prize}` : 'XP'}</span>
                <span className="font-extrabold tracking-wide whitespace-nowrap text-white uppercase" style={{ fontSize: u(21), marginTop: u(6) }}>{online.fee ? `Pot ₹${pot}` : 'Free table'}</span>
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
                const allowed = sizes.some((x) => x > 6);
                const on = more || big;
                return (
                  <button key={k} type="button" aria-expanded={on} disabled={!allowed || finding} data-online-size="more"
                    onClick={() => { setMore(true); if (!big) setOnline((o) => ({ ...o, players: sizes.find((x) => x > 6) })); }} title={allowed ? '8, 10 or more players' : `${info.label} is one against one`}
                    className={`relative flex items-center justify-center font-black transition-[transform,box-shadow] disabled:cursor-not-allowed ${on ? 'bg-gradient-to-b from-[#8f5cff] to-[#6a2ff0] text-white shadow-[0_10px_24px_rgba(106,47,240,.4)]' : `border bg-[#f8f8fb] text-[#343a52] shadow-[0_4px_12px_rgba(40,30,90,.06)] ${allowed ? 'hover:-translate-y-0.5' : 'opacity-45'}`}`}
                    style={{ height: u(90), borderRadius: u(24), gap: u(10), fontSize: u(34), borderColor: '#ececf3' }}>
                    <Users style={{ width: u(34), height: u(34) }} strokeWidth={2} />{big ? n : '8+'}
                    {big && tick}
                  </button>
                );
              }
              const allowed = sizes.includes(k);
              const on = n === k;
              return (
                <button key={k} type="button" role="radio" aria-checked={on} disabled={!allowed || finding} data-online-size={k}
                  onClick={() => { setMore(false); setOnline((o) => ({ ...o, players: k })); }} title={allowed ? undefined : `${info.label} is one against one`}
                  className={`relative flex items-center justify-center font-black transition-[transform,box-shadow] disabled:cursor-not-allowed ${on ? 'bg-gradient-to-b from-[#8f5cff] to-[#6a2ff0] text-white shadow-[0_10px_24px_rgba(106,47,240,.4)]' : `border bg-[#f8f8fb] text-[#343a52] shadow-[0_4px_12px_rgba(40,30,90,.06)] ${allowed ? 'hover:-translate-y-0.5' : 'opacity-45'}`}`}
                  style={{ height: u(90), borderRadius: u(24), gap: u(14), fontSize: u(40), borderColor: '#ececf3' }}>
                  <Users style={{ width: u(36), height: u(36) }} strokeWidth={2} />{k}
                  {on && tick}
                </button>
              );
            })}
          </div>
          {(more || big) && !chess && (
            <div role="radiogroup" aria-label="More players" className="flex flex-wrap" style={{ gap: u(12), marginTop: u(14) }} data-online-more>
              {sizes.filter((x) => x > 6).map((k) => (
                <button key={k} type="button" role="radio" aria-checked={n === k} disabled={finding} data-online-size={k}
                  onClick={() => setOnline((o) => ({ ...o, players: k }))}
                  className={`flex-1 font-black transition-transform hover:-translate-y-0.5 ${n === k ? 'bg-[#efe8ff] text-[#5b21d6] ring-2 ring-[#7c3aed]' : 'border bg-white text-[#343a52]'}`}
                  style={{ height: u(64), minWidth: u(80), borderRadius: u(18), fontSize: u(28), borderColor: '#ececf3' }}>{k}</button>
              ))}
            </div>
          )}
          <p className="text-[#4b5066]" style={{ fontSize: u(22), marginTop: u(14) }}>{chess ? `${info.label} is one against one.` : 'Only this many can join the room.'}</p>

          {/* Entry fee. */}
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
                  <span className="font-black leading-none" style={{ fontSize: u(30) }}>{f ? `₹${f}` : 'Free'}</span>
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
            <span className="font-black text-[#4c1fd1]" style={{ fontSize: u(34) }}>{online.fee ? `₹${prize}` : 'XP only'}</span>
            <ChevronRight className={`text-[#4c1fd1] transition-transform ${why ? 'rotate-90' : ''}`} style={{ width: u(32), height: u(32) }} strokeWidth={2.6} />
          </button>
          <p className="flex items-center bg-[#f9f9fc] text-[#4b5066]" style={{ minHeight: u(90), marginTop: u(16), borderRadius: u(22), border: `${u(2)} solid #f1f0f6`, padding: `${u(12)} ${u(26)}`, gap: u(22), fontSize: u(19.5), lineHeight: 1.45 }} data-online-note>
            <Info className="shrink-0 text-[#3b4160]" style={{ width: u(36), height: u(36) }} strokeWidth={2} />
            <span>
              {why
                ? (online.fee ? `Pot ₹${pot}: ${n} players × ₹${online.fee}. The winner takes ${Math.round(fees.prizeShare * 100)}% of it, ₹${prize}.` : `A free table: no entry fee and no pot. Places earn XP — ${XP_BY_PLACE}.`)
                : <>{online.fee ? `₹${online.fee} is taken from your wallet when you sit down. ` : ''}We look for players for {fees.waitSeconds || 30} seconds. If the table isn&apos;t full, it starts with whoever is there; if nobody comes, {online.fee ? 'your fee comes back' : 'the table closes'}.</>}
            </span>
          </p>

          {/* Cancel, and Create room (sits you at an online table of this size and fee). */}
          <div className="grid grid-cols-[1fr_1.1fr]" style={{ gap: u(20), marginTop: u(28) }}>
            <button type="button" onClick={close} disabled={finding} data-online-cancel
              className="rounded-full bg-white font-extrabold text-[#2d3348] transition-colors hover:bg-slate-50 disabled:opacity-60"
              style={{ height: u(92), fontSize: u(31), border: `${u(2.5)} solid #e6e5ee` }}>Cancel</button>
            <button type="button" onClick={onPlay} disabled={finding} data-find-players title={online.fee ? `₹${online.fee} entry, from your wallet` : undefined}
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#8f5cff] to-[#5b21e6] font-extrabold text-white shadow-[0_12px_26px_rgba(91,33,230,.38)] transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-80"
              style={{ height: u(92), fontSize: u(31), gap: u(18) }}>
              {finding ? <Loader2 className="animate-spin" style={{ width: u(34), height: u(34) }} /> : <Play style={{ width: u(34), height: u(34) }} fill="currentColor" />}
              {finding ? 'Finding players…' : 'Create room'}
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
  // Solo games (Brain Boosters, below) or Group games (Group Brain): in the
  // address (?mode=group), so a room's Back lands on the group games.
  const [params, setParams] = useSearchParams();
  const group = params.get('mode') === 'group';
  const setMode = (m) => {
    const next = new URLSearchParams(params);
    if (m === 'group') next.set('mode', 'group'); else next.delete('mode');
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

  const totalGames = CATEGORIES.reduce((n, c) => n + c.games.length, 0);
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

      {/* The hub. Collapsed and hidden while a game plays, never removed:
          see the note above the layout effect. `inert` keeps its buttons out
          of the tab order and away from screen readers meanwhile. */}
      <div ref={hubRef} className={`fp-enter space-y-6 ${active ? 'invisible h-0 overflow-hidden' : ''}`} aria-hidden={active ? 'true' : undefined} inert={active ? '' : undefined}>
        {/* ---- One card: the pitch and the standings on the same ground ----
          They were two cards butted together, which left a seam down the
          middle of the most important thing on the page. The scene now runs
          under both, and the board sits on it as a panel of frosted glass, so
          the whole strip reads as one object. */}
        {/* ---- Solo or group ---------------------------------------------- */}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center" role="tablist" aria-label="Games">
          {[['solo', 'Solo games', User, `${totalGames} Brain Boosters`], ['group', 'Group games', Users, `${Object.keys(GROUP_GAMES).length} games · play with friends`]].map(([m, label, Icon, sub]) => {
            const on = (m === 'group') === group;
            return (
              <button key={m} type="button" role="tab" aria-selected={on} onClick={() => setMode(m)} data-games-mode={m}
                className={`inline-flex min-h-12 items-center gap-2.5 rounded-2xl px-4 py-2 text-left transition-colors ${on ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/30' : 'bg-white text-ink-700 ring-1 ring-line-200 hover:ring-violet-300'}`}>
                <span className={`flex h-8 w-8 items-center justify-center rounded-full ${on ? 'bg-white/20' : 'bg-violet-50 text-violet-600'}`}><Icon className="h-4 w-4" /></span>
                <span>
                  <span className="block text-sm font-black leading-tight">{label}</span>
                  <span className={`block text-[11px] font-semibold leading-tight ${on ? 'text-white/80' : 'text-ink-500'}`}>{sub}</span>
                </span>
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
                  Where every challenge makes you <span className="font-bold text-[#173a63]">sharper</span>. {totalGames} <span className="font-bold text-[#173a63]">quick</span> games for memory,
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

        {/* ---- Categories ------------------------------------------------- */}
        {!group && CATEGORIES.map((category) => {
          const Icon = category.icon;

          return (
            <section key={category.key}>
              <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                {/* The heading pill from the sheet: a rounded bar, the icon on a
                  disc of its own, the name in white. */}
                <span className={`inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r py-2 pr-5 pl-2 text-sm font-black text-white shadow-md ${category.band} ${category.glow}`}>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/25">
                    <Icon className="h-4 w-4" />
                  </span>
                  {category.name}
                </span>
                <Sparkles aria-hidden className="hidden h-4 w-4 shrink-0 text-amber-400 sm:block" />
                {/* The blurb takes the whole next line on a phone. Beside the
                  label it was squeezed to one word a line. */}
                <p className="order-last min-w-0 basis-full text-sm text-ink-500 sm:order-none sm:flex-1 sm:basis-0">{category.blurb}</p>
              </div>

              {/* Five across on a wide screen, as on the sheet. */}
              <div className="fp-game-stage grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
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
        })}

        <p className={`hidden px-1 text-xs leading-relaxed text-ink-400 ${group ? '' : 'sm:block'}`}>
          Your level and stars in each game are saved to your account when a level ends, so they follow you between devices and count on the leaderboard. A level pays XP for its best stars, once per star — replaying at the same stars pays nothing.
        </p>
      </div>
    </div>
  );
}
