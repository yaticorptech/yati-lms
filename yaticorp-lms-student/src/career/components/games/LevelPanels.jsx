import { Star, Play, Target, Timer, Trophy, ChevronRight, RotateCcw } from 'lucide-react';
import { recentTrail } from './levels';
import GameThumb from './GameThumb';
import '../artwork.css';

/** Three stars, filled to `earned`. */
function Stars({ earned, size = 'h-8 w-8', animate = false }) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {[1, 2, 3].map((n) => (
        <Star
          key={n}
          className={`${size} transition-all ${
            n <= earned ? 'fill-amber-400 text-amber-400' : 'fill-ink-200/40 text-ink-200'
          } ${animate && n <= earned ? 'animate-badge-burst' : ''}`}
          style={animate ? { animationDelay: `${0.12 * n}s` } : undefined}
        />
      ))}
    </div>
  );
}

/**
 * The screen before a level starts.
 *
 * Real games do not drop you straight into play — they tell you which level
 * this is, what the bar is, and let you begin when you are ready. Without it
 * the clock was already running before the student had read the objective.
 */
export function LevelIntro({ gameId, level, objective, seconds, stars, onStart, tone }) {
  const trail = recentTrail(gameId, level);

  return (
    <div className="mx-auto max-w-xl">
      {/* The level itself, with the game's own picture behind the number. No
          total anywhere: the ladder should feel like it keeps going rather
          than like a bar you are 2% along. */}
      <div className={`relative overflow-hidden rounded-3xl p-6 text-white ${tone}`}>
        <div aria-hidden className="fp-stars pointer-events-none absolute inset-0" />
        <div
          aria-hidden
          className="fp-float pointer-events-none absolute -top-12 -right-10 h-40 w-40 rounded-full bg-white/25 blur-2xl"
        />
        {gameId && (
          <GameThumb
            id={gameId}
            className="pointer-events-none absolute -right-3 -bottom-5 h-32 w-32 opacity-25"
          />
        )}

        <div className="relative flex flex-wrap items-center gap-5">
          <div className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-3xl bg-white/15 ring-1 ring-white/25 ring-inset">
            <span className="text-[0.6rem] font-black tracking-[0.2em] text-white/70 uppercase">
              Level
            </span>
            <span className="yatiArt-bob text-4xl leading-none font-black tabular-nums">{level}</span>
          </div>

          <div className="min-w-0 flex-1">
            <Stars earned={stars} size="h-7 w-7" />
            <p className="mt-1.5 text-xs font-bold text-white/75">
              {stars > 0 ? `Your best here: ${stars} of 3 stars` : 'No stars on this level yet'}
            </p>

            {/* Where they have just been, rather than how far there is to go. */}
            {trail.length > 0 && (
              <div className="mt-3 flex items-center gap-1.5">
                {trail.map((t) => (
                  <span
                    key={t.level}
                    title={`Level ${t.level}: ${t.stars} of 3 stars`}
                    className={`flex h-7 w-7 items-center justify-center rounded-lg text-[0.6rem] font-black tabular-nums ${
                      t.stars > 0 ? 'bg-amber-400/90 text-amber-950' : 'bg-white/15 text-white/60'
                    }`}
                  >
                    {t.stars > 0 ? `${t.stars}★` : t.level}
                  </span>
                ))}
                <ChevronRight className="h-4 w-4 text-white/50" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* What this level asks for. */}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <p className="flex items-start gap-2.5 rounded-2xl bg-surface-50 px-4 py-3.5 text-sm font-bold text-ink-800 ring-1 ring-line-200 ring-inset">
          <Target className="mt-0.5 h-4 w-4 shrink-0 text-journey-600" />
          {objective}
        </p>
        {seconds !== undefined ? (
          <p className="flex items-center gap-2.5 rounded-2xl bg-surface-50 px-4 py-3.5 text-sm font-bold text-ink-800 ring-1 ring-line-200 ring-inset">
            <Timer className="h-4 w-4 shrink-0 text-orange-500" />
            {seconds} seconds on the clock
          </p>
        ) : (
          <p className="flex items-center gap-2.5 rounded-2xl bg-surface-50 px-4 py-3.5 text-sm font-bold text-ink-800 ring-1 ring-line-200 ring-inset">
            <Trophy className="h-4 w-4 shrink-0 text-amber-500" />
            Take as long as you like
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onStart}
        autoFocus
        className="fp-press fp-sweep mt-4 inline-flex min-h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-journey-500 to-indigo-600 text-base font-black text-white shadow-lg shadow-journey-600/30"
      >
        <Play className="h-5 w-5 fill-current" />
        Start level {level}
      </button>
    </div>
  );
}

/**
 * The screen after a level ends: stars, the numbers, and the way onward.
 *
 * Clearing a level is the moment worth marking, so it gets the celebration —
 * and a miss gets the same panel without the fanfare rather than a scolding.
 */
export function LevelResult({ passed, stars, headline, detail, atEnd, onNext, onRetry, tone }) {
  return (
    <div className="mx-auto max-w-sm text-center">
      <div
        className={`relative overflow-hidden rounded-3xl p-6 text-white ${
          passed ? tone : 'bg-gradient-to-br from-slate-500 to-slate-700'
        }`}
      >
        <div aria-hidden className="fp-stars pointer-events-none absolute inset-0" />
        <p className="relative text-[0.7rem] font-black tracking-[0.2em] text-white/80 uppercase">
          {passed ? 'Level complete' : 'Not quite'}
        </p>

        <div className="relative mt-3">
          <Stars earned={stars} animate={passed} />
        </div>

        <p className="relative mt-4 text-xl leading-tight font-black">{headline}</p>
        {detail && <p className="relative mt-1 text-sm font-semibold text-white/80">{detail}</p>}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {passed && !atEnd && (
          <button
            type="button"
            onClick={onNext}
            autoFocus
            className="fp-press inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-journey-500 to-indigo-600 text-base font-black text-white shadow-lg shadow-journey-600/30"
          >
            Next level
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
        {passed && atEnd && (
          <p className="flex items-center justify-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-black text-amber-800 ring-1 ring-amber-200 ring-inset">
            <Trophy className="h-4 w-4" />
            You have cleared every level in this game.
          </p>
        )}
        <button
          type="button"
          onClick={onRetry}
          className="fp-press inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-surface-100 text-sm font-black text-ink-700"
        >
          <RotateCcw className="h-4 w-4" />
          {passed ? 'Play this level again' : 'Try again'}
        </button>
      </div>
    </div>
  );
}
