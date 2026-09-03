import useCountUp from '../../../hooks/useCountUp';

/**
 * A single headline number.
 *
 * Flat by design. Gradient chips with coloured shadows and blurred hover
 * washes each cost a blur rasterisation on composite, which is what made
 * scrolling stutter; colour and a hairline rail carry the accent instead.
 * Hover only ever touches transform, border and background.
 */
const ACCENTS = {
  brand: { chip: 'bg-brand-50 text-link ring-brand-100', rail: 'bg-brand-500', edge: 'hover:border-brand-300' },
  emerald: { chip: 'bg-emerald-50 text-emerald-600 ring-emerald-100', rail: 'bg-emerald-500', edge: 'hover:border-emerald-300' },
  amber: { chip: 'bg-amber-50 text-amber-600 ring-amber-100', rail: 'bg-amber-500', edge: 'hover:border-amber-300' },
  violet: { chip: 'bg-violet-50 text-violet-600 ring-violet-100', rail: 'bg-violet-500', edge: 'hover:border-violet-300' }
};

export default function StatCard({
  icon: Icon,
  label,
  value,
  suffix = '',
  hint,
  accent = 'brand',
  /** 0-100. Draws a hairline rail along the card's base. Omit to hide it. */
  fill
}) {
  const animated = useCountUp(value);
  const hasRail = typeof fill === 'number';
  // Driven by the same rAF hook as the number so the rail and the digits land
  // together. A CSS width transition can't work here — React paints the final
  // width on the first frame, so there is nothing to transition from.
  const railWidth = useCountUp(hasRail ? Math.max(0, Math.min(100, fill)) : 0);
  const theme = ACCENTS[accent] || ACCENTS.brand;

  return (
    <div
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line-200 bg-surface p-5 transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover ${theme.edge}`}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${theme.chip}`}
        >
          <Icon className="h-4 w-4" strokeWidth={2.4} />
        </span>
        <span className="text-[0.7rem] font-bold tracking-[0.09em] text-ink-500 uppercase">
          {label}
        </span>
      </div>

      <p className="mt-4 text-[2.6rem] leading-none font-black tabular-nums text-ink-900">
        {animated}
        {suffix && <span className="ml-0.5 text-xl font-bold text-ink-400">{suffix}</span>}
      </p>

      {hint && <p className="mt-auto pt-2.5 text-xs font-medium text-ink-400">{hint}</p>}

      {/* Base rail — fills as the number counts. */}
      {hasRail && (
        <div className="absolute inset-x-0 bottom-0 h-[3px] bg-surface-100">
          <div className={`h-full ${theme.rail}`} style={{ width: `${railWidth}%` }} />
        </div>
      )}
    </div>
  );
}
