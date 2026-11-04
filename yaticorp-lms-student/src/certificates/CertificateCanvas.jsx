/**
 * The Certificate Builder's live preview: a template's shapes (templates.shared.js — the server draws the same ones
 * into the PDF) drawn as SVG. Words are measured and fitted the way the PDF does it, so the preview is the print.
 */
import { memo, useId, useMemo, useRef } from 'react';
import { CT } from './design';
import { FONTS, measure, centreOf } from './metrics';

/** A stand-in QR code for the preview (the real one, with the certificate's link, is on the PDF). */
function FakeQr({ x, y, w, seed }) {
    const n = 21; const cell = w / n; const cells = [];
    let h = 0; for (const ch of String(seed)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const finder = (r, c) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
    for (let r = 0; r < n; r += 1) for (let c = 0; c < n; c += 1) {
        if (finder(r, c)) continue;
        h = (h * 1103515245 + 12345) >>> 0;
        if ((h >>> 16) & 1) cells.push(<rect key={`${r}-${c}`} x={x + c * cell} y={y + r * cell} width={cell} height={cell} fill="#111" />);
    }
    const eye = (r, c) => <g key={`e${r}${c}`}><rect x={x + c * cell} y={y + r * cell} width={cell * 7} height={cell * 7} fill="#111" /><rect x={x + (c + 1) * cell} y={y + (r + 1) * cell} width={cell * 5} height={cell * 5} fill="#fff" /><rect x={x + (c + 2) * cell} y={y + (r + 2) * cell} width={cell * 3} height={cell * 3} fill="#111" /></g>;
    return <g>{cells}{eye(0, 0)}{eye(0, n - 7)}{eye(n - 7, 0)}</g>;
}

/**
 * @param template  template id
 * @param input     the details (templates.shared.js `words`)
 * @param images    { logo, seal, sig0, sig1, sig2 }: data URLs or paths
 */
function CertificateCanvas({ template, input, images = {}, className = '', onLogoMove = null, onSealMove = null }) {
    const uid = useId().replace(/:/g, '');
    const shapes = useMemo(() => CT.layout(template, input), [template, input]);
    const [W, H] = CT.sizeOf(template);
    const svg = useRef(null);
    /** The pointer, in the page's own units. */
    const pointAt = (e) => {
        const m = svg.current?.getScreenCTM();
        if (!m) return null;
        const p = svg.current.createSVGPoint();
        p.x = e.clientX; p.y = e.clientY;
        return p.matrixTransform(m.inverse());
    };
    /** Dragging the logo (2026-10-31): its centre follows the pointer; `onLogoMove({ fx, fy })` as shares of the page. */
    /** Resizing the logo from its corner: its size (fs) as a multiple of the template's own; its centre stays. */
    const resizeLogo = (e, box, cb) => {
        if (!cb) return;
        e.preventDefault(); e.stopPropagation();
        const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
        const baseW = box.base?.w || box.w, baseH = box.base?.h || box.h;
        const move = (ev) => {
            const p = pointAt(ev);
            if (!p) return;
            const fs = Math.min(5, Math.max(0.2, Math.max(Math.abs(p.x - cx) / (baseW / 2), Math.abs(p.y - cy) / (baseH / 2))));
            cb({ fx: cx / W, fy: cy / H, fs });
        };
        const stop = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', stop); window.removeEventListener('pointercancel', stop); };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', stop);
        window.addEventListener('pointercancel', stop);
    };
    const dragLogo = (e, box, cb) => {
        if (!cb) return;
        e.preventDefault();
        const start = pointAt(e);
        if (!start) return;
        const dx = start.x - (box.x + box.w / 2), dy = start.y - (box.y + box.h / 2);
        const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
        const move = (ev) => {
            const p = pointAt(ev);
            if (p) cb({ fx: clamp((p.x - dx) / W, box.w / 2 / W, 1 - box.w / 2 / W), fy: clamp((p.y - dy) / H, box.h / 2 / H, 1 - box.h / 2 / H), fs: box.fs });
        };
        const stop = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', stop); window.removeEventListener('pointercancel', stop); };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', stop);
        window.addEventListener('pointercancel', stop);
    };
    return (
        <svg ref={svg} viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label="Certificate preview" xmlns="http://www.w3.org/2000/svg" data-certificate-canvas={template}>
            {shapes.map((s, i) => {
                const node = (() => {
                const op = s.opacity != null ? { opacity: s.opacity } : {};
                switch (s.t) {
                    case 'bg':
                        // The design's picture, its words taken out (public/assets/certificates).
                        if (s.slot) return images[s.slot] ? <image key={i} href={images[s.slot]} x={0} y={0} width={W} height={H} preserveAspectRatio="none" /> : <rect key={i} x={0} y={0} width={W} height={H} fill="#ffffff" />;
                        return <image key={i} href={`/assets/certificates/${s.src}`} x={0} y={0} width={W} height={H} preserveAspectRatio="none" />;
                    case 'pic':
                        return <image key={i} href={`/assets/certificates/${s.src}`} x={s.x} y={s.y} width={s.w} height={s.h} preserveAspectRatio="xMidYMid meet" />;
                    case 'rect':
                        return <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.r || 0} fill={s.fill || 'none'} stroke={s.stroke || 'none'} strokeWidth={s.sw || 0} {...op} />;
                    case 'grad': {
                        const id = `${uid}g${i}`;
                        const [x2, y2] = s.dir === 'h' ? ['1', '0'] : s.dir === 'v' ? ['0', '1'] : ['1', '1'];
                        return <g key={i}><defs><linearGradient id={id} x1="0" y1="0" x2={x2} y2={y2}><stop offset="0" stopColor={s.from} /><stop offset="1" stopColor={s.to} /></linearGradient></defs><rect x={s.x} y={s.y} width={s.w} height={s.h} fill={`url(#${id})`} {...op} /></g>;
                    }
                    case 'poly':
                        return <polygon key={i} points={s.pts.map((p) => p.join(',')).join(' ')} fill={s.fill} {...op} />;
                    case 'circle':
                        return <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={s.fill || 'none'} stroke={s.stroke || 'none'} strokeWidth={s.sw || 0} {...op} />;
                    case 'line':
                        return <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={s.stroke} strokeWidth={s.sw} />;
                    case 'text': {
                        const f = FONTS[s.font] || FONTS.serif;
                        let size = s.size;
                        while (s.maxW && size > 8 && measure(s.text, s.font, size, s.spacing) > s.maxW) size -= 1;
                        return <text key={i} x={s.x} y={s.y + size * f.ascent} fontFamily={f.family} fontWeight={f.weight} fontStyle={f.style} fontSize={size} fill={s.color}
                            textAnchor={s.align === 'center' ? 'middle' : s.align === 'right' ? 'end' : 'start'} letterSpacing={s.spacing || undefined} {...op}>{s.text}</text>;
                    }
                    case 'para': {
                        const f = FONTS[s.font] || FONTS.serif;
                        const lines = CT.wrap(s.text, s.w, (t) => measure(t, s.font, s.size), s.maxLines);
                        return <g key={i}>{lines.map((line, j) => <text key={j} x={s.x} y={s.y + j * s.lineH + s.size * f.ascent} fontFamily={f.family} fontWeight={f.weight} fontStyle={f.style} fontSize={s.size} fill={s.color} textAnchor={s.align === 'center' ? 'middle' : s.align === 'right' ? 'end' : 'start'}>{line}</text>)}</g>;
                    }
                    case 'rich': {
                        // Plain and bold words, wrapped and centred as the PDF does it (templates.shared.js richLines).
                        const fk = (bold) => (s.italic ? (bold ? 'script' : 'serifItalic') : (bold ? 'serifBold' : 'serif'));
                        const f = FONTS[fk(false)], fb = FONTS[fk(true)];
                        const lines = CT.richLines(s.runs, s.w, (t, bold) => measure(t, fk(bold), s.size), s.maxLines);
                        return <g key={i}>{lines.map((line, j) => line.words.map((w, k) => (
                            <text key={`${j}-${k}`} x={s.x + w.x} y={s.y + j * s.lineH + s.size * f.ascent} fontFamily={(w.bold ? fb : f).family} fontWeight={(w.bold ? fb : f).weight} fontStyle={(w.bold ? fb : f).style} fontSize={s.size} fill={w.color || (w.bold ? s.boldColor : s.color)} xmlSpace="preserve">{w.text}</text>
                        )))}</g>;
                    }
                    case 'img': {
                        if (s.slot === 'qr') return <FakeQr key={i} x={s.x} y={s.y} w={s.w} seed={input?.certId || 'preview'} />;
                        if (s.shape && s.shape !== 'original' && images[s.slot] && !(s.slot === 'logo' && onLogoMove)) {
                            const cid = `${uid}c${i}`;
                            return <g key={i}><defs><clipPath id={cid}>{s.shape === 'circle' ? <circle cx={s.x + s.w / 2} cy={s.y + s.h / 2} r={s.w / 2} /> : <rect x={s.x} y={s.y} width={s.w} height={s.h} />}</clipPath></defs>
                                <image href={images[s.slot]} x={s.x} y={s.y} width={s.w} height={s.h} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${cid})`} /></g>;
                        }
                        if (!images[s.slot]) return null;
                        // The logo and the seal can be moved and resized in the preview (2026-10-31).
                        const mover = s.slot === 'logo' ? onLogoMove : s.slot === 'seal' ? onSealMove : null;
                        if (mover) {
                            // Movable: a dashed outline shows it can be dragged.
                            return (
                                <g key={i} onPointerDown={(e) => dragLogo(e, s, mover)} style={{ cursor: 'move', touchAction: 'none' }} className="group" data-cert-drag={s.slot}>
                                    {s.shape && s.shape !== 'original' ? (
                                        <>
                                            <defs><clipPath id={`${uid}c${i}`}>{s.shape === 'circle' ? <circle cx={s.x + s.w / 2} cy={s.y + s.h / 2} r={s.w / 2} /> : <rect x={s.x} y={s.y} width={s.w} height={s.h} />}</clipPath></defs>
                                            <image href={images[s.slot]} x={s.x} y={s.y} width={s.w} height={s.h} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${uid}c${i})`} />
                                        </>
                                    ) : <image href={images[s.slot]} x={s.x} y={s.y} width={s.w} height={s.h} preserveAspectRatio="xMidYMid meet" />}
                                    <rect x={s.x - 4} y={s.y - 4} width={s.w + 8} height={s.h + 8} fill="transparent" stroke="#6366f1" strokeWidth={2} strokeDasharray="8 6" rx={6} className="opacity-0 transition-opacity group-hover:opacity-100" />
                                    {/* The corner handle: drag to make the logo bigger or smaller. */}
                                    <rect x={s.x + s.w - 9} y={s.y + s.h - 9} width={22} height={22} rx={5} fill="#6366f1" stroke="#ffffff" strokeWidth={3}
                                        style={{ cursor: 'nwse-resize' }} onPointerDown={(e) => resizeLogo(e, s, mover)} className="opacity-0 transition-opacity group-hover:opacity-100" data-cert-logo-resize />
                                </g>
                            );
                        }
                        return <image key={i} href={images[s.slot]} x={s.x} y={s.y} width={s.w} height={s.h} preserveAspectRatio="xMidYMid meet" />;
                    }
                    default:
                        return null;
                }
                })();
                // Turned about its centre (the Smart Certificate Builder).
                if (!node || !s.rot) return node;
                const c = centreOf(s);
                return <g key={`r${i}`} transform={`rotate(${s.rot} ${c.x} ${c.y})`}>{node}</g>;
            })}
        </svg>
    );
}

export default memo(CertificateCanvas);
