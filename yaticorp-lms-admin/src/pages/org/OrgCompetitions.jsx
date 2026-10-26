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
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import useGoBack from '../../hooks/useGoBack';
import { Trophy, Users, CalendarClock, Check, Loader2, Send, Undo2, Swords, Search, Crown, Gift, ScrollText, ChevronDown, Gamepad2, Clock, Brain, ArrowLeft, Building2 } from 'lucide-react';
import api from '../../utils/api';
import { Segmented, CARD, BTN, BTN2, INPUT, LABEL } from '../../components/orgUi';
import Competitions from '../Competitions';
import { Chip, GameIcon } from '../../competitions/shared';
import { ORDINAL, fmtDateTime, errorOf, competitionBadge } from '../../competitions/constants';

/** The team form: name, coordinator contact, and the players. */
const TeamForm = ({ competition: c, team, students, onSaved, onCancel }) => {
    const [teamName, setTeamName] = useState(team?.teamName || '');
    const [coordinatorName, setCoordinatorName] = useState(team?.coordinator?.name || '');
    const [coordinatorPhone, setCoordinatorPhone] = useState('');
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
        setBusy(true); setError('');
        api.put(`/competitions/org/${c.id}/team`, { teamName, coordinatorName, coordinatorPhone, players: [...picked] })
            .then(() => onSaved()).catch((err) => setError(errorOf(err))).finally(() => setBusy(false));
    };
    return (
        <form onSubmit={save} className="mt-4 space-y-4 rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4">
            <div className="grid gap-3 sm:grid-cols-3">
                <label><span className={LABEL}>Team name</span><input required maxLength={80} value={teamName} onChange={(e) => setTeamName(e.target.value)} className={INPUT} placeholder="e.g. St Agnes Knights" /></label>
                <label><span className={LABEL}>College coordinator</span><input maxLength={80} value={coordinatorName} onChange={(e) => setCoordinatorName(e.target.value)} className={INPUT} placeholder="Your name" /></label>
                <label><span className={LABEL}>Coordinator phone</span><input maxLength={20} value={coordinatorPhone} onChange={(e) => setCoordinatorPhone(e.target.value)} className={INPUT} placeholder="Optional" /></label>
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
    const canRegister = c.registrationOpen && (!team || team.status === 'withdrawn' || team.status === 'rejected');
    const registering = c.registrationOpen && (editing || (canRegister && starting));
    return (
        <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
            <div className="grid gap-3 text-sm sm:grid-cols-2">
                <p className="flex items-start gap-2 text-slate-600"><ScrollText size={15} className="mt-0.5 shrink-0 text-slate-400" /> <span className="whitespace-pre-line">{c.rules || 'Standard rules of the game.'}</span></p>
                <p className="flex items-start gap-2 text-slate-600"><Gift size={15} className="mt-0.5 shrink-0 text-slate-400" />
                    <span>{c.prizes.map((p) => `${ORDINAL[p.place]}: ${p.title || ''} ${p.xp ? `${p.xp} XP` : ''}${p.rewardPoints ? ` + ${p.rewardPoints} pts` : ''}`).join(' · ') || 'No prizes announced.'}{c.certificates ? ' · Certificates for every player.' : ''}</span></p>
            </div>
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
            {!c.registrationOpen && !team && <p className="text-sm text-slate-500">Registration is closed.</p>}
            {team?.status === 'approved' && (
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
const ArenaCard = ({ c, students, open, onOpen, onChanged }) => {
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
            <CardHead icon={<span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-600"><Brain size={24} /></span>}
                title={c.title} kicker="Quiz Arena" chips={<span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${cls}`}>{label}</span>} />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Fact icon={CalendarClock} value={fmtDateTime(c.startsAt)} label="Starts" />
                <Fact icon={Clock} value={fmtDateTime(c.registrationDeadline)} label="Enter by" />
                <Fact icon={Users} value={`Up to ${c.playersPerCollege} · ${c.questions} questions`} label="Students per college" />
            </div>
            {c.entries.length > 0 && !open && (
                <ul className="flex flex-wrap gap-1.5">
                    {c.entries.map((e) => { const [t, k] = ENTRY[e.status] || ENTRY.pending; return <li key={e.userId} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${k}`}>{e.name} · {t}</li>; })}
                </ul>
            )}
            {open ? (
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
            ) : c.registrationOpen && (
                <button type="button" onClick={() => { setPicked(new Set(c.entries.map((e) => e.userId))); onOpen(true); }} className={`${BTN} w-full justify-center`}><Send size={15} /> {c.entries.length ? 'Change students' : 'Enter students'}</button>
            )}
        </>
    );
};

/** A card's top: its icon, what it is, the title and its badges. */
const CardHead = ({ icon, kicker, title, chips }) => (
    <div className="flex items-start gap-3">
        {icon}
        <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{kicker}</p>
            <p className="font-black leading-snug text-slate-900">{title}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">{chips}</div>
        </div>
    </div>
);

const FILTERS = [['all', 'All'], ['open', 'Open for entries'], ['entered', 'Entered'], ['live', 'Live'], ['completed', 'Completed'], ['closed', 'Closed']];

/** Competitions open to the college, and the ones it entered — games and Quiz Arena together. */
function TakePart() {
    const [rows, setRows] = useState(null);
    const [arenas, setArenas] = useState([]);
    const [students, setStudents] = useState([]);
    const [error, setError] = useState('');
    const [open, setOpen] = useState(null);
    const [filter, setFilter] = useState('all');

    const load = useCallback(() => {
        api.get('/competitions/org').then((r) => { setRows(r.data.competitions); setError(''); }).catch((err) => setError(errorOf(err)));
        api.get('/competitions/org/arena').then((r) => setArenas(r.data.competitions || [])).catch(() => {});
    }, []);
    useEffect(() => {
        load();
        api.get('/competitions/org/students').then((r) => setStudents(r.data.students)).catch(() => {});
    }, [load]);

    const all = useMemo(() => [...arenas.map((c) => ({ kind: 'arena', id: `a-${c.id}`, c })), ...(rows || []).map((c) => ({ kind: 'game', id: c.id, c }))], [rows, arenas]);
    const counts = Object.fromEntries(FILTERS.map(([k]) => [k, k === 'all' ? 0 : all.filter((r) => (k === 'entered' ? entered(r) : standOf(r) === k)).length]));
    const shown = all.filter((r) => filter === 'all' || (filter === 'entered' ? entered(r) : standOf(r) === filter))
        // Open ones first, then live, then the rest.
        .sort((x, y) => ['open', 'live', 'completed', 'closed'].indexOf(standOf(x)) - ['open', 'live', 'completed', 'closed'].indexOf(standOf(y)));

    return (
        <div className="space-y-5">
            {/* At a glance. */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[['open', 'Open for entries', Send, 'text-emerald-600 bg-emerald-50'], ['entered', 'Entered', Check, 'text-indigo-600 bg-indigo-50'], ['live', 'Live now', Swords, 'text-rose-600 bg-rose-50'], ['completed', 'Completed', Crown, 'text-amber-600 bg-amber-50']].map(([k, label, Icon, tone]) => (
                    <button key={k} type="button" onClick={() => setFilter(k)} className={`${CARD} flex items-center gap-3 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${filter === k ? 'ring-2 ring-indigo-300' : ''}`}>
                        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon size={19} /></span>
                        <span><span className="block text-2xl font-black text-slate-900">{counts[k]}</span><span className="block text-xs font-semibold text-slate-500">{label}</span></span>
                    </button>
                ))}
            </div>
            <Segmented options={FILTERS} value={filter} onChange={setFilter} counts={counts} />
            {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
            {!rows && !error && <div className="grid gap-4 lg:grid-cols-2">{[0, 1].map((i) => <div key={i} className="h-56 animate-pulse rounded-2xl bg-slate-100" />)}</div>}
            {rows && shown.length === 0 && (
                <div className={`${CARD} p-10 text-center`}>
                    <Trophy size={30} className="mx-auto text-slate-300" />
                    <p className="mt-2 font-bold text-slate-800">{filter === 'all' ? 'No competitions right now' : 'Nothing here'}</p>
                    <p className="text-sm text-slate-500">When the platform opens a competition, you can enter your college here.</p>
                </div>
            )}
            <div className="grid gap-4 lg:grid-cols-2">
                {shown.map((row) => {
                    const isOpen = open === row.id;
                    const c = row.c;
                    return (
                        <section key={row.id} className={`${CARD} flex flex-col gap-4 p-5 transition-shadow hover:shadow-md ${isOpen ? 'lg:col-span-2' : ''}`}>
                            {row.kind === 'arena' ? (
                                <ArenaCard c={c} students={students} open={isOpen} onOpen={(v) => setOpen(v ? row.id : null)} onChanged={load} />
                            ) : (
                                <>
                                    <CardHead icon={<GameIcon game={c.game} size={24} className="h-12 w-12 rounded-2xl" />} kicker={`${c.gameLabel} · by ${c.organizedBy}`} title={c.name}
                                        chips={<><Chip status={competitionBadge(c)} />{c.myTeam && c.myTeam.status !== 'withdrawn' && <Chip status={c.myTeam.status} />}</>} />
                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                        <Fact icon={CalendarClock} value={fmtDateTime(c.startsAt)} label="Starts" />
                                        <Fact icon={Clock} value={fmtDateTime(c.registrationDeadline)} label="Register by" />
                                        <Fact icon={Users} value={`${c.teamsCount}/${c.maxTeams} · up to ${c.playersPerTeam}`} label="Teams · players each" />
                                    </div>
                                    {c.myTeam && c.myTeam.status !== 'withdrawn' && !isOpen && (
                                        <p className="flex items-center gap-2 rounded-xl bg-indigo-50/60 px-3 py-2 text-sm text-slate-700"><Users size={14} className="text-indigo-500" /> <b className="font-bold">{c.myTeam.teamName}</b></p>
                                    )}
                                    <button type="button" onClick={() => setOpen(isOpen ? null : row.id)} aria-expanded={isOpen}
                                        className={`${isOpen ? BTN2 : BTN} mt-auto w-full justify-center`}>
                                        {isOpen ? 'Close' : c.registrationOpen && (!c.myTeam || ['withdrawn', 'rejected'].includes(c.myTeam.status)) ? <><Send size={15} /> Register college</> : 'View team & matches'}
                                        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isOpen && <CompetitionPanel summary={c} students={students} onChanged={load} />}
                                </>
                            )}
                        </section>
                    );
                })}
            </div>
        </div>
    );
}
