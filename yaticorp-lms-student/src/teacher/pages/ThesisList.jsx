/**
 * Thesis Writing, the list: each thesis with how far it has come. A new one
 * starts with the usual nine chapters and their word targets.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, Plus, Loader2, CalendarDays, ArrowRight } from 'lucide-react';
import teacherApi, { messageOf } from '../teacherSession';
import { PageHeader, Loading, ErrorNote, EmptyState, Modal, Field, Progress } from '../ui';
import { btn, inputClass, fmtDate, fmtNum } from '../kit';

export const ThesisDetailsForm = ({ initial, onSubmit, error }) => {
    const [f, setF] = useState({
        title: initial?.title || '', degree: initial?.degree || 'PhD', university: initial?.university || '', supervisor: initial?.supervisor || '',
        field: initial?.field || '', targetWords: initial?.targetWords ?? 80000, dueDate: initial?.dueDate ? new Date(initial.dueDate).toISOString().slice(0, 10) : ''
    });
    const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
    return (
        <form id="thesis-form" onSubmit={(e) => { e.preventDefault(); onSubmit({ ...f, targetWords: Number(f.targetWords) || 0, dueDate: f.dueDate || null }); }} className="space-y-3">
            <ErrorNote>{error}</ErrorNote>
            <Field id="thesis-title" label="Working title"><input id="thesis-title" required minLength={3} maxLength={400} value={f.title} onChange={set('title')} className={inputClass} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
                <Field id="thesis-degree" label="Degree" optional><input id="thesis-degree" maxLength={100} value={f.degree} onChange={set('degree')} className={inputClass} placeholder="PhD, M.Phil, M.Tech…" /></Field>
                <Field id="thesis-field" label="Field" optional><input id="thesis-field" maxLength={200} value={f.field} onChange={set('field')} className={inputClass} /></Field>
                <Field id="thesis-university" label="University" optional><input id="thesis-university" maxLength={200} value={f.university} onChange={set('university')} className={inputClass} /></Field>
                <Field id="thesis-supervisor" label="Supervisor" optional><input id="thesis-supervisor" maxLength={200} value={f.supervisor} onChange={set('supervisor')} className={inputClass} /></Field>
                <Field id="thesis-target" label="Target words"><input id="thesis-target" type="number" min={0} max={1000000} step={1000} value={f.targetWords} onChange={set('targetWords')} className={inputClass} /></Field>
                <Field id="thesis-due" label="Submission date" optional><input id="thesis-due" type="date" value={f.dueDate} onChange={set('dueDate')} className={inputClass} /></Field>
            </div>
        </form>
    );
};

export default function ThesisList() {
    const navigate = useNavigate();
    const [theses, setTheses] = useState(null);
    const [error, setError] = useState('');
    const [creating, setCreating] = useState(false);
    const [busy, setBusy] = useState(false);
    const [formError, setFormError] = useState('');

    const load = useCallback(() => teacherApi.get('/theses')
        .then((r) => { setTheses(r.data.theses); setError(''); })
        .catch((e) => setError(messageOf(e, 'Your theses could not be loaded.'))), []);
    useEffect(() => { load(); }, [load]);

    const create = async (f) => {
        setBusy(true); setFormError('');
        try { const r = await teacherApi.post('/theses', f); navigate(`/teacher/thesis/${r.data._id}`); }
        catch (e) { setFormError(messageOf(e, 'The thesis could not be created.')); setBusy(false); }
    };

    return (
        <div className="space-y-6">
            <PageHeader icon={FileText} tone="from-amber-500 to-orange-600" title="Thesis Writing" subtitle="Learn how each chapter is written, then write it here — with word targets and a PDF draft."
                actions={theses?.length > 0 && <button type="button" onClick={() => setCreating(true)} className={btn.secondary}><Plus size={15} /> New thesis</button>} />
            <ErrorNote onRetry={load}>{error}</ErrorNote>
            {!theses && !error && <Loading label="Loading your theses…" />}
            {theses && !theses.length && (
                <EmptyState icon={FileText} title="Start your thesis" action={<button type="button" onClick={() => setCreating(true)} className={btn.primary}><Plus size={15} /> Start a thesis</button>}>
                    It begins with the usual chapters — abstract, introduction, literature review, methodology, results, discussion, conclusion — each with a word target you can change.
                </EmptyState>
            )}
            {theses?.length > 0 && (
                <div className="grid gap-3 md:grid-cols-2">
                    {theses.map((t) => (
                        <Link key={t._id} to={`/teacher/thesis/${t._id}`} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md">
                            <p className="text-base font-black text-slate-900 [overflow-wrap:anywhere]">{t.title}</p>
                            <p className="mt-0.5 text-xs text-slate-500">{[t.degree, t.university].filter(Boolean).join(' · ')}</p>
                            <div className="mt-3 flex items-center gap-3"><Progress value={t.targetWords ? (t.words / t.targetWords) * 100 : 0} tone="bg-amber-500" label="Words written" /><span className="shrink-0 text-xs font-bold text-slate-500">{fmtNum(t.words)} / {fmtNum(t.targetWords)}</span></div>
                            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                                <span>{t.chaptersDone} of {t.chapters} chapters done{t.dueDate ? <> · <CalendarDays size={12} className="inline" /> {fmtDate(t.dueDate)}</> : ''}</span>
                                <span className="inline-flex items-center gap-1 font-bold text-amber-700">Open <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" /></span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
            {creating && (
                <Modal title="New thesis" onClose={() => setCreating(false)}
                    footer={<><button type="button" onClick={() => setCreating(false)} className={btn.secondary}>Cancel</button><button type="submit" form="thesis-form" disabled={busy} className={btn.primary}>{busy && <Loader2 size={15} className="animate-spin" />} Create</button></>}>
                    <ThesisDetailsForm onSubmit={create} error={formError} />
                </Modal>
            )}
        </div>
    );
}
