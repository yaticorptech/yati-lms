/**
 * A certificate the student uploads, framed with its number (2026-11-11, the user's ask): the same white frame the
 * profile shows it in and downloads it with (student app, components/CertificatesFrame.jsx: UploadedFrame and
 * framedPicture) — white, a hairline round the edge, the certificate on a thin mat, and "Certificate No.
 * YATI<card>-001" on its foot, to the right. That framed picture is what is kept in the student's Drive, shown on
 * their profile and on the public check (/verify).
 *
 * Drawn with node-canvas and a font kept in the repo (Noto Sans Mono Bold), so it looks the same on any server.
 * frame() resolves to a PNG, or null when the picture cannot be read (the upload then goes ahead unframed).
 */
const path = require('path');
const fs = require('fs');

let canvasLib = null;
const lib = () => {
    if (canvasLib) return canvasLib;
    canvasLib = require('canvas');
    const font = path.join(__dirname, '..', 'teacher', 'fonts', 'NotoSansMono-Bold.ttf');
    if (fs.existsSync(font)) canvasLib.registerFont(font, { family: 'FrameMono', weight: 'bold' });
    return canvasLib;
};

const MAX_SIDE = 2400;

/**
 * @param {Buffer} picture  the certificate as an image (PNG/JPEG; a PDF's first page drawn by the browser)
 * @param {{ number: string }} words
 * @returns {Promise<Buffer|null>} a PNG
 */
const frame = async (picture, { number }) => {
    try {
        const { createCanvas, loadImage } = lib();
        const img = await loadImage(picture);
        const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        // The profile's own proportions (framedPicture): padding, a thin mat, and a band at the foot for the number.
        const pad = Math.max(16, Math.round(Math.max(w, h) * 0.035));
        const mat = Math.round(pad * 0.4);
        const band = Math.round(pad * 1.6);
        const W = w + 2 * (pad + mat);
        const H = h + 2 * mat + pad + band;
        const canvas = createCanvas(W, H);
        const g = canvas.getContext('2d');

        // White, with a hairline round the edge — no coloured border.
        g.fillStyle = '#ffffff';
        g.fillRect(0, 0, W, H);
        g.strokeStyle = '#e2e8f0';
        g.lineWidth = Math.max(1, Math.round(pad / 12));
        g.strokeRect(g.lineWidth / 2, g.lineWidth / 2, W - g.lineWidth, H - g.lineWidth);
        // The certificate, its corners softly rounded, with a hairline of its own
        const x = pad + mat, y = pad + mat, r = Math.max(4, Math.round(pad * 0.35));
        g.save();
        g.beginPath();
        g.roundRect(x, y, w, h, r);
        g.clip();
        g.drawImage(img, x, y, w, h);
        g.restore();
        g.strokeStyle = '#cbd5e1';
        g.lineWidth = Math.max(1, Math.round(pad / 16));
        g.beginPath();
        g.roundRect(x, y, w, h, r);
        g.stroke();

        // "Certificate No. YATI…-001" on the foot, to the right
        g.textBaseline = 'middle';
        g.textAlign = 'right';
        g.fillStyle = '#334155';
        const text = `Certificate No. ${number}`;
        let size = Math.round(band * 0.38);
        for (; size > 8; size -= 1) { g.font = `bold ${size}px FrameMono`; if (g.measureText(text).width <= W - 2 * pad) break; }
        g.fillText(text, W - pad, H - band / 2);

        return canvas.toBuffer('image/png');
    } catch (e) {
        console.warn('[certificateFrame] not framed:', e.message);
        return null;
    }
};

module.exports = { frame };
