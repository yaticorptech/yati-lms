/**
 * The teacher's home: a learning guide for doing research — six guides in
 * order, from choosing a design to publishing — with where their own
 * research, thesis and writing stand, and the next thing to do in each.
 * "Continue where you left off" (asked 2026-10-27) opens the last thing they
 * worked on in one tap. "Add your organization" (or the college's name, once
 * joined) opens a popup.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Route, BookMarked, FileText, PenLine, ShieldCheck, FlaskConical, ArrowRight, Target, CheckCircle2, Circle, Building2, Plus, ClipboardList, RotateCcw } from 'lucide-react';
import teacherApi, { messageOf } from '../teacherSession';
import { useTeacher } from '../useTeacher';
import { Card, CardTitle, StatTile, Progress, Loading, ErrorNote } from '../ui';
import { btn, fmtNum, fmtAgo, fmtAgoShort, colorOf, WRITING_KINDS } from '../kit';
import OrganizationDialog from '../OrganizationDialog';

// The learning path: the six guides in the order research needs them; where
// there is something to count (chapters done): [done, total, word].
const TOOLS = [
    { to: '/teacher/methods', color: 'sky', label: 'Choose your research design', hint: 'Research Methodologies: 12 design guides and an advisor', icon: FlaskConical },
    { to: '/teacher/research-path', color: 'emerald', label: 'Plan your research, stage by stage', hint: 'Research Path: 10 stages, each with a lesson and tasks', icon: Route, soft: 'bg-emerald-50 text-emerald-600' },
    { to: '/teacher/thesis', color: 'amber', label: 'Write your thesis, chapter by chapter', hint: 'Thesis Writing: a guide for every chapter', icon: FileText, progress: (d) => (d.thesis ? [d.thesis.chaptersDone, d.thesis.chapters, 'chapters done'] : null) },
    { to: '/teacher/plagiarism', color: 'indigo', label: 'Avoid plagiarism and cite correctly', hint: 'Plagiarism: paraphrasing, citation styles, UGC rules, a check', icon: ShieldCheck, soft: 'bg-slate-100 text-slate-700' },
    { to: '/teacher/publications?guide=ready', color: 'violet', label: 'Publish your paper the standard way', hint: 'Publications Map: 12 steps from journal choice to after publication', icon: BookMarked, soft: 'bg-violet-50 text-violet-600' },
    { to: '/teacher/writing', color: 'rose', label: 'Build an academic writing habit', hint: 'Independent Writing: style, structure, editing, daily goal', icon: PenLine, soft: 'bg-rose-50 text-rose-600' }
];

// What each kind of recent work is, and where it opens: the chapter itself,
// the piece, the project, or the questionnaire in its builder.
const RECENT = {
    chapter: { icon: FileText, color: 'amber', label: 'Thesis chapter', to: (r) => `/teacher/thesis/${r.parentId}?chapter=${r.id}` },
    writing: { icon: PenLine, color: 'rose', label: 'Writing', to: (r) => `/teacher/writing/${r.id}` },
    project: { icon: Route, color: 'emerald', label: 'Research Path', to: (r) => `/teacher/research-path?project=${r.id}` },
    questionnaire: { icon: ClipboardList, color: 'violet', label: 'Questionnaire', to: (r) => `/teacher/methods?questionnaire=${r.id}` }
};
// A short label under the name, so the time always fits: the piece's kind, or what it is.
const contextOf = (r) => (r.kind === 'writing' ? WRITING_KINDS[r.context] || 'Writing' : RECENT[r.kind].label);

/**
 * The last thing worked on, on one row: what it is, its name, how long ago,
 * and a Continue button. Only the one (the user's asks, 2026-10-27: "this
 * much big one is not needed", "more small", then "only one which is last
 * done … one button to go"). Not shown until there is something.
 */
const ContinueCard = ({ recent }) => {
    const last = (recent || []).find((r) => RECENT[r.kind]);
    if (!last) return null;
    const k = RECENT[last.kind];
    const what = `${last.title}, ${contextOf(last)}${last.kind === 'chapter' ? ` in “${last.context}”` : ''}, edited ${fmtAgo(last.at)}`;
    return (
        <section aria-labelledby="continue-title" className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colorOf(k.color).soft}`}><k.icon size={15} aria-hidden="true" /></span>
            <div className="min-w-0 flex-1" title={what}>
                <h2 id="continue-title" className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Continue where you left off</h2>
                <p className="truncate text-sm font-medium text-slate-900">{last.title} <span className="text-xs font-normal text-slate-400">· {fmtAgoShort(last.at)}</span></p>
            </div>
            <Link to={k.to(last)} aria-label={`Continue: ${what}`}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2">
                Continue <ArrowRight size={13} aria-hidden="true" />
            </Link>
        </section>
    );
};

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
    // The tiles are the way in to each section, so the page needs no
    // separate cards repeating the same numbers.
    const tiles = data ? [
        { to: '/teacher/research-path', icon: Route, color: 'emerald', label: 'Research path', value: data.research ? `${data.research.percent}%` : '—', sub: data.research ? `${data.research.done} of ${data.research.total} tasks` : 'Not started' },
        { to: '/teacher/publications', icon: BookMarked, color: 'violet', label: 'Published', value: data.publications.published, sub: `${data.publications.inReview} in review · ${data.publications.total} total` },
        { to: data.thesis ? `/teacher/thesis/${data.thesis._id}` : '/teacher/thesis', icon: FileText, color: 'amber', label: 'Thesis words', value: data.thesis ? fmtNum(data.thesis.words) : '—', sub: data.thesis ? `of ${fmtNum(data.thesis.targetWords)}` : 'No thesis yet' },
        { to: '/teacher/writing', icon: PenLine, color: 'rose', label: 'Writing today', value: fmtNum(data.writing.today), sub: `of ${fmtNum(data.writing.goal)} words` }
    ] : [];
    return (
        <div className="space-y-8">
            {/* The welcome banner: the section's colour, the date, and the organization. */}
            <header className="relative flex flex-wrap items-end justify-between gap-4 overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-500 px-5 py-6 text-white shadow-sm sm:px-7">
                <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/10" />
                <span aria-hidden="true" className="pointer-events-none absolute -bottom-20 right-24 h-40 w-40 rounded-full bg-white/5" />
                <div className="relative min-w-0">
                    <p className="text-sm text-emerald-50/90">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-[28px]">{greeting()}{name ? `, ${name}` : ''}</h1>
                </div>
                {data && (
                    <button type="button" onClick={() => setOrgOpen(true)} aria-haspopup="dialog" className="relative inline-flex max-w-full items-center gap-2 rounded-lg bg-white/15 px-3.5 py-2 text-sm font-medium text-white ring-1 ring-white/30 backdrop-blur transition-colors hover:bg-white/25">
                        {data.organization
                            ? <><Building2 size={16} className="shrink-0" aria-hidden="true" /> <span className="truncate">{data.organization.name}</span></>
                            : <><Plus size={16} aria-hidden="true" /> Add your organization</>}
                    </button>
                )}
            </header>

            <ErrorNote onRetry={load}>{error}</ErrorNote>
            {!data && !error && <Loading label="Loading your dashboard…" />}

            {data && (
                <>
                    <ContinueCard recent={data.recent} />

                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        {tiles.map((t) => (
                            <Link key={t.label} to={t.to} className="rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 [&>div]:hover:border-slate-300">
                                <StatTile icon={t.icon} color={t.color} label={t.label} value={t.value} sub={t.sub} />
                            </Link>
                        ))}
                    </div>

                    <Card>
                        <CardTitle icon={Target} color="emerald" right={<Link to="/teacher/research-path" className={btn.ghost}>Research Path <ArrowRight size={13} /></Link>}>Up next</CardTitle>
                        {data.research?.current ? (
                            <>
                                <p className="text-sm text-slate-500"><span className="font-medium text-slate-900">Now: {data.research.current.title}</span> · {data.research.title}</p>
                                <div className="mt-3 flex items-center gap-3"><Progress value={data.research.percent} label="Research path progress" /><span className="shrink-0 text-xs font-medium text-slate-500 tabular-nums">{data.research.percent}%</span></div>
                                <ul className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
                                    {data.research.nextTasks.map((t) => <li key={t._id} className="flex items-start gap-2.5 py-2.5 text-sm text-slate-700"><Circle size={14} className="mt-0.5 shrink-0 text-slate-300" aria-hidden="true" /> {t.text}</li>)}
                                </ul>
                            </>
                        ) : data.research ? (
                            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700"><CheckCircle2 size={16} /> Every stage of “{data.research.title}” is done.</p>
                        ) : (
                            <p className="text-sm text-slate-500">Plan your research from topic to publication. <Link to="/teacher/research-path" className="font-semibold text-emerald-700 hover:underline">Start a research path</Link></p>
                        )}
                    </Card>

                    <section aria-labelledby="tools-title">
                        <h2 id="tools-title" className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Your research learning path</h2>
                        {/* grid-cols-1 (minmax(0, 1fr)): a long name must truncate, not widen a phone column. */}
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {TOOLS.map((t) => {
                                const progress = t.progress?.(data);
                                return (
                                    <Link key={t.to} to={t.to} title={t.hint} className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-slate-300 hover:bg-slate-50/60">
                                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${colorOf(t.color).soft}`}><t.icon size={17} aria-hidden="true" /></span>
                                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{t.label}</span>
                                        {progress && progress[1] > 0 && <span className="shrink-0 text-xs text-slate-400 tabular-nums">{progress[0]}/{progress[1]}</span>}
                                        <ArrowRight size={15} className="shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-600" aria-hidden="true" />
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
