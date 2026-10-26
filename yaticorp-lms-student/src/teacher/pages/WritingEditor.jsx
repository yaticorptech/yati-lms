/**
 * One piece of independent writing: a quiet page that saves as it is typed,
 * a word goal, a 25-minute focus timer, focus mode (the page alone, full
 * screen) and the piece's version history.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trash2, ShieldCheck, Maximize2, History, Eraser } from 'lucide-react';
import teacherApi, { messageOf } from '../teacherSession';
import { Card, Loading, ErrorNote, Progress, SaveStatus } from '../ui';
import { btn, countWords, fmtNum, WRITING_KINDS as KINDS } from '../kit';
import useAutosave from '../useAutosave';
import useFocusTimer from '../useFocusTimer';
import FocusTimer from '../FocusTimer';
import FocusWriter from '../FocusWriter';
import VersionHistory from '../VersionHistory';
import useConfirmDialog from '../../components/useConfirmDialog';
import Select from '../../components/Select';

export default function WritingEditor() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [piece, setPiece] = useState(null);
    const [content, setContent] = useState('');
    const [error, setError] = useState('');
    const [actionError, setActionError] = useState('');
    const [focus, setFocus] = useState(false);
    const [history, setHistory] = useState(false);
    const timer = useFocusTimer();
    const [confirm, confirmDialog] = useConfirmDialog();

    useEffect(() => {
        teacherApi.get(`/writing/${id}`).then((r) => { setPiece(r.data); setContent(r.data.content || ''); })
            .catch((e) => setError(e.response?.status === 404 ? 'That piece was not found.' : messageOf(e, 'The piece could not be opened.')));
    }, [id]);

    const { queue, flush, status } = useAutosave(useCallback((text) => teacherApi.put(`/writing/${id}`, { content: text }), [id]));
    const type = (text) => { setContent(text); queue(text); };
    const closeFocus = useCallback(() => { setFocus(false); flush(); }, [flush]);

    const saveMeta = async (changes) => {
        setActionError('');
        try { const r = await teacherApi.put(`/writing/${id}`, changes); setPiece((p) => ({ ...p, title: r.data.title, kind: r.data.kind, wordGoal: r.data.wordGoal })); }
        catch (e) { setActionError(messageOf(e, 'That change could not be saved.')); }
    };
    /** Empty the piece. Its text is kept in History first, so it can come back. */
    const clear = async () => {
        if (!content.trim()) return;
        if (!(await confirm({ title: `Clear "${piece.title}"?`, message: `Its ${fmtNum(countWords(content))} words are removed. They are kept in History, so you can bring them back.`, confirmLabel: 'Clear', destructive: true }))) return;
        setActionError('');
        try {
            await flush();
            await teacherApi.post(`/writing/${id}/versions`, { label: 'Before clearing' });
            type('');
            await flush();
        } catch (e) { setActionError(messageOf(e, 'The piece could not be cleared.')); }
    };

    const remove = async () => {
        if (!(await confirm({ title: `Delete "${piece.title}"?`, message: 'The piece is deleted for good.', confirmLabel: 'Delete', destructive: true }))) return;
        try { await teacherApi.delete(`/writing/${id}`); navigate('/teacher/writing'); }
        catch (e) { setActionError(messageOf(e, 'It could not be deleted.')); }
    };

    if (error) return <div className="space-y-4"><Link to="/teacher/writing" className={btn.ghost}><ArrowLeft size={14} /> All writing</Link><ErrorNote>{error}</ErrorNote></div>;
    if (!piece) return <Loading label="Opening…" />;

    const words = countWords(content);
    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <Link to="/teacher/writing" onClick={() => flush()} className={btn.ghost}><ArrowLeft size={14} /> All writing</Link>
                <div className="flex flex-wrap items-center gap-2">
                    <FocusTimer timer={timer} />
                    <button type="button" onClick={() => setFocus(true)} aria-label="Focus mode" className={btn.secondary}><Maximize2 size={15} /> <span className="hidden sm:inline">Focus</span></button>
                    <button type="button" onClick={() => { flush(); setHistory(true); }} aria-label="History" className={btn.secondary}><History size={15} /> <span className="hidden sm:inline">History</span></button>
                    <button type="button" onClick={clear} disabled={!content.trim()} title="Clear the text (kept in History)" aria-label="Clear" className={btn.secondary}><Eraser size={15} /> <span className="hidden sm:inline">Clear</span></button>
                    <Link to={`/teacher/plagiarism?writing=${id}`} onClick={() => flush()} aria-label="Check for plagiarism" className={btn.secondary}><ShieldCheck size={15} /> <span className="hidden sm:inline">Check</span></Link>
                    <button type="button" onClick={remove} aria-label="Delete this piece" className={btn.danger}><Trash2 size={15} /></button>
                </div>
            </div>
            <ErrorNote>{actionError}</ErrorNote>
            <Card className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                    <label htmlFor="piece-title-edit" className="sr-only">Title</label>
                    <input id="piece-title-edit" defaultValue={piece.title} maxLength={300} onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== piece.title) saveMeta({ title: v }); }}
                        className="min-w-0 flex-1 rounded-lg border border-transparent px-2 py-1 text-xl font-semibold text-slate-900 hover:border-slate-200 focus:border-rose-400 focus:outline-none" />
                    <label htmlFor="piece-kind-edit" className="sr-only">Kind</label>
                    <Select tone="emerald" id="piece-kind-edit" value={piece.kind} onChange={(e) => saveMeta({ kind: e.target.value })} className="rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700">
                        {Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </Select>
                </div>
                <label htmlFor="piece-text" className="sr-only">Your writing</label>
                <textarea id="piece-text" value={content} spellCheck
                    onChange={(e) => type(e.target.value)} onBlur={() => flush()}
                    className="min-h-[60vh] w-full resize-y rounded-xl border border-slate-200 bg-rose-50/10 px-4 py-3 font-serif text-[16px] leading-8 text-slate-800 focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-300/30"
                    placeholder="Start writing. Don't edit yet; just get the words down." />
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                        <span className="shrink-0 text-xs font-semibold text-slate-600">{fmtNum(words)} words</span>
                        {piece.wordGoal > 0 && <Progress value={(words / piece.wordGoal) * 100} tone="bg-rose-400" label="Word goal" />}
                        <label htmlFor="piece-goal" className="shrink-0 text-xs text-slate-400">Goal</label>
                        <input id="piece-goal" type="number" min={0} max={200000} step={100} defaultValue={piece.wordGoal || ''} placeholder="—"
                            onBlur={(e) => { const n = Number(e.target.value) || 0; if (n !== piece.wordGoal) saveMeta({ wordGoal: n }); }}
                            className="w-24 shrink-0 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                    </div>
                    <SaveStatus status={status} />
                </div>
            </Card>
            {focus && (
                <FocusWriter title={piece.title} value={content} onChange={type} onBlur={() => flush()} onClose={closeFocus}
                    status={status} timer={timer} goal={piece.wordGoal || 0} placeholder="Just write. Editing can wait." />
            )}
            {history && (
                <VersionHistory base={`/writing/${id}/versions`} title={piece.title} current={content} beforeSave={flush}
                    onRestored={(p) => setContent(p.content || '')} onClose={() => setHistory(false)} />
            )}
            {confirmDialog}
        </div>
    );
}
