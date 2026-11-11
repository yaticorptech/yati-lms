import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import { Glyph } from './glyphs';
import { fs, at, placed, tile, goldButton, GLYPH_TEXT, traceBeam, phoneLeft } from './style';

/**
 * The Final Vault's five puzzles, each with its own controls. A puzzle keeps
 * what the player has set (the symbol picked, the rings, the dials, the
 * mirrors, the relics) until they submit it; the server says whether it is
 * right. Each renders its panel (Panel, placed where the chamber's image has
 * its puzzle panel) and, where the chamber has one, the controls on the wall
 * itself (only on wider screens; on a phone everything is in the panel).
 */
/** The parchment panel with its plaque, as in the chambers' images. */
export function Panel({ box, label, children, shake }) {
    return (
        <section className={`${placed} z-20 mt-3 @min-[560px]:mt-0 ${shake ? 'fv-shake' : ''}`} style={at(box)} data-puzzle-panel>
            <div className="flex h-full flex-col overflow-y-auto rounded-[1cqw] border-[3px] border-[#3b2610] bg-gradient-to-b from-[#f4e5c2] via-[#ead39f] to-[#d9bb80] p-[1.3cqw] pt-[2.2cqw] text-[#3a250d] shadow-[0_10px_30px_rgba(0,0,0,.6),inset_0_0_0_2px_#b8893a,inset_0_0_25px_rgba(120,80,20,.35)] @max-[560px]:p-4 @max-[560px]:pt-6">
                {children}
            </div>
            <span className="absolute -top-[1.1cqw] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-[0.4cqw] border-2 border-[#b8893a] bg-gradient-to-b from-[#3d2910] to-[#1f1406] px-[2cqw] py-[0.35cqw] font-bold uppercase tracking-wider text-[#f4c55a] shadow-lg @max-[560px]:-top-3 @max-[560px]:px-4 @max-[560px]:py-1" style={{ fontSize: fs(11, 1.05, 18), fontFamily: 'Cinzel, Georgia, serif' }}>{label}</span>
        </section>
    );
}

/** One digit on a drum: the ones either side faded, turned up or down. */
export function Dial({ value, onChange, disabled, big = false }) {
    const turn = (d) => onChange((value + d + 10) % 10);
    return (
        <div className={`${tile} flex-col py-[0.3cqw] @max-[560px]:py-1`} style={{ width: big ? fs(40, 4.6, 70) : fs(34, 3.4, 56) }}>
            <button type="button" disabled={disabled} onClick={() => turn(1)} aria-label="Up" className="text-[#f4c55a] hover:text-white disabled:opacity-40"><ChevronUp size={16} /></button>
            <span className="font-black leading-none text-[#8a6a2f]/70" style={{ fontSize: fs(10, 1, 15) }}>{(value + 9) % 10}</span>
            <span className="my-[0.2cqw] font-black leading-none text-[#ffd166] [text-shadow:0_0_8px_rgba(251,191,36,.8)]" style={{ fontSize: fs(18, big ? 2.6 : 2, 36), fontFamily: 'Cinzel, Georgia, serif' }} data-dial>{value}</span>
            <span className="font-black leading-none text-[#8a6a2f]/70" style={{ fontSize: fs(10, 1, 15) }}>{(value + 1) % 10}</span>
            <button type="button" disabled={disabled} onClick={() => turn(-1)} aria-label="Down" className="text-[#f4c55a] hover:text-white disabled:opacity-40"><ChevronDown size={16} /></button>
        </div>
    );
}

const Prompt = ({ children }) => <p className="text-center font-bold leading-snug" style={{ fontSize: fs(13, 1.2, 20) }}>{children}</p>;
const Submit = ({ children, ...props }) => <button type="button" {...props} className={`${goldButton} mx-auto mt-auto block w-[72%] py-[0.7cqw] @max-[560px]:py-2.5`} style={{ fontSize: fs(12, 1.15, 19) }}>{children}</button>;

/* ── 1 · The Ancient Lock ── */
export function SequencePuzzle({ cur, box, label, onSubmit, disabled, shake, audio }) {
    const [pick, setPick] = useState(null);
    return (
        <Panel box={box} label={label} shake={shake}>
            <Prompt>{cur.prompt}</Prompt>
            <div className="mt-[1.2cqw] grid gap-[0.6cqw] @max-[560px]:mt-3 @max-[560px]:gap-1.5" style={{ gridTemplateColumns: `repeat(${cur.sequence.length}, minmax(0,1fr))` }} data-sequence>
                {cur.sequence.map((s, i) => (
                    <div key={i} className={`${tile} aspect-square p-[0.8cqw] ${s ? '' : 'border-[#f4c55a] bg-gradient-to-b from-[#f6e7c4] to-[#d8bd86]'}`}>
                        {s ? <Glyph name={s} /> : pick ? <Glyph name={pick} /> : <span className="font-black text-[#3a250d]" style={{ fontSize: fs(18, 2.6, 44), fontFamily: 'Cinzel, Georgia, serif' }}>?</span>}
                    </div>
                ))}
            </div>
            <div className="mt-[1.4cqw] grid grid-cols-4 gap-[0.8cqw] @max-[560px]:mt-3 @max-[560px]:gap-2" role="group" aria-label="Symbols">
                {cur.choices.map((s) => (
                    <button key={s} type="button" disabled={disabled} onClick={() => { audio.sfx('click'); setPick(s); }} data-choice={s} aria-pressed={pick === s}
                        className={`${tile} aspect-[1.25] p-[0.9cqw] transition ${pick === s ? 'scale-105 border-2 border-[#ffd166] shadow-[0_0_14px_rgba(251,191,36,.8)]' : 'hover:border-[#d9a441]'}`}>
                        <Glyph name={s} />
                    </button>
                ))}
            </div>
            <Submit disabled={disabled || !pick} onClick={() => onSubmit(pick)}>Submit answer</Submit>
        </Panel>
    );
}

/* ── 1 · Crack the Code (since 2026-11-05) ── */
// The approved design's own panel (cut from it: lock-panel.jpg, 691×648), its controls made live where it drew
// them. Places in % of the panel: the padlock's three slots, the three clue lines' text, the keys, Submit.
const LOCK_ART = `${import.meta.env.BASE_URL || '/'}games/finalvault/lock-panel.jpg`;
const LOCK_SLOTS = [12.7, 20.8, 28.9].map((x) => ({ x, y: 47.8, w: 7.4, h: 10.2 }));
const LOCK_CLUES = [34.3, 44.4, 54.3].map((y) => ({ x: 48.5 + 46.6 / 2, y, w: 46.6, h: 6.8 }));   // x: the centre
const LOCK_KEYS = [
    ...['1', '2', '3', '4', '5'].map((k, i) => ({ k, x: [17.9, 31.3, 44.6, 57.6, 70.6][i], y: 67 })),
    ...['6', '7', '8', '9', '0'].map((k, i) => ({ k, x: [17.9, 31.3, 44.6, 57.6, 70.6][i], y: 76.7 })),
    { k: 'back', x: 83.9, y: 76.7 }
];
const LOCK_KEY = { w: 11.4, h: 7.8 };
const LOCK_SUBMIT = { x: 49.9, y: 90, w: 49.2, h: 8.8 };
const centred = ({ x, y, w, h }) => ({ left: `${x - w / 2}%`, top: `${y - h / 2}%`, width: `${w}%`, height: `${h}%` });

export function LockCodePuzzle({ cur, box, onSubmit, disabled, shake, audio }) {
    const [digits, setDigits] = useState('');
    const press = (k) => {
        if (disabled) return;
        audio.sfx('click');
        setDigits((d) => (k === 'back' ? d.slice(0, -1) : d.length < 3 ? d + k : d));
    };
    const submit = () => { if (!disabled && digits.length === 3) onSubmit(digits); };
    // Keys: the digits, Backspace, Enter.
    useEffect(() => {
        const onKey = (e) => {
            if (/input|textarea/i.test(e.target?.tagName)) return;
            if (/^[0-9]$/.test(e.key)) press(e.key);
            else if (e.key === 'Backspace') press('back');
            else if (e.key === 'Enter') { e.preventDefault(); submit(); }   // not also the focused button's click: one answer
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });
    return (
        <section className={`relative z-20 w-full overflow-hidden @min-[560px]:absolute @min-[560px]:left-[var(--l)] @min-[560px]:top-[var(--t)] @min-[560px]:w-[var(--w)] @min-[560px]:h-[var(--h)] ${shake ? 'fv-shake' : ''}`}
            style={{ ...at(box), aspectRatio: '691 / 648', containerType: 'inline-size', background: `url(${LOCK_ART}) center / 100% 100% no-repeat` }} data-puzzle-panel="lockcode">
            {/* The padlock: the digits so far, "?" for the rest. */}
            {LOCK_SLOTS.map((sl, i) => (
                <span key={i} className="absolute flex items-center justify-center rounded-[8%] bg-gradient-to-b from-[#2b1a0a] to-[#140b04]" style={centred(sl)} data-lock-slot={i}>
                    <span className="font-black leading-none text-[#ffd97a] [text-shadow:0_0_8px_rgba(255,190,60,.9)]" style={{ fontFamily: 'Cinzel, Georgia, serif', fontSize: 'clamp(12px, 5.6cqw, 40px)' }}>{digits[i] ?? '?'}</span>
                </span>
            ))}
            {/* This game's clues, written on the design's clue lines. */}
            {LOCK_CLUES.map((cl, i) => (
                <p key={i} className="absolute flex items-center rounded-r-[1cqw] bg-gradient-to-b from-[#f6e7c3] to-[#ecd6a3] pl-[0.6cqw] leading-[1.15] text-[#2a1a0a]" style={{ ...centred(cl), fontSize: 'clamp(8px, 2.3cqw, 19px)' }} data-lock-clue={i}>
                    <span><b>Clue {i + 1}:</b> {cur.clues?.[i]}</span>
                </p>
            ))}
            {/* The keys and Submit: the design's own, pressed where they are drawn. */}
            {LOCK_KEYS.map(({ k, ...at2 }) => (
                <button key={k} type="button" onClick={() => press(k)} disabled={disabled} aria-label={k === 'back' ? 'Delete' : k}
                    className="absolute rounded-[12%] transition active:bg-white/25 enabled:hover:bg-white/10 disabled:cursor-not-allowed" style={centred({ ...at2, ...LOCK_KEY })} data-lock-key={k} />
            ))}
            <button type="button" onClick={submit} disabled={disabled || digits.length < 3} aria-label="Submit answer"
                className="absolute rounded-full transition enabled:hover:bg-white/10 enabled:active:bg-white/20 disabled:cursor-not-allowed disabled:bg-black/35" style={centred(LOCK_SUBMIT)} data-lock-submit />
        </section>
    );
}

/* ── 2 · The Hidden Mechanism: the Math Logic Challenge (since 2026-11-05) ── */
// The approved design's own panel (cut from it: math-panel.jpg, 644×750) made live: its three totals, the answer box,
// the four choices and Submit, where it drew them (% of the panel).
const MATH_ART = `${import.meta.env.BASE_URL || '/'}games/finalvault/math-panel.jpg`;
const MATH_TOTALS = [29.1, 40.5, 52.3];
const MATH_CHOICES = [17.2, 38.9, 60.9, 82.8];
const MATH_TOTAL_X = 83.2;
// Where to read the bare parchment around each printed total (% of the art): right of it, and in the gaps above/below.
const MATH_PATCH_FALLBACK = '#f1d9aa';
const sampleAt = (y) => [[94, y], [MATH_TOTAL_X, y - 5.6], [MATH_TOTAL_X, y + 5.6]];

/** The parchment colour around each printed total, read from the art once it loads (falls back to a close tone). */
function useParchment() {
    const [colours, setColours] = useState(() => MATH_TOTALS.map(() => MATH_PATCH_FALLBACK));
    useEffect(() => {
        let live = true;
        const img = new Image();
        img.onload = () => {
            try {
                const c = document.createElement('canvas');
                c.width = img.naturalWidth; c.height = img.naturalHeight;
                const ctx = c.getContext('2d', { willReadFrequently: true });
                ctx.drawImage(img, 0, 0);
                const read = ([x, y]) => ctx.getImageData(Math.round((x / 100) * c.width) - 2, Math.round((y / 100) * c.height) - 2, 5, 5).data;
                const next = MATH_TOTALS.map((y) => {
                    const sum = [0, 0, 0]; let n = 0;
                    sampleAt(y).forEach((pt) => { const d = read(pt); for (let k = 0; k < d.length; k += 4) { sum[0] += d[k]; sum[1] += d[k + 1]; sum[2] += d[k + 2]; n++; } });
                    return `rgb(${sum.map((v) => Math.round(v / n)).join(',')})`;
                });
                if (live) setColours(next);
            } catch { /* tainted or unreadable: keep the fallback */ }
        };
        img.src = MATH_ART;
        return () => { live = false; };
    }, []);
    return colours;
}

export function MathLogicPuzzle({ cur, box, label, onSubmit, disabled, shake, audio }) {
    const [pick, setPick] = useState(null);
    const choose = (n) => { if (disabled) return; audio.sfx('click'); setPick(n); };
    const submit = () => { if (!disabled && pick != null) onSubmit(pick); };
    const serifNum = { fontFamily: 'Cinzel, Georgia, serif' };
    const patch = useParchment();
    const EQ = [['🧭', '🧭', '🧭'], ['🧭', '🏮', '🏮'], ['🏮', '📕', '📕']];
    return (
        <>
            <section className={`absolute z-20 hidden @min-[560px]:block ${shake ? 'fv-shake' : ''}`}
                style={{ left: `${box.l}%`, top: `${box.t}%`, width: `${box.w}%`, height: `${box.h}%`, containerType: 'inline-size', background: `url(${MATH_ART}) center / 100% 100% no-repeat` }} data-puzzle-panel="mathlogic">
                {cur.totals.map((t, i) => (
                    <span key={i} className="absolute" style={centred({ x: MATH_TOTAL_X, y: MATH_TOTALS[i], w: 17, h: 10 })} data-math-total={i}>
                        {/* Covers the art's own printed total, in the parchment's own colour there. */}
                        <span aria-hidden className="absolute inset-0 rounded-[35%] blur-[0.6cqw]" style={{ background: patch[i] }} />
                        <span className="relative flex h-full items-center justify-center font-black leading-none text-[#1d140a]" style={{ ...serifNum, fontSize: 'clamp(10px, 8cqw, 46px)' }}>{t}</span>
                    </span>
                ))}
                {/* The answer box: "?" until a number is chosen. */}
                <span className="absolute flex items-center justify-center rounded-[1.5cqw] border-[0.4cqw] border-[#e2b24f] bg-gradient-to-b from-[#8c1c14] to-[#5a0c08] font-black text-[#ffe9a8]"
                    style={{ ...centred({ x: 62.6, y: 65.9, w: 14, h: 8.8 }), ...serifNum, fontSize: 'clamp(10px, 7cqw, 40px)' }} data-math-answer>{pick ?? '?'}</span>
                {cur.choices.map((n, i) => (
                    <button key={n} type="button" disabled={disabled} onClick={() => choose(n)} aria-label={`${n}`} aria-pressed={pick === n}
                        className={`absolute flex items-center justify-center rounded-[1.4cqw] border-[0.35cqw] font-black transition disabled:cursor-not-allowed ${pick === n ? 'border-[#ffd166] bg-gradient-to-b from-[#7a5212] to-[#3b2306] text-white shadow-[0_0_2cqw_rgba(255,200,80,.85)]' : 'border-[#c9a14a] bg-gradient-to-b from-[#2b1d0d] to-[#140c05] text-[#f4d48a] hover:brightness-125'}`}
                        style={{ ...centred({ x: MATH_CHOICES[i], y: 79, w: 18.9, h: 9.5 }), ...serifNum, fontSize: 'clamp(10px, 7cqw, 40px)' }} data-math-choice={n}>{n}</button>
                ))}
                <button type="button" onClick={submit} disabled={disabled || pick == null} aria-label="Submit"
                    className="absolute rounded-full transition enabled:hover:bg-white/10 enabled:active:bg-white/20 disabled:cursor-not-allowed disabled:bg-black/30" style={centred({ x: 49.1, y: 93.3, w: 55.9, h: 8.1 })} data-math-submit />
            </section>
            {/* The upright phone layout: the same challenge in the card below the chamber. */}
            <div className="@min-[560px]:hidden">
                <Panel box={box} label={label} shake={shake}>
                    <p className="text-center text-xs font-black uppercase tracking-wider text-[#8c1c14]">Math logic challenge</p>
                    <Prompt>{cur.prompt}</Prompt>
                    <div className="mt-3 space-y-2" data-math-rows>
                        {EQ.map((row, i) => (
                            <p key={i} className="flex items-center justify-center gap-2 text-2xl">
                                {row.map((e, k) => <span key={k} className="flex items-center gap-2">{k > 0 && <b className="text-lg text-[#3a250d]">+</b>}{e}</span>)}
                                <b className="ml-1 text-lg text-[#3a250d]">=</b><b className="w-10 text-right text-xl text-[#1d140a]" style={serifNum}>{cur.totals[i]}</b>
                            </p>
                        ))}
                    </div>
                    <p className="mt-3 flex items-center justify-center gap-3 text-2xl">📕 <b className="text-lg">=</b>
                        <span className="flex h-11 w-14 items-center justify-center rounded-lg border-2 border-[#e2b24f] bg-gradient-to-b from-[#8c1c14] to-[#5a0c08] text-xl font-black text-[#ffe9a8]" style={serifNum}>{pick ?? '?'}</span></p>
                    <div className="mt-3 grid grid-cols-4 gap-2">
                        {cur.choices.map((n) => (
                            <button key={n} type="button" disabled={disabled} onClick={() => choose(n)} aria-pressed={pick === n}
                                className={`min-h-12 rounded-lg border-2 text-xl font-black ${pick === n ? 'border-[#ffd166] bg-[#7a5212] text-white' : 'border-[#c9a14a] bg-[#1f1408] text-[#f4d48a]'}`} style={serifNum}>{n}</button>
                        ))}
                    </div>
                    <Submit disabled={disabled || pick == null} onClick={submit}>Submit</Submit>
                </Panel>
            </div>
        </>
    );
}

/* ── 2 (until 2026-11-05) · The rings ── */
export function RingsPuzzle({ cur, box, label, onSubmit, disabled, shake, audio }) {
    const [pos, setPos] = useState(cur.start);
    // Each ring on its own; a linked set turns the next one too (the last turns alone).
    const turn = (i, d) => { audio.sfx('gear'); setPos((p) => p.map((x, k) => (k === i || (cur.linked !== false && k === i + 1 && i < 2) ? (x + d + 6) % 6 : x))); };
    const face = (i, off = 0) => cur.rings[i][(((pos[i] + off) % 6) + 6) % 6];
    return (
        <>
        <Panel box={box} label={label} shake={shake}>
            <Prompt>{cur.prompt}</Prompt>
            {/* The plate itself is on the bridge, in the chamber's picture (FinalVaultTable, BRIDGE_FACES). */}
            <div className="mt-[0.9cqw] flex items-stretch justify-center gap-[0.3cqw] rounded-[0.8cqw] border-2 border-[#3b2610] bg-gradient-to-b from-[#2a1c0b] to-[#120c04] p-[0.8cqw] @max-[560px]:mt-2 @max-[560px]:p-2" data-rings>
                {[0, 1, 2].map((i) => (
                    <div key={i} className="flex flex-1 flex-col items-center">
                        <button type="button" disabled={disabled} onClick={() => turn(i, -1)} aria-label={`Turn ring ${i + 1} up`} className="text-[#f4c55a] hover:text-white disabled:opacity-40"><ChevronUp size={18} /></button>
                        <div className="relative w-full overflow-hidden rounded-[0.6cqw] border border-[#b8893a] bg-[linear-gradient(90deg,#5a3d14,#d9a441_35%,#f4d27a_50%,#d9a441_65%,#5a3d14)] py-[0.4cqw] shadow-[inset_0_6px_8px_rgba(0,0,0,.55),inset_0_-6px_8px_rgba(0,0,0,.55)]">
                            <div className="mx-auto h-[1.6cqw] w-[1.6cqw] opacity-40 @max-[560px]:h-5 @max-[560px]:w-5"><Glyph name={face(i, -1)} dim /></div>
                            <div key={pos[i]} className="fv-turn mx-auto my-[0.3cqw] h-[3.4cqw] w-[3.4cqw] @max-[560px]:h-10 @max-[560px]:w-10" data-ring-face={face(i)}><Glyph name={face(i)} /></div>
                            <div className="mx-auto h-[1.6cqw] w-[1.6cqw] opacity-40 @max-[560px]:h-5 @max-[560px]:w-5"><Glyph name={face(i, 1)} dim /></div>
                        </div>
                        <button type="button" disabled={disabled} onClick={() => turn(i, 1)} aria-label={`Turn ring ${i + 1} down`} className="text-[#f4c55a] hover:text-white disabled:opacity-40"><ChevronDown size={18} /></button>
                    </div>
                ))}
            </div>
            <Submit disabled={disabled} onClick={() => onSubmit([0, 1, 2].map((i) => face(i)))}>Submit</Submit>
        </Panel>
        </>
    );
}

/** The mural (The Secret Code): its equations, and the figures to count. */
const Mural = ({ cur, compact }) => (
    <div className={`flex h-full flex-col items-center justify-between rounded-[0.6cqw] border-2 border-[#7a5a2a] bg-gradient-to-b from-[#e9d3a0] to-[#c9a466] p-[1cqw] text-[#3a250d] shadow-[inset_0_0_30px_rgba(90,50,10,.5)] ${compact ? 'p-3' : ''}`} data-mural>
        <div className="space-y-[0.5cqw]">
            {cur.lines.map((l, i) => <p key={i} className="text-center font-black" style={{ fontSize: compact ? 16 : fs(14, 1.9, 34), fontFamily: 'Cinzel, Georgia, serif' }}>{l}</p>)}
            <p className="text-center font-black" style={{ fontSize: compact ? 16 : fs(14, 1.9, 34), fontFamily: 'Cinzel, Georgia, serif' }}>△ = ?</p>
        </div>
        {cur.figures > 0 && <div className="mt-[0.6cqw] flex flex-wrap items-end justify-center gap-[0.4cqw]" aria-label="People drawn on the wall" data-figures={cur.figures}>
            {Array.from({ length: cur.figures }, (_, i) => (
                <svg key={i} viewBox="0 0 20 40" style={{ width: compact ? 16 : fs(12, 1.6, 28) }} aria-hidden="true">
                    <circle cx="10" cy="6" r="4" fill="#3a250d" />
                    <path d={`M10 10 L10 26 M10 14 L${i % 2 ? 2 : 3} ${i % 2 ? 8 : 20} M10 14 L${i % 2 ? 18 : 17} ${i % 2 ? 20 : 8} M10 26 L4 38 M10 26 L16 38`} stroke="#3a250d" strokeWidth="2.6" strokeLinecap="round" fill="none" />
                </svg>
            ))}
        </div>}
        <p className="mt-[0.4cqw] text-center font-semibold italic" style={{ fontSize: compact ? 12 : fs(10, 0.9, 15) }}>{cur.note}</p>
    </div>
);

/* ── 3 · The Secret Code ── */
const CODE_ART = `${import.meta.env.BASE_URL || '/'}games/finalvault/code-panel.jpg`;
const CODE_TILES = [30.1, 51.1, 71.5];
export function CodePuzzle({ cur, box, label, onSubmit, disabled, shake, audio, wall, focus }) {
    const [digits, setDigits] = useState([0, 0, 0]);
    const set = (i, v) => { audio.sfx('dial'); setDigits((d) => d.map((x, k) => (k === i ? v : x))); };
    return (
        <>
            {/* The mural and the dials on the wall, over the chamber's own. */}
            <div className="absolute z-10 hidden @min-[560px]:block" style={{ left: `${wall.mural.l}%`, top: `${wall.mural.t}%`, width: `${wall.mural.w}%`, height: `${wall.mural.h}%` }}><Mural cur={cur} /></div>
            {wall.dials.map((d, i) => (
                <div key={i} className="absolute z-10 hidden -translate-x-1/2 -translate-y-1/2 @min-[560px]:block" style={{ left: `${d.x}%`, top: `${d.y}%` }}>
                    <Dial value={digits[i]} onChange={(v) => set(i, v)} disabled={disabled} big />
                </div>
            ))}
            {/* On a phone the dials are turned in the card below, and the code they show is on the door's slots too (2026-11-05). */}
            {wall.dials.map((d, i) => (
                <span key={`p${i}`} className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 font-black text-[#ffd166] [text-shadow:0_0_10px_rgba(251,191,36,.9),0_2px_3px_#000] @min-[560px]:hidden"
                    style={{ left: phoneLeft(d.x, focus), top: `${d.y}%`, fontSize: 'clamp(20px, 7vw, 34px)', fontFamily: 'Cinzel, Georgia, serif' }} data-door-digit={i}>{digits[i]}</span>
            ))}
            {/* The wide layout: the approved design's own card (cut from it: code-panel.jpg, 274×301), its tiles showing the
                dials and its Submit made live (2026-11-05). The upright phone layout keeps the card below, with its own dials. */}
            <section className={`absolute z-20 hidden @min-[560px]:block ${shake ? 'fv-shake' : ''}`}
                style={{ left: `${box.l}%`, top: `${box.t}%`, width: `${box.w}%`, height: `${box.h}%`, containerType: 'inline-size', background: `url(${CODE_ART}) center / 100% 100% no-repeat` }} data-puzzle-panel="code">
                {digits.map((v, i) => (
                    <span key={i} className="absolute flex items-center justify-center rounded-[10%] bg-gradient-to-b from-[#2b1a0a] to-[#140b04] shadow-[inset_0_0_0_1.5px_#b8893a]" style={centred({ x: CODE_TILES[i], y: 62, w: 18.6, h: 17.6 })} data-code-tile={i}>
                        <span className="font-black leading-none text-[#ffd97a] [text-shadow:0_0_6px_rgba(255,190,60,.8)]" style={{ fontFamily: 'Cinzel, Georgia, serif', fontSize: 'clamp(11px, 12cqw, 40px)' }}>{v}</span>
                    </span>
                ))}
                <button type="button" onClick={() => onSubmit(digits.join(''))} disabled={disabled} aria-label="Submit code"
                    className="absolute rounded-full transition enabled:hover:bg-white/10 enabled:active:bg-white/20 disabled:cursor-not-allowed disabled:bg-black/35" style={centred({ x: 50.7, y: 82.6, w: 73.7, h: 14.3 })} data-code-submit />
            </section>
            <div className="@min-[560px]:hidden">
            <Panel box={box} label={label} shake={shake}>
                <Prompt>{cur.prompt}</Prompt>
                <div className="mt-3 @min-[560px]:hidden"><Mural cur={cur} compact /></div>
                <div className="mx-auto mt-[0.8cqw] flex w-fit gap-[0.8cqw] rounded-[0.6cqw] border-2 border-[#3b2610] bg-[#1f1406] p-[0.6cqw] @max-[560px]:mt-3 @max-[560px]:gap-2 @max-[560px]:p-2" data-code>
                    {digits.map((v, i) => (
                        <div key={i} className="flex items-center">
                            <span className="hidden @min-[560px]:block"><span className={`${tile} font-black text-[#ffd166]`} style={{ width: fs(30, 3.4, 54), height: fs(34, 3.6, 58), fontSize: fs(16, 2, 32), fontFamily: 'Cinzel, Georgia, serif' }}>{v}</span></span>
                            <span className="@min-[560px]:hidden"><Dial value={v} onChange={(x) => set(i, x)} disabled={disabled} /></span>
                        </div>
                    ))}
                </div>
                <p className="mt-[0.4cqw] text-center text-[#6b4a1a] @max-[560px]:hidden" style={{ fontSize: fs(10, 0.8, 13) }}>Turn the dials on the door: ☀ then ☾ then △</p>
                <Submit disabled={disabled} onClick={() => onSubmit(digits.join(''))}>Submit code</Submit>
            </Panel>
            </div>
        </>
    );
}

/** The light path's board: the source, the mirrors as they are turned, the crystal, and the beam. */
const LightBoard = ({ cur, states }) => {
    const beam = traceBeam(cur, states);
    const n = cur.size;
    const line = (s) => [[-0.38, 0.38, 0.38, -0.38], [-0.42, 0, 0.42, 0], [-0.38, -0.38, 0.38, 0.38], [0, -0.42, 0, 0.42]][s];
    return (
        <svg viewBox={`-0.6 -0.2 ${n + 0.8} ${n + 0.4}`} className="h-full w-full" role="img" aria-label={beam.hit ? 'The beam reaches the crystal' : 'The beam misses the crystal'} data-light-board data-hit={beam.hit}>
            <rect x="0" y="0" width={n} height={n} rx="0.2" fill="#1a1207" stroke="#8a6a2f" strokeWidth="0.05" />
            {Array.from({ length: n - 1 }, (_, i) => <g key={i}><line x1={i + 1} y1="0" x2={i + 1} y2={n} stroke="#3b2a12" strokeWidth="0.02" /><line x1="0" y1={i + 1} x2={n} y2={i + 1} stroke="#3b2a12" strokeWidth="0.02" /></g>)}
            {/* The source: a sun lamp on the left wall. */}
            <circle cx="-0.3" cy={cur.source + 0.5} r="0.22" fill="#ffd166" style={{ filter: 'drop-shadow(0 0 .15px #ffd166)' }} />
            <polyline points={beam.pts.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke="#ffb627" strokeWidth="0.09" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 .12px #ffd166)' }} />
            <polyline points={beam.pts.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke="#fff6d5" strokeWidth="0.03" strokeLinecap="round" strokeLinejoin="round" />
            {/* The crystal. */}
            <path d={`M${cur.crystal.c + 0.5} ${cur.crystal.r + 0.12} L${cur.crystal.c + 0.8} ${cur.crystal.r + 0.5} L${cur.crystal.c + 0.5} ${cur.crystal.r + 0.88} L${cur.crystal.c + 0.2} ${cur.crystal.r + 0.5} Z`} fill={beam.hit ? '#fff2b0' : '#7dd3fc'} stroke="#fef3c7" strokeWidth="0.04" style={{ filter: beam.hit ? 'drop-shadow(0 0 .25px #ffd166)' : 'none' }} />
            {cur.mirrors.map((m, i) => {
                const [x1, y1, x2, y2] = line(states[i]);
                return (
                    <g key={i} transform={`translate(${m.c + 0.5} ${m.r + 0.5})`}>
                        <circle r="0.44" fill="#2a1c0b" stroke="#8a6a2f" strokeWidth="0.03" />
                        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#e5e7eb" strokeWidth="0.1" strokeLinecap="round" style={{ transition: 'all .25s' }} />
                        <text x="0.3" y="-0.22" fontSize="0.3" fill="#f4c55a" textAnchor="middle">{GLYPH_TEXT[m.symbol]}</text>
                    </g>
                );
            })}
        </svg>
    );
};

/* ── 4 · The Light Path ── */
const LIGHT_ART = `${import.meta.env.BASE_URL || '/'}games/finalvault/light-panel.jpg`;
const LIGHT_ROWS = [28.6, 40.2, 52.2, 64];

export function MirrorsPuzzle({ cur, box, label, onSubmit, disabled, shake, audio, wall }) {
    const [states, setStates] = useState(cur.start);
    const hit = traceBeam(cur, states).hit;
    const turn = (i, d) => {
        const next = states.map((x, k) => (k === i ? (x + d + 4) % 4 : x));
        audio.sfx(traceBeam(cur, next).hit ? 'crystal' : 'mirror');
        setStates(next);
    };
    return (
        <>
            {/* The wide layout, as the approved design (2026-11-05): the light path board in its "Light path control" card,
                and its own panel (cut from it: light-panel.jpg, 405×757) made live — a row a mirror, ‹ › to turn it. */}
            <div className="absolute z-20 hidden bg-[#1a120a] @min-[560px]:block" style={{ left: `${wall.l}%`, top: `${wall.t}%`, width: `${wall.w}%`, height: `${wall.h}%`, borderRadius: '0.6cqw' }} data-light-board-wide>
                <LightBoard cur={cur} states={states} />
            </div>
            <section className={`absolute z-20 hidden @min-[560px]:block ${shake ? 'fv-shake' : ''}`}
                style={{ left: `${box.l}%`, top: `${box.t}%`, width: `${box.w}%`, height: `${box.h}%`, containerType: 'inline-size', background: `url(${LIGHT_ART}) center / 100% 100% no-repeat` }} data-puzzle-panel="mirrors">
                {/* This puzzle's number on the ribbon. */}
                <span className="absolute flex items-center justify-center rounded-full bg-gradient-to-b from-[#7a1414] to-[#4a0a0a] font-bold text-[#ffe9b0]"
                    style={{ ...centred({ x: 50, y: 4.9, w: 42, h: 5.4 }), fontFamily: 'Cinzel, Georgia, serif', fontSize: 'clamp(9px, 7.4cqw, 34px)' }}>{label.toUpperCase()}</span>
                {cur.mirrors.map((m, i) => (
                    <div key={i} className="absolute" style={centred({ x: 50.9, y: LIGHT_ROWS[i], w: 75.1, h: 10.2 })} data-mirror={i} data-state={states[i]}>
                        {/* The row's middle repainted in its own dark bronze, so the design's sample symbol is gone entirely. */}
                        <span className="pointer-events-none absolute left-1/2 top-1/2 flex h-[86%] w-[50%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[2cqw]"
                            style={{ background: 'linear-gradient(180deg, #2e1d0c, #1f1307)', boxShadow: '0 0 1.6cqw 1cqw #241608' }}>
                            <span className="h-[78%] aspect-square"><Glyph name={m.symbol} /></span>
                        </span>
                        <button type="button" disabled={disabled} onClick={() => turn(i, -1)} aria-label={`Turn the ${m.symbol} mirror left`} className="absolute inset-y-0 left-0 w-[30%] rounded-l-[3cqw] enabled:hover:bg-white/10 enabled:active:bg-white/20" />
                        <button type="button" disabled={disabled} onClick={() => turn(i, 1)} aria-label={`Turn the ${m.symbol} mirror right`} className="absolute inset-y-0 right-0 w-[30%] rounded-r-[3cqw] enabled:hover:bg-white/10 enabled:active:bg-white/20" />
                    </div>
                ))}
                <p className={`absolute flex items-center justify-center rounded-[3cqw] bg-[#f1dfb8] px-[4cqw] text-center font-semibold leading-snug ${hit ? 'text-emerald-800' : 'text-[#3a250d]'}`}
                    style={{ left: '11.6%', top: '71.3%', width: '78.3%', height: '10.3%', fontSize: 'clamp(8px, 4.6cqw, 20px)' }} data-light-status>
                    {hit ? '◆ The light reaches the crystal!' : 'The light does not reach the crystal yet.'}
                </p>
                <button type="button" disabled={disabled} onClick={() => onSubmit(states)} aria-label="Submit answer"
                    className="absolute rounded-full transition enabled:hover:bg-white/10 enabled:active:bg-white/20 disabled:cursor-not-allowed disabled:bg-black/35" style={centred({ x: 50.4, y: 90.2, w: 81.5, h: 8.6 })} data-light-submit />
            </section>
            {/* The upright phone layout: the card below the chamber, its own board in it. */}
            <div className="@min-[560px]:hidden">
            <Panel box={box} label={label} shake={shake}>
                <Prompt>{cur.prompt}</Prompt>
                <div className="mx-auto mt-3 aspect-square w-[80%] @min-[560px]:hidden"><LightBoard cur={cur} states={states} /></div>
                <div className="mt-[0.8cqw] grid grid-cols-4 gap-[0.7cqw] @max-[560px]:mt-3 @max-[560px]:gap-1.5" data-mirrors>
                    {cur.mirrors.map((m, i) => (
                        <div key={i} className={`${tile} flex-col py-[0.5cqw] @max-[560px]:py-1.5`} data-mirror={i} data-state={states[i]}>
                            <div className="h-[2.6cqw] w-[2.6cqw] @max-[560px]:h-8 @max-[560px]:w-8"><Glyph name={m.symbol} /></div>
                            <div className="mt-[0.2cqw] flex w-full items-center justify-between px-[0.3cqw]">
                                <button type="button" disabled={disabled} onClick={() => turn(i, -1)} aria-label={`Turn the ${m.symbol} mirror left`} className="text-[#f4c55a] hover:text-white disabled:opacity-40"><ChevronLeft size={18} /></button>
                                <span className="font-black text-[#e5e7eb]" style={{ fontSize: fs(12, 1.2, 20) }}>{['╱', '—', '╲', '|'][states[i]]}</span>
                                <button type="button" disabled={disabled} onClick={() => turn(i, 1)} aria-label={`Turn the ${m.symbol} mirror right`} className="text-[#f4c55a] hover:text-white disabled:opacity-40"><ChevronRight size={18} /></button>
                            </div>
                        </div>
                    ))}
                </div>
                <p className={`mt-[0.4cqw] text-center font-bold @max-[560px]:mt-2 ${hit ? 'text-emerald-800' : 'text-[#6b4a1a]'}`} style={{ fontSize: fs(10, 0.85, 14) }}>{hit ? '◆ The light reaches the crystal!' : 'The light does not reach the crystal yet.'}</p>
                <Submit disabled={disabled} onClick={() => onSubmit(states)}>Submit answer</Submit>
            </Panel>
            </div>
        </>
    );
}

/* ── 5 · The Final Trial ── */
const FINAL_ART = `${import.meta.env.BASE_URL || '/'}games/finalvault/final-panel.jpg`;
const FINAL_SLOTS = [26.3, 49.4, 72.7];
const FINAL_DIALS = [27.4, 42.2, 56.8, 71.8];

export function FinalPuzzle({ cur, box, label, onSubmit, disabled, shake, audio }) {
    const [slots, setSlots] = useState([null, null, null]);
    const [digits, setDigits] = useState([0, 0, 0, 0]);
    const cycle = (i, d) => {
        audio.sfx('gear');
        setSlots((s) => s.map((x, k) => {
            if (k !== i) return x;
            const list = [null, ...cur.relics];
            return list[(list.indexOf(x) + d + list.length) % list.length];
        }));
    };
    const ready = slots.every(Boolean) && new Set(slots).size === 3;
    const turn = (i, d) => { audio.sfx('dial'); setDigits((x) => x.map((y, k) => (k === i ? (y + d + 10) % 10 : y))); };
    return (
        <>
        {/* The wide layout: the approved design's own panel (cut from it: final-panel.jpg, 594×747), made live where
            it drew its controls (2026-11-05). The upright phone layout keeps the card below. */}
        <section className={`absolute z-20 hidden @min-[560px]:block ${shake ? 'fv-shake' : ''}`}
            style={{ left: `${box.l}%`, top: `${box.t}%`, width: `${box.w}%`, height: `${box.h}%`, containerType: 'inline-size', background: `url(${FINAL_ART}) center / 100% 100% no-repeat` }} data-puzzle-panel="final">
            {/* This game's clues, on the design's parchment. */}
            <ul className="absolute flex flex-col justify-center gap-[0.8cqw] rounded-[1.5cqw] bg-gradient-to-b from-[#fbeccb] to-[#f1d9a6] px-[2cqw] font-bold leading-[1.2] text-[#22150a]"
                style={{ left: '6.2%', top: '23.7%', width: '87.6%', height: '17.5%', fontSize: `clamp(7px, ${cur.clues.length > 4 ? 2.3 : 2.7}cqw, 18px)` }} data-trial-clues>
                {cur.clues.map((c, i) => <li key={i} className="flex gap-[1.2cqw]"><span aria-hidden="true">◆</span><span>{c}</span></li>)}
            </ul>
            {/* Step 1: the three places; ‹ and › cycle the relics. */}
            {slots.map((sl, i) => (
                <div key={i} className="absolute" style={centred({ x: FINAL_SLOTS[i], y: 53.3, w: 16.5, h: 9 })} data-altar-slot={i}>
                    <span className="pointer-events-none absolute left-1/2 top-[8%] flex h-[56%] w-[52%] -translate-x-1/2 items-center justify-center" style={{ background: 'radial-gradient(closest-side, #241509 72%, rgba(36,21,9,0))' }}>
                        {sl ? <span className="h-full w-[80%]"><Glyph name={sl} /></span> : <span className="font-black text-[#f4c55a]" style={{ fontSize: '4.2cqw' }}>{i + 1}</span>}
                    </span>
                    <button type="button" disabled={disabled} onClick={() => cycle(i, -1)} aria-label={`Place ${i + 1}: previous symbol`} className="absolute inset-y-0 left-0 w-1/2 rounded-l-[1.5cqw] enabled:hover:bg-white/10 enabled:active:bg-white/20" />
                    <button type="button" disabled={disabled} onClick={() => cycle(i, 1)} aria-label={`Place ${i + 1}: next symbol`} className="absolute inset-y-0 right-0 w-1/2 rounded-r-[1.5cqw] enabled:hover:bg-white/10 enabled:active:bg-white/20" />
                </div>
            ))}
            {/* Step 2: this game's rule for the code. */}
            <p className="absolute flex items-center justify-center text-center font-semibold leading-[1.25] text-[#f5e6c4]"
                style={{ left: '7%', top: '64%', width: '86%', height: '7.4%', fontSize: 'clamp(7px, 2.5cqw, 16px)', background: '#22140a', borderRadius: '1.5cqw', boxShadow: '0 0 0.8cqw 0.3cqw #22140a' }} data-final-rule>{cur.rule}</p>
            {/* The four dials: ⌃ and ⌄ where the design drew them. */}
            {digits.map((v, i) => (
                <div key={i} className="absolute" style={centred({ x: FINAL_DIALS[i], y: 78.2, w: 11.3, h: 13.5 })} data-final-dial={i}>
                    <span className="pointer-events-none absolute left-1/2 top-1/2 flex h-[42%] w-[70%] -translate-x-1/2 -translate-y-1/2 items-center justify-center font-black text-[#ffd97a] [text-shadow:0_0_6px_rgba(255,190,60,.8)]"
                        style={{ fontSize: '6cqw', background: 'radial-gradient(closest-side, #1d1108 75%, rgba(29,17,8,0))' }}>{v}</span>
                    <button type="button" disabled={disabled} onClick={() => turn(i, 1)} aria-label={`Digit ${i + 1} up`} className="absolute inset-x-0 top-0 h-1/2 rounded-t-[1.5cqw] enabled:hover:bg-white/10 enabled:active:bg-white/20" />
                    <button type="button" disabled={disabled} onClick={() => turn(i, -1)} aria-label={`Digit ${i + 1} down`} className="absolute inset-x-0 bottom-0 h-1/2 rounded-b-[1.5cqw] enabled:hover:bg-white/10 enabled:active:bg-white/20" />
                </div>
            ))}
            <button type="button" disabled={disabled || !ready} onClick={() => onSubmit({ order: slots, code: digits.join('') })} aria-label="Open the vault"
                className="absolute rounded-full transition enabled:hover:bg-white/10 enabled:active:bg-white/20 disabled:cursor-not-allowed disabled:bg-black/35" style={centred({ x: 50, y: 92, w: 68.7, h: 7.9 })} data-final-open />
        </section>
        <div className="@min-[560px]:hidden">
        <Panel box={box} label={label} shake={shake}>
            <Prompt>{cur.prompt}</Prompt>
            <ol className="mt-[0.6cqw] space-y-[0.2cqw] rounded-[0.5cqw] bg-[#3a250d]/10 px-[0.8cqw] py-[0.5cqw] @max-[560px]:mt-2 @max-[560px]:p-2" style={{ fontSize: fs(11, 0.95, 16) }} data-trial-clues>
                {cur.clues.map((c, i) => <li key={i} className="font-semibold">◆ {c}</li>)}
            </ol>
            <p className="mt-[0.6cqw] text-center font-bold uppercase text-[#6b4a1a] @max-[560px]:mt-2" style={{ fontSize: fs(10, 0.85, 14) }}>Step 1 · Put the symbols in order</p>
            <div className="mt-[0.3cqw] flex justify-center gap-[0.8cqw] @max-[560px]:gap-2" data-altar>
                {slots.map((s, i) => (
                    <div key={i} className={`${tile} flex-col px-[0.3cqw] py-[0.4cqw]`} style={{ width: fs(56, 5.4, 90) }}>
                        <div className="h-[3cqw] w-[3cqw] @max-[560px]:h-9 @max-[560px]:w-9">{s ? <Glyph name={s} /> : <span className="flex h-full items-center justify-center font-black text-[#8a6a2f]">{i + 1}</span>}</div>
                        <div className="flex w-full justify-between">
                            <button type="button" disabled={disabled} onClick={() => cycle(i, -1)} aria-label={`Slot ${i + 1}: previous relic`} className="text-[#f4c55a] disabled:opacity-40"><ChevronLeft size={16} /></button>
                            <button type="button" disabled={disabled} onClick={() => cycle(i, 1)} aria-label={`Slot ${i + 1}: next relic`} className="text-[#f4c55a] disabled:opacity-40"><ChevronRight size={16} /></button>
                        </div>
                    </div>
                ))}
            </div>
            <p className="mt-[0.6cqw] text-center font-bold uppercase text-[#6b4a1a] @max-[560px]:mt-2" style={{ fontSize: fs(10, 0.85, 14) }}>Step 2 · Enter the code</p>
            <p className="text-center" style={{ fontSize: fs(10, 0.85, 14) }}>{cur.rule}</p>
            <div className="mt-[0.4cqw] flex justify-center gap-[0.6cqw] @max-[560px]:gap-1.5" data-final-code>
                {digits.map((v, i) => <Dial key={i} value={v} onChange={(x) => { audio.sfx('dial'); setDigits((d) => d.map((y, k) => (k === i ? x : y))); }} disabled={disabled} />)}
            </div>
            <Submit disabled={disabled || !ready} onClick={() => onSubmit({ order: slots, code: digits.join('') })}>Open the vault</Submit>
        </Panel>
        </div>
        </>
    );
}

