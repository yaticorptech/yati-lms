/**
 * Version history for a thesis chapter or a writing piece. The server keeps
 * the text as it was every ten minutes of writing, any version saved by
 * hand, and the text just before a restore — so a deleted paragraph can be
 * brought back, and so can a restore.
 */
import { useCallback, useEffect, useState } from 'react';
import { History, Loader2, RotateCcw, Save, ArrowLeft } from 'lucide-react';
import teacherApi, { messageOf } from './teacherSession';
import { Modal, ErrorNote, OkNote, Loading, Badge } from './ui';
import { btn, inputClass, fmtNum, fmtDateTime, countWords } from './kit';

const reasonOf = (v) => (v.reason === 'manual' ? (v.label || 'Saved by you') : v.reason === 'restore' ? (v.label || 'Before a restore') : 'Saved while you wrote');

/**
 * `base` is the API path of the document's versions; `current` the text in
 * the editor now; `beforeSave` saves any typing still waiting (so a version
 * saved by hand is the text on screen); `onRestored(answer)` hands the
 * restored document back to the editor.
 */
export default function VersionHistory({ base, title, current, beforeSave, onRestored, onClose }) {
    const [versions, setVersions] = useState(null);
    const [error, setError] = useState('');
    const [ok, setOk] = useState('');
    const [label, setLabel] = useState('');
    const [saving, setSaving] = useState(false);
    const [open, setOpen] = useState(null);            // { _id, content, createdAt, words }
    const [opening, setOpening] = useState('');
    const [confirming, setConfirming] = useState(false);
    const [restoring, setRestoring] = useState(false);

    const load = useCallback(() => teacherApi.get(base)
        .then((r) => { setVersions(r.data.versions); setError(''); })
        .catch((e) => setError(messageOf(e, 'The history could not be loaded.'))), [base]);
    useEffect(() => { load(); }, [load]);

    const saveNow = async (e) => {
        e.preventDefault();
        setSaving(true); setError(''); setOk('');
        try {
            await beforeSave?.();
            await teacherApi.post(base, { label: label.trim() });
            setLabel('');
            setOk('This version is kept. You can come back to it any time.');
            await load();
        } catch (err) { setError(messageOf(err, 'The version could not be saved.')); } finally { setSaving(false); }
    };

    const show = async (v) => {
        setOpening(v._id); setError(''); setConfirming(false);
        try { const r = await teacherApi.get(`${base}/${v._id}`); setOpen(r.data); }
        catch (err) { setError(messageOf(err, 'That version could not be opened.')); } finally { setOpening(''); }
    };

    const restore = async () => {
        setRestoring(true); setError('');
        try {
            await beforeSave?.();
            const r = await teacherApi.post(`${base}/${open._id}/restore`);
            onRestored(r.data);
            onClose();
        } catch (err) { setError(messageOf(err, 'The version could not be restored.')); setRestoring(false); }
    };

    const diff = open ? countWords(open.content) - countWords(current) : 0;

    return (
        <Modal title={open ? `Version of ${fmtDateTime(open.createdAt)}` : `History — ${title}`} onClose={onClose} wide labelId="version-history-title"
            footer={open ? (
                <>
                    <button type="button" onClick={() => { setOpen(null); setConfirming(false); }} className={`${btn.secondary} mr-auto`}><ArrowLeft size={15} /> All versions</button>
                    {!confirming
                        ? <button type="button" onClick={() => setConfirming(true)} className={btn.primary}><RotateCcw size={15} /> Restore this version</button>
                        : <button type="button" onClick={restore} disabled={restoring} className={btn.primary}>{restoring ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />} Yes, restore it</button>}
                </>
            ) : <button type="button" onClick={onClose} className={btn.secondary}>Close</button>}>
            <div className="space-y-3">
                <ErrorNote>{error}</ErrorNote>
                <OkNote>{ok}</OkNote>
                {open ? (
                    <>
                        <p className="text-xs text-slate-500">
                            {fmtNum(open.words)} words · {diff === 0 ? 'the same length as now' : `${fmtNum(Math.abs(diff))} ${diff > 0 ? 'more' : 'fewer'} words than now`}
                        </p>
                        {confirming && (
                            <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                                The text in the editor will be replaced by this version. Your current text is kept in the history first, so you can undo this.
                            </p>
                        )}
                        <div className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-serif text-[15px] leading-7 text-slate-800 [overflow-wrap:anywhere]">
                            {open.content || <span className="italic text-slate-400">(empty)</span>}
                        </div>
                    </>
                ) : (
                    <>
                        <form onSubmit={saveNow} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-end">
                            <div className="min-w-0 flex-1">
                                <label htmlFor="version-label" className="mb-1 block text-xs font-bold text-slate-600">Keep the text as it is now <span className="font-normal text-slate-400">(optional name)</span></label>
                                <input id="version-label" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={120} placeholder="e.g. Sent to supervisor" className={inputClass} />
                            </div>
                            <button type="submit" disabled={saving} className={btn.primary}>{saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save a version</button>
                        </form>
                        <p className="text-xs text-slate-500">A version is kept automatically every ten minutes while you write. The newest 60 are kept.</p>
                        {!versions && !error && <Loading label="Loading the history…" />}
                        {versions && !versions.length && (
                            <p className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500"><History size={18} aria-hidden="true" /> No earlier versions yet. They appear as you write.</p>
                        )}
                        {versions?.length > 0 && (
                            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                                {versions.map((v) => (
                                    <li key={v._id}>
                                        <button type="button" onClick={() => show(v)} disabled={Boolean(opening)}
                                            className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 disabled:opacity-60">
                                            <span className="min-w-0 flex-1">
                                                <span className="block text-sm font-bold text-slate-800">{fmtDateTime(v.createdAt)}</span>
                                                <span className="block truncate text-xs text-slate-500">{reasonOf(v)}</span>
                                            </span>
                                            {v.reason === 'manual' && <Badge tone="bg-emerald-50 text-emerald-700">Saved</Badge>}
                                            <span className="shrink-0 text-xs font-semibold text-slate-500">{fmtNum(v.words)} words</span>
                                            {opening === v._id && <Loader2 size={14} className="animate-spin text-slate-400" />}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </>
                )}
            </div>
        </Modal>
    );
}
