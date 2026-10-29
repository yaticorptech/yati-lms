/**
 * The Competitions section's loading shapes (asked 2026-10-28): the page's
 * own layout in soft grey while it loads — the cards with their icon, name,
 * badge, facts and buttons; a competition's header, tabs and rows — so
 * nothing jumps when the real content arrives.
 */
const Bar = ({ className = '' }) => <span className={`block animate-pulse rounded-lg bg-slate-200/80 ${className}`} />;

/** One competition card, in outline. */
export const CardSkeleton = () => (
    <div className="flex h-full flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-hidden>
        <div className="flex items-start gap-3">
            <Bar className="h-12 w-12 shrink-0 rounded-2xl" />
            <div className="flex-1 space-y-2 pt-1"><Bar className="h-4 w-4/5" /><Bar className="h-3 w-2/5" /></div>
        </div>
        <Bar className="h-6 w-28 rounded-full" />
        <div className="space-y-2"><Bar className="h-11 w-full rounded-xl" /><Bar className="h-11 w-full rounded-xl" /></div>
        <div className="mt-auto grid grid-cols-3 gap-2"><Bar className="h-11 rounded-xl" /><Bar className="h-11 rounded-xl" /><Bar className="h-11 rounded-xl" /></div>
    </div>
);

/** A grid of them, three to a row. */
export const CardGridSkeleton = ({ count = 6 }) => (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Loading competitions" data-loading>
        {Array.from({ length: count }, (_, i) => <CardSkeleton key={i} />)}
    </div>
);

/** A competition's page: its header, its tabs, its rows. */
export const DetailSkeleton = () => (
    <div className="space-y-6" role="status" aria-label="Loading" data-loading>
        <Bar className="h-5 w-20" />
        <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <Bar className="h-14 w-14 shrink-0 rounded-2xl" />
            <div className="flex-1 space-y-2.5"><Bar className="h-5 w-24 rounded-full" /><Bar className="h-7 w-2/3" /><Bar className="h-4 w-1/2" /><Bar className="h-4 w-2/5" /></div>
            <div className="hidden gap-2 sm:flex"><Bar className="h-10 w-24 rounded-xl" /><Bar className="h-10 w-24 rounded-xl" /></div>
        </div>
        <div className="flex gap-2"><Bar className="h-10 w-28 rounded-xl" /><Bar className="h-10 w-28 rounded-xl" /><Bar className="h-10 w-28 rounded-xl" /></div>
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {[0, 1, 2, 3].map((i) => <div key={i} className="flex items-center gap-3"><Bar className="h-10 w-10 shrink-0 rounded-full" /><div className="flex-1 space-y-2"><Bar className="h-4 w-1/2" /><Bar className="h-3 w-1/3" /></div><Bar className="h-8 w-20 rounded-lg" /></div>)}
        </div>
    </div>
);

/** The filter tabs and the at-a-glance tiles. */
export const TilesSkeleton = ({ count = 4 }) => (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-hidden>
        {Array.from({ length: count }, (_, i) => <div key={i} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4"><Bar className="h-10 w-10 rounded-xl" /><div className="flex-1 space-y-2"><Bar className="h-5 w-10" /><Bar className="h-3 w-20" /></div></div>)}
    </div>
);
