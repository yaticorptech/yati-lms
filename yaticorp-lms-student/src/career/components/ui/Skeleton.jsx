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

/**
 * The roadmap, before it arrives.
 *
 * `SkeletonPage` was standing in here, and it draws a two-column grid of equal
 * cards — a shape this page never takes. So the roadmap loaded as a grid, then
 * jumped to a hero above a single column, which is the jolt a skeleton exists
 * to prevent. This one has the hero's proportions and the timeline's rhythm,
 * node column included.
 */
export function SkeletonRoadmap() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-line-200/80 bg-surface p-6 shadow-card sm:p-8">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-3 h-10 w-72 max-w-full" />
        <Skeleton className="mt-3 h-3 w-40" />
        <Skeleton className="mt-7 h-2 w-full rounded-full" />
        <Skeleton className="mt-6 h-24 w-full rounded-xl" />
      </div>

      <div className="rounded-2xl border border-line-200/80 bg-surface p-6 shadow-card">
        <div className="mb-5 flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="space-y-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="relative pl-14">
              <Skeleton className="absolute top-4 left-2 h-8 w-8 rounded-full" />
              <div className="rounded-xl border border-line-200/80 p-4 sm:p-5">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="mt-2.5 h-3 w-4/5" />
                <Skeleton className="mt-2.5 h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * The Overview's bento, before it arrives.
 *
 * Same reason as above: the page is a wide hero, then an 8/4 split, then four
 * stat tiles. A grid of four equal cards is none of those.
 */
export function SkeletonOverview() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">
      <div className="sm:col-span-2 lg:col-span-12">
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
      <div className="sm:col-span-2 lg:col-span-8">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
      <div className="sm:col-span-2 lg:col-span-4">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="lg:col-span-3">
          <Skeleton className="h-36 w-full rounded-2xl" />
        </div>
      ))}
      <div className="sm:col-span-2 lg:col-span-12">
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    </div>
  );
}
