/** The Certificate Builder's helpers: the two sides' addresses, downloads, and pictures from the computer. */
import api from '../utils/api';

/** Where each side's builder talks to, and where its pages are. */
export const SIDES = {
    platform: { apiBase: '/competitions/admin/certificates', base: '/competitions/certificates', back: '/competitions', backLabel: 'Games & Competitions' },
    organization: { apiBase: '/competitions/org/certificates', base: '/organization/competitions/certificates', back: '/organization/competitions', backLabel: 'Competition management' }
};

export const AWARD_OPTIONS = [['first', '1st place'], ['second', '2nd place'], ['third', '3rd place'], ['participation', 'Participation'], ['custom', 'Custom award…']];
export const awardFromPlace = (place) => ({ 1: 'first', 2: 'second', 3: 'third' }[place] || 'participation');
export const awardLabel = (award) => (award?.kind === 'custom' ? award.title || 'Custom award' : AWARD_OPTIONS.find(([k]) => k === award?.kind)?.[1] || 'Participation');

/** Fetch a PDF and save it. Errors come back as a blob: read the message out of it. */
export const downloadPdf = async (url, fileName) => {
    try {
        const r = await api.get(url, { responseType: 'blob' });
        const href = URL.createObjectURL(r.data);
        const a = Object.assign(document.createElement('a'), { href, download: fileName.replace(/[^\w.-]+/g, '_') });
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(href), 10000);
    } catch (err) {
        const blob = err.response?.data;
        if (blob instanceof Blob) {
            try { throw new Error(JSON.parse(await blob.text()).message || 'Could not download the PDF.'); } catch (e) { throw new Error(e.message || 'Could not download the PDF.'); }
        }
        throw err;
    }
};

/**
 * A picture chosen on the computer, as a data URL small enough to send: at most `max` px on its longer side,
 * PNG (keeps a signature's or a seal's transparent background) or JPEG for photographs.
 */
/**
 * The part of a picture that is not blank: its bounding box once the white or transparent border is left out
 * (2026-10-31: "the logo is too small" — an uploaded crest sat in a large white square).
 */
const contentBox = (img) => {
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const { data } = g.getImageData(0, 0, c.width, c.height);
    let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
    for (let y = 0; y < c.height; y += 1) {
        for (let x = 0; x < c.width; x += 1) {
            const i = (y * c.width + x) * 4;
            const blank = data[i + 3] < 24 || (data[i] > 238 && data[i + 1] > 238 && data[i + 2] > 238);
            if (!blank) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        }
    }
    if (x1 < 0) return { x: 0, y: 0, w: img.width, h: img.height };
    const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.02);
    x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(img.width - 1, x1 + pad); y1 = Math.min(img.height - 1, y1 + pad);
    return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
};

/** `trim`: crop the blank border off first (logos, seals, signatures). */
export const readPicture = (file, max = 900, format = null, trim = false) => new Promise((resolve, reject) => {
    if (!file) return resolve('');
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) return reject(new Error('Choose a PNG or JPG picture.'));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that picture.'));
    reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Could not read that picture.'));
        img.onload = () => {
            const box = trim ? contentBox(img) : { x: 0, y: 0, w: img.width, h: img.height };
            const scale = Math.min(1, max / Math.max(box.w, box.h));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(box.w * scale)); canvas.height = Math.max(1, Math.round(box.h * scale));
            canvas.getContext('2d').drawImage(img, box.x, box.y, box.w, box.h, 0, 0, canvas.width, canvas.height);
            const png = format ? format === 'png' : file.type !== 'image/jpeg';
            resolve(canvas.toDataURL(png ? 'image/png' : 'image/jpeg', png ? undefined : 0.86));
        };
        img.src = reader.result;
    };
    reader.readAsDataURL(file);
});
