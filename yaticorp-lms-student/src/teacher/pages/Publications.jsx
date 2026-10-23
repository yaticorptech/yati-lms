/**
 * Publications Map: every paper on one board, from idea to published, with
 * the numbers a teacher is asked for — published count, citations, h-index,
 * indexing — and the deadlines coming up — with a step-by-step guide to
 * publishing a paper the standard way. The list downloads as an APA
 * reference list (Word, or copied) and as an Excel sheet for appraisal forms.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookMarked, Plus, Loader2, Search, Trash2, ExternalLink, CalendarClock, Quote, Award, Layers, BookOpenText, ArrowRight, Compass, FileSpreadsheet, FileType2, Copy, ListOrdered } from 'lucide-react';
import teacherApi, { messageOf } from '../teacherSession';
import { PageHeader, Card, CardTitle, StatTile, Loading, ErrorNote, EmptyState, Modal, Field, Badge } from '../ui';
import { btn, inputClass, toDateInput, fmtDate, fmtNum, fileStem } from '../kit';
import useConfirmDialog from '../../components/useConfirmDialog';
import { saveBlob } from '../../native/saveFile';
import StepGuide from '../StepGuide';
import useGuideRead from '../useGuideRead';
import { useTeacher } from '../useTeacher';
import { PUBLISHING_STEPS, STATUS_STEPS, nextStepFor } from '../content/publishing';

/** What the guide says to do for a paper at this status, inside the form. */
const StageTips = ({ status }) => {
    const steps = (STATUS_STEPS[status] || []).map((k) => PUBLISHING_STEPS.find((s) => s.key === k)).filter(Boolean);
    if (!steps.length) return null;
    const [first, ...more] = steps;
    return (
        <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-3">
            <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-violet-700"><Compass size={13} aria-hidden="true" /> At this stage: {first.title}</p>
            <ul className="mt-1.5 space-y-1">
                {first.todo.slice(0, 3).map((t) => <li key={t} className="flex gap-2 text-xs leading-relaxed text-slate-700"><span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-violet-500" />{t}</li>)}
            </ul>
            {more.length > 0 && <p className="mt-1.5 text-xs text-slate-500">Then: {more.map((m) => m.title).join(' · ')}. The full steps are in the guide on the Publications Map.</p>}
        </div>
    );
};

const STATUS = [
    ['idea', 'Idea', 'bg-slate-100 text-slate-600'],
    ['drafting', 'Drafting', 'bg-sky-100 text-sky-700'],
    ['submitted', 'Submitted', 'bg-indigo-100 text-indigo-700'],
    ['under_review', 'Under review', 'bg-violet-100 text-violet-700'],
    ['revision', 'Revision', 'bg-amber-100 text-amber-700'],
    ['accepted', 'Accepted', 'bg-teal-100 text-teal-700'],
    ['published', 'Published', 'bg-emerald-100 text-emerald-700'],
    ['rejected', 'Rejected', 'bg-rose-100 text-rose-700']
];
const STATUS_OF = Object.fromEntries(STATUS.map(([k, l, t]) => [k, { label: l, tone: t }]));
const TYPES = { journal: 'Journal article', conference: 'Conference paper', chapter: 'Book chapter', book: 'Book', patent: 'Patent', preprint: 'Preprint', other: 'Other' };
const INDEXING = ['Scopus', 'Web of Science', 'UGC-CARE', 'PubMed', 'IEEE Xplore', 'Google Scholar', 'Other'];

const blank = { title: '', type: 'journal', status: 'drafting', venue: '', authors: '', year: '', volume: '', issue: '', pages: '', publisher: '', doi: '', url: '', indexing: [], quartile: '', impactFactor: '', citations: '', deadline: '', submittedOn: '', decisionOn: '', publishedOn: '', notes: '' };

const EXPORTS = {
    xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xlsx', 'Excel sheet'],
    docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx', 'Word file']
};

/** Download the publications: every one as Excel, or the APA reference list as Word. */
const useExport = (name) => {
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const run = async (format) => {
        setBusy(format); setError('');
        try {
            const r = await teacherApi.get('/publications/export', { params: { format }, responseType: 'blob' });
            const [type, ext] = EXPORTS[format];
            await saveBlob(new Blob([r.data], { type }), `${fileStem(`Publications ${name || ''}`, 'Publications')}${format === 'docx' ? '_APA' : ''}.${ext}`, { title: 'Publications' });
        } catch { setError(`The ${EXPORTS[format][2]} could not be made just now. Please try again.`); } finally { setBusy(''); }
    };
    return { busy, error, run };
};

/** The APA 7 reference list of accepted and published work: read, copy, or download. */
const ReferenceList = ({ onClose, exporter }) => {
    const [refs, setRefs] = useState(null);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    useEffect(() => {
        teacherApi.get('/publications/references').then((r) => setRefs(r.data.references))
            .catch((e) => setError(messageOf(e, 'The reference list could not be made.')));
    }, []);
    const copy = async () => {
        try { await navigator.clipboard.writeText(refs.map((r) => r.text).join('\n\n')); setCopied(true); setTimeout(() => setCopied(false), 2500); }
        catch { setError('Copying is blocked here. Select the list and copy it, or download the Word file.'); }
    };
    return (
        <Modal wide title="Reference list (APA 7th edition)" labelId="references-title" onClose={onClose}
            footer={<>
                <button type="button" onClick={copy} disabled={!refs?.length} className={`${btn.secondary} mr-auto`}><Copy size={15} /> {copied ? 'Copied' : 'Copy all'}</button>
                <button type="button" onClick={() => exporter.run('docx')} disabled={Boolean(exporter.busy) || !refs?.length} className={btn.primary}>
                    {exporter.busy === 'docx' ? <Loader2 size={15} className="animate-spin" /> : <FileType2 size={15} />} Download Word
                </button>
            </>}>
            <div className="space-y-3">
                <ErrorNote>{error || exporter.error}</ErrorNote>
                <p className="text-xs text-slate-500">Accepted and published work, in alphabetical order with hanging indents, as APA asks. Volume, issue and pages come from each paper&apos;s details — fill them in for complete references.</p>
                {!refs && !error && <Loading label="Making the list…" />}
                {refs && !refs.length && <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">No accepted or published work yet. Set a paper&apos;s status to Accepted or Published to list it here.</p>}
                {refs?.length > 0 && (
                    <ol className="space-y-3">
                        {refs.map((r) => (
                            <li key={r._id} className="pl-8 -indent-8 font-serif text-[15px] leading-7 text-slate-800 [overflow-wrap:anywhere]">
                                {r.segments.map((seg, i) => (seg.italic ? <i key={i}>{seg.text}</i> : <span key={i}>{seg.text}</span>))}
                            </li>
                        ))}
                    </ol>
                )}
            </div>
        </Modal>
    );
};
const toForm = (p) => ({ ...blank, ...p, year: p.year ?? '', impactFactor: p.impactFactor ?? '', citations: p.citations ?? '', deadline: toDateInput(p.deadline), submittedOn: toDateInput(p.submittedOn), decisionOn: toDateInput(p.decisionOn), publishedOn: toDateInput(p.publishedOn), indexing: p.indexing || [] });

const PublicationForm = ({ initial, onSaved, onDeleted, onClose }) => {
    const [f, setF] = useState(initial ? toForm(initial) : blank);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [fieldError, setFieldError] = useState({});
    const [confirm, confirmDialog] = useConfirmDialog();
    const set = (k) => (e) => { setF((x) => ({ ...x, [k]: e.target.value })); setFieldError((x) => ({ ...x, [k]: '' })); };

    const save = async (e) => {
        e.preventDefault();
        setBusy(true); setError(''); setFieldError({});
        try {
            const body = { ...f, citations: f.citations === '' ? 0 : f.citations };
            const r = initial ? await teacherApi.put(`/publications/${initial._id}`, body) : await teacherApi.post('/publications', body);
            onSaved(r.data);
        } catch (err) {
            const field = err.response?.data?.field;
            if (field) setFieldError({ [field]: err.response.data.message }); else setError(messageOf(err, 'The publication could not be saved.'));
        } finally { setBusy(false); }
    };
    const remove = async () => {
        if (!(await confirm({ title: `Delete "${initial.title}"?`, message: 'It is removed from your Publications Map.', confirmLabel: 'Delete', destructive: true }))) return;
        try { await teacherApi.delete(`/publications/${initial._id}`); onDeleted(initial._id); }
        catch (err) { setError(messageOf(err, 'It could not be deleted.')); }
    };

    return (
        <Modal wide title={initial ? 'Edit publication' : 'Add a publication'} labelId="publication-form-title" onClose={onClose}
            footer={<>
                {initial && <button type="button" onClick={remove} className={`${btn.danger} mr-auto`}><Trash2 size={15} /> Delete</button>}
                <button type="button" onClick={onClose} className={btn.secondary}>Cancel</button>
                <button type="submit" form="publication-form" disabled={busy} className={btn.primary}>{busy && <Loader2 size={15} className="animate-spin" />} Save</button>
            </>}>
            <form id="publication-form" onSubmit={save} className="space-y-3" noValidate>
                <ErrorNote>{error}</ErrorNote>
                <Field id="pub-title" label="Title" error={fieldError.title}><input id="pub-title" value={f.title} onChange={set('title')} maxLength={500} className={inputClass} /></Field>
                <div className="grid gap-3 sm:grid-cols-3">
                    <Field id="pub-type" label="Type"><select id="pub-type" value={f.type} onChange={set('type')} className={inputClass}>{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
                    <Field id="pub-status" label="Status"><select id="pub-status" value={f.status} onChange={set('status')} className={inputClass}>{STATUS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
                    <Field id="pub-year" label="Year" optional error={fieldError.year}><input id="pub-year" inputMode="numeric" value={f.year} onChange={set('year')} maxLength={4} className={inputClass} placeholder="2026" /></Field>
                </div>
                <StageTips status={f.status} />
                <div className="grid gap-3 sm:grid-cols-2">
                    <Field id="pub-venue" label="Journal / conference / publisher" optional><input id="pub-venue" value={f.venue} onChange={set('venue')} maxLength={300} className={inputClass} /></Field>
                    <Field id="pub-authors" label="Authors" optional hint="In order, separated by commas — e.g. Asha Rao, Meera Iyer. The reference list writes them in APA form."><input id="pub-authors" value={f.authors} onChange={set('authors')} maxLength={1000} className={inputClass} /></Field>
                </div>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,2fr)]">
                    <Field id="pub-volume" label="Volume" optional><input id="pub-volume" value={f.volume} onChange={set('volume')} maxLength={40} className={inputClass} placeholder="12" /></Field>
                    <Field id="pub-issue" label="Issue" optional><input id="pub-issue" value={f.issue} onChange={set('issue')} maxLength={40} className={inputClass} placeholder="3" /></Field>
                    <Field id="pub-pages" label="Pages" optional><input id="pub-pages" value={f.pages} onChange={set('pages')} maxLength={40} className={inputClass} placeholder="45–60" /></Field>
                    <div className="col-span-3 sm:col-span-1"><Field id="pub-publisher" label="Publisher" optional hint="For a book or chapter."><input id="pub-publisher" value={f.publisher} onChange={set('publisher')} maxLength={200} className={inputClass} /></Field></div>
                </div>
                <fieldset>
                    <legend className="mb-1.5 text-xs font-bold text-slate-600">Indexed in</legend>
                    <div className="flex flex-wrap gap-1.5">
                        {INDEXING.map((i) => {
                            const on = f.indexing.includes(i);
                            return <button key={i} type="button" aria-pressed={on} onClick={() => setF((x) => ({ ...x, indexing: on ? x.indexing.filter((y) => y !== i) : [...x.indexing, i] }))}
                                className={`rounded-full px-3 py-1.5 text-xs font-bold ${on ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>{i}</button>;
                        })}
                    </div>
                </fieldset>
                <div className="grid gap-3 sm:grid-cols-3">
                    <Field id="pub-quartile" label="Quartile" optional><select id="pub-quartile" value={f.quartile} onChange={set('quartile')} className={inputClass}><option value="">—</option>{['Q1', 'Q2', 'Q3', 'Q4'].map((q) => <option key={q}>{q}</option>)}</select></Field>
                    <Field id="pub-if" label="Impact factor" optional error={fieldError.impactFactor}><input id="pub-if" inputMode="decimal" value={f.impactFactor} onChange={set('impactFactor')} className={inputClass} /></Field>
                    <Field id="pub-cites" label="Citations" optional error={fieldError.citations}><input id="pub-cites" inputMode="numeric" value={f.citations} onChange={set('citations')} className={inputClass} /></Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-4">
                    <Field id="pub-deadline" label="Deadline" optional><input id="pub-deadline" type="date" value={f.deadline} onChange={set('deadline')} className={inputClass} /></Field>
                    <Field id="pub-submitted" label="Submitted" optional><input id="pub-submitted" type="date" value={f.submittedOn} onChange={set('submittedOn')} className={inputClass} /></Field>
                    <Field id="pub-decision" label="Decision" optional><input id="pub-decision" type="date" value={f.decisionOn} onChange={set('decisionOn')} className={inputClass} /></Field>
                    <Field id="pub-published" label="Published" optional><input id="pub-published" type="date" value={f.publishedOn} onChange={set('publishedOn')} className={inputClass} /></Field>
                </div>
                <Field id="pub-doi" label="DOI" optional error={fieldError.doi} hint="The DOI printed on the published paper, e.g. 10.1016/j.compedu.2023.104789.">
                    <input id="pub-doi" value={f.doi} onChange={set('doi')} className={inputClass} placeholder="10.1016/…" />
                </Field>
                <Field id="pub-url" label="Link" optional><input id="pub-url" type="url" value={f.url} onChange={set('url')} maxLength={1000} className={inputClass} placeholder="https://" /></Field>
                <Field id="pub-notes" label="Notes" optional><textarea id="pub-notes" rows={3} value={f.notes} onChange={set('notes')} maxLength={5000} className={`${inputClass} resize-y`} placeholder="Reviewer comments, next steps…" /></Field>
            </form>
            {confirmDialog}
        </Modal>
    );
};

export default function Publications() {
    const { teacher } = useTeacher();
    const exporter = useExport(teacher?.name);
    const guideRead = useGuideRead('publishing');
    const [showRefs, setShowRefs] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [editing, setEditing] = useState(null);     // null | 'new' | publication
    const [query, setQuery] = useState('');
    // The publishing guide: open by default until the first paper is added.
    // ?guide=<step> (from the dashboard) opens it at that step.
    const [params] = useSearchParams();
    const linked = PUBLISHING_STEPS.find((s) => s.key === params.get('guide'));
    const [guideOpen, setGuideOpen] = useState(linked ? true : null);
    const [guideStep, setGuideStep] = useState(linked?.key || PUBLISHING_STEPS[0].key);
    const isGuideOpen = guideOpen ?? (data ? !data.publications.length : false);
    const openGuide = (key) => {
        if (key) setGuideStep(key);
        setGuideOpen(true);
        setTimeout(() => document.getElementById('publishing-guide')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    };

    const load = useCallback(() => teacherApi.get('/publications')
        .then((r) => { setData(r.data); setError(''); })
        .catch((e) => setError(messageOf(e, 'Your publications could not be loaded.'))), []);
    useEffect(() => { load(); }, [load]);

    const shown = useMemo(() => (data?.publications || []).filter((p) => !query.trim() || `${p.title} ${p.venue} ${p.authors}`.toLowerCase().includes(query.trim().toLowerCase())), [data, query]);
    const columns = STATUS.map(([k]) => [k, shown.filter((p) => p.status === k)]);
    const years = Object.entries(data?.stats.byYear || {}).sort(([a], [b]) => a - b).slice(-8);
    const maxYear = Math.max(1, ...years.map(([, n]) => n));

    return (
        <div className="space-y-6">
            <PageHeader icon={BookMarked} tone="from-violet-500 to-fuchsia-600" title="Publications Map" subtitle="Every paper, from idea to print."
                actions={<>
                    <button type="button" onClick={() => openGuide()} className={btn.secondary}><BookOpenText size={15} /> How to publish</button>
                    <button type="button" onClick={() => setEditing('new')} className={btn.primary}><Plus size={15} /> Add publication</button>
                </>} />

            <ErrorNote onRetry={load}>{error}</ErrorNote>
            {!data && !error && <Loading label="Loading your publications…" />}

            {data && !data.publications.length && (
                <EmptyState icon={BookMarked} title="Map your publications" action={<button type="button" onClick={() => setEditing('new')} className={btn.primary}><Plus size={15} /> Add your first publication</button>}>
                    Add papers you are planning, writing, submitting or have published. The guide below takes you through publishing, step by step.
                </EmptyState>
            )}

            {data && (
                <StepGuide id="publishing-guide" tone="violet" steps={PUBLISHING_STEPS} open={isGuideOpen} onToggle={() => setGuideOpen(!isGuideOpen)} step={guideStep} onStep={setGuideStep}
                    read={guideRead.read} onToggleRead={guideRead.toggle}
                    title="How to publish a research paper — step by step" subtitle="The standard route: choosing a journal, writing, ethics, submission, peer review, revision and after." />
            )}

            {data && data.publications.length > 0 && (
                <>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <StatTile icon={Award} tone="bg-emerald-50 text-emerald-600" label="Published" value={data.stats.byStatus.published} sub={`${data.stats.total} in all`} />
                        <StatTile icon={Layers} tone="bg-violet-50 text-violet-600" label="In review" value={data.stats.byStatus.submitted + data.stats.byStatus.under_review + data.stats.byStatus.revision} sub={`${data.stats.byStatus.accepted} accepted`} />
                        <StatTile icon={Quote} tone="bg-sky-50 text-sky-600" label="Citations" value={fmtNum(data.stats.citations)} sub="as you entered them" />
                        <StatTile icon={Award} tone="bg-amber-50 text-amber-600" label="h-index" value={data.stats.hIndex} sub="from those citations" />
                    </div>

                    <div className="relative w-full sm:w-72">
                        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, journal, authors" aria-label="Search publications" className={`${inputClass} pl-9`} />
                    </div>

                    {/* The board scrolls sideways inside itself on a narrow screen; the page does not.
                        A phone shows only the stages that hold a paper, so the papers are what it
                        opens on rather than empty columns; a laptop shows the whole pipeline. */}
                    <div className="-mx-4 overflow-x-auto px-4 pb-2 sidebar:mx-0 sidebar:px-0">
                        <div className="grid auto-cols-[minmax(12rem,1fr)] grid-flow-col gap-2.5 sidebar:auto-cols-[minmax(0,1fr)]">
                            {columns.map(([k, list]) => (
                                <section key={k} aria-label={STATUS_OF[k].label} className={`min-w-0 rounded-2xl bg-slate-100/70 p-2 ${list.length ? '' : 'hidden sidebar:block'}`}>
                                    <h2 className="mb-2 flex items-center justify-between px-1 text-[11px] font-black uppercase tracking-wider text-slate-500"><span>{STATUS_OF[k].label}</span><span>{list.length}</span></h2>
                                    <div className="space-y-2">
                                        {list.map((p) => (
                                            <button key={p._id} type="button" onClick={() => setEditing(p)} className="block w-full rounded-xl border border-slate-200 bg-white p-2.5 text-left shadow-sm transition-colors hover:border-violet-300">
                                                <p className="line-clamp-3 text-xs font-bold text-slate-800">{p.title}</p>
                                                {p.venue && <p className="mt-1 line-clamp-1 text-[11px] text-slate-500">{p.venue}</p>}
                                                <div className="mt-1.5 flex flex-wrap gap-1">
                                                    {p.year && <Badge>{p.year}</Badge>}
                                                    {p.quartile && <Badge tone="bg-amber-100 text-amber-700">{p.quartile}</Badge>}
                                                    {(p.indexing || []).slice(0, 2).map((i) => <Badge key={i} tone="bg-emerald-50 text-emerald-700">{i}</Badge>)}
                                                </div>
                                                {p.deadline && !['published', 'rejected', 'accepted'].includes(p.status) && <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-rose-600"><CalendarClock size={12} /> {fmtDate(p.deadline)}</p>}
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-3">
                        <Card>
                            <CardTitle icon={Award}>Published by year</CardTitle>
                            {years.length ? (
                                <div className="flex h-28 items-end gap-2">
                                    {years.map(([y, n]) => (
                                        <div key={y} className="flex flex-1 flex-col items-center gap-1">
                                            <span className="text-[11px] font-bold text-slate-600">{n}</span>
                                            <div className="w-full rounded-t bg-violet-400" style={{ height: `${(n / maxYear) * 80}px` }} />
                                            <span className="text-[10px] font-semibold text-slate-400">{y}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : <p className="text-sm text-slate-500">Published papers with a year appear here.</p>}
                        </Card>
                        <Card>
                            <CardTitle icon={Layers}>Indexing of published work</CardTitle>
                            {Object.keys(data.stats.byIndexing).length ? (
                                <ul className="space-y-1.5">{Object.entries(data.stats.byIndexing).sort((a, b) => b[1] - a[1]).map(([i, n]) => <li key={i} className="flex justify-between text-sm"><span className="text-slate-700">{i}</span><span className="font-black text-slate-900">{n}</span></li>)}</ul>
                            ) : <p className="text-sm text-slate-500">Mark where your published papers are indexed.</p>}
                        </Card>
                        <Card>
                            <CardTitle icon={CalendarClock}>Coming deadlines</CardTitle>
                            {data.stats.upcomingDeadlines.length ? (
                                <ul className="space-y-2">{data.stats.upcomingDeadlines.map((d) => (
                                    <li key={d._id}><button type="button" onClick={() => setEditing(data.publications.find((p) => p._id === d._id))} className="w-full text-left">
                                        <span className="line-clamp-1 text-sm font-bold text-slate-800">{d.title}</span>
                                        <span className="text-xs font-semibold text-rose-600">{fmtDate(d.deadline)} · {STATUS_OF[d.status].label}</span>
                                    </button></li>
                                ))}</ul>
                            ) : <p className="text-sm text-slate-500">Deadlines you set on papers in progress show here.</p>}
                        </Card>
                    </div>

                    <Card>
                        <CardTitle icon={BookMarked}>All publications</CardTitle>
                        <div className="mb-3 flex flex-wrap gap-2">
                            <button type="button" onClick={() => setShowRefs(true)} className={btn.secondary}><ListOrdered size={15} /> Reference list (APA)</button>
                            <button type="button" onClick={() => exporter.run('xlsx')} disabled={Boolean(exporter.busy)} className={btn.secondary}>
                                {exporter.busy === 'xlsx' ? <Loader2 size={15} className="animate-spin" /> : <FileSpreadsheet size={15} />} Excel
                            </button>
                        </div>
                        {!showRefs && <ErrorNote>{exporter.error}</ErrorNote>}
                        <ul className="divide-y divide-slate-100">
                            {shown.map((p) => (
                                <li key={p._id} className="flex flex-wrap items-center gap-2 py-2.5">
                                    <button type="button" onClick={() => setEditing(p)} className="min-w-0 flex-1 text-left">
                                        <span className="block text-sm font-bold text-slate-800 [overflow-wrap:anywhere]">{p.title}</span>
                                        <span className="block text-xs text-slate-500">{[TYPES[p.type], p.venue, p.year].filter(Boolean).join(' · ')}</span>
                                    </button>
                                    <Badge tone={STATUS_OF[p.status].tone}>{STATUS_OF[p.status].label}</Badge>
                                    {nextStepFor(p.status) && (
                                        <button type="button" onClick={() => openGuide(nextStepFor(p.status).key)} className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-700 hover:bg-violet-100"
                                            aria-label={`Next step for ${p.title}: ${nextStepFor(p.status).title}`}>
                                            Next: {nextStepFor(p.status).title} <ArrowRight size={11} aria-hidden="true" />
                                        </button>
                                    )}
                                    {(p.url || p.doi) && <a href={p.url || `https://doi.org/${p.doi}`} target="_blank" rel="noreferrer noopener" aria-label={`Open ${p.title}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><ExternalLink size={15} /></a>}
                                </li>
                            ))}
                        </ul>
                    </Card>
                </>
            )}

            {showRefs && <ReferenceList exporter={exporter} onClose={() => setShowRefs(false)} />}
            {editing && (
                <PublicationForm initial={editing === 'new' ? null : editing} onClose={() => setEditing(null)}
                    onSaved={() => { setEditing(null); load(); }}
                    onDeleted={() => { setEditing(null); load(); }} />
            )}
        </div>
    );
}
