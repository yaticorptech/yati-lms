import { useEffect, useState } from 'react';

const TONES = {
  brand: 'bg-gradient-to-r from-brand-500 to-indigo-500',
  emerald: 'bg-gradient-to-r from-emerald-500 to-teal-500',
  amber: 'bg-gradient-to-r from-amber-500 to-orange-500',
  violet: 'bg-gradient-to-r from-violet-500 to-purple-500'
};

export default function ProgressBar({ value = 0, tone = 'brand', size = 'md', showLabel = false }) {
  const clamped = Math.max(0, Math.min(100, Number(value) || 0));
  const [width, setWidth] = useState(0);

  // Start at 0 and grow on mount so the bar visibly fills.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setWidth(clamped));
    return () => cancelAnimationFrame(frame);
  }, [clamped]);

  const height = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3' : 'h-2';

  return (
    <div>
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        className={`w-full overflow-hidden rounded-full bg-surface-200/70 ${height}`}
      >
        <div
          className={`${height} rounded-full ${TONES[tone]} transition-[width] duration-1000 ease-out`}
          style={{ width: `${width}%` }}
        />
      </div>
      {showLabel && (
        <div className="mt-2 text-right text-sm font-semibold tabular-nums text-ink-500">
          {clamped}%
        </div>
      )}
    </div>
  );
}
