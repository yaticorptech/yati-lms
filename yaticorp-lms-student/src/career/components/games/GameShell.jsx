import { ArrowLeft, RotateCcw, Timer, Trophy, Layers } from 'lucide-react';
import { LevelIntro, LevelResult } from './LevelPanels';

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
  return (
    <section className="overflow-hidden rounded-3xl border border-line-200 bg-surface shadow-card">
      <div className={`relative p-5 text-white sm:p-6 ${tone}`}>
        <div aria-hidden className="fp-stars pointer-events-none absolute inset-0" />

        <div className="relative flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onExit}
            className="fp-press inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl bg-white/15 px-3 text-sm font-black ring-1 ring-white/25 ring-inset transition-colors hover:bg-white/25"
          >
            <ArrowLeft className="h-4 w-4" />
            All games
          </button>

          <div className="min-w-0 flex-1">
            <h2 className="text-lg leading-tight font-black">{title}</h2>
            {blurb && <p className="mt-0.5 text-xs font-semibold text-white/80">{blurb}</p>}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {progress && (
              /* One number, no menu. The difficulty rises with the level
                 rather than being chosen, so there is nothing to pick. */
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-2.5 py-1 text-sm font-black tabular-nums ring-1 ring-white/25 ring-inset">
                <Layers className="h-3.5 w-3.5" />
                Level {progress.level}
              </span>
            )}

            {seconds !== undefined && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-sm font-black tabular-nums ring-1 ring-inset ${
                  seconds <= 10 ? 'bg-rose-500/30 ring-rose-200/40' : 'bg-white/15 ring-white/25'
                }`}
              >
                <Timer className="h-3.5 w-3.5" />
                {seconds}s
              </span>
            )}

            {score !== undefined && (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-2.5 py-1 text-sm font-black tabular-nums ring-1 ring-white/25 ring-inset">
                {scoreLabel} {score}
              </span>
            )}

            {best ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400/25 px-2.5 py-1 text-sm font-black tabular-nums ring-1 ring-amber-200/40 ring-inset">
                <Trophy className="h-3.5 w-3.5" />
                {best}
              </span>
            ) : null}

            <button
              type="button"
              onClick={onRestart}
              aria-label="Start over"
              className="fp-press inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 ring-inset transition-colors hover:bg-white/25"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

      </div>

      <div className="p-5 sm:p-6">
        {/* One body, three states: the level briefing, the level itself, and
            the verdict. Only one is ever on screen. */}
        {intro ? (
          <LevelIntro {...intro} tone={tone} />
        ) : result ? (
          <LevelResult {...result} tone={tone} />
        ) : (
          children
        )}
      </div>

      {!intro && !result && footer && (
        <div className="border-t border-line-200 bg-surface-50/70 p-4">{footer}</div>
      )}
    </section>
  );
}
