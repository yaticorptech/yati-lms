/**
 * A certificate's two buttons: the eye shows the PDF on the page, Download
 * saves it. The PDF is fetched once and both use that copy, so looking first
 * and then saving is one download (and one wallet charge, where there is one).
 */
import { useEffect, useState } from 'react';
import { Eye, Download, Loader2, X } from 'lucide-react';
import { saveBlob } from '../native/saveFile';

export default function CertificateView({ load, fileName, compact = false, icons = false }) {
    const [blob, setBlob] = useState(null);
    const [url, setUrl] = useState(null);
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

    const get = () => (blob ? Promise.resolve(blob) : load().then((b) => { setBlob(b); setUrl(URL.createObjectURL(b)); return b; }));
    const run = (what, then) => {
        setBusy(what); setError('');
        get().then(then).catch((e) => setError(e.message || 'The certificate could not be loaded.')).finally(() => setBusy(''));
    };
    const view = () => run('view', () => setOpen(true));
    const save = () => run('save', (b) => saveBlob(b, fileName, { title: 'Certificate' }));
    const btn = icons ? 'inline-flex h-10 w-10 items-center justify-center rounded-full font-bold shadow-sm disabled:opacity-60'
        : `inline-flex ${compact ? 'min-h-9 px-3 text-xs' : 'min-h-10 px-4 text-sm'} items-center gap-1.5 rounded-xl font-bold disabled:opacity-60`;

    return (
        <span className="inline-flex flex-wrap items-center gap-2" data-certificate>
            <button type="button" onClick={view} disabled={!!busy} aria-label="View certificate" title="View certificate" className={`${btn} border border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-700`}>
                {busy === 'view' ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Eye size={icons ? 18 : 14} aria-hidden="true" />}{icons ? '' : ' View'}
            </button>
            <button type="button" onClick={save} disabled={!!busy} aria-label="Download certificate" title="Download certificate" className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700`}>
                {busy === 'save' ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Download size={icons ? 18 : 14} aria-hidden="true" />}{icons ? '' : ' Download'}
            </button>
            {error && <span className="text-xs font-semibold text-rose-700">{error}</span>}
            {open && url && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 p-3" role="dialog" aria-modal="true" aria-label="Certificate" onClick={() => setOpen(false)}>
                    <div className="flex h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
                            <p className="font-black text-slate-900">Your certificate</p>
                            <span className="flex items-center gap-2">
                                <button type="button" onClick={save} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-indigo-600 px-3 text-xs font-bold text-white hover:bg-indigo-700"><Download size={14} aria-hidden="true" /> Download</button>
                                <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
                            </span>
                        </div>
                        <iframe title="Certificate" src={url} className="min-h-0 w-full flex-1" />
                    </div>
                </div>
            )}
        </span>
    );
}
