/**
 * A quiz or a hackathon, on its competition page (asked 2026-10-23), in place
 * of the tournament rounds:
 *
 *   SignUpBox     a competition students enter on their own: sign up, or
 *                 withdraw while registration is open.
 *   QuizBox       when the quiz runs, and the way into it (QuizPage): Start,
 *                 Carry on, or my score; once decided, the standings.
 *   HackathonBox  the problem statement (from the start), my team's project to
 *                 hand in or change until the deadline, and once decided its
 *                 marks, the organizer's note and the standings.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Brain, Code2, Loader2, Play, CheckCircle2, ExternalLink, Send, UserPlus, Undo2, ListOrdered, Clock } from 'lucide-react';
import { competitionsApi, ORDINAL, fmtDateTime } from './api';

const Box = ({ icon: Icon, title, children, attr = {} }) => (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" {...attr}>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-slate-900"><Icon size={19} className="text-indigo-600" aria-hidden="true" /> {title}</h2>
        {children}
    </section>
);
const time = (ms) => { const s = Math.round((ms || 0) / 1000); return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`; };

/** The final standings of a quiz or hackathon. */
export const ChallengeStandings = ({ rows, kind, solo, myTeamId }) => (
    <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-sm" data-challenge-standings>
            <thead className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                <tr><th className="py-2 pr-3">#</th><th className="py-2 pr-3">{solo ? 'Student' : 'Team'}</th><th className="py-2 pr-3">College</th><th className="py-2 text-right">{kind === 'quiz' ? 'Score' : 'Marks'}</th></tr>
            </thead>
            <tbody>
                {rows.map((r) => (
                    <tr key={r.teamId} className={`border-t border-slate-100 ${r.teamId === myTeamId ? 'bg-violet-50' : ''}`}>
                        <td className="py-2 pr-3 font-black text-slate-700">{r.took ? (r.rank <= 3 ? ORDINAL[r.rank] : r.rank) : '—'}</td>
                        <td className="py-2 pr-3 font-bold text-slate-900">{r.teamName}</td>
                        <td className="py-2 pr-3 text-slate-600">{r.collegeName}</td>
                        <td className="py-2 text-right tabular-nums text-slate-800">{r.took ? (kind === 'quiz' ? `${r.score} · ${time(r.timeMs)}` : r.score) : '—'}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

/** Sign up on one's own, or withdraw — while registration is open. */
export const SignUpBox = ({ competition: c, onChanged }) => {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const signedUp = c.myTeam && c.myTeam.status !== 'withdrawn';
    const act = (call) => { setBusy(true); setError(''); call(c.id).then(onChanged).catch((e) => setError(e.message)).finally(() => setBusy(false)); };
    if (!c.registrationOpen && !signedUp) {
        return c.phase === 'registration-soon'
            ? <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900" data-signup="soon">Sign-up opens {fmtDateTime(c.registrationOpensAt)}.</p>
            : null;
    }
    return (
        <div className={`mt-4 flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3 ring-1 ${signedUp ? 'bg-violet-50 ring-violet-100' : 'bg-emerald-50 ring-emerald-200'}`} data-signup={signedUp ? 'in' : 'open'}>
            <p className="min-w-0 flex-1 basis-56 text-sm text-slate-800">
                {signedUp ? <>You are signed up. {c.kind === 'quiz' ? `The quiz opens ${fmtDateTime(c.startsAt)}.` : `The problem is revealed ${fmtDateTime(c.startsAt)}.`}</>
                    : <><strong>Open to every student.</strong> Sign up by {fmtDateTime(c.registrationDeadline)} and take part on your own.</>}
            </p>
            {c.registrationOpen && (signedUp
                ? <button type="button" disabled={busy} onClick={() => act(competitionsApi.withdraw)} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-white px-4 text-sm font-bold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50 disabled:opacity-60">{busy ? <Loader2 size={15} className="animate-spin" /> : <Undo2 size={15} />} Withdraw</button>
                : <button type="button" disabled={busy} onClick={() => act(competitionsApi.signUp)} data-signup-button className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-md shadow-emerald-600/30 hover:bg-emerald-700 disabled:opacity-60">{busy ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />} Sign up</button>)}
            {error && <p role="alert" className="basis-full text-sm font-semibold text-rose-700">{error}</p>}
        </div>
    );
};

/** Load a quiz's or hackathon's state, again whenever `tick` changes. */
const useChallenge = (load, id, tick) => {
    const [state, setState] = useState({ data: null, error: '' });
    const reload = useCallback(() => load(id).then((data) => setState({ data, error: '' })).catch((e) => setState((s) => ({ data: s.data, error: e.message }))), [load, id]);
    useEffect(() => { reload(); }, [reload, tick]);
    return [state, reload, setState];
};

export const QuizBox = ({ competition: c, tick }) => {
    const [{ data: q, error }] = useChallenge(competitionsApi.quiz, c.id, tick);
    if (!q) return <Box icon={Brain} title="The quiz">{error ? <p className="text-sm text-rose-700">{error}</p> : <div className="skeleton h-16 rounded-2xl" />}</Box>;
    const a = q.attempt;
    return (
        <Box icon={Brain} title="The quiz" attr={{ 'data-quiz-box': q.window }}>
            <p className="text-sm text-slate-600">{q.count} question{q.count === 1 ? '' : 's'} · {q.totalPoints} points · {q.minutes} minutes once you start · open {fmtDateTime(q.startsAt)} to {fmtDateTime(q.endsAt)}.</p>
            {q.status === 'live' && q.window === 'open' && q.inTeam && (!a || !a.submitted) && (
                <Link to={`/competitions/${c.id}/quiz`} data-quiz-go className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-bold text-white shadow-md shadow-violet-600/30 hover:bg-violet-700">
                    <Play size={16} /> {a ? 'Carry on with the quiz' : 'Start the quiz'}
                </Link>
            )}
            {q.window === 'before' && <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-700"><Clock size={15} className="text-slate-400" /> {q.inTeam ? `You can start it from ${fmtDateTime(q.startsAt)}.` : `It opens ${fmtDateTime(q.startsAt)}.`}</p>}
            {a?.submitted && (
                <p className="mt-3 flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900" data-quiz-score>
                    <CheckCircle2 size={17} className="shrink-0 text-emerald-600" /> You scored <strong>{a.score}/{q.totalPoints}</strong> ({a.correct} of {q.count} right) in {time(a.timeMs)}.{q.status !== 'completed' ? ` The results come out when the quiz closes.` : ''}
                </p>
            )}
            {q.status === 'completed' && a && <Link to={`/competitions/${c.id}/quiz`} className="mt-2 inline-flex min-h-10 items-center text-sm font-bold text-violet-700 hover:underline">See the answers</Link>}
            {!q.inTeam && q.window !== 'before' && q.status !== 'completed' && <p className="mt-3 text-sm text-slate-500">Only {c.entry === 'individual' ? 'students who signed up' : 'players of the teams taking part'} take this quiz.</p>}
            {q.standings && (
                <div className="mt-4"><h3 className="mb-1 flex items-center gap-2 text-sm font-black text-slate-800"><ListOrdered size={16} className="text-indigo-600" /> Final standings</h3>
                    <ChallengeStandings rows={q.standings} kind="quiz" solo={c.entry === 'individual'} myTeamId={c.myTeam?.id} /></div>
            )}
        </Box>
    );
};

const FIELD = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20';

export const HackathonBox = ({ competition: c, tick }) => {
    const [{ data: h, error }, , setState] = useChallenge(competitionsApi.project, c.id, tick);
    const [form, setForm] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    if (!h) return <Box icon={Code2} title="The challenge">{error ? <p className="text-sm text-rose-700">{error}</p> : <div className="skeleton h-16 rounded-2xl" />}</Box>;
    const p = h.project;
    const canHandIn = h.inTeam && h.status === 'live' && h.window === 'open';
    const editing = canHandIn && (form || !p);
    const f = form || { title: p?.title || '', summary: p?.summary || '', repoUrl: p?.repoUrl || '', demoUrl: p?.demoUrl || '' };
    const set = (patch) => setForm({ ...f, ...patch });
    const save = (e) => {
        e.preventDefault();
        setSaving(true); setSaveError('');
        competitionsApi.saveProject(c.id, f).then((data) => { setState({ data, error: '' }); setForm(null); }).catch((err) => setSaveError(err.message)).finally(() => setSaving(false));
    };
    return (
        <Box icon={Code2} title="The challenge" attr={{ 'data-hackathon-box': h.window }}>
            {h.window === 'before'
                ? <p className="text-sm text-slate-600">The problem statement is revealed {fmtDateTime(h.startsAt)}. Projects are due by {fmtDateTime(h.endsAt)}.</p>
                : <>
                    <p className="whitespace-pre-line rounded-2xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-800" data-problem>{h.problem}</p>
                    {h.criteria && <p className="mt-2 text-sm text-slate-600"><strong>Judged on:</strong> {h.criteria}</p>}
                    <p className="mt-2 text-xs font-semibold text-slate-500">Projects due by {fmtDateTime(h.endsAt)}.</p>
                </>}

            {h.inTeam && h.window !== 'before' && (
                <div className="mt-4 rounded-2xl border border-slate-200 p-4">
                    <h3 className="text-sm font-black text-slate-800">{h.solo ? 'Your project' : `${h.teamName}'s project`}</h3>
                    {editing ? (
                        <form onSubmit={save} className="mt-3 space-y-3" data-project-form>
                            <label className="block text-xs font-bold text-slate-600">Project title<input required maxLength={140} value={f.title} onChange={(e) => set({ title: e.target.value })} className={`${FIELD} mt-1`} /></label>
                            <label className="block text-xs font-bold text-slate-600">What it does and how<textarea rows={4} maxLength={4000} value={f.summary} onChange={(e) => set({ summary: e.target.value })} className={`${FIELD} mt-1`} /></label>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <label className="block text-xs font-bold text-slate-600">Code link (GitHub…)<input type="url" maxLength={600} placeholder="https://github.com/…" value={f.repoUrl} onChange={(e) => set({ repoUrl: e.target.value })} className={`${FIELD} mt-1`} /></label>
                                <label className="block text-xs font-bold text-slate-600">Demo link<input type="url" maxLength={600} placeholder="https://…" value={f.demoUrl} onChange={(e) => set({ demoUrl: e.target.value })} className={`${FIELD} mt-1`} /></label>
                            </div>
                            {saveError && <p role="alert" className="text-sm font-semibold text-rose-700">{saveError}</p>}
                            <div className="flex flex-wrap gap-2">
                                <button type="submit" disabled={saving} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-md shadow-emerald-600/30 hover:bg-emerald-700 disabled:opacity-60">{saving ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} {p ? 'Save changes' : 'Hand in the project'}</button>
                                {form && p && <button type="button" onClick={() => { setForm(null); setSaveError(''); }} className="inline-flex min-h-10 items-center rounded-xl px-3 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>}
                            </div>
                        </form>
                    ) : p ? (
                        <div className="mt-2 space-y-2 text-sm" data-project>
                            <p className="font-bold text-slate-900">{p.title}</p>
                            {p.summary && <p className="whitespace-pre-line text-slate-700">{p.summary}</p>}
                            <p className="flex flex-wrap gap-3">
                                {p.repoUrl && <a href={p.repoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-indigo-700 hover:underline"><ExternalLink size={14} /> Code</a>}
                                {p.demoUrl && <a href={p.demoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-indigo-700 hover:underline"><ExternalLink size={14} /> Demo</a>}
                            </p>
                            <p className="text-xs text-slate-500">Handed in by {p.submittedBy} on {fmtDateTime(p.submittedAt)}.</p>
                            {p.score != null && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-emerald-900" data-marks>Marks: <strong>{p.score}/100</strong>{p.feedback ? <> · {p.feedback}</> : null}</p>}
                            {canHandIn && <button type="button" onClick={() => setForm(f)} className="inline-flex min-h-10 items-center rounded-xl bg-white px-4 text-sm font-bold text-indigo-700 ring-1 ring-indigo-100 hover:bg-indigo-50">Change the project</button>}
                        </div>
                    ) : <p className="mt-2 text-sm text-slate-500">{h.window === 'over' ? 'No project was handed in.' : ''}</p>}
                </div>
            )}
            {!h.inTeam && h.window === 'open' && <p className="mt-3 text-sm text-slate-500">Only {c.entry === 'individual' ? 'students who signed up' : 'players of the teams taking part'} hand in a project.</p>}
            {h.status === 'live' && h.window === 'over' && <p className="mt-3 text-sm font-semibold text-slate-600">The deadline has passed. The organizer is marking the projects.</p>}
            {h.standings && (
                <div className="mt-4"><h3 className="mb-1 flex items-center gap-2 text-sm font-black text-slate-800"><ListOrdered size={16} className="text-indigo-600" /> Final standings</h3>
                    <ChallengeStandings rows={h.standings} kind="hackathon" solo={c.entry === 'individual'} myTeamId={c.myTeam?.id} /></div>
            )}
        </Box>
    );
};
