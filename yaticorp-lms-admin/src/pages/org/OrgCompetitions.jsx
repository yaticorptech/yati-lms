/**
 * An organization in Games & Competitions, in two tabs:
 *
 *   Take part   as a college's coordinator: register the college's team for
 *               an inter-college competition, pick the players from the
 *               college's own students, see whether it was approved, and
 *               choose who plays each match
 *   Host        run your own competitions, for your own students only: create,
 *               make the teams from your students, draw and decide the
 *               matches (the platform admin's own screens, limited to yours)
 *               — only when the platform admin has let this organization
 *               host; otherwise there is no such tab
 */
import { createPortal } from 'react-dom';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import useGoBack from '../../hooks/useGoBack';
import useStepParam from '../../hooks/useStepParam';
import { X, Lock, Trophy, Users, CalendarClock, Check, Loader2, Send, Undo2, Swords, Search, Crown, ChevronDown, Gamepad2, Clock, Brain, ArrowLeft, Building2 } from 'lucide-react';
import api from '../../utils/api';
import { Segmented, CARD, BTN, BTN2, INPUT, LABEL } from '../../components/orgUi';
import { CardGridSkeleton } from '../../competitions/Skeletons';

const takePartSeen = {};
import Competitions from '../Competitions';
import { Chip, GameIcon } from '../../competitions/shared';
import { ORDINAL, fmtDateTime, errorOf, competitionBadge } from '../../competitions/constants';

/** The team form: name, coordinator contact, and the players. */
const TeamForm = ({ competition: c, team, students, onSaved, onCancel }) => {
    const [teamName, setTeamName] = useState(team?.teamName || '');
    const [coordinatorName, setCoordinatorName] = useState(team?.coordinator?.name || '');
    const [coordinatorPhone, setCoordinatorPhone] = useState(team?.coordinator?.phone || '');
    const [picked, setPicked] = useState(() => new Set((team?.players || []).map((p) => p.userId)));
    const [q, setQ] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const shown = useMemo(() => students.filter((s) => `${s.name} ${s.email} ${s.cardNumber}`.toLowerCase().includes(q.toLowerCase())), [students, q]);
    const toggle = (id) => setPicked((p) => {
        const next = new Set(p);
        if (next.has(id)) next.delete(id); else if (next.size < c.playersPerTeam) next.add(id);
        return next;
    });
    const save = (e) => {
        e.preventDefault();
        // The coordinator's mobile: exactly 10 digits, or the form does not go.
        if (!/^\d{10}$/.test(coordinatorPhone)) { setError('Enter the coordinator\'s 10-digit phone number.'); return; }
        setBusy(true); setError('');
        api.put(`/competitions/org/${c.id}/team`, { teamName, coordinatorName, coordinatorPhone, players: [...picked] })
            .then(() => onSaved()).catch((err) => setError(errorOf(err))).finally(() => setBusy(false));
    };
    return (
        <form onSubmit={save} className="mt-4 space-y-4 rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4">
            <div className="grid gap-3 sm:grid-cols-3">
                <label><span className={LABEL}>Team name</span><input required maxLength={80} value={teamName} onChange={(e) => setTeamName(e.target.value)} className={INPUT} placeholder="e.g. St Agnes Knights" /></label>
                <label><span className={LABEL}>College coordinator</span><input maxLength={80} value={coordinatorName} onChange={(e) => setCoordinatorName(e.target.value)} className={INPUT} placeholder="Your name" /></label>
                <label><span className={LABEL}>Coordinator phone</span><input required inputMode="numeric" pattern="[0-9]{10}" maxLength={10} title="10 digits" value={coordinatorPhone} onChange={(e) => setCoordinatorPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} className={INPUT} placeholder="10-digit mobile" />{coordinatorPhone && coordinatorPhone.length !== 10 && <span className="mt-1 block text-xs font-semibold text-rose-600">{10 - coordinatorPhone.length} more digit{coordinatorPhone.length === 9 ? '' : 's'}</span>}</label>
            </div>
            <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-800">Players <span className="font-semibold text-slate-500">({picked.size} of up to {c.playersPerTeam}{c.playersPerSide > 1 ? `, at least ${c.playersPerSide}` : ''})</span></p>
                    <label className="relative w-full sm:w-64"><span className="sr-only">Search students</span>
                        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your students" className={`${INPUT} pl-9`} /></label>
                </div>
                {students.length === 0 ? <p className="text-sm text-slate-500">Your college has no students on the LMS yet.</p> : (
                    <ul className="grid max-h-72 gap-1.5 overflow-y-auto sm:grid-cols-2">
                        {shown.map((s) => {
                            const on = picked.has(s.id);
                            const full = !on && picked.size >= c.playersPerTeam;
                            return (
                                <li key={s.id}>
                                    <button type="button" onClick={() => toggle(s.id)} disabled={full} aria-pressed={on}
                                        className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-sm transition-colors ${on ? 'border-indigo-300 bg-white ring-2 ring-indigo-200' : 'border-slate-200 bg-white hover:border-indigo-200'} disabled:opacity-40`}>
                                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${on ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'}`}>{on && <Check size={13} />}</span>
                                        <span className="min-w-0 flex-1"><span className="block truncate font-semibold text-slate-800">{s.name}</span><span className="block truncate text-xs text-slate-500">{s.email}</span></span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
            {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
            <div className="flex flex-wrap justify-end gap-2">
                {onCancel && <button type="button" className={BTN2} onClick={onCancel}>Cancel</button>}
                <button type="submit" className={BTN} disabled={busy || picked.size < c.playersPerSide || !teamName.trim()}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} {team && team.status !== 'withdrawn' ? 'Save and send for approval' : 'Register team'}</button>
            </div>
        </form>
    );
};

/** Our team's matches, with who plays each one. */
const OurMatches = ({ competition: c, detail, team, onChanged }) => {
    const ours = detail.rounds.flatMap((r) => r.matches).filter((m) => m.sides.some((s) => s.teamId === team.id));
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    if (!ours.length) return <p className="text-sm text-slate-500">Your matches appear here once the organizer draws them.</p>;
    const setLineup = (m, players) => {
        setBusy(m.id); setError('');
        api.put(`/competitions/org/${c.id}/matches/${m.id}/lineup`, { players }).then(onChanged).catch((err) => setError(errorOf(err))).finally(() => setBusy(''));
    };
    return (
        <div className="space-y-3">
            {ours.map((m) => {
                const mine = m.sides.find((s) => s.teamId === team.id);
                const chosen = mine.lineup.map((p) => p.userId);
                const current = chosen.length ? chosen : team.players.slice(0, c.playersPerSide).map((p) => p.userId);
                return (
                    <article key={m.id} className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-bold text-slate-800">{m.roundName}{m.status === 'bye' ? '' : ` · ${fmtDateTime(m.scheduledAt)}`}</p>
                            <Chip status={m.status} />
                        </div>
                        <p className="mt-1 text-sm text-slate-600"><Swords size={14} className="mr-1 inline text-slate-400" />{m.sides.map((s) => s.teamName).join(' vs ')}</p>
                        {/* A bye is no game: nobody to play, so the team simply goes through. */}
                        {m.status === 'bye' && <p className="mt-1 text-sm font-semibold text-slate-600">No opponent this round. {mine.teamName} goes straight to the next round.</p>}
                        {/* Your college's match: its code, to give your players. */}
                        {m.gameCode && <p className="mt-1 text-xs text-slate-600" data-match-code={m.gameCode}>Match code <span className="rounded-md bg-slate-900 px-1.5 py-0.5 font-mono text-[11px] font-black tracking-[0.2em] text-white">{m.gameCode}</span></p>}
                        {m.winnerTeamId && m.status !== 'bye' && <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-emerald-700"><Crown size={14} /> {m.sides.find((s) => s.teamId === m.winnerTeamId)?.teamName} won{m.resultNote ? ` — ${m.resultNote}` : ''}</p>}
                        {m.status === 'scheduled' ? (
                            <div className="mt-3">
                                <p className={LABEL}>Who plays this match ({c.playersPerSide})</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {team.players.map((p) => {
                                        const on = current.includes(p.userId);
                                        return (
                                            <button key={p.userId} type="button" disabled={busy === m.id} aria-pressed={on}
                                                onClick={() => {
                                                    if (c.playersPerSide === 1) return setLineup(m, [p.userId]);
                                                    const next = on ? current.filter((x) => x !== p.userId) : [...current, p.userId].slice(-c.playersPerSide);
                                                    if (next.length === c.playersPerSide) setLineup(m, next);
                                                }}
                                                className={`rounded-full border px-3 py-1 text-sm font-semibold ${on ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300'}`}>
                                                {p.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : mine.lineup.length > 0 && <p className="mt-2 text-xs text-slate-500">Played by {mine.lineup.map((p) => p.name).join(', ')}</p>}
                    </article>
                );
            })}
            {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        </div>
    );
};

/** One competition, opened: details, our team, and our matches. */
const CompetitionPanel = ({ summary, students, onChanged }) => {
    const [detail, setDetail] = useState(null);
    const [editing, setEditing] = useState(false);
    const [starting, setStarting] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const load = useCallback(() => api.get(`/competitions/org/${summary.id}`).then((r) => setDetail(r.data)).catch((err) => setError(errorOf(err))), [summary.id]);
    useEffect(() => { load(); }, [load]);
    if (!detail) return <div className="mt-4 h-24 animate-pulse rounded-xl bg-slate-100" />;
    const c = detail.competition;
    const team = detail.myTeam;
    const refresh = () => { load(); onChanged(); };
    const withdraw = () => {
        if (!window.confirm('Withdraw your team from this competition?')) return;
        setBusy(true);
        api.delete(`/competitions/org/${c.id}/team`).then(refresh).catch((err) => setError(errorOf(err))).finally(() => setBusy(false));
    };
    // No team yet (or one withdrawn or turned down): a Register College button
    // first, then the team form. A team already sent shows its status.
    // A quiz or hackathon entered by students on their own: they sign up themselves; the college enters no team.
    const solo = c.entry === 'individual';
    const canRegister = !solo && c.registrationOpen && (!team || team.status === 'withdrawn' || team.status === 'rejected');
    const registering = c.registrationOpen && (editing || (canRegister && starting));
    return (
        <div className="space-y-4">
            {/* No rules or prize line here (asked 2026-10-28): the participants list above says who won. */}
            {team && team.status !== 'withdrawn' && !editing && (
                <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-bold text-slate-900">{team.teamName}{team.place ? <span className="text-amber-600"> · {ORDINAL[team.place]}</span> : null}</p>
                        <Chip status={team.status} />
                    </div>
                    <p className="mt-1 text-sm text-slate-600"><Users size={14} className="mr-1 inline text-slate-400" />{team.players.map((p) => p.name).join(', ')}</p>
                    {team.note && <p className="mt-1 text-sm text-rose-700">Organizer's note: {team.note}</p>}
                    {c.registrationOpen && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            <button type="button" className={BTN2} onClick={() => setEditing(true)}>Change team</button>
                            <button type="button" className={`${BTN2} text-rose-700`} disabled={busy} onClick={withdraw}><Undo2 size={15} /> Withdraw</button>
                        </div>
                    )}
                </div>
            )}
            {canRegister && !registering && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-sm text-emerald-900">{team?.status === 'rejected' ? 'Your team was not approved. Correct it and register again.' : 'Registration is open. Register your college, then add the players.'}</p>
                    <button type="button" className={BTN} onClick={() => setStarting(true)}><Send size={15} /> Register College</button>
                </div>
            )}
            {registering && <TeamForm competition={c} team={team} students={students} onSaved={() => { setEditing(false); setStarting(false); refresh(); }} onCancel={() => { setEditing(false); setStarting(false); }} />}
            {solo && <p className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-900" data-solo-entry>Students sign up for this {c.gameLabel.toLowerCase()} themselves, from Competitions in the student app. Tell your students about it{c.registrationOpen ? ` before ${fmtDateTime(c.registrationDeadline)}` : ''}.</p>}
            {!solo && !c.registrationOpen && !team && <p className="text-sm text-slate-500">Registration is closed.</p>}
            {team?.status === 'approved' && !['quiz', 'hackathon'].includes(c.kind) && (
                <div>
                    <h3 className="mb-2 text-sm font-bold text-slate-800">Our matches</h3>
                    <OurMatches competition={c} detail={detail} team={team} onChanged={load} />
                </div>
            )}
            {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        </div>
    );
};

export default function OrgCompetitions() {
    const goBack = useGoBack();
    const [params, setParams] = useSearchParams();
    // Hosting is the platform admin's to give: null while asking. Asked again
    // every 10 seconds and whenever the window comes back into view, so the
    // Host competitions button opens up when the platform admin switches
    // hosting on, and locks again when they switch it off, without a reload.
    const [canHost, setCanHost] = useState(null);
    const [lockedNote, setLockedNote] = useState(false);
    useEffect(() => {
        let alive = true;
        const check = () => api.get('/competitions/org/hosting')
            .then((r) => { if (alive) setCanHost(Boolean(r.data.canHost)); })
            // The server saying no is a no; being offline keeps what we knew.
            .catch((err) => { if (alive) setCanHost((was) => (err.response ? false : was ?? false)); });
        check();
        const timer = setInterval(check, 10000);
        const onShow = () => { if (document.visibilityState === 'visible') check(); };
        window.addEventListener('focus', onShow);
        document.addEventListener('visibilitychange', onShow);
        return () => {
            alive = false;
            clearInterval(timer);
            window.removeEventListener('focus', onShow);
            document.removeEventListener('visibilitychange', onShow);
        };
    }, []);
    const tab = params.get('tab') === 'host' && canHost !== false ? 'host' : 'enter';
    // Both buttons always show; Host competitions only opens once allowed.
    const hostLocked = canHost === true ? null : "Your organization can't host competitions yet. The platform admin has to enable it.";
    return (
        <div className="space-y-6 pb-24 animate-fade-in">
            <Link to="/organization" onClick={goBack} className="!mb-2 -mt-4 flex w-fit min-h-9 items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-indigo-700 lg:-mt-8"><ArrowLeft size={16} /> Back</Link>
            {/* For the college's coordinator. */}
            <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2d2693] via-[#3b31c4] to-[#5a3fd8] p-6 text-white shadow-lg sm:p-8">
                <Trophy size={140} aria-hidden className="pointer-events-none absolute -right-6 -top-6 text-white/10" />
                <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-white/80"><Building2 size={15} /> College coordinator</p>
                <h1 className="mt-2 text-2xl font-black sm:text-3xl">Competition management</h1>
                <p className="mt-1.5 max-w-2xl text-sm text-white/85">Enter your students in inter-college competitions, follow their approvals and entry fees, and — once allowed — host competitions of your own.</p>
                <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold ring-1 ring-white/15">
                    <span className={`h-2 w-2 rounded-full ${canHost ? 'bg-emerald-400' : 'bg-slate-300'}`} /> {canHost ? 'Hosting is on: you can run your own competitions' : 'Hosting is off: the platform admin can switch it on'}
                </p>
            </header>
            <div className="space-y-2">
                <Segmented options={[['enter', 'Take part'], ['host', 'Host competitions']]} value={tab}
                    onChange={(t) => setParams(t === 'host' ? { tab: 'host' } : {}, { replace: true })}
                    locked={hostLocked ? { host: hostLocked } : {}} onLocked={() => setLockedNote(true)} />
                {hostLocked && lockedNote && canHost === false && (
                    <p role="status" className="text-sm text-slate-500">{hostLocked}</p>
                )}
            </div>
            {tab === 'host'
                ? (canHost ? <Competitions apiBase="/competitions/org/host" linkBase="/organization/competitions/host" organizer="" embedded hosted /> : <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />)
                : <TakePart />}
        </div>
    );
}

const ENTRY = { pending: ['Waiting for approval', 'bg-amber-50 text-amber-700'], approved: ['Approved', 'bg-emerald-50 text-emerald-700'], rejected: ['Rejected', 'bg-rose-50 text-rose-700'] };

/** Where a row stands, for the filter: open for entries, live, completed or closed. */
const standOf = (row) => {
    if (row.kind === 'arena') {
        const a = row.c;
        if (a.registrationOpen) return 'open';
        if (a.state === 'live') return 'live';
        if (['ended', 'results'].includes(a.state)) return 'completed';
        return 'closed';
    }
    const c = row.c;
    if (['registration-open', 'closing-soon', 'registration-soon'].includes(c.phase) && c.status === 'registration') return 'open';
    if (c.status === 'live') return 'live';
    if (c.status === 'completed') return 'completed';
    return 'closed';
};
const entered = (row) => (row.kind === 'arena' ? row.c.entries.length > 0 : !!row.c.myTeam && row.c.myTeam.status !== 'withdrawn');

const ARENA_STATE = { open: ['Entries open', 'bg-emerald-50 text-emerald-700'], live: ['Live', 'bg-rose-50 text-rose-700'], completed: ['Completed', 'bg-indigo-50 text-indigo-700'], closed: ['Entries closed', 'bg-slate-100 text-slate-600'] };

/** A fact on a card: an icon, a value and what it is. */
const Fact = ({ icon: Icon, value, label }) => (
    <div className="flex min-w-0 items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2">
        <Icon size={16} className="shrink-0 text-indigo-500" aria-hidden />
        <div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">{value}</p><p className="truncate text-[11px] text-slate-500">{label}</p></div>
    </div>
);

/**
 * A Quiz Arena, entered the way a Chess team is: the coordinator picks the
 * college's students (up to the contest's limit), the organizer approves
 * them, and only approved students play. Students cannot enter themselves.
 */
const ArenaCard = ({ c, students, open, onOpen, onChanged, inModal = false }) => {
    const [picked, setPicked] = useState(new Set(c.entries.map((e) => e.userId)));
    const [q, setQ] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const save = (players) => {
        setBusy(true); setError('');
        api[players ? 'put' : 'delete'](`/competitions/org/arena/${c.id}/entries`, players ? { players } : undefined)
            .then(() => { onOpen(false); onChanged(); }).catch((err) => setError(errorOf(err))).finally(() => setBusy(false));
    };
    const shown = students.filter((s) => `${s.name} ${s.email} ${s.cardNumber}`.toLowerCase().includes(q.toLowerCase()));
    const [label, cls] = ARENA_STATE[standOf({ kind: 'arena', c })];
    return (
        <>
            {!inModal && <CardHead icon={<span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-600"><Brain size={24} /></span>}
                title={c.title} kicker="Quiz Arena" chips={<span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${cls}`}>{label}</span>} />}
            <div className={`grid gap-2 ${inModal ? 'hidden' : ''}`}>
                <Fact icon={CalendarClock} value={fmtDateTime(c.startsAt)} label="Starts" />
                <Fact icon={Clock} value={fmtDateTime(c.registrationDeadline)} label="Enter by" />
                <Fact icon={Users} value={`Up to ${c.playersPerCollege} · ${c.questions} questions`} label="Students per college" />
            </div>
            {c.entries.length > 0 && !open && (
                <ul className="flex flex-wrap gap-1.5" data-entries>
                    {c.entries.map((e) => { const [t, k] = ENTRY[e.status] || ENTRY.pending; return <li key={e.userId} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${k}`}>{e.name} · {t}</li>; })}
                </ul>
            )}
            {open && !c.registrationOpen ? (
                // Entries closed: our students, their approval, and — once published — how each did.
                <div className="space-y-3 rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4" data-arena-students>
                    <p className="text-sm font-bold text-slate-700">{c.entries.length ? `Your students (${c.entries.length})` : 'Your college did not enter any students.'}</p>
                    {c.entries.length > 0 && (
                        <ul className="divide-y divide-slate-100 rounded-xl bg-white ring-1 ring-slate-200">
                            {[...c.entries].sort((x, y) => (x.rank ?? 1e9) - (y.rank ?? 1e9)).map((e) => {
                                const [t, k] = ENTRY[e.status] || ENTRY.pending;
                                return (
                                    <li key={e.userId} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2.5 text-sm">
                                        <span className="w-10 shrink-0 text-center font-black text-slate-500">{e.rank ? `#${e.rank}` : '—'}</span>
                                        <span className="min-w-[8rem] flex-1 break-words font-semibold text-slate-800">{e.name}</span>
                                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${k}`}>{t}</span>
                                        {c.resultsPublished && e.status === 'approved' && <span className="w-28 text-right font-black text-indigo-700">{e.score} / {c.maxScore}<span className="block text-[11px] font-semibold text-slate-500">{e.correct} of {c.questions} right</span></span>}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                    <p className="text-xs text-slate-500">{c.resultsPublished ? 'Results are published.' : ['ended', 'results'].includes(c.state) ? 'The results appear here once the organizer publishes them.' : c.state === 'live' ? 'The quiz is on now.' : 'Entries are closed; the quiz has not started yet.'}</p>
                    {!inModal && <button type="button" onClick={() => onOpen(false)} className={`${BTN2} w-full justify-center`}>Close</button>}
                </div>
            ) : open ? (
                <div className="space-y-3 rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-bold text-slate-700">{picked.size} of up to {c.playersPerCollege} chosen</p>
                        <label className="relative w-full sm:w-64"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search students" className={`${INPUT} pl-9`} /></label>
                    </div>
                    <div className="grid max-h-72 gap-1.5 overflow-y-auto sm:grid-cols-2">
                        {shown.map((s) => {
                            const on = picked.has(s.id);
                            const full = !on && picked.size >= c.playersPerCollege;
                            return (
                                <button key={s.id} type="button" disabled={full} onClick={() => setPicked((p) => { const n = new Set(p); if (on) n.delete(s.id); else n.add(s.id); return n; })}
                                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm disabled:opacity-40 ${on ? 'border-indigo-400 bg-white ring-1 ring-indigo-300' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${on ? 'bg-indigo-600 text-white' : 'border border-slate-300'}`}>{on && <Check size={13} />}</span>
                                    <span className="min-w-0"><span className="block truncate font-semibold text-slate-800">{s.name}</span><span className="block truncate text-xs text-slate-500">{s.cardNumber || s.email}</span></span>
                                </button>
                            );
                        })}
                    </div>
                    {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}
                    <div className="flex flex-wrap justify-end gap-2">
                        {c.entries.length > 0 && <button type="button" disabled={busy} onClick={() => { if (window.confirm('Withdraw all your students from this Quiz Arena?')) save(null); }} className={BTN2}><Undo2 size={15} /> Withdraw all</button>}
                        <button type="button" onClick={() => onOpen(false)} className={BTN2}>Cancel</button>
                        <button type="button" disabled={busy || picked.size === 0} onClick={() => save([...picked])} className={BTN}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Submit for approval</button>
                    </div>
                </div>
            ) : c.registrationOpen ? (
                <button type="button" onClick={() => { setPicked(new Set(c.entries.map((e) => e.userId))); onOpen(true); }} className={`${BTN} mt-auto w-full justify-center`}><Send size={15} /> {c.entries.length ? 'Change students' : 'Enter students'}</button>
            ) : (
                // Entries closed: see our students, and how they did once the results are out.
                <button type="button" onClick={() => onOpen(true)} className={`${BTN} mt-auto w-full justify-center`} data-view-arena>
                    {c.resultsPublished ? 'View students & results' : 'View students'}
                </button>
            )}
        </>
    );
};

/**
 * The pop-up's dates and everyone taking part (asked 2026-10-28): the
 * registration window, the start, how many play; then every player — name,
 * college, registration number, place and prize — in a list that scrolls
 * when it is long. Another college's numbers show only their last 4 digits.
 */
/** Where a player (or their team) finished: Winner, Runner-up, 2nd runner-up, or Lost — once the results are out. */
const STATUS = { 1: ['Winner', 'bg-amber-100 text-amber-800 ring-amber-200'], 2: ['Runner-up', 'bg-slate-100 text-slate-800 ring-slate-300'], 3: ['2nd runner-up', 'bg-orange-100 text-orange-800 ring-orange-200'] };
const StatusOf = ({ r, published }) => {
    if (!published) return <span className="text-xs font-semibold text-slate-900">Results not out</span>;
    const [label, tone] = STATUS[r.place] || ['Lost', 'bg-rose-50 text-rose-700 ring-rose-200'];
    return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-black ring-1 ${tone}`}>{label}</span>;
};

const Participants = ({ url }) => {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    useEffect(() => { api.get(url).then((r) => setData(r.data)).catch((e) => setError(errorOf(e))); }, [url]);
    if (error) return <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>;
    if (!data) return <div className="space-y-2" aria-label="Loading">{[0, 1, 2].map((i) => <div key={i} className="h-11 animate-pulse rounded-xl bg-slate-100" />)}</div>;
    const d = data.dates;
    // Team competitions: the players gathered under their team, in the order they came (places first).
    const teams = data.rows.some((r) => r.team) ? data.rows.reduce((list, r) => {
        let t = list.find((x) => x.team === r.team && x.college === r.college);
        if (!t) { t = { team: r.team, college: r.college, ours: r.ours, place: r.place, placeLabel: r.placeLabel, prize: r.prize, members: [] }; list.push(t); }
        t.members.push(r);
        return list;
    }, []) : null;
    return (
        <>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" data-details-dates>
                <Fact icon={CalendarClock} value={d.registrationOpensAt ? fmtDateTime(d.registrationOpensAt) : 'When published'} label="Registration opens" />
                <Fact icon={Clock} value={fmtDateTime(d.registrationDeadline)} label="Registration closes" />
                <Fact icon={Trophy} value={fmtDateTime(d.startsAt)} label="Competition starts" />
                <Fact icon={Users} value={`${data.total} player${data.total === 1 ? '' : 's'} · ${data.colleges} college${data.colleges === 1 ? '' : 's'}`} label="Taking part" />
            </div>
            <section className="overflow-hidden rounded-2xl ring-1 ring-slate-200" data-participants>
                <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5">
                    <p className="text-sm font-black text-slate-900">Participants ({data.total}){teams ? ` · ${teams.length} teams` : ''}</p>
                    {!data.resultsPublished && <p className="text-xs font-semibold text-slate-900">Who won shows once the results are published.</p>}
                </div>
                {data.rows.length > 0 && <p className="px-4 pb-1 pt-0 text-[11px] font-semibold text-slate-900 md:hidden">Slide the table sideways to see every column →</p>}
                {data.rows.length === 0 ? <p className="px-4 py-6 text-center text-sm text-slate-900">No approved players yet.</p> : (
                    <div className="lk-scroll max-h-96 overflow-auto" data-participants-scroll>
                        <table className="w-full min-w-[600px] text-left text-sm">
                            <thead className="sticky top-0 z-10 bg-white text-[11px] font-black uppercase tracking-wider text-slate-900 shadow-[0_1px_0_#e2e8f0]">
                                <tr><th className="px-4 py-2.5">Player</th><th className="px-4 py-2.5">College</th><th className="px-4 py-2.5">Reg. no.</th><th className="px-4 py-2.5">Status</th></tr>
                            </thead>
                            {(teams || [{ team: null, members: data.rows }]).map((t, ti) => (
                                <tbody key={`${t.college}-${t.team}-${ti}`} className="border-b border-slate-200 last:border-0" data-team={t.team || undefined}>
                                    {/* A team: its heading across the table, its players under it. */}
                                    {t.team && (
                                        <tr className={t.ours ? 'bg-indigo-50' : 'bg-slate-100'}>
                                            <td colSpan={4} className="px-4 py-2 font-black text-slate-900">
                                                Team {ti + 1} · {t.team}{t.ours && <span className="ml-1.5 rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-black text-indigo-700">yours</span>}
                                            </td>
                                        </tr>
                                    )}
                                    {t.members.map((m, mi) => (
                                        <tr key={`${m.name}-${mi}`} className={!t.team && m.ours ? 'bg-indigo-50/60' : 'bg-white hover:bg-slate-50'}>
                                            <td className="px-4 py-2.5 font-semibold text-slate-900">{m.name}{!t.team && m.ours && <span className="ml-1.5 rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-black text-indigo-700">yours</span>}</td>
                                            <td className="px-4 py-2.5 text-slate-900">{m.college}</td>
                                            <td className="px-4 py-2.5 font-mono text-xs text-slate-900">{m.cardNumber || '—'}</td>
                                            <td className="px-4 py-2.5"><StatusOf r={m} published={data.resultsPublished} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            ))}
                        </table>
                    </div>
                )}
            </section>
        </>
    );
};

/**
 * A competition's details in a pop-up: the name highlighted in a coloured
 * band at the top, an X to close (and Esc, or a click outside), the rest
 * scrolling under it.
 */
const DetailsPopup = ({ icon, kicker, title, chips, onClose, children }) => {
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        const before = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKey);
        return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = before; };
    }, [onClose]);
    return createPortal(
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm sm:p-6" onClick={onClose} role="dialog" aria-modal="true" aria-label={title} data-details-popup>
            <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <header className="relative flex items-start gap-3 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-5 py-4 pr-14 text-white sm:px-6 sm:py-5">
                    {icon}
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/75">{kicker}</p>
                        <h2 className="text-xl font-black leading-tight sm:text-2xl">{title}</h2>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25" data-close><X size={20} /></button>
                </header>
                {/* Grey text reads black in here (asked 2026-10-28); coloured text keeps its colour. */}
                <style>{'[data-details-body] :is(.text-slate-400, .text-slate-500, .text-slate-600, .text-slate-700, .text-slate-800) { color: #0f172a !important; } [data-details-body] > :first-child { order: -2; } [data-details-status] { order: -1; } [data-details-body] > * { flex-shrink: 0; } .lk-scroll { scrollbar-width: thin; scrollbar-color: #a5b4fc #eef2ff; } .lk-scroll::-webkit-scrollbar { height: 8px; width: 8px; } .lk-scroll::-webkit-scrollbar-thumb { background: #a5b4fc; border-radius: 999px; } .lk-scroll::-webkit-scrollbar-track { background: #eef2ff; }'}</style>
                <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5 sm:p-6" data-details-body>
                    {children}
                    {chips && <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 ring-1 ring-slate-200" data-details-status><span>Status</span>{chips}</div>}
                </div>
            </div>
        </div>,
        document.body
    );
};

/** A card's top: its icon, what it is, the title and its badges. */
const CardHead = ({ icon, kicker, title, chips }) => (
    <div className="flex items-start gap-3">
        {icon}
        <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{kicker}</p>
            <p className="line-clamp-2 min-h-[2.6rem] font-black leading-snug text-slate-900" title={title}>{title}</p>
            <div className="mt-1.5 flex min-h-6 flex-wrap gap-1.5">{chips}</div>
        </div>
    </div>
);

// The boxes at the top: each a count, and a click shows just those (asked 2026-10-28: one row, not two).
const FILTERS = [['all', 'All', Trophy, 'text-slate-700 bg-slate-100'], ['open', 'Registration open', Send, 'text-emerald-600 bg-emerald-50'], ['entered', 'Registered', Check, 'text-indigo-600 bg-indigo-50'], ['live', 'Live', Swords, 'text-rose-600 bg-rose-50'], ['completed', 'Completed', Crown, 'text-amber-600 bg-amber-50'], ['closed', 'Closed', Lock, 'text-slate-600 bg-slate-100']];

/** Competitions open to the college, and the ones it entered — games and Quiz Arena together. */
function TakePart() {
    // The last lists seen: going back shows them at once while they refresh.
    const [rows, setRows] = useState(() => takePartSeen.rows ?? null);
    const [arenas, setArenas] = useState(() => takePartSeen.arenas ?? null);
    const [students, setStudents] = useState([]);
    const [error, setError] = useState('');
    // The pop-up is a step in the address: Back (or X) closes it, back to the list.
    const [open, openStep, closeStep] = useStepParam('view');
    const setOpen = (id) => (id ? openStep(id) : closeStep());
    const [filter, setFilter] = useState('all');

    const load = useCallback(() => {
        api.get('/competitions/org').then((r) => { setRows(r.data.competitions); takePartSeen.rows = r.data.competitions; setError(''); }).catch((err) => setError(errorOf(err)));
        api.get('/competitions/org/arena').then((r) => { setArenas(r.data.competitions || []); takePartSeen.arenas = r.data.competitions || []; }).catch(() => setArenas((a) => a ?? []));
    }, []);
    useEffect(() => {
        load();
        api.get('/competitions/org/students').then((r) => setStudents(r.data.students)).catch(() => {});
    }, [load]);

    const ready = rows !== null && arenas !== null;
    const all = useMemo(() => [...(arenas || []).map((c) => ({ kind: 'arena', id: `a-${c.id}`, c })), ...(rows || []).map((c) => ({ kind: 'game', id: c.id, c }))], [rows, arenas]);
    const counts = Object.fromEntries(FILTERS.map(([k]) => [k, k === 'all' ? all.length : all.filter((r) => (k === 'entered' ? entered(r) : standOf(r) === k)).length]));
    const shown = all.filter((r) => filter === 'all' || (filter === 'entered' ? entered(r) : standOf(r) === filter))
        // Open ones first, then live, then the rest.
        .sort((x, y) => ['open', 'live', 'completed', 'closed'].indexOf(standOf(x)) - ['open', 'live', 'completed', 'closed'].indexOf(standOf(y)));
    const openRow = all.find((r) => r.id === open) || null;

    return (
        <div className="space-y-5">
            {/* At a glance, and the filter: click a box to see just those. */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6" role="tablist" aria-label="Show" data-filter-boxes>
                {FILTERS.map(([k, label, Icon, tone]) => (
                    <button key={k} type="button" role="tab" aria-selected={filter === k} onClick={() => setFilter(k)} data-filter={k}
                        className={`${CARD} flex items-center gap-3 p-4 text-left transition-colors duration-200 hover:border-indigo-200 hover:bg-indigo-50/60 ${filter === k ? 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-300' : ''}`}>
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon size={19} /></span>
                        <span className="min-w-0"><span className="block text-2xl font-black text-slate-900">{ready ? counts[k] : '–'}</span><span className={`block truncate text-xs font-bold ${filter === k ? 'text-indigo-700' : 'text-slate-500'}`}>{label}</span></span>
                    </button>
                ))}
            </div>
            {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
            {!ready && !error && <CardGridSkeleton />}
            {ready && shown.length === 0 && (
                <div className={`${CARD} p-10 text-center`}>
                    <Trophy size={30} className="mx-auto text-slate-300" />
                    <p className="mt-2 font-bold text-slate-800">{filter === 'all' ? 'No competitions right now' : 'Nothing here'}</p>
                    <p className="text-sm text-slate-500">When the platform opens a competition, you can enter your college here.</p>
                </div>
            )}
            {/* Three to a row, every card the same height, its button at the bottom; an open one takes the whole row. */}
            {/* The open one, in a pop-up: its name highlighted at the top, X to close. */}
            {openRow && (
                <DetailsPopup onClose={() => setOpen(null)}
                    icon={openRow.kind === 'arena' ? <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15"><Brain size={24} /></span> : <GameIcon game={openRow.c.game} size={24} className="h-12 w-12 rounded-2xl bg-white" />}
                    kicker={openRow.kind === 'arena' ? 'Quiz Arena' : `${openRow.c.gameLabel} · by ${openRow.c.organizedBy}`}
                    title={openRow.kind === 'arena' ? openRow.c.title : openRow.c.name}
                    chips={openRow.kind === 'arena'
                        ? <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${ARENA_STATE[standOf(openRow)][1]}`}>{ARENA_STATE[standOf(openRow)][0]}</span>
                        : <><Chip status={competitionBadge(openRow.c)} />{openRow.c.myTeam && openRow.c.myTeam.status !== 'withdrawn' && <Chip status={openRow.c.myTeam.status} />}</>}>
                    {openRow.kind === 'arena' ? (
                        <>
                            <Participants url={`/competitions/org/arena/${openRow.c.id}/participants`} />
                            <ArenaCard c={openRow.c} students={students} open inModal onOpen={(v) => setOpen(v ? openRow.id : null)} onChanged={load} />
                        </>
                    ) : (
                        <>
                            <Participants url={`/competitions/org/${openRow.c.id}/participants`} />
                            <CompetitionPanel summary={openRow.c} students={students} onChanged={load} />
                        </>
                    )}
                </DetailsPopup>
            )}
            <div className={`grid gap-5 sm:grid-cols-2 xl:grid-cols-3 ${ready ? '' : 'hidden'}`}>
                {shown.map((row) => {
                    const c = row.c;
                    return (
                        <section key={row.id} className={`${CARD} flex h-full flex-col gap-4 p-6 transition-colors duration-200 hover:border-indigo-200 hover:bg-indigo-50/60 hover:shadow-md`}>
                            {row.kind === 'arena' ? (
                                <ArenaCard c={c} students={students} open={false} onOpen={(v) => setOpen(v ? row.id : null)} onChanged={load} />
                            ) : (
                                <>
                                    <CardHead icon={<GameIcon game={c.game} size={24} className="h-12 w-12 rounded-2xl" />} kicker={`${c.gameLabel} · by ${c.organizedBy}`} title={c.name}
                                        chips={<><Chip status={competitionBadge(c)} />{c.myTeam && c.myTeam.status !== 'withdrawn' && <Chip status={c.myTeam.status} />}</>} />
                                    <div className="grid gap-2">
                                        <Fact icon={CalendarClock} value={fmtDateTime(c.startsAt)} label="Starts" />
                                        <Fact icon={Clock} value={fmtDateTime(c.registrationDeadline)} label="Register by" />
                                        <Fact icon={Users} value={`${c.teamsCount}/${c.maxTeams} · up to ${c.playersPerTeam}`} label="Teams · players each" />
                                    </div>
                                    {c.myTeam && c.myTeam.status !== 'withdrawn' && (
                                        <p className="flex items-center gap-2 rounded-xl bg-indigo-50/60 px-3 py-2 text-sm text-slate-700"><Users size={14} className="text-indigo-500" /> <b className="font-bold">{c.myTeam.teamName}</b></p>
                                    )}
                                    <button type="button" onClick={() => setOpen(row.id)} className={`${BTN} mt-auto w-full justify-center`}>
                                        {c.registrationOpen && (!c.myTeam || ['withdrawn', 'rejected'].includes(c.myTeam.status)) ? <><Send size={15} /> Register college</> : 'View team & matches'}
                                    </button>
                                </>
                            )}
                        </section>
                    );
                })}
            </div>
        </div>
    );
}
