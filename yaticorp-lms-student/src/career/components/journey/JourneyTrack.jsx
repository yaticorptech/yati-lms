import { Flag } from 'lucide-react';
import { travel, LEAD_S } from './journeyTravel';

/**
 * The whole roadmap as one line of checkpoints.
 *
 * The roadmap page already lists every phase in full, and the Overview already
 * counts them — what neither showed is the SHAPE of the journey: how much lies
 * behind, how much ahead, and where the student is standing between the two.
 * A number ("Phase 4 of 9") states that; a track lets it be seen without
 * reading, which is the difference between a statistic and a sense of progress.
 *
 * Deliberately not interactive. It sits inside the roadmap hero as an
 * orientation device; the phases themselves are opened in the list below,
 * where there is room to actually read one.
 *
 * On arrival it plays the journey rather than just showing its result. The
 * travelled run of the rail fills from Start one segment at a time, the
 * checkpoint being stood on lights up the moment the fill reaches it, and
 * everything else on the page that says "how far" — the percentage, the
 * card's pulse — is timed off the same `travel()` clock so it all lands
 * together. Four things arriving at four different times said "loading";
 * four things arriving at once say "this far".
 *
 * Sized to fit any roadmap. These run from six phases for a working
 * professional to fifteen for a Class 6 student, so the checkpoints share the
 * available width rather than claiming a fixed size each — the alternative
 * scrolls sideways on a phone, which is the one thing an at-a-glance component
 * must never do.
 */
/**
 * The same check useCountUp makes. The global reduced-motion rule collapses
 * every duration but leaves delays alone, so a checkpoint told to wait 1.4s
 * before a 0.01ms pop would sit invisible for 1.4s — a blank track, which is
 * the opposite of what the preference asks for. With it set, nothing waits.
 */
const reducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function JourneyTrack({ states = [], tone = 'dark' }) {
  if (!states.length) return null;

  const { step, arrive } = travel(states);
  const still = reducedMotion();
  const at = (seconds) => (still ? '0s' : `${seconds.toFixed(2)}s`);

  const isLight = tone === 'light';

  // The rail behind the checkpoints, in its two halves: travelled and not.
  const railDone = isLight ? 'bg-emerald-500' : 'bg-emerald-400';
  const railTodo = isLight ? 'bg-surface-200' : 'bg-white/20';

  const dot = {
    done: isLight
      ? 'h-2.5 w-2.5 bg-emerald-500'
      : 'h-2.5 w-2.5 bg-emerald-400',
    current: isLight
      ? 'h-4 w-4 bg-brand-600 ring-4 ring-brand-100'
      : 'h-4 w-4 bg-white ring-4 ring-white/25',
    upcoming: isLight
      ? 'h-2 w-2 bg-surface-200 ring-1 ring-line-300'
      : 'h-2 w-2 bg-white/25'
  };

  const lastIndex = states.length - 1;

  return (
    <ol className="flex items-center" aria-hidden="true">
      {states.map((state, index) => {
        const isLast = index === lastIndex;
        // The destination is drawn as a flag rather than a dot: the last
        // checkpoint is not one more step, it is the thing all of them are for.
        const isGoalPost = isLast;

        return (
          <li key={index} className={`flex items-center ${isLast ? 'shrink-0' : 'min-w-0 flex-1'}`}>
            {isGoalPost ? (
              <span
                style={{ animationDelay: at(arrive + 0.12) }}
                className={`animate-pop-in flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                  state === 'done'
                    ? isLight
                      ? 'bg-emerald-500 text-white'
                      : 'bg-emerald-400 text-emerald-950'
                    : isLight
                      ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-200'
                      : 'bg-amber-400/90 text-amber-950'
                }`}
              >
                <Flag className="h-3 w-3" strokeWidth={2.6} />
              </span>
            ) : (
              <span className="relative flex shrink-0 items-center justify-center">
                {/* A few pulses on the checkpoint being stood on, then still. */}
                {state === 'current' && (
                  <span
                    aria-hidden
                    style={{ animationDelay: at(arrive) }}
                    className={`fp-halo absolute h-7 w-7 rounded-full blur-sm ${
                      isLight ? 'bg-brand-400/50' : 'bg-white/40'
                    }`}
                  />
                )}
                <span
                  style={{ animationDelay: at(state === 'current' ? arrive : 0.15 + index * 0.07) }}
                  className={`animate-pop-in relative shrink-0 rounded-full transition-all duration-500 ${dot[state]}`}
                />
              </span>
            )}

            {/* The connector carries the progress, not the dots: a segment is
                filled once the phase behind it is finished, so the coloured
                run reads as distance covered rather than as items ticked. */}
            {!isLast && (
              <span
                style={
                  state === 'done'
                    ? { animationDelay: at(LEAD_S + index * step), animationDuration: still ? '0.01ms' : `${step.toFixed(2)}s` }
                    : undefined
                }
                className={`h-0.5 min-w-1.5 flex-1 origin-left rounded-full transition-colors duration-500 ${
                  state === 'done' ? `fp-fill ${railDone}` : railTodo
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
