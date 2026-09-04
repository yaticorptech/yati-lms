import { useState } from 'react';
import { Brain, Puzzle, Type, Zap, Gamepad2, Trophy, Play, Layers, Target, ArrowRight } from 'lucide-react';
import GameThumb from '../../components/games/GameThumb';
import { ControllerArt, TrophyPodiumArt } from '../../components/games/GamesHeroArt';
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
import { levelsCleared, totalStars } from '../../components/games/levels';

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
      { id: 'spot-the-change', name: 'Spot the Change', blurb: 'One tile changes. Which one was it?', Component: SpotTheChange }
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
      { id: 'lights-out', name: 'Lights Out', blurb: 'Turn every light off. Taps flip neighbours.', Component: LightsOut }
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
      { id: 'word-roots', name: 'Word Roots', blurb: 'What does this prefix or root mean?', Component: WordRoots }
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
      { id: 'running-total', name: 'Running Total', blurb: 'Numbers arrive one at a time. Keep the total.', Component: RunningTotal }
    ]
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

const HOW_MANY_SHOWN = 3;

/** One figure in the "Your game journey" card. */
function JourneyStat({ icon: Icon, value, label, tint, ring }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tint} ${ring}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-xl leading-none font-black text-ink-900 tabular-nums">{value}</span>
      <span className="text-[0.68rem] font-semibold text-ink-400">{label}</span>
    </div>
  );
}

/**
 * One game card.
 *
 * Its own illustration rather than a repeated category icon, so a game can be
 * found by its shape; a round play button in the category's colour; and the
 * two facts that matter before you start — how many difficulties, how many
 * levels inside each.
 */
function GameCard({ game, category, reached, onPlay }) {
  const started = reached > 1;

  return (
    <button
      type="button"
      onClick={() => onPlay(game)}
      className="fp-press group flex flex-col rounded-2xl border border-line-200 bg-surface p-4 text-left transition-all hover:-translate-y-0.5 hover:border-journey-200 hover:shadow-card-hover"
    >
      <span className="flex items-start gap-3">
        <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${category.thumb}`}>
          <GameThumb id={game.id} className="h-11 w-11" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-sm leading-tight font-black text-ink-900">{game.name}</span>
          <span className="mt-1 block text-xs leading-relaxed text-ink-500">{game.blurb}</span>
        </span>

        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-md transition-transform group-hover:scale-110 ${category.band} ${category.glow}`}
        >
          <Play className="h-4 w-4 fill-current" />
        </span>
      </span>

      <span className="mt-4 flex flex-wrap items-center gap-2 border-t border-line-100 pt-3">
        {started ? (
          <>
            <span
              className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[0.68rem] font-black text-white ${category.pill}`}
            >
              <Trophy className="h-3 w-3" />
              Level {reached}
            </span>

          </>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[0.68rem] font-bold text-ink-400">
            <Layers className="h-3 w-3" />
            Levels get harder as you go
          </span>
        )}
      </span>
    </button>
  );
}

/**
 * 🎮 Brain games — a short, deliberate break that still asks something of you.
 *
 * Four categories, five games each, three difficulties per game and ten earned
 * levels inside every one. Everything runs in the browser and nothing is
 * scored on the server: no XP, no streaks, no badges. That is a decision
 * rather than an omission — XP measures real work on the roadmap, and letting
 * a student farm it from a memory game would quietly make every number on
 * their progress page mean less.
 */
export default function Games() {
  const [active, setActive] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set());
  const progress = readProgress();

  const totalGames = CATEGORIES.reduce((n, c) => n + c.games.length, 0);
  // Real progress: every level actually cleared, across every game and band.
  const cleared = levelsCleared();
  const stars = totalStars();

  if (active) {
    const Game = active.Component;
    return (
      <div className="fp-enter space-y-5">
        <Game onExit={() => setActive(null)} />
      </div>
    );
  }

  const toggle = (key) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="fp-enter space-y-6">
      {/* ---- Header: the pitch on the left, the student's tally on the right */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-50 via-indigo-50 to-sky-50 p-5 ring-1 ring-violet-100 ring-inset sm:p-6">
        <div className="relative grid items-center gap-5 lg:grid-cols-[auto_minmax(0,1fr)_auto]">
          <ControllerArt className="hidden h-32 w-36 shrink-0 lg:block" />

          <div className="min-w-0">
            <p className="text-[0.7rem] font-black tracking-[0.11em] text-journey-600 uppercase">
              Brain games
            </p>
            <h1 className="mt-1 text-2xl leading-tight font-black text-ink-900 sm:text-3xl">
              Your brain&apos;s next <span className="text-journey-600">boss battle</span> starts here
            </h1>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-600">
              <span className="font-bold text-ink-800">Where every challenge makes you sharper.</span>{' '}
              {totalGames} quick games for memory, logic, words and numbers — start at level one and
              see how far you can climb.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <TrophyPodiumArt className="hidden h-32 w-40 shrink-0 xl:block" />

            <div className="w-full rounded-2xl border border-line-200 bg-surface p-4 shadow-card sm:w-auto">
              <p className="mb-3 text-center text-xs font-black text-ink-900">Your game journey</p>
              <div className="grid grid-cols-3 gap-4 sm:gap-6">
                <JourneyStat
                  icon={Gamepad2}
                  value={totalGames}
                  label="Games"
                  tint="bg-violet-100 text-violet-700"
                />
                <JourneyStat
                  icon={Target}
                  value={cleared}
                  label="Cleared"
                  tint="bg-emerald-100 text-emerald-700"
                />
                <JourneyStat
                  icon={Trophy}
                  value={stars}
                  label="Stars"
                  tint="bg-amber-100 text-amber-700"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Categories ------------------------------------------------- */}
      {CATEGORIES.map((category) => {
        const Icon = category.icon;
        const open = expanded.has(category.key);
        const shown = open ? category.games : category.games.slice(0, HOW_MANY_SHOWN);

        return (
          <section key={category.key}>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex items-center gap-2 rounded-xl bg-gradient-to-r px-3 py-1.5 text-xs font-black text-white ${category.band}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {category.name}
              </span>
              <p className="min-w-0 flex-1 text-sm text-ink-500">{category.blurb}</p>
              {category.games.length > HOW_MANY_SHOWN && (
                <button
                  type="button"
                  onClick={() => toggle(category.key)}
                  className="group inline-flex shrink-0 items-center gap-1 text-xs font-black text-journey-700 hover:underline"
                >
                  {open ? 'Show less' : `See all ${category.games.length}`}
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </button>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {shown.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  category={category}
                  reached={progress[game.id] || 1}
                  onPlay={setActive}
                />
              ))}
            </div>
          </section>
        );
      })}

      <p className="px-1 text-xs leading-relaxed text-ink-400">
        Your level in each game is kept in this browser only — it follows the device rather than
        the account.
      </p>
    </div>
  );
}
