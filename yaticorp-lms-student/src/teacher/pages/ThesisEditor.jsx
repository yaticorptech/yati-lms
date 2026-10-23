/**
 * Thesis Writing, the editor: the chapters down the side, the open chapter's
 * text in the middle — saved as it is typed — and a guide to writing that
 * kind of chapter (its purpose, sections, what to include, mistakes and
 * phrases). Each chapter has a version history and a full-screen focus mode;
 * the whole thesis downloads as a PDF or a Word file. Everything is in the
 * app: no outside service.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileDown, FileType2, Settings2, Plus, ArrowUp, ArrowDown, Trash2, ListTree, ShieldCheck, Loader2, CheckCircle2, XCircle, Quote, ChevronDown, BookOpenText, Maximize2, History } from 'lucide-react';
import { guideForChapter, headingsText } from '../content/chapterGuides';
import teacherApi, { messageOf } from '../teacherSession';
import { Card, Loading, ErrorNote, Modal, Progress, Badge, SaveStatus } from '../ui';
import { btn, inputClass, countWords, fmtNum, fmtDate, fileStem } from '../kit';
import useAutosave from '../useAutosave';
import useFocusTimer from '../useFocusTimer';
import FocusWriter from '../FocusWriter';
import VersionHistory from '../VersionHistory';
import { ThesisDetailsForm } from './ThesisList';
import useConfirmDialog from '../../components/useConfirmDialog';
import { saveBlob } from '../../native/saveFile';

const STATUSES = [['not_started', 'Not started', 'bg-slate-100 text-slate-500'], ['drafting', 'Drafting', 'bg-sky-100 text-sky-700'], ['review', 'In review', 'bg-amber-100 text-amber-700'], ['done', 'Done', 'bg-emerald-100 text-emerald-700']];
const STATUS_OF = Object.fromEntries(STATUSES.map(([k, l, t]) => [k, { label: l, tone: t }]));

export default function ThesisEditor() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [thesis, setThesis] = useState(null);
    const [error, setError] = useState('');
    const [activeId, setActiveId] = useState(null);
    const [content, setContent] = useState('');
    const [actionError, setActionError] = useState('');
    const [showDetails, setShowDetails] = useState(false);
    const [detailsError, setDetailsError] = useState('');
    const [newChapter, setNewChapter] = useState('');
    const [downloading, setDownloading] = useState('');     // 'pdf' | 'docx' while one is being made
    const [focus, setFocus] = useState(false);
    const [history, setHistory] = useState(false);
    const timer = useFocusTimer();
    // The chapter guide: open when a chapter that is nearly empty is opened.
    // Decided once, on opening — not as the words come, or it folded itself
    // away mid-sentence at the 50th word.
    const [guideOpen, setGuideOpen] = useState(true);
    const [confirm, confirmDialog] = useConfirmDialog();

    /** Open a chapter: its text in the editor, its guide shown as suits its length. */
    const openChapter = (chapters, cid) => {
        setActiveId(cid);
        setContent(chapters.find((c) => c._id === cid)?.content || '');
        setGuideOpen(countWords(chapters.find((c) => c._id === cid)?.content) < 50);
    };

    const load = useCallback(() => teacherApi.get(`/theses/${id}`).then((r) => {
        setThesis(r.data);
        setError('');
        openChapter(r.data.chapters, r.data.chapters.find((c) => c.status !== 'done')?._id || r.data.chapters[0]?._id || null);
    }).catch((e) => setError(e.response?.status === 404 ? 'That thesis was not found.' : messageOf(e, 'The thesis could not be loaded.'))), [id]);
    useEffect(() => { load(); }, [load]);

    const chapter = thesis?.chapters.find((c) => c._id === activeId) || null;

    const patchChapter = (cid, changes) => setThesis((t) => ({ ...t, chapters: t.chapters.map((c) => (c._id === cid ? { ...c, ...changes } : c)) }));

    const { queue, flush, status } = useAutosave(useCallback(async ({ cid, text }) => {
        const r = await teacherApi.put(`/theses/${id}/chapters/${cid}`, { content: text });
        setThesis((t) => ({ ...t, words: r.data.words, chapters: t.chapters.map((c) => (c._id === cid ? { ...c, content: text, words: r.data.chapter.words, status: r.data.chapter.status } : c)) }));
    }, [id]));

    const switchTo = async (cid) => { await flush(); openChapter(thesis.chapters, cid); };
    const type = (text) => { setContent(text); queue({ cid: activeId, text }); };
    const closeFocus = useCallback(() => { setFocus(false); flush(); }, [flush]);

    const saveField = async (changes) => {
        if (!chapter) return;
        setActionError('');
        try {
            const r = await teacherApi.put(`/theses/${id}/chapters/${chapter._id}`, changes);
            patchChapter(chapter._id, { ...r.data.chapter, content: chapter._id === activeId ? content : r.data.chapter.content });
        } catch (e) { setActionError(messageOf(e, 'That change could not be saved.')); }
    };

    const structural = async (fn, after) => {
        setActionError('');
        await flush();
        try { const r = await fn(); setThesis(r.data); after?.(r.data); }
        catch (e) { setActionError(messageOf(e, 'That change could not be saved.')); }
    };

    const removeChapter = async (c) => {
        if (!(await confirm({ title: `Delete "${c.title}"?`, message: c.content ? `Its ${fmtNum(countWords(c.content))} words are deleted for good.` : 'The chapter is empty.', confirmLabel: 'Delete', destructive: true }))) return;
        structural(() => teacherApi.delete(`/theses/${id}/chapters/${c._id}`), (t) => openChapter(t.chapters, t.chapters[0]?._id || null));
    };

    const saveDetails = async (f) => {
        setDetailsError('');
        try { const r = await teacherApi.put(`/theses/${id}`, f); setThesis((t) => ({ ...r.data, chapters: t.chapters.map((c) => ({ ...c })) })); setShowDetails(false); }
        catch (e) { setDetailsError(messageOf(e, 'The details could not be saved.')); }
    };
    const removeThesis = async () => {
        if (!(await confirm({ title: `Delete "${thesis.title}"?`, message: 'Every chapter is deleted for good. Download a PDF first if you want a copy.', confirmLabel: 'Delete thesis', destructive: true }))) return;
        try { await teacherApi.delete(`/theses/${id}`); navigate('/teacher/thesis'); }
        catch (e) { setDetailsError(messageOf(e, 'The thesis could not be deleted.')); }
    };

    const TYPES = { pdf: ['application/pdf', 'PDF'], docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Word file'] };
    const download = async (kind) => {
        setDownloading(kind); setActionError('');
        try {
            await flush();
            const r = await teacherApi.get(`/theses/${id}/${kind}`, { responseType: 'blob' });
            await saveBlob(new Blob([r.data], { type: TYPES[kind][0] }), `${fileStem(thesis.title, 'Thesis')}.${kind}`, { title: thesis.title });
        } catch { setActionError(`The ${TYPES[kind][1]} could not be made just now. Please try again.`); } finally { setDownloading(''); }
    };

    const addHeadings = (guide) => {
        const text = headingsText(guide);
        const next = content.trim() ? `${content.trimEnd()}\n\n${text}\n` : `${text}\n`;
        setContent(next);
        queue({ cid: chapter._id, text: next });
    };

    if (error) return <div className="space-y-4"><Link to="/teacher/thesis" className={btn.ghost}><ArrowLeft size={14} /> All theses</Link><ErrorNote onRetry={load}>{error}</ErrorNote></div>;
    if (!thesis) return <Loading label="Opening your thesis…" />;

    const liveWords = chapter ? countWords(content) : 0;
    const totalWords = thesis.chapters.reduce((n, c) => n + (c._id === activeId ? liveWords : countWords(c.content)), 0);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <Link to="/teacher/thesis" className={btn.ghost}><ArrowLeft size={14} /> All theses</Link>
                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => { setDetailsError(''); setShowDetails(true); }} className={btn.secondary}><Settings2 size={15} /> Details</button>
                    <button type="button" onClick={() => download('pdf')} disabled={Boolean(downloading)} className={btn.secondary}>{downloading === 'pdf' ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />} PDF</button>
                    <button type="button" onClick={() => download('docx')} disabled={Boolean(downloading)} className={btn.secondary} title="Download as a Word document (.docx)">{downloading === 'docx' ? <Loader2 size={15} className="animate-spin" /> : <FileType2 size={15} />} Word</button>
                </div>
            </div>

            <Card>
                <h1 className="text-lg font-black text-slate-900 [overflow-wrap:anywhere] sm:text-xl">{thesis.title}</h1>
                <p className="mt-0.5 text-xs text-slate-500">{[thesis.degree, thesis.university, thesis.supervisor && `Supervisor: ${thesis.supervisor}`, thesis.dueDate && `due ${fmtDate(thesis.dueDate)}`].filter(Boolean).join(' · ')}</p>
                <div className="mt-3 flex items-center gap-3"><Progress value={thesis.targetWords ? (totalWords / thesis.targetWords) * 100 : 0} tone="bg-amber-500" label="Thesis words written" /><span className="shrink-0 text-xs font-bold text-slate-600">{fmtNum(totalWords)} / {fmtNum(thesis.targetWords)} words</span></div>
            </Card>

            <ErrorNote>{actionError}</ErrorNote>

            <div className="grid gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
                {/* Chapters */}
                <aside className="min-w-0 space-y-3">
                    <div className="lg:hidden">
                        <label htmlFor="chapter-pick" className="mb-1 block text-xs font-bold text-slate-600">Chapter</label>
                        <select id="chapter-pick" value={activeId || ''} onChange={(e) => switchTo(e.target.value)} className={inputClass}>
                            {thesis.chapters.map((c, i) => <option key={c._id} value={c._id}>{i + 1}. {c.title} ({STATUS_OF[c.status].label})</option>)}
                        </select>
                    </div>
                    <nav aria-label="Chapters" className="hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm lg:block">
                        <ol className="space-y-0.5">
                            {thesis.chapters.map((c, i) => {
                                const words = c._id === activeId ? liveWords : countWords(c.content);
                                return (
                                    <li key={c._id} className="group flex items-center gap-1">
                                        <button type="button" onClick={() => switchTo(c._id)} aria-current={c._id === activeId ? 'true' : undefined}
                                            className={`min-w-0 flex-1 rounded-xl px-2.5 py-2 text-left ${c._id === activeId ? 'bg-amber-50 ring-1 ring-amber-200' : 'hover:bg-slate-50'}`}>
                                            <span className="flex items-center gap-1.5"><span className={`h-2 w-2 shrink-0 rounded-full ${c.status === 'done' ? 'bg-emerald-500' : c.status === 'review' ? 'bg-amber-500' : c.status === 'drafting' ? 'bg-sky-500' : 'bg-slate-300'}`} aria-hidden="true" /><span className="truncate text-sm font-bold text-slate-800">{i + 1}. {c.title}</span></span>
                                            <span className="block pl-3.5 text-[11px] text-slate-400">{fmtNum(words)}{c.targetWords ? ` / ${fmtNum(c.targetWords)}` : ''} words</span>
                                        </button>
                                        <span className="flex flex-col opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                                            <button type="button" disabled={i === 0} onClick={() => structural(() => teacherApi.put(`/theses/${id}/chapters/${c._id}/move`, { direction: 'up' }))} aria-label={`Move ${c.title} up`} className="rounded p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"><ArrowUp size={13} /></button>
                                            <button type="button" disabled={i === thesis.chapters.length - 1} onClick={() => structural(() => teacherApi.put(`/theses/${id}/chapters/${c._id}/move`, { direction: 'down' }))} aria-label={`Move ${c.title} down`} className="rounded p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"><ArrowDown size={13} /></button>
                                        </span>
                                    </li>
                                );
                            })}
                        </ol>
                    </nav>
                    <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!newChapter.trim()) return; structural(() => teacherApi.post(`/theses/${id}/chapters`, { title: newChapter.trim() }), (t) => { openChapter(t.chapters, t.chapters[t.chapters.length - 1]._id); setNewChapter(''); }); }}>
                        <label htmlFor="new-chapter" className="sr-only">New chapter title</label>
                        <input id="new-chapter" value={newChapter} onChange={(e) => setNewChapter(e.target.value)} maxLength={200} placeholder="Add a chapter" className={inputClass} />
                        <button type="submit" className={btn.secondary} aria-label="Add chapter"><Plus size={16} /></button>
                    </form>
                </aside>

                {/* The open chapter */}
                {chapter && (
                    <div className="min-w-0 space-y-3">
                        <Card className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <label htmlFor="chapter-title" className="sr-only">Chapter title</label>
                                <input key={`t-${chapter._id}`} id="chapter-title" defaultValue={chapter.title} maxLength={200}
                                    onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== chapter.title) saveField({ title: v }); }}
                                    className="min-w-0 flex-1 rounded-lg border border-transparent px-2 py-1 text-lg font-black text-slate-900 hover:border-slate-200 focus:border-amber-400 focus:outline-none" />
                                <label htmlFor="chapter-status" className="sr-only">Status</label>
                                <select id="chapter-status" value={chapter.status} onChange={(e) => saveField({ status: e.target.value })} className="rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700">
                                    {STATUSES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                                </select>
                                <button type="button" onClick={() => setFocus(true)} aria-label="Focus mode" title="Focus mode: the chapter alone, full screen" className="rounded-lg p-2 text-slate-500 hover:bg-amber-50 hover:text-amber-700"><Maximize2 size={16} /></button>
                                <button type="button" onClick={() => { flush(); setHistory(true); }} aria-label="Version history" title="Version history" className="rounded-lg p-2 text-slate-500 hover:bg-amber-50 hover:text-amber-700"><History size={16} /></button>
                                <button type="button" onClick={() => removeChapter(chapter)} aria-label={`Delete chapter ${chapter.title}`} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button>
                            </div>
                            <label htmlFor="chapter-text" className="sr-only">Chapter text</label>
                            <textarea id="chapter-text" value={content}
                                onChange={(e) => type(e.target.value)}
                                onBlur={() => flush()}
                                spellCheck
                                className="min-h-[55vh] w-full resize-y rounded-xl border border-slate-200 bg-amber-50/20 px-4 py-3 font-serif text-[15px] leading-7 text-slate-800 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                                placeholder={`Start writing "${chapter.title}"… Leave a blank line between paragraphs.`} />
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                    <span className="shrink-0 text-xs font-bold text-slate-600">{fmtNum(liveWords)} words</span>
                                    {chapter.targetWords > 0 && <><Progress value={(liveWords / chapter.targetWords) * 100} tone="bg-amber-500" label="Chapter target" /><span className="shrink-0 text-xs text-slate-400">target</span></>}
                                    <label htmlFor="chapter-target" className="sr-only">Chapter word target</label>
                                    <input key={`w-${chapter._id}`} id="chapter-target" type="number" min={0} max={200000} step={500} defaultValue={chapter.targetWords}
                                        onBlur={(e) => { const n = Number(e.target.value) || 0; if (n !== chapter.targetWords) saveField({ targetWords: n }); }}
                                        className="w-24 shrink-0 rounded-lg border border-slate-200 px-2 py-1 text-xs" />
                                </div>
                                <SaveStatus status={status} />
                            </div>
                        </Card>

                        {(() => {
                            const guide = guideForChapter(chapter.title);
                            const isOpen = guideOpen;
                            return (
                                <section aria-labelledby="chapter-guide-title" className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
                                    <button type="button" onClick={() => setGuideOpen(!isOpen)} aria-expanded={isOpen}
                                        className="flex w-full items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 text-left">
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white"><BookOpenText size={18} aria-hidden="true" /></span>
                                        <span className="min-w-0 flex-1">
                                            <span id="chapter-guide-title" className="block text-sm font-black text-slate-900">How to write the {guide.name}</span>
                                            <span className="block truncate text-xs text-slate-500">{guide.length}</span>
                                        </span>
                                        <ChevronDown size={18} className={`shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                                    </button>
                                    {isOpen && (
                                        <div className="space-y-4 p-4">
                                            <p className="text-sm leading-relaxed text-slate-700">{guide.purpose}</p>
                                            <div className="grid gap-4 md:grid-cols-2">
                                                <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4">
                                                    <h3 className="mb-2 flex items-center gap-1.5 text-sm font-black text-slate-900"><ListTree size={15} className="text-amber-600" aria-hidden="true" /> Usual sections</h3>
                                                    <ol className="space-y-2">
                                                        {guide.structure.map(([heading, points], i) => (
                                                            <li key={heading}><p className="text-sm font-bold text-slate-800">{i + 1}. {heading}</p><ul className="ml-5 list-disc text-sm text-slate-600">{points.map((pt) => <li key={pt}>{pt}</li>)}</ul></li>
                                                        ))}
                                                    </ol>
                                                    <button type="button" onClick={() => addHeadings(guide)} className={`${btn.secondary} mt-3 w-full`}><Plus size={15} /> Add these headings to the chapter</button>
                                                </div>
                                                <div className="space-y-4">
                                                    <div>
                                                        <h3 className="mb-1.5 text-sm font-black text-slate-900">Make sure you include</h3>
                                                        <ul className="space-y-1.5">{guide.include.map((x) => <li key={x} className="flex gap-2 text-sm text-slate-700"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />{x}</li>)}</ul>
                                                    </div>
                                                    <div>
                                                        <h3 className="mb-1.5 text-sm font-black text-slate-900">Common mistakes</h3>
                                                        <ul className="space-y-1.5">{guide.mistakes.map((x) => <li key={x} className="flex gap-2 text-sm text-slate-700"><XCircle size={15} className="mt-0.5 shrink-0 text-rose-500" aria-hidden="true" />{x}</li>)}</ul>
                                                    </div>
                                                    {guide.phrases.length > 0 && (
                                                        <div>
                                                            <h3 className="mb-1.5 text-sm font-black text-slate-900">Useful phrases</h3>
                                                            <ul className="space-y-1">{guide.phrases.map((x) => <li key={x} className="flex gap-2 font-serif text-sm italic text-slate-700"><Quote size={13} className="mt-1 shrink-0 text-slate-400" aria-hidden="true" />{x}</li>)}</ul>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </section>
                            );
                        })()}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <Link to={`/teacher/plagiarism?thesis=${id}&chapter=${chapter._id}`} onClick={() => flush()} className={btn.ghost}><ShieldCheck size={14} /> Check this chapter for plagiarism</Link>
                        </div>
                        <p className="text-xs text-slate-400">Chapter status: <Badge tone={STATUS_OF[chapter.status].tone}>{STATUS_OF[chapter.status].label}</Badge></p>
                    </div>
                )}
            </div>

            {showDetails && (
                <Modal title="Thesis details" onClose={() => setShowDetails(false)}
                    footer={<><button type="button" onClick={removeThesis} className={`${btn.danger} mr-auto`}><Trash2 size={15} /> Delete</button><button type="button" onClick={() => setShowDetails(false)} className={btn.secondary}>Cancel</button><button type="submit" form="thesis-form" className={btn.primary}>Save</button></>}>
                    <ThesisDetailsForm initial={thesis} onSubmit={saveDetails} error={detailsError} />
                </Modal>
            )}
            {focus && chapter && (
                <FocusWriter title={`${thesis.title} — ${chapter.title}`} value={content} onChange={type} onBlur={() => flush()} onClose={closeFocus}
                    status={status} timer={timer} goal={chapter.targetWords || 0} placeholder="Leave a blank line between paragraphs." />
            )}
            {history && chapter && (
                <VersionHistory base={`/theses/${id}/chapters/${chapter._id}/versions`} title={chapter.title} current={content} beforeSave={flush}
                    onRestored={(r) => { setContent(r.chapter.content || ''); patchChapter(chapter._id, { content: r.chapter.content, words: r.chapter.words }); setThesis((t) => ({ ...t, words: r.words })); }}
                    onClose={() => setHistory(false)} />
            )}
            {confirmDialog}
        </div>
    );
}
