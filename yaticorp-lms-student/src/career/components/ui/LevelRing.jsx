import { useEffect, useId, useState } from 'react';

/**
 * Circular XP meter. Renders the level in the middle and sweeps an arc to show
 * how far into that level the user is.
 *
 * `light` inverts the palette for use on a dark panel.
 *
 * Deliberately cheap: a stroke gradient costs nothing, but an SVG blur filter
 * (feGaussianBlur) is re-rasterised on every composite and was a measurable
 * drag while scrolling. The glow is gone; the gradient carries it.
 */
export default function LevelRing({ level = 1, percent = 0, size = 108, light = false }) {
  const clamped = Math.max(0, Math.min(100, Number(percent) || 0));
  const [drawn, setDrawn] = useState(0);

  // Gradient ids must be unique per instance or a second ring on the page
  // silently inherits the first one's defs.
  const gradId = `ring-grad-${useId().replace(/:/g, '')}`;

  // Sweep from empty on mount so the ring reads as progress being earned, not
  // as a static gauge. index.css collapses this for prefers-reduced-motion.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setDrawn(clamped));
    return () => cancelAnimationFrame(frame);
  }, [clamped]);

  const stroke = size >= 96 ? 8 : 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (drawn / 100) * circumference;

  const from = light ? '#fcd34d' : '#608cfa';
  const to = light ? '#ffffff' : '#1d35d8';

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Level ${level}, ${clamped}% of the way to level ${level + 1}`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>

        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className={light ? 'stroke-white/12' : 'stroke-slate-200'}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={`url(#${gradId})`}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={`text-[0.58rem] font-bold tracking-[0.16em] uppercase ${
            light ? 'text-white/50' : 'text-ink-400'
          }`}
        >
          Level
        </span>
        <span className={`text-3xl font-bold tabular-nums ${light ? 'text-white' : 'text-ink-900'}`}>
          {level}
        </span>
      </div>
    </div>
  );
}
