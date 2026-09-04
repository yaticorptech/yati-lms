import { Flame, CheckCircle2, TrendingUp, ClipboardList } from 'lucide-react';

/**
 * A line through the last seven days of finished work.
 *
 * Every point is a real count from task history, so a flat line means a flat
 * week rather than a decorative squiggle. Falls back to a straight rule when
 * nothing has been completed, instead of drawing a shape from no data.
 */
function Sparkline({ series }) {
  const max = Math.max(1, ...series);
  const pts = series.map((v, i) => {
    const x = series.length > 1 ? (i / (series.length - 1)) * 100 : 50;
    const y = 30 - (v / max) * 24;
    return [x, y];
  });
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');

  return (
    <svg viewBox="0 0 100 34" preserveAspectRatio="none" className="h-9 w-full" aria-hidden>
      <path d={`${d} L100 34 L0 34 Z`} fill="#fb923c" opacity="0.14" />
      <path d={d} fill="none" stroke="#f97316" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.8" fill="#f97316" vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}

/** The same seven days as bars — how much, rather than which way. */
function Bars({ series }) {
  const max = Math.max(1, ...series);
  return (
    <div className="flex h-9 items-end gap-1" aria-hidden>
      {series.map((v, i) => (
        <span
          key={i}
          className="flex-1 rounded-sm bg-emerald-400"
          style={{ height: `${Math.max(8, (v / max) * 100)}%`, opacity: v ? 1 : 0.28 }}
        />
      ))}
    </div>
  );
}

/** Completion rate as a ring. */
function Ring({ percent }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 64 64" className="h-14 w-14 shrink-0" aria-hidden>
      <circle cx="32" cy="32" r={r} fill="none" stroke="#ede9fe" strokeWidth="7" />
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        stroke="#6d4dff"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${(percent / 100) * c} ${c}`}
        transform="rotate(-90 32 32)"
      />
    </svg>
  );
}

function StatShell({ icon: Icon, label, tone, children, index = 0 }) {
  return (
    <section
      className="animate-fade-in-up rounded-2xl border border-line-200/80 bg-surface p-4 shadow-card"
      style={{ animationDelay: `${0.1 + index * 0.07}s` }}
    >
      <p className="flex items-center gap-2 text-sm font-bold text-ink-900">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ring-1 ring-inset ${tone}`}>
          <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
        </span>
        {label}
      </p>
      {children}
    </section>
  );
}

/**
 * The four measures of the week, in the order a student cares about them:
 * am I keeping it up, how much have I done, how much of what I started did I
 * finish, and what is still waiting.
 *
 * Every figure comes from /profile/summary or task history — none is derived
 * from a guess, and none is shown when the page has no summary to read.
 */
export default function ProgressStats({ stats, series = [], activeDays = 0 }) {
  const completed = stats?.completed ?? 0;
  const skipped = stats?.skipped ?? 0;
  const decided = completed + skipped;
  const rate = stats?.completionRate ?? 0;


  return (
    <aside className="grid gap-4 sm:grid-cols-2 xl:sticky xl:top-4 xl:grid-cols-1">
      <StatShell icon={Flame} label="Day streak" tone="bg-orange-50 text-orange-500 ring-orange-100" index={0}>
        <p className="mt-2 text-4xl leading-none font-black text-ink-900 tabular-nums">
          {stats?.streak ?? 0}
        </p>
        <p className="mt-1 text-xs font-semibold text-ink-500">
          {stats?.streak ? 'Keep it alive!' : 'Finish a task to begin'}
        </p>
        <div className="mt-2">
          <Sparkline series={series} />
        </div>
      </StatShell>

      <StatShell icon={CheckCircle2} label="Tasks done" tone="bg-emerald-50 text-emerald-600 ring-emerald-100" index={1}>
        <p className="mt-2 text-4xl leading-none font-black text-ink-900 tabular-nums">{completed}</p>
        <p className="mt-1 text-xs font-semibold text-ink-500 tabular-nums">
          Across {activeDays} {activeDays === 1 ? 'day' : 'days'}
        </p>
        <div className="mt-2">
          <Bars series={series} />
        </div>
      </StatShell>

      <StatShell icon={TrendingUp} label="Completion rate" tone="bg-journey-50 text-journey-600 ring-journey-100" index={2}>
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-4xl leading-none font-black text-ink-900 tabular-nums">
              {rate}
              <span className="text-xl">%</span>
            </p>
            <p className="mt-1 text-xs font-semibold text-ink-500 tabular-nums">
              {completed} of {decided} finished
            </p>
          </div>
          <Ring percent={rate} />
        </div>
      </StatShell>

      <StatShell icon={ClipboardList} label="Still to do" tone="bg-sky-50 text-sky-600 ring-sky-100" index={3}>
        <p className="mt-2 text-4xl leading-none font-black text-ink-900 tabular-nums">{skipped}</p>
        <p className="mt-1 text-xs font-semibold text-ink-500">
          {skipped ? 'Pick any back up below' : 'Nothing left behind'}
        </p>
      </StatShell>
    </aside>
  );
}
