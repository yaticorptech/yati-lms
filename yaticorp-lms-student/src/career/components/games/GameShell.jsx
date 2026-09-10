import { ArrowLeft, RotateCcw, Star, Timer, Trophy, Layers, Zap } from 'lucide-react';
import { LevelIntro, LevelResult } from './LevelPanels';
import { starsForGame, starsOn } from './levels';

/**
 * The frame every game sits in: who you are playing, how you are doing, which
 * band you chose, and how far up it you have climbed.
 *
 * Difficulty is a dropdown here rather than three buttons on the hub card, so
 * a student picks a band once they are already in the game — and inside the
 * band the level rises by being earned, not by being chosen.
 *
 * Shared so twelve games cannot drift into twelve ideas of where the score
 * lives or what "back" does.
 */
import { useEffect } from 'react';

/**
 * Every game reports its score as "done/needed". Reading it here means a
 * progress bar for all of them without a single game having to pass one, and
 * without inventing a second source of truth for the same two numbers.
 *
 * Drawn in the game's own colour rather than green, because for a few games
 * the number counts moves spent rather than points won, and a green bar
 * filling up would congratulate a student for running out.
 */
const meterFrom = (score) => {
  const m = /^(\d+)\/(\d+)$/.exec(String(score ?? ''));
  if (!m) return null;
  const [, done, needed] = m;
  if (Number(needed) <= 0) return null;
  return Math.min(100, (Number(done) / Number(needed)) * 100);
};

/**
 * One cell of the console: what it is, then what it says.
 *
 * The label is the whole point. Four identical pills carrying four different
 * numbers meant reading all of them to find the one you wanted.
 */
function Readout({ label, value, icon: Icon, urgent = false, gold = false }) {
  return (
    <div
      className={`flex min-w-[4.5rem] flex-col items-center justify-center px-3.5 py-2 transition-colors ${
        urgent ? 'bg-rose-500/40' : gold ? 'bg-amber-300/20' : ''
      }`}
    >
      <span className="flex items-center gap-1 text-[0.55rem] font-black tracking-[0.14em] text-white/65 uppercase">
        {Icon && <Icon className="h-2.5 w-2.5" />}
        {label}
      </span>
      <span className={`text-lg leading-tight font-black tabular-nums ${gold ? 'text-amber-100' : 'text-white'}`}>
        {value}
      </span>
    </div>
  );
}

/** One card in the right rail: an icon, a label, and one figure. */
function RailCard({ tint, icon: Icon, iconTint, label, value }) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 ring-1 ring-inset ${tint}`}>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm ${iconTint}`}>
        <Icon className="h-4.5 w-4.5" />
      </span>
      <span className="min-w-0">
        <span className="block text-[0.62rem] font-black tracking-[0.1em] text-ink-500 uppercase">{label}</span>
        <span className="block text-base leading-tight font-black text-ink-900 tabular-nums">{value}</span>
      </span>
    </div>
  );
}

/** Three stars, filled as far as this level has been earned. */
function StarRow({ earned }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3].map((n) => (
        <Star
          key={n}
          className={`h-4 w-4 ${n <= earned ? 'fill-amber-400 text-amber-400' : 'fill-line-200 text-line-200'}`}
        />
      ))}
    </span>
  );
}

export default function GameShell({
  title,
  blurb,
  tone,
  score,
  scoreLabel = 'Score',
  seconds,
  best,
  progress,
  onRestart,
  onExit,
  intro,
  result,
  children,
  footer
}) {
  /* What this level is worth and what the game has banked. Read here rather
     than passed in by each game, because every game already records both
     through the same store. */
  const earnedHere = progress ? starsOn(progress.gameId, progress.level) : 0;
  const bankedStars = progress ? starsForGame(progress.gameId) : 0;

  // Tell the mascot: the rules are on screen (it explains them), and how the
  // level went (a dance, or a droop then a word of encouragement).
  useEffect(() => {
    if (intro) window.dispatchEvent(new CustomEvent('mascot:game-start', { detail: { title, blurb } }));
  }, [intro, title, blurb]);
  useEffect(() => {
    if (result) window.dispatchEvent(new CustomEvent('mascot:game-result', { detail: { passed: !!result.passed } }));
  }, [result]);

  return (
    <section data-guide="game" className="overflow-hidden rounded-3xl border border-line-200 bg-surface shadow-card">
      <div className={`relative overflow-hidden text-white ${tone}`}>
        <div aria-hidden className="fp-stars pointer-events-none absolute inset-0" />
        {/* Soft shapes behind the band, so it has weather rather than being a
            flat rectangle of colour. */}
        <span aria-hidden className="pointer-events-none absolute -top-28 -left-20 h-64 w-80 rounded-full bg-white/20 blur-3xl" />
        <span aria-hidden className="pointer-events-none absolute -right-16 -bottom-24 h-56 w-72 rounded-full bg-white/10 blur-3xl" />

        <div className="relative flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 sm:px-6 sm:py-5">
          <button
            type="button"
            onClick={onExit}
            aria-label="Back to all games"
            className="fp-press inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25 ring-inset transition-colors hover:bg-white/25"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            {/* The game's name reads as the label; what you have to do reads as
                the headline, because that is the thing a student needs. */}
            <p className="text-[0.68rem] font-black tracking-[0.16em] text-white/70 uppercase">{title}</p>
            <h2 className="mt-0.5 truncate text-xl leading-tight font-black sm:text-2xl">
              {blurb || title}
            </h2>
          </div>

          {!intro && !result && (
            <div className="flex shrink-0 items-stretch divide-x divide-white/20 overflow-hidden rounded-2xl bg-black/20 ring-1 ring-white/20 ring-inset">
              {progress && <Readout label="Level" value={progress.level} icon={Star} />}
              {score !== undefined && <Readout label={scoreLabel} value={score} />}
              {seconds !== undefined && (
                <Readout label="Time" value={`${seconds}s`} icon={Timer} urgent={seconds <= 10} />
              )}
              {best ? <Readout label="Best" value={best} icon={Trophy} gold /> : null}
            </div>
          )}

          <button
            type="button"
            onClick={onRestart}
            aria-label="Start over"
            className="fp-press inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25 ring-inset transition-colors hover:bg-white/25"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* How far through the level, under the band where the eye already is. */}
      {!intro && !result && meterFrom(score) !== null && (
        <div className="h-1.5 w-full bg-line-100" role="presentation">
          <div
            className={`h-full rounded-r-full transition-[width] duration-500 ease-out ${tone}`}
            style={{ width: `${meterFrom(score)}%` }}
          />
        </div>
      )}

      {/* One body, three states: the level briefing, the level itself, and
          the verdict. Only one is ever on screen.

          The floor has a height, but not a cavernous one: a board of two
          buttons floating in the middle of a very tall box reads as a page
          that failed to load rather than a game.

          Play gets its own treatment. A game board floating at the top of a
          tall white box reads as an unfinished page, so the board is given a
          stage: a floor of real height, its contents centred on it, and a wash
          of the game's own colour behind them. The wash is the `tone` gradient
          at six per cent, which means every game is tinted its own shade
          without a single one of them having to say so. */}
      {intro || result ? (
        <div className="p-5 sm:p-6">
          {intro ? <LevelIntro {...intro} tone={tone} /> : <LevelResult {...result} tone={tone} />}
        </div>
      ) : (
        <div className="relative overflow-hidden bg-surface-50 p-4 sm:p-6">
          {/* Soft shapes in the corners, the same language as the band above. */}
          <span aria-hidden className={`pointer-events-none absolute -top-24 -left-20 h-56 w-72 rounded-full opacity-[0.14] blur-3xl ${tone}`} />
          <span aria-hidden className="pointer-events-none absolute -right-24 -bottom-28 h-64 w-80 rounded-full bg-violet-300/25 blur-3xl" />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              color: 'var(--color-line-200)'
            }}
          />

          <div className="relative z-10 mx-auto grid w-full max-w-6xl items-start gap-4 xl:grid-cols-[11.5rem_minmax(0,1fr)_13rem]">
            {/* Left rail: what to do, said once and left there. */}
            <aside className="hidden xl:block">
              {footer && (
                <div className="rounded-2xl bg-violet-50 px-4 py-3.5 text-center text-sm leading-relaxed font-bold text-violet-900 ring-1 ring-violet-100 ring-inset [&_p]:text-sm [&_p]:text-violet-900">
                  {footer}
                </div>
              )}
            </aside>

            {/* The board itself. */}
            <div className="min-w-0">
              <div className="flex min-h-[15rem] items-center justify-center rounded-3xl bg-surface px-4 py-6 shadow-card ring-1 ring-line-200 ring-inset sm:min-h-[17rem] sm:px-7 sm:py-8">
                <div className="w-full">{children}</div>
              </div>

              {/* How the round is going, under the board where the eye lands
                  after a move. */}
              {score !== undefined && (
                <p className="mx-auto mt-3 w-fit rounded-full bg-surface px-4 py-1.5 text-xs font-bold text-ink-600 shadow-sm ring-1 ring-line-200 ring-inset">
                  {scoreLabel} {score}
                </p>
              )}

              {/* On narrower screens the rails are gone, so the hint comes back
                  under the board rather than disappearing with them. */}
              {footer && (
                <div className="mt-3 text-center text-xs font-semibold text-ink-400 xl:hidden [&_p]:text-xs [&_p]:text-ink-400">
                  {footer}
                </div>
              )}
            </div>

            {/* Right rail: what this level is worth, and what has been banked
                so far. Stars, not XP — these games award no XP by design, and
                a panel promising some would be promising what is not paid. */}
            <aside className="hidden flex-col gap-2.5 xl:flex">
              <RailCard
                tint="bg-amber-50 ring-amber-100"
                icon={Star}
                iconTint="bg-amber-400 text-white"
                label="Stars on offer"
                value={<StarRow earned={earnedHere} />}
              />
              <RailCard
                tint="bg-violet-50 ring-violet-100"
                icon={Layers}
                iconTint="bg-violet-500 text-white"
                label="Level"
                value={progress ? progress.level : '—'}
              />
              <RailCard
                tint="bg-emerald-50 ring-emerald-100"
                icon={Zap}
                iconTint="bg-emerald-500 text-white"
                label="Stars in this game"
                value={bankedStars}
              />
            </aside>
          </div>
        </div>
      )}

    </section>
  );
}
