export default function PageHeader({ title, subtitle, action, eyebrow }) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div className="animate-fade-in-up">
        {eyebrow && (
          <p className="mb-1.5 text-xs font-bold tracking-wider text-link uppercase">{eyebrow}</p>
        )}
        <h1 className="text-2xl font-black text-ink-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-ink-500">{subtitle}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap gap-3">{action}</div>}
    </div>
  );
}
