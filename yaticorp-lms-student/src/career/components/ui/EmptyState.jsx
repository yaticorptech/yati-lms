/**
 * The shared "there is nothing here yet" panel.
 *
 * It used to be a dashed grey outline. A dashed border is the universal sign of
 * a drop zone or an unfinished mock — every empty state in Career Path was
 * announcing itself as a gap in the product rather than as a stage the student
 * simply has not reached. A solid hairline over a soft tinted wash reads as a
 * designed surface, and the same panel is used everywhere so the section keeps
 * one voice for absence.
 *
 * The wash is a plain gradient, not a blurred element: there is nothing here to
 * rasterise on composite.
 */
const ACCENTS = {
  brand: {
    tile: 'from-brand-500 to-indigo-500',
    wash: 'from-brand-50/70'
  },
  amber: {
    tile: 'from-amber-400 to-orange-500',
    wash: 'from-amber-50/70'
  },
  emerald: {
    tile: 'from-emerald-500 to-teal-500',
    wash: 'from-emerald-50/70'
  },
  violet: {
    tile: 'from-violet-500 to-purple-500',
    wash: 'from-violet-50/70'
  }
};

export default function EmptyState({ icon: Icon, title, description, action, accent = 'brand' }) {
  const theme = ACCENTS[accent] || ACCENTS.brand;

  return (
    <div className="animate-fade-in-up relative overflow-hidden rounded-2xl border border-line-200 bg-surface px-6 py-12 text-center">
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b ${theme.wash} to-transparent`}
      />

      <div className="relative">
        {Icon && (
          /* Solid and coloured, not a pale tint. The icon is the only thing
             carrying the panel, and a grey glyph on grey made every empty
             state look switched off. */
          <div
            className={`animate-pop-in mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-sm ${theme.tile}`}
          >
            <Icon className="h-7 w-7" strokeWidth={2.1} />
          </div>
        )}
        <h3 className="text-lg font-black text-ink-900">{title}</h3>
        {description && (
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-500">{description}</p>
        )}
        {action && <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div>}
      </div>
    </div>
  );
}
