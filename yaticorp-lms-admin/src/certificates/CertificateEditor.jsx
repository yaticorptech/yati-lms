/**
 * The Smart Certificate Builder's editor (organisations, 2026-10-31): the certificate as it prints, and over it every
 * element — logo, seal, signatures, QR code, each line of text — to click and change. Drag to move (it snaps to the
 * page's centre and to other elements' centres, with a guide), the corner to resize, the top handle to rotate;
 * the toolbar edits the selected text and its font, size, bold, italic, colour and alignment, and its layer, lock and
 * visibility. Edits are changes kept by element (templates.shared.js applyElements), so the PDF draws them the same.
 */
import { useMemo, useRef, useState } from 'react';
import {
    AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowUp, Bold, Eye, EyeOff, Italic, Loader2, Lock, Redo2, RotateCcw, Save, Undo2, Unlock
} from 'lucide-react';
import CertificateCanvas from './CertificateCanvas';
import Dropdown from './Dropdown';
import { CT } from './design';
import { boxOf, fittedSize } from './metrics';

const LABELS = {
    logo: 'College logo', college: 'College name', address: 'Address', title: 'Certificate title', tagline: 'Tagline', intro: 'Intro line',
    name: 'Student name', inst: 'Participating college', lead: '“for securing”', award: 'Achievement / position', inThe: '“in the”',
    comp: 'Competition name', desc: 'Description', seal: 'Seal', qr: 'QR code', affil: 'Affiliation', nameline: 'Line under the name',
    sentence: 'Paragraph',
    sig0: 'Signature 1', sig1: 'Signature 2', sig2: 'Signature 3', sigline0: 'Signature line 1', sigline1: 'Signature line 2', sigline2: 'Signature line 3',
    signame0: 'Signatory 1 name', signame1: 'Signatory 2 name', signame2: 'Signatory 3 name', sigdes0: 'Signatory 1 designation', sigdes1: 'Signatory 2 designation', sigdes2: 'Signatory 3 designation'
};
const BTN = 'inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-lg px-2 text-xs font-bold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-40';
const ON = '!bg-indigo-600 !text-white !ring-indigo-600';
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export default function CertificateEditor({
    template, input, images, elements = {}, onElements, onBegin, selected, onSelect,
    textOf, onText, readOnly, onUndo, onRedo, canUndo, canRedo, onResetAll, onSaveDefaults, savingDefaults
}) {
    const svg = useRef(null);
    const textBox = useRef(null);
    const [guides, setGuides] = useState([]);
    const [W, H] = CT.sizeOf(template);
    const shapes = useMemo(() => CT.layout(template, input), [template, input]);

    // Each element: the box round all its shapes, its turn, and its first text (for the toolbar).
    const groups = useMemo(() => {
        const m = new Map();
        shapes.forEach((s) => {
            if (!s.key) return;
            const b = boxOf(s);
            const g = m.get(s.key);
            if (!g) m.set(s.key, { key: s.key, box: { ...b }, rot: s.rot || 0, text: s.t === 'text' || s.t === 'para' ? s : null });
            else {
                const x = Math.min(g.box.x, b.x), y = Math.min(g.box.y, b.y);
                g.box = { x, y, w: Math.max(g.box.x + g.box.w, b.x + b.w) - x, h: Math.max(g.box.y + g.box.h, b.y + b.h) - y };
                if (!g.text && (s.t === 'text' || s.t === 'para')) g.text = s;
            }
        });
        return m;
    }, [shapes]);

    const pointAt = (e) => {
        const ctm = svg.current?.getScreenCTM();
        if (!ctm) return null;
        const p = svg.current.createSVGPoint();
        p.x = e.clientX; p.y = e.clientY;
        return p.matrixTransform(ctm.inverse());
    };

    /** Move, resize or rotate one element with the pointer. */
    const startDrag = (e, key, mode) => {
        e.preventDefault(); e.stopPropagation();
        onSelect(key);
        const all = elements;
        const base = { ...(all[key] || {}) };
        if (base.locked) return;
        const g = groups.get(key);
        const p0 = pointAt(e);
        if (!g || !p0) return;
        const c = { x: g.box.x + g.box.w / 2, y: g.box.y + g.box.h / 2 };
        const others = [...groups.values()].filter((o) => o.key !== key).map((o) => o.box.x + o.box.w / 2);
        let begun = false;
        const move = (ev) => {
            const p = pointAt(ev);
            if (!p) return;
            if (!begun) { onBegin(); begun = true; }
            const next = { ...base };
            if (mode === 'move') {
                let dx = (base.dx || 0) + p.x - p0.x, dy = (base.dy || 0) + p.y - p0.y;
                const ncx = c.x + p.x - p0.x, ncy = c.y + p.y - p0.y;
                const lines = [];
                // Snaps: the page's centre, else another element's centre.
                if (Math.abs(ncx - W / 2) < 8) { dx += W / 2 - ncx; lines.push({ v: W / 2 }); } else {
                    const o = others.find((x) => Math.abs(ncx - x) < 6);
                    if (o !== undefined) { dx += o - ncx; lines.push({ v: o }); }
                }
                if (Math.abs(ncy - H / 2) < 8) { dy += H / 2 - ncy; lines.push({ h: H / 2 }); }
                next.dx = Math.round(dx); next.dy = Math.round(dy);
                setGuides(lines);
            } else if (mode === 'scale') {
                const d0 = Math.hypot(p0.x - c.x, p0.y - c.y) || 1;
                next.s = Math.round(clamp((base.s || 1) * (Math.hypot(p.x - c.x, p.y - c.y) / d0), 0.1, 8) * 100) / 100;
            } else {
                const a0 = Math.atan2(p0.y - c.y, p0.x - c.x), a = Math.atan2(p.y - c.y, p.x - c.x);
                let r = (base.rot || 0) + ((a - a0) * 180) / Math.PI;
                r = ((((r + 180) % 360) + 360) % 360) - 180;
                for (const t of [-180, -90, 0, 90, 180]) if (Math.abs(r - t) < 4) r = t;
                next.rot = Math.round(r);
            }
            onElements({ ...all, [key]: next });
        };
        const stop = () => {
            setGuides([]);
            window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', stop); window.removeEventListener('pointercancel', stop);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', stop);
        window.addEventListener('pointercancel', stop);
    };

    // The toolbar's edits to the selected element.
    const sel = selected ? groups.get(selected) : null;
    const el = (selected && elements[selected]) || {};
    const edit = (patch) => { onBegin(); onElements({ ...elements, [selected]: { ...el, ...patch } }); };
    const t = sel?.text;
    const style = t ? CT.styleOf(t.font) : null;
    const size = t ? Math.round(t.t === 'text' ? fittedSize(t) : t.size) : 0;
    const setSize = (px) => {
        if (!t || !(px > 0)) return;
        const baseSize = t.size / (el.s || 1);
        edit({ s: Math.round(clamp(px / baseSize, 0.1, 8) * 100) / 100 });
    };
    const setAlign = (align) => {
        // The words stay where they are: the anchor moves to the side it is aligned to.
        const b = boxOf(t);
        const to = align === 'left' ? b.x : align === 'right' ? b.x + b.w : b.x + b.w / 2;
        edit({ align, dx: Math.round((el.dx || 0) + to - t.x) });
    };
    const hidden = Object.entries(elements).filter(([, v]) => v?.hidden).map(([k]) => k);
    const own = selected ? textOf(selected) : undefined;
    const textValue = own !== undefined ? own : (t ? t.text : null);
    const locked = readOnly(selected);

    return (
        <div className="space-y-3" data-certificate-editor>
            {/* The whole page: undo, redo, reset, show what was hidden, save as the organisation's default. */}
            <div className="flex flex-wrap items-center gap-1.5">
                <button type="button" onClick={onUndo} disabled={!canUndo} className={BTN} title="Undo" data-cert-undo><Undo2 size={15} /></button>
                <button type="button" onClick={onRedo} disabled={!canRedo} className={BTN} title="Redo" data-cert-redo><Redo2 size={15} /></button>
                <button type="button" onClick={onResetAll} disabled={!Object.keys(elements).length} className={BTN} title="Reset every element to the template's layout" data-cert-reset-all><RotateCcw size={14} /> Reset layout</button>
                {hidden.length > 0 && <button type="button" onClick={() => { onBegin(); onElements(Object.fromEntries(Object.entries(elements).map(([k, v]) => [k, { ...v, hidden: false }]))); }} className={BTN}><Eye size={14} /> Show hidden ({hidden.length})</button>}
                <span className="flex-1" />
                {onSaveDefaults && <button type="button" onClick={onSaveDefaults} disabled={savingDefaults} className={`${BTN} !text-indigo-700`} data-cert-save-defaults>{savingDefaults ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save as default</button>}
            </div>

            <div className="relative select-none">
                <CertificateCanvas template={template} input={input} images={images} className="block w-full rounded-md bg-white shadow-xl" />
                <svg ref={svg} viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" onPointerDown={() => onSelect(null)} style={{ touchAction: 'none' }} data-cert-overlay>
                    {[...groups.values()].map((g) => {
                        const on = g.key === selected;
                        const lockedEl = elements[g.key]?.locked;
                        const cx = g.box.x + g.box.w / 2, cy = g.box.y + g.box.h / 2;
                        const pad = 6;
                        return (
                            <g key={g.key} transform={g.rot ? `rotate(${g.rot} ${cx} ${cy})` : undefined} className="group" data-cert-element={g.key}>
                                <rect x={g.box.x - pad} y={g.box.y - pad} width={g.box.w + pad * 2} height={g.box.h + pad * 2} rx={4}
                                    fill="transparent" stroke={on ? '#4f46e5' : '#818cf8'} strokeWidth={on ? 2.5 : 1.5} strokeDasharray={on ? '0' : '6 5'}
                                    className={on ? '' : 'opacity-0 transition-opacity group-hover:opacity-100'} style={{ cursor: lockedEl ? 'not-allowed' : 'move' }}
                                    onPointerDown={(e) => startDrag(e, g.key, 'move')}
                                    onDoubleClick={() => { if (g.text) setTimeout(() => textBox.current?.focus(), 0); }} />
                                {on && !lockedEl && (
                                    <>
                                        <rect x={g.box.x + g.box.w + pad - 9} y={g.box.y + g.box.h + pad - 9} width={18} height={18} rx={4} fill="#4f46e5" stroke="#fff" strokeWidth={3}
                                            style={{ cursor: 'nwse-resize' }} onPointerDown={(e) => startDrag(e, g.key, 'scale')} data-cert-resize />
                                        {g.key !== 'qr' && (
                                            <>
                                                <line x1={cx} y1={g.box.y - pad} x2={cx} y2={g.box.y - pad - 28} stroke="#4f46e5" strokeWidth={2} />
                                                <circle cx={cx} cy={g.box.y - pad - 34} r={9} fill="#fff" stroke="#4f46e5" strokeWidth={3}
                                                    style={{ cursor: 'grab' }} onPointerDown={(e) => startDrag(e, g.key, 'rotate')} data-cert-rotate />
                                            </>
                                        )}
                                    </>
                                )}
                                {on && lockedEl && <circle cx={g.box.x + g.box.w + pad} cy={g.box.y - pad} r={11} fill="#f59e0b" />}
                            </g>
                        );
                    })}
                    {guides.map((l, i) => (l.v !== undefined
                        ? <line key={i} x1={l.v} y1={0} x2={l.v} y2={H} stroke="#ec4899" strokeWidth={1.5} strokeDasharray="8 6" />
                        : <line key={i} x1={0} y1={l.h} x2={W} y2={l.h} stroke="#ec4899" strokeWidth={1.5} strokeDasharray="8 6" />))}
                </svg>
            </div>

            {/* The selected element. */}
            {sel ? (
                <div className="space-y-2 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3" data-cert-toolbar={selected}>
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="mr-1 text-xs font-black uppercase tracking-wide text-indigo-700">{LABELS[selected] || selected}</span>
                        <span className="flex-1" />
                        <label className="inline-flex items-center gap-1 text-xs font-bold text-slate-500">Rotate
                            <input type="number" value={el.rot || 0} onChange={(e) => edit({ rot: clamp(Number(e.target.value) || 0, -360, 360) })} className="h-8 w-16 rounded-lg border border-slate-300 px-1.5 text-xs" />°
                        </label>
                        <button type="button" onClick={() => edit({ z: (el.z || 0) + 1 })} className={BTN} title="Bring forward"><ArrowUp size={14} /></button>
                        <button type="button" onClick={() => edit({ z: (el.z || 0) - 1 })} className={BTN} title="Send backward"><ArrowDown size={14} /></button>
                        <button type="button" onClick={() => edit({ locked: !el.locked })} className={`${BTN} ${el.locked ? ON : ''}`} title={el.locked ? 'Unlock' : 'Lock'} data-cert-lock>{el.locked ? <Lock size={14} /> : <Unlock size={14} />}</button>
                        <button type="button" onClick={() => { edit({ hidden: true }); onSelect(null); }} className={BTN} title="Hide"><EyeOff size={14} /></button>
                        <button type="button" onClick={() => { onBegin(); const next = { ...elements }; delete next[selected]; onElements(next); }} className={BTN} title="Reset this element" data-cert-reset-element><RotateCcw size={14} /></button>
                    </div>
                    {t && (
                        <>
                            {textValue !== null && (
                                t.t === 'para'
                                    ? <textarea ref={textBox} value={textValue} onChange={(e) => onText(selected, e.target.value)} disabled={!!locked} rows={2} className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm disabled:bg-slate-100" data-cert-text-input />
                                    : <input ref={textBox} value={textValue} onChange={(e) => onText(selected, e.target.value)} disabled={!!locked} className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm disabled:bg-slate-100" data-cert-text-input />
                            )}
                            {locked && <p className="text-[11px] font-semibold text-slate-500">{locked}</p>}
                            <div className="flex flex-wrap items-center gap-1.5">
                                <Dropdown small value={CT.familyOf(t.font)} onChange={(v) => edit({ family: v })} options={[['serif', 'Serif (Times)'], ['sans', 'Sans (Helvetica)'], ['mono', 'Mono (Courier)']]} className="h-8 w-40 rounded-lg border border-slate-300 bg-white px-2 text-xs font-bold" data-cert-font />
                                <input type="number" min={6} max={300} value={size} onChange={(e) => setSize(Number(e.target.value))} className="h-8 w-16 rounded-lg border border-slate-300 px-1.5 text-xs" title="Font size" data-cert-size />
                                <button type="button" onClick={() => edit({ bold: !style.bold })} className={`${BTN} ${style.bold ? ON : ''}`} title="Bold" data-cert-bold><Bold size={14} /></button>
                                <button type="button" onClick={() => edit({ italic: !style.italic })} className={`${BTN} ${style.italic ? ON : ''}`} title="Italic" data-cert-italic><Italic size={14} /></button>
                                <input type="color" value={/^#[0-9a-f]{6}$/i.test(t.color) ? t.color : '#000000'} onChange={(e) => edit({ color: e.target.value })} className="h-8 w-10 cursor-pointer rounded-lg border border-slate-300 bg-white p-0.5" title="Colour" data-cert-color />
                                {[['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight]].map(([a, Icon]) => (
                                    <button key={a} type="button" onClick={() => setAlign(a)} className={`${BTN} ${(t.align || 'left') === a ? ON : ''}`} title={`Align ${a}`}><Icon size={14} /></button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            ) : (
                <p className="text-xs text-slate-500">Click anything on the certificate to move, resize, rotate or edit it. Double-click text to type.</p>
            )}
        </div>
    );
}
