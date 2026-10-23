/**
 * Plagiarism Check: how much of a text matches other documents on YATICORP
 * (other teachers' theses and writing, and the teacher's own), shown passage
 * by passage, plus quotations that have no citation beside them.
 *
 * What it can and cannot see is said on the page: it compares with what is
 * written on this platform and with the papers the teacher has uploaded
 * (PlagiarismSources), not the whole internet or the journals.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShieldCheck, Loader2, FileText, PenLine, ClipboardPaste, Trash2, Info, Quote, History } from 'lucide-react';
import teacherApi, { messageOf } from '../teacherSession';
import { PageHeader, Card, CardTitle, ErrorNote, Badge } from '../ui';
import { btn, inputClass, countWords, fmtDate, fmtNum } from '../kit';
import useConfirmDialog from '../../components/useConfirmDialog';
import StepGuide from '../StepGuide';
import PlagiarismSources from '../PlagiarismSources';
import useGuideRead from '../useGuideRead';
import { PLAGIARISM_STEPS } from '../content/plagiarism';

const MIN_WORDS = 30;
const tone = (score) => (score >= 25 ? { ring: '#e11d48', label: 'High similarity', chip: 'bg-rose-100 text-rose-700' }
    : score >= 10 ? { ring: '#d97706', label: 'Some similarity', chip: 'bg-amber-100 text-amber-700' }
        : { ring: '#059669', label: 'Low similarity', chip: 'bg-emerald-100 text-emerald-700' });

/** The checked text, with matched passages and flagged quotations marked. */
const Highlighted = ({ text, matches, flags }) => {
    const parts = useMemo(() => {
        const marks = [
            ...matches.map((m) => ({ start: m.start, end: m.end, kind: m.own ? 'own' : 'other', title: m.source })),
            ...flags.map((f) => ({ start: f.start, end: f.end, kind: 'flag', title: f.message }))
        ].sort((a, b) => a.start - b.start);
        const out = [];
        let at = 0;
        for (const m of marks) {
            if (m.start < at) continue;            // overlapping marks: the first wins
            if (m.start > at) out.push({ text: text.slice(at, m.start) });
            out.push({ text: text.slice(m.start, m.end), ...m });
            at = m.end;
        }
        if (at < text.length) out.push({ text: text.slice(at) });
        return out;
    }, [text, matches, flags]);
    const cls = { other: 'bg-rose-100 text-rose-900 decoration-rose-400', own: 'bg-amber-100 text-amber-900', flag: 'underline decoration-orange-500 decoration-wavy underline-offset-4' };
    return (
        <div className="max-h-[32rem] overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-4 font-serif text-[15px] leading-7 text-slate-800">
            {parts.map((p, i) => (p.kind ? <mark key={i} title={p.title} className={`rounded px-0.5 ${cls[p.kind]}`}>{p.text}</mark> : <span key={i}>{p.text}</span>))}
        </div>
    );
};

const Report = ({ report }) => {
    const t = tone(report.score);
    const others = Math.round((report.score - report.ownScore) * 10) / 10;
    return (
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-[auto_minmax(0,1fr)]">
                <div className="flex items-center gap-4">
                    <div className="relative h-28 w-28 shrink-0">
                        <svg viewBox="0 0 36 36" className="h-28 w-28 -rotate-90" aria-hidden="true">
                            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f1f5f9" strokeWidth="3.5" />
                            <circle cx="18" cy="18" r="15.5" fill="none" stroke={t.ring} strokeWidth="3.5" strokeLinecap="round" strokeDasharray={`${(Math.min(100, report.score) / 100) * 97.4} 97.4`} />
                        </svg>
                        <span className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-2xl font-black text-slate-900">{report.score}%</span><span className="text-[10px] font-bold text-slate-400">similar</span></span>
                    </div>
                    <div className="min-w-0 md:hidden"><Badge tone={t.chip}>{t.label}</Badge></div>
                </div>
                <div className="min-w-0 space-y-2">
                    <div className="hidden md:block"><Badge tone={t.chip}>{t.label}</Badge></div>
                    <p className="text-sm font-bold text-slate-800 [overflow-wrap:anywhere]">{report.title}</p>
                    <ul className="grid gap-1 text-sm text-slate-600 sm:grid-cols-2">
                        <li><span className="inline-block h-2.5 w-2.5 rounded-sm bg-rose-300 align-middle" aria-hidden="true" /> Found in others&apos; work (YATICORP and your uploaded papers): <strong>{others}%</strong></li>
                        <li><span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-300 align-middle" aria-hidden="true" /> Found in your own documents: <strong>{report.ownScore}%</strong></li>
                        <li>Words checked: <strong>{fmtNum(report.words)}</strong></li>
                        <li>Documents compared: <strong>{fmtNum(report.documentsCompared)}</strong></li>
                        <li>Citations found: <strong>{report.citations?.found ?? 0}</strong></li>
                        <li>Quotations without a citation: <strong>{report.flags?.length || 0}</strong></li>
                    </ul>
                </div>
            </div>

            {report.sources?.length > 0 && (
                <div>
                    <h3 className="mb-1.5 text-xs font-black uppercase tracking-wider text-slate-500">Where the matches are</h3>
                    <ul className="space-y-1">
                        {report.sources.map((s, i) => <li key={`${s.label}-${i}`} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-sm"><span className={`min-w-0 truncate ${s.own ? 'text-amber-800' : 'text-rose-800'}`}>{s.label}</span><span className="shrink-0 font-bold text-slate-600">{fmtNum(s.words)} words</span></li>)}
                    </ul>
                </div>
            )}

            {report.text && <Highlighted text={report.text} matches={report.matches || []} flags={report.flags || []} />}

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                <p className="font-bold text-slate-800">What to do with a match</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                    <li>Someone else&apos;s words: put them in quotation marks and cite the source, or rewrite the idea in your own words — and still cite it.</li>
                    <li>Your own earlier work: reusing it is fine within a thesis, but a paper usually needs it rewritten or cited (self-plagiarism).</li>
                    <li>A wavy underline marks a quotation with no citation in its sentence.</li>
                </ul>
            </div>
        </div>
    );
};

export default function Plagiarism() {
    const [params] = useSearchParams();
    const [mode, setMode] = useState(params.get('thesis') ? 'thesis' : params.get('writing') ? 'writing' : 'paste');
    const [title, setTitle] = useState('');
    const [text, setText] = useState('');
    const [theses, setTheses] = useState([]);
    const [thesisId, setThesisId] = useState(params.get('thesis') || '');
    const [chapters, setChapters] = useState([]);
    const [chapterId, setChapterId] = useState(params.get('chapter') || '');
    const [pieces, setPieces] = useState([]);
    const [pieceId, setPieceId] = useState(params.get('writing') || '');
    const [checking, setChecking] = useState(false);
    const [error, setError] = useState('');
    const [report, setReport] = useState(null);
    const [history, setHistory] = useState([]);
    // "Understanding plagiarism": open until the teacher has run a check.
    const [guideOpen, setGuideOpen] = useState(null);
    const [guideStep, setGuideStep] = useState(PLAGIARISM_STEPS[0].key);
    const isGuideOpen = guideOpen ?? history.length === 0;
    const guideRead = useGuideRead('plagiarism');
    const [sourceCount, setSourceCount] = useState(0);
    const [confirm, confirmDialog] = useConfirmDialog();

    const loadHistory = useCallback(() => teacherApi.get('/plagiarism/reports').then((r) => setHistory(r.data.reports)).catch(() => {}), []);
    useEffect(() => {
        loadHistory();
        teacherApi.get('/theses').then((r) => { setTheses(r.data.theses); setThesisId((id) => id || r.data.theses[0]?._id || ''); }).catch(() => {});
        teacherApi.get('/writing').then((r) => { setPieces(r.data.pieces); setPieceId((id) => id || r.data.pieces[0]?._id || ''); }).catch(() => {});
    }, [loadHistory]);
    useEffect(() => {
        if (!thesisId) return;
        teacherApi.get(`/theses/${thesisId}`).then((r) => {
            setChapters(r.data.chapters);
            setChapterId((id) => (r.data.chapters.some((c) => c._id === id) ? id : r.data.chapters.find((c) => c.words >= MIN_WORDS)?._id || r.data.chapters[0]?._id || ''));
        }).catch(() => setChapters([]));
    }, [thesisId]);

    const check = useCallback(async () => {
        setError(''); setChecking(true);
        try {
            const body = mode === 'paste' ? { text, title: title.trim() || undefined }
                : mode === 'thesis' ? { source: { kind: 'thesis', id: thesisId, chapterId } }
                    : { source: { kind: 'writing', id: pieceId } };
            const r = await teacherApi.post('/plagiarism/check', body);
            setReport(r.data);
            loadHistory();
            setTimeout(() => document.getElementById('plagiarism-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
        } catch (e) { setError(messageOf(e, 'The check could not be run just now.')); } finally { setChecking(false); }
    }, [mode, text, title, thesisId, chapterId, pieceId, loadHistory]);

    // Opened from a chapter or a piece ("Check this chapter"): run straight away, once.
    const autoRan = useRef(false);
    useEffect(() => {
        if (autoRan.current) return;
        if ((params.get('chapter') && chapterId && chapters.length) || (params.get('writing') && pieceId)) {
            autoRan.current = true;
            queueMicrotask(check);
        }
    }, [params, chapterId, chapters.length, pieceId, check]);

    const openReport = async (id) => {
        setError('');
        try { const r = await teacherApi.get(`/plagiarism/reports/${id}`); setReport(r.data); setTimeout(() => document.getElementById('plagiarism-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); }
        catch (e) { setError(messageOf(e, 'That report could not be opened.')); }
    };
    const removeReport = async (r) => {
        if (!(await confirm({ title: 'Delete this report?', message: `"${r.title}" — ${r.score}% similar, ${fmtDate(r.createdAt)}.`, confirmLabel: 'Delete', destructive: true }))) return;
        try { await teacherApi.delete(`/plagiarism/reports/${r._id}`); if (report?._id === r._id) setReport(null); loadHistory(); }
        catch (e) { setError(messageOf(e, 'The report could not be deleted.')); }
    };

    const pastedWords = countWords(text);
    const chosenChapter = chapters.find((c) => c._id === chapterId);
    const ready = mode === 'paste' ? pastedWords >= MIN_WORDS : mode === 'thesis' ? !!chapterId : !!pieceId;

    return (
        <div className="space-y-6">
            <PageHeader icon={ShieldCheck} tone="from-slate-600 to-slate-800" title="Plagiarism Check" subtitle="Find copied passages and quotations that need a citation." />

            <StepGuide id="plagiarism-guide" tone="slate" icon={ShieldCheck} steps={PLAGIARISM_STEPS} open={isGuideOpen} onToggle={() => setGuideOpen(!isGuideOpen)} step={guideStep} onStep={setGuideStep}
                read={guideRead.read} onToggleRead={guideRead.toggle}
                title="Understanding and avoiding plagiarism" subtitle="What counts, paraphrasing and citing, citation styles, self-plagiarism, UGC rules and a checklist." />

            <p className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
                <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>This compares your text with the theses and writing on YATICORP — other teachers&apos; (without showing whose) and your own — and with {sourceCount ? <strong>the {sourceCount} {sourceCount === 1 ? 'paper' : 'papers'} you uploaded</strong> : 'any papers you upload below'}. It does not search the internet or journal databases, so use your university&apos;s checker (such as Turnitin or Urkund) before final submission.</span>
            </p>

            <Card>
                <div role="tablist" aria-label="What to check" className="mb-4 grid grid-cols-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1">
                    {[['paste', 'Paste text', ClipboardPaste], ['thesis', 'A thesis chapter', FileText], ['writing', 'A writing piece', PenLine]].map(([id, label, Icon]) => (
                        <button key={id} type="button" role="tab" aria-selected={mode === id} onClick={() => setMode(id)}
                            className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold sm:text-sm ${mode === id ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800'}`}>
                            <Icon size={15} aria-hidden="true" /> <span className="truncate">{label}</span>
                        </button>
                    ))}
                </div>

                {mode === 'paste' && (
                    <div className="space-y-3">
                        <label htmlFor="check-title" className="sr-only">Title</label>
                        <input id="check-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={300} placeholder="A name for this check (optional)" className={inputClass} />
                        <label htmlFor="check-text" className="sr-only">Text to check</label>
                        <textarea id="check-text" rows={10} value={text} onChange={(e) => setText(e.target.value)} className={`${inputClass} resize-y font-serif text-[15px] leading-7`} placeholder={`Paste at least ${MIN_WORDS} words…`} />
                        <p className={`text-xs ${pastedWords && pastedWords < MIN_WORDS ? 'text-amber-600' : 'text-slate-500'}`}>{fmtNum(pastedWords)} words{pastedWords < MIN_WORDS ? ` — at least ${MIN_WORDS} needed` : ' · up to 25,000 per check'}</p>
                    </div>
                )}
                {mode === 'thesis' && (theses.length ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div><label htmlFor="check-thesis" className="mb-1.5 block text-xs font-bold text-slate-600">Thesis</label>
                            <select id="check-thesis" value={thesisId} onChange={(e) => setThesisId(e.target.value)} className={inputClass}>{theses.map((t) => <option key={t._id} value={t._id}>{t.title}</option>)}</select></div>
                        <div><label htmlFor="check-chapter" className="mb-1.5 block text-xs font-bold text-slate-600">Chapter</label>
                            <select id="check-chapter" value={chapterId} onChange={(e) => setChapterId(e.target.value)} className={inputClass}>{chapters.map((c) => <option key={c._id} value={c._id}>{c.title} ({fmtNum(c.words)} words)</option>)}</select></div>
                        {chosenChapter && chosenChapter.words < MIN_WORDS && <p className="text-xs text-amber-600 sm:col-span-2">This chapter has fewer than {MIN_WORDS} words — write a little more first.</p>}
                    </div>
                ) : <p className="text-sm text-slate-500">You have no thesis yet. Start one in Thesis Writing, or paste text instead.</p>)}
                {mode === 'writing' && (pieces.length ? (
                    <div><label htmlFor="check-piece" className="mb-1.5 block text-xs font-bold text-slate-600">Piece</label>
                        <select id="check-piece" value={pieceId} onChange={(e) => setPieceId(e.target.value)} className={inputClass}>{pieces.map((p) => <option key={p._id} value={p._id}>{p.title} ({fmtNum(p.words)} words)</option>)}</select></div>
                ) : <p className="text-sm text-slate-500">You have no writing pieces yet. Paste text instead.</p>)}

                <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button type="button" onClick={check} disabled={checking || !ready} className={btn.primary}>{checking ? <><Loader2 size={15} className="animate-spin" /> Checking…</> : <><ShieldCheck size={15} /> Check now</>}</button>
                </div>
                <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>
            </Card>

            <PlagiarismSources onCount={setSourceCount} />

            {report && (
                <Card id="plagiarism-result" className="scroll-mt-24">
                    <CardTitle icon={ShieldCheck}>Result</CardTitle>
                    <Report report={report} />
                </Card>
            )}

            {history.length > 0 && (
                <Card>
                    <CardTitle icon={History}>Earlier checks</CardTitle>
                    <ul className="divide-y divide-slate-100">
                        {history.map((r) => (
                            <li key={r._id} className="flex items-center gap-2 py-2">
                                <button type="button" onClick={() => openReport(r._id)} className="min-w-0 flex-1 text-left">
                                    <span className="block truncate text-sm font-bold text-slate-800">{r.title}</span>
                                    <span className="text-xs text-slate-500">{fmtDate(r.createdAt)} · {fmtNum(r.words)} words</span>
                                </button>
                                <Badge tone={tone(r.score).chip}>{r.score}%</Badge>
                                <button type="button" onClick={() => removeReport(r)} aria-label={`Delete report ${r.title}`} className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}
            {!history.length && !report && (
                <p className="flex items-center gap-2 text-sm text-slate-500"><Quote size={15} aria-hidden="true" /> Your checks are kept here so you can compare drafts over time.</p>
            )}
            {confirmDialog}
        </div>
    );
}
