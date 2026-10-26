/**
 * Running a quiz or a hackathon (asked 2026-10-23), on its competition page in
 * place of the matches:
 *
 *   QuizPanel       the standings so far (each team's score and time, who has
 *                   handed in), the questions with their answers, and closing
 *                   it now — it also closes by itself at its end.
 *   HackathonPanel  every project handed in, with marks out of 100 and a note
 *                   for the team, then publishing the results (after the
 *                   deadline, once every project is marked).
 */
import { useState } from 'react';
import { Trophy, Loader2, Flag, Check, ExternalLink, Save } from 'lucide-react';
import { CARD, BTN, BTN2, INPUT, LABEL } from '../components/orgUi';
import { fmtDateTime } from './constants';

const time = (ms) => { const s = Math.round((ms || 0) / 1000); return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`; };
const closed = (c) => c.endsAt && new Date(c.endsAt) < new Date();

/** The standings table: rank, team (or student), college, and the columns given. */
const Standings = ({ rows, solo, columns }) => (
    <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-500">
                <tr><th className="px-3 py-2">#</th><th className="px-3 py-2">{solo ? 'Student' : 'Team'}</th><th className="px-3 py-2">College</th>{columns.map(([label]) => <th key={label} className="px-3 py-2 text-right">{label}</th>)}</tr>
            </thead>
            <tbody>
                {rows.map((r) => (
                    <tr key={r.teamId} className="border-t border-slate-100" data-standing={r.teamId}>
                        <td className="px-3 py-2 font-black text-slate-700">{r.took ? r.rank : '—'}</td>
                        <td className="px-3 py-2 font-bold text-slate-900">{r.teamName}</td>
                        <td className="px-3 py-2 text-slate-600">{r.collegeName}</td>
                        {columns.map(([label, cell]) => <td key={label} className="px-3 py-2 text-right tabular-nums text-slate-700">{cell(r)}</td>)}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

export const QuizPanel = ({ competition: c, challenge, busy, onFinish }) => {
    const solo = c.entry === 'individual';
    return (
        <section className="space-y-5" data-quiz-panel>
            <div className={`${CARD} space-y-3 p-5`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h2 className="flex items-center gap-2 font-bold text-slate-900"><Trophy size={18} className="text-amber-500" /> Standings</h2>
                        <p className="text-sm text-slate-600">
                            Open {fmtDateTime(c.startsAt)} to {fmtDateTime(c.endsAt)} · {challenge.questions.length} questions · {challenge.totalPoints} points · {challenge.minutes} minutes each · {challenge.attempts} started.
                            {' '}{solo ? 'Each student\'s score' : 'A team\'s score is its players\' scores added up'}; a tie goes to the quicker.
                        </p>
                    </div>
                    {c.status === 'live' && (
                        <button type="button" className={BTN} disabled={!!busy} data-finish
                            onClick={() => { if (window.confirm(closed(c) ? 'Decide the quiz now and publish the results?' : 'Close the quiz now? Anyone still answering is handed in as they are, and the results are published.')) onFinish(); }}>
                            {busy ? <Loader2 size={15} className="animate-spin" /> : <Flag size={15} />} {closed(c) ? 'Publish the results' : 'Close the quiz now'}
                        </button>
                    )}
                </div>
                {c.status !== 'live' && c.status !== 'completed' && <p className="text-xs text-slate-500">The quiz opens by itself at its start and is decided by itself when it closes.</p>}
                {challenge.standings.length === 0 ? <p className="text-sm text-slate-500">No entries yet.</p> : (
                    <Standings rows={challenge.standings} solo={solo} columns={[
                        ['Score', (r) => (r.took ? r.score : '—')],
                        ['Time', (r) => (r.took ? time(r.timeMs) : '—')],
                        ...(solo ? [] : [['Players', (r) => `${r.handedIn}/${r.took}`]])
                    ]} />
                )}
            </div>
            <div className={`${CARD} space-y-3 p-5`}>
                <h2 className="font-bold text-slate-900">Questions and answers</h2>
                <ol className="space-y-3">
                    {challenge.questions.map((q, i) => (
                        <li key={q.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                            <p className="font-bold text-slate-800">{i + 1}. {q.prompt} <span className="font-normal text-slate-500">({q.points} point{q.points === 1 ? '' : 's'})</span></p>
                            <ul className="mt-1.5 grid gap-1 sm:grid-cols-2">
                                {q.options.map((o, k) => <li key={k} className={`flex items-center gap-1.5 ${k === q.answer ? 'font-bold text-emerald-700' : 'text-slate-600'}`}>{k === q.answer ? <Check size={14} /> : <span className="w-3.5" />} {o}</li>)}
                            </ul>
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    );
};

/** One project: its links, and the organizer's marks and note. */
const Project = ({ project: p, locked, onMark }) => {
    const [score, setScore] = useState(p.score ?? '');
    const [feedback, setFeedback] = useState(p.feedback || '');
    const [state, setState] = useState({ busy: false, error: '', saved: false });
    const save = () => {
        setState({ busy: true, error: '', saved: false });
        onMark(p.id, { score, feedback }).then(() => setState({ busy: false, error: '', saved: true })).catch((e) => setState({ busy: false, error: e.message, saved: false }));
    };
    return (
        <article className={`${CARD} space-y-3 p-4`} data-project={p.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="font-bold text-slate-900">{p.title}</p>
                    <p className="text-xs text-slate-500">{p.teamName} · {p.collegeName} · handed in by {p.submittedBy} on {fmtDateTime(p.submittedAt)}</p>
                </div>
                {p.score != null && <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-black text-emerald-700">{p.score}/100</span>}
            </div>
            {p.summary && <p className="whitespace-pre-line text-sm text-slate-700">{p.summary}</p>}
            <p className="flex flex-wrap gap-3 text-sm">
                {p.repoUrl && <a href={p.repoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-indigo-700 hover:underline"><ExternalLink size={14} /> Code</a>}
                {p.demoUrl && <a href={p.demoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-indigo-700 hover:underline"><ExternalLink size={14} /> Demo</a>}
            </p>
            {!locked && (
                <div className="flex flex-wrap items-end gap-2">
                    <label className="w-28"><span className={LABEL}>Marks (of 100)</span>
                        <input type="number" min={0} max={100} value={score} onChange={(e) => setScore(e.target.value)} className={INPUT} data-marks /></label>
                    <label className="min-w-0 flex-1 basis-56"><span className={LABEL}>Note to the team (optional)</span>
                        <input value={feedback} maxLength={2000} onChange={(e) => setFeedback(e.target.value)} className={INPUT} /></label>
                    <button type="button" className={BTN2} disabled={state.busy || score === ''} onClick={save}>{state.busy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save marks</button>
                </div>
            )}
            {locked && p.feedback && <p className="text-sm text-slate-600">Note: {p.feedback}</p>}
            {state.error && <p role="alert" className="text-xs text-rose-700">{state.error}</p>}
            {state.saved && <p className="text-xs font-bold text-emerald-700">Saved.</p>}
        </article>
    );
};

export const HackathonPanel = ({ competition: c, challenge, busy, onMark, onFinish }) => {
    const unmarked = challenge.submissions.filter((s) => s.score == null).length;
    const due = closed(c);
    return (
        <section className="space-y-5" data-hackathon-panel>
            <div className={`${CARD} space-y-2 p-5`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h2 className="font-bold text-slate-900">Projects and marks</h2>
                        <p className="text-sm text-slate-600">Starts {fmtDateTime(c.startsAt)} · projects due by {fmtDateTime(c.endsAt)} · {challenge.submissions.length} handed in{unmarked ? ` · ${unmarked} to mark` : ''}.</p>
                    </div>
                    {c.status === 'live' && (
                        <button type="button" className={BTN} disabled={!!busy || !due || unmarked > 0} data-finish
                            onClick={() => { if (window.confirm('Publish the results? The places go by the marks, and the marks can no longer change.')) onFinish(); }}>
                            {busy ? <Loader2 size={15} className="animate-spin" /> : <Flag size={15} />} Publish the results
                        </button>
                    )}
                </div>
                {c.status === 'live' && (!due || unmarked > 0) && <p className="text-xs text-amber-700">{!due ? 'Projects can still change until the deadline; publish the results after it.' : 'Mark every project to publish the results.'}</p>}
                <details className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                    <summary className="cursor-pointer font-bold">The problem statement</summary>
                    <p className="mt-2 whitespace-pre-line">{challenge.problem}</p>
                    {challenge.criteria && <p className="mt-2 whitespace-pre-line text-slate-600"><span className="font-bold">Judged on:</span> {challenge.criteria}</p>}
                </details>
            </div>
            {challenge.submissions.length === 0
                ? <div className={`${CARD} p-8 text-center text-sm text-slate-500`}>No project handed in yet.</div>
                : challenge.submissions.map((p) => <Project key={`${p.id}-${p.score}`} project={p} locked={c.status !== 'live'} onMark={onMark} />)}
            {c.status === 'completed' && (
                <div className={`${CARD} p-5`}>
                    <h2 className="mb-3 flex items-center gap-2 font-bold text-slate-900"><Trophy size={18} className="text-amber-500" /> Standings</h2>
                    <Standings rows={challenge.standings} solo={c.entry === 'individual'} columns={[['Project', (r) => r.project || '—'], ['Marks', (r) => (r.score ?? '—')]]} />
                </div>
            )}
        </section>
    );
};
