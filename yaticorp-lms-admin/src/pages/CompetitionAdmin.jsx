/**
 * Running one competition, for the platform admin:
 *
 *   Registrations   each college's team, coordinator and players — approve or reject
 *                   (Teams, in a college's own competition: only its students
 *                   see it, and the college makes the teams from them here)
 *   Matches         draw round 1, schedule each match, start it, decide it
 *                   (a forfeit, a dispute, a game nobody joined)
 *   Results         the winners, and the prizes and certificates they got
 *
 * A quiz or a hackathon (asked 2026-10-23) has no matches: in their place, the
 * quiz's standings and questions, or the projects to mark (ChallengePanel).
 * One entered by students on their own lists them as its entries.
 *
 * The page refreshes itself every 15 seconds while the competition is live, so
 * matches finishing in the student app show up here.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft, Trophy, Users, Swords, Medal, Pencil, Rocket, Lock, Ban, Trash2, Check, X, Play, Gavel, Loader2,
    CalendarClock, Phone, Mail, Crown, AlertTriangle, Shuffle, Gift, RefreshCw, Plus
} from 'lucide-react';
import api from '../utils/api';
import { CARD, BTN, BTN2, INPUT, LABEL, Segmented } from '../components/orgUi';
import { CompetitionForm, Chip, GameIcon } from '../competitions/shared';
import { TeamMaker } from '../competitions/TeamMaker';
import { QuizPanel, HackathonPanel } from '../competitions/ChallengePanel';
import { ORDINAL, fmtDateTime, toLocalInput, errorOf, bannerUploader, competitionBadge, deleteQuestion } from '../competitions/constants';

const STUDENT_PORTAL = import.meta.env.VITE_STUDENT_URL || 'http://localhost:5174';

/** One match: its teams, time, and what the admin may do with it. */
const AdminMatch = ({ match, onCall }) => {
    const [at, setAt] = useState(toLocalInput(match.scheduledAt));
    const [deciding, setDeciding] = useState(false);
    const [winner, setWinner] = useState(match.sides[0]?.teamId || '');
    const [note, setNote] = useState('');
    const open = match.status === 'scheduled' || match.status === 'live';
    return (
        <article className={`rounded-2xl border p-4 ${match.needsDecision ? 'border-orange-300 bg-orange-50/40' : 'border-slate-200 bg-white'}`}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-slate-800">{match.roundName}{match.kind === 'main' ? ` · match ${match.slot + 1}` : ''}</p>
                <Chip status={match.status} />
            </div>
            <ul className="space-y-1.5">
                {match.sides.map((s) => (
                    <li key={s.teamId} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${match.winnerTeamId === s.teamId ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'bg-slate-50'}`}>
                        <span className="min-w-0 flex-1"><span className="block truncate font-bold text-slate-900">{s.teamName}</span>
                            <span className="block truncate text-xs text-slate-500">{s.collegeName}{s.lineup.length ? ` · ${s.lineup.map((p) => p.name).join(', ')}` : ''}</span></span>
                        {match.winnerTeamId === s.teamId && <Crown size={15} className="text-amber-500" />}
                    </li>
                ))}
            </ul>
            {/* The open game's code, to give its players: they type it in Games → Join with a code. */}
            {match.gameCode && <p className="mt-2 text-xs text-slate-600" data-match-code={match.gameCode}>Match code <span className="rounded-md bg-slate-900 px-1.5 py-0.5 font-mono text-[11px] font-black tracking-[0.2em] text-white">{match.gameCode}</span></p>}
            {match.resultNote && <p className="mt-2 text-xs text-slate-600">{match.resultNote}{match.decidedBy ? ` (${match.decidedBy})` : ''}</p>}
            {match.needsDecision && <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-orange-800"><AlertTriangle size={13} /> Needs your decision.</p>}

            {match.status === 'scheduled' && (
                <div className="mt-3 flex flex-wrap items-end gap-2">
                    <label className="min-w-0 flex-1 basis-44"><span className={LABEL}>Match time</span>
                        <input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} className={INPUT} /></label>
                    <button type="button" className={BTN2} onClick={() => onCall('put', `/matches/${match.id}`, { scheduledAt: at ? new Date(at).toISOString() : null })}><CalendarClock size={15} /> Save time</button>
                    <button type="button" className={BTN} onClick={() => onCall('post', `/matches/${match.id}/start`)}><Play size={15} /> Start now</button>
                </div>
            )}
            {match.status === 'bye' && <p className="mt-2 text-xs text-slate-500">No opponent this round: goes straight through.</p>}
            {!['scheduled', 'bye'].includes(match.status) && <p className="mt-2 text-xs text-slate-500">{match.scheduledAt ? `Scheduled ${fmtDateTime(match.scheduledAt)}` : ''}{match.games > 1 ? ` · ${match.games} games` : ''}</p>}
            {/* Not while it waits for the organizer: its game is over (nobody joined, or
                three draws), and the link only led to "did not go ahead". */}
            {match.gameId && match.status === 'live' && !match.needsDecision && (
                <a href={`${STUDENT_PORTAL}/competitions/play/${match.gameId}`} target="_blank" rel="noreferrer" className="-mb-2.5 mt-0.5 inline-flex min-h-10 items-center text-xs font-bold text-indigo-700 hover:underline">Watch the game in the student portal</a>
            )}

            {open && (deciding ? (
                <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <label className="block"><span className={LABEL}>Winner</span>
                        <select value={winner} onChange={(e) => setWinner(e.target.value)} className={INPUT}>
                            {match.sides.map((s) => <option key={s.teamId} value={s.teamId}>{s.teamName} ({s.collegeName})</option>)}
                        </select></label>
                    <label className="block"><span className={LABEL}>Reason (shown to students)</span>
                        <input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} className={INPUT} placeholder="e.g. Opponent did not turn up" /></label>
                    <div className="flex justify-end gap-2">
                        <button type="button" className={BTN2} onClick={() => setDeciding(false)}>Cancel</button>
                        <button type="button" className={BTN} onClick={() => onCall('post', `/matches/${match.id}/result`, { winnerTeamId: winner, note }).then(() => setDeciding(false))}><Gavel size={15} /> Decide match</button>
                    </div>
                </div>
            ) : (
                <button type="button" onClick={() => setDeciding(true)} className="-mb-2.5 mt-1 inline-flex min-h-10 items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-700"><Gavel size={14} /> Decide this match myself</button>
            ))}
        </article>
    );
};

/**
 * `apiBase` is the platform's /competitions/admin, or an organization's own
 * /competitions/org/host; `backTo` is where "All competitions" goes.
 */
export default function CompetitionAdmin({ apiBase = '/competitions/admin', backTo = '/competitions' }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [tab, setTab] = useState('teams');
    // ?edit=1, from a card's Edit: open with the form ready.
    const [params, setParams] = useSearchParams();
    const [editing, setEditingState] = useState(() => params.get('edit') === '1');
    const setEditing = (on) => {
        setEditingState(on);
        if (!on && params.has('edit')) setParams({}, { replace: true });
    };
    const [busy, setBusy] = useState('');
    const [draw, setDraw] = useState({ firstMatchAt: '', gapMinutes: 0 });
    const [notes, setNotes] = useState({});
    // A college's own competition: the team being made ('new') or changed (its id).
    const [teamForm, setTeamForm] = useState(null);

    const load = useCallback(() => api.get(`${apiBase}/${id}`)
        .then((r) => { setData(r.data); setError(''); })
        .catch((err) => setError(errorOf(err))), [apiBase, id]);
    useEffect(() => { load(); }, [load]);
    const live = data?.competition.status === 'live';
    useEffect(() => {
        if (!live) return undefined;
        const t = setInterval(load, 15000);
        return () => clearInterval(t);
    }, [live, load]);

    /** One admin action against this competition; the reply is the new state. */
    const call = (method, path, body) => {
        setBusy(path); setNotice('');
        return api[method](`${apiBase}/${id}${path}`, body)
            .then((r) => { if (r.data?.competition) setData(r.data); return r; })
            .catch((err) => { setNotice(errorOf(err)); throw err; })
            .finally(() => setBusy(''));
    };
    const quiet = (p) => p.catch(() => {});

    if (!data) return error ? <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error} <Link to={backTo} className="font-bold underline">Back</Link></p> : <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />;
    const { competition: c, teams, rounds, challenge } = data;
    // A quiz or a hackathon: no matches; entered by college teams or students on their own.
    const kind = ['quiz', 'hackathon'].includes(c.game) ? c.game : null;
    const solo = c.entry === 'individual';
    const markProject = (subId, body) => api.put(`${apiBase}/${id}/submissions/${subId}`, body).then(() => load()).catch((err) => { throw new Error(errorOf(err)); });
    const pending = teams.filter((t) => t.status === 'pending');
    const approved = teams.filter((t) => t.status === 'approved');
    const drawn = rounds.length > 0;
    // A college's own competition: for its students only, and it makes the teams.
    const own = !!c.hostOrganizationId;
    const ownTeam = (t) => own && t.organizationId === c.hostOrganizationId;
    const teamsChange = own && !solo && !drawn && !['completed', 'cancelled'].includes(c.status);
    const teamSaved = (d) => { setData(d); setTeamForm(null); };
    // The platform admin looking at a college's competition: that college by
    // name, never "your college" (it is not theirs).
    const byHost = apiBase.startsWith('/competitions/org/host');
    const hostName = own && !byHost ? (c.hostName || c.organizedBy) : null;

    return (
        <div className="space-y-6 pb-12 animate-fade-in">
            <Link to={backTo} className="-my-2.5 inline-flex min-h-10 items-center gap-1.5 py-2.5 text-sm font-semibold text-slate-500 hover:text-indigo-700"><ArrowLeft size={16} /> All competitions</Link>

            <header className={`${CARD} p-5`}>
                <div className="flex flex-wrap items-start gap-4">
                    <GameIcon game={c.game} size={28} className="h-14 w-14 rounded-2xl" />
                    {/* A base width: without one, two buttons beside it on a
                        phone squeezed the name and dates to a word a line.
                        Now the buttons wrap to their own row instead. */}
                    <div className="min-w-0 flex-1 basis-48">
                        <div className="flex flex-wrap items-center gap-2"><Chip status={competitionBadge(c)} /><span className="text-xs text-slate-500">{c.gameLabel} · by {c.organizedBy}</span></div>
                        <h1 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">{c.name}</h1>
                        <p className="text-sm text-slate-500">{kind
                            ? `${kind === 'quiz' ? 'Opens' : 'Starts'} ${fmtDateTime(c.startsAt)} · ${kind === 'quiz' ? 'closes' : 'projects due'} ${fmtDateTime(c.endsAt)} · registration until ${fmtDateTime(c.registrationDeadline)} · ${solo ? `${approved.length}/${c.maxTeams} students, on their own` : `${approved.length}/${c.maxTeams} teams · up to ${c.playersPerTeam} player${c.playersPerTeam === 1 ? '' : 's'} each`}`
                            : `Starts ${fmtDateTime(c.startsAt)} · registration until ${fmtDateTime(c.registrationDeadline)} · ${approved.length}/${c.maxTeams} teams · up to ${c.playersPerTeam} player${c.playersPerTeam === 1 ? '' : 's'} each · ${c.teamsPerMatch} teams a match${c.playersPerSide > 1 ? ' · doubles' : ''}`}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {!['completed', 'cancelled'].includes(c.status) && <button type="button" className={BTN2} onClick={() => setEditing(true)}><Pencil size={15} /> Edit</button>}
                        {c.status === 'draft' && <button type="button" className={BTN} disabled={!!busy} onClick={() => quiet(call('post', '/status', { status: 'registration' }))}><Rocket size={15} /> Open registration</button>}
                        {c.status === 'registration' && <button type="button" className={BTN2} disabled={!!busy} onClick={() => quiet(call('post', '/status', { status: 'closed' }))}><Lock size={15} /> Close registration</button>}
                        {c.status === 'closed' && !drawn && <button type="button" className={BTN2} disabled={!!busy} onClick={() => quiet(call('post', '/status', { status: 'registration' }))}><Rocket size={15} /> Reopen registration</button>}
                        {!['completed', 'cancelled'].includes(c.status) && (
                            <button type="button" className={`${BTN2} text-rose-700`} disabled={!!busy} onClick={() => { if (window.confirm('Cancel this competition? Games in progress are stopped.')) quiet(call('post', '/status', { status: 'cancelled' })); }}><Ban size={15} /> Cancel</button>
                        )}
                        {/* In any state: the question says what goes with it. */}
                        <button type="button" className={`${BTN2} text-rose-700`} disabled={!!busy}
                            onClick={() => { if (window.confirm(deleteQuestion(c, pending.length + approved.length))) quiet(call('delete', '').then(() => navigate(backTo))); }}><Trash2 size={15} /> Delete</button>
                    </div>
                </div>
                {notice && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{notice}</p>}
            </header>

            <Segmented options={[['teams', solo ? 'Entries' : own ? 'Teams' : 'Registrations'], ['matches', kind === 'quiz' ? 'Quiz & standings' : kind === 'hackathon' ? 'Projects & marks' : 'Matches & rounds'], ['results', 'Results']]} value={tab} onChange={setTab} counts={{ teams: pending.length }} />

            {tab === 'teams' && (
                <section className="space-y-3">
                    {solo && <p className="text-sm text-slate-600">Students sign up for this {kind} themselves, from Competitions in the student app{own ? `; only ${hostName || c.organizedBy}'s students can` : ''}. Turn one down to take them out.</p>}
                    {own && !solo && (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="min-w-0 flex-1 basis-60 text-sm text-slate-600">{hostName
                                ? `Only ${hostName}'s students see this competition. The college makes the teams from its students; you can add or change them here too.`
                                : `Only ${c.organizedBy}'s students see this competition. Make the teams from your students${drawn ? '.' : '; the matches are drawn from them.'}`}</p>
                            {teamsChange && teamForm !== 'new' && <button type="button" className={BTN} onClick={() => setTeamForm('new')}><Plus size={15} /> Add a team</button>}
                        </div>
                    )}
                    {teamForm === 'new' && <TeamMaker competition={c} path={`${apiBase}/${id}`} teams={teams} hostName={hostName} onSaved={teamSaved} onCancel={() => setTeamForm(null)} />}
                    {teams.length === 0 && teamForm !== 'new' && <div className={`${CARD} p-8 text-center text-sm text-slate-500`}>{solo ? (c.status === 'draft' ? 'Open registration so students can sign up.' : 'Nobody has signed up yet.') : own ? (hostName ? `No teams yet. ${hostName} makes them from its students.` : 'No teams yet. Add a team of your students.') : c.status === 'draft' ? 'Open registration so colleges can enter teams.' : 'No college has registered yet.'}</div>}
                    {teams.map((t) => (teamForm === t.id ? <TeamMaker key={t.id} competition={c} path={`${apiBase}/${id}`} team={t} teams={teams} hostName={hostName} onSaved={teamSaved} onCancel={() => setTeamForm(null)} /> : (
                        <article key={t.id} data-team={t.id} className={`${CARD} p-4`}>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                {t.solo ? (
                                    <div className="min-w-0">
                                        <p className="font-bold text-slate-900">{t.teamName} {t.place && <span className="text-amber-600">· {ORDINAL[t.place]}</span>}</p>
                                        <p className="text-sm text-slate-600">{t.collegeName} · signed up {fmtDateTime(t.createdAt)}</p>
                                    </div>
                                ) : ownTeam(t) ? (
                                    <div className="min-w-0">
                                        <p className="font-bold text-slate-900">{t.teamName} {t.place && <span className="text-amber-600">· {ORDINAL[t.place]}</span>}</p>
                                        <p className="text-sm text-slate-600">{t.players.length} player{t.players.length === 1 ? '' : 's'}</p>
                                    </div>
                                ) : (
                                    <div className="min-w-0">
                                        <p className="font-bold text-slate-900">{t.collegeName} {t.place && <span className="text-amber-600">· {ORDINAL[t.place]}</span>}</p>
                                        <p className="text-sm text-slate-600">Team: {t.teamName} · {t.players.length} player{t.players.length === 1 ? '' : 's'}</p>
                                        <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                                            <span>Coordinator: {t.coordinator?.name || '—'}</span>
                                            {t.coordinator?.email && <span className="inline-flex items-center gap-1"><Mail size={12} /> {t.coordinator.email}</span>}
                                            {t.coordinator?.phone && <span className="inline-flex items-center gap-1"><Phone size={12} /> {t.coordinator.phone}</span>}
                                        </p>
                                    </div>
                                )}
                                {(!ownTeam(t) || t.solo) && <Chip status={t.status} />}
                            </div>
                            {!t.solo && <p className="mt-2 text-sm text-slate-700"><Users size={14} className="mr-1 inline text-slate-400" />{t.players.map((p) => p.name).join(', ')}</p>}
                            {t.note && <p className="mt-1 text-xs text-rose-700">Note: {t.note}</p>}
                            {ownTeam(t) && teamsChange && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <button type="button" className={BTN2} onClick={() => setTeamForm(t.id)}><Pencil size={15} /> Edit team</button>
                                    <button type="button" className={`${BTN2} text-rose-700`} disabled={!!busy} onClick={() => { if (window.confirm(`Remove ${t.teamName}?`)) quiet(call('delete', `/teams/${t.id}`)); }}><Trash2 size={15} /> Remove</button>
                                </div>
                            )}
                            {(!ownTeam(t) || t.solo) && !drawn && ['pending', 'approved', 'rejected'].includes(t.status) && !['completed', 'cancelled'].includes(c.status) && (!kind || c.status !== 'live') && (
                                <div className="mt-3 flex flex-wrap items-end gap-2">
                                    <label className="min-w-0 flex-1 basis-52"><span className={LABEL}>Note to the college (optional)</span>
                                        <input value={notes[t.id] || ''} maxLength={500} onChange={(e) => setNotes((n) => ({ ...n, [t.id]: e.target.value }))} className={INPUT} placeholder="e.g. Player list incomplete" /></label>
                                    {t.status !== 'approved' && <button type="button" className={BTN} disabled={!!busy} onClick={() => quiet(call('put', `/teams/${t.id}`, { status: 'approved', note: notes[t.id] || '' }).then(load))}><Check size={15} /> Approve</button>}
                                    {t.status !== 'rejected' && <button type="button" className={`${BTN2} text-rose-700`} disabled={!!busy} onClick={() => quiet(call('put', `/teams/${t.id}`, { status: 'rejected', note: notes[t.id] || '' }).then(load))}><X size={15} /> Reject</button>}
                                </div>
                            )}
                        </article>
                    )))}
                </section>
            )}

            {tab === 'matches' && kind === 'quiz' && challenge && <QuizPanel competition={c} challenge={challenge} busy={busy === '/finish'} onFinish={() => quiet(call('post', '/finish'))} />}
            {tab === 'matches' && kind === 'hackathon' && challenge && <HackathonPanel competition={c} challenge={challenge} busy={busy === '/finish'} onMark={markProject} onFinish={() => quiet(call('post', '/finish'))} />}
            {tab === 'matches' && !kind && (
                <section className="space-y-5">
                    {!drawn && (
                        <div className={`${CARD} space-y-3 p-5`}>
                            <h2 className="flex items-center gap-2 font-bold text-slate-900"><Shuffle size={18} className="text-indigo-600" /> Draw round 1</h2>
                            <p className="text-sm text-slate-600">{approved.length} approved team{approved.length === 1 ? '' : 's'}. Drawing closes registration, pairs the teams at random ({c.teamsPerMatch} a match) and starts the competition. After that it runs by itself: each match starts at its time, and when a round is over the next one (semi-final, final, third place) starts 15 minutes later. Certificates go to the players' profiles at the end.</p>
                            <div className="flex flex-wrap items-end gap-2">
                                <label className="basis-56"><span className={LABEL}>First matches at</span>
                                    <input type="datetime-local" value={draw.firstMatchAt || toLocalInput(c.startsAt)} onChange={(e) => setDraw((d) => ({ ...d, firstMatchAt: e.target.value }))} className={INPUT} /></label>
                                <label className="basis-40"><span className={LABEL}>Minutes between matches</span>
                                    <input type="number" min={0} max={600} value={draw.gapMinutes} onChange={(e) => setDraw((d) => ({ ...d, gapMinutes: e.target.value }))} className={INPUT} /></label>
                                <button type="button" className={BTN} disabled={!!busy || approved.length < 2 || !['registration', 'closed'].includes(c.status)}
                                    onClick={() => quiet(call('post', '/draw', { firstMatchAt: new Date(draw.firstMatchAt || toLocalInput(c.startsAt)).toISOString(), gapMinutes: Number(draw.gapMinutes) || 0 }))}>
                                    {busy === '/draw' ? <Loader2 size={15} className="animate-spin" /> : <Swords size={15} />} Draw the matches
                                </button>
                            </div>
                            {approved.length < 2 && <p className="text-xs text-amber-700">At least two approved teams are needed.</p>}
                        </div>
                    )}
                    {drawn && (
                        <div className="flex justify-end"><button type="button" className={BTN2} onClick={load}><RefreshCw size={15} /> Refresh</button></div>
                    )}
                    {rounds.map((r) => (
                        <div key={r.round}>
                            <h3 className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{r.name}</h3>
                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {r.matches.map((m) => <AdminMatch key={`${m.id}-${m.status}-${m.scheduledAt}`} match={m} onCall={(method, path, body) => quiet(call(method, path, body))} />)}
                            </div>
                        </div>
                    ))}
                </section>
            )}

            {tab === 'results' && (
                <section className={`${CARD} space-y-4 p-5`}>
                    <h2 className="flex items-center gap-2 font-bold text-slate-900"><Trophy size={18} className="text-amber-500" /> Winners</h2>
                    {c.winners.length === 0 ? <p className="text-sm text-slate-500">{kind === 'quiz' ? 'The winners appear here once the quiz is decided.' : kind === 'hackathon' ? 'The winners appear here once you publish the results.' : 'The winners appear here once the final is decided.'}</p> : (
                        <ul className="grid gap-3 sm:grid-cols-3">
                            {c.winners.map((w) => (
                                <li key={w.place} className="rounded-2xl border border-slate-200 p-4 text-center">
                                    <Medal size={26} className={`mx-auto ${w.place === 1 ? 'text-amber-500' : w.place === 2 ? 'text-slate-400' : 'text-orange-400'}`} />
                                    <p className="mt-1 text-xs font-black uppercase text-slate-500">{ORDINAL[w.place]}</p>
                                    <p className="font-bold text-slate-900">{w.teamName}</p>
                                    <p className="text-xs text-slate-500">{w.collegeName}</p>
                                </li>
                            ))}
                        </ul>
                    )}
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                        <p className="flex items-center gap-2 font-bold"><Gift size={16} className="text-indigo-600" /> Prizes</p>
                        <ul className="mt-2 space-y-1">
                            {c.prizes.map((p) => <li key={p.place}>{ORDINAL[p.place]}: {p.title || '—'} · {p.xp} XP · {p.rewardPoints} reward points (each player)</li>)}
                            {c.participationXp > 0 && <li>Taking part: {c.participationXp} XP each</li>}
                            <li>{c.certificates ? 'Certificates for every player' : 'No certificates'}</li>
                        </ul>
                        {c.status === 'completed' && (
                            <button type="button" className={`${BTN2} mt-3`} disabled={!!busy} onClick={() => quiet(call('post', '/award'))}>
                                <Gift size={15} /> Issue prizes again
                            </button>
                        )}
                        {c.status === 'completed' && <p className="mt-1 text-xs text-slate-500">Prizes went out automatically when the final was decided. Issuing again pays only what is missing.</p>}
                    </div>
                </section>
            )}

            {editing && !['completed', 'cancelled'].includes(c.status) && (
                <CompetitionForm competition={c} hosted={own} hostName={hostName} locked={drawn} uploadBanner={bannerUploader(apiBase)} onCancel={() => setEditing(false)}
                    onSave={(body) => api.put(`${apiBase}/${id}`, body).then((r) => { setData(r.data); setEditing(false); })} />
            )}
        </div>
    );
}
