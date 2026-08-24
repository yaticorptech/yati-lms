export default function Card({ children, className = '', hover = false, padded = true, ...props }) {
  return (
    <div
      className={`rounded-2xl border border-line-200/80 bg-surface shadow-card transition-all duration-200 ${
        hover ? 'hover:-translate-y-0.5 hover:border-line-300 hover:shadow-card-hover' : ''
      } ${padded ? 'p-6' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ icon: Icon, title, subtitle, action, accent = 'brand' }) {
  // Flat tinted chips with a hairline ring — the same accent language as the
  // stat tiles, so a card header and a stat tile read as one system. Gradients
  // with coloured shadows were dropped: they cost a blur rasterisation each.
  const accents = {
    brand: 'bg-brand-50 text-link ring-brand-100',
    emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-600 ring-amber-100',
    violet: 'bg-violet-50 text-violet-600 ring-violet-100',
    slate: 'bg-surface-100 text-ink-600 ring-line-200'
  };

  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        {Icon && (
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-inset ${
              accents[accent] || accents.brand
            }`}
          >
            <Icon className="h-[1.15rem] w-[1.15rem]" strokeWidth={2.2} />
          </div>
        )}
        <div>
          <h3 className="text-lg font-bold text-ink-900">{title}</h3>
          {subtitle && <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
