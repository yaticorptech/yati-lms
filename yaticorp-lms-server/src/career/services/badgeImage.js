/**
 * @description Draws the shareable milestone badge as a PNG.
 *
 * 1200×630 rather than a square. A badge posted to LinkedIn, X or WhatsApp is
 * almost never opened as a file — it is seen as the preview card attached to a
 * link, and every one of those platforms crops to roughly 1.91:1. A beautiful
 * square badge gets its top and bottom sliced off in the only place it is
 * actually looked at, so the emblem sits inside a card cut to the shape the
 * feed will show.
 *
 * Everything is drawn with primitives; the only asset is the wordmark.
 */
const path = require('path');
const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');

const WIDTH = 1200;
const HEIGHT = 630;
const LOGO = path.join(__dirname, '..', '..', '..', 'public', 'assets', 'YATICORP.png');

// The Career Path palette, so a badge posted publicly looks like the product
// the student earned it in.
const INK = '#ffffff';
const MUTED = '#93b4fd';
const GOLD = '#fbbf24';

/**
 * Has this machine got any usable font?
 *
 * node-canvas draws text through fontconfig. A slim Linux container often ships
 * with no fonts at all, and the failure mode is silent — every string measures
 * zero and the badge renders as a background with nothing on it. Checked once
 * so the log says what is wrong instead of a student sharing a blank card.
 */
let fontWarningShown = false;
const checkFonts = (ctx) => {
  ctx.font = 'bold 40px sans-serif';
  if (ctx.measureText('YATICORP').width > 0) return true;
  if (!fontWarningShown) {
    console.error(
      '[career] No fonts available to node-canvas — milestone badges will render ' +
      'without text. Install a font package in the deploy image (e.g. ' +
      'fonts-dejavu-core and fontconfig on Debian/Ubuntu).'
    );
    fontWarningShown = true;
  }
  return false;
};

/** Wrap `text` to at most `maxLines` lines that each fit `maxWidth`. */
const wrap = (ctx, text, maxWidth, maxLines) => {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  // Anything that did not fit is signalled rather than silently dropped.
  if (lines.length === maxLines) {
    const joined = lines.join(' ');
    const remaining = words.join(' ').slice(joined.length).trim();
    if (remaining) {
      let last = lines[maxLines - 1];
      while (last && ctx.measureText(`${last}…`).width > maxWidth) {
        last = last.slice(0, -1).trimEnd();
      }
      lines[maxLines - 1] = `${last}…`;
    }
  }
  return lines;
};

/** A rounded rectangle path, for the pills. */
const roundRect = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

/** The circular emblem: a ring, a laurel-ish notch pattern, and the phase number. */
const drawEmblem = (ctx, cx, cy, radius, phaseNumber) => {
  // Outer glow
  const glow = ctx.createRadialGradient(cx, cy, radius * 0.4, cx, cy, radius * 1.5);
  glow.addColorStop(0, 'rgba(96,140,250,0.45)');
  glow.addColorStop(1, 'rgba(96,140,250,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Disc
  const disc = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
  disc.addColorStop(0, '#2547eb');
  disc.addColorStop(1, '#1e2d8a');
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  // Gold ring
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 10, 0, Math.PI * 2);
  ctx.stroke();

  // Ticks around the ring — reads as an award without needing an icon font.
  ctx.strokeStyle = 'rgba(251,191,36,0.55)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 24; i += 1) {
    const angle = (i / 24) * Math.PI * 2;
    const inner = radius + 6;
    const outer = radius + (i % 2 === 0 ? 20 : 12);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
    ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
    ctx.stroke();
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = MUTED;
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('PHASE', cx, cy - 26);

  ctx.fillStyle = INK;
  ctx.font = 'bold 92px sans-serif';
  ctx.fillText(String(phaseNumber), cx, cy + 48);
  ctx.textAlign = 'left';
};

/**
 * Render the badge.
 *
 * @param {object} badge  phaseTitle, studentName, careerGoal, phaseIndex, issuedAt, shareCode
 * @returns {Promise<Buffer>} PNG
 */
const renderBadge = async (badge) => {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  // ── Background ───────────────────────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bg.addColorStop(0, '#1e2faf');
  bg.addColorStop(0.55, '#1e2d8a');
  bg.addColorStop(1, '#0b0f15');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // The same dot field the roadmap and rewards banners use in the app.
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  for (let y = 20; y < HEIGHT; y += 22) {
    for (let x = 20; x < WIDTH; x += 22) {
      ctx.beginPath();
      ctx.arc(x, y, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  checkFonts(ctx);

  // ── Emblem ───────────────────────────────────────────────────────────────
  drawEmblem(ctx, 250, HEIGHT / 2 - 10, 150, (badge.phaseIndex ?? 0) + 1);

  // ── Right-hand column ────────────────────────────────────────────────────
  const left = 470;
  const maxTextWidth = WIDTH - left - 70;

  ctx.fillStyle = GOLD;
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('MILESTONE ACHIEVED', left, 132);

  ctx.fillStyle = INK;
  ctx.font = 'bold 52px sans-serif';
  const titleLines = wrap(ctx, badge.phaseTitle, maxTextWidth, 2);
  titleLines.forEach((line, i) => ctx.fillText(line, left, 200 + i * 62));

  const afterTitle = 200 + titleLines.length * 62;

  ctx.fillStyle = MUTED;
  ctx.font = '28px sans-serif';
  ctx.fillText('completed by', left, afterTitle + 22);

  ctx.fillStyle = INK;
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText(wrap(ctx, badge.studentName, maxTextWidth, 1)[0] || '', left, afterTitle + 70);

  // Goal pill — the context that makes the milestone mean something to a reader
  // who has never heard of the roadmap.
  if (badge.careerGoal) {
    ctx.font = 'bold 22px sans-serif';
    const label = `on the path to ${badge.careerGoal}`;
    const textWidth = Math.min(ctx.measureText(label).width, maxTextWidth);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    roundRect(ctx, left, afterTitle + 96, textWidth + 36, 46, 23);
    ctx.fill();
    ctx.fillStyle = MUTED;
    ctx.fillText(wrap(ctx, label, maxTextWidth, 1)[0], left + 18, afterTitle + 126);
  }

  // ── Footer ───────────────────────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, HEIGHT - 96);
  ctx.lineTo(WIDTH - 70, HEIGHT - 96);
  ctx.stroke();

  if (fs.existsSync(LOGO)) {
    try {
      const logo = await loadImage(LOGO);
      const logoHeight = 34;
      const logoWidth = (logo.width / logo.height) * logoHeight;
      ctx.drawImage(logo, left, HEIGHT - 76, logoWidth, logoHeight);
    } catch {
      // A missing or unreadable wordmark must not cost the student their badge.
    }
  }

  const issued = new Date(badge.issuedAt || Date.now()).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = '20px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`Career Path · ${issued}`, WIDTH - 70, HEIGHT - 52);
  ctx.textAlign = 'left';

  return canvas.toBuffer('image/png');
};

module.exports = { renderBadge, WIDTH, HEIGHT };
