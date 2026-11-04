/**
 * Fonts and measuring for the certificate previews and the editor (2026-10-31): the PDF's built-in fonts and the
 * nearest the browser has (`ascent` puts the baseline where pdfkit does), a text's width, and any shape's box.
 */
import { CT } from './design';

export const FONTS = {
    serif: { family: '"Times New Roman", Times, serif', weight: 400, style: 'normal', ascent: 0.683 },
    serifBold: { family: '"Times New Roman", Times, serif', weight: 700, style: 'normal', ascent: 0.683 },
    serifItalic: { family: '"Times New Roman", Times, serif', weight: 400, style: 'italic', ascent: 0.683 },
    script: { family: '"Times New Roman", Times, serif', weight: 700, style: 'italic', ascent: 0.683 },
    sans: { family: 'Helvetica, Arial, sans-serif', weight: 400, style: 'normal', ascent: 0.718 },
    sansBold: { family: 'Helvetica, Arial, sans-serif', weight: 700, style: 'normal', ascent: 0.718 },
    sansItalic: { family: 'Helvetica, Arial, sans-serif', weight: 400, style: 'italic', ascent: 0.718 },
    sansBoldItalic: { family: 'Helvetica, Arial, sans-serif', weight: 700, style: 'italic', ascent: 0.718 },
    mono: { family: '"Courier New", Courier, monospace', weight: 400, style: 'normal', ascent: 0.629 },
    monoBold: { family: '"Courier New", Courier, monospace', weight: 700, style: 'normal', ascent: 0.629 },
    monoItalic: { family: '"Courier New", Courier, monospace', weight: 400, style: 'italic', ascent: 0.629 },
    monoBoldItalic: { family: '"Courier New", Courier, monospace', weight: 700, style: 'italic', ascent: 0.629 }
};

let ctx = null;
export const measure = (text, font, size, spacing = 0) => {
    ctx ||= document.createElement('canvas').getContext('2d');
    const f = FONTS[font] || FONTS.serif;
    ctx.font = `${f.style} ${f.weight} ${size}px ${f.family}`;
    return ctx.measureText(String(text)).width + spacing * String(text).length;
};

/** A text's size once shrunk to fit its width, as the PDF does it. */
export const fittedSize = (s) => {
    let size = s.size;
    while (s.maxW && size > 8 && measure(s.text, s.font, size, s.spacing) > s.maxW) size -= 1;
    return size;
};

/** Any shape's box { x, y, w, h } (unturned), in the design's units. */
export const boxOf = (s) => {
    if (s.t === 'text') {
        const size = fittedSize(s);
        const w = measure(s.text, s.font, size, s.spacing);
        const x = s.align === 'center' ? s.x - w / 2 : s.align === 'right' ? s.x - w : s.x;
        return { x, y: s.y, w, h: size };
    }
    if (s.t === 'para') {
        const lines = CT.wrap(s.text, s.w, (t) => measure(t, s.font, s.size), s.maxLines);
        const w = Math.max(1, ...lines.map((l) => measure(l, s.font, s.size)));
        const x = s.align === 'center' ? s.x - w / 2 : s.align === 'right' ? s.x - w : s.x;
        return { x, y: s.y, w, h: Math.max(s.size, lines.length * s.lineH) };
    }
    if (s.t === 'rich') {
        const fk = (b) => (s.italic ? (b ? 'script' : 'serifItalic') : (b ? 'serifBold' : 'serif'));
        const lines = CT.richLines(s.runs, s.w, (t, b) => measure(t, fk(b), s.size), s.maxLines);
        const w = Math.max(1, ...lines.map((l) => l.width));
        return { x: s.x - w / 2, y: s.y, w, h: Math.max(s.size, lines.length * s.lineH) };
    }
    if (s.t === 'line') return { x: Math.min(s.x1, s.x2), y: Math.min(s.y1, s.y2) - 3, w: Math.abs(s.x2 - s.x1), h: Math.abs(s.y2 - s.y1) + 6 };
    if (s.t === 'circle') return { x: s.cx - s.r, y: s.cy - s.r, w: s.r * 2, h: s.r * 2 };
    if (s.t === 'poly') { const xs = s.pts.map((p) => p[0]), ys = s.pts.map((p) => p[1]); return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }; }
    return { x: s.x, y: s.y, w: s.w || 0, h: s.h || 0 };
};
export const centreOf = (s) => { const b = boxOf(s); return { x: b.x + b.w / 2, y: b.y + b.h / 2 }; };
