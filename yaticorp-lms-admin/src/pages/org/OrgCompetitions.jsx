/**
 * An organization in Games & Competitions, in two tabs:
 *
 *   Take part   as a college's coordinator: register the college's team for
 *               an inter-college competition, pick the players from the
 *               college's own students, see whether it was approved, and
 *               choose who plays each match
 *   Host        run your own inter-college competitions: create, approve the
 *               colleges that register, draw and decide the matches (the
 *               platform admin's own screens, limited to yours) — only when
 *               the platform admin has let this organization host; otherwise
 *               there is no such tab
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Trophy, Users, CalendarClock, Check, Loader2, Send, Undo2, Swords, Search, Crown, Gift, ScrollText, ChevronDown } from 'lucide-react';
import api from '../../utils/api';
import { PageHeader, Segmented, CARD, BTN, BTN2, INPUT, LABEL } from '../../components/orgUi';
import Competitions from '../Competitions';
import { Chip } from '../../competitions/shared';
import { ORDINAL, fmtDateTime, errorOf } from '../../competitions/constants';

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
                            <p className="text-sm font-bold text-slate-800">{m.roundName} · {fmtDateTime(m.scheduledAt)}</p>
                            <Chip status={m.status} />
                        </div>
                        <p className="mt-1 text-sm text-slate-600"><Swords size={14} className="mr-1 inline text-slate-400" />{m.sides.map((s) => s.teamName).join(' vs ')}</p>
                        {m.winnerTeamId && <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-emerald-700"><Crown size={14} /> {m.sides.find((s) => s.teamId === m.winnerTeamId)?.teamName} won{m.resultNote ? ` — ${m.resultNote}` : ''}</p>}
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
            <PageHeader icon={Trophy} title="Games & Competitions" subtitle="Inter-college Chess, Ludo, Carrom and UNO. Enter your college's team, or host a competition of your own." />
            <div className="space-y-2">
                <Segmented options={[['enter', 'Take part'], ['host', 'Host competitions']]} value={tab}
                    onChange={(t) => setParams(t === 'host' ? { tab: 'host' } : {}, { replace: true })}
                    locked={hostLocked ? { host: hostLocked } : {}} onLocked={() => setLockedNote(true)} />
                {hostLocked && lockedNote && canHost === false && (
                    <p role="status" className="text-sm text-slate-500">{hostLocked}</p>
                )}
            </div>
            {tab === 'host'
                ? (canHost ? <Competitions apiBase="/competitions/org/host" linkBase="/organization/competitions/host" organizer="" embedded /> : <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />)
                : <TakePart />}
        </div>
    );
}

/** Competitions open to the college, and the ones it entered. */
function TakePart() {
    const [rows, setRows] = useState(null);
    const [students, setStudents] = useState([]);
    const [error, setError] = useState('');
    const [open, setOpen] = useState(null);

    const load = useCallback(() => api.get('/competitions/org')
        .then((r) => { setRows(r.data.competitions); setError(''); })
        .catch((err) => setError(errorOf(err))), []);
    useEffect(() => {
        load();
        api.get('/competitions/org/students').then((r) => setStudents(r.data.students)).catch(() => {});
    }, [load]);

    return (
        <div className="space-y-6">
            {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
            {!rows && !error && <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />}
            {rows && rows.length === 0 && (
                <div className={`${CARD} p-10 text-center`}>
                    <Trophy size={30} className="mx-auto text-slate-300" />
                    <p className="mt-2 font-bold text-slate-800">No competitions open right now</p>
                    <p className="text-sm text-slate-500">When the platform opens one, you can register your team here.</p>
                </div>
            )}
            <div className="space-y-4">
                {(rows || []).map((c) => (
                    <section key={c.id} className={`${CARD} p-5`}>
                        <button type="button" onClick={() => setOpen(open === c.id ? null : c.id)} aria-expanded={open === c.id} className="flex w-full flex-wrap items-start gap-3 text-left">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-2xl">{c.emoji}</span>
                            <span className="min-w-0 flex-1">
                                <span className="block font-bold text-slate-900">{c.name}</span>
                                <span className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                                    <span>{c.gameLabel} · by {c.organizedBy}</span>
                                    <span className="inline-flex items-center gap-1"><CalendarClock size={12} /> {fmtDateTime(c.startsAt)}</span>
                                    <span>Register by {fmtDateTime(c.registrationDeadline)}</span>
                                    <span>{c.teamsCount}/{c.maxTeams} teams · up to {c.playersPerTeam} players</span>
                                </span>
                            </span>
                            <span className="flex flex-wrap items-center gap-1.5">
                                <Chip status={c.status} />
                                {c.myTeam && c.myTeam.status !== 'withdrawn' && <Chip status={c.myTeam.status} />}
                                <ChevronDown size={18} className={`text-slate-400 transition-transform ${open === c.id ? 'rotate-180' : ''}`} />
                            </span>
                        </button>
                        {open === c.id && <CompetitionPanel summary={c} students={students} onChanged={load} />}
                    </section>
                ))}
            </div>
        </div>
    );
}
