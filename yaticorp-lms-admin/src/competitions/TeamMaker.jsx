/**
 * A team for a college's own competition: a name and the players, picked from
 * the college's students. A student already in another team shows which one,
 * and cannot be picked twice. Players play in the order picked: when a match
 * needs fewer than the whole team, the first ones play.
 *
 * `path` is the competition's address in the API (…/competitions/org/host/:id
 * or the platform admin's …/competitions/admin/:id); `onSaved` gets the reply,
 * the competition in full. `hostName`: the college, when the platform admin
 * makes the team for it.
 */
import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Save, Search } from 'lucide-react';
import api from '../utils/api';
import { BTN, BTN2, INPUT, LABEL } from '../components/orgUi';
import { errorOf } from './constants';

export const TeamMaker = ({ competition: c, path, team = null, teams, hostName = null, onSaved, onCancel }) => {
    const [students, setStudents] = useState(null);
    const [teamName, setTeamName] = useState(team?.teamName || '');
    const [picked, setPicked] = useState(() => (team?.players || []).map((p) => p.userId));
    const [q, setQ] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => {
        let alive = true;
        api.get(`${path}/students`).then((r) => { if (alive) setStudents(r.data.students); }).catch((err) => { if (alive) setError(errorOf(err)); });
        return () => { alive = false; };
    }, [path]);
    // Who is in another team already: student id → that team's name.
    const taken = useMemo(() => new Map(teams.filter((t) => t.id !== team?.id && t.status !== 'withdrawn')
        .flatMap((t) => t.players.map((p) => [p.userId, t.teamName]))), [teams, team]);
    const shown = (students || []).filter((s) => `${s.name} ${s.email} ${s.cardNumber}`.toLowerCase().includes(q.toLowerCase()));
    const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < c.playersPerTeam ? [...p, id] : p));
    const save = (e) => {
        e.preventDefault();
        setBusy(true); setError('');
        const body = { teamName, players: picked };
        (team ? api.patch(`${path}/teams/${team.id}`, body) : api.post(`${path}/teams`, body))
            .then((r) => onSaved(r.data)).catch((err) => setError(errorOf(err))).finally(() => setBusy(false));
    };
    return (
        <form onSubmit={save} data-team-maker className="space-y-4 rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4">
            <label className="block sm:w-1/2"><span className={LABEL}>Team name</span>
                <input required maxLength={80} value={teamName} onChange={(e) => setTeamName(e.target.value)} className={INPUT} placeholder="e.g. Final Year Knights" /></label>
            <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-800">Players <span className="font-semibold text-slate-500">({picked.length} of up to {c.playersPerTeam}{c.playersPerSide > 1 ? `, at least ${c.playersPerSide}` : ''})</span></p>
                    <label className="relative w-full sm:w-64"><span className="sr-only">Search students</span>
                        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={hostName ? `Search ${hostName}'s students` : 'Search your students'} className={`${INPUT} pl-9`} /></label>
                </div>
                {c.playersPerTeam > c.playersPerSide && (
                    <p className="mb-2 text-xs text-slate-500">The first {c.playersPerSide === 1 ? 'player' : `${c.playersPerSide} players`} you pick play{c.playersPerSide === 1 ? 's' : ''} each match.</p>
                )}
                {!students ? (error ? null : <div className="h-24 animate-pulse rounded-xl bg-slate-100" />)
                    : students.length === 0 ? <p className="text-sm text-slate-500">{hostName ? `${hostName} has` : 'Your college has'} no students on the LMS yet.</p> : (
                        <ul className="grid max-h-72 gap-1.5 overflow-y-auto sm:grid-cols-2">
                            {shown.map((s) => {
                                const at = picked.indexOf(s.id);
                                const elsewhere = taken.get(s.id);
                                const off = at < 0 && (!!elsewhere || picked.length >= c.playersPerTeam);
                                return (
                                    <li key={s.id}>
                                        <button type="button" onClick={() => toggle(s.id)} disabled={off} aria-pressed={at >= 0}
                                            className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-sm transition-colors ${at >= 0 ? 'border-indigo-300 bg-white ring-2 ring-indigo-200' : 'border-slate-200 bg-white hover:border-indigo-200'} disabled:opacity-40`}>
                                            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[11px] font-bold ${at >= 0 ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'}`}>{at >= 0 && (c.playersPerTeam > 1 ? at + 1 : <Check size={13} />)}</span>
                                            <span className="min-w-0 flex-1"><span className="block truncate font-semibold text-slate-800">{s.name}</span>
                                                <span className="block truncate text-xs text-slate-500">{elsewhere ? `In ${elsewhere}` : s.email}</span></span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
            </div>
            {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
            <div className="flex flex-wrap justify-end gap-2">
                <button type="button" className={BTN2} onClick={onCancel}>Cancel</button>
                <button type="submit" className={BTN} disabled={busy || picked.length < c.playersPerSide || !teamName.trim()}>
                    {busy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} {team ? 'Save team' : 'Add team'}
                </button>
            </div>
        </form>
    );
};
