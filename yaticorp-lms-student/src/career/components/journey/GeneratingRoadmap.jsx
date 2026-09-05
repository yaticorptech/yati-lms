import { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { YatiOrbit } from '../../../components/YatiLoader';

/**
 * ✨ What the student watches while their roadmap is being written.
 *
 * Generation takes roughly ten seconds — long enough that a bare spinner reads
 * as a stall, and long enough that the moment is worth something. This names
 * what is being worked out, in the order the prompt actually asks for it.
 *
 * The stages advance on a timer, and are deliberately NOT dressed as measured
 * progress: no percentage, no bar, and the final stage holds until the real
 * response lands rather than completing itself. A fabricated "80%" would be a
 * claim about a request we cannot see inside; a sequence of named stages is
 * only a description of the work, which is true whenever it is on screen.
 */
const STAGES = [
  { emoji: '🧭', label: 'Reading where you are today' },
  { emoji: '🎯', label: 'Working out what your goal really needs' },
  { emoji: '🗺️', label: 'Mapping the stages between the two' },
  { emoji: '🧠', label: 'Choosing the skills each stage builds' },
  { emoji: '✨', label: 'Writing your roadmap' }
];

const STAGE_MS = 2200;

export default function GeneratingRoadmap() {
  const [reached, setReached] = useState(0);

  useEffect(() => {
    if (reached >= STAGES.length - 1) return undefined;
    const timer = setTimeout(() => setReached((n) => n + 1), STAGE_MS);
    return () => clearTimeout(timer);
  }, [reached]);

  return (
    <div className="animate-fade-in-up relative overflow-hidden rounded-3xl bg-gradient-to-br from-journey-50 via-surface to-pink-50 p-6 shadow-card ring-1 ring-journey-100 ring-inset sm:p-10">
      <div
        aria-hidden
        className="fp-float pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-journey-200/50 blur-3xl"
      />
      <div
        aria-hidden
        className="fp-float-slow pointer-events-none absolute -bottom-20 -left-14 h-48 w-48 rounded-full bg-pink-200/50 blur-3xl"
      />

      <div className="relative mx-auto max-w-md">
        <div className="flex flex-col items-center text-center">
          <YatiOrbit size={150} mood="thinking" />
          <p className="mt-4 text-[0.68rem] font-black tracking-[0.18em] text-journey-600 uppercase">
            Building your roadmap
          </p>
          <h2 className="mt-1.5 text-xl leading-tight font-black text-ink-900 sm:text-2xl">
            Creating your career journey
          </h2>
          <p className="mt-1 text-sm text-ink-500">This usually takes about 10 seconds.</p>
        </div>

        <ol className="mt-8 space-y-3">
          {STAGES.map((stage, index) => {
            const done = index < reached;
            const active = index === reached;

            return (
              <li
                key={stage.label}
                className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm transition-all duration-300 ${
                  active
                    ? 'animate-fade-in-up bg-surface font-black text-ink-900 shadow-card ring-1 ring-journey-200 ring-inset'
                    : done
                      ? 'font-semibold text-emerald-700'
                      : 'text-ink-400'
                }`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                  {done ? (
                    <Check className="animate-badge-burst h-4 w-4 text-emerald-500" strokeWidth={3} />
                  ) : active ? (
                    <Loader2 className="h-4 w-4 animate-spin text-journey-600" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-line-300" />
                  )}
                </span>
                <span aria-hidden className={done || active ? '' : 'opacity-50'}>
                  {stage.emoji}
                </span>
                <span className="min-w-0">{stage.label}</span>
              </li>
            );
          })}
        </ol>

        <p className="mt-7 border-t border-line-200 pt-4 text-center text-xs leading-relaxed text-ink-500">
          Every stage is written against the education level, goal and location you gave us —
          not a template.
        </p>
      </div>
    </div>
  );
}
