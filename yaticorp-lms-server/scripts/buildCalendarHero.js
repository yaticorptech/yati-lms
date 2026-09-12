/**
 * Rebuilds the two derived calendar-hero files from the supplied banner.
 *
 *   node scripts/buildCalendarHero.js
 *
 * Run from yaticorp-lms-server, which is the workspace `canvas` is installed
 * in. Reads calendar-hero.png from the student app's public/illustrations and
 * writes calendar-hero-art.png and calendar-hero-bg.png back beside it; the
 * README there explains what each file is for and why the steps are what they
 * are. Nothing at runtime calls this — it is here so replacing the supplied
 * banner does not mean working the crop out again.
 */
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

// Resolved from this file, so the script runs from anywhere.
const DIR = path.resolve(
  __dirname,
  '../../yaticorp-lms-student/public/illustrations'
);

// The seam: right of the painted white text card and of the left sparkle
// burst, left of the books — the leftmost thing in the scene.
const SEAM_X = 980;
// The supplied file sits on a white page with a margin below and to the
// right of the picture. Trimmed, so the scene bleeds to every edge.
const CONTENT_RIGHT = 2160;
const CONTENT_BOTTOM = 678;

const BG_WIDTH = 4400;      // ~6.5:1, so `cover` never crops the scene vertically
const FLAT = '#f3f2fd';     // the pale lavender the banner's left half settles to

(async () => {
  const src = await loadImage(path.join(DIR, 'calendar-hero.png'));

  // ---- Step 1: the scene alone ----
  const aw = CONTENT_RIGHT - SEAM_X;
  const ah = CONTENT_BOTTOM;
  const art = createCanvas(aw, ah);
  art.getContext('2d').drawImage(src, SEAM_X, 0, aw, ah, 0, 0, aw, ah);
  // ---- Step 1a: lose the painted card's corner ----
  // The white panel the headline was painted on has a rounded bottom-right
  // corner that reaches past the seam, so the crop inherits a white swoosh
  // sweeping out from under the desk — in the banner it is hidden behind the
  // card's own body, here it is in open background beside the books.
  //
  // Blurred rather than painted over: everything it crosses is already a
  // smooth pale gradient, so a wide enough blur dissolves the edge and
  // cannot invent anything that was not there. The phone and the desk are
  // held out of it by colour — both are far more saturated than the haze
  // around them — and held out of the samples too, so nothing bleeds.
  {
    const actx = art.getContext('2d');
    const im = actx.getImageData(0, 0, aw, ah);
    const s0 = Uint8ClampedArray.from(im.data);
    const at = (x, y) => (y * aw + x) * 4;
    const keep = (x, y) => {
      const i = at(x, y);
      const r = s0[i], g = s0[i + 1], b = s0[i + 2];
      const sat = Math.max(r, g, b) - Math.min(r, g, b);
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      return sat > 62 || luma < 192;
    };

    const X0 = 330, Y0 = 445, FEATHER = 95, R = 40;
    for (let y = Y0; y < ah; y++) {
      for (let x = 0; x < X0; x++) {
        if (keep(x, y)) continue;
        // Full strength away from the edges of the patch, fading to nothing
        // at them so the repair has no border of its own.
        const m = Math.min(1, (X0 - x) / FEATHER) * Math.min(1, (y - Y0) / FEATHER);
        if (m <= 0) continue;

        let r = 0, g = 0, b = 0, n = 0;
        for (let k = Math.max(0, y - R); k <= Math.min(ah - 1, y + R); k++) {
          for (let j = Math.max(0, x - R); j <= Math.min(aw - 1, x + R); j++) {
            if (keep(j, k)) continue;
            const i = at(j, k);
            r += s0[i]; g += s0[i + 1]; b += s0[i + 2]; n++;
          }
        }
        if (!n) continue;
        const i = at(x, y);
        im.data[i]     = s0[i]     + (r / n - s0[i]) * m;
        im.data[i + 1] = s0[i + 1] + (g / n - s0[i + 1]) * m;
        im.data[i + 2] = s0[i + 2] + (b / n - s0[i + 2]) * m;
      }
    }
    actx.putImageData(im, 0, 0);
  }

  fs.writeFileSync(path.join(DIR, 'calendar-hero-art.png'), art.toBuffer('image/png'));
  console.log(`calendar-hero-art.png  ${aw}x${ah}`);

  // ---- Step 2: the same scene with its background extended leftwards ----
  const bg = createCanvas(BG_WIDTH, ah);
  const bctx = bg.getContext('2d');
  const offset = BG_WIDTH - aw;

  // Each row continues leftwards in its own colour, averaged over the first
  // few columns so a single noisy pixel cannot streak the whole width.
  const edge = art.getContext('2d').getImageData(0, 0, 4, ah).data;
  const rows = [];
  for (let y = 0; y < ah; y++) {
    let r = 0, g = 0, b = 0;
    for (let x = 0; x < 4; x++) {
      const i = (y * 4 + x) * 4;
      r += edge[i]; g += edge[i + 1]; b += edge[i + 2];
    }
    rows.push([r / 4, g / 4, b / 4]);
  }

  // Smeared as-is, every edge a row crosses — the desk lip, the shelf behind
  // it — draws itself across the whole extension as a hard horizontal band.
  // Blurring the column vertically first keeps the top-to-bottom colour the
  // scene actually has and loses only the stripes.
  const RADIUS = 90;
  const smooth = rows.map((_, y) => {
    let r = 0, g = 0, b = 0, n = 0;
    for (let k = Math.max(0, y - RADIUS); k <= Math.min(ah - 1, y + RADIUS); k++) {
      r += rows[k][0]; g += rows[k][1]; b += rows[k][2]; n++;
    }
    return [r / n, g / n, b / n];
  });

  for (let y = 0; y < ah; y++) {
    const [r, g, b] = smooth[y];
    bctx.fillStyle = `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
    bctx.fillRect(0, y, offset, 1);
  }

  // The far left settles into one flat lavender — the colour the banner's
  // own left half rests on — fading out long before the seam so the join
  // itself is untouched smear.
  const wash = bctx.createLinearGradient(0, 0, offset * 0.6, 0);
  wash.addColorStop(0, FLAT);
  wash.addColorStop(1, 'rgba(243,242,253,0)');
  bctx.fillStyle = wash;
  bctx.fillRect(0, 0, offset, ah);

  // The blurred column meets the unblurred scene at the seam. A narrow
  // band of the real edge colour, fading leftwards, hides that step.
  for (let y = 0; y < ah; y++) {
    const [r, g, b] = rows[y];
    const grad = bctx.createLinearGradient(offset - 260, 0, offset, 0);
    grad.addColorStop(0, `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},0)`);
    grad.addColorStop(1, `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},1)`);
    bctx.fillStyle = grad;
    bctx.fillRect(offset - 260, y, 260, 1);
  }

  bctx.drawImage(art, offset, 0);
  fs.writeFileSync(path.join(DIR, 'calendar-hero-bg.png'), bg.toBuffer('image/png'));
  console.log(`calendar-hero-bg.png   ${BG_WIDTH}x${ah}`);
})();
