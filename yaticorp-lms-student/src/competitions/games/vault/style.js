/**
 * What The Final Vault's screens share: sizes that follow the chamber's width
 * (cqw), where an overlay sits, the bronze tile and the gold button, and the
 * light path's beam tracer (the server's rules, banks/vault.js, so what
 * lights the crystal on screen is what the server accepts).
 */
export const GLYPH_TEXT = { star: '★', moon: '☾', sun: '☀', triangle: '△', eye: '◉', key: '⚷' };
export const fs = (min, cqw, max) => `clamp(${min}px, ${cqw}cqw, ${max}px)`;
export const at = (box) => ({ '--l': `${box.l}%`, '--t': `${box.t}%`, '--w': `${box.w}%`, '--h': box.h ? `${box.h}%` : 'auto' });
/** Where something sits over the chamber's image: absolute on wider screens, in the flow on a phone. */
export const placed = 'relative @min-[560px]:absolute @min-[560px]:left-[var(--l)] @min-[560px]:top-[var(--t)] @min-[560px]:w-[var(--w)] @min-[560px]:h-[var(--h)]';

export const tile = 'flex items-center justify-center rounded-[0.5cqw] border border-[#8a6a2f] bg-gradient-to-b from-[#4a3418] to-[#21160a] shadow-[inset_0_2px_6px_rgba(0,0,0,.6),0_2px_4px_rgba(0,0,0,.4)]';
export const goldButton = 'rounded-full border border-[#f4d27a] bg-gradient-to-b from-[#e0ab48] to-[#93631a] font-black uppercase tracking-wide text-[#fff8e1] shadow-[0_3px_8px_rgba(0,0,0,.45),inset_0_1px_0_rgba(255,255,255,.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50';

/** A mirror at 0 '/', 1 '—', 2 '\', 3 '|'. Where the beam goes, from the source to the crystal, a wall, or off the board. */
export const traceBeam = (p, states) => {
    const at = new Map(p.mirrors.map((m, i) => [`${m.r},${m.c}`, i]));
    let r = p.source; let c = -1; let dr = 0; let dc = 1;
    const pts = [[0, p.source + 0.5]];
    for (let step = 0; step < 60; step += 1) {
        r += dr; c += dc;
        if (r < 0 || r >= p.size || c < 0 || c >= p.size) { pts.push([c + 0.5 - dc * 0.5, r + 0.5 - dr * 0.5]); return { hit: false, pts }; }
        pts.push([c + 0.5, r + 0.5]);
        if (r === p.crystal.r && c === p.crystal.c) return { hit: true, pts };
        const i = at.get(`${r},${c}`);
        if (i == null) continue;
        const s = states[i];
        if (s === 0) [dr, dc] = [-dc, -dr];
        else if (s === 2) [dr, dc] = [dc, dr];
        else if ((s === 1 && dc === 0) || (s === 3 && dr === 0)) return { hit: false, pts, blocked: true };
    }
    return { hit: false, pts };
};

/**
 * A phone, upright (2026-11-05: "the same look, held vertically, full screen"): the chamber is a tall window
 * PHONE_SCENE_DVH of the screen high, the picture filling its height and cut at the sides around the chamber's
 * key spot (`phoneFocus`), not its middle. `phoneLeft(x, focus)` is where the picture's x% lands in that window.
 */
export const PHONE_SCENE_DVH = 40;
export const phoneFocus = (ch) => Math.min(72, Math.max(28, ch.hotspot.x));
export const phoneLeft = (x, focus) => `calc(50% + ${(((x - focus) / 100) * PHONE_SCENE_DVH * (2000 / 1120)).toFixed(3)}dvh)`;
