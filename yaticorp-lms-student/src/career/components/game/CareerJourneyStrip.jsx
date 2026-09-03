import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Flag, Lock } from 'lucide-react';
import { phaseStates, phaseTitle, parseChoices } from '../../utils/roadmap';

/* The road between two stones. Walked road is solid emerald, the rest is a
   faint rule — the same distinction the tiles make, so the eye can follow the
   path without reading a single word. Sits at the vertical centre of the
   badges: 1rem of card padding + half of a 3rem badge. */
const Track = ({ walked }) => (
  <span
    aria-hidden
    className={`mt-[2.6rem] h-1 w-7 shrink-0 self-start rounded-full sm:w-9 ${
      walked ? 'bg-emerald-400' : 'bg-line-300'
    }`}
  />
);

/**
 * 🗺️ The whole journey as a row of stepping stones you can read.
 *
 * It began as bare dots on a hairline, with each phase name squeezed into 96px
 * and clipped mid-word — "Internships & Industry…", "Job Applications …" — so
 * the one thing the strip exists to say, what each stage *is*, was the thing it
 * cut. Every checkpoint is a card now: wide enough for the real title, tinted
 * by its own state, and lifted where the student is standing.
 *
 * Four states, each legible without reading the label:
 *
 *   done        emerald tile, ticked
 *   current     white tile lifted off the row, ringed and haloed
 *   locked      flat grey tile, padlock
 *   destination amber tile, flag, the student's actual goal
 *
 * Scrolls, and brings the current phase to the middle on arrival. A roadmap
 * runs from six phases to eighteen depending on where the student started, so
 * it can never assume it fits — and a strip that does not move on its own would
 * leave "you are here" off-screen for anyone past the third checkpoint.
 *
 * Nothing here is clickable: the header's "View roadmap" is the single route to
 * that page, and making twelve tiles into twelve more links to it was exactly
 * the duplication this page was cleaned up to remove.
 *
 * Every node is a real phase from the generated roadmap. Nothing is invented,
 * and the count is whatever that student's path actually holds.
 */
export default function CareerJourneyStrip({ phases = [], completedPhases = [], goal }) {
  const railRef = useRef(null);
  const states = phaseStates(phases.length, completedPhases);
  const currentIndex = states.indexOf('current');
  const doneCount = states.filter((s) => s === 'done').length;

  useEffect(() => {
    const rail = railRef.current;
    const active = rail?.querySelector('[data-current="true"]');
    if (!rail || !active) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    active.scrollIntoView({
      behavior: reduced ? 'auto' : 'smooth',
      inline: 'center',
      block: 'nearest'
    });
  }, [currentIndex]);

  if (phases.length === 0) return null;

  /** Phase titles run long; the lead-in before a colon is the stage's name. */
  const shortTitle = (phase) => {
    const full = phaseTitle(phase);
    return parseChoices(full)?.lead || full;
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-line-200 bg-surface p-5 shadow-card sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-black text-ink-900">
            <span aria-hidden>🗺️</span>
            Your career journey
          </h2>
          <p className="mt-0.5 text-xs font-semibold text-ink-500">
            <span className="tabular-nums">
              {doneCount} of {phases.length}
            </span>{' '}
            {doneCount === 1 ? 'stage' : 'stages'} complete
          </p>
        </div>
        <Link
          to="/career/roadmap"
          className="group inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-journey-50 px-3 py-1.5 text-xs font-black text-journey-700 transition-colors hover:bg-journey-100"
        >
          View roadmap
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* The rail bleeds to the card edges so a scrolled tile is cut by the
          card, not floating in a gutter; the masks fade that cut instead of
          letting a half tile end abruptly. */}
      <div className="relative">
        <div
          ref={railRef}
          className="-mx-5 overflow-x-auto px-5 pb-1 [scroll-padding-inline:1.25rem] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-6 sm:px-6"
        >
          <ol className="flex w-max min-w-full items-stretch justify-center">
            {phases.map((phase, index) => {
              const state = states[index];
              const done = state === 'done';
              const current = state === 'current';

              return (
                <li
                  key={index}
                  className="flex items-stretch"
                  data-current={current || undefined}
                >
                  {index > 0 && <Track walked={states[index - 1] === 'done'} />}

                  <div
                    className={`flex w-32 shrink-0 flex-col items-center rounded-2xl px-2.5 pt-4 pb-3 text-center transition-transform sm:w-36 ${
                      done
                        ? 'bg-emerald-50/70 ring-1 ring-emerald-100 ring-inset'
                        : current
                          ? '-translate-y-1 bg-journey-50 shadow-lg shadow-journey-600/20 ring-2 ring-journey-400 ring-inset'
                          : 'bg-surface-50 ring-1 ring-line-200 ring-inset'
                    }`}
                  >
                    <span className="relative flex h-12 w-12 items-center justify-center">
                      {/* Three pulses on the live checkpoint, then still — long
                          enough to find it on arrival, not so long that it is
                          still flashing while the phase is being read. */}
                      {current && (
                        <span
                          aria-hidden
                          className="fp-halo absolute inset-0 rounded-full bg-journey-400/50 blur-md"
                        />
                      )}
                      <span
                        className={`relative flex h-12 w-12 items-center justify-center rounded-full text-sm font-black ${
                          done
                            ? 'fp-done-gradient text-white shadow-md shadow-emerald-600/25'
                            : current
                              ? 'bg-gradient-to-br from-journey-500 to-indigo-600 text-white shadow-lg shadow-journey-600/35'
                              : 'bg-surface-100 text-ink-400 ring-1 ring-line-200 ring-inset'
                        }`}
                      >
                        {done ? (
                          <Check className="h-5 w-5" strokeWidth={3} />
                        ) : current ? (
                          index + 1
                        ) : (
                          <Lock className="h-4 w-4" strokeWidth={2.6} />
                        )}
                      </span>
                    </span>

                    {/* Three lines, not two: at this width two clipped every
                        phase name the generator produces past ~40 characters.
                        Fixed box so every tile in the row aligns. */}
                    <span className="mt-2.5 flex min-h-[2.7rem] items-center">
                      <span
                        className={`overflow-hidden text-[0.72rem] leading-tight font-bold [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3] ${
                          current ? 'text-ink-900' : done ? 'text-ink-700' : 'text-ink-400'
                        }`}
                      >
                        {shortTitle(phase)}
                      </span>
                    </span>

                    <span
                      className={`mt-1.5 rounded-full px-2 py-0.5 text-[0.6rem] font-black tracking-wide uppercase ${
                        done
                          ? 'bg-emerald-100 text-emerald-700'
                          : current
                            ? 'fp-journey-gradient text-white'
                            : 'bg-surface-100 text-ink-400'
                      }`}
                    >
                      {done ? 'Done' : current ? 'You are here' : 'Locked'}
                    </span>
                  </div>
                </li>
              );
            })}

            {/* The destination closes the road rather than letting it run out. */}
            <li className="flex items-stretch">
              <Track walked={doneCount === phases.length} />
              <div className="flex w-32 shrink-0 flex-col items-center rounded-2xl bg-amber-50 px-2.5 pt-4 pb-3 text-center ring-1 ring-amber-200 ring-inset sm:w-36">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-orange-600/30">
                  <Flag className="h-5 w-5" strokeWidth={2.6} />
                </span>
                <span className="mt-2.5 flex min-h-[2.7rem] items-center">
                  <span className="overflow-hidden text-[0.72rem] leading-tight font-black text-ink-900 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]">
                    {goal?.careerGoal || 'Your goal'}
                  </span>
                </span>
                <span className="mt-1.5 rounded-full bg-amber-400 px-2 py-0.5 text-[0.6rem] font-black tracking-wide text-orange-950 uppercase">
                  Destination
                </span>
              </div>
            </li>
          </ol>
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -left-5 w-6 bg-gradient-to-r from-surface to-transparent sm:-left-6"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -right-5 w-6 bg-gradient-to-l from-surface to-transparent sm:-right-6"
        />
      </div>
    </section>
  );
}
