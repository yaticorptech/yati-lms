/**
 * One Quiz Arena contest, for the platform admin:
 *
 *   draft      whether each round has enough approved questions in the
 *              question bank (they are finalised there), then Publish — each
 *              round takes its approved questions, in the order they were
 *              approved, copied into the contest so later bank edits cannot
 *              change it, and colleges can enter students
 *   published  who registered; Start now (or it starts at its time); while it
 *              runs, where the quiz is
 *   ended      review the rankings, then Publish results: students then see
 *              the leaderboards and download their certificates
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Rocket, Play, Ban, Trash2, ListChecks, Users, Trophy, Loader2, X, Check, Radio, Medal, Library, CheckCircle2, AlertCircle, MonitorPlay } from 'lucide-react';
import StudentPreview from '../arena/StudentPreview';
import api from '../utils/api';
import { CARD, BTN, BTN2, Segmented } from '../components/orgUi';
import { errorOf, fmtDateTime } from '../competitions/constants';
import { Chip, GameIcon } from '../competitions/shared';
import { arenaApi, arenaPath, arenaHome, ROUND_NAMES, LETTERS, minutes, ContestForm } from '../arena/shared';
import useGoBack from '../hooks/useGoBack';

/** The contest's state as the badge the other competitions show. */
const BADGE = { draft: 'draft', registration: 'registration', upcoming: 'closed', live: 'live', ended: 'completed', results: 'completed', cancelled: 'cancelled' };

const Section = ({ icon: Icon, title, aside, children }) => (
    <section className={`${CARD} p-4 sm:p-5`}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-bold text-slate-800"><Icon size={18} className="text-indigo-600" /> {title}</h2>
            {aside}
        </div>
        {children}
    </section>
);

const Results = ({ id, state, onPublished }) => {
    const [data, setData] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const load = useCallback(() => api.get(`${arenaApi()}/${id}/results`).then((r) => setData(r.data)).catch((e) => setError(errorOf(e))), [id]);
    useEffect(() => { load(); }, [load, state]);
    const publish = () => {
        if (!window.confirm('Publish the results? Students will see the rankings and can download their certificates. This cannot be undone.')) return;
        setBusy(true);
        api.post(`${arenaApi()}/${id}/publish-results`).then(() => { load(); onPublished(); }).catch((e) => setError(errorOf(e))).finally(() => setBusy(false));
    };
    return (
        <Section icon={Trophy} title={data?.published ? 'Results (published)' : data?.final ? 'Results — review, then publish' : 'Scores so far'}
            aside={data?.final && !data.published && <button type="button" disabled={busy} onClick={publish} className={BTN}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Medal size={16} />} Publish results</button>}>
            {error && <p className="mb-2 text-sm font-semibold text-rose-700">{error}</p>}
            {data && (
                <>
                    <p className="mb-3 text-xs text-slate-500">{data.tookPart} of {data.registered} registered took part · maximum {data.maxScore} points. Ranked by points, then less time on correct answers, then earlier registration.</p>
                    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-500"><th className="py-1.5 pr-2">#</th><th className="pr-2">Student</th><th className="pr-2">College</th><th className="pr-2 text-right">Correct</th><th className="pr-2 text-right">Time</th><th className="text-right">Points</th></tr></thead>
                                <tbody>
                                    {data.ranked.map((r) => (
                                        <tr key={r.rank} className={`border-t border-slate-100 ${r.rank <= 3 ? 'bg-amber-50/60' : ''}`}>
                                            <td className="py-1.5 pr-2 font-black">{r.rank}</td><td className="pr-2 font-semibold">{r.name}</td><td className="pr-2 text-slate-500">{r.collegeName || '—'}</td>
                                            <td className="pr-2 text-right">{r.correctCount}/{r.answered}</td><td className="pr-2 text-right tabular-nums">{(r.timeMs / 1000).toFixed(1)} s</td><td className="text-right font-bold">{r.score}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {data.ranked.length === 0 && <p className="py-4 text-center text-sm text-slate-500">Nobody has taken part.</p>}
                        </div>
                        <div>
                            <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">College-wise</h3>
                            <ol className="space-y-1">
                                {data.colleges.map((c) => <li key={c.rank} className="flex justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-sm"><span><b>{c.rank}.</b> {c.collegeName} <span className="text-xs text-slate-500">({c.participants})</span></span><span className="font-bold">{c.averageScore} avg</span></li>)}
                            </ol>
                        </div>
                    </div>
                </>
            )}
        </Section>
    );
};

const ENTRY = { pending: ['Waiting for approval', 'bg-amber-50 text-amber-700'], approved: ['Approved', 'bg-emerald-50 text-emerald-700'], rejected: ['Rejected', 'bg-rose-50 text-rose-700'] };

/**
 * The students colleges entered, college by college — approved or rejected
 * here, a college at a time or one by one, as Chess teams are. Only approved
 * students play.
 */
const Entries = ({ data, canReview, onReview }) => {
    const groups = [];
    for (const p of data.participants) {
        const key = p.organizationId || p.collegeName;
        let g = groups.find((x) => x.key === key);
        if (!g) groups.push(g = { key, organizationId: p.organizationId, collegeName: p.collegeName || 'No college', rows: [] });
        g.rows.push(p);
    }
    const count = (s) => data.participants.filter((p) => p.status === s).length;
    return (
        <Section icon={Users} title={`Entries (${data.participants.length})`} aside={<span className="text-xs text-slate-500">{count('approved')} approved · {count('pending')} waiting · {count('rejected')} rejected</span>}>
            {groups.length === 0 ? <p className="text-sm text-slate-500">No college has entered students yet. College coordinators enter them from their Competitions page.</p> : (
                <div className="space-y-3">
                    {groups.map((g) => (
                        <div key={g.key} className="rounded-xl border border-slate-200">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
                                <p className="font-bold text-slate-800">{g.collegeName} <span className="text-xs font-normal text-slate-500">({g.rows.length})</span></p>
                                {canReview && g.organizationId && (
                                    <span className="flex gap-1.5">
                                        <button type="button" onClick={() => onReview({ organizationId: g.organizationId, status: 'approved' })} className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700">Approve all</button>
                                        <button type="button" onClick={() => onReview({ organizationId: g.organizationId, status: 'rejected' })} className="rounded-lg px-2.5 py-1 text-xs font-bold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50">Reject all</button>
                                    </span>
                                )}
                            </div>
                            <ul className="divide-y divide-slate-100">
                                {g.rows.map((p) => {
                                    const [label, cls] = ENTRY[p.status] || ENTRY.pending;
                                    return (
                                        <li key={p.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                                            <span className="min-w-0 flex-1 font-semibold text-slate-800">{p.name}{data.competition.entryFee?.enabled && p.status === 'approved' && <span className={`ml-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${p.paidAt ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{p.paidAt ? 'Paid' : 'Not paid'}</span>}</span>
                                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${cls}`}>{label}</span>
                                            {p.joinCode && <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 font-mono text-[11px] font-bold tracking-wider text-indigo-700" title="Joining code">{p.joinCode}</span>}
                                            {p.joinedAt && <span className="text-xs text-slate-500">joined · {p.answered} answered</span>}
                                            {canReview && (
                                                <span className="flex gap-1">
                                                    {p.status !== 'approved' && <button type="button" onClick={() => onReview({ entryIds: [p.id], status: 'approved' })} aria-label={`Approve ${p.name}`} className="rounded-lg p-1 text-emerald-700 ring-1 ring-slate-200 hover:bg-emerald-50"><Check size={14} /></button>}
                                                    {p.status !== 'rejected' && <button type="button" onClick={() => onReview({ entryIds: [p.id], status: 'rejected' })} aria-label={`Reject ${p.name}`} className="rounded-lg p-1 text-rose-700 ring-1 ring-slate-200 hover:bg-rose-50"><X size={14} /></button>}
                                                </span>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </div>
            )}
        </Section>
    );
};

/** An action button; `busy` names the action under way (its spinner), and disables them all. */
const Btn = ({ k, busy, icon: Icon, children, onClick, tone = BTN2, disabled = false, title }) => (
    <button type="button" disabled={!!busy || disabled} title={title} onClick={onClick} className={`${tone} disabled:cursor-not-allowed disabled:opacity-50`}>{busy === k ? <Loader2 size={16} className="animate-spin" /> : <Icon size={16} />} {children}</button>
);

/** The calendar day (India) a time falls on, as YYYY-MM-DD. */
const dayOf = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

export default function QuizArenaCompetition() {
    const [today] = useState(() => dayOf(Date.now()));
    const goBack = useGoBack();
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const { state: arrived } = useLocation();
    // Created with Publish, but publishing failed: say why (it was kept as a draft).
    const [error, setError] = useState(arrived?.notice || '');
    const [busy, setBusy] = useState('');
    const [editing, setEditing] = useState(false);
    const [demo, setDemo] = useState(false);
    const [showPaper, setShowPaper] = useState(false);
    const [tab, setTab] = useState('entries');
    const load = useCallback(() => api.get(`${arenaApi()}/${id}`).then((r) => setData(r.data)).catch((e) => setError(errorOf(e))), [id]);
    useEffect(() => { load(); }, [load]);
    const state = data?.competition.state;
    // While it runs, keep the stage and the participants fresh.
    useEffect(() => {
        // Fresh while it runs, and while entry fees are being paid.
        const paying = data?.competition.entryFee?.enabled && data?.competition.status === 'published' && state !== 'live';
        if (state !== 'live' && !paying) return undefined;
        const t = setInterval(load, state === 'live' ? 3000 : 10000);
        return () => clearInterval(t);
    }, [state, load, data?.competition.entryFee?.enabled, data?.competition.status]);

    const run = (key, p, confirm) => {
        if (confirm && !window.confirm(confirm)) return;
        setBusy(key); setError('');
        p().then(load).catch((e) => setError(errorOf(e))).finally(() => setBusy(''));
    };
    if (!data) return error ? <p className="rounded-xl bg-rose-50 p-4 font-semibold text-rose-700">{error}</p> : <Loader2 className="mx-auto mt-10 animate-spin text-slate-400" />;
    const c = data.competition;
    const draft = c.status === 'draft';
    // A hosting college may start only from the contest's day (the platform admin any time).
    const notYourDay = arenaApi().includes('/org/') && today < dayOf(c.startsAtPlanned || c.startsAt);
    const waiting = c.phase?.stage === 'waiting';

    return (
        <div className="space-y-6 pb-12 animate-fade-in">
            <Link to={arenaHome()} onClick={goBack} className="-my-2.5 inline-flex min-h-10 items-center gap-1.5 py-2.5 text-sm font-semibold text-slate-500 hover:text-indigo-700"><ArrowLeft size={16} /> Back</Link>

            <header className={`${CARD} p-5`}>
                <div className="flex flex-wrap items-start gap-4">
                    <GameIcon game="quizarena" size={28} className="h-14 w-14 rounded-2xl" />
                    <div className="min-w-0 flex-1 basis-48">
                        <div className="flex flex-wrap items-center gap-2"><Chip status={BADGE[state] || state} /><span className="text-xs text-slate-500">Quiz Arena · by {c.organizedBy}</span></div>
                        <h1 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">{c.title}</h1>
                        <p className="text-sm text-slate-500">Starts {fmtDateTime(c.startsAt)} · registration until {fmtDateTime(c.registrationDeadline)} · {c.registeredCount}/{c.maxParticipants} students · up to {c.playersPerCollege} per college</p>
                        <p className="text-sm text-slate-500">{c.questions} questions ({c.counts[1]} + {c.counts[2]} + {c.counts[3]}) · {c.secondsPerQuestion} s each · {c.pointsPerQuestion} points per correct{c.durationMs ? ` · runs ${minutes(c.durationMs)}` : ''}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {/* Demo: the questions as students will see them. */}
                        <Btn k="demo" busy={busy} icon={MonitorPlay} onClick={() => setDemo(true)}>Demo</Btn>
                        {(draft || (c.status === 'published' && waiting)) && <Btn k="edit" busy={busy} icon={Pencil} onClick={() => setEditing(true)}>Edit</Btn>}
                        {draft && <Btn k="publish" busy={busy} icon={Rocket} tone={BTN} onClick={() => run('publish', () => api.post(`${arenaApi()}/${id}/publish`, { fromBank: true }), 'Publish? Each round takes its approved questions from the question bank; they are fixed from then on, and colleges can enter students.')}>Publish</Btn>}
                        {c.status === 'published' && waiting && <Btn k="start" busy={busy} disabled={notYourDay} title={notYourDay ? 'Start now opens on the competition\'s day' : undefined} icon={Play} tone={BTN} onClick={() => run('start', () => api.post(`${arenaApi()}/${id}/start-now`), 'Start the quiz now for everyone registered? Registration closes.')}>Start now</Btn>}
                        {c.status === 'published' && !c.resultsPublishedAt && <Btn k="cancel" busy={busy} icon={Ban} tone={`${BTN2} text-rose-700`} onClick={() => run('cancel', () => api.post(`${arenaApi()}/${id}/cancel`), 'Cancel this competition? Students can no longer take part.')}>Cancel</Btn>}
                        {c.status !== 'published' && <Btn k="delete" busy={busy} icon={Trash2} tone={`${BTN2} text-rose-700`} onClick={() => { if (window.confirm('Delete this competition for good?')) { setBusy('delete'); api.delete(`${arenaApi()}/${id}`).then(() => navigate(arenaHome())).catch((e) => { setError(errorOf(e)); setBusy(''); }); } }}>Delete</Btn>}
                    </div>
                </div>
                {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
            </header>

            <Segmented options={[['entries', 'Registrations'], ['questions', state === 'live' ? 'Questions & live' : 'Questions'], ['results', 'Results']]} value={tab} onChange={setTab}
                counts={{ entries: data.participants.filter((p) => p.status === 'pending').length }} />

            {tab === 'questions' && (<>
            {state === 'live' && c.phase && (
                <Section icon={Radio} title="Live now">
                    <p className="text-sm text-slate-700">
                        {c.phase.stage === 'intro' && <>Round {c.phase.round} · {ROUND_NAMES[c.phase.round]} — intro</>}
                        {['question', 'reveal'].includes(c.phase.stage) && <>Round {c.phase.round} · question {c.phase.inRound} of {c.phase.roundSize} (#{c.phase.index + 1} overall) — {c.phase.stage === 'question' ? 'open' : 'showing the answer'}</>}
                    </p>
                    <p className="text-xs text-slate-500">{data.participants.filter((p) => p.joinedAt).length} of {data.participants.length} registered have joined.</p>
                </Section>
            )}


            {/* Questions are finalised in the question bank (approved there): here only
                whether each round has enough, and after publishing the fixed paper. */}
            <Section icon={ListChecks} title="Questions" aside={<Link to={arenaPath(`/competitions/question-bank?counts=${[1, 2, 3].map((r) => c.counts[r] || 0).join(',')}`)} className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-700 hover:underline"><Library size={15} /> Question bank</Link>}>
                {draft ? (
                    <>
                        <ul className="grid gap-2 sm:grid-cols-3" data-bank-readiness>
                            {[1, 2, 3].map((r) => {
                                const need = c.counts[r] || 0;
                                const have = data.bank?.[r] || 0;
                                const ok = have >= need;
                                return (
                                    <li key={r} className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm ${ok ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                                        {ok ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
                                        <span><b>R{r} · {ROUND_NAMES[r]}</b><span className="block text-xs">{have} approved · needs {need}{ok ? '' : ` — approve ${need - have} more`}</span></span>
                                    </li>
                                );
                            })}
                        </ul>
                        <p className="mt-2 text-xs text-slate-500">On Publish, each round takes its approved questions from the question bank, in the order they were approved, and they are fixed from then on.</p>
                    </>
                ) : (
                    <>
                        <button type="button" onClick={() => setShowPaper((v) => !v)} className="text-sm font-bold text-indigo-700 hover:underline">{showPaper ? 'Hide' : 'View'} question paper ({c.paper.length} questions, fixed)</button>
                        {showPaper && (
                            <ol className="mt-3 space-y-2">
                                {c.paper.map((q, i) => (
                                    <li key={i} className="flex gap-3 rounded-xl bg-slate-50 p-2.5 text-sm">
                                        <span className="w-7 shrink-0 font-black text-slate-400">{i + 1}</span>
                                        {q.imageUrl && <img src={q.imageUrl} alt="" className="h-12 w-16 shrink-0 rounded object-cover" />}
                                        <span className="min-w-0"><span className="text-[11px] font-bold text-indigo-700">R{q.round} · {ROUND_NAMES[q.round]}{q.category ? ` · ${q.category}` : ''}</span><span className="block font-semibold text-slate-800">{q.prompt}</span>
                                            <span className="block text-xs text-slate-500">{q.options.map((o, k) => `${LETTERS[k]}. ${o}${k === q.answer ? ' ✓' : ''}`).join('   ')}</span></span>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </>
                )}
            </Section>
            </>)}

            {tab === 'results' && (['ended', 'results', 'live'].includes(state)
                ? <Results id={id} state={state} onPublished={load} />
                : <section className={`${CARD} p-8 text-center text-sm text-slate-500`}>The rankings appear here once the quiz starts.</section>)}

            {tab === 'entries' && <Entries data={data} canReview={c.status === 'published' && waiting} onReview={(body) => run('review', () => api.post(`${arenaApi()}/${id}/entries/review`, body))} />}

            {demo && <StudentPreview id={id} onClose={() => setDemo(false)} />}
            {editing && <ContestForm contest={c} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); load(); }} />}
        </div>
    );
}
