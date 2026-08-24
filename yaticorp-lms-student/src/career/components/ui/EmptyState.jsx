export default function EmptyState({ icon: Icon, title, description, action, accent = 'brand' }) {
  const accents = {
    brand: 'from-brand-50 to-indigo-50 text-brand-500',
    amber: 'from-amber-50 to-orange-50 text-amber-500',
    emerald: 'from-emerald-50 to-teal-50 text-emerald-500',
    violet: 'from-violet-50 to-purple-50 text-violet-500'
  };

  return (
    <div className="animate-fade-in-up rounded-2xl border border-dashed border-line-300 bg-surface/60 px-6 py-14 text-center">
      {Icon && (
        <div
          className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${accents[accent]}`}
        >
          <Icon className="h-8 w-8" />
        </div>
      )}
      <h3 className="text-lg font-bold text-ink-900">{title}</h3>
      {description && (
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-500">{description}</p>
      )}
      {action && <div className="mt-6 flex justify-center gap-3">{action}</div>}
    </div>
  );
}
