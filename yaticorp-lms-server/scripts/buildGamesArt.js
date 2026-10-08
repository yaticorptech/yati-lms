// Cut the game photos, icons and hero art out of the supplied design
// screenshot (2286x1548), into the student app's public folder.
const { createCanvas, loadImage } = require('/Users/yati/Documents/GitHub/yati-lms/yaticorp-lms-server/node_modules/canvas');
const fs = require('fs');
const path = require('path');

const SRC = '/private/tmp/claude-501/-Users-yati-Documents-GitHub-yati-lms/f7ac89ac-beba-47e3-b4fb-291cd937bd21/images/100.png';
const PUB = '/Users/yati/Documents/GitHub/yati-lms/yaticorp-lms-student/public';
const K = 2286 / 2000;   // displayed → original
const o = (v) => Math.round(v * K);

const crop = (img, x, y, w, h) => {
    const c = createCanvas(w, h);
    c.getContext('2d').drawImage(img, x, y, w, h, 0, 0, w, h);
    return c;
};
const save = (canvas, file, type = 'image/png') => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, type === 'image/jpeg' ? canvas.toBuffer('image/jpeg', { quality: 0.9 }) : canvas.toBuffer('image/png'));
    console.log(path.relative(PUB, file), canvas.width + 'x' + canvas.height);
};

(async () => {
    const img = await loadImage(SRC);
    const Y0 = o(476), Y1 = o(678);
    const CARDS = { chess: [232, 651], ludo: [677, 1082], carrom: [1105, 1520], uno: [1545, 1968] };
    for (const [id, [x0, x1]] of Object.entries(CARDS)) {
        save(crop(img, o(x0), Y0, o(x1) - o(x0), Y1 - Y0), path.join(PUB, 'games', `${id}.jpg`), 'image/jpeg');
    }
    const ICONS = { chess: [258, 700], ludo: [700, 700], carrom: [1127, 700], uno: [1572, 700] };
    for (const [id, [x, y]] of Object.entries(ICONS)) {
        save(crop(img, o(x), o(y), o(84), o(84)), path.join(PUB, 'games', `${id}-icon.png`));
    }

    // The hero: the scene right of the painted words, then widened leftwards
    // by smearing a softened copy of its seam column, so `cover` never crops it.
    const seam = Number(process.argv[2] || 1210);
    const hx = o(seam), hy = o(38), hw = o(1968) - hx, hh = o(368) - hy;
    const art = crop(img, hx, hy, hw, hh);
    // The banner's rounded right corners let the page's grey through: paint
    // them from the column just inside.
    const actx = art.getContext('2d');
    const data = actx.getImageData(0, 0, hw, hh);
    const R = 36;
    const px = (x, y) => (y * hw + x) * 4;
    for (let y = 0; y < hh; y += 1) {
        for (let x = hw - R; x < hw; x += 1) {
            const i = px(x, y);
            const [r, g, b] = [data.data[i], data.data[i + 1], data.data[i + 2]];
            if (r > 225 && g > 225 && b > 225) {
                const j = px(hw - R - 1, y);
                data.data[i] = data.data[j]; data.data[i + 1] = data.data[j + 1]; data.data[i + 2] = data.data[j + 2];
            }
        }
    }
    actx.putImageData(data, 0, 0);
    save(art, path.join(PUB, 'illustrations', 'games-hero-art.png'));

    const W = 3400;
    const bg = createCanvas(W, hh);
    const bctx = bg.getContext('2d');
    // Seam column, blurred vertically so no edge crossing it becomes a band.
    const col = [];
    for (let y = 0; y < hh; y += 1) {
        let r = 0, g = 0, b = 0, n = 0;
        for (let d = -24; d <= 24; d += 1) {
            const yy = Math.min(hh - 1, Math.max(0, y + d));
            for (let x = 0; x < 6; x += 1) { const i = px(x, yy); r += data.data[i]; g += data.data[i + 1]; b += data.data[i + 2]; n += 1; }
        }
        col.push([r / n, g / n, b / n]);
    }
    const left = bctx.createImageData(W - hw, hh);
    for (let y = 0; y < hh; y += 1) {
        const [r, g, b] = col[y];
        for (let x = 0; x < W - hw; x += 1) {
            const i = (y * (W - hw) + x) * 4;
            left.data[i] = r; left.data[i + 1] = g; left.data[i + 2] = b; left.data[i + 3] = 255;
        }
    }
    bctx.putImageData(left, 0, 0);
    bctx.drawImage(art, W - hw, 0);
    // No hard seam: the smear fades out over the first 220px of the art.
    const FADE = 220;
    const seamPixels = bctx.getImageData(W - hw, 0, FADE, hh);
    for (let y = 0; y < hh; y += 1) {
        const [r, g, b] = col[y];
        for (let x = 0; x < FADE; x += 1) {
            const t = 1 - x / FADE;
            const i = (y * FADE + x) * 4;
            seamPixels.data[i] = seamPixels.data[i] * (1 - t) + r * t;
            seamPixels.data[i + 1] = seamPixels.data[i + 1] * (1 - t) + g * t;
            seamPixels.data[i + 2] = seamPixels.data[i + 2] * (1 - t) + b * t;
        }
    }
    bctx.putImageData(seamPixels, W - hw, 0);
    save(bg, path.join(PUB, 'illustrations', 'games-hero-bg.png'));
})();
