/**
 * A group room's invitation as a picture (2026-11-03): the game's picture, its name and what it is, the room code,
 * the link (it opens Group games with the code filled in), and "Powered by YATICORP" with the logo — shared to
 * WhatsApp, Instagram or email as a card, not just a line of text.
 */
// A message card (2026-11-03): landscape and compact, the size of a link preview in a chat.
const W = 1200;
const H = 630;
const LOGO = '/assets/certificates/yaticorp-logo.png';

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
export async function drawInviteCard({ game, label, players, code, host }) {
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const [art, logo] = await Promise.all([load(`/games/group/${game}.jpg`), load(LOGO)]);
    const SANS = 'system-ui, -apple-system, Segoe UI, sans-serif';

    // The ground: deep night blue to violet, a light behind the words.
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#0b1030'); bg.addColorStop(0.6, '#1e1356'); bg.addColorStop(1, '#3b0f5c');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(820, 200, 20, 820, 200, 520);
    glow.addColorStop(0, 'rgba(139,92,246,.4)'); glow.addColorStop(1, 'rgba(139,92,246,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

    // The game's picture on the left, a raised card.
    const ax = 40; const ay = 40; const aw = 470; const ah = H - 80;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18;
    rounded(ctx, ax, ay, aw, ah, 32); ctx.fillStyle = '#1b1745'; ctx.fill();
    ctx.restore();
    ctx.save();
    rounded(ctx, ax, ay, aw, ah, 32); ctx.clip();
    if (art) {
        const sc = Math.max(aw / art.width, ah / art.height);
        ctx.drawImage(art, ax + (aw - art.width * sc) / 2, ay + (ah - art.height * sc) / 2, art.width * sc, art.height * sc);
    }
    const fade = ctx.createLinearGradient(0, ay + ah * 0.55, 0, ay + ah);
    fade.addColorStop(0, 'rgba(11,16,48,0)'); fade.addColorStop(1, 'rgba(11,16,48,.9)');
    ctx.fillStyle = fade; ctx.fillRect(ax, ay, aw, ah);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 2; rounded(ctx, ax, ay, aw, ah, 32); ctx.stroke();
    ctx.fillStyle = '#c4b5fd'; ctx.font = `800 20px ${SANS}`; ctx.fillText('GROUP GAME', ax + 28, ay + ah - 70);
    ctx.fillStyle = '#ffffff'; ctx.font = `900 40px ${SANS}`; ctx.fillText(label, ax + 28, ay + ah - 28, aw - 56);

    // The words on the right.
    const rx = 560; const rw = W - rx - 50;
    ctx.fillStyle = '#e9e5ff'; ctx.font = `700 30px ${SANS}`;
    ctx.fillText(host ? `${host} invites you to play` : 'You are invited to play', rx, 100, rw);
    ctx.fillStyle = 'rgba(233,229,255,.7)'; ctx.font = `500 22px ${SANS}`;
    ctx.fillText(players || 'Group game', rx, 138, rw);

    // The code: raised gold keys.
    const chars = String(code).split('');
    const gap = 12; const kw = Math.min(84, (rw - gap * (chars.length - 1)) / chars.length); const kh = 100; const ky = 205;
    ctx.fillStyle = '#fcd34d'; ctx.font = `800 20px ${SANS}`; ctx.fillText('ROOM CODE', rx, ky - 18);
    ctx.textAlign = 'center';
    chars.forEach((ch, i) => {
        const x = rx + i * (kw + gap);
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 10;
        rounded(ctx, x, ky + 9, kw, kh, 18); ctx.fillStyle = '#92400e'; ctx.fill();
        ctx.restore();
        const face = ctx.createLinearGradient(0, ky, 0, ky + kh);
        face.addColorStop(0, '#fde68a'); face.addColorStop(1, '#f59e0b');
        rounded(ctx, x, ky, kw, kh, 18); ctx.fillStyle = face; ctx.fill();
        ctx.fillStyle = '#451a03'; ctx.font = '900 60px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.fillText(ch, x + kw / 2, ky + 72);
    });
    ctx.textAlign = 'left';

    // How to join, and the link.
    ctx.fillStyle = '#ffffff'; ctx.font = `700 24px ${SANS}`; ctx.fillText('Open the link, paste the code, join!', rx, 372, rw);
    ctx.fillStyle = '#a5b4fc'; ctx.font = '500 19px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(inviteLink(code).replace(/^https?:\/\//, ''), rx, 406, rw);

    // Powered by YATICORP: the wordmark itself (its name in letters if the picture will not load).
    const fy = 470; const fw = 420; const fh = 76;
    rounded(ctx, rx, fy, fw, fh, 38); ctx.fillStyle = 'rgba(255,255,255,.96)'; ctx.fill();
    ctx.font = `600 22px ${SANS}`;
    const lead = 'Powered by';
    const leadW = ctx.measureText(lead).width;
    const lh = 30; const lw = logo ? lh * (logo.width / logo.height) : 0;
    ctx.font = `900 28px ${SANS}`;
    const markW = logo ? lw : ctx.measureText('YATICORP').width;
    let x = rx + (fw - (leadW + 12 + markW)) / 2;
    ctx.fillStyle = '#475569'; ctx.font = `600 22px ${SANS}`; ctx.fillText(lead, x, fy + 46); x += leadW + 12;
    if (logo) ctx.drawImage(logo, x, fy + 23, lw, lh);
    else { ctx.fillStyle = '#0f172a'; ctx.font = `900 28px ${SANS}`; ctx.fillText('YATICORP', x, fy + 48); }

    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}
