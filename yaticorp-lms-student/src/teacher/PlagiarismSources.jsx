/**
 * "Your sources": papers the free search cannot reach (paywalled articles,
 * books, a PDF someone shared), uploaded so every check compares with their
 * full text too. Open-access papers are found and read by the check itself
 * (server: openSources.js), so since 2026-11-04 this is one slim line, with
 * the list behind "Manage".
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Library, Upload, Loader2, Trash2, FileText, Eye, ChevronDown } from 'lucide-react';
import teacherApi, { messageOf } from './teacherSession';
import { ErrorNote, OkNote, Modal } from './ui';
import { btn, fmtDate, fmtNum } from './kit';
import { readSourceFile, SOURCE_ACCEPT } from './readSourceFile';

export default function PlagiarismSources({ onCount }) {
    const [list, setList] = useState(null);
    const [max, setMax] = useState(50);
    const [error, setError] = useState('');
    const [ok, setOk] = useState('');
    const [uploading, setUploading] = useState('');     // the file being read and sent
    const input = useRef(null);
    // The source being read: its row at once, its text once loaded.
    const [viewing, setViewing] = useState(null);
    const [viewText, setViewText] = useState(null);
    const [viewError, setViewError] = useState('');
    const [showList, setShowList] = useState(false);

    const load = useCallback(() => teacherApi.get('/plagiarism/sources')
        .then((r) => { setList(r.data.sources); setMax(r.data.max || 50); onCount?.(r.data.sources.length); })
        .catch((e) => setError(messageOf(e, 'Your sources could not be loaded.'))), [onCount]);
    useEffect(() => { load(); }, [load]);

    const add = async (files) => {
        setError(''); setOk('');
        const added = [];
        for (const file of Array.from(files || [])) {
            setUploading(file.name);
            try {
                const body = await readSourceFile(file);
                const r = await teacherApi.post('/plagiarism/sources', body);
                added.push(r.data.title);
            } catch (e) {
                setError(`${file.name}: ${e.response ? messageOf(e) : e.message}`);
                break;
            }
        }
        setUploading('');
        if (input.current) input.current.value = '';
        if (added.length) setOk(`Added ${added.length === 1 ? `“${added[0]}”` : `${added.length} sources`}. Every check now compares with ${added.length === 1 ? 'it' : 'them'}.`);
        load();
    };

    const remove = async (s) => {
        setError(''); setOk('');
        try { await teacherApi.delete(`/plagiarism/sources/${s._id}`); load(); }
        catch (e) { setError(messageOf(e, 'That source could not be removed.')); }
    };

    const open = (s) => {
        setViewing(s); setViewText(null); setViewError('');
        teacherApi.get(`/plagiarism/sources/${s._id}`)
            .then((r) => setViewText(r.data.text || ''))
            .catch((e) => setViewError(messageOf(e, 'That source could not be opened.')));
    };
    const closeView = useCallback(() => setViewing(null), []);

    return (
        <section aria-label="Your sources" className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <Library size={18} className="shrink-0 text-indigo-500" aria-hidden="true" />
                <p className="min-w-0 flex-1 text-sm text-slate-600">
                    Using a <strong className="font-semibold text-slate-800">paywalled paper or a book</strong>? Add it so every check compares with it too. <span className="text-slate-400">Open-access papers are found for you.</span>
                </p>
                <input ref={input} id="source-files" type="file" multiple accept={SOURCE_ACCEPT} className="sr-only" onChange={(e) => add(e.target.files)} disabled={Boolean(uploading)} />
                <label htmlFor="source-files" title="PDF, Word or text. A scanned PDF has no text to compare." className={`${btn.secondary} !py-1.5 !text-xs cursor-pointer ${uploading ? 'pointer-events-none opacity-60' : ''}`}>
                    {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} {uploading ? `Reading ${uploading}…` : 'Add a paper'}
                </label>
                {list?.length > 0 && (
                    <button type="button" onClick={() => setShowList((v) => !v)} aria-expanded={showList} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50">
                        {list.length} added · Manage <ChevronDown size={14} aria-hidden="true" className={`transition-transform ${showList ? 'rotate-180' : ''}`} />
                    </button>
                )}
            </div>
            {(error || ok) && (
                <div className="mt-2 space-y-2">
                    <ErrorNote>{error}</ErrorNote>
                    <OkNote>{ok}</OkNote>
                </div>
            )}
            {showList && list?.length > 0 && (
                // Five sources tall (2026-10-30); the rest scroll inside the list.
                <ul className={`mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 ${list.length > 5 ? 'max-h-[16.6rem] overflow-y-auto overscroll-contain' : ''}`}>
                    {list.map((s) => (
                        <li key={s._id} className="flex items-center gap-2 px-3 py-2">
                            <FileText size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
                            <button type="button" onClick={() => open(s)} className="min-w-0 flex-1 text-left" title="Open this source">
                                <span className="block truncate text-sm font-semibold text-slate-800 hover:text-indigo-700">{s.title}</span>
                                <span className="block text-xs text-slate-500">{fmtNum(s.words)} words · added {fmtDate(s.createdAt)}</span>
                            </button>
                            <button type="button" onClick={() => open(s)} aria-label={`Open source ${s.title}`} className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"><Eye size={15} /> <span className="hidden sm:inline">Open</span></button>
                            <button type="button" onClick={() => remove(s)} aria-label={`Remove source ${s.title}`} className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
                        </li>
                    ))}
                </ul>
            )}
            {showList && list?.length > 5 && <p className="mt-2 text-xs text-slate-400">Scroll for all {list.length} sources (up to {max})</p>}
            {viewing && (
                <Modal title={viewing.title} onClose={closeView} wide labelId="source-view-title"
                    footer={<button type="button" onClick={closeView} className={btn.secondary}>Close</button>}>
                    <p className="text-xs text-slate-500">
                        {viewing.fileName ? <>From {viewing.fileName} · </> : null}{fmtNum(viewing.words)} words · added {fmtDate(viewing.createdAt)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">The text read from the file — what every check compares your writing with.</p>
                    {viewError ? <div className="mt-3"><ErrorNote>{viewError}</ErrorNote></div>
                        : viewText === null ? <p className="mt-4 flex items-center gap-2 text-sm text-slate-500"><Loader2 size={15} className="animate-spin" /> Opening…</p>
                            : <div className="mt-3 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800">{viewText || 'No text was found in this file.'}</div>}
                </Modal>
            )}
        </section>
    );
}
