/**
 * A group room's invitation as a picture (2026-11-03): the game's picture, its name and what it is, the room code,
 * the link (it opens Group games with the code filled in), and "Powered by YATICORP" — shared to
 * WhatsApp, Instagram or email as a card, not just a line of text.
 */
// Portrait (2026-11-04): the game's picture across the top, then the words, the code and the link.
const W = 1080;
const H = 1700;

/** The link in an invitation: Group games, its Join box holding the code. */
export const inviteLink = (code) => `${window.location.origin}/games?mode=group&code=${encodeURIComponent(code)}`;
export const inviteText = (label, code) => `Join my ${label} room on YATICORP! Room code: ${code}\nOpen ${inviteLink(code)} and paste the code.`;

const load = (src) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
});

const rounded = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
};

/** The card, drawn: a PNG Blob. */
/** Words wrapped into lines no wider than `max`, at most `limit` lines (the last ends in … when cut). */
const wrap = (ctx, text, max, limit) => {
    const lines = [];
    let line = '';
    for (const word of String(text || '').split(/\s+/).filter(Boolean)) {
        const next = line ? `${line} ${word}` : word;
        if (ctx.measureText(next).width <= max || !line) line = next;
        else { lines.push(line); line = word; }
    }
    if (line) lines.push(line);
    if (lines.length > limit) { lines.length = limit; lines[limit - 1] = `${lines[limit - 1].replace(/\s+\S*$/, '')}…`; }
    return lines;
};

export async function drawInviteCard({ game, label, blurb, players, code, host }) {
    // Drawn at twice its size (2026-11-04), so the picture and the words stay sharp on a phone's screen.
    const SCALE = 2;
    const canvas = document.createElement('canvas');
    canvas.width = W * SCALE; canvas.height = H * SCALE;
    const ctx = canvas.getContext('2d');
    ctx.scale(SCALE, SCALE);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const [art, logo] = await Promise.all([load(`/games/group/${game}.jpg`), load('/assets/YATICORP.png')]);
    const SANS = 'system-ui, -apple-system, Segoe UI, sans-serif';

    // The ground: deep night blue to violet, a light behind the words.
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#0b1030'); bg.addColorStop(0.55, '#1e1356'); bg.addColorStop(1, '#3b0f5c');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W / 2, 800, 40, W / 2, 800, 620);
    glow.addColorStop(0, 'rgba(139,92,246,.35)'); glow.addColorStop(1, 'rgba(139,92,246,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

    // The game's picture, across the top as a raised card.
    // The picture's own shape (8 : 5), so all of it shows, as on the game's card.
    const ax = 56; const ay = 56; const aw = W - 112; const ah = Math.round(aw / 1.6);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 24;
    rounded(ctx, ax, ay, aw, ah, 40); ctx.fillStyle = '#1b1745'; ctx.fill();
    ctx.restore();
    ctx.save();
    rounded(ctx, ax, ay, aw, ah, 40); ctx.clip();
    if (art) {
        const sc = Math.max(aw / art.width, ah / art.height);
        // A touch more contrast and colour, so the picture reads clearly.
        ctx.filter = 'contrast(1.08) saturate(1.12)';
        ctx.drawImage(art, ax + (aw - art.width * sc) / 2, ay + (ah - art.height * sc) / 2, art.width * sc, art.height * sc);
        ctx.filter = 'none';
    }
    // The dark only along the bottom, behind the name; the picture above it left clear.
    const fade = ctx.createLinearGradient(0, ay + ah * 0.68, 0, ay + ah);
    fade.addColorStop(0, 'rgba(11,16,48,0)'); fade.addColorStop(1, 'rgba(11,16,48,.88)');
    ctx.fillStyle = fade; ctx.fillRect(ax, ay, aw, ah);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 3; rounded(ctx, ax, ay, aw, ah, 40); ctx.stroke();
    ctx.fillStyle = '#c4b5fd'; ctx.font = `800 32px ${SANS}`; ctx.fillText('GROUP GAME', ax + 40, ay + ah - 108);
    ctx.fillStyle = '#ffffff'; ctx.font = `900 78px ${SANS}`; ctx.fillText(label, ax + 40, ay + ah - 36, aw - 80);

    // The invitation.
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e9e5ff'; ctx.font = `800 50px ${SANS}`;
    ctx.fillText(host ? `${host} invites you to play` : 'You are invited to play', W / 2, 735, W - 120);
    ctx.fillStyle = 'rgba(233,229,255,.75)'; ctx.font = `600 36px ${SANS}`;
    ctx.fillText(players || 'Group game', W / 2, 785, W - 120);

    // What the game is (2026-11-06): its own one-line description, up to two lines.
    if (blurb) {
        ctx.fillStyle = 'rgba(233,229,255,.9)'; ctx.font = `500 37px ${SANS}`;
        wrap(ctx, blurb, W - 160, 2).forEach((l, i) => ctx.fillText(l, W / 2, 845 + i * 48));
    }

    // The code: raised gold keys.
    const chars = String(code).split('');
    const gap = 16; const kw = Math.min(124, (W - 160 - gap * (chars.length - 1)) / chars.length); const kh = 150; const ky = 965;
    const kx = (W - (chars.length * kw + gap * (chars.length - 1))) / 2;
    ctx.fillStyle = '#fcd34d'; ctx.font = `800 34px ${SANS}`; ctx.fillText('ROOM CODE', W / 2, ky - 24);
    chars.forEach((ch, i) => {
        const x = kx + i * (kw + gap);
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 14;
        rounded(ctx, x, ky + 12, kw, kh, 24); ctx.fillStyle = '#92400e'; ctx.fill();
        ctx.restore();
        const face = ctx.createLinearGradient(0, ky, 0, ky + kh);
        face.addColorStop(0, '#fde68a'); face.addColorStop(1, '#f59e0b');
        rounded(ctx, x, ky, kw, kh, 24); ctx.fillStyle = face; ctx.fill();
        ctx.fillStyle = '#451a03'; ctx.font = '900 92px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.fillText(ch, x + kw / 2, ky + 106);
    });

    // How to join, and the link.
    ctx.fillStyle = '#ffffff'; ctx.font = `800 42px ${SANS}`; ctx.fillText('Open the link, paste the code, join!', W / 2, 1190, W - 100);
    ctx.fillStyle = '#a5b4fc'; ctx.font = '600 31px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(inviteLink(code).replace(/^https?:\/\//, ''), W / 2, 1238, W - 100);

    // About the platform (2026-11-06): a few lines that make a student want to look around, under a thin rule.
    const rule = ctx.createLinearGradient(160, 0, W - 160, 0);
    rule.addColorStop(0, 'rgba(196,181,253,0)'); rule.addColorStop(0.5, 'rgba(196,181,253,.55)'); rule.addColorStop(1, 'rgba(196,181,253,0)');
    ctx.fillStyle = rule; ctx.fillRect(160, 1290, W - 320, 2);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fcd34d'; ctx.font = `900 44px ${SANS}`;
    ctx.fillText('Play smarter. Grow faster.', W / 2, 1356, W - 120);
    ctx.fillStyle = 'rgba(233,229,255,.9)'; ctx.font = `500 35px ${SANS}`;
    [
        'Brain games, live competitions and certificates —',
        'earn XP every day. Get a personal guide that',
        'learns your strengths and shows the career path',
        'that fits you — one step at a time.'
    ].forEach((l, i) => ctx.fillText(l, W / 2, 1416 + i * 50, W - 100));

    // Powered by, and the YATICORP logo itself (the white wordmark with its blue O), centred together.
    const fy = 1650;
    ctx.textAlign = 'left';
    ctx.font = `600 38px ${SANS}`;
    const lead = 'Powered by';
    const leadW = ctx.measureText(lead).width;
    // The wordmark's own box inside the 1505 × 330 file.
    const src = { x: 150, y: 135, w: 1215, h: 155 };
    const lh = 58; const lw = logo ? Math.round(src.w * (lh / src.h)) : 0;
    const gapL = 20;
    const total = leadW + (logo ? gapL + lw : 0);
    const x = (W - total) / 2;
    ctx.fillStyle = 'rgba(233,229,255,.8)'; ctx.fillText(lead, x, fy);
    if (logo) ctx.drawImage(logo, src.x, src.y, src.w, src.h, x + leadW + gapL, fy - lh + 6, lw, lh);
    else { ctx.fillStyle = '#ffffff'; ctx.font = `900 40px ${SANS}`; ctx.fillText(' YATICORP', x + leadW, fy); }

    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}
