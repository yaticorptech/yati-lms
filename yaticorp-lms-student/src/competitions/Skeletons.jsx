/**
 * Loading shapes for Games & Competitions: grey outlines of what is coming
 * (cards, a competition's page, a list, the quiz), shown while it loads, so
 * the page keeps its shape instead of jumping when the data arrives.
 */
const Bone = ({ className = '' }) => <div className={`animate-pulse rounded-xl bg-slate-200/80 motion-reduce:animate-none ${className}`} aria-hidden="true" />;

/** Competition cards: picture, chip, title, three facts, button. */
export const CardGridSkeleton = ({ count = 3 }) => (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading">
        {Array.from({ length: count }, (_, i) => (
            <div key={i} className="overflow-hidden rounded-[20px] bg-white shadow-sm ring-1 ring-slate-100">
                <Bone className="h-36 rounded-none" />
                <div className="space-y-3 p-5">
                    <Bone className="h-6 w-24 rounded-full" />
                    <Bone className="h-6 w-3/4" />
                    <Bone className="h-4 w-1/2" />
                    <div className="grid grid-cols-3 gap-3 pt-1">{[0, 1, 2].map((k) => <Bone key={k} className="h-10" />)}</div>
                    <Bone className="mt-2 h-12" />
                </div>
            </div>
        ))}
    </div>
);

/** A list: rows of a circle, two lines and a value. */
export const ListSkeleton = ({ rows = 5 }) => (
    <div className="space-y-1 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-5" role="status" aria-label="Loading">
        {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5">
                <Bone className="h-11 w-11 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2"><Bone className="h-4 w-2/5" /><Bone className="h-3 w-3/5" /></div>
                <Bone className="h-6 w-14" />
            </div>
        ))}
    </div>
);

/** One competition's page: banner, the "what to do now" card, facts, rules. */
export const DetailSkeleton = () => (
    <div className="space-y-5 pb-10" role="status" aria-label="Loading">
        <Bone className="h-5 w-16" />
        <div className="space-y-3 rounded-[22px] bg-slate-200/70 p-6 sm:p-10">
            <div className="flex gap-2"><Bone className="h-6 w-20 rounded-full bg-white/60" /><Bone className="h-6 w-24 rounded-full bg-white/60" /></div>
            <Bone className="h-9 w-2/3 bg-white/60" />
            <Bone className="h-4 w-1/3 bg-white/60" />
            <Bone className="h-4 w-1/2 bg-white/60" />
        </div>
        <div className="flex items-center gap-3 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <div className="flex-1 space-y-2"><Bone className="h-5 w-1/3" /><Bone className="h-4 w-2/3" /></div>
            <Bone className="h-11 w-36" />
        </div>
        <div className="grid gap-2.5 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((k) => <Bone key={k} className="h-14" />)}</div>
        <div className="space-y-2.5 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <Bone className="h-5 w-24" />
            {[0, 1, 2, 3, 4].map((k) => <Bone key={k} className={`h-4 ${['w-11/12', 'w-4/5', 'w-5/6', 'w-3/4', 'w-2/3'][k]}`} />)}
        </div>
    </div>
);

/** The quiz or a match: the bar on top, then the question and four options. */
export const PlaySkeleton = () => (
    <div className="mx-auto max-w-5xl space-y-4" role="status" aria-label="Loading">
        <div className="flex items-center justify-between"><Bone className="h-5 w-40" /><Bone className="h-7 w-32 rounded-full" /></div>
        <div className="grid grid-cols-3 gap-2">{[0, 1, 2].map((k) => <Bone key={k} className="h-14 rounded-2xl" />)}</div>
        <div className="space-y-5 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
            <Bone className="h-2 w-full" />
            <Bone className="h-7 w-3/4" />
            <Bone className="h-56 rounded-2xl sm:h-72" />
            <div className="grid gap-2.5 sm:grid-cols-2">{[0, 1, 2, 3].map((k) => <Bone key={k} className="h-14 rounded-2xl" />)}</div>
        </div>
    </div>
);
