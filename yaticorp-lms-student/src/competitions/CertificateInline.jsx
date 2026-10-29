/**
 * A certificate shown on the page itself (asked 2026-10-27), not behind an
 * eye button: loaded as soon as it is on screen, with Download and Full
 * screen. Only for certificates that cost nothing to fetch (Quiz Arena's);
 * a competition certificate charged to the wallet keeps CertificateView.
 * With `onClose` (shown in a popup) it has a close button too.
 */
import { useEffect, useRef, useState } from 'react';
import { Download, Maximize2, Minimize2, Loader2, X } from 'lucide-react';
import { saveBlob } from '../native/saveFile';

export default function CertificateInline({ load, fileName, className = '', onClose }) {
    const [state, setState] = useState({ url: null, blob: null, error: '' });
    const [full, setFull] = useState(false);
    const loadRef = useRef(load);
    const boxRef = useRef(null);
    useEffect(() => {
        let alive = true; let made = null;
        loadRef.current().then((b) => { if (!alive) return; made = URL.createObjectURL(b); setState({ url: made, blob: b, error: '' }); })
            .catch((e) => { if (alive) setState({ url: null, blob: null, error: e.message || 'The certificate could not be loaded.' }); });
        return () => { alive = false; if (made) URL.revokeObjectURL(made); };
    }, []);
    // Full screen: the browser's own, where it has it; otherwise a full-window view.
    useEffect(() => {
        const onChange = () => setFull(document.fullscreenElement === boxRef.current);
        document.addEventListener('fullscreenchange', onChange);
        return () => document.removeEventListener('fullscreenchange', onChange);
    }, []);
    const toggleFull = () => {
        if (full) { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); setFull(false); return; }
        const el = boxRef.current;
        if (el?.requestFullscreen) el.requestFullscreen().then(() => setFull(true)).catch(() => setFull(true));
        else setFull(true);
    };
    const save = () => state.blob && saveBlob(state.blob, fileName, { title: 'Certificate' });
    const btn = 'inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-bold';
    return (
        // A medium card with the whole certificate in view; full screen on request.
        <div ref={boxRef} className={full ? 'fixed inset-0 z-[300] flex flex-col bg-slate-900' : `mx-auto flex w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`} data-certificate-inline role={full ? 'dialog' : undefined} aria-label={full ? 'Certificate, full screen' : undefined}>
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-white px-3 py-2">
                <p className="text-sm font-black text-slate-900">Your certificate</p>
                <span className="flex items-center gap-2">
                    <button type="button" onClick={save} disabled={!state.blob} className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50`}><Download size={14} aria-hidden="true" /> Download</button>
                    <button type="button" onClick={toggleFull} disabled={!state.url} aria-label={full ? 'Exit full screen' : 'Full screen'} title={full ? 'Exit full screen' : 'Full screen'} className={`${btn} border border-slate-200 text-slate-700 hover:border-indigo-300 disabled:opacity-50`} data-cert-fullscreen>
                        {full ? <Minimize2 size={15} aria-hidden="true" /> : <Maximize2 size={15} aria-hidden="true" />}
                    </button>
                    {(full || onClose) && <button type="button" onClick={full ? toggleFull : onClose} aria-label="Close" title="Close" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" data-cert-close><X size={18} /></button>}
                </span>
            </div>
            {/* The page is A4 across (1.414:1): the frame keeps that shape, so the
                PDF viewer's fit-to-width shows the whole certificate — on the card,
                and in full screen as large as the screen allows, centred. */}
            <div className={full ? 'flex min-h-0 flex-1 items-center justify-center p-3 sm:p-6' : ''}>
                <div className="aspect-[1.414] w-full overflow-hidden bg-slate-100" style={full ? { width: 'min(100%, calc((100vh - 5.5rem) * 1.414))' } : undefined}>
                    {state.url ? <iframe title="Certificate" src={`${state.url}#toolbar=0&navpanes=0&view=FitH`} className="h-full w-full" />
                        : <div className="flex h-full items-center justify-center p-6 text-sm text-slate-500">{state.error || <Loader2 className="animate-spin text-indigo-500" aria-label="Loading the certificate" />}</div>}
                </div>
            </div>
        </div>
    );
}
