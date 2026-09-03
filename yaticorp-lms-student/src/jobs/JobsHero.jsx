/**
 * @description The banner over the job board: what the section does, in one
 *              line, and the live count of what it found for this student.
 *
 * The illustration on the right stands in for the results — a listing card
 * with a match ring beside it. The ring shows the best match the last search
 * produced, and holds no number before a search has run: a made-up "87" is a
 * promise the list below may not keep.
 */
import { Sparkles, Check } from 'lucide-react';

const R = 34;
const CIRC = 2 * Math.PI * R;

const MatchRing = ({ pct }) => (
    <svg viewBox="0 0 88 88" className="h-24 w-24 drop-shadow-md" aria-hidden="true">
        <defs>
            <linearGradient id="jobs-hero-ring" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#4f46e5" />
                <stop offset="1" stopColor="#8b5cf6" />
            </linearGradient>
        </defs>
        <circle cx="44" cy="44" r={R} fill="#fff" stroke="#e0e7ff" strokeWidth="7" />
        {pct != null && (
            <circle
                cx="44" cy="44" r={R} fill="none"
                stroke="url(#jobs-hero-ring)" strokeWidth="7" strokeLinecap="round"
                strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - Math.min(100, pct) / 100)}
                transform="rotate(-90 44 44)"
                style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}
            />
        )}
        {pct != null
            ? <text x="44" y="51" textAnchor="middle" fontSize="22" fontWeight="800" fill="#4338ca">{pct}</text>
            : <text x="44" y="50" textAnchor="middle" fontSize="18" fill="#a5b4fc">✦</text>}
    </svg>
);

const Artwork = ({ topMatch }) => (
    <div className="relative hidden h-44 w-72 shrink-0 md:block" aria-hidden="true">
        <div className="absolute left-0 top-6 h-24 w-40 rounded-2xl border border-indigo-100 bg-white/70 p-4 opacity-70">
            <div className="h-2 w-16 rounded bg-slate-200" />
            <div className="mt-2 h-2 w-24 rounded bg-slate-100" />
            <div className="mt-2 h-2 w-20 rounded bg-slate-100" />
        </div>
        <div className="absolute left-14 top-0 h-28 w-44 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg shadow-indigo-100">
            <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 ring-2 ring-indigo-100">
                    <Check size={15} strokeWidth={3} />
                </span>
                <div className="flex-1 space-y-1.5">
                    <div className="h-2 w-20 rounded bg-slate-700" />
                    <div className="h-2 w-14 rounded bg-slate-200" />
                </div>
            </div>
            <div className="mt-4 flex gap-2">
                <div className="h-3 w-10 rounded-full bg-indigo-100" />
                <div className="h-3 w-12 rounded-full bg-slate-100" />
            </div>
        </div>
        <div className="drift absolute right-0 top-14"><MatchRing pct={topMatch} /></div>
        <svg className="absolute bottom-0 left-4 h-10 w-64" viewBox="0 0 256 40" fill="none">
            <path d="M2 30 C 60 30, 80 8, 130 12 S 210 34, 254 22" stroke="#a5b4fc" strokeWidth="2" strokeDasharray="5 6" strokeLinecap="round" />
            <circle cx="254" cy="22" r="4" fill="#6366f1" />
        </svg>
    </div>
);

export default function JobsHero({ total, loading, hasData, topMatch }) {
    const stat = loading
        ? { dot: 'bg-indigo-500 animate-pulse', text: 'Matching listings to your profile…' }
        : hasData
            ? {
                dot: total ? 'bg-emerald-500' : 'bg-amber-500',
                text: <><strong className="text-indigo-700">{total}</strong> {total === 1 ? 'opportunity' : 'opportunities'} matched to your profile</>
            }
            : { dot: 'bg-slate-300', text: 'Add your skills and a role to see what matches you' };

    return (
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-6 py-7 lg:px-10 lg:py-9">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgb(99_102_241/0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgb(99_102_241/0.06)_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_70%)]" />
            <div aria-hidden="true" className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 -right-10 h-72 w-72 rounded-full bg-violet-200/40 blur-3xl" />

            <div className="relative flex items-center justify-between gap-8">
                <div className="min-w-0">
                    <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-700 shadow-sm">
                        <Sparkles size={13} className="text-indigo-500" /> AI-powered career discovery
                    </span>
                    <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
                        Jobs that match{' '}
                        <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">where you&apos;re going.</span>
                    </h1>
                    <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
                        Listings from global job boards, ranked against your skills, your experience and the
                        role you are aiming for — with the gaps named.
                    </p>
                    <p aria-live="polite" className="mt-5 inline-flex items-center gap-2.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${stat.dot}`} />
                        <span>{stat.text}</span>
                    </p>
                </div>
                <Artwork topMatch={topMatch} />
            </div>
        </section>
    );
}
