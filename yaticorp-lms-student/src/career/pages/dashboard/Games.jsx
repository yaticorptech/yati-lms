import { useState, useEffect } from 'react';
import { Brain, Puzzle, Type, Zap, Play, Layers, Star, Sparkles } from 'lucide-react';
import GameThumb from '../../components/games/GameThumb';
import { GameTokensArt, HeroScene, PlayLearnGrow } from '../../components/games/GamesHeroArt';
import MemoryMatch from '../../components/games/MemoryMatch';
import SequenceRecall from '../../components/games/SequenceRecall';
import NumberRecall from '../../components/games/NumberRecall';
import CodeBreaker from '../../components/games/CodeBreaker';
import NextInSequence from '../../components/games/NextInSequence';
import OddOneOut from '../../components/games/OddOneOut';
import WordScramble from '../../components/games/WordScramble';
import SynonymMatch from '../../components/games/SynonymMatch';
import SentenceGap from '../../components/games/SentenceGap';
import MathSprint from '../../components/games/MathSprint';
import QuickCompare from '../../components/games/QuickCompare';
import MissingOperator from '../../components/games/MissingOperator';
import ColourMatch from '../../components/games/ColourMatch';
import SpotTheChange from '../../components/games/SpotTheChange';
import Deduction from '../../components/games/Deduction';
import LightsOut from '../../components/games/LightsOut';
import SpellingFix from '../../components/games/SpellingFix';
import WordRoots from '../../components/games/WordRoots';
import PercentSnap from '../../components/games/PercentSnap';
import RunningTotal from '../../components/games/RunningTotal';
import GridRecall from '../../components/games/GridRecall';
import TicTacToe from '../../components/games/TicTacToe';
import MiniSudoku from '../../components/games/MiniSudoku';
import TypingSprint from '../../components/games/TypingSprint';
import BinaryBlitz from '../../components/games/BinaryBlitz';
import SpeedSort from '../../components/games/SpeedSort';
// The second wave.
import ReverseRecall from '../../components/games/ReverseRecall';
import SeenBefore from '../../components/games/SeenBefore';
import ScaleBalance from '../../components/games/ScaleBalance';
import ShapeMatrix from '../../components/games/ShapeMatrix';
import AntonymMatch from '../../components/games/AntonymMatch';
import IdiomSense from '../../components/games/IdiomSense';
import NumberBonds from '../../components/games/NumberBonds';
import RoundingRush from '../../components/games/RoundingRush';
import GameLeaderboard from '../../components/games/GameLeaderboard';
import { starsForGame, pullProgress } from '../../components/games/levels';

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
      { id: 'seen-before', name: 'Seen Before', blurb: 'A set flashes up. Which one did you see?', Component: SeenBefore }
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
      { id: 'shape-matrix', name: 'Shape Matrix', blurb: 'Spot the rule and finish the grid.', Component: ShapeMatrix }
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
      { id: 'idiom-sense', name: 'Idiom Sense', blurb: 'What does the phrase really mean?', Component: IdiomSense }
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
      { id: 'rounding-rush', name: 'Rounding Rush', blurb: 'Round it to the nearest ten, hundred or thousand.', Component: RoundingRush }
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
    play: 'bg-violet-600 hover:bg-violet-700 shadow-violet-500/30'
  },
  {
    wash: 'from-amber-50 via-orange-50 to-yellow-50',
    ring: 'ring-amber-100',
    chip: 'bg-orange-100 text-orange-700',
    play: 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/30'
  },
  {
    wash: 'from-sky-50 via-blue-50 to-indigo-50',
    ring: 'ring-sky-100',
    chip: 'bg-sky-100 text-sky-700',
    play: 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30'
  },
  {
    wash: 'from-rose-50 via-pink-50 to-fuchsia-50',
    ring: 'ring-pink-100',
    chip: 'bg-pink-100 text-pink-700',
    play: 'bg-pink-600 hover:bg-pink-700 shadow-pink-500/30'
  },
  {
    wash: 'from-emerald-50 via-teal-50 to-green-50',
    ring: 'ring-emerald-100',
    chip: 'bg-emerald-100 text-emerald-700',
    play: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30'
  },
  {
    wash: 'from-teal-50 via-cyan-50 to-sky-50',
    ring: 'ring-teal-100',
    chip: 'bg-teal-100 text-teal-700',
    play: 'bg-teal-600 hover:bg-teal-700 shadow-teal-500/30'
  }
];

const readProgress = () => {
  try {
    return JSON.parse(localStorage.getItem('yati:gameLevel') || '{}');
  } catch {
    // A corrupt entry must not take the hub down with it.
    return {};
  }
};

/** A few sparkles scattered over the artwork, as on the reference sheet. */
const SPARKS = [
  { top: '14%', left: '9%', size: 'h-2.5 w-2.5', tint: 'text-amber-300' },
  { top: '22%', right: '12%', size: 'h-2 w-2', tint: 'text-violet-300' },
  { bottom: '18%', left: '16%', size: 'h-2 w-2', tint: 'text-pink-300' },
  { bottom: '26%', right: '9%', size: 'h-3 w-3', tint: 'text-amber-200' }
];

/**
 * One game card.
 *
 * Built to the reference sheet: the artwork leads on a pastel wash of the
 * card's own colour, the reward sits in a white pill top right, and the level
 * and the play button share the foot of the card. Each card takes a different
 * pastel so a row reads as a set of distinct games rather than five of the
 * same thing.
 *
 * The pill shows stars, not XP. Games award no XP here, deliberately — XP
 * measures work on the roadmap, and a card promising some would be making a
 * promise the product does not keep.
 */
function GameCard({ game, theme, reached, stars, onPlay, first = false }) {
  const started = reached > 1;

  return (
    <button
      type="button"
      onClick={() => onPlay(game)}
      data-guide={first ? 'game-play' : undefined}
      className={`fp-press group flex flex-col overflow-hidden rounded-3xl bg-gradient-to-br text-left ring-1 transition-all ring-inset hover:-translate-y-1 hover:shadow-card-hover ${theme.wash} ${theme.ring}`}
    >
      {/* ---- The artwork, on its own colour ---------------------------- */}
      <span className="relative flex h-32 items-center justify-center">
        {SPARKS.map((sp, i) => (
          <Sparkles
            key={i}
            aria-hidden
            className={`pointer-events-none absolute ${sp.size} ${sp.tint} opacity-70`}
            style={{ top: sp.top, left: sp.left, right: sp.right, bottom: sp.bottom }}
          />
        ))}

        <GameThumb
          id={game.id}
          className="relative h-20 w-20 drop-shadow-sm transition-transform duration-300 group-hover:scale-110"
        />

        {/* The reward, in a white pill, exactly where the sheet puts it. */}
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[0.7rem] font-black text-ink-800 shadow-sm tabular-nums">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          {stars}
        </span>
      </span>

      {/* ---- The words and the two controls ---------------------------- */}
      <span className="flex flex-1 flex-col px-4 pb-4">
        <span className="block text-base leading-tight font-black text-[#173a63]">{game.name}</span>
        <span className="mt-1.5 block min-h-8 text-xs leading-snug text-slate-500">{game.blurb}</span>

        <span className="mt-3.5 flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-black ${theme.chip}`}
          >
            <Layers className="h-3.5 w-3.5" />
            Level {started ? reached : 1}
          </span>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full py-2 pr-4 pl-2 text-sm font-black text-white shadow-md transition-colors ${theme.play}`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/25">
              <Play className="h-2.5 w-2.5 fill-current" />
            </span>
            Play
          </span>
        </span>
      </span>
    </button>
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
export default function Games() {
  const [active, setActive] = useState(null);
  // Bumped when the account's copy of progress brings something new to this
  // browser, so the tally and the level chips re-read storage.
  const [, setSynced] = useState(0);
  const progress = readProgress();

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

  if (active) {
    const Game = active.Component;
    return (
      <div className="fp-enter space-y-5">
        <Game onExit={() => setActive(null)} />
      </div>
    );
  }

  return (
    <div className="fp-enter space-y-6">
      {/* ---- One card: the pitch and the standings on the same ground ----
          They were two cards butted together, which left a seam down the
          middle of the most important thing on the page. The scene now runs
          under both, and the board sits on it as a panel of frosted glass, so
          the whole strip reads as one object. */}
      <section className="relative isolate overflow-hidden rounded-3xl shadow-card ring-1 ring-sky-200/70 ring-inset">
        <HeroScene className="absolute inset-0 h-full w-full" />

        <div className="relative grid items-center gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_20.5rem]">
          {/* The pitch */}
          <div className="flex items-end gap-4">
            <GameTokensArt className="hidden h-[10.5rem] w-[10.5rem] shrink-0 self-end lg:block" />

            <div className="min-w-0 flex-1 pb-1">
              <span className="inline-flex items-center rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3.5 py-1.5 text-[0.68rem] font-black tracking-[0.12em] text-white uppercase shadow-md shadow-violet-500/30">
                Brain games
              </span>

              <h1 className="mt-2.5 text-2xl leading-[1.15] font-black text-[#173a63] sm:text-3xl lg:text-[2.1rem]">
                <span className="block">Your brain&apos;s next</span>
                <span className="block">
                  <span className="text-violet-600">boss</span>{' '}
                  <span className="text-pink-500">battle</span> starts here!
                </span>
              </h1>

              <p className="mt-2.5 max-w-md text-sm leading-relaxed text-slate-700">
                Where every challenge makes you <span className="font-bold text-[#173a63]">sharper</span>.{' '}
                {totalGames} <span className="font-bold text-[#173a63]">quick</span> games for memory,
                logic, words and numbers.
              </p>
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

      {/* ---- Categories ------------------------------------------------- */}
      {CATEGORIES.map((category) => {
        const Icon = category.icon;

        return (
          <section key={category.key}>
            <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              {/* The heading pill from the sheet: a rounded bar, the icon on a
                  disc of its own, the name in white. */}
              <span
                className={`inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r py-2 pr-5 pl-2 text-sm font-black text-white shadow-md ${category.band} ${category.glow}`}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/25">
                  <Icon className="h-4 w-4" />
                </span>
                {category.name}
              </span>
              <Sparkles aria-hidden className="hidden h-4 w-4 shrink-0 text-amber-400 sm:block" />
              {/* The blurb takes the whole next line on a phone. Beside the
                  label it was squeezed to one word a line. */}
              <p className="order-last min-w-0 basis-full text-sm text-ink-500 sm:order-none sm:flex-1 sm:basis-0">
                {category.blurb}
              </p>
            </div>

            {/* Five across on a wide screen, as on the sheet. */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {category.games.map((game, i) => (
                <GameCard
                  key={game.id}
                  game={game}
                  theme={CARD_THEMES[i % CARD_THEMES.length]}
                  reached={progress[game.id] || 1}
                  stars={starsForGame(game.id)}
                  onPlay={setActive}
                  first={i === 0}
                />
              ))}
            </div>
          </section>
        );
      })}

      <p className="px-1 text-xs leading-relaxed text-ink-400">
        Your level and stars in each game are saved to your account when a level ends, so they
        follow you between devices and count on the leaderboard.
      </p>
    </div>
  );
}
