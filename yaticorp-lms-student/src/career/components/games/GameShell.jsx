import { ArrowLeft, RotateCcw, Star, Timer, Trophy, Layers, Zap } from 'lucide-react';
import { LevelIntro, LevelResult } from './LevelPanels';
import MissionArt from '../plan/MissionArt';
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

/**
 * A game reports its score either as "done/needed" — a figure out of a fixed
 * maximum, read straight out of the string, which gets a progress bar here
 * without the game having to pass one — or as a plain figure. A plain figure
 * gets no bar and no target: what it is worth is said once, on the result
 * screen, as stars. While the level is being played the student sees the
 * score and the clock and nothing that grades them mid-round.
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
        urgent ? 'bg-rose-100' : gold ? 'bg-amber-50' : ''
      }`}
    >
      <span className="flex items-center gap-1 text-[0.55rem] font-black tracking-[0.14em] text-slate-500 uppercase">
        {Icon && <Icon className="h-2.5 w-2.5" />}
        {label}
      </span>
      <span className={`text-lg leading-tight font-black tabular-nums ${urgent ? 'text-rose-600' : gold ? 'text-amber-600' : 'text-[#1b2456]'}`}>
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

  return (
    <section data-guide="game" className="overflow-hidden rounded-3xl border border-line-200 bg-surface shadow-card">
      {/* A sky band in every game, not the game's own colour: the level
          briefing below carries the colour, and the band's job is to hold the
          objective legibly and the target art beside it. */}
      <div className="relative overflow-hidden bg-gradient-to-r from-sky-100 via-blue-50 to-indigo-100 text-[#1b2456]">
        {/* Soft shapes behind the band, so it has weather rather than being a
            flat rectangle of colour. */}
        <span aria-hidden className="fp-float pointer-events-none absolute -top-28 -left-20 h-64 w-80 rounded-full bg-sky-200/70 blur-3xl" />
        <span aria-hidden className="fp-float-slow pointer-events-none absolute -right-10 -bottom-24 h-56 w-80 rounded-full bg-violet-300/50 blur-3xl" />
        {/* The target, and the arrow on its way to it: the section's mission
            art, here for the two screens with room for it. During play the
            console sits where it would go. */}
        {(intro || result) && (
          <div aria-hidden className="pointer-events-none absolute inset-y-0 right-14 hidden w-[30%] max-w-[300px] [mask-image:linear-gradient(to_right,transparent,black_20%)] md:block sm:right-20">
            <MissionArt cleared={!!result?.passed} className="h-full w-full" />
          </div>
        )}

        <div className="relative flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 sm:px-6 sm:py-5">
          <button
            type="button"
            onClick={onExit}
            aria-label="Back to all games"
            className="fp-press relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#1b2456] shadow-md shadow-sky-900/10 ring-1 ring-sky-100 ring-inset transition-colors hover:bg-sky-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            {/* The game's name reads as the label; what you have to do reads as
                the headline, because that is the thing a student needs. */}
            <p className="text-[0.68rem] font-black tracking-[0.16em] text-violet-600 uppercase">{title}</p>
            {/* Up to three lines on a phone rather than one line cut short: this
                is the objective, and "One tile changes eac…" is not an
                objective. Wide screens keep the single truncating line — there
                the console sits beside it and the width is genuinely limited. */}
            <h2 className="mt-0.5 line-clamp-3 text-base leading-snug font-black text-[#1b2456] sm:line-clamp-none sm:truncate sm:text-2xl sm:leading-tight">
              {blurb || title}
            </h2>
            {/* The section's own line, only on the briefing: during play the
                band has a console to carry and no room for a flourish. */}
            {intro && (
              <p className="mt-1 hidden items-center gap-1.5 text-[0.95rem] text-[#2b4bd8] sm:flex">
                <span className="lb-script relative inline-block">
                  Small steps. Big dreams!
                  <svg aria-hidden viewBox="0 0 200 10" preserveAspectRatio="none" className="absolute -bottom-1 left-[6%] h-1.5 w-[88%] text-amber-400">
                    <path d="M3 6 C 50 1, 140 9, 197 3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </span>
              </p>
            )}
          </div>

          {/* On a phone the console takes a row of its own, under the title.
              In one row it left the title about sixty pixels — "SHAPE MATRIX"
              broke letter by letter, the objective truncated to "Re…", and
              the restart button fell to a second line on its own. `order-last`
              sends the console below the restart button in the wrap, and
              `basis-full` gives it the whole width there. */}
          {!intro && !result && (
            <div className="order-last flex basis-full items-stretch justify-center divide-x divide-sky-100 overflow-hidden rounded-2xl bg-white/85 shadow-md shadow-sky-900/10 ring-1 ring-sky-100 ring-inset backdrop-blur sm:order-none sm:shrink-0 sm:basis-auto sm:justify-start">
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
            className="fp-press relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#1b2456] shadow-md shadow-sky-900/10 ring-1 ring-sky-100 ring-inset transition-colors hover:bg-sky-50"
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
