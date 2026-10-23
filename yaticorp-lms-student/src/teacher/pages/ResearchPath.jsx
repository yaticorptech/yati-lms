/**
 * Research Path: a research project as ten stages, from topic to publication.
 * Each stage has its tasks (ticked off, or added by the teacher), a target
 * date and notes. The stage with work left in it is the one shown open.
 * Every stage also teaches itself: why it matters, how to do it, and the
 * usual mistakes (content/researchStages.js) — and each lesson can be marked
 * as read. A new project starts from the tasks for its type of study
 * (survey, experiment, qualitative, mixed, review, action research).
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Route, Plus, Trash2, CheckCircle2, Circle, ChevronDown, CalendarDays, Pencil, Loader2, X, Flag, GraduationCap, XCircle, ExternalLink, ArrowRight, Check, BookCheck } from 'lucide-react';
import { STAGE_GUIDES } from '../content/researchStages';
import teacherApi, { messageOf } from '../teacherSession';
import { PageHeader, Card, Loading, ErrorNote, EmptyState, Modal, Field, Progress, Badge } from '../ui';
import { btn, inputClass, toDateInput, fmtDate } from '../kit';
import useConfirmDialog from '../../components/useConfirmDialog';
import useGuideRead from '../useGuideRead';

/** "Learn this stage": the guide above a stage's tasks. */
const StageLearn = ({ guide, open, onToggle, read, onRead }) => (
    <div className="overflow-hidden rounded-xl border border-sky-100 bg-sky-50/50">
        <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-2 px-3 py-2 text-left">
            <GraduationCap size={16} className="shrink-0 text-sky-600" aria-hidden="true" />
            <span className="flex-1 text-sm font-black text-slate-900">Learn this stage</span>
            {read && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-black text-emerald-700"><Check size={11} strokeWidth={3} aria-hidden="true" /> Read</span>}
            <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
        {open && (
            <div className="space-y-3 border-t border-sky-100 px-3 py-3">
                <p className="text-sm leading-relaxed text-slate-700">{guide.why}</p>
                <div>
                    <p className="mb-1 text-xs font-black uppercase tracking-wider text-sky-700">How to do it</p>
                    <ol className="list-decimal space-y-1 pl-5 text-sm leading-relaxed text-slate-700">{guide.how.map((x) => <li key={x}>{x}</li>)}</ol>
                </div>
                {guide.example && <p className="rounded-lg bg-white p-2.5 text-sm text-slate-700 ring-1 ring-sky-100"><strong>Example: </strong>{guide.example}</p>}
                <div>
                    <p className="mb-1 text-xs font-black uppercase tracking-wider text-rose-600">Avoid</p>
                    <ul className="space-y-1">{guide.mistakes.map((x) => <li key={x} className="flex gap-2 text-sm text-slate-700"><XCircle size={14} className="mt-0.5 shrink-0 text-rose-500" aria-hidden="true" />{x}</li>)}</ul>
                </div>
                {guide.tools?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {guide.tools.map(([label, url]) => <a key={url} href={url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:border-sky-300">{label} <ExternalLink size={11} aria-hidden="true" /></a>)}
                    </div>
                )}
                {guide.guideLink && <Link to="/teacher/publications?guide=ready" className="inline-flex items-center gap-1 text-sm font-bold text-violet-700 hover:underline">Open the step-by-step publishing guide <ArrowRight size={14} aria-hidden="true" /></Link>}
                <div className="border-t border-sky-100 pt-3">
                    <button type="button" onClick={() => onRead(!read)} aria-pressed={read}
                        className={read ? 'inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200' : btn.secondary}>
                        <BookCheck size={15} aria-hidden="true" /> {read ? 'Lesson read' : 'Mark this lesson as read'}
                    </button>
                </div>
            </div>
        )}
    </div>
);

const GOALS = { phd: 'PhD', masters: "Master's / M.Phil", postdoc: 'Post-doctoral', funded: 'Funded project', independent: 'Independent research' };

const ProjectForm = ({ initial, kinds = [], onSubmit, onCancel, busy, error }) => {
    const [f, setF] = useState({ title: initial?.title || '', field: initial?.field || '', goal: initial?.goal || 'phd', kind: 'general', startDate: toDateInput(initial?.startDate), targetDate: toDateInput(initial?.targetDate) });
    const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
    return (
        <form id="project-form" onSubmit={(e) => { e.preventDefault(); onSubmit(f); }} className="space-y-3">
            <ErrorNote>{error}</ErrorNote>
            <Field id="project-title" label="Project title"><input id="project-title" required minLength={3} maxLength={300} value={f.title} onChange={set('title')} className={inputClass} placeholder="e.g. Peer tutoring and mathematics anxiety in rural colleges" /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
                <Field id="project-field" label="Field" optional><input id="project-field" maxLength={200} value={f.field} onChange={set('field')} className={inputClass} placeholder="e.g. Education" /></Field>
                <Field id="project-goal" label="Degree or purpose">
                    <select id="project-goal" value={f.goal} onChange={set('goal')} className={inputClass}>{Object.entries(GOALS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                </Field>
                <Field id="project-start" label="Start date" optional><input id="project-start" type="date" value={f.startDate} onChange={set('startDate')} className={inputClass} /></Field>
                <Field id="project-target" label="Target completion" optional><input id="project-target" type="date" value={f.targetDate} onChange={set('targetDate')} className={inputClass} /></Field>
            </div>
            {/* Only when starting: the type decides the tasks the stages begin with. */}
            {!initial && kinds.length > 0 && (
                <fieldset>
                    <legend className="mb-1.5 text-xs font-bold text-slate-600">Type of study <span className="font-normal text-slate-400">— sets the starting tasks; you can add your own later</span></legend>
                    <div className="grid gap-2 sm:grid-cols-2">
                        {kinds.map((k) => (
                            <label key={k.key} className={`flex cursor-pointer gap-2.5 rounded-xl border p-2.5 ${f.kind === k.key ? 'border-emerald-400 bg-emerald-50/60 ring-1 ring-emerald-300' : 'border-slate-200 hover:border-slate-300'}`}>
                                <input type="radio" name="project-kind" value={k.key} checked={f.kind === k.key} onChange={set('kind')} className="mt-1 accent-emerald-600" />
                                <span className="min-w-0"><span className="block text-sm font-bold text-slate-800">{k.label}</span><span className="block text-xs text-slate-500">{k.description}</span></span>
                            </label>
                        ))}
                    </div>
                </fieldset>
            )}
            {onCancel && (
                <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={onCancel} className={btn.secondary}>Cancel</button>
                    <button type="submit" disabled={busy} className={btn.primary}>{busy ? <Loader2 size={15} className="animate-spin" /> : null} Save</button>
                </div>
            )}
        </form>
    );
};

export default function ResearchPath() {
    const [projects, setProjects] = useState(null);
    const [kinds, setKinds] = useState([]);
    const lessons = useGuideRead('stages');
    const [activeId, setActiveId] = useState(null);
    const [error, setError] = useState('');
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState(false);
    const [busy, setBusy] = useState(false);
    const [formError, setFormError] = useState('');
    const [openStage, setOpenStage] = useState(null);
    const [newTask, setNewTask] = useState({});
    const [actionError, setActionError] = useState('');
    // Which stages have their guide folded away (open unless the teacher hides it).
    const [learnClosed, setLearnClosed] = useState({});
    const [confirm, confirmDialog] = useConfirmDialog();

    const load = useCallback(() => teacherApi.get('/projects').then((r) => {
        setProjects(r.data.projects);
        setKinds(r.data.kinds || []);
        setActiveId((id) => (r.data.projects.some((p) => p._id === id) ? id : r.data.projects[0]?._id || null));
        setError('');
    }).catch((e) => setError(messageOf(e, 'Your research path could not be loaded.'))), []);
    useEffect(() => { load(); }, [load]);

    const project = projects?.find((p) => p._id === activeId) || null;
    // Until the teacher opens or closes one, the stage with work left is open.
    const shownStage = openStage ?? project?.progress.current?.key ?? project?.stages[0]?.key;

    const replace = (p) => setProjects((list) => list.map((x) => (x._id === p._id ? p : x)));
    const act = async (fn) => {
        setActionError('');
        try { const r = await fn(); if (r?.data?._id) replace(r.data); }
        catch (e) { setActionError(messageOf(e, 'That change could not be saved.')); }
    };

    const create = async (f) => {
        setBusy(true); setFormError('');
        try {
            const r = await teacherApi.post('/projects', f);
            setProjects((list) => [r.data, ...(list || [])]);
            setActiveId(r.data._id); setOpenStage(r.data.progress.current?.key || 'topic'); setCreating(false);
        } catch (e) { setFormError(messageOf(e, 'The project could not be created.')); } finally { setBusy(false); }
    };
    const saveDetails = async (f) => {
        setBusy(true); setFormError('');
        try { const r = await teacherApi.put(`/projects/${project._id}`, f); replace(r.data); setEditing(false); }
        catch (e) { setFormError(messageOf(e, 'The changes could not be saved.')); } finally { setBusy(false); }
    };
    const remove = async () => {
        if (!(await confirm({ title: `Delete "${project.title}"?`, message: 'Its stages, tasks and notes are deleted for good.', confirmLabel: 'Delete', destructive: true }))) return;
        try { await teacherApi.delete(`/projects/${project._id}`); setEditing(false); setOpenStage(null); load(); }
        catch (e) { setActionError(messageOf(e, 'The project could not be deleted.')); }
    };

    if (error) return <div className="space-y-4"><PageHeader icon={Route} title="Research Path" /><ErrorNote onRetry={load}>{error}</ErrorNote></div>;
    if (!projects) return <Loading label="Loading your research path…" />;

    return (
        <div className="space-y-6">
            <PageHeader icon={Route} title="Research Path" subtitle="From topic to publication, one stage at a time."
                actions={projects.length > 0 && <button type="button" onClick={() => { setFormError(''); setCreating(true); }} className={btn.secondary}><Plus size={15} /> New project</button>} />

            {!projects.length && !creating && (
                <EmptyState icon={Flag} title="Plan your research project" action={<button type="button" onClick={() => setCreating(true)} className={btn.primary}><Plus size={15} /> Start a research path</button>}>
                    Ten stages — topic, literature, questions, methodology, ethics, data, analysis, writing, submission and publication — each with the tasks that make it up.
                </EmptyState>
            )}

            {projects.length > 1 && (
                <div className="flex flex-wrap gap-2" role="group" aria-label="Your projects">
                    {projects.map((p) => (
                        <button key={p._id} type="button" aria-pressed={p._id === activeId} onClick={() => { setActiveId(p._id); setOpenStage(null); }}
                            className={`max-w-full truncate rounded-full px-3 py-1.5 text-xs font-bold ${p._id === activeId ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>{p.title} · {p.progress.percent}%</button>
                    ))}
                </div>
            )}

            {project && (
                <>
                    <Card>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                                <h2 className="text-lg font-black text-slate-900 [overflow-wrap:anywhere]">{project.title}</h2>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                    <Badge tone="bg-emerald-100 text-emerald-700">{GOALS[project.goal]}</Badge>
                                    {project.kind && project.kind !== 'general' && <Badge tone="bg-sky-100 text-sky-700">{kinds.find((k) => k.key === project.kind)?.label || project.kind}</Badge>}
                                    {project.field && <span>{project.field}</span>}
                                    {project.targetDate && <span className="inline-flex items-center gap-1"><CalendarDays size={13} /> Target {fmtDate(project.targetDate)}</span>}
                                </div>
                            </div>
                            <button type="button" onClick={() => { setFormError(''); setEditing(true); }} className={btn.ghost}><Pencil size={14} /> Edit</button>
                        </div>
                        <div className="mt-4 flex items-center gap-3">
                            <Progress value={project.progress.percent} label="Project progress" />
                            <span className="shrink-0 text-sm font-black text-slate-700">{project.progress.percent}%</span>
                        </div>
                        <p className="mt-1.5 text-xs text-slate-500">{project.progress.done} of {project.progress.total} tasks done{project.progress.current ? ` · now on ${project.progress.current.title}` : ' · every stage complete'}</p>
                    </Card>

                    <ErrorNote>{actionError}</ErrorNote>

                    <ol className="space-y-3">
                        {project.stages.map((s, i) => {
                            const per = project.progress.perStage[i];
                            const isOpen = shownStage === s.key;
                            const isCurrent = project.progress.current?.key === s.key;
                            return (
                                <li key={s.key} className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${isCurrent ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-slate-200'}`}>
                                    <button type="button" onClick={() => setOpenStage(isOpen ? '' : s.key)} aria-expanded={isOpen}
                                        className="flex w-full items-center gap-3 px-4 py-3 text-left">
                                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black ${per.percent === 100 ? 'bg-emerald-600 text-white' : isCurrent ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {per.percent === 100 ? <CheckCircle2 size={18} /> : i + 1}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="flex flex-wrap items-center gap-2"><span className="text-sm font-black text-slate-900">{s.title}</span>{isCurrent && <Badge tone="bg-emerald-100 text-emerald-700">Now</Badge>}</span>
                                            <span className="block truncate text-xs text-slate-500">{s.description}</span>
                                        </span>
                                        <span className="hidden shrink-0 text-xs font-bold text-slate-500 sm:block">{per.done}/{per.total}{s.targetDate ? ` · ${fmtDate(s.targetDate)}` : ''}</span>
                                        <ChevronDown size={18} className={`shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                                    </button>
                                    {isOpen && (
                                        <div className="space-y-4 border-t border-slate-100 px-4 py-4">
                                            {STAGE_GUIDES[s.key] && (
                                                <StageLearn guide={STAGE_GUIDES[s.key]} open={!learnClosed[s.key]} onToggle={() => setLearnClosed((x) => ({ ...x, [s.key]: !x[s.key] }))}
                                                    read={lessons.read.includes(s.key)} onRead={(v) => lessons.toggle(s.key, v)} />
                                            )}
                                            <p className="text-xs font-black uppercase tracking-wider text-slate-400">Your tasks</p>
                                            <ul className="space-y-1.5">
                                                {s.tasks.map((t) => (
                                                    <li key={t._id} className="group flex items-start gap-2">
                                                        <button type="button" onClick={() => act(() => teacherApi.put(`/projects/${project._id}/stages/${s.key}/tasks/${t._id}`, { done: !t.done }))}
                                                            aria-pressed={t.done} aria-label={`${t.text}: ${t.done ? 'done' : 'not done'}`}
                                                            className="flex min-w-0 flex-1 items-start gap-2 rounded-lg px-1.5 py-1 text-left hover:bg-slate-50">
                                                            {t.done ? <CheckCircle2 size={18} className="mt-px shrink-0 text-emerald-600" /> : <Circle size={18} className="mt-px shrink-0 text-slate-300" />}
                                                            <span className={`text-sm ${t.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{t.text}</span>
                                                        </button>
                                                        {t.custom && (
                                                            <button type="button" onClick={() => act(() => teacherApi.delete(`/projects/${project._id}/stages/${s.key}/tasks/${t._id}`))}
                                                                aria-label={`Remove task: ${t.text}`} className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-600"><X size={14} /></button>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                            <form className="flex gap-2" onSubmit={async (e) => {
                                                e.preventDefault();
                                                const text = (newTask[s.key] || '').trim();
                                                if (!text) return;
                                                await act(() => teacherApi.post(`/projects/${project._id}/stages/${s.key}/tasks`, { text }));
                                                setNewTask((x) => ({ ...x, [s.key]: '' }));
                                            }}>
                                                <label htmlFor={`task-${s.key}`} className="sr-only">Add a task to {s.title}</label>
                                                <input id={`task-${s.key}`} value={newTask[s.key] || ''} onChange={(e) => setNewTask((x) => ({ ...x, [s.key]: e.target.value }))} maxLength={300} className={inputClass} placeholder="Add your own task" />
                                                <button type="submit" className={btn.secondary} aria-label="Add task"><Plus size={16} /></button>
                                            </form>
                                            <div className="grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
                                                <Field id={`target-${s.key}`} label="Target date">
                                                    <input id={`target-${s.key}`} type="date" defaultValue={toDateInput(s.targetDate)} className={inputClass}
                                                        onChange={(e) => act(() => teacherApi.put(`/projects/${project._id}/stages/${s.key}`, { targetDate: e.target.value || null }))} />
                                                </Field>
                                                <Field id={`notes-${s.key}`} label="Notes" hint="Saved when you leave the box.">
                                                    <textarea id={`notes-${s.key}`} rows={2} defaultValue={s.notes} maxLength={5000} className={`${inputClass} resize-y`}
                                                        onBlur={(e) => { if (e.target.value !== s.notes) act(() => teacherApi.put(`/projects/${project._id}/stages/${s.key}`, { notes: e.target.value })); }} />
                                                </Field>
                                            </div>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ol>
                </>
            )}

            {creating && (
                <Modal title="New research project" onClose={() => setCreating(false)}
                    footer={<><button type="button" onClick={() => setCreating(false)} className={btn.secondary}>Cancel</button><button type="submit" form="project-form" disabled={busy} className={btn.primary}>{busy && <Loader2 size={15} className="animate-spin" />} Create</button></>}>
                    <ProjectForm kinds={kinds} onSubmit={create} busy={busy} error={formError} />
                </Modal>
            )}
            {editing && project && (
                <Modal title="Project details" onClose={() => setEditing(false)}
                    footer={<><button type="button" onClick={remove} className={`${btn.danger} mr-auto`}><Trash2 size={15} /> Delete</button><button type="button" onClick={() => setEditing(false)} className={btn.secondary}>Cancel</button><button type="submit" form="project-form" disabled={busy} className={btn.primary}>{busy && <Loader2 size={15} className="animate-spin" />} Save</button></>}>
                    <ProjectForm initial={project} onSubmit={saveDetails} busy={busy} error={formError} />
                </Modal>
            )}
            {confirmDialog}
        </div>
    );
}
