/**
 * Crop a picture before it is used: drag the box to move it, drag a corner
 * to resize it. `src`: the picture (an object URL of the chosen file, or an
 * uploaded picture's address). `onDone(file)` gets the cropped picture as a
 * PNG/JPEG File; `onSkip()` uses the picture as it is.
 */
import { useRef, useState } from 'react';
import { Crop, Loader2, X } from 'lucide-react';

const MIN = 5; // the smallest box, in % of the picture

export default function ImageCropper({ src, name = 'picture', onDone, onSkip, onCancel, skipLabel = 'Use whole picture' }) {
    const box = useRef(null);
    const img = useRef(null);
    // The crop box in % of the shown picture.
    const [r, setR] = useState({ x: 5, y: 5, w: 90, h: 90 });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const drag = (mode) => (e) => {
        e.preventDefault(); e.stopPropagation();
        const rect = box.current.getBoundingClientRect();
        const start = { px: e.clientX, py: e.clientY, ...r };
        const move = (ev) => {
            const dx = ((ev.clientX - start.px) / rect.width) * 100;
            const dy = ((ev.clientY - start.py) / rect.height) * 100;
            let { x, y, w, h } = start;
            if (mode === 'move') {
                x = Math.min(100 - w, Math.max(0, x + dx)); y = Math.min(100 - h, Math.max(0, y + dy));
            } else {
                if (mode.includes('w')) { const nx = Math.min(x + w - MIN, Math.max(0, x + dx)); w += x - nx; x = nx; }
                if (mode.includes('e')) w = Math.min(100 - x, Math.max(MIN, w + dx));
                if (mode.includes('n')) { const ny = Math.min(y + h - MIN, Math.max(0, y + dy)); h += y - ny; y = ny; }
                if (mode.includes('s')) h = Math.min(100 - y, Math.max(MIN, h + dy));
            }
            setR({ x, y, w, h });
        };
        const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
    };

    const apply = () => {
        const el = img.current;
        if (!el?.naturalWidth) return;
        setBusy(true); setError('');
        const sx = (r.x / 100) * el.naturalWidth; const sy = (r.y / 100) * el.naturalHeight;
        const sw = Math.max(1, Math.round((r.w / 100) * el.naturalWidth)); const sh = Math.max(1, Math.round((r.h / 100) * el.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = sw; canvas.height = sh;
        try {
            canvas.getContext('2d').drawImage(el, sx, sy, sw, sh, 0, 0, sw, sh);
            canvas.toBlob((blob) => {
                setBusy(false);
                if (!blob) { setError('The picture could not be cropped.'); return; }
                onDone(new File([blob], `${name.replace(/\.[^.]+$/, '')}-cropped.png`, { type: 'image/png' }));
            }, 'image/png');
        } catch {
            // A picture from another site the browser will not let us read.
            setBusy(false);
            setError('This picture cannot be cropped here. Use Replace to upload it again, then crop.');
        }
    };

    const corner = 'absolute h-3.5 w-3.5 rounded-sm border-2 border-white bg-indigo-600 shadow';
    return (
        <div className="space-y-2 rounded-xl border border-indigo-200 bg-slate-900/5 p-3" data-cropper>
            <p className="flex items-center gap-1.5 text-xs font-bold text-slate-600"><Crop size={14} /> Drag the box to move it, drag a corner to resize it.</p>
            <div className="flex justify-center">
                <div ref={box} className="relative inline-block touch-none select-none">
                    <img ref={img} src={src} alt="" crossOrigin="anonymous" draggable={false} className="block max-h-[60vh] max-w-full" />
                    {/* Darken outside the box. */}
                    <div className="pointer-events-none absolute inset-0" style={{ background: 'rgba(15,23,42,0.45)', clipPath: `polygon(0 0,100% 0,100% 100%,0 100%,0 0,${r.x}% ${r.y}%,${r.x}% ${r.y + r.h}%,${r.x + r.w}% ${r.y + r.h}%,${r.x + r.w}% ${r.y}%,${r.x}% ${r.y}%)` }} />
                    <div onPointerDown={drag('move')} className="absolute cursor-move border-2 border-white shadow-[0_0_0_1px_rgba(79,70,229,0.9)]"
                        style={{ left: `${r.x}%`, top: `${r.y}%`, width: `${r.w}%`, height: `${r.h}%` }}>
                        <span onPointerDown={drag('nw')} className={`${corner} -left-2 -top-2 cursor-nwse-resize`} />
                        <span onPointerDown={drag('ne')} className={`${corner} -right-2 -top-2 cursor-nesw-resize`} />
                        <span onPointerDown={drag('sw')} className={`${corner} -bottom-2 -left-2 cursor-nesw-resize`} />
                        <span onPointerDown={drag('se')} className={`${corner} -bottom-2 -right-2 cursor-nwse-resize`} />
                    </div>
                </div>
            </div>
            {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
            <div className="flex flex-wrap justify-end gap-2">
                {onCancel && <button type="button" onClick={onCancel} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-white"><X size={13} /> Cancel</button>}
                {onSkip && <button type="button" onClick={onSkip} disabled={busy} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-indigo-300">{skipLabel}</button>}
                <button type="button" onClick={apply} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60">
                    {busy ? <Loader2 size={13} className="animate-spin" /> : <Crop size={13} />} Crop &amp; use
                </button>
            </div>
        </div>
    );
}
