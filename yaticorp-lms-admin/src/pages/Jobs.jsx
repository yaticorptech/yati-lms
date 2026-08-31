/**
 * @description Jobs (CareerCompass) reporting — index health, what students
 *              are searching for, and what the metered providers are costing.
 *
 * Reporting with one exception: the lock in the header, which opens or closes
 * the section to students — the same arrangement as the Career Path page.
 * What students search for is the clearest demand signal the LMS gets: a role
 * that keeps appearing here and matches no course in the catalogue is a
 * course waiting to be built.
 *
 * No student is named anywhere on this page. The questions it answers are
 * about the cohort, not about any one person.
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import {
    Briefcase, Database, MapPin, Search, Sparkles, RefreshCw, Lock, Unlock
} from 'lucide-react';

const Stat = ({ icon: Icon, label, value, sub, tone = 'indigo' }) => {
    const tones = {
        indigo: 'bg-indigo-50 text-indigo-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        amber: 'bg-amber-50 text-amber-600',
        slate: 'bg-slate-100 text-slate-600'
    };
    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
                <span className={`p-1.5 rounded-lg ${tones[tone]}`}><Icon size={15} /></span>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</p>
            </div>
            <p className="text-3xl font-bold text-slate-800 tabular-nums">{value}</p>
            {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </div>
    );
};

/** Ranked list as proportional bars — "which is biggest and by how much". */
const RankedBars = ({ title, subtitle, rows, empty }) => {
    const max = Math.max(1, ...rows.map(r => r.count));
    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <h2 className="font-bold text-slate-800">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5 mb-4">{subtitle}</p>}
            {rows.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">{empty}</p>
            ) : (
                <ul className="space-y-2.5 mt-4">
                    {rows.map((r) => (
                        <li key={r.name}>
                            <div className="flex justify-between items-baseline gap-3 mb-1">
                                <span className="text-sm font-medium text-slate-700 truncate">{r.name}</span>
                                <span className="text-sm font-bold text-slate-800 tabular-nums shrink-0">{r.count}</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(r.count / max) * 100}%` }} />
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

const Jobs = () => {
    const [overview, setOverview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [locked, setLocked] = useState(false);
    const [savingLock, setSavingLock] = useState(false);

    const load = React.useCallback(() => {
        Promise.all([
            api.get('/jobs/admin/overview'),
            api.get('/admin/settings')
        ])
            .then(([o, s]) => {
                setOverview(o.data);
                setLocked(s.data?.isJobsEnabled === false);
                setError(null);
            })
            .catch((err) => setError(err.response?.data?.error || err.response?.data?.message || 'Could not load Jobs reporting.'))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { load(); }, [load]);

    /** The one write on this page — asks first, because it takes the section
        away from every student at once. */
    const toggleLock = async () => {
        const next = locked;
        if (!next && !window.confirm(
            'Lock Jobs?\n\nEvery student loses the tab immediately. Their saved jobs and search history are kept and come back when you unlock it.'
        )) return;

        setSavingLock(true);
        try {
            const res = await api.put('/admin/settings', { isJobsEnabled: next });
            setLocked(res.data?.isJobsEnabled === false);
        } catch (err) {
            setError(err.response?.data?.message || 'Could not change the lock.');
        } finally {
            setSavingLock(false);
        }
    };

    if (loading) return <div className="p-8 text-slate-500">Loading Jobs reporting…</div>;
    if (error && !overview) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm font-medium">
                {error}
            </div>
        );
    }

    const idx = overview?.index ?? {};
    const searches = overview?.searches ?? {};
    const locatedPct = idx.active ? Math.round((idx.withCoords / idx.active) * 100) : 0;
    const providers = overview?.providers ?? [];
    const gemini = overview?.gemini ?? {};

    return (
        <div className="space-y-6">
            {locked && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <Lock size={18} className="text-amber-600 mt-0.5 shrink-0" />
                    <div className="text-sm">
                        <p className="font-bold text-amber-800">Jobs is locked</p>
                        <p className="text-amber-700 mt-0.5">
                            Students cannot open the section, so the search figures below will not move.
                            The index keeps maintaining itself, and nothing has been deleted — unlock it
                            here or in <Link to="/settings" className="font-semibold underline hover:text-amber-900">Platform Settings</Link>.
                        </p>
                    </div>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm font-medium">
                    {error}
                </div>
            )}

            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <span className="bg-indigo-100 text-indigo-600 p-2 rounded-lg"><Briefcase size={20} /></span>
                        Jobs
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Index health, what students are searching for, and provider spend.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleLock}
                        disabled={savingLock}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${
                            locked
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                        title={locked ? 'Give students the Jobs tab back' : 'Hide Jobs from every student'}
                    >
                        {locked ? <Unlock size={15} /> : <Lock size={15} />}
                        {savingLock ? 'Saving…' : locked ? 'Unlock for students' : 'Lock for students'}
                    </button>
                    <button
                        onClick={load}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        <RefreshCw size={15} /> Refresh
                    </button>
                </div>
            </div>

            {/* ── Index health ─────────────────────────────────────────── */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Stat icon={Database} label="Active listings" value={(idx.active ?? 0).toLocaleString()}
                    sub={`${(idx.total ?? 0).toLocaleString()} stored in total`} />
                <Stat icon={MapPin} label="Distance-rankable" value={`${locatedPct}%`}
                    sub={`${(idx.withCoords ?? 0).toLocaleString()} listings carry coordinates`} tone="emerald" />
                <Stat icon={Search} label="Searches, 30 days" value={(searches.last30Days ?? 0).toLocaleString()}
                    sub={`${(searches.total ?? 0).toLocaleString()} all-time`} />
                {/* Amber when the embeddings share Career Path's key: Google
                    meters per project per day, so a big embed run can spend
                    the very allowance a mentor conversation needs mid-class.
                    The fix is one env var — say so here, where the operator
                    who will feel it is already looking. */}
                <Stat icon={Sparkles} label="Semantic matching" value={gemini.configured ? 'On' : 'Off'}
                    sub={!gemini.configured
                        ? 'No Gemini key — literal matching only'
                        : gemini.keyScope === 'shared'
                            ? 'Shares Career Path\u2019s Gemini allowance — set JOBS_GEMINI_API_KEY to separate them'
                            : `Dedicated key · ${gemini.model}`}
                    tone={!gemini.configured ? 'slate' : gemini.keyScope === 'shared' ? 'amber' : 'emerald'} />
            </div>

            {/* ── Demand ───────────────────────────────────────────────── */}
            <div className="grid gap-6 lg:grid-cols-2">
                <RankedBars
                    title="Roles students search for"
                    subtitle="Last 30 days. A role that keeps appearing here and matches no course is a course waiting to be built."
                    rows={overview?.topRoles ?? []}
                    empty="No searches recorded yet."
                />
                <RankedBars
                    title="Skills students claim"
                    subtitle="Last 30 days, from search profiles."
                    rows={overview?.topSkills ?? []}
                    empty="No searches recorded yet."
                />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <RankedBars
                    title="Where they are searching"
                    subtitle="Locations as typed into searches, last 30 days."
                    rows={overview?.topPlaces ?? []}
                    empty="No located searches yet."
                />

                {/* ── Provider spend ───────────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                    <h2 className="font-bold text-slate-800">Metered providers</h2>
                    <p className="text-xs text-slate-500 mt-0.5 mb-4">
                        This month&apos;s requests against the paid-tier sources. Keyless boards are unmetered.
                    </p>
                    {providers.length === 0 ? (
                        <p className="text-sm text-slate-400 py-6 text-center">
                            No metered calls this month — the index is running on the keyless boards alone.
                        </p>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {providers.map((p) => (
                                <li key={p.provider} className="flex justify-between items-baseline py-2.5">
                                    <span className="text-sm font-medium text-slate-700">{p.provider}</span>
                                    <span className="text-sm font-bold text-slate-800 tabular-nums">
                                        {p.calls} request{p.calls === 1 ? '' : 's'} in {p.month}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Jobs;
