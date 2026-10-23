/**
 * Add many teachers from the Excel template: each row is a teacher with their
 * card. Rows that cannot be added are listed by row number with the reason;
 * the rest are added and emailed their sign-in details.
 */
import React, { useRef, useState } from 'react';
import { Upload, Download, Loader2, X, FileSpreadsheet } from 'lucide-react';
import api from '../../utils/api';
import { Dialog, DialogTitle, Banner, BTN, BTN2, INPUT } from '../orgUi';
import Select from '../Select';
import { Field } from './TeacherBits';
import { downloadTeacherTemplate, refusal, assignable, TEMPLATE_COLUMNS } from './teacherUtils';

export default function BulkTeachersModal({ endpoint, organizations, onClose, onDone }) {
    const [file, setFile] = useState(null);
    const [organizationId, setOrganizationId] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [results, setResults] = useState(null);
    const input = useRef(null);
    const choices = organizations ? assignable(organizations) : null;

    const upload = async () => {
        if (!file || busy) return;
        const form = new FormData();
        form.append('file', file);
        if (choices && organizationId) form.append('organizationId', organizationId);
        setBusy(true);
        setError('');
        try {
            const r = await api.post(endpoint, form, { headers: { 'Content-Type': 'multipart/form-data' } });
            setResults(r.data.results);
            if (r.data.results?.successCount) onDone();
        } catch (err) {
            setError(refusal(err, 'The file could not be uploaded. Please try again.').message);
        } finally { setBusy(false); }
    };

    const again = () => { setResults(null); setFile(null); if (input.current) input.current.value = ''; };

    return (
        <Dialog onClose={() => { if (!busy) onClose(); }} size="max-w-lg">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-800"><FileSpreadsheet size={20} className="text-emerald-600" /> Add teachers from a spreadsheet</DialogTitle>
                <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-5">
                {!results ? (
                    <>
                        <p className="text-sm text-slate-600">
                            One teacher per row, with their card. Columns: <span className="font-semibold">{TEMPLATE_COLUMNS.join(', ')}</span>.
                            The last three may be left empty. Passwords need 8+ characters with a capital, a small letter, a number and a symbol.
                        </p>
                        <button type="button" onClick={downloadTeacherTemplate} className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800">
                            <Download size={16} /> Download the template
                        </button>
                        <button type="button" onClick={() => input.current?.click()}
                            className="block w-full rounded-xl border-2 border-dashed border-slate-300 p-8 text-center transition-colors hover:border-indigo-400">
                            <Upload size={28} className="mx-auto mb-2 text-slate-400" aria-hidden />
                            {file ? <span className="break-all text-sm font-semibold text-emerald-700">{file.name}</span>
                                : <span className="text-sm text-slate-500">Choose the filled-in Excel file (.xlsx)</span>}
                        </button>
                        <input ref={input} type="file" accept=".xlsx,.xls" className="hidden" aria-label="Excel file of teachers"
                            onChange={(e) => { setFile(e.target.files[0] || null); setError(''); }} />
                        {choices && (
                            <Field id="bulk-org" label="Put them all into an organization" hint="Optional.">
                                <Select id="bulk-org" value={organizationId} onChange={(e) => setOrganizationId(e.target.value)} aria-label="Organization" className={INPUT}>
                                    <option value="">No organization</option>
                                    {choices.map((o) => <option key={o._id} value={o._id}>{o.name}</option>)}
                                </Select>
                            </Field>
                        )}
                        {error && <Banner>{error}</Banner>}
                    </>
                ) : (
                    <div className="space-y-4" aria-live="polite">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                                <p className="text-3xl font-bold text-emerald-600">{results.successCount}</p>
                                <p className="mt-1 text-sm font-semibold text-emerald-700">Added</p>
                            </div>
                            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
                                <p className="text-3xl font-bold text-red-600">{results.failedCount}</p>
                                <p className="mt-1 text-sm font-semibold text-red-700">Not added</p>
                            </div>
                        </div>
                        {results.errors?.length > 0 && (
                            <ul className="max-h-60 space-y-2 overflow-y-auto">
                                {results.errors.map((e) => (
                                    <li key={`${e.row}-${e.email}`} className="break-words rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm">
                                        <span className="font-semibold text-red-700">Row {e.row} ({e.email}):</span> <span className="text-red-600">{e.message}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>
            <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-slate-100 px-5 py-4">
                {!results ? (
                    <>
                        <button type="button" onClick={onClose} className={BTN2} disabled={busy}>Cancel</button>
                        <button type="button" onClick={upload} disabled={!file || busy} className={BTN}>
                            {busy && <Loader2 size={15} className="animate-spin" />} Upload and add
                        </button>
                    </>
                ) : (
                    <>
                        <button type="button" onClick={again} className={BTN2}>Upload another</button>
                        <button type="button" onClick={onClose} className={BTN}>Done</button>
                    </>
                )}
            </div>
        </Dialog>
    );
}
