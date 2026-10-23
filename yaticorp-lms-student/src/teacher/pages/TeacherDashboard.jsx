/**
 * The teacher's home: a learning guide for doing research — six guides in
 * order, from choosing a design to publishing — with where their own
 * research, thesis and writing stand, and the next thing to do in each.
 * Each guide shows how much of it the teacher has read. "Add your
 * organization" (or the college's name, once joined) opens a popup.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Route, BookMarked, FileText, PenLine, ShieldCheck, FlaskConical, ArrowRight, Target, CheckCircle2, Circle, Building2, Plus } from 'lucide-react';
import teacherApi, { messageOf } from '../teacherSession';
import { useTeacher } from '../useTeacher';
import { Card, CardTitle, StatTile, Progress, Loading, ErrorNote } from '../ui';
import { btn, fmtNum, fmtDate } from '../kit';
import OrganizationDialog from '../OrganizationDialog';
import { STAGE_GUIDES } from '../content/researchStages';
import { PLAGIARISM_STEPS } from '../content/plagiarism';
import { PUBLISHING_STEPS } from '../content/publishing';
import { WRITING_STEPS } from '../content/writing';

const STATUS_LABEL = { idea: 'Idea', drafting: 'Drafting', submitted: 'Submitted', under_review: 'Under review', revision: 'Revision', accepted: 'Accepted', published: 'Published', rejected: 'Rejected' };

// The learning path: the six guides in the order research needs them, each
// with how much of it is read (or studied, or written) — [done, total, word].
const TOOLS = [
    { to: '/teacher/methods', label: 'Choose your research design', hint: 'Research Methodologies — 12 design guides and an advisor', icon: FlaskConical, tone: 'from-sky-500 to-indigo-600', progress: (d) => [d.methods.studied, d.methods.total, 'studied'] },
    { to: '/teacher/research-path', label: 'Plan your research, stage by stage', hint: 'Research Path — 10 stages, each with a lesson and tasks', icon: Route, tone: 'from-emerald-500 to-teal-600', progress: (d) => [d.guides?.stages || 0, Object.keys(STAGE_GUIDES).length, 'lessons read'] },
    { to: '/teacher/thesis', label: 'Write your thesis, chapter by chapter', hint: 'Thesis Writing — a guide for every chapter', icon: FileText, tone: 'from-amber-500 to-orange-600', progress: (d) => (d.thesis ? [d.thesis.chaptersDone, d.thesis.chapters, 'chapters done'] : null) },
    { to: '/teacher/plagiarism', label: 'Avoid plagiarism and cite correctly', hint: 'Plagiarism — paraphrasing, citation styles, UGC rules, a check', icon: ShieldCheck, tone: 'from-slate-600 to-slate-800', progress: (d) => [d.guides?.plagiarism || 0, PLAGIARISM_STEPS.length, 'steps read'] },
    { to: '/teacher/publications?guide=ready', label: 'Publish your paper the standard way', hint: 'Publications Map — 12 steps from journal choice to after publication', icon: BookMarked, tone: 'from-violet-500 to-fuchsia-600', progress: (d) => [d.guides?.publishing || 0, PUBLISHING_STEPS.length, 'steps read'] },
    { to: '/teacher/writing', label: 'Build an academic writing habit', hint: 'Independent Writing — style, structure, editing, daily goal', icon: PenLine, tone: 'from-rose-500 to-pink-600', progress: (d) => [d.guides?.writing || 0, WRITING_STEPS.length, 'steps read'] }
];

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };

export default function TeacherDashboard() {
    const { teacher } = useTeacher();
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [orgOpen, setOrgOpen] = useState(false);

    const load = useCallback(() => teacherApi.get('/overview')
        .then((r) => { setData(r.data); setError(''); })
        .catch((e) => setError(messageOf(e, 'Your dashboard could not be loaded.'))), []);
    useEffect(() => { load(); }, [load]);

    const name = (teacher?.name || '').trim();
    return (
        <div className="space-y-6">
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-sky-700 p-5 text-white shadow-lg sm:p-7">
                <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
                <p className="text-sm font-semibold text-emerald-100">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{greeting()}{name ? `, ${name}` : ''}</h1>
                <p className="mt-1 max-w-xl text-sm text-emerald-50">Your research learning guide: learn each step of research, then do it here.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                    {data?.research?.current && (
                        <Link to="/teacher/research-path" className="inline-flex max-w-full items-center gap-2 rounded-xl bg-white/15 px-3.5 py-2 text-sm font-bold ring-1 ring-white/30 backdrop-blur hover:bg-white/25">
                            <Target size={16} aria-hidden="true" /> <span className="truncate">Now: {data.research.current.title}</span> <ArrowRight size={15} aria-hidden="true" />
                        </Link>
                    )}
                    {data && (data.organization ? (
                        <button type="button" onClick={() => setOrgOpen(true)} aria-haspopup="dialog" className="inline-flex max-w-full items-center gap-2 rounded-xl bg-white/15 px-3.5 py-2 text-sm font-bold ring-1 ring-white/30 backdrop-blur hover:bg-white/25">
                            <Building2 size={16} aria-hidden="true" /> <span className="truncate">{data.organization.name}</span>
                        </button>
                    ) : (
                        <button type="button" onClick={() => setOrgOpen(true)} aria-haspopup="dialog" className="inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-sm font-bold text-emerald-700 shadow hover:bg-emerald-50">
                            <Plus size={16} aria-hidden="true" /> Add your organization
                        </button>
                    ))}
                </div>
            </section>

            <ErrorNote onRetry={load}>{error}</ErrorNote>
            {!data && !error && <Loading label="Loading your dashboard…" />}

            {data && (
                <>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <StatTile icon={Route} label="Research path" value={data.research ? `${data.research.percent}%` : '—'} sub={data.research ? `${data.research.done} of ${data.research.total} tasks` : 'Not started'} />
                        <StatTile icon={BookMarked} tone="bg-violet-50 text-violet-600" label="Published" value={data.publications.published} sub={`${data.publications.inReview} in review · ${data.publications.total} in all`} />
                        <StatTile icon={FileText} tone="bg-amber-50 text-amber-600" label="Thesis words" value={data.thesis ? fmtNum(data.thesis.words) : '—'} sub={data.thesis ? `of ${fmtNum(data.thesis.targetWords)}` : 'No thesis yet'} />
                        <StatTile icon={PenLine} tone="bg-rose-50 text-rose-600" label="Writing today" value={fmtNum(data.writing.today)} sub={`of ${fmtNum(data.writing.goal)} words`} />
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <Card>
                            <CardTitle icon={Route} right={<Link to="/teacher/research-path" className={btn.ghost}>Open <ArrowRight size={13} /></Link>}>Research Path</CardTitle>
                            {data.research ? (
                                <>
                                    <p className="truncate text-sm font-bold text-slate-800">{data.research.title}</p>
                                    <div className="mt-2 flex items-center gap-3"><Progress value={data.research.percent} label="Research path progress" /><span className="shrink-0 text-xs font-bold text-slate-500">{data.research.percent}%</span></div>
                                    {data.research.current ? (
                                        <>
                                            <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-400">Next in {data.research.current.title}</p>
                                            <ul className="mt-1.5 space-y-1.5">
                                                {data.research.nextTasks.map((t) => <li key={t._id} className="flex items-start gap-2 text-sm text-slate-700"><Circle size={14} className="mt-0.5 shrink-0 text-slate-300" aria-hidden="true" /> {t.text}</li>)}
                                            </ul>
                                        </>
                                    ) : <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-emerald-700"><CheckCircle2 size={16} /> Every stage is done.</p>}
                                </>
                            ) : (
                                <div className="text-sm text-slate-500">Plan your project from topic to publication. <Link to="/teacher/research-path" className="font-bold text-emerald-700 hover:underline">Start a research path</Link></div>
                            )}
                        </Card>

                        <Card>
                            <CardTitle icon={FileText} right={<Link to={data.thesis ? `/teacher/thesis/${data.thesis._id}` : '/teacher/thesis'} className={btn.ghost}>Open <ArrowRight size={13} /></Link>}>Thesis</CardTitle>
                            {data.thesis ? (
                                <>
                                    <p className="truncate text-sm font-bold text-slate-800">{data.thesis.title}</p>
                                    <div className="mt-2 flex items-center gap-3">
                                        <Progress value={data.thesis.targetWords ? (data.thesis.words / data.thesis.targetWords) * 100 : 0} tone="bg-amber-500" label="Thesis words written" />
                                        <span className="shrink-0 text-xs font-bold text-slate-500">{fmtNum(data.thesis.words)} / {fmtNum(data.thesis.targetWords)}</span>
                                    </div>
                                    <p className="mt-3 text-sm text-slate-600">{data.thesis.chaptersDone} of {data.thesis.chapters} chapters done{data.thesis.dueDate ? ` · due ${fmtDate(data.thesis.dueDate)}` : ''}</p>
                                </>
                            ) : <div className="text-sm text-slate-500">Learn how each chapter is written, then write it chapter by chapter. <Link to="/teacher/thesis" className="font-bold text-emerald-700 hover:underline">Start your thesis</Link></div>}
                        </Card>

                        <Card>
                            <CardTitle icon={PenLine} right={<Link to="/teacher/writing" className={btn.ghost}>Write <ArrowRight size={13} /></Link>}>Writing, last 14 days</CardTitle>
                            <div className="flex h-24 items-end gap-1" aria-label={`Words written each day for 14 days; ${fmtNum(data.writing.today)} today`}>
                                {data.writing.last14.map((d) => {
                                    const max = Math.max(data.writing.goal, ...data.writing.last14.map((x) => x.words));
                                    return <div key={d.day} title={`${d.day}: ${fmtNum(d.words)} words`} className={`flex-1 rounded-t ${d.words >= data.writing.goal ? 'bg-emerald-500' : d.words > 0 ? 'bg-emerald-300' : 'bg-slate-100'}`} style={{ height: `${Math.max(6, (d.words / max) * 100)}%` }} />;
                                })}
                            </div>
                            <p className="mt-2 text-xs text-slate-500">{fmtNum(data.writing.today)} of {fmtNum(data.writing.goal)} words today</p>
                        </Card>

                        <Card>
                            <CardTitle icon={BookMarked} right={<Link to="/teacher/publications" className={btn.ghost}>Open <ArrowRight size={13} /></Link>}>Publications</CardTitle>
                            {data.publications.total ? (
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(data.publications.byStatus).filter(([, n]) => n > 0).map(([s, n]) => (
                                        <span key={s} className="rounded-xl bg-slate-50 px-3 py-2 text-center ring-1 ring-slate-200"><span className="block text-lg font-black text-slate-900">{n}</span><span className="text-[11px] font-bold text-slate-500">{STATUS_LABEL[s]}</span></span>
                                    ))}
                                </div>
                            ) : <div className="text-sm text-slate-500">Map every paper from idea to print. <Link to="/teacher/publications" className="font-bold text-emerald-700 hover:underline">Add your first publication</Link></div>}
                            <Link to="/teacher/publications?guide=ready" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-violet-700 hover:underline">How to publish a paper, step by step <ArrowRight size={12} aria-hidden="true" /></Link>
                            <p className="mt-2 text-xs text-slate-500">
                                Methodologies studied: {data.methods.studied} of {data.methods.total}
                                {data.plagiarism && <> · last check {data.plagiarism.score}% similar ({fmtDate(data.plagiarism.at)})</>}
                            </p>
                        </Card>
                    </div>

                    <section aria-labelledby="tools-title">
                        <h2 id="tools-title" className="mb-1 text-sm font-black uppercase tracking-[0.14em] text-slate-500">Your research learning path</h2>
                        <p className="mb-3 text-sm text-slate-500">Six guides, in the order research needs them. Each teaches the steps, then lets you do them.</p>
                        {/* grid-cols-1 (minmax(0, 1fr)): a long description must truncate, not widen a phone column. */}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {TOOLS.map((t, i) => {
                                const progress = t.progress(data);
                                return (
                                    <Link key={t.to} to={t.to} className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md">
                                        <span className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${t.tone} text-white shadow`}><t.icon size={21} aria-hidden="true" /><span className="absolute -left-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-black text-slate-700 ring-1 ring-slate-200">{i + 1}</span></span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-black text-slate-900">{t.label}</span>
                                            <span className="block truncate text-xs text-slate-500">{t.hint}</span>
                                            {progress && progress[1] > 0 && (
                                                <span className="mt-1.5 flex items-center gap-2">
                                                    <Progress value={(progress[0] / progress[1]) * 100} label={`${t.label}: ${progress[0]} of ${progress[1]} ${progress[2]}`} />
                                                    <span className="shrink-0 text-[11px] font-bold text-slate-500">{progress[0]}/{progress[1]} {progress[2]}</span>
                                                </span>
                                            )}
                                        </span>
                                        <ArrowRight size={16} className="shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-600" aria-hidden="true" />
                                    </Link>
                                );
                            })}
                        </div>
                    </section>
                </>
            )}
            {orgOpen && <OrganizationDialog onClose={() => setOrgOpen(false)} onChanged={load} />}
        </div>
    );
}
