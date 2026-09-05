import { useEffect, useState } from 'react';
import { Rocket, Star } from 'lucide-react';
import YatiMascot from '../career/components/game/YatiMascot';
import './yatiLoader.css';

/**
 * 🤖 What the student watches while a page, their account, or a roadmap is
 * on its way.
 *
 * YATI thinks in the middle of two slowly turning rings while a rocket and a
 * star orbit; under it, a line of encouragement changes every couple of
 * seconds and a gradient bar travels. Nothing here claims a percentage: a
 * request cannot be seen inside, so the bar only says "still going".
 *
 * Announces itself as a live region so a screen reader says what is loading;
 * the drawing itself is decorative and hidden from it.
 */
const LINES = [
  'Small steps. Big dreams.',
  'Every finished task is +10 XP.',
  'Your next step is on its way…',
  'Consistency is the skill behind every other skill.',
  'Show up today. Future you is watching.',
  'One task at a time is how it all gets done.'
];

/** The mascot in its orbit, on its own so other screens can borrow it. */
export function YatiOrbit({ size = 168, mood = 'thinking' }) {
  const ring = size;
  const inner = size * 0.78;
  const mascot = size * 0.5;
  return (
    <div className="relative shrink-0" style={{ width: ring, height: ring }} aria-hidden>
      <span className="yl-glow absolute inset-[18%] rounded-full bg-violet-300/60 blur-2xl" />

      {/* rings */}
      <span
        className="yl-ring absolute inset-0 rounded-full"
        style={{
          background:
            'conic-gradient(from 0deg, transparent 0 60%, #a78bfa 75%, #6c3bff 90%, transparent 100%)',
          WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px))',
          mask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px))'
        }}
      />
      <span
        className="absolute inset-0 rounded-full border-2 border-dashed border-violet-200"
      />
      <span
        className="yl-ring-inner absolute rounded-full border-[3px] border-transparent"
        style={{
          inset: (ring - inner) / 2,
          borderTopColor: '#f472b6',
          borderRightColor: '#fbbf24'
        }}
      />

      {/* orbiting rocket and star */}
      <span className="yl-orbit absolute inset-0">
        <span
          className="absolute left-1/2 top-0 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white p-1.5 text-violet-600 shadow-md ring-1 ring-violet-100"
        >
          <span className="yl-upright flex">
            <Rocket size={14} strokeWidth={2.4} />
          </span>
        </span>
      </span>
      <span className="yl-orbit-slow absolute" style={{ inset: (ring - inner) / 2 }}>
        <span className="absolute bottom-0 left-1/2 flex -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full bg-white p-1 text-amber-500 shadow-md ring-1 ring-amber-100">
          <span className="yl-upright-slow flex">
            <Star size={12} strokeWidth={2.4} className="fill-amber-300" />
          </span>
        </span>
      </span>

      {/* the mascot */}
      <span
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ width: mascot }}
      >
        <YatiMascot mood={mood} float />
      </span>
    </div>
  );
}

export default function YatiLoader({ label = 'Loading…', size = 168, fullScreen = false, lines = LINES }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 2400);
    return () => clearInterval(t);
  }, []);
  // The CareerPath mascot keeps out of the way while a page is loading.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('mascot:loading', { detail: true }));
    return () => window.dispatchEvent(new CustomEvent('mascot:loading', { detail: false }));
  }, []);
  const line = lines[tick % lines.length];

  return (
    <div
      role="status"
      aria-live="polite"
      className={
        fullScreen
          ? 'flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-violet-50 via-white to-pink-50 p-6'
          : // Tall enough to sit in the middle of what is left of the screen
            // under the header and the tab band, rather than hugging the top.
            'flex min-h-[calc(100vh-20rem)] w-full items-center justify-center p-6'
      }
    >
      <div className="yl-in flex flex-col items-center gap-5 text-center">
        <YatiOrbit size={size} />

        <div className="min-h-[3.25rem]">
          <p key={tick} className="yl-line text-base font-black text-slate-800">
            {line}
          </p>
          <p className="mt-1 flex items-center justify-center gap-1 text-xs font-semibold text-slate-500">
            {label}
            <span className="ml-1 inline-flex items-end gap-0.5" aria-hidden>
              <span className="yl-dot h-1 w-1 rounded-full bg-violet-500" />
              <span className="yl-dot h-1 w-1 rounded-full bg-violet-500" style={{ animationDelay: '0.15s' }} />
              <span className="yl-dot h-1 w-1 rounded-full bg-violet-500" style={{ animationDelay: '0.3s' }} />
            </span>
          </p>
        </div>

        <div className="h-1.5 w-40 overflow-hidden rounded-full bg-violet-100">
          <div className="yl-bar h-full w-1/3 rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-amber-400" />
        </div>
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
