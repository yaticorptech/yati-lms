/**
 * The Admin Competition Dashboard (2026-11-04): the platform's competitions at a glance, and what needs doing —
 * registrations to approve, matches to decide, results to publish — with the way into each, the games and the
 * colleges taking part, and the management pages (competitions, Quiz Arena and its question bank, certificates,
 * organisations). Everything from the existing admin endpoints; managing still happens on those pages.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    LayoutDashboard, Trophy, Radio, CalendarClock, CheckCircle2, ClipboardCheck, AlertTriangle, Megaphone, Building2, Gamepad2, Award,
    Library, ArrowRight, Loader2, RefreshCw, Users, FileStack, Plus
} from 'lucide-react';
import api from '../utils/api';
import { CARD, BTN } from '../components/orgUi';
import { GAMES, errorOf } from '../competitions/constants';
import { arenaApi } from '../arena/shared';

const Kpi = ({ icon: Icon, label, value, tone, to }) => (
    <Link to={to} className={`${CARD} flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-md`} data-kpi={label}>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon size={20} aria-hidden /></span>
        <span className="min-w-0"><span className="block text-2xl font-black leading-none tabular-nums text-slate-900">{value}</span><span className="mt-1 block truncate text-xs font-semibold text-slate-500">{label}</span></span>
    </Link>
);

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
    ['/competitions', 'Competitions', 'Create, edit, publish; approve teams; draw and run matches; decide and publish results.', Trophy],
    ['/competitions/question-bank', 'Quiz Arena question bank', 'The questions Quiz Arena draws from, round by round.', Library],
    ['/competitions/certificates', 'Certificate Builder', 'Design the certificates winners and participants get.', Award],
    ['/competitions/certificates/issued', 'Issued certificates', 'Every certificate issued: preview, download, revoke.', FileStack],
    ['/organizations', 'Colleges', 'The organisations whose students take part.', Building2]
];

export default function CompetitionDashboard() {
    const [comps, setComps] = useState(null);
    const [arenas, setArenas] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(true);
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
            upcoming, completed: comps.filter((c) => c.status === 'completed'),
            drafts: comps.filter((c) => c.status === 'draft'),
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
                    <Link to="/competitions?new=1" className={BTN}><Plus size={16} aria-hidden /> New competition</Link>
                </div>
            </header>
            {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error} <button type="button" onClick={refresh} className="ml-2 underline">Try again</button></p>}

            {!d ? (
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />)}</div>
            ) : (<>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <Kpi icon={Radio} label="Live now" value={d.live.length + arenas.filter((a) => a.state === 'live').length} tone="bg-rose-50 text-rose-600" to="/competitions" />
                    <Kpi icon={CalendarClock} label="Upcoming / registering" value={d.upcoming.length} tone="bg-sky-50 text-sky-600" to="/competitions" />
                    <Kpi icon={CheckCircle2} label="Completed" value={d.completed.length} tone="bg-emerald-50 text-emerald-600" to="/competitions" />
                    <Kpi icon={Trophy} label={`Drafts · ${d.arenaOpen} Quiz Arena open`} value={d.drafts.length} tone="bg-slate-100 text-slate-600" to="/competitions" />
                    <Kpi icon={ClipboardCheck} label="Registrations to approve" value={d.pending.reduce((n, c) => n + c.counts.pending, 0)} tone="bg-amber-50 text-amber-600" to={d.pending[0]?.to || '/competitions'} />
                    <Kpi icon={AlertTriangle} label="Matches to decide" value={d.decide.reduce((n, c) => n + c.counts.needsDecision, 0)} tone="bg-orange-50 text-orange-600" to={d.decide[0]?.to || '/competitions'} />
                    <Kpi icon={Users} label={`Approved teams · ${d.players} players`} value={d.approvedTeams} tone="bg-indigo-50 text-indigo-600" to="/competitions" />
                    <Kpi icon={Building2} label="Colleges taking part" value={d.colleges.length} tone="bg-violet-50 text-violet-600" to="/organizations" />
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    <Queue icon={ClipboardCheck} title="Registrations to approve" tone="bg-amber-50 text-amber-600" rows={d.pending} empty="No team is waiting for approval." detail={(c) => `${c.counts.pending} team${c.counts.pending === 1 ? '' : 's'} waiting · ${c.gameLabel}`} />
                    <Queue icon={AlertTriangle} title="Matches to decide" tone="bg-orange-50 text-orange-600" rows={d.decide} empty="No match needs a decision." detail={(c) => `${c.counts.needsDecision} match${c.counts.needsDecision === 1 ? '' : 'es'} · ${c.gameLabel}`} />
                    <Queue icon={Megaphone} title="Results to publish" tone="bg-emerald-50 text-emerald-600" rows={d.publish} empty="Every finished competition's results are out." detail={(c) => `${c.gameLabel} · finished, results not published`} />
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <Queue icon={Radio} title="Live now" tone="bg-rose-50 text-rose-600" rows={d.liveRows} empty="Nothing is live right now." detail={(c) => `${c.kind}${c.counts?.live ? ` · ${c.counts.live} match${c.counts.live === 1 ? '' : 'es'} on` : ''}`} />
                    <section className={`${CARD} p-5`}>
                        <h2 className="mb-3 flex items-center gap-2 text-base font-black text-slate-900"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><Gamepad2 size={16} aria-hidden /></span>Games</h2>
                        <ul className="grid grid-cols-2 gap-2">
                            {d.games.map((g) => (
                                <li key={g.id} className="rounded-xl bg-slate-50 px-3 py-2.5" data-game-count={g.id}>
                                    <p className="text-sm font-bold text-slate-800">{g.label}</p>
                                    <p className="text-xs text-slate-500">{g.all.length} competition{g.all.length === 1 ? '' : 's'}{g.live ? ` · ${g.live} live` : ''}</p>
                                </li>
                            ))}
                            <li className="rounded-xl bg-slate-50 px-3 py-2.5"><p className="text-sm font-bold text-slate-800">Quiz Arena</p><p className="text-xs text-slate-500">{arenas.length} contest{arenas.length === 1 ? '' : 's'} · {d.arenaOpen} open</p></li>
                        </ul>
                    </section>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
                    <section className={`${CARD} p-5`}>
                        <h2 className="mb-3 flex items-center gap-2 text-base font-black text-slate-900"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><Building2 size={16} aria-hidden /></span>Colleges taking part</h2>
                        {d.colleges.length ? (
                            <ul className="max-h-72 space-y-1 overflow-y-auto pr-1">
                                {d.colleges.map(([name, n]) => <li key={name} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm odd:bg-slate-50"><span className="truncate font-semibold text-slate-800">{name}</span><span className="shrink-0 text-xs text-slate-500">{n} competition{n === 1 ? '' : 's'}</span></li>)}
                            </ul>
                        ) : <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">No approved teams yet.</p>}
                    </section>
                    <section className={`${CARD} p-5`}>
                        <h2 className="mb-3 text-base font-black text-slate-900">Manage</h2>
                        <ul className="grid gap-2 sm:grid-cols-2">
                            {MANAGE.map(([to, label, note, Icon]) => (
                                <li key={to}><Link to={to} className="flex h-full items-start gap-3 rounded-xl p-3 ring-1 ring-slate-100 hover:bg-indigo-50/60">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><Icon size={17} aria-hidden /></span>
                                    <span className="min-w-0"><span className="block text-sm font-bold text-slate-800">{label}</span><span className="block text-xs text-slate-500">{note}</span></span>
                                </Link></li>
                            ))}
                        </ul>
                    </section>
                </div>
            </>)}
        </div>
    );
}
