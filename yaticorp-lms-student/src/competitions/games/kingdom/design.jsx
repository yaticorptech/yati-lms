import { useEffect, useState } from 'react';
import { BookOpen, Hourglass, Landmark, Lock, Map as MapIcon, ScrollText, Pause } from 'lucide-react';
import { RotateCw } from 'lucide-react';
import { fs, serif } from './style';
import { BoldGlyph } from '../vault/glyphs';

/**
 * The Lost Kingdom's trials drawn from their approved designs (2026-11-05: Trial 1, "The Broken Path"): the
 * picture carries the design's own HUD and panel, and these put the live ones exactly where it drew them — each
 * piece sized to the box the design gave it, in % of the picture, so it fits on any screen.
 */
const box = (b) => ({ left: `${b.l}%`, top: `${b.t}%`, width: `${b.w}%`, height: `${b.h}%` });
const dark = 'border border-[#c9a45a]/70 bg-gradient-to-b from-[#241a0e]/[.97] to-[#0e0905]/[.97] text-[#f3e6c8] shadow-[0_6px_18px_rgba(0,0,0,.55)]';
const fmt = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const RANK = ['bg-[#e0ab48] text-[#2a1c0b]', 'bg-[#9ca3af] text-[#111]', 'bg-[#c2703d] text-white'];

export function DesignHud({ d, view, me, stage, shown, playing, share, left, secondsLeft, standings, menus, cur }) {
    const steps = [...view.titles.map((_, i) => `Puzzle ${i + 1}`), 'Treasure Box'];
    const icons = [MapIcon, ScrollText, Pause];
    const menuActs = [menus.onMap, menus.onClues, menus.onPause];
    return (
        <>
            {/* Title (left as the picture draws it where it already says the right thing: Puzzle 5's, 2026-11-07) */}
            {d.plaque && <div className={`absolute z-30 flex items-center gap-[0.6cqw] rounded-[0.8cqw] px-[0.8cqw] ${dark}`} style={box(d.plaque)} data-plaque>
                <span className="flex aspect-square h-[82%] shrink-0 items-center justify-center rounded-full border-2 border-[#c9a45a] text-[#f4c55a]" style={{ fontSize: fs(12, 2.4, 44) }}>✦</span>
                <span className="min-w-0">
                    <span className="block truncate font-bold leading-tight text-[#f4c55a]" style={{ ...serif, fontSize: fs(10, 1.9, 34) }}>The Lost Kingdom</span>
                    <span className="block truncate leading-tight" style={{ ...serif, fontSize: fs(8, 1.25, 22) }}>Trial {shown + 1} – {view.titles[shown]}</span>
                </span>
            </div>}
            {/* The trials: done, now, to come; the treasure last. (Puzzle 5's picture draws them as they are when it shows.) */}
            {d.tracker && <div className="absolute z-30 flex items-start justify-between" style={box(d.tracker)} aria-label="Trials" data-tracker>
                {steps.map((t, i) => {
                    const done = i < stage || (i === steps.length - 1 && me?.done);
                    const now = i === stage && !me?.done;
                    return (
                        <div key={t} className="flex w-[15%] flex-col items-center">
                            <span className={`flex aspect-square w-[62%] items-center justify-center rounded-full border-2 ${now ? 'border-[#ffd166] bg-gradient-to-b from-[#a8741f] to-[#4a2f0b] shadow-[0_0_14px_rgba(251,191,36,.9)]' : done ? 'border-[#d9c7a0] bg-gradient-to-b from-[#3f7aa8] to-[#123552]' : 'border-[#6b5a3a] bg-gradient-to-b from-[#2a2520] to-[#0d0b08]'}`}>
                                {i === steps.length - 1 ? <img src={`${import.meta.env.BASE_URL || '/'}games/lostkingdom/treasure-icon.png`} alt="" className="h-full w-full rounded-full object-cover" /> : done || now ? <Landmark className="h-[52%] w-[52%] text-[#ffe9b0]" /> : <Lock className="h-[44%] w-[44%] text-[#b9a88a]" />}
                            </span>
                            <span className={`mt-[0.3cqw] whitespace-nowrap rounded-full bg-black/60 px-[0.5cqw] font-bold ${now ? 'text-[#ffd166]' : 'text-[#f5e6c4]'}`} style={{ fontSize: fs(7, 0.95, 17) }}>{t}</span>
                        </div>
                    );
                })}
            </div>}
            {/* The trials placed one by one exactly over the picture's own (d.trackerArt: its centres, in %), solid, so
                nothing printed shows round them (2026-11-07: Puzzle 2's picture showed through, doubled). */}
            {d.trackerArt && steps.map((t, i) => {
                const a = d.trackerArt;
                const done = i < stage || (i === steps.length - 1 && me?.done);
                const now = i === stage && !me?.done;
                const last = i === steps.length - 1;
                return (
                    <div key={t} className="pointer-events-none absolute z-30" data-tracker-step={i}>
                        <span className={`absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full border-[0.2cqw] ${now ? 'border-[#ffd166] bg-gradient-to-b from-[#e0a83a] to-[#8a5410] shadow-[0_0_1.4cqw_rgba(251,191,36,.95)]' : done ? 'border-[#d9c7a0] bg-gradient-to-b from-[#3f7aa8] to-[#123552]' : 'border-[#8a7350] bg-gradient-to-b from-[#3a3128] to-[#15110c]'}`}
                            style={{ left: `${a.x[i]}%`, top: `${a.y}%`, width: `${a.d}%`, aspectRatio: '1' }}>
                            {last ? <img src={`${import.meta.env.BASE_URL || '/'}games/lostkingdom/treasure-icon.png`} alt="" className="h-full w-full object-cover" /> : done || now ? <Landmark className="h-[50%] w-[50%] text-[#fff1cc]" /> : <Lock className="h-[44%] w-[44%] text-[#e6d6b8]" />}
                        </span>
                        <span className={`absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center whitespace-nowrap rounded-full border border-[#6b5636] bg-[#1d150d] font-bold ${now ? 'text-[#ffd166]' : 'text-[#f5e6c4]'}`}
                            style={{ left: `${a.x[i]}%`, top: `${a.labelY}%`, width: `${last ? a.labelW * 1.25 : a.labelW}%`, height: `${a.labelH}%`, fontSize: fs(7, 0.95, 17) }}>{t}</span>
                    </div>
                );
            })}
            {/* Clock: the picture's own frame and hourglass, only the time written live over its printed one. */}
            {d.timerArt && (playing || view.phase === 'ready') && (
                <span className={`absolute z-30 flex items-center justify-center rounded-[0.5cqw] bg-[#150d06] font-black tabular-nums text-[#fff3d6] ${playing && share < 0.25 ? 'animate-pulse text-rose-300' : ''}`} style={{ ...box(d.timerArt), fontSize: fs(11, 2.2, 42) }} data-timer>
                    {view.phase === 'ready' ? `0:0${Math.max(1, secondsLeft)}` : fmt(left)}
                </span>
            )}
            {!d.timerArt && (playing || view.phase === 'ready') && (
                <div className={`absolute z-30 flex items-center justify-center gap-[0.4cqw] rounded-full ${dark} ${playing && share < 0.25 ? 'animate-pulse border-rose-500' : ''}`} style={box(d.timer)} data-timer>
                    <Hourglass className="text-[#f4c55a]" style={{ width: fs(10, 1.6, 30), height: fs(10, 1.6, 30) }} />
                    <span className="font-black tabular-nums" style={{ fontSize: fs(11, 2, 40) }}>{view.phase === 'ready' ? `0:0${Math.max(1, secondsLeft)}` : fmt(left)}</span>
                </div>
            )}
            {me?.penaltyMs > 0 && <span className="absolute z-30 rounded-full bg-rose-700/90 px-[0.6cqw] font-black text-white" style={{ left: `${(d.timerArt || d.timer).l}%`, top: `${(d.timerArt || d.timer).t + (d.timerArt || d.timer).h + 1.2}%`, fontSize: fs(7, 0.9, 15) }}>+{Math.round(me.penaltyMs / 1000)}s · {me.mistakes} wrong</span>}
            {/* Map, Clues, Pause */}
            {d.menu.map((b, i) => {
                const Icon = icons[i];
                return (
                    <button key={i} type="button" onClick={menuActs[i]} className="absolute z-30 flex flex-col items-center justify-start rounded-full" style={box(b)} aria-label={['Map', 'Clues', 'Pause'][i]} data-hud-button={['map', 'clues', 'pause'][i]}>
                        {/* Over the picture's own button where it draws one (d.menuArt): only the tap is live. */}
                        {!d.menuArt && <>
                        <span className={`flex aspect-square w-[88%] items-center justify-center rounded-full ${dark}`}><Icon className="h-[46%] w-[46%] text-[#e9d3a0]" /></span>
                        <span className="mt-[0.2cqw] font-bold text-[#f3e6c8] [text-shadow:0_1px_3px_#000]" style={{ ...serif, fontSize: fs(7, 0.95, 17) }}>{['Map', 'Clues', 'Pause'][i]}</span>
                        </>}
                    </button>
                );
            })}
            {/* Standings (left out where the design has none: Puzzle 2's picture, 2026-11-07) */}
            {d.board && <ol className={`absolute z-30 flex flex-col justify-evenly rounded-[0.8cqw] p-[0.6cqw] ${dark}`} style={box(d.board)} aria-label="Standings" data-race>
                {standings.map(({ s, i, p, score }, rank) => (
                    <li key={i} className={`flex items-center gap-[0.6cqw] rounded-[0.4cqw] px-[0.4cqw] ${view.you === i ? 'bg-white/10' : ''} ${p.left ? 'opacity-45' : ''}`} data-racer={i}>
                        <span className={`flex shrink-0 items-center justify-center rounded-full font-black ${RANK[rank] || 'text-[#f5e6c4]'}`} style={{ width: fs(13, 1.5, 28), height: fs(13, 1.5, 28), fontSize: fs(7, 0.9, 16) }}>{rank + 1}</span>
                        <span className="flex shrink-0 items-center justify-center rounded-full border-2 border-[#d9c7a0] font-black text-white" style={{ background: s.color, width: fs(15, 1.8, 34), height: fs(15, 1.8, 34), fontSize: fs(7, 1, 18) }}>{(s.name || '?').trim().charAt(0).toUpperCase()}</span>
                        <span className={`min-w-0 flex-1 truncate font-bold ${p.done ? 'text-emerald-400' : ''}`} style={{ fontSize: fs(8, 1.15, 22) }}>{view.you === i ? 'You' : s.name}</span>
                        <span className={`font-black tabular-nums ${p.done ? 'text-emerald-400' : ''}`} style={{ fontSize: fs(8, 1.15, 22) }}>{score}</span>
                    </li>
                ))}
            </ol>}
            {/* The three bridge signs, this trial's own series; the one asked about lit. */}
            {cur?.data?.bridges && d.signs?.map((b, i) => (
                <div key={i} className={`absolute z-20 flex items-center justify-center rounded-[0.6cqw] border-2 font-bold whitespace-nowrap ${cur.data.ask === i ? 'border-[#f4c55a] shadow-[0_0_16px_rgba(244,197,90,.75)]' : 'border-[#8a6a2f]'}`}
                    style={{ ...box(b), ...serif, fontSize: fs(7, 1.15, 22), color: '#f6e7c1', background: 'linear-gradient(#3a2d1c, #1b130a)' }} data-sign={i}>
                    {cur.data.bridges[i].terms.join(', ')}
                </div>
            ))}
        </>
    );
}

// The design's own panel (path-panel.jpg, 565×440): the series, the four choices and Submit, where it drew them.
const PATH_ART = `${import.meta.env.BASE_URL || '/'}games/lostkingdom/path-panel.jpg`;
const TERMS = [13.3, 27.5, 41.7, 55.8, 70, 85.8];
const CHOICES = [16.6, 39.3, 62.1, 84.8];
const centred = ({ x, y, w, h }) => ({ left: `${x - w / 2}%`, top: `${y - h / 2}%`, width: `${w}%`, height: `${h}%` });

export function PathPanel({ box: b, cur, pick, tried, canAct, busy, shake, onPick, onSubmit }) {
    const terms = cur.data.bridges[cur.data.ask].terms;
    const chosen = pick != null ? cur.options[pick] : null;
    return (
        <section className={`absolute z-20 ${shake ? '[animation:lk-shake_.45s_ease]' : ''}`}
            style={{ ...box(b), containerType: 'inline-size', background: `url(${PATH_ART}) center / 100% 100% no-repeat` }} data-trial-panel={cur.index} data-path-panel>
            {terms.map((t, i) => (
                <span key={i} className={`absolute flex items-center justify-center rounded-[1.4cqw] font-black ${i === 5 ? 'border-[0.4cqw] border-[#e2b24f] bg-gradient-to-b from-[#8c1c14] to-[#5a0c08] text-[#ffe9a8]' : 'bg-[#f6e8c8] text-[#1d140a] shadow-[inset_0_0_0_0.35cqw_#5a3a14]'}`}
                    style={{ ...centred({ x: TERMS[i], y: 40.2, w: i === 5 ? 15.9 : 12.4, h: 13.6 }), ...serif, fontSize: 'clamp(9px, 6cqw, 38px)' }} data-term={i}>
                    {i === 5 ? (chosen ?? '?') : t}
                </span>
            ))}
            {cur.options.map((o, i) => (
                <button key={o} type="button" disabled={!canAct || tried.includes(i)} onClick={() => onPick(i)} aria-pressed={pick === i} aria-label={`Answer ${o}`}
                    className={`absolute flex items-center justify-center rounded-[1.6cqw] border-[0.4cqw] font-black transition disabled:cursor-not-allowed ${tried.includes(i) ? 'border-rose-500/60 bg-[#3a0d0a] text-rose-300/70 line-through' : pick === i ? 'border-[#ffd166] bg-gradient-to-b from-[#7a5212] to-[#3b2306] text-white shadow-[0_0_2cqw_rgba(255,200,80,.85)]' : 'border-[#c9a14a] bg-gradient-to-b from-[#2b1d0d] to-[#140c05] text-[#f4e3b8] hover:brightness-125'}`}
                    style={{ ...centred({ x: CHOICES[i], y: 65.5, w: 20.2, h: 15 }), ...serif, fontSize: 'clamp(10px, 6.4cqw, 40px)' }} data-option={i}>{o}</button>
            ))}
            <button type="button" onClick={onSubmit} disabled={!canAct || pick == null || busy} aria-label="Submit"
                className="absolute rounded-full transition enabled:hover:bg-white/10 enabled:active:bg-white/20 disabled:cursor-not-allowed disabled:bg-black/30" style={centred({ x: 49.7, y: 86, w: 58.1, h: 13 })} data-submit />
        </section>
    );
}

/* ── Puzzle 2: the three discs (the approved design, 2026-11-05) ── */
// Each disc's face in its own colour, as the design paints it: stone at the top, blue bottom left, purple bottom right.
const FACE_BG = ['radial-gradient(circle, #8c7556 0%, #5a4630 70%, rgba(70,54,36,0) 100%)', 'radial-gradient(circle, #3f57a0 0%, #233070 70%, rgba(35,48,112,0) 100%)', 'radial-gradient(circle, #7a4aa0 0%, #42205e 70%, rgba(66,32,94,0) 100%)'];
const NAMES = ['top', 'bottom left', 'bottom right'];

/** The discs' faces (the symbol showing on each, over the picture's) and their turn buttons; tapping a disc turns it too. */
export function DiscsLive({ g, faces, onTurn, canAct }) {
    return (
        <>
            {g.faces.map((f, d) => (
                <button key={d} type="button" disabled={!canAct} onClick={() => onTurn(d)} aria-label={`Turn the ${NAMES[d]} disc (showing ${faces[d]})`}
                    className="absolute z-20 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full disabled:cursor-not-allowed"
                    style={{ left: `${f.x}%`, top: `${f.y}%`, width: `${g.face.w}%`, height: `${g.face.h}%`, background: FACE_BG[d] }} data-disc={d} data-face={faces[d]}>
                    <span key={faces[d]} className="h-[66%] w-[66%] [animation:lk-arrive_.35s_ease-out_both]" style={{ filter: 'drop-shadow(0 0 4px rgba(255,200,80,1)) drop-shadow(0 0 14px rgba(255,170,40,.7))' }}><BoldGlyph name={faces[d]} /></span>
                </button>
            ))}
            {g.buttons.map((b, d) => (
                <button key={d} type="button" disabled={!canAct} onClick={() => onTurn(d)} aria-label={`Turn the ${NAMES[d]} disc`}
                    className="absolute z-20 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-[#d9a441] bg-gradient-to-b from-[#3a2a17] to-[#120c06] text-[#f4c55a] shadow-[0_0_14px_rgba(244,197,90,.55)] transition enabled:hover:brightness-125 enabled:active:scale-95 disabled:cursor-not-allowed"
                    style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${g.button.w}%`, height: `${g.button.h}%` }} data-disc-turn={d}>
                    <RotateCw className="h-[50%] w-[50%]" />
                </button>
            ))}
        </>
    );
}

/** The design's panel: its clue lines (this game's own) over the drawn ones, and its Submit. */
export function DiscsPanel({ g, lines, canAct, busy, shake, onSubmit }) {
    return (
        <>
            {/* As the design writes them: plain serif, sentence case, white, the symbols' names in gold, a gold ◆ each —
                on the panel's own dark, blended in (no box of its own). */}
            <ul className={`absolute z-20 flex flex-col justify-evenly px-[0.8cqw] ${shake ? '[animation:lk-shake_.45s_ease]' : ''}`}
                style={{ ...box(g.lines), background: 'radial-gradient(120% 100% at 50% 50%, #1e150d 75%, rgba(30,21,13,0))' }} data-disc-lines>
                {lines.map((l) => (
                    <li key={l} className="flex gap-[0.9cqw] leading-[1.3] text-[#f4ecdc]" style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: fs(8, 1.32, 26) }}>
                        <span className="pt-[0.1em] text-[0.8em] text-[#e8a33a]">◆</span>
                        <span>{l.split(/(Sun|Moon|Star|Triangle)/).map((w, i) => (i % 2 ? <span key={i} className="text-[#f2c35a]">{w}</span> : w))}</span>
                    </li>
                ))}
            </ul>
            <button type="button" onClick={onSubmit} disabled={!canAct || busy} aria-label="Submit"
                className="absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-full transition enabled:hover:bg-white/10 enabled:active:bg-white/20 disabled:cursor-not-allowed disabled:bg-black/30"
                style={{ left: `${g.submit.x}%`, top: `${g.submit.y}%`, width: `${g.submit.w}%`, height: `${g.submit.h}%` }} data-submit />
        </>
    );
}

/**
 * Puzzle 2's card on an upright phone, exactly as the approved design draws it (discs-card.jpg, 632×948): its art,
 * this game's rules over the drawn ones, and its Submit made live.
 */
const CARD_ART = `${import.meta.env.BASE_URL || '/'}games/lostkingdom/discs-card.jpg`;
export function DiscsCard({ lines, canAct, busy, shake, onSubmit }) {
    return (
        <section className={`relative mx-auto w-full max-w-sm ${shake ? '[animation:lk-shake_.45s_ease]' : ''}`}
            style={{ aspectRatio: '632 / 948', containerType: 'inline-size', background: `url(${CARD_ART}) center / 100% 100% no-repeat` }} data-discs-card>
            <ul className="absolute flex flex-col justify-evenly px-[2cqw]" style={{ left: '8.5%', top: '25.6%', width: '86%', height: '28.4%', background: 'radial-gradient(120% 100% at 50% 50%, #1e150d 78%, rgba(30,21,13,0))' }}>
                {lines.map((l) => (
                    <li key={l} className="flex gap-[2.4cqw] leading-[1.3] text-[#f4ecdc]" style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 'clamp(12px, 5.4cqw, 22px)' }}>
                        <span className="pt-[0.1em] text-[0.8em] text-[#e8a33a]">◆</span>
                        <span>{l.split(/(Sun|Moon|Star|Triangle)/).map((w, i) => (i % 2 ? <span key={i} className="text-[#f2c35a]">{w}</span> : w))}</span>
                    </li>
                ))}
            </ul>
            <button type="button" onClick={onSubmit} disabled={!canAct || busy} aria-label="Submit"
                className="absolute rounded-full transition enabled:active:bg-white/20 disabled:cursor-not-allowed disabled:bg-black/30"
                style={{ left: '11%', top: '82.8%', width: '77.5%', height: '13.2%' }} data-submit />
        </section>
    );
}


/**
 * The colour of the picture itself at a few points (% of the picture), averaged, once it has loaded (2026-11-06):
 * the tiles and discs below are drawn over the picture's own printed ones, in the picture's own colours, so the
 * numbers sit in them rather than on patches that looked stuck on top. `fallback` until the picture is read.
 */
// Sampled tones kept for the session, so a puzzle shown again paints its final colour at once (no flash).
const TONES = new Map();
function useArtTone(src, points, fallback) {
    const key = JSON.stringify(points);
    const [tone, setTone] = useState(() => TONES.get(`${src}|${key}`) || fallback);
    useEffect(() => {
        if (!src || TONES.has(`${src}|${key}`)) return undefined;
        let live = true;
        const img = new Image();
        img.onload = () => {
            try {
                const c = document.createElement('canvas');
                c.width = img.naturalWidth; c.height = img.naturalHeight;
                const ctx = c.getContext('2d', { willReadFrequently: true });
                ctx.drawImage(img, 0, 0);
                const sum = [0, 0, 0]; let n = 0;
                for (const [x, y] of JSON.parse(key)) {
                    const d = ctx.getImageData(Math.round((x / 100) * c.width) - 3, Math.round((y / 100) * c.height) - 3, 7, 7).data;
                    for (let i = 0; i < d.length; i += 4) { sum[0] += d[i]; sum[1] += d[i + 1]; sum[2] += d[i + 2]; n += 1; }
                }
                if (!n) return;
                const t = sum.map((v) => Math.round(v / n));
                TONES.set(`${src}|${key}`, t);
                if (live) setTone(t);
            } catch { /* unreadable: keep the fallback */ }
        };
        img.src = src;
        return () => { live = false; };
    }, [src, key]);
    return tone;
}
const rgb = ([r, g, b], k = 1) => `rgb(${Math.min(255, Math.round(r * k))},${Math.min(255, Math.round(g * k))},${Math.min(255, Math.round(b * k))})`;

/* ── Puzzle 3: the number triangle (the approved design, 2026-11-05) ── */
/** The numbers in the picture's circles, the last one typed into (wide layout), and Submit where it is drawn. */
export function TriangleLive({ g, art, rows, typed, onType, wide, canAct, busy, shake, onSubmit }) {
    // Every disc drawn whole over the picture's own (its printed numbers, and its "?" glow, which may not be where
    // this game's missing number is): the same gold disc for each number, the glowing one for the missing number.
    const circle = (c, size) => ({ left: `${c.x}%`, top: `${c.y}%`, width: `${g.d.w * size}%`, height: `${g.d.h * size}%` });
    const top = g.circles[0][0];
    // The gold of the top disc, read off the picture just inside its rim (away from its number).
    const gold = useArtTone(art, [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]].map(([dx, dy]) => [top.x + dx * g.d.w, top.y + dy * g.d.h]), [236, 196, 112]);
    const disc = {
        background: `radial-gradient(circle at 50% 40%, ${rgb(gold, 1.1)} 0%, ${rgb(gold)} 58%, ${rgb(gold, 0.82)} 86%, ${rgb(gold, 0.62)} 100%)`,
        boxShadow: `0 0 0 0.25cqw ${rgb(gold, 0.42)}, inset 0 0.25cqw 0.5cqw rgba(255,255,255,.35), inset 0 -0.35cqw 0.6cqw rgba(80,45,10,.35)`
    };
    const glow = {
        background: 'radial-gradient(circle at 50% 40%, #f3a43a 0%, #c46d10 62%, #8a470a 100%)',
        boxShadow: '0 0 0 0.25cqw #5a3208, 0 0 1.6cqw rgba(255,170,60,.85), inset 0 0.25cqw 0.5cqw rgba(255,230,170,.45)',
        textShadow: '0 0 6px rgba(255,220,140,.9)'
    };
    return (
        <>
            {rows.map((row, r) => row.map((v, k) => {
                const c = g.circles[r][k];
                if (v != null) {
                    return (
                        <span key={`${r}${k}`} className="pointer-events-none absolute z-20 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full font-black text-[#1d140a]"
                            style={{ ...circle(c, 0.98), ...serif, fontSize: fs(9, 2.5, 46), ...disc }} data-tri-cell>{v}</span>
                    );
                }
                return wide ? (
                    <input key="ask" value={typed} onChange={(e) => onType(e.target.value.replace(/\D/g, '').slice(0, 2))} inputMode="numeric" aria-label="The missing number" placeholder="?" readOnly={!canAct} aria-disabled={!canAct || undefined}
                        onKeyDown={(e) => { if (e.key === 'Enter') onSubmit(); }}
                        className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-0 bg-transparent text-center font-black text-white placeholder:text-white focus:outline-none ${shake ? '[animation:lk-shake_.45s_ease]' : ''}`}
                        style={{ ...circle(c, 0.98), ...serif, fontSize: fs(9, 2.5, 46), ...glow }} data-tri-ask />
                ) : (
                    <span key="ask" className="pointer-events-none absolute z-20 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full font-black text-white"
                        style={{ ...circle(c, 0.98), ...serif, fontSize: fs(9, 2.5, 46), ...glow }}>{typed || '?'}</span>
                );
            }))}
            {wide && (
                <button type="button" onClick={onSubmit} disabled={!canAct || busy || typed === ''} aria-label="Submit"
                    className="absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-full transition enabled:hover:bg-white/10 enabled:active:bg-white/20 disabled:cursor-not-allowed disabled:bg-black/30"
                    style={{ left: `${g.submit.x}%`, top: `${g.submit.y}%`, width: `${g.submit.w}%`, height: `${g.submit.h}%` }} data-submit />
            )}
        </>
    );
}

/* ── Puzzle 4: the number grid (the approved design, 2026-11-05) ── */
/** The tiles' numbers, the last typed into (wide layout), and Submit. (The design's hint card is painted out of the picture.) */
export function GridLive({ g, art, cells, typed, onType, wide, canAct, busy, shake, onSubmit }) {
    // Every tile drawn whole over the picture's own (its printed numbers, and its glowing "?" tile, which may not be
    // where this game's missing number is): one parchment tile for each number, the glowing one for the missing one.
    const at = ([x, y]) => ({ left: `${x}%`, top: `${y}%`, width: `${g.cell.w * 0.97}%`, height: `${g.cell.h * 0.95}%` });
    const num = { ...serif, fontSize: fs(10, 3.1, 58) };
    const [x0, y0] = g.cells[0];
    // The parchment of the first tile, read off the picture along its edges inside the frame (away from its number).
    const paper = useArtTone(art, [[-0.36, 0], [0.36, 0], [0, -0.36], [0, 0.36]].map(([dx, dy]) => [x0 + dx * g.cell.w, y0 + dy * g.cell.h]), [226, 196, 146]);
    const tile = {
        borderRadius: '0.9cqw',
        background: `radial-gradient(120% 120% at 50% 45%, ${rgb(paper, 1.06)} 0%, ${rgb(paper)} 60%, ${rgb(paper, 0.86)} 100%)`,
        boxShadow: `inset 0 0 0 0.3cqw ${rgb(paper, 0.5)}, inset 0 0 0 0.55cqw ${rgb(paper, 0.95)}, inset 0 0 1.4cqw rgba(90,60,20,.35), 0 0.25cqw 0.5cqw rgba(40,25,8,.45)`
    };
    const glow = {
        borderRadius: '0.9cqw',
        background: 'radial-gradient(120% 120% at 50% 45%, #9a5310 0%, #6e3a08 70%, #4a2604 100%)',
        boxShadow: 'inset 0 0 0 0.3cqw #f3b24a, 0 0 1.6cqw rgba(255,170,60,.85), inset 0 0 1.2cqw rgba(255,190,90,.45)',
        textShadow: '0 0 6px rgba(255,220,140,.9)'
    };
    return (
        <>
            {cells.map((v, k) => (v != null
                ? <span key={k} className="pointer-events-none absolute z-20 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center font-black text-[#1d140a]"
                    style={{ ...at(g.cells[k]), ...num, ...tile }} data-grid-cell>{v}</span>
                : wide
                    ? <input key={k} value={typed} onChange={(e) => onType(e.target.value.replace(/\D/g, '').slice(0, 3))} inputMode="numeric" aria-label="The missing number" placeholder="?" readOnly={!canAct} aria-disabled={!canAct || undefined}
                        onKeyDown={(e) => { if (e.key === 'Enter') onSubmit(); }}
                        className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 border-0 bg-transparent text-center font-black text-white placeholder:text-white focus:outline-none ${shake ? '[animation:lk-shake_.45s_ease]' : ''}`}
                        style={{ ...at(g.cells[k]), ...num, ...glow }} data-grid-ask />
                    : <span key={k} className="pointer-events-none absolute z-20 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center font-black text-white" style={{ ...at(g.cells[k]), ...num, ...glow }}>{typed || '?'}</span>))}
            {wide && (
                <button type="button" onClick={onSubmit} disabled={!canAct || busy || typed === ''} aria-label="Submit"
                    className="absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-full transition enabled:hover:bg-white/10 enabled:active:bg-white/20 disabled:cursor-not-allowed disabled:bg-black/30"
                    style={{ left: `${g.submit.x}%`, top: `${g.submit.y}%`, width: `${g.submit.w}%`, height: `${g.submit.h}%` }} data-submit />
            )}
        </>
    );
}

/* ── Puzzle 2: the tile swap (the approved design, 2026-11-07) ── */
/**
 * One tile, cut from the picture itself: each symbol is shown as the design paints it, taken from the tile where the
 * picture draws that symbol (`g.src`), so the live tiles are the design's own art wherever they are moved.
 */
export function SwapTile({ g, art, symbol }) {
    const [x, y] = g.cells[g.src[symbol]];
    const { w, h } = g.cell;
    return (
        <span className="pointer-events-none block h-full w-full" aria-hidden="true"
            style={{ backgroundImage: `url(${art})`, backgroundSize: `${10000 / w}% ${10000 / h}%`, backgroundPosition: `${(x / (100 - w)) * 100}% ${(y / (100 - h)) * 100}%`, backgroundRepeat: 'no-repeat' }} />
    );
}

/** The nine tiles over the picture's own (tap one, then another, to swap them), and the picture's Submit made live. */
export function SwapLive({ g, art, tiles, sel, onTap, canAct, busy, shake, onSubmit }) {
    return (
        <>
            {tiles.map((t, i) => {
                const [x, y] = g.cells[i];
                return (
                    <button key={i} type="button" onClick={() => onTap(i)} disabled={!canAct} aria-pressed={sel === i} aria-label={`Tile ${i + 1}: ${t}${sel === i ? ', chosen' : ''}`}
                        className={`absolute z-20 overflow-hidden rounded-[0.7cqw] transition-[transform,box-shadow] duration-150 disabled:cursor-not-allowed ${sel === i ? 'z-30 scale-[1.06] shadow-[0_0_0_0.3cqw_#ffd166,0_0_2.2cqw_rgba(255,190,60,.95)]' : 'enabled:hover:brightness-110'} ${shake ? '[animation:lk-shake_.45s_ease]' : ''}`}
                        style={{ left: `${x}%`, top: `${y}%`, width: `${g.cell.w}%`, height: `${g.cell.h}%` }} data-swap-tile={i} data-symbol={t}>
                        <span key={t} className="block h-full w-full [animation:lk-pop_.28s_ease-out_both]"><SwapTile g={g} art={art} symbol={t} /></span>
                    </button>
                );
            })}
            <button type="button" onClick={onSubmit} disabled={!canAct || busy} aria-label="Submit"
                className="absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-full transition enabled:hover:bg-white/10 enabled:active:bg-white/20 disabled:cursor-not-allowed disabled:bg-black/30"
                style={{ left: `${g.submit.x}%`, top: `${g.submit.y}%`, width: `${g.submit.w}%`, height: `${g.submit.h}%` }} data-submit />
            {g.card && <SwapCard g={g} art={art} />}
        </>
    );
}

/**
 * What to do, in three plain lines (2026-11-07), written over the card's printed words, in the card's own colour;
 * the three symbols are the card's own art.
 */
function SwapCard({ g, art }) {
    const { body: b, icons } = g.card;
    const bg = useArtTone(art, [[b.l + 0.6, b.t + b.h * 0.5], [b.l + b.w - 0.6, b.t + b.h * 0.5]], [42, 31, 21]);
    const icon = (k) => <span className="mx-[0.15em] inline-block h-[1.35em] w-[1.35em] align-middle"><Crop art={art} b={icons[k]} /></span>;
    const line = 'flex items-start gap-[0.7cqw] leading-snug';
    const num = (n) => <span className="mt-[0.1em] flex aspect-square w-[1.5em] shrink-0 items-center justify-center rounded-full border border-[#e2b85a] text-[0.8em] font-bold text-[#f2c35a]">{n}</span>;
    return (
        <div className="pointer-events-none absolute z-20 flex flex-col justify-center gap-[1.1cqw] px-[1.2cqw]"
            style={{ ...box(b), background: `radial-gradient(130% 110% at 50% 50%, ${rgb(bg)} 70%, ${rgb(bg, 0.9)} 100%)`, fontFamily: 'Georgia, "Times New Roman", serif', fontSize: fs(9, 1.42, 26), color: '#f4ecdc' }} data-swap-card>
            <p className={line}>{num(1)}<span>Tap a tile, then tap another tile to swap them.</span></p>
            <p className={line}>{num(2)}<span>Every row and every column needs one {icon('gem')}{icon('sun')}{icon('leaf')}</span></p>
            <p className={`${line} text-[#f2c35a]`}>{num(3)}<span>When it is right, press Submit.</span></p>
        </div>
    );
}

/** A piece of the picture itself (`b`, in % of it), filling its box: the design's own art, wherever it is needed. */
export function Crop({ art, b, className = 'block h-full w-full' }) {
    return (
        <span className={`pointer-events-none ${className}`} aria-hidden="true"
            style={{ backgroundImage: `url(${art})`, backgroundSize: `${10000 / b.w}% ${10000 / b.h}%`, backgroundPosition: `${(b.l / (100 - b.w)) * 100}% ${(b.t / (100 - b.h)) * 100}%`, backgroundRepeat: 'no-repeat' }} />
    );
}

/* ── Puzzle 5: the final gate (the approved design, 2026-11-07) ── */
/**
 * The gate's five slots (the picture's own "?" until a symbol is set; tap a set one to take it back), its card made
 * live — the prompt, every clue (the gate's and the journal's, as many as there are) and the five symbols to set,
 * taller than the drawn one so it also covers where the design had "Unlock the gate" — and the picture's Submit.
 * The symbols are the picture's own, cut from its tray.
 */
export function GateLive({ g, art, clues, symbols, names, slots, onPlace, onClear, canAct, busy, shake, onSubmit }) {
    const n = clues.length;
    // Big, clear clues (2026-11-07): as large as the card allows for their number, never squeezed (a scroll at worst).
    const clueSize = fs(10, n <= 4 ? 1.45 : n <= 6 ? 1.3 : 1.12, 26);
    // The picture's symbols, softened at the edges so no square of its tray shows around them.
    const soft = { WebkitMaskImage: 'radial-gradient(circle, #000 52%, transparent 71%)', maskImage: 'radial-gradient(circle, #000 52%, transparent 71%)' };
    return (
        <>
            {g.slots.map(([x, y], i) => (
                <button key={i} type="button" onClick={() => slots[i] && onClear(i)} disabled={!canAct || !slots[i]} aria-label={slots[i] ? `Slot ${i + 1}: ${names[slots[i]]}. Tap to take it back` : `Slot ${i + 1}: empty`}
                    className="absolute z-20 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full disabled:cursor-default"
                    style={{ left: `${x}%`, top: `${y}%`, width: `${g.slot.w}%`, height: `${g.slot.h}%` }} data-slot={i}>
                    {slots[i] && (
                        <span key={slots[i]} className="flex h-[78%] w-[78%] items-center justify-center rounded-full [animation:lk-pop_.28s_ease-out_both]"
                            style={{ background: 'radial-gradient(circle at 50% 45%, #3a2412 0%, #1c1008 70%, #120a04 100%)', boxShadow: '0 0 1.4cqw rgba(255,180,60,.75), inset 0 0 1cqw rgba(0,0,0,.8)' }}>
                            <span className="h-[80%] w-[80%]" style={soft}><Crop art={art} b={g.symbols[slots[i]]} /></span>
                        </span>
                    )}
                </button>
            ))}
            {/* Solid, so nothing printed on the picture shows through. */}
            <section className={`absolute z-20 flex flex-col gap-[0.8cqw] rounded-[1.1cqw] border-[0.2cqw] border-[#c9a14a] px-[1.3cqw] pb-[1cqw] pt-[0.9cqw] ${shake ? '[animation:lk-shake_.45s_ease]' : ''}`}
                style={{ ...box(g.card), background: 'linear-gradient(180deg, #26190d, #140c06)', boxShadow: '0 0 0 0.25cqw #2a1a08, 0 0 2.4cqw rgba(255,170,60,.35), inset 0 0 0 0.12cqw rgba(255,214,140,.18), inset 0 0 3cqw rgba(0,0,0,.6)' }} data-trial-panel={4} data-gate-card>
                <div className="flex shrink-0 items-center gap-[1cqw]">
                    <span className="flex aspect-square w-[2.8cqw] shrink-0 items-center justify-center rounded-full border-[0.15cqw] border-[#f0c96a] text-[#fff6dc]" style={{ background: 'radial-gradient(circle at 50% 40%, #f3c35a, #a0661a)' }} aria-hidden="true"><BookOpen className="h-[56%] w-[56%]" /></span>
                    <p className="leading-tight text-[#f6ead0]" style={{ ...serif, fontSize: fs(10, 1.4, 26) }} data-prompt>Use every clue to put the five symbols in the right order.</p>
                </div>
                <div className="grid min-h-0 flex-1 grid-cols-[1.75fr_1fr] gap-[1.3cqw]">
                    {/* The clues, numbered; the journal's marked; a scrollbar always shown, so more can be reached. */}
                    <ol className="lk-scroll flex min-h-0 flex-col gap-[0.5cqw] overflow-y-scroll pr-[0.6cqw]" data-gate-clues>
                        {clues.map(({ c, from }, i) => (
                            <li key={c} className="flex shrink-0 items-center gap-[0.8em] rounded-full border border-[#c9a14a]/50 bg-black/30 py-[0.3em] pl-[0.35em] pr-[0.9em] leading-tight text-[#f6ead0]" style={{ ...serif, fontSize: clueSize }}>
                                <span className="flex h-[1.6em] w-[1.6em] shrink-0 items-center justify-center rounded-full border-[0.12em] border-[#e2b85a] text-[0.85em] font-bold">{i + 1}</span>
                                <span>
                                    {c.split(/(Sun|Leaf|Moon|Bird|Key)/).map((w, k) => (k % 2 ? <span key={k} className="text-[#f2c35a]">{w}</span> : w))}
                                    {from === 'journal' && <span className="ml-[0.5em] whitespace-nowrap text-[0.65em] text-[#e2b85a]">(your journal)</span>}
                                </span>
                            </li>
                        ))}
                    </ol>
                    {/* The five symbols: tap one to set it in the next empty slot. */}
                    <div className="flex min-h-0 flex-col justify-evenly gap-[0.8cqw] rounded-[0.9cqw] border border-[#c9a14a]/50 bg-black/25 p-[0.8cqw] shadow-[inset_0_0_1.6cqw_rgba(0,0,0,.55)]" data-symbol-tray>
                        <div className="grid grid-cols-5 items-center">
                        {symbols.map((s) => (
                            <button key={s} type="button" onClick={() => onPlace(s)} disabled={!canAct || slots.includes(s)} aria-label={`Set the ${names[s]}`}
                                className="flex flex-col items-center gap-[0.3cqw] rounded-[0.8cqw] py-[0.8cqw] transition enabled:hover:bg-white/10 enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-30" data-symbol={s}>
                                <span className="aspect-square w-[86%]" style={soft}><Crop art={art} b={g.symbols[s]} /></span>
                                <span className="text-[#f2d9a0]" style={{ ...serif, fontSize: fs(9, 1.3, 24) }}>{names[s]}</span>
                            </button>
                        ))}
                        </div>
                        {/* Submit, in the symbols' card under them (2026-11-07), red and gold as the picture draws it. */}
                        <button type="button" onClick={onSubmit} disabled={!canAct || busy || slots.includes(null)} aria-label="Submit"
                            className="mx-auto flex w-[78%] items-center justify-center rounded-[1.2cqw] border-[0.22cqw] border-[#e2b24f] py-[0.55cqw] font-bold tracking-wide text-[#fbe9c4] transition [text-shadow:0_0.15cqw_0.3cqw_rgba(0,0,0,.7)] enabled:hover:brightness-110 enabled:active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-60"
                            style={{ ...serif, fontSize: fs(12, 2.1, 40), background: 'linear-gradient(180deg, #b0281c 0%, #7a1209 55%, #520b05 100%)', boxShadow: '0 0 0 0.18cqw #5a3a10, 0 0 1.3cqw rgba(255,150,60,.5), inset 0 0.2cqw 0.4cqw rgba(255,200,160,.35), inset 0 -0.3cqw 0.6cqw rgba(0,0,0,.45)' }} data-submit>
                            Submit
                        </button>
                    </div>
                </div>
            </section>
        </>
    );
}
