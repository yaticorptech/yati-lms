export default function Skeleton({ className = '' }) {
  return <div className={`skeleton rounded-md ${className}`} />;
}

/* Page-shaped placeholders. Matching the real layout keeps the page from
   jumping when data lands, which is what makes loading feel deliberate. */

export function SkeletonPage({ cards = 4, columns = 2 }) {
  const gridCols = columns === 3 ? 'lg:grid-cols-3' : 'md:grid-cols-2';

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className={`grid grid-cols-1 gap-6 ${gridCols}`}>
        {Array.from({ length: cards }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-line-200/80 bg-surface p-6 shadow-card">
      <div className="mb-5 flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <div className="space-y-2.5">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

export function SkeletonList({ rows = 5 }) {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="overflow-hidden rounded-xl border border-line-200/80 bg-surface shadow-card">
        <div className="border-b border-line-100 bg-surface-50 px-6 py-4">
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="divide-y divide-line-100">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-start gap-4 p-5">
              <Skeleton className="h-6 w-6 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2.5">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
