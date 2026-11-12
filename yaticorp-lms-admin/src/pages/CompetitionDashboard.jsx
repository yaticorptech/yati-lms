/**
 * The Admin Competition Dashboard (2026-11-04): the platform's competitions at a glance, and what needs doing —
 * registrations to approve, matches to decide, results to publish — with the way into each, the games and the
 * colleges taking part, and the management pages (competitions, Quiz Arena and its question bank, certificates,
 * organisations) — and every competition's card, to open, edit or delete it (Competitions.jsx, `cardsOnly`).
 * This is the admin's Competitions page (/competitions) since 2026-11-04; the old list page is gone.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
    LayoutDashboard, Trophy, Radio, CheckCircle2, ClipboardCheck, AlertTriangle, Megaphone, Building2, Award,
    Library, ArrowRight, Loader2, RefreshCw, Users, FileStack, Plus
} from 'lucide-react';
import api from '../utils/api';
import Competitions from './Competitions';
import { CARD, BTN } from '../components/orgUi';
import { GAMES, errorOf } from '../competitions/constants';
import { arenaApi } from '../arena/shared';

/** A count. `view`: pressing it lists just those competitions below (pressed again: all of them); `to`: a page. */
const Kpi = ({ icon: Icon, label, value, tone, to, view, on, onPick }) => {
    const body = (<>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon size={20} aria-hidden /></span>
        <span className="min-w-0"><span className="block text-2xl font-black leading-none tabular-nums text-slate-900">{value}</span><span className="mt-1 block truncate text-xs font-semibold text-slate-500">{label}</span></span>
    </>);
    const cls = `${CARD} flex items-center gap-3 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${on ? 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-300' : ''}`;
    return view
        ? <button type="button" onClick={() => onPick(view)} aria-pressed={on} className={cls} data-kpi={label}>{body}</button>
        : <Link to={to} className={cls} data-kpi={label}>{body}</Link>;
};
/**
 * The colleges taking part, each with its students and the competitions they are in (GET /competitions/admin/
 * participants: approved teams and approved Quiz Arena entries). A college opens to show its students.
 */
function Participants() {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [q, setQ] = useState('');
    const [open, setOpen] = useState(null);
    useEffect(() => { api.get('/competitions/admin/participants').then((r) => setData(r.data)).catch((err) => setError(errorOf(err))); }, []);
    if (error) return <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>;
    if (!data) return <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />;
    const term = q.trim().toLowerCase();
    const shown = data.colleges.map((c) => (!term || c.name.toLowerCase().includes(term) ? c : { ...c, students: c.students.filter((st) => st.name.toLowerCase().includes(term)) }))
        .filter((c) => !term || c.name.toLowerCase().includes(term) || c.students.length);
    return (
        <div className="space-y-3" data-participants>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-slate-500">{data.colleges.length} college{data.colleges.length === 1 ? '' : 's'} · {data.students} student{data.students === 1 ? '' : 's'} taking part</p>
                <input value={q} onChange={(e) => setQ(e.target.value)} type="search" placeholder="Search a college or a student" className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 sm:w-72" />
            </div>
            {!shown.length ? <p className={`${CARD} p-8 text-center text-sm text-slate-500`}>{term ? 'Nothing matches that search.' : 'No college has an approved team or entry yet.'}</p> : (
                <ul className="space-y-2">
                    {shown.map((c) => {
                        const on = open === c.name || !!term;
                        return (
                            <li key={c.name} className={`${CARD} overflow-hidden`} data-college={c.name}>
                                <button type="button" onClick={() => setOpen(open === c.name ? null : c.name)} aria-expanded={on} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-indigo-50/50">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><Building2 size={17} aria-hidden /></span>
                                    <span className="min-w-0 flex-1"><span className="block truncate font-bold text-slate-900">{c.name}</span><span className="text-xs text-slate-500">{c.students.length} student{c.students.length === 1 ? '' : 's'}</span></span>
                                    <span className={`text-slate-400 transition-transform ${on ? 'rotate-90' : ''}`} aria-hidden>›</span>
                                </button>
                                {on && (
                                    <ul className="divide-y divide-slate-100 border-t border-slate-100">
                                        {c.students.map((st) => (
                                            <li key={st.id} className="flex flex-col gap-1 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                                                <span className="flex items-center gap-2.5 font-semibold text-slate-800"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-black text-indigo-700">{(st.name || '?').slice(0, 1).toUpperCase()}</span>{st.name}</span>
                                                <span className="flex flex-wrap gap-1 sm:justify-end">{st.competitions.map((n) => <span key={n} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{n}</span>)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

const VIEW_TITLES = { colleges: 'Colleges taking part', all: 'All competitions', live: 'Live now', upcoming: 'Upcoming and registering', completed: 'Completed', draft: 'Drafts', pending: 'With registrations to approve', decide: 'With matches to decide', publish: 'With results to publish', teams: 'With approved teams' };

/** A to-do list: the competitions needing that action, each opening its page. */
const Queue = ({ icon: Icon, title, tone, rows, empty, detail }) => (
    <section className={`${CARD} p-5`} data-queue={title}>
        <h2 className="mb-3 flex items-center gap-2 text-base font-black text-slate-900"><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tone}`}><Icon size={16} aria-hidden /></span>{title}<span className="ml-auto rounded-full bg-slate-100 px-2 text-xs font-bold text-slate-600">{rows.length}</span></h2>
        {rows.length ? (
            <ul className="space-y-1.5">
                {rows.slice(0, 6).map((r) => (
                    <li key={r.key}><Link to={r.to} className="flex items-center gap-3 rounded-xl px-3 py-2.5 ring-1 ring-slate-100 hover:bg-indigo-50/60">
                        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-800">{r.name}</span><span className="block truncate text-xs text-slate-500">{detail(r)}</span></span>
                        <ArrowRight size={15} className="shrink-0 text-slate-400" aria-hidden />
                    </Link></li>
                ))}
                {rows.length > 6 && <li className="px-3 pt-1 text-xs text-slate-500">and {rows.length - 6} more on the Competitions page.</li>}
            </ul>
        ) : <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">{empty}</p>}
    </section>
);

const MANAGE = [
    ['/competitions/question-bank', 'Quiz Arena question bank', 'The questions Quiz Arena draws from, round by round.', Library],
    ['/competitions/certificates', 'Certificate Builder', 'Design the certificates winners and participants get.', Award],
    ['/competitions/certificates/issued', 'Issued certificates', 'Every certificate issued: preview, download, revoke.', FileStack]
];

export default function CompetitionDashboard() {
    const [comps, setComps] = useState(null);
    const [arenas, setArenas] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(true);
    // Which competitions the list below shows: a box pressed picks it, and the list comes into view.
    const [view, setView] = useState('all');
    // New competition (?new=1): its form opens here at once, whatever the list below shows (2026-11-06: on the
    // Overview the list was not drawn, so the button changed the address and nothing opened).
    const [params] = useSearchParams();
    const creatingNew = params.get('new') === '1';
    const pick = (v) => {
        setView((cur) => (cur === v && v !== 'all' ? 'all' : v));
        requestAnimationFrame(() => document.querySelector('[data-all-competitions]')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    };
    const load = useCallback(() => Promise.all([api.get('/competitions/admin'), api.get(arenaApi()).catch(() => ({ data: { competitions: [] } }))])
        .then(([c, a]) => { setComps(c.data.competitions || []); setArenas(a.data.competitions || []); setError(''); })
        .catch((err) => setError(errorOf(err))).finally(() => setBusy(false)), []);
    useEffect(() => { load(); }, [load]);
    const refresh = () => { setBusy(true); load(); };

    const d = useMemo(() => {
        if (!comps || !arenas) return null;
        const to = (c) => `/competitions/${c.id}`;
        const upcoming = comps.filter((c) => ['registration', 'closed'].includes(c.status) && c.phase !== 'expired');
        const colleges = new Map();
        for (const c of comps) for (const name of c.colleges || []) colleges.set(name, (colleges.get(name) || 0) + 1);
        return {
            live: comps.filter((c) => c.status === 'live'),
            // Counted as the list below shows them: the competitions and the Quiz Arenas of each kind.
            upcoming: [...upcoming, ...arenas.filter((a) => a.status !== 'draft' && ['registration', 'upcoming'].includes(a.state))],
            // Cancelled ones are not "completed" (2026-11-06), for competitions or Quiz Arenas.
            completed: [...comps.filter((c) => c.status !== 'cancelled' && (c.status === 'completed' || c.phase === 'expired')), ...arenas.filter((a) => a.status !== 'draft' && a.status !== 'cancelled' && ['ended', 'results'].includes(a.state))],
            pending: comps.filter((c) => c.counts?.pending > 0).map((c) => ({ ...c, key: c.id, to: to(c) })),
            decide: comps.filter((c) => c.counts?.needsDecision > 0).map((c) => ({ ...c, key: c.id, to: to(c) })),
            publish: comps.filter((c) => c.status === 'completed' && !c.resultsPublishedAt).map((c) => ({ ...c, key: c.id, to: to(c) })),
            liveRows: [
                ...comps.filter((c) => c.status === 'live').map((c) => ({ ...c, key: c.id, to: to(c), kind: c.gameLabel })),
                ...arenas.filter((a) => a.state === 'live').map((a) => ({ ...a, name: a.title, key: `a${a.id}`, to: `/competitions/arena/${a.id}`, kind: 'Quiz Arena' }))
            ],
            approvedTeams: comps.reduce((n, c) => n + (c.counts?.approved || 0), 0),
            players: comps.reduce((n, c) => n + (c.playersCount || 0), 0),
            games: Object.entries(GAMES).filter(([id]) => !['quiz', 'hackathon'].includes(id)).map(([id, g]) => ({ id, label: g.label, all: comps.filter((c) => c.game === id), live: comps.filter((c) => c.game === id && c.status === 'live').length })),
            arenaOpen: arenas.filter((a) => ['registration', 'upcoming', 'live'].includes(a.state)).length,
            colleges: [...colleges.entries()].sort((a, b) => b[1] - a[1])
        };
    }, [comps, arenas]);

    return (
        <div className="space-y-6 pb-12" data-competition-dashboard>
            <header className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-indigo-600"><LayoutDashboard size={14} aria-hidden /> Platform admin</p>
                    <h1 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">Competition Dashboard</h1>
                    <p className="mt-1 text-sm text-slate-500">Inter-college competitions and Quiz Arena: what is on, and what needs you.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={refresh} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                        {busy ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <RefreshCw size={15} aria-hidden />} Refresh
                    </button>
                    <Link to="/competitions/certificates" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50" data-create-certificate><Award size={15} aria-hidden /> Create certificate</Link>
                    <Link to="/competitions?new=1" className={BTN}><Plus size={16} aria-hidden /> New competition</Link>
                </div>
            </header>
            {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error} <button type="button" onClick={refresh} className="ml-2 underline">Try again</button></p>}

            {!d ? (
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />)}</div>
            ) : (<>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {/* Overview: every competition in the list (2026-11-04). */}
                    <Kpi icon={LayoutDashboard} label="Overview · competitions in total" value={comps.length + arenas.length} tone="bg-indigo-50 text-indigo-600" view="all" on={view === 'all'} onPick={pick} />
                    <Kpi icon={Radio} label="Live now" value={d.live.length + arenas.filter((a) => a.state === 'live').length} tone="bg-rose-50 text-rose-600" view="live" on={view === 'live'} onPick={pick} />
                    <Kpi icon={CheckCircle2} label="Completed" value={d.completed.length} tone="bg-emerald-50 text-emerald-600" view="completed" on={view === 'completed'} onPick={pick} />
                    <Kpi icon={ClipboardCheck} label="Registrations to approve" value={d.pending.reduce((n, c) => n + c.counts.pending, 0)} tone="bg-amber-50 text-amber-600" view="pending" on={view === 'pending'} onPick={pick} />
                    <Kpi icon={AlertTriangle} label="Matches to decide" value={d.decide.reduce((n, c) => n + c.counts.needsDecision, 0)} tone="bg-orange-50 text-orange-600" view="decide" on={view === 'decide'} onPick={pick} />
                    <Kpi icon={Users} label={`Approved teams · ${d.players} players`} value={d.approvedTeams} tone="bg-indigo-50 text-indigo-600" view="teams" on={view === 'teams'} onPick={pick} />
                    <Kpi icon={Building2} label="Colleges taking part" value={d.colleges.length} tone="bg-violet-50 text-violet-600" view="colleges" on={view === 'colleges'} onPick={pick} />
                    <Kpi icon={Megaphone} label="Results to publish" value={d.publish.length} tone="bg-emerald-50 text-emerald-600" view="publish" on={view === 'publish'} onPick={pick} />
                </div>

                {creatingNew && view === 'all' && <Competitions formOnly />}

                {/* The competitions of the box pressed (2026-11-04) — Open, Edit, Delete; none on the Overview. */}
                {view !== 'all' && <section data-all-competitions>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <h2 className="flex items-center gap-2 text-base font-black text-slate-900"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><Trophy size={16} aria-hidden /></span>{VIEW_TITLES[view]}</h2>
                        <button type="button" onClick={() => setView('all')} className="rounded-xl px-3 py-1.5 text-sm font-bold text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-50">Back to overview</button>
                    </div>
                    {view === 'colleges' ? <Participants /> : <Competitions cardsOnly view={view} />}
                </section>}

                <div className="grid gap-4 lg:grid-cols-3">
                    <Queue icon={ClipboardCheck} title="Registrations to approve" tone="bg-amber-50 text-amber-600" rows={d.pending} empty="No team is waiting for approval." detail={(c) => `${c.counts.pending} team${c.counts.pending === 1 ? '' : 's'} waiting · ${c.gameLabel}`} />
                    <Queue icon={AlertTriangle} title="Matches to decide" tone="bg-orange-50 text-orange-600" rows={d.decide} empty="No match needs a decision." detail={(c) => `${c.counts.needsDecision} match${c.counts.needsDecision === 1 ? '' : 'es'} · ${c.gameLabel}`} />
                    <Queue icon={Megaphone} title="Results to publish" tone="bg-emerald-50 text-emerald-600" rows={d.publish} empty="Every finished competition's results are out." detail={(c) => `${c.gameLabel} · finished, results not published`} />
                </div>

                {/* Live now, Games and Colleges taking part left out (2026-11-07); the Live now tile above still shows them. */}
                <section className={`${CARD} p-5`}>
                    <h2 className="mb-3 text-base font-black text-slate-900">Manage</h2>
                    <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {MANAGE.map(([to, label, note, Icon]) => (
                            <li key={to}><Link to={to} className="flex h-full items-start gap-3 rounded-xl p-3 ring-1 ring-slate-100 hover:bg-indigo-50/60">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><Icon size={17} aria-hidden /></span>
                                <span className="min-w-0"><span className="block text-sm font-bold text-slate-800">{label}</span><span className="block text-xs text-slate-500">{note}</span></span>
                            </Link></li>
                        ))}
                    </ul>
                </section>
            </>)}
        </div>
    );
}
