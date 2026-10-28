/**
 * Research Methodologies → Questionnaire builder (asked 2026-10-27): a popup
 * where a teacher builds the survey for their data collection — Likert-scale
 * statements, multiple-choice, yes / no and open questions, in sections —
 * saved as they type, and downloaded as a Word file to print or share
 * (server: teacher/questionnaire.js). The list of their questionnaires, then
 * one open in the editor, in the same popup.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowUp, ArrowDown, Copy, Trash2, Plus, X, FileType2, Loader2, ClipboardList } from 'lucide-react';
import teacherApi, { messageOf } from './teacherSession';
import { Modal, ErrorNote, Loading, SaveStatus, Badge } from './ui';
import { btn, inputClass, selectClass, fmtDate, fileStem } from './kit';
import useAutosave from './useAutosave';
import useConfirmDialog from '../components/useConfirmDialog';
import Select from '../components/Select';
import { saveBlob } from '../native/saveFile';
import { QUESTION_TYPES, TYPE_LABEL, PLACEHOLDER, STARTERS, blankQuestion } from './content/questionnaireStarters';

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// Each question gets a key of its own on screen; the server is sent none.
let nextKey = 0;
const withKey = (q) => ({ ...q, key: `q${(nextKey += 1)}` });
const forServer = (doc) => ({ title: doc.title, intro: doc.intro, questions: doc.questions.map(({ type, text, options, scale, points }) => ({ type, text, options, scale, points })) });

const useWordDownload = () => {
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const run = async (id, title, before) => {
        setBusy(id); setError('');
        try {
            await before?.();
            const r = await teacherApi.get(`/questionnaires/${id}/docx`, { responseType: 'blob' });
            await saveBlob(new Blob([r.data], { type: DOCX }), `${fileStem(title, 'Questionnaire')}.docx`, { title });
        } catch { setError('The Word file could not be made just now. Please try again.'); } finally { setBusy(''); }
    };
    return { busy, error, run };
};

export default function QuestionnaireBuilder({ onClose, initialId = null }) {
    const [data, setData] = useState(null);       // { questionnaires, scales, limits }
    const [error, setError] = useState('');
    const [openId, setOpenId] = useState(initialId);
    const [title, setTitle] = useState('');
    const [starter, setStarter] = useState(STARTERS[0][0]);
    const [creating, setCreating] = useState(false);
    const [formError, setFormError] = useState('');
    const [confirm, confirmDialog] = useConfirmDialog();
    const word = useWordDownload();

    const load = useCallback(() => teacherApi.get('/questionnaires')
        .then((r) => { setData(r.data); setError(''); })
        .catch((e) => setError(messageOf(e, 'Your questionnaires could not be loaded.'))), []);
    useEffect(() => { load(); }, [load]);

    const create = async (e) => {
        e.preventDefault();
        setFormError('');
        if (title.trim().length < 2) { setFormError('Give the questionnaire a title.'); return; }
        setCreating(true);
        try {
            const start = STARTERS.find(([k]) => k === starter)[2]();
            const r = await teacherApi.post('/questionnaires', { title: title.trim(), ...start });
            setTitle('');
            setOpenId(r.data._id);
        } catch (err) { setFormError(messageOf(err, 'The questionnaire could not be made.')); } finally { setCreating(false); }
    };

    const remove = async (q) => {
        if (!(await confirm({ title: `Delete "${q.title}"?`, message: `Its ${q.questions} ${q.questions === 1 ? 'question is' : 'questions are'} deleted for good. Download the Word file first if you want a copy.`, confirmLabel: 'Delete', destructive: true }))) return;
        try { await teacherApi.delete(`/questionnaires/${q._id}`); await load(); }
        catch (err) { setError(messageOf(err, 'The questionnaire could not be deleted.')); }
    };

    const full = data && data.questionnaires.length >= data.limits.questionnaires;

    return (
        <Modal wide title="Questionnaire builder" labelId="questionnaire-builder-title" onClose={onClose}
            footer={<button type="button" onClick={onClose} className={btn.secondary}>Done</button>}>
            {openId && data ? (
                <Editor id={openId} scales={data.scales} limits={data.limits} onBack={() => { setOpenId(null); load(); }} />
            ) : (
                <div className="space-y-5">
                    <p className="text-sm leading-relaxed text-slate-600">Build the survey for your data collection: Likert-scale statements, multiple-choice, yes / no and open questions, in sections. It is saved as you type, and downloads as a Word file to print or share.</p>
                    <ErrorNote onRetry={data ? undefined : load}>{error}</ErrorNote>
                    <ErrorNote>{word.error}</ErrorNote>
                    {!data && !error && <Loading label="Loading your questionnaires…" />}

                    {data && (
                        <>
                            <form onSubmit={create} className="space-y-3 rounded-xl border border-violet-100 bg-violet-50/40 p-4">
                                <h3 className="text-sm font-semibold text-slate-900">New questionnaire</h3>
                                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                                    <div>
                                        <label htmlFor="new-questionnaire-title" className="mb-1 block text-xs font-semibold text-slate-600">Title</label>
                                        <input id="new-questionnaire-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={data.limits.title} placeholder="e.g. Students' experience of online classes" className={inputClass} disabled={full} />
                                    </div>
                                    <div>
                                        <label htmlFor="new-questionnaire-start" className="mb-1 block text-xs font-semibold text-slate-600">Start with</label>
                                        <Select tone="emerald" id="new-questionnaire-start" value={starter} onChange={(e) => setStarter(e.target.value)} className={selectClass} disabled={full}>
                                            {STARTERS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                                        </Select>
                                    </div>
                                </div>
                                <ErrorNote>{formError}</ErrorNote>
                                {full
                                    ? <p className="text-xs font-semibold text-amber-700">You have {data.limits.questionnaires} questionnaires, the most you can keep. Delete one to make another.</p>
                                    : <button type="submit" disabled={creating} className={btn.primary}>{creating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Create and open</button>}
                            </form>

                            <section aria-labelledby="questionnaire-list-title">
                                <h3 id="questionnaire-list-title" className="mb-2 text-sm font-semibold text-slate-900">Your questionnaires</h3>
                                {!data.questionnaires.length ? (
                                    <p className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500">None yet. Make your first one above.</p>
                                ) : (
                                    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                                        {data.questionnaires.map((q) => (
                                            <li key={q._id} className="flex items-center gap-3 px-3 py-3 sm:px-4">
                                                <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600 sm:flex"><ClipboardList size={17} aria-hidden="true" /></span>
                                                <button type="button" onClick={() => setOpenId(q._id)} className="min-w-0 flex-1 text-left">
                                                    <span className="block truncate text-sm font-semibold text-slate-900 hover:text-emerald-700">{q.title}</span>
                                                    <span className="block text-xs text-slate-500">{q.questions} {q.questions === 1 ? 'question' : 'questions'} · edited {fmtDate(q.updatedAt)}</span>
                                                </button>
                                                <button type="button" onClick={() => word.run(q._id, q.title)} disabled={Boolean(word.busy)} aria-label={`Download ${q.title} as Word`} title="Download as Word"
                                                    className="rounded-lg p-2 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-40">
                                                    {word.busy === q._id ? <Loader2 size={16} className="animate-spin" /> : <FileType2 size={16} />}
                                                </button>
                                                <button type="button" onClick={() => remove(q)} aria-label={`Delete ${q.title}`} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>
                        </>
                    )}
                </div>
            )}
            {confirmDialog}
        </Modal>
    );
}

/** One questionnaire, open: its title, instructions and questions, saved as they change. */
function Editor({ id, scales, limits, onBack }) {
    const [doc, setDoc] = useState(null);
    const [error, setError] = useState('');
    const [confirm, confirmDialog] = useConfirmDialog();
    const word = useWordDownload();
    const listEnd = useRef(null);

    useEffect(() => {
        let live = true;
        teacherApi.get(`/questionnaires/${id}`)
            .then((r) => live && setDoc({ title: r.data.title, intro: r.data.intro || '', questions: (r.data.questions || []).map(withKey) }))
            .catch((e) => live && setError(messageOf(e, 'The questionnaire could not be opened.')));
        return () => { live = false; };
    }, [id]);

    const { queue, flush, status } = useAutosave(useCallback((payload) => teacherApi.put(`/questionnaires/${id}`, payload), [id]));
    const change = (fn) => { const next = fn(doc); setDoc(next); queue(forServer(next)); };
    const setField = (k) => (e) => change((d) => ({ ...d, [k]: e.target.value }));
    const setQuestion = (key, patch) => change((d) => ({ ...d, questions: d.questions.map((q) => (q.key === key ? { ...q, ...patch } : q)) }));
    const move = (i, by) => change((d) => {
        const qs = [...d.questions];
        [qs[i], qs[i + by]] = [qs[i + by], qs[i]];
        return { ...d, questions: qs };
    });
    const add = (type) => {
        change((d) => ({ ...d, questions: [...d.questions, withKey(blankQuestion(type))] }));
        requestAnimationFrame(() => listEnd.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
    };
    const duplicate = (i) => change((d) => ({ ...d, questions: [...d.questions.slice(0, i + 1), withKey({ ...d.questions[i], options: [...d.questions[i].options] }), ...d.questions.slice(i + 1)] }));
    const removeAt = async (i) => {
        const q = doc.questions[i];
        if (q.text.trim() && !(await confirm({ title: 'Delete this question?', message: `"${q.text.trim().slice(0, 120)}"`, confirmLabel: 'Delete', destructive: true }))) return;
        change((d) => ({ ...d, questions: d.questions.filter((x) => x.key !== q.key) }));
    };
    const back = async () => { await flush(); onBack(); };

    if (error) return <div className="space-y-3"><button type="button" onClick={onBack} className={btn.ghost}><ArrowLeft size={14} /> All questionnaires</button><ErrorNote>{error}</ErrorNote></div>;
    if (!doc) return <Loading label="Opening the questionnaire…" />;

    const full = doc.questions.length >= limits.questions;
    // Each question's number: sections are not counted.
    const numbers = doc.questions.reduce((acc, q) => [...acc, q.type === 'section' ? null : acc.filter(Boolean).length + 1], []);

    return (
        <div className="space-y-4">
            {/* Stays at the top of the popup while the questions scroll under it. */}
            <div className="sticky -top-4 z-10 -mx-5 -mt-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-white/95 px-5 py-2.5 backdrop-blur">
                <button type="button" onClick={back} className={btn.ghost}><ArrowLeft size={14} /> All questionnaires</button>
                <div className="flex items-center gap-3">
                    <SaveStatus status={status} />
                    <button type="button" onClick={() => word.run(id, doc.title, flush)} disabled={Boolean(word.busy)} className={btn.primary}>
                        {word.busy ? <Loader2 size={15} className="animate-spin" /> : <FileType2 size={15} />} Download Word
                    </button>
                </div>
            </div>
            <ErrorNote>{word.error}</ErrorNote>

            <div className="space-y-3">
                <div>
                    <label htmlFor="questionnaire-title" className="mb-1 block text-xs font-semibold text-slate-600">Title</label>
                    <input id="questionnaire-title" value={doc.title} onChange={setField('title')} maxLength={limits.title} className={`${inputClass} font-semibold`} />
                </div>
                <div>
                    <label htmlFor="questionnaire-intro" className="mb-1 block text-xs font-semibold text-slate-600">Instructions for the people answering</label>
                    <textarea id="questionnaire-intro" rows={3} value={doc.intro} onChange={setField('intro')} maxLength={limits.intro}
                        placeholder="What the study is about, how long it takes, that answers are anonymous and taking part is voluntary."
                        className={`${inputClass} resize-y`} />
                </div>
            </div>

            <section aria-labelledby="questionnaire-questions-title" className="space-y-2">
                <h3 id="questionnaire-questions-title" className="text-sm font-semibold text-slate-900">Questions <span className="font-normal text-slate-500">({doc.questions.filter((q) => q.type !== 'section').length})</span></h3>
                {!doc.questions.length && <p className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500">No questions yet. Add the first one below.</p>}
                <ol className="space-y-2">
                    {doc.questions.map((q, i) => (
                        <QuestionCard key={q.key} q={q} number={numbers[i]} scales={scales} limits={limits}
                            first={i === 0} last={i === doc.questions.length - 1} full={full}
                            onChange={(patch) => setQuestion(q.key, patch)}
                            onMove={(by) => move(i, by)} onDuplicate={() => duplicate(i)} onRemove={() => removeAt(i)} />
                    ))}
                </ol>
                <div ref={listEnd} />
            </section>

            <section aria-labelledby="questionnaire-add-title" className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <h3 id="questionnaire-add-title" className="mb-2 text-xs font-semibold text-slate-600">{full ? `A questionnaire holds up to ${limits.questions} items.` : 'Add a question'}</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {QUESTION_TYPES.map(([type, label, hint]) => (
                        <button key={type} type="button" onClick={() => add(type)} disabled={full} title={hint}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 disabled:opacity-40">
                            <Plus size={13} aria-hidden="true" /> {label}
                        </button>
                    ))}
                </div>
            </section>
            {confirmDialog}
        </div>
    );
}

function QuestionCard({ q, number, scales, limits, first, last, full, onChange, onMove, onDuplicate, onRemove }) {
    const id = `question-${q.key}`;
    const choice = q.type === 'single' || q.type === 'multiple';
    const setOption = (k, value) => onChange({ options: q.options.map((o, j) => (j === k ? value : o)) });
    const iconBtn = 'rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30';

    return (
        <li className={`rounded-xl border p-3 ${q.type === 'section' ? 'border-violet-200 bg-violet-50/50' : 'border-slate-200 bg-white'}`}>
            <div className="flex flex-wrap items-center gap-2">
                {number ? <Badge tone="bg-emerald-50 text-emerald-700">Q{number}</Badge> : <Badge tone="bg-violet-100 text-violet-700">Section</Badge>}
                <label htmlFor={`${id}-type`} className="sr-only">Question type</label>
                <Select tone="emerald" id={`${id}-type`} value={q.type}
                    onChange={(e) => onChange({ type: e.target.value, options: (e.target.value === 'single' || e.target.value === 'multiple') && !q.options.length ? ['', ''] : q.options })}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {QUESTION_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </Select>
                <span className="ml-auto flex items-center">
                    <button type="button" onClick={() => onMove(-1)} disabled={first} aria-label="Move up" className={iconBtn}><ArrowUp size={15} /></button>
                    <button type="button" onClick={() => onMove(1)} disabled={last} aria-label="Move down" className={iconBtn}><ArrowDown size={15} /></button>
                    <button type="button" onClick={onDuplicate} disabled={full} aria-label="Duplicate" title="Duplicate" className={iconBtn}><Copy size={15} /></button>
                    <button type="button" onClick={onRemove} aria-label="Delete question" className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
                </span>
            </div>

            <label htmlFor={`${id}-text`} className="sr-only">{q.type === 'section' ? 'Section title' : TYPE_LABEL[q.type]}</label>
            {q.type === 'section'
                ? <input id={`${id}-text`} value={q.text} onChange={(e) => onChange({ text: e.target.value })} maxLength={limits.text} placeholder={PLACEHOLDER.section} className={`${inputClass} mt-2 font-semibold`} />
                : <textarea id={`${id}-text`} rows={2} value={q.text} onChange={(e) => onChange({ text: e.target.value })} maxLength={limits.text} placeholder={PLACEHOLDER[q.type]} className={`${inputClass} mt-2 resize-y`} />}

            {q.type === 'likert' && (
                <div className="mt-2 space-y-2">
                    <div className="flex flex-wrap gap-2">
                        <label htmlFor={`${id}-scale`} className="sr-only">Scale</label>
                        <Select tone="emerald" id={`${id}-scale`} value={q.scale} onChange={(e) => onChange({ scale: e.target.value })} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                            {Object.entries(scales).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
                        </Select>
                        <label htmlFor={`${id}-points`} className="sr-only">Points on the scale</label>
                        <Select tone="emerald" id={`${id}-points`} value={String(q.points)} onChange={(e) => onChange({ points: Number(e.target.value) })} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                            <option value="5">5 points</option>
                            <option value="7">7 points</option>
                        </Select>
                    </div>
                    <p className="flex flex-wrap gap-1" aria-label="The answers">
                        {(scales[q.scale]?.[q.points] || []).map((l) => <span key={l} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">{l}</span>)}
                    </p>
                </div>
            )}

            {choice && (
                <div className="mt-2 space-y-1.5">
                    {q.options.map((o, k) => (
                        <div key={k} className="flex items-center gap-2">
                            <span aria-hidden="true" className="w-4 shrink-0 text-center text-slate-400">{q.type === 'single' ? '○' : '☐'}</span>
                            <label htmlFor={`${id}-option-${k}`} className="sr-only">Answer {k + 1}</label>
                            <input id={`${id}-option-${k}`} value={o} onChange={(e) => setOption(k, e.target.value)} maxLength={limits.option} placeholder={`Answer ${k + 1}`} className={`${inputClass} py-1.5`} />
                            <button type="button" onClick={() => onChange({ options: q.options.filter((_, j) => j !== k) })} aria-label={`Remove answer ${k + 1}`} className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><X size={14} /></button>
                        </div>
                    ))}
                    <div className="flex flex-wrap gap-2 pl-6">
                        <button type="button" onClick={() => onChange({ options: [...q.options, ''] })} disabled={q.options.length >= limits.options} className={btn.ghost}><Plus size={13} /> Add an answer</button>
                        {!q.options.some((o) => /^other\b/i.test(o)) && (
                            <button type="button" onClick={() => onChange({ options: [...q.options, 'Other (please specify): ____________'] })} disabled={q.options.length >= limits.options} className={btn.ghost}><Plus size={13} /> Add "Other"</button>
                        )}
                    </div>
                </div>
            )}

            {q.type === 'yesno' && <p className="mt-2 text-xs text-slate-500">☐ Yes &nbsp; ☐ No</p>}
            {(q.type === 'short' || q.type === 'long') && <p className="mt-2 text-xs text-slate-500">{q.type === 'short' ? 'One line to write on.' : 'Four lines to write on.'}</p>}
        </li>
    );
}
