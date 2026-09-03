/**
 * The heading above a group of cards.
 *
 * A title, an optional line of context and an optional action, aligned so the
 * action sits on the baseline of the title rather than floating above it.
 */
export default function SectionHeader({ icon: Icon, title, subtitle, action, className = '' }) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-3 ${className}`}>
      <div className="flex min-w-0 items-center gap-3">
        {Icon && (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-link">
            <Icon className="h-5 w-5" strokeWidth={2.2} />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-ink-900 sm:text-2xl">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
