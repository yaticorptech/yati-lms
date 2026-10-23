/**
 * "Your sources": the papers and chapters the teacher has read for their
 * research, uploaded so every check compares with them too — the closest
 * this page can come to a journal database without sending anything out.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Library, Upload, Loader2, Trash2, FileText } from 'lucide-react';
import teacherApi, { messageOf } from './teacherSession';
import { Card, CardTitle, ErrorNote, OkNote } from './ui';
import { btn, fmtDate, fmtNum } from './kit';
import { readSourceFile, SOURCE_ACCEPT } from './readSourceFile';

export default function PlagiarismSources({ onCount }) {
    const [list, setList] = useState(null);
    const [max, setMax] = useState(50);
    const [error, setError] = useState('');
    const [ok, setOk] = useState('');
    const [uploading, setUploading] = useState('');     // the file being read and sent
    const input = useRef(null);

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

    return (
        <Card>
            <CardTitle icon={Library} right={list && <span className="text-xs font-bold text-slate-500">{list.length} of {max}</span>}>Your sources</CardTitle>
            <p className="text-sm text-slate-600">Upload the papers and chapters you read for your research (PDF, Word or text). Every check compares your writing with them as well as with YATICORP — so text copied from a paper you read is found. They stay private to you.</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
                <input ref={input} id="source-files" type="file" multiple accept={SOURCE_ACCEPT} className="sr-only" onChange={(e) => add(e.target.files)} disabled={Boolean(uploading)} />
                <label htmlFor="source-files" className={`${btn.secondary} cursor-pointer ${uploading ? 'pointer-events-none opacity-60' : ''}`}>
                    {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />} {uploading ? `Reading ${uploading}…` : 'Upload papers'}
                </label>
                <span className="text-xs text-slate-500">A scanned PDF (pictures of pages) has no text to compare.</span>
            </div>
            <div className="mt-3 space-y-2">
                <ErrorNote>{error}</ErrorNote>
                <OkNote>{ok}</OkNote>
            </div>
            {list?.length > 0 && (
                <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {list.map((s) => (
                        <li key={s._id} className="flex items-center gap-2 px-3 py-2">
                            <FileText size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-bold text-slate-800">{s.title}</span>
                                <span className="block text-xs text-slate-500">{fmtNum(s.words)} words · added {fmtDate(s.createdAt)}</span>
                            </span>
                            <button type="button" onClick={() => remove(s)} aria-label={`Remove source ${s.title}`} className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}
