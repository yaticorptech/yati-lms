/**
 * @description Local jobs on your dates — the age-aware half of the Jobs page.
 *
 * One profile (date of birth, the dates wanted, interests), one list, a few
 * views of it. The server decides what the student may see and which jobs
 * fall on their dates; this file decides how to lay it out: the jobs on
 * their dates first, the categories, then the student's own ♡ list and what
 * they opened recently. A search or a filter narrows the main grid and
 * leaves the personal sections where they are.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Search, SlidersHorizontal, Sparkles, CalendarDays, LayoutGrid, Heart, History, Plus, Pencil,
    RotateCcw, AlertCircle, ShieldCheck, Compass, Undo2, X, CalendarRange
} from 'lucide-react';
import { opportunitiesApi } from './api';
import { BAND_COPY, EMPTY_FILTERS, countActive, shortDate, longDate } from './helpers';
import OpportunityCard from './OpportunityCard';
import OpportunityDetails from './OpportunityDetails';
import ProfileOnboarding from './ProfileOnboarding';
import FiltersDrawer from './FiltersDrawer';
import ReportDialog from './ReportDialog';
import GuardianBanner from './GuardianBanner';
import './opportunities.css';

const useDebounced = (value, ms) => {
    const [v, setV] = useState(value);
    useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
    return v;
};

const sameDay = (a, b) => a && b && new Date(a).toDateString() === new Date(b).toDateString();
const windowLabel = (w) => (!w?.from ? '' : sameDay(w.from, w.to) ? longDate(w.from) : `${shortDate(w.from)} – ${shortDate(w.to)}`);

const Hero = ({ band, hasProfile, total, loading, window: w }) => {
    const copy = hasProfile && band ? BAND_COPY[band] : {
        eyebrow: 'Part-time jobs',
        title: 'Find part-time jobs that fit you',
        subtitle: 'Catering, events, packing, decoration and more — local work on the dates you want it, matched to your interests and open to your age.'
    };
    const stat = !hasProfile ? 'Tell us your dates and interests to get started'
        : band === 'explore' ? 'Local jobs open at 14'
            : loading ? 'Finding jobs on your dates…'
                : `${total} ${total === 1 ? 'job' : 'jobs'} on ${windowLabel(w) || 'your dates'}`;
    return (
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-6 py-7 lg:px-10 lg:py-9">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgb(99_102_241/0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgb(99_102_241/0.06)_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_70%)]" />
            <div aria-hidden="true" className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 -right-10 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl" />
            <div className="relative max-w-2xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-700 shadow-sm">
                    <Sparkles size={13} className="text-indigo-500" aria-hidden="true" /> {copy.eyebrow}
                </span>
                <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">{copy.title}</h1>
                <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">{copy.subtitle}</p>
                <p aria-live="polite" className="mt-5 inline-flex items-center gap-2.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${!hasProfile ? 'bg-slate-300' : loading ? 'animate-pulse bg-indigo-500' : total ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    {stat}
                </p>
            </div>
        </section>
    );
};

const SectionTitle = ({ icon: Icon, title, hint, action }) => (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <Icon size={18} className="text-indigo-500" aria-hidden="true" /> {title}
            </h2>
            {hint && <p className="mt-0.5 text-sm text-slate-500">{hint}</p>}
        </div>
        {action}
    </div>
);

const Skeletons = ({ n = 3 }) => (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
        {Array.from({ length: n }, (_, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="mb-4 flex gap-3"><div className="skeleton h-12 w-12 rounded-xl" /><div className="flex-1 space-y-2"><div className="skeleton h-4 w-3/4 rounded" /><div className="skeleton h-3 w-1/2 rounded" /></div></div>
                <div className="space-y-2"><div className="skeleton h-3 w-full rounded" /><div className="skeleton h-3 w-5/6 rounded" /><div className="skeleton h-9 w-full rounded-xl" /></div>
            </div>
        ))}
    </div>
);

const Empty = ({ icon: Icon = Compass, title, children, actions }) => (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-50"><Icon size={26} className="text-slate-300" aria-hidden="true" /></div>
        <h3 className="text-lg font-bold text-slate-800">{title}</h3>
        <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-slate-500">{children}</p>
        {actions && <div className="mt-5 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
);

const GhostButton = ({ onClick, children, to, primary = false }) => {
    const cls = primary
        ? 'inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:ring-offset-2 sm:min-h-10'
        : 'inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:border-indigo-300 hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 sm:min-h-10';
    return to ? <Link to={to} className={cls}>{children}</Link> : <button type="button" onClick={onClick} className={cls}>{children}</button>;
};

export default function OpportunitiesTab({ data, onData, careerPathEnabled = true }) {
    const [editing, setEditing] = useState(false);
    const [listing, setListing] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [q, setQ] = useState('');
    const debouncedQ = useDebounced(q.trim(), 300);
    const [filters, setFilters] = useState(EMPTY_FILTERS);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [interested, setInterested] = useState([]);
    const [recent, setRecent] = useState([]);
    const [leaving, setLeaving] = useState(() => new Set());
    const [undo, setUndo] = useState(null);
    const [detailsId, setDetailsId] = useState(null);
    const [reporting, setReporting] = useState(null);
    const reqId = useRef(0);

    const vocab = data?.vocab;
    const hasProfile = !!data?.profile;
    const rules = listing?.rules || data?.rules;
    const guardian = data?.guardian;
    const band = data?.band;
    const filtersActive = !!debouncedQ || countActive(filters) > 0;
    const anyDate = filters.anyDate;

    const load = useCallback(async (quiet = false) => {
        if (!hasProfile) return;
        const id = ++reqId.current;
        if (!quiet) setLoading(true);
        setError('');
        try {
            const res = await opportunitiesApi.list({
                q: debouncedQ || undefined,
                category: filters.category || undefined,
                type: filters.type || undefined,
                interest: filters.interest || undefined,
                verified: filters.verified ? '1' : undefined,
                dates: filters.anyDate ? 'any' : undefined
            });
            if (id !== reqId.current) return;
            setListing(res);
            if (res.guardian) onData((d) => (d ? { ...d, guardian: res.guardian } : d));
        } catch (err) {
            if (id === reqId.current) setError(err.message);
        } finally {
            if (id === reqId.current) setLoading(false);
        }
    }, [hasProfile, debouncedQ, filters, onData]);

    useEffect(() => { load(); }, [load]);

    const loadPersonal = useCallback(() => {
        if (!hasProfile) return;
        opportunitiesApi.interested().then((r) => setInterested(r.results ?? [])).catch(() => {});
        opportunitiesApi.recent().then((r) => setRecent(r.results ?? [])).catch(() => {});
    }, [hasProfile]);
    useEffect(() => { loadPersonal(); }, [loadPersonal]);

    useEffect(() => () => { if (undo?.timer) clearTimeout(undo.timer); }, [undo]);

    /* One preference change touches every list the card appears in. */
    const patchEverywhere = (id, patch) => {
        const map = (o) => (o.id === id ? { ...o, ...patch } : o);
        setListing((l) => (l ? { ...l, results: l.results.map(map) } : l));
        setRecent((r) => r.map(map));
        setInterested((r) => r.map(map));
    };
    const dropEverywhere = (id) => {
        setListing((l) => (l ? { ...l, results: l.results.filter((o) => o.id !== id), total: Math.max(0, l.total - 1) } : l));
        setRecent((r) => r.filter((o) => o.id !== id));
        setInterested((r) => r.filter((o) => o.id !== id));
    };

    const onInterested = async (opp) => {
        const clearing = opp.preference === 'interested';
        patchEverywhere(opp.id, { preference: clearing ? null : 'interested' });
        setInterested((prev) => clearing
            ? prev.filter((o) => o.id !== opp.id)
            : [{ ...opp, preference: 'interested' }, ...prev.filter((o) => o.id !== opp.id)]);
        try {
            await opportunitiesApi.preference(opp.id, clearing ? 'clear' : 'interested');
            load(true);                       // similar jobs move up
        } catch (err) {
            patchEverywhere(opp.id, { preference: opp.preference });
            setError(err.message);
        }
    };

    const onNotInterested = (opp) => {
        setLeaving((s) => new Set(s).add(opp.id));
        setTimeout(() => {
            dropEverywhere(opp.id);
            setLeaving((s) => { const n = new Set(s); n.delete(opp.id); return n; });
        }, 320);
        if (undo?.timer) clearTimeout(undo.timer);
        const timer = setTimeout(() => setUndo(null), 6000);
        setUndo({ opp, timer });
        opportunitiesApi.preference(opp.id, 'not_interested').then(() => load(true)).catch((err) => setError(err.message));
    };

    const onUndo = async () => {
        if (!undo) return;
        clearTimeout(undo.timer);
        setUndo(null);
        try {
            await opportunitiesApi.preference(undo.opp.id, 'clear');
            load(true);
            loadPersonal();
        } catch (err) {
            setError(err.message);
        }
    };

    const onSaved = (res) => {
        onData((d) => ({ ...d, profile: res.profile, band: res.band, rules: res.rules, guardian: res.guardian }));
        setEditing(false);
        setFilters(EMPTY_FILTERS);
    };

    const openDetails = (opp) => setDetailsId(opp.id);
    const closeDetails = useCallback(() => { setDetailsId(null); loadPersonal(); }, [loadPersonal]);
    const closeReport = useCallback(() => setReporting(null), []);
    const closeFilters = useCallback(() => setFiltersOpen(false), []);
    const clearAll = () => { setQ(''); setFilters(EMPTY_FILTERS); };

    const results = useMemo(() => listing?.results ?? [], [listing]);
    const otherDates = listing?.otherDates ?? 0;
    const hiddenByRules = listing?.excluded ? listing.excluded.age + listing.excluded.safety + listing.excluded.verification : 0;
    const activeInterest = filters.interest;

    const grid = (items) => (
        <div className="stagger grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((o) => (
                <OpportunityCard key={o.id} opp={o} vocab={vocab} guardian={guardian} leaving={leaving.has(o.id)}
                    onInterested={onInterested} onNotInterested={onNotInterested} onOpen={openDetails} />
            ))}
        </div>
    );

    if (data === undefined) {
        return <div className="space-y-5"><div className="skeleton h-56 rounded-3xl" /><Skeletons /></div>;
    }
    if (data === null) {
        return (
            <Empty icon={AlertCircle} title="Local jobs are unavailable right now">
                We couldn&apos;t load your profile. Refresh in a moment.
            </Empty>
        );
    }

    const mainTitle = filtersActive
        ? `${results.length} result${results.length === 1 ? '' : 's'}${debouncedQ ? ` for “${debouncedQ}”` : ''}`
        : anyDate ? 'All upcoming part-time jobs' : 'Part-time jobs on your dates';

    return (
        <div className="space-y-6">
            <Hero band={band} hasProfile={hasProfile} total={listing?.total ?? 0} loading={loading && !listing} window={listing?.window} />

            {(!hasProfile || editing) ? (
                <ProfileOnboarding vocab={vocab} initial={data.profile} onSaved={onSaved} onCancel={hasProfile ? () => setEditing(false) : undefined} />
            ) : (
                <>
                    {/* ── Search + filters ─────────────────────────────── */}
                    <div className="flex flex-wrap items-center gap-2">
                        <label className="relative min-w-[240px] flex-1">
                            <span className="sr-only">Search part-time jobs</span>
                            <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search part-time jobs…" type="search"
                                className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                        </label>
                        <button type="button" onClick={() => setFiltersOpen(true)}
                            className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-indigo-300 hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50">
                            <SlidersHorizontal size={16} aria-hidden="true" /> Filters
                            {countActive(filters) > 0 && <span className="rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{countActive(filters)}</span>}
                        </button>
                        <button type="button" onClick={() => setEditing(true)}
                            className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-indigo-300 hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50">
                            <Pencil size={15} aria-hidden="true" /> <span className="hidden sm:inline">Change dates &amp; interests</span><span className="sm:hidden">Edit</span>
                        </button>
                    </div>

                    <GuardianBanner rules={rules} guardian={guardian} onGuardian={(g) => onData((d) => ({ ...d, guardian: g }))} />

                    {band !== 'explore' && (
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-sm">
                            <CalendarDays size={16} className="shrink-0 text-indigo-600" aria-hidden="true" />
                            <span className="text-slate-700">
                                {anyDate ? 'Showing every upcoming job. ' : 'Showing jobs on '}
                                {!anyDate && <strong className="text-indigo-800">{windowLabel({ from: data.profile.wantFrom, to: data.profile.wantTo })}</strong>}
                            </span>
                            <button type="button" onClick={() => setFilters((f) => ({ ...f, anyDate: !f.anyDate }))}
                                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-semibold text-indigo-700 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50">
                                <CalendarRange size={14} aria-hidden="true" /> {anyDate ? 'Back to my dates' : 'Show all upcoming dates'}
                            </button>
                            <button type="button" onClick={() => setEditing(true)} className="rounded-lg px-2 py-1 font-semibold text-slate-600 hover:bg-white">Change dates</button>
                        </div>
                    )}

                    {/* ── Interest chips ───────────────────────────────── */}
                    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Your interests">
                        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Interests</span>
                        {data.profile.interests.map((i) => {
                            const on = activeInterest === i;
                            const meta = vocab.interests.find((x) => x.id === i);
                            return (
                                <button key={i} type="button" aria-pressed={on}
                                    onClick={() => setFilters((f) => ({ ...f, interest: on ? '' : i }))}
                                    className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-all active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 sm:min-h-9 ${
                                        on ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm' : 'border-indigo-100 bg-indigo-50 text-indigo-800 hover:border-indigo-300'
                                    }`}>
                                    <span aria-hidden="true">{meta?.icon}</span> {meta?.label || i}
                                </button>
                            );
                        })}
                        <button type="button" onClick={() => setEditing(true)}
                            className="inline-flex min-h-10 items-center gap-1 rounded-full border border-dashed border-slate-300 px-3.5 text-sm font-semibold text-slate-600 hover:border-indigo-300 hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 sm:min-h-9">
                            <Plus size={14} aria-hidden="true" /> Add
                        </button>
                    </div>

                    {error && (
                        <p role="alert" className="flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
                            <AlertCircle size={15} aria-hidden="true" /> {error}
                            <button type="button" onClick={() => load()} className="ml-auto font-semibold underline">Retry</button>
                        </p>
                    )}

                    {rules && hiddenByRules > 0 && rules.band !== 'adult' && (
                        <p className="flex items-center gap-2 text-xs text-slate-500">
                            <ShieldCheck size={14} className="text-emerald-600" aria-hidden="true" />
                            {hiddenByRules} job{hiddenByRules === 1 ? '' : 's'} {hiddenByRules === 1 ? 'is' : 'are'} not shown because {hiddenByRules === 1 ? 'it isn\'t' : 'they aren\'t'} open to your age group.
                        </p>
                    )}

                    {/* ── Main grid ────────────────────────────────────── */}
                    {loading && !listing ? <Skeletons /> : band === 'explore' ? (
                        <Empty icon={Compass} title="Let's explore your future."
                            actions={<>
                                {careerPathEnabled && <GhostButton to="/career" primary>Explore career paths</GhostButton>}
                                <GhostButton to="/">Browse courses</GhostButton>
                            </>}>
                            Local jobs aren&apos;t available for your age group — they open at 14. In the meantime you can build the
                            skills these jobs ask for, and Career Path can map out where you want to go.
                        </Empty>
                    ) : (
                        <section aria-labelledby="opp-main-title">
                            <SectionTitle icon={filtersActive ? Search : Sparkles} title={<span id="opp-main-title">{mainTitle}</span>}
                                hint={filtersActive ? (countActive(filters) ? `${countActive(filters)} filter${countActive(filters) === 1 ? '' : 's'} applied` : undefined)
                                    : 'Ranked on your interests, your dates and what you\'ve marked ♡.'}
                                action={filtersActive && <GhostButton onClick={clearAll}><RotateCcw size={14} aria-hidden="true" /> Clear</GhostButton>} />
                            {results.length ? grid(results) : filtersActive ? (
                                <Empty icon={Search} title="Nothing matches that search" actions={<GhostButton onClick={clearAll}>Clear search &amp; filters</GhostButton>}>
                                    Try a shorter word, or clear a filter or two.
                                </Empty>
                            ) : otherDates > 0 ? (
                                <Empty icon={CalendarDays} title="No local jobs on your dates yet"
                                    actions={<>
                                        <GhostButton primary onClick={() => setFilters((f) => ({ ...f, anyDate: true }))}>See {otherDates} job{otherDates === 1 ? '' : 's'} on other dates</GhostButton>
                                        <GhostButton onClick={() => setEditing(true)}>Change dates</GhostButton>
                                        <GhostButton onClick={() => setEditing(true)}>Update interests</GhostButton>
                                    </>}>
                                    Nothing is scheduled on {windowLabel({ from: data.profile.wantFrom, to: data.profile.wantTo })} that you can take up.
                                    New jobs are added by the LMS team as they come in — check back, or widen your dates.
                                </Empty>
                            ) : (
                                <Empty title="No local jobs match your current preferences."
                                    actions={<>
                                        <GhostButton onClick={() => setEditing(true)}>Update interests</GhostButton>
                                        <GhostButton onClick={() => setEditing(true)}>Change dates</GhostButton>
                                        <GhostButton onClick={() => setFilters((f) => ({ ...f, anyDate: true, category: '', interest: '' }))}>Explore other categories</GhostButton>
                                    </>}>
                                    No upcoming jobs are open to you right now. The LMS team adds local jobs as organisations send them — check back soon.
                                </Empty>
                            )}
                        </section>
                    )}

                    {band !== 'explore' && listing?.categories?.length > 0 && (
                        <section aria-labelledby="opp-categories-title">
                            <SectionTitle icon={LayoutGrid} title={<span id="opp-categories-title">Categories</span>} hint="Counts across all upcoming dates. Only categories open to your age group are shown." />
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                                {listing.categories.map((c) => (
                                    <button key={c.id} type="button" disabled={!c.count} aria-pressed={filters.category === c.id}
                                        onClick={() => setFilters((f) => ({ ...f, category: f.category === c.id ? '' : c.id, anyDate: true }))}
                                        className={`group flex items-center gap-3 rounded-2xl border bg-white p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 ${
                                            filters.category === c.id ? 'border-indigo-400 ring-1 ring-indigo-200' : 'border-slate-200'
                                        }`}>
                                        <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-xl transition-colors group-hover:bg-indigo-50">{c.icon}</span>
                                        <span className="min-w-0">
                                            <span className="block truncate text-sm font-semibold text-slate-800">{c.label}</span>
                                            <span className="block text-xs text-slate-500">{c.count} upcoming</span>
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* ── Interested ───────────────────────────────────── */}
                    {band !== 'explore' && (
                        <section aria-labelledby="opp-interested-title">
                            <SectionTitle icon={Heart} title={<span id="opp-interested-title">Interested jobs</span>}
                                hint={interested.length ? `${interested.length} you've marked ♡ — these shape what's recommended next.` : undefined} />
                            {interested.length ? grid(interested) : (
                                <Empty icon={Heart} title="Nothing marked yet">
                                    Tap ♡ Interested on any job that suits you. It's kept here, and similar jobs move up your list.
                                </Empty>
                            )}
                        </section>
                    )}

                    {/* ── Recently viewed ──────────────────────────────── */}
                    {recent.length > 0 && (
                        <section aria-labelledby="opp-recent-title">
                            <SectionTitle icon={History} title={<span id="opp-recent-title">Recently viewed</span>} />
                            <div className="opp-scroll -mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-2">
                                {recent.map((o) => (
                                    <div key={o.id} className="w-[min(88vw,340px)] shrink-0 snap-start">
                                        <OpportunityCard opp={o} vocab={vocab} guardian={guardian} leaving={leaving.has(o.id)}
                                            onInterested={onInterested} onNotInterested={onNotInterested} onOpen={openDetails} />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    <FiltersDrawer open={filtersOpen} onClose={closeFilters} filters={filters} onApply={setFilters}
                        vocab={vocab} rules={rules} categories={listing?.categories ?? []} />
                </>
            )}

            {detailsId && (
                <OpportunityDetails id={detailsId} vocab={vocab} guardian={guardian} onClose={closeDetails}
                    onInterested={(opp) => { onInterested(opp); }} onReport={(opp) => setReporting(opp)} />
            )}
            {reporting && <ReportDialog opp={reporting} onClose={closeReport} />}

            {undo && (
                <div role="status" aria-live="polite"
                    className="opp-rise fixed bottom-5 left-1/2 z-50 flex w-[min(92vw,420px)] items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-sm text-white shadow-2xl">
                    <span className="min-w-0 flex-1 truncate">Hidden <strong>{undo.opp.title}</strong> — fewer like it from now.</span>
                    <button type="button" onClick={onUndo} className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 font-semibold hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
                        <Undo2 size={14} aria-hidden="true" /> Undo
                    </button>
                    <button type="button" onClick={() => { clearTimeout(undo.timer); setUndo(null); }} aria-label="Dismiss" className="rounded-lg p-1 text-white/60 hover:text-white"><X size={14} /></button>
                </div>
            )}
        </div>
    );
}
