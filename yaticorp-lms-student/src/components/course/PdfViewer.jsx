/**
 * A reading lesson's PDF, drawn page by page in the page itself with pdf.js.
 *
 * It used to sit in an <iframe>, which an Android web view (the app) and
 * Chrome on Android cannot draw: the lesson showed a blank box, or a prompt to
 * download a file the lesson does not allow downloading. Here every page is a
 * canvas, as wide as the box, one under the other, drawn as it scrolls into
 * view so a long document does not draw all of itself up front.
 *
 * There is no download button: this viewer is for lessons whose PDF is not
 * downloadable. If the file cannot be read here (a host that refuses the
 * request, a damaged file), it says so and offers to open it instead.
 */
import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, FileText, Loader2 } from 'lucide-react';
import { loadPdfjs } from './loadPdfjs';
import { openExternal } from '../../native/saveFile';

// Pages this far below the visible part of the box start drawing early, so
// scrolling does not meet a blank page.
const DRAW_AHEAD = '600px 0px';

const PdfPage = ({ doc, number, width, ratio, title }) => {
    const canvasRef = useRef(null);
    const holderRef = useRef(null);
    // Drawn once it comes near the visible part of the box (at once where
    // the browser cannot say when that is).
    const [near, setNear] = useState(() => number === 1 || typeof IntersectionObserver === 'undefined');

    useEffect(() => {
        if (near) return undefined;
        const el = holderRef.current;
        if (!el) return undefined;
        const watch = new IntersectionObserver((entries) => {
            if (entries.some((e) => e.isIntersecting)) setNear(true);
        }, { rootMargin: DRAW_AHEAD });
        watch.observe(el);
        return () => watch.disconnect();
    }, [near]);

    useEffect(() => {
        if (!near || !doc || !(width > 0)) return undefined;
        let task = null;
        let cancelled = false;
        (async () => {
            try {
                const page = await doc.getPage(number);
                if (cancelled) return;
                const canvas = canvasRef.current;
                if (!canvas) return;
                // Sharp on a phone's dense screen: drawn at the device's pixel
                // ratio, shown at the box's width.
                const dpr = Math.min(window.devicePixelRatio || 1, 3);
                const scale = width / page.getViewport({ scale: 1 }).width;
                const viewport = page.getViewport({ scale: scale * dpr });
                canvas.width = Math.round(viewport.width);
                canvas.height = Math.round(viewport.height);
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                task = page.render({ canvas, canvasContext: ctx, viewport });
                await task.promise;
            } catch {
                /* a page that cannot be drawn stays blank; the others still show */
            }
        })();
        return () => { cancelled = true; task?.cancel?.(); };
    }, [near, doc, number, width]);

    return (
        <div ref={holderRef} className="mx-auto bg-white shadow-md" style={{ width, height: Math.round(width * ratio) }}>
            <canvas ref={canvasRef} role="img" aria-label={`${title}, page ${number}`} style={{ width: '100%', height: '100%', display: 'block' }} />
        </div>
    );
};

export default function PdfViewer({ url, title = 'Reading' }) {
    const boxRef = useRef(null);
    const [width, setWidth] = useState(0);
    // loading → ready (with the document) or failed.
    const [state, setState] = useState({ status: 'loading' });

    useEffect(() => {
        let cancelled = false;
        let task = null;
        (async () => {
            try {
                const pdfjs = await loadPdfjs();
                if (cancelled) return;
                task = pdfjs.getDocument({ url });
                const doc = await task.promise;
                const first = await doc.getPage(1);
                const view = first.getViewport({ scale: 1 });
                if (!cancelled) setState({ status: 'ready', doc, pages: doc.numPages, ratio: view.height / view.width });
            } catch (err) {
                if (!cancelled) {
                    console.error('[PdfViewer] could not read the PDF', err);
                    setState({ status: 'failed' });
                }
            }
        })();
        // The loading task owns the worker and the document; freeing it frees both.
        return () => { cancelled = true; task?.destroy?.(); };
    }, [url]);

    // Pages are as wide as the box, less its padding, and follow it when it
    // changes (a phone turned sideways, the window resized).
    useEffect(() => {
        const el = boxRef.current;
        if (!el) return undefined;
        const measure = () => setWidth(Math.max(0, Math.floor(el.clientWidth - 32)));
        measure();
        if (typeof ResizeObserver === 'undefined') return undefined;
        const watch = new ResizeObserver(measure);
        watch.observe(el);
        return () => watch.disconnect();
    }, []);

    return (
        <div ref={boxRef} data-pdf-viewer className="absolute inset-0 overflow-y-auto overscroll-contain bg-slate-200">
            {state.status === 'loading' && (
                <div role="status" className="flex h-full flex-col items-center justify-center gap-3 text-slate-500">
                    <Loader2 size={28} className="animate-spin text-indigo-500" aria-hidden="true" />
                    <span className="text-sm font-semibold">Opening the reading…</span>
                </div>
            )}
            {state.status === 'failed' && (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-slate-600">
                    <FileText size={40} className="text-slate-400" aria-hidden="true" />
                    <p className="font-semibold text-slate-800">This reading could not be shown here.</p>
                    <p className="max-w-sm text-sm">Open it in your browser to read it instead.</p>
                    <button
                        type="button"
                        onClick={() => openExternal(url)}
                        className="mt-1 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"
                    >
                        Open <ExternalLink size={16} aria-hidden="true" />
                    </button>
                </div>
            )}
            {state.status === 'ready' && width > 0 && (
                <div className="flex flex-col gap-4 p-4" aria-label={title}>
                    {Array.from({ length: state.pages }, (_, i) => (
                        <PdfPage key={i + 1} doc={state.doc} number={i + 1} width={width} ratio={state.ratio} title={title} />
                    ))}
                </div>
            )}
        </div>
    );
}
