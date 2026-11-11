import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hourglass, KeyRound, Loader2, Brain, BookOpen, Sigma, Trophy, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import usePhaseClock from '../usePhaseClock';
import createAudio from '../adventure/audio';
import PhoneStage, { LandscapeStage, RotatePrompt, RotatedStage } from '../adventure/PhoneStage';
import useAdventureView from '../adventure/useAdventureView';
import ChamberPhoto from '../vault/ChamberPhoto';
import { at } from '../vault/style';
import { TitlePlaque, TopIcons, Stick, Symbol, MapSheet, CluesSheet, InventorySheet, PauseSheet } from './parts';
import { DesignHud, PathPanel, DiscsLive, DiscsPanel, DiscsCard, TriangleLive, GridLive, SwapLive, SwapTile, GateLive } from './design';
import { SYMBOL_NAMES, fs, serif, darkPanel } from './style';

/**
 * The Lost Kingdom, a Group Brain race built as The Final Vault is: five
 * trials, each on its picture (public/games/lostkingdom/trial1–5), the
 * picture's own panels cut out (ChamberPhoto) and the real ones in their
 * places — the title plaque, the question and its answers (A–D), the bridge
 * signs, the vault's number panels, the final gate's five slots, the Map,
 * Clues, Inventory and Menu buttons and the stick. Then the
 * treasure chamber (treasure.jpg) for whoever gets there.
 *
 * Everyone has the same trials and one clock. A right answer works the
 * trial's mechanism, walks the camera on into the next picture and gives a
 * relic and a clue (the Clues journal; the final gate needs them). A wrong
 * one adds the same time penalty for everyone and jams the lock a moment;
 * there are no hints on screen (the answers are explained at the end). Everything is
 * the server's (`view`); an answer names its trial, so a double tap cannot
 * count twice.
 */
const P = (n) => `${import.meta.env.BASE_URL || '/'}games/lostkingdom/trial${n}.jpg`;
// Where things are in each picture, in % (x, y, width, height); `hotspot`, where its mechanism is.
// Where the shared header and standings sit (Trials 1–2's design, given to every trial since 2026-11-05).
const DESIGN_HUD = {
    plaque: { l: 0.38, t: 1.6, w: 24.91, h: 9.91 }, board: { l: 0.87, t: 15.67, w: 18.41, h: 23.56 }, tracker: { l: 27.91, t: 1.07, w: 45.75, h: 11.41 },
    timer: { l: 73.97, t: 3.2, w: 8.14, h: 6.4 }, menu: [{ l: 83.09, t: 1.07, w: 4.68, h: 11.41 }, { l: 88.67, t: 1.07, w: 5.17, h: 11.41 }, { l: 94.75, t: 1.07, w: 5.17, h: 11.41 }],
    signs: [{ l: 29.19, t: 30.7, w: 13.25, h: 5.12 }, { l: 54.22, t: 30.7, w: 13.67, h: 5.12 }, { l: 77.74, t: 30.7, w: 14.28, h: 5.12 }]
};
// The question card under the standings, on the left, for the trials drawn without a design of their own.
const LEFT_PANEL = { l: 0.87, t: 41.5, w: 26, h: 54.5 };
// Puzzle 5's: wide and low, under the gate's slots, beside the standings column (2026-11-05: a phone could not fit it in the strip).
const GATE_PANEL = { l: 20.8, t: 55.5, w: 78.4, h: 41.5 };
const LAYOUT = [
    {
        // Trial 1 as the approved design (2026-11-05): its picture with its HUD and panel drawn in; the live ones sit
        // exactly where it drew them (design: true), and the panel is its own art made live (pathPanel).
        design: true, img: `${import.meta.env.BASE_URL || '/'}games/lostkingdom/trial1-design.jpg`,
        // The design's own HUD, signs and panel cut out (a soft blur of the picture there), so only the live ones show.
        holes: [[0, 0.4, 26.6, 12.2], [0, 14.6, 20.5, 25.7], [27, 0, 46.8, 13.6], [73.2, 0, 26.8, 13.6],
            [28.3, 29.6, 15.1, 7.4], [53.3, 29.6, 15.5, 7.4], [76.8, 29.6, 16.1, 7.4], [64.8, 48.6, 35.2, 49.4]],
        d: {
            plaque: { l: 0.38, t: 1.6, w: 24.91, h: 9.91 }, board: { l: 0.87, t: 15.67, w: 18.41, h: 23.56 }, tracker: { l: 27.91, t: 1.07, w: 45.75, h: 11.41 },
            timer: { l: 73.97, t: 3.2, w: 8.14, h: 6.4 }, menu: [{ l: 83.09, t: 1.07, w: 4.68, h: 11.41 }, { l: 88.67, t: 1.07, w: 5.17, h: 11.41 }, { l: 94.75, t: 1.07, w: 5.17, h: 11.41 }],
            signs: [{ l: 29.19, t: 30.7, w: 13.25, h: 5.12 }, { l: 54.22, t: 30.7, w: 13.67, h: 5.12 }, { l: 77.74, t: 30.7, w: 14.28, h: 5.12 }]
        },
        panel: { l: 65.59, t: 49.57, w: 33.9, h: 46.91 },
        plaque: { l: 2.2, t: 2.6, w: 23 }, icons: { r: 1.2, t: 2.4 }, stick: { l: 5.6, t: 66 }, action: { l: 86, t: 72.5 }, hotspot: { x: 50, y: 45 }
    },
    {
        // Puzzle 2 as the approved design (2026-11-07, the tile swap): its picture edge to edge, the shared header
        // where it draws one (no standings: it has none), its nine tiles and Submit made live (design.jsx, SwapLive).
        design: true, fit: true, img: `${import.meta.env.BASE_URL || '/'}games/lostkingdom/trial2-swap.jpg`,
        // Its header measured off the picture (2026-11-07): the title covered whole, the trials one by one over the drawn
        // ones, only the time written over its clock, and its own Map, Clues and Pause made live.
        d: { ...DESIGN_HUD, plaque: { l: 0.3, t: 0.2, w: 25.6, h: 10.6 }, board: null, signs: null, tracker: null, menuArt: true,
            trackerArt: { x: [31.5, 39.35, 47, 54.5, 62.35, 70], y: 4.03, d: 4.7, labelY: 9.25, labelW: 6.6, labelH: 2.8 },
            timerArt: { l: 76.2, t: 2.9, w: 5.2, h: 4.4 } },
        // In % of the whole picture: each tile's top-left corner, row by row; `src`, the tile where it paints each symbol.
        swap: {
            cells: [[33.6, 34.47], [42.1, 34.47], [50.65, 34.47], [33.6, 48.42], [42.1, 48.42], [50.65, 48.42], [33.6, 62.54], [42.1, 62.54], [50.65, 62.54]],
            cell: { w: 8.15, h: 13.6 }, src: { gem: 0, sun: 1, leaf: 2 }, submit: { x: 85.95, y: 84.9, w: 22.5, h: 10.5 },
            // The card's printed words, covered by three plain lines (design.jsx, SwapCard); its three symbols for them.
            card: { body: { l: 74.6, t: 35.3, w: 23, h: 34.9 }, icons: { gem: { l: 76.9, t: 50.3, w: 4.4, h: 7.6 }, sun: { l: 83.1, t: 50.1, w: 4.6, h: 8.2 }, leaf: { l: 89.8, t: 50.6, w: 4.2, h: 7.3 } } }
        },
        panel: LEFT_PANEL, plaque: { l: 2.2, t: 2.6, w: 23 }, icons: { r: 1.2, t: 2.4 }, stick: { l: 5.6, t: 66 }, action: { l: 86, t: 72.5 }, hotspot: { x: 46.5, y: 55 }
    },
    { img: `${import.meta.env.BASE_URL || '/'}games/lostkingdom/trial3-design.jpg`, fit: true, design: true, d: DESIGN_HUD,
        // Puzzle 3 as the approved design (2026-11-05, the number triangle): its circles and Submit made live (design.jsx).
        triangle: { circles: [[{ x: 81.34, y: 51.43 }], [{ x: 76.56, y: 61.21 }, { x: 86.12, y: 61.21 }], [{ x: 72.37, y: 71.63 }, { x: 81.34, y: 71.63 }, { x: 90.01, y: 71.63 }]], d: { w: 4.78, h: 8.5 }, submit: { x: 81.16, y: 85.87, w: 17.64, h: 6.91 } },
        holes: [[1.8, 2.3, 25.5, 11.8], [2.4, 17, 25.8, 45], [77, 1.8, 22.5, 11.8], [5, 65, 14.5, 25.5], [86, 73.5, 12, 20]], plaque: { l: 2.2, t: 2.6, w: 24.5 }, panel: LEFT_PANEL, icons: { r: 1.2, t: 2.4 }, stick: { l: 5.6, t: 66 }, action: { l: 86.6, t: 74.5 }, hotspot: { x: 62, y: 30 } },
    {
        img: `${import.meta.env.BASE_URL || '/'}games/lostkingdom/trial4-design.jpg`, fit: true, design: true, d: DESIGN_HUD,
        // Puzzle 4 as the approved design (2026-11-05, the number grid): its tiles and Submit made live; its hint card
        // painted out of the picture (design.jsx, GridLive).
        grid: { cells: [[53.23, 47.29], [61.36, 47.29], [69.38, 47.29], [53.23, 60.36], [61.36, 60.36], [69.38, 60.36], [53.23, 73.33], [61.36, 73.33], [69.38, 73.33]], cell: { w: 7.54, h: 12.33 },
            submit: { x: 65.49, y: 90.86, w: 19.74, h: 6.59 } },
        holes: [[2.3, 2.8, 25.5, 12.5], [2.8, 16.5, 25.8, 57.5], [78, 2.2, 21.5, 12], [5, 73.5, 13.5, 22], [86.5, 74.5, 12, 21], [43.5, 20, 26.6, 34]],
        plaque: { l: 2.8, t: 3.2, w: 24.5 }, panel: LEFT_PANEL, icons: { r: 0.8, t: 2.8 }, stick: { l: 5.6, t: 74.5 }, action: { l: 87, t: 75.5 },
        wall: { l: 44, t: 20.5, w: 25.6, h: 33 }, hotspot: { x: 57, y: 37 }
    },
    {
        // Puzzle 5 as the approved design (2026-11-07, the final gate): its picture edge to edge, its own title, trial
        // track (drawn as it stands on Puzzle 5) and buttons; the standings and the time written live over its printed
        // ones; the five slots, the card (taller, over where it drew "Unlock the gate") and its Submit made live (GateLive).
        img: `${import.meta.env.BASE_URL || '/'}games/lostkingdom/trial5-design.jpg`, fit: true, design: true,
        d: { ...DESIGN_HUD, plaque: null, tracker: null, signs: null, board: { l: 1.3, t: 15.35, w: 18.6, h: 24 }, timerArt: { l: 76.8, t: 4.4, w: 5.1, h: 4.2 }, menuArt: true },
        gate: {
            slots: [[39.5, 46.93], [47.1, 46.93], [54.25, 46.93], [61.4, 46.93], [68.6, 46.93]], slot: { w: 7, h: 12.28 },
            card: { l: 21, t: 55.3, w: 76.5, h: 40.56 }, submit: { l: 40.25, t: 89.9, w: 20.5, h: 7.2 },
            // Where the picture's tray draws each symbol (the art cut out for the slots and the card's tray).
            symbols: { sun: { l: 66.9, t: 67.98, w: 5, h: 8.77 }, leaf: { l: 73.5, t: 68.42, w: 5, h: 8.77 }, moon: { l: 79.35, t: 68.25, w: 5, h: 8.77 }, bird: { l: 85.25, t: 68.42, w: 5, h: 8.77 }, key: { l: 90.9, t: 67.98, w: 5, h: 8.77 } }
        },
        plaque: { l: 2.8, t: 2.6, w: 24.5 }, panel: GATE_PANEL, icons: { r: 1, t: 1.8 }, stick: { l: 5.6, t: 72.5 }, action: { l: 86.2, t: 73.5 }, hotspot: { x: 54, y: 47 }
    }
];
const TREASURE = { img: `${import.meta.env.BASE_URL || '/'}games/lostkingdom/treasure.jpg`, holes: [[1.8, 2.8, 25, 11], [11.5, 79.5, 20, 16.5]] };
const ICON = { bridges: Sigma, mcq: BookOpen, panels: Brain, arrange: BookOpen };
const THEMES = ['kingdom-1', 'kingdom-2', 'kingdom-3', 'kingdom-4', 'kingdom-5'];
const UNLOCK_SFX = ['door', 'unlock', 'gear', 'crystal', 'door'];
const box = (b) => ({ left: `${b.l}%`, top: `${b.t}%`, width: `${b.w}%`, height: b.h ? `${b.h}%` : undefined });
const fmt = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const LETTERS = 'ABCD';
const CSS = `
@keyframes lk-arrive { from { transform: scale(1.16); opacity: 0; filter: brightness(1.6) } to { transform: none; opacity: 1; filter: none } }
@keyframes lk-breathe { from { transform: scale(1) } to { transform: scale(1.03) } }
@keyframes lk-burst { from { transform: translate(-50%,-50%) scale(.2); opacity: 1 } to { transform: translate(-50%,-50%) scale(3); opacity: 0 } }
@keyframes lk-fall { from { transform: translateY(-8cqw) rotate(0) } to { transform: translateY(70cqw) rotate(600deg) } }
@keyframes lk-flash { from { opacity: .7 } to { opacity: 0 } }
.lk-scroll { scrollbar-width: auto; scrollbar-color: #c9a14a rgba(0,0,0,.35); }
.lk-scroll::-webkit-scrollbar { width: 10px; }
.lk-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,.35); border-radius: 999px; }
.lk-scroll::-webkit-scrollbar-thumb { background: linear-gradient(#e2b85a, #9a6a1c); border-radius: 999px; border: 2px solid rgba(0,0,0,.35); }
@keyframes lk-pop { from { transform: scale(.82); opacity: .4 } to { transform: none; opacity: 1 } }
@keyframes lk-shake { 0%,100% { transform: translateX(0) } 25%,75% { transform: translateX(-7px) } 50% { transform: translateX(7px) } }
/* The layout in plain CSS, so it never depends on utility classes being built:
   the picture 2000×1140; on a wide screen the panel sits on it, on a phone under it. */
.lk-stage { position: relative; isolation: isolate; container-type: inline-size; }
/* On a computer (2026-11-06): the whole chamber in the window — no wider than its picture can be while it still fits
   the window's height under the site's header and the game's top bar; centred. (On a phone the stages fit it.) */
.lk-stage.lk-fit { width: min(100%, calc((100dvh - 9.5rem) * 2000 / 1140)); margin-inline: auto; }   /* isolate: its layers stay under the site's header */
.lk-scene { position: relative; width: 100%; aspect-ratio: 2000 / 1140; overflow: hidden; border-radius: 1rem; background: #000; box-shadow: 0 25px 50px -12px rgba(0,0,0,.4); }
.lk-panel { position: relative; z-index: 20; margin-top: .75rem; }
/* The upright layout (a phone, 2026-11-03): the picture edge to edge, as big as the screen allows. Chosen by the
   game ("lk-wide" off), not the screen's width, since 2026-11-05: a phone can show the wide layout turned. */
.lk-stage:not(.lk-wide) .lk-scene { width: 100vw; margin-left: calc(50% - 50vw); border-radius: 0; }
/* The question and its answers, big and clear on a phone. */
.lk-stage:not(.lk-wide) .lk-panel [data-trial-panel] { padding: 1rem; gap: .75rem; }
.lk-stage:not(.lk-wide) .lk-panel [data-prompt], .lk-stage:not(.lk-wide) .lk-panel [data-trial-panel] p { font-size: 16px !important; line-height: 1.4; }
.lk-stage:not(.lk-wide) .lk-panel [data-trial-panel] > div:first-child > div { font-size: 16px !important; }
.lk-stage:not(.lk-wide) .lk-panel [data-options] { display: grid; gap: .6rem; }
.lk-stage:not(.lk-wide) .lk-panel [data-option] { min-height: 3.25rem; padding: .7rem .85rem !important; gap: .75rem; border-width: 1.5px; border-radius: .9rem;
    border-color: rgba(231,196,119,.65); background: linear-gradient(180deg, rgba(74,56,30,.95), rgba(38,28,14,.95)) !important; box-shadow: 0 6px 14px -6px rgba(0,0,0,.8), inset 0 1px 0 rgba(255,255,255,.12); }
.lk-stage:not(.lk-wide) .lk-panel [data-option][aria-checked="true"], .lk-stage:not(.lk-wide) .lk-panel [data-option]:active { background: linear-gradient(90deg, rgba(180,130,40,.98), rgba(120,84,22,.98)) !important; border-color: #fcd34d; }
.lk-stage:not(.lk-wide) .lk-panel [data-option]:disabled { opacity: .55; }
.lk-stage:not(.lk-wide) .lk-panel [data-option] > span:first-child { width: 34px !important; height: 34px !important; font-size: 16px !important; background: #efe2c2; color: #2a1d0c; border-color: #c9a45a; }
.lk-stage:not(.lk-wide) .lk-panel [data-option] > span:last-child { font-size: 16px !important; font-weight: 700; line-height: 1.3; color: #fff7e6; }
.lk-stage:not(.lk-wide) .lk-panel [data-submit] { width: 100%; justify-content: center; padding: .75rem 1rem; font-size: 14px !important; }
.lk-stage:not(.lk-wide) .lk-panel [data-clue-lines] li, .lk-stage:not(.lk-wide) .lk-panel [data-gate-clues] li { font-size: 14px !important; }
/* The title, clock, buttons and the treasure's words are in the bar above and the card below instead. */
.lk-stage:not(.lk-wide) .lk-scene [data-plaque], .lk-stage:not(.lk-wide) .lk-scene [data-top-icons], .lk-stage:not(.lk-wide) .lk-scene [data-hud-col], .lk-stage:not(.lk-wide) .lk-scene [data-treasure-words], .lk-stage:not(.lk-wide) .lk-scene [data-my-time] { display: none !important; }
/* The wide layout: the panel on the picture. */
.lk-stage.lk-wide { aspect-ratio: 2000 / 1140; }
.lk-wide .lk-scene { position: absolute; inset: 0; aspect-ratio: auto; }
.lk-wide .lk-panel { position: absolute; margin-top: 0; left: var(--l); top: var(--t); width: var(--w); height: var(--h); }
`;

/**
 * The vault's number panels: four columns of three, the last one missing.
 * Colours are set inline (light stone tiles, dark numbers, the missing one
 * glowing gold), so they read the same whatever styles have loaded.
 */
const Panels = ({ panels, small = false }) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: small ? 6 : '1cqw', height: '100%' }} data-panels>
        {panels.map((p, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-around', padding: small ? '6px 0' : '0.9cqw 0', borderRadius: 8, border: '2px solid #c9a45a', background: 'linear-gradient(#5a4730, #2a1f12)', boxShadow: 'inset 0 0 12px rgba(0,0,0,.65), 0 4px 12px rgba(0,0,0,.5)' }}>
                {p.map((v, k) => {
                    const gap = v === '?';
                    const size = small ? fs(24, 2.3, 40) : fs(34, 3.8, 72);
                    return (
                        <span key={k} style={{ width: size, height: size, transform: 'rotate(45deg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: small ? 3 : '0.45cqw', borderRadius: 4,
                            background: gap ? 'rgba(245,158,11,.25)' : 'linear-gradient(135deg, #f3e4bf, #cdb17a)', border: `2px solid ${gap ? '#fcd34d' : '#8a6a2f'}`, boxShadow: gap ? '0 0 16px rgba(251,191,36,.85)' : '0 2px 4px rgba(0,0,0,.45)' }}>
                            <span style={{ transform: 'rotate(-45deg)', ...serif, fontWeight: 800, color: gap ? '#fcd34d' : '#2a1d0c', fontSize: small ? fs(11, 1.15, 19) : fs(14, 1.9, 34), lineHeight: 1 }}>{v}</span>
                        </span>
                    );
                })}
            </div>
        ))}
    </div>
);

/** The final gate's five slots: tap one to take its symbol back. */
const Slots = ({ slots, onClear, big = false }) => slots.map((s, i) => (
    <button key={i} type="button" onClick={() => s && onClear(i)} aria-label={s ? `Slot ${i + 1}: ${SYMBOL_NAMES[s]}. Tap to clear` : `Slot ${i + 1}: empty`} data-slot={i}
        className={`flex aspect-square items-center justify-center rounded-full border-[3px] border-[#c9a45a] shadow-[inset_0_0_14px_rgba(0,0,0,.8)] ${s ? 'ring-2 ring-amber-300/70' : ''}`} style={{ background: 'linear-gradient(#3a2a17, #120c06)' }}>
        {s ? <span className="h-[62%] w-[62%]"><Symbol name={s} /></span> : <span className="font-bold text-[#c9a45a]" style={{ ...serif, fontSize: big ? fs(16, 3, 56) : 18 }}>?</span>}
    </button>
));

export default function KingdomTable({ view, onAction, busy }) {
    const me = view.me;
    const navigate = useNavigate();
    const over = view.status !== 'active';
    const { left, share } = usePhaseClock(view);
    const playing = view.phase === 'play' && !over;
    const cur = view.current;
    const stage = me?.stage ?? 0;

    useEffect(() => {
        if (document.getElementById('lk-font')) return;
        const l = document.createElement('link'); l.id = 'lk-font'; l.rel = 'stylesheet';
        l.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&display=swap';
        document.head.appendChild(l);
    }, []);

    // Sound: each trial its own music; nothing plays until a tap.
    const audio = useMemo(() => createAudio('kingdom-1'), []);
    const [prefs, setPrefs] = useState(() => audio.prefs());
    useEffect(() => { const off = audio.subscribe(setPrefs); return () => { off(); audio.dispose(); }; }, [audio]);
    useEffect(() => { audio.setIntensity(playing ? 1 - share : 0); }, [audio, playing, share]);

    // The picture on screen and what it is doing: idle, unlock, travel (on to the next), arrive, treasure.
    const [shown, setShown] = useState(() => Math.min(stage, 4));
    const [phase, setPhase] = useState(() => (me?.done ? 'treasure' : 'idle'));
    const timers = useRef([]);
    const later = (ms, f) => timers.current.push(setTimeout(f, ms));
    useEffect(() => () => timers.current.forEach(clearTimeout), []);
    // The answer being chosen (A–D), or the gate's symbols.
    // Nothing chosen to start with; a tap on an answer gives it at once.
    const [pick, setPick] = useState(null);
    const [tried, setTried] = useState([]);           // wrong answers on this trial, shown crossed out
    const [slots, setSlots] = useState([null, null, null, null, null]);
    const [discPos, setDiscPos] = useState(null);
    const [swapTiles, setSwapTiles] = useState(null);   // Puzzle 2's tiles, as swapped (null: as they start)
    const [swapSel, setSwapSel] = useState(null);       // the tile tapped first, waiting for its partner
    const [typed, setTyped] = useState('');             // Puzzle 3's missing number, as typed         // Puzzle 2's discs, as turned (null: as they start)
    const curIndex = cur?.index;
    const [pickedFor, setPickedFor] = useState(curIndex);
    if (pickedFor !== curIndex) { setPickedFor(curIndex); setPick(null); setTried([]); setSlots([null, null, null, null, null]); setDiscPos(null); setTyped(''); setSwapTiles(null); setSwapSel(null); }
    const seen = useRef({ stage, mistakes: me?.mistakes ?? 0 });
    const lastChoice = useRef(null);
    const [shake, setShake] = useState(0);
    const [toast, setToast] = useState(null);
    const [jammed, setJammed] = useState(false);
    useEffect(() => {
        if (!me) return;
        const was = seen.current;
        seen.current = { stage: me.stage, mistakes: me.mistakes };
        if (me.mistakes > was.mistakes) {
            const lc = lastChoice.current;
            if (lc && lc.stage === me.stage && lc.choice != null) later(0, () => { setTried((t) => (t.includes(lc.choice) ? t : [...t, lc.choice])); setPick(null); });
            later(0, () => { setShake((n) => n + 1); setJammed(true); setToast(`Wrong answer — ${view.penalty} seconds added. Try again.`); audio.sfx('wrong'); });
            later(view.jamMs || 2500, () => setJammed(false));
        }
        if (me.stage === was.stage + 1) {
            const from = was.stage;
            later(0, () => { setPhase('unlock'); audio.sfx('correct'); later(350, () => audio.sfx(UNLOCK_SFX[from])); });
            if (me.done) later(1500, () => { setPhase('treasure'); audio.sfx('victory'); });
            else {
                // Quick, as in The Final Vault (2026-11-05): a blur and "Moving to Puzzle n…", the next one up in under two seconds.
                later(700, () => { setPhase('travel'); [0, 300].forEach((t) => later(t, () => audio.sfx('step'))); });
                later(1300, () => { setShown(me.stage); setPhase('arrive'); });
                later(1900, () => setPhase('idle'));
            }
        } else if (me.stage !== was.stage) {
            later(0, () => { setShown(Math.min(me.stage, 4)); setPhase(me.done ? 'treasure' : 'idle'); });
        }
    }, [me, audio, view.penalty, view.jamMs]);
    useEffect(() => { if (!toast) return undefined; const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); }, [toast]);
    useEffect(() => { audio.setTheme(phase === 'treasure' ? 'kingdom-treasure' : THEMES[shown]); }, [audio, shown, phase]);
    const secondsLeft = Math.ceil(left / 1000);
    const alarmed = useRef(false);
    useEffect(() => {
        if (!playing || me?.done) return;
        if (secondsLeft <= 10 && secondsLeft > 0) audio.sfx('tick');
        if (share < 0.25 && !alarmed.current) { alarmed.current = true; audio.sfx('alarm'); }
    }, [secondsLeft, playing, share, audio, me?.done]);

    const arrange = cur?.kind === 'arrange';
    const discs = cur?.kind === 'discs';
    const tri = cur?.kind === 'triangle';
    const gridQ = cur?.kind === 'grid';
    const typedQ = tri || gridQ;      // a number typed in
    const swapQ = cur?.kind === 'swap';
    const tiles = swapQ ? (swapTiles || cur.data.start) : null;
    /** Tap a tile: the first is chosen, the second swaps with it (the same one again lets it go). */
    const tapTile = (i) => {
        if (!canAct) return;
        audio.start();
        if (swapSel == null) { setSwapSel(i); audio.sfx('click'); return; }
        if (swapSel !== i) { const t = [...tiles]; [t[swapSel], t[i]] = [t[i], t[swapSel]]; setSwapTiles(t); audio.sfx('dial'); }
        setSwapSel(null);
    };
    const discAt = discs ? (discPos || cur.data.start) : null;
    const discFaces = discs ? discAt.map((p, d) => cur.data.rings[d][p]) : null;
    const turnDisc = (d) => { if (!canAct) return; audio.sfx('gear'); setDiscPos(discAt.map((p, k) => (k === d ? (p + 1) % 4 : p))); };
    const n = cur?.options?.length || 0;
    const canAct = !!view.canPlay && !busy && !jammed && cur && shown === stage && (phase === 'idle' || phase === 'arrive');
    /** Give an answer (an option's number, or the gate's order). */
    const submit = (choice = swapQ ? tiles : discs ? discFaces : typedQ ? (typed === '' ? null : Number(typed)) : pick) => {
        if (!canAct) return;
        if (arrange ? slots.includes(null) : choice == null || (!discs && !typedQ && !swapQ && tried.includes(choice))) return;
        audio.start(); audio.sfx('click');
        lastChoice.current = { stage, choice: arrange || swapQ ? null : choice };
        setSwapSel(null);
        onAction({ type: 'solve', stage, value: arrange ? slots : choice }).catch((e) => setToast(e?.message || 'That did not go through.'));
    };
    /** Move the highlight (the stick, the arrow keys): any direction steps through the answers left. */
    const step = (d) => {
        if (arrange || !n) return;
        const open = [...Array(n).keys()].filter((i) => !tried.includes(i));
        if (!open.length) return;
        const at = open.indexOf(pick);
        const next = at < 0 ? (d > 0 ? 0 : open.length - 1) : (at + d + open.length) % open.length;
        setPick(open[next]);
        audio.sfx('click');
    };
    const place = (s) => { audio.sfx('dial'); setSlots((x) => { if (x.includes(s)) return x; const i = x.indexOf(null); if (i < 0) return x; const y = [...x]; y[i] = s; return y; }); };
    const unplace = (i) => { audio.sfx('dial'); setSlots((x) => x.map((v, k) => (k === i ? null : v))); };
    // The menus: Map, Clues (the journal), Inventory (relics), and the Menu (sound, leave).
    const [sheet, setSheet] = useState(null);
    // Keys: up / down move the highlight, 1–4 or A–D pick, Enter answers — not while a menu is open (2026-11-06).
    useEffect(() => {
        const onKey = (e) => {
            if (/input|textarea/i.test(e.target?.tagName) || !cur || sheet) return;
            const k = e.key.toLowerCase();
            if (!arrange && ['arrowup', 'arrowleft', 'w', 'a'].includes(k)) { step(-1); e.preventDefault(); }
            else if (!arrange && ['arrowdown', 'arrowright', 's', 'd'].includes(k)) { step(1); e.preventDefault(); }
            else if (!arrange && ['1', '2', '3', '4'].includes(k) && Number(k) <= n) submit(Number(k) - 1);
            else if (k === 'enter') { e.preventDefault(); submit(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    const journal = view.journal || [];
    const runLike = {
        done: !!me?.done,
        trials: view.titles.map((title, i) => ({ index: i, title, region: view.regions?.[i], solved: i < stage, clue: journal[i]?.clue || null, relic: journal[i]?.relic || null, explain: journal[i]?.explain || null }))
    };
    const menus = { onMap: () => setSheet('map'), onClues: () => setSheet('clues'), onInventory: () => setSheet('inventory'), onPause: () => setSheet('pause'), counts: { clues: journal.filter((j) => j.clue).length, relics: journal.length } };
    const [boardOpen, setBoardOpen] = useState(false);
    const standings = view.seats.map((s, i) => ({ s, i, p: view.players[i], score: view.scores[i] })).sort((a, b) => b.score - a.score || b.p.at - a.p.at);

    const L = LAYOUT[shown];
    const showPuzzle = playing && cur && !me?.done && shown === stage && (phase === 'idle' || phase === 'arrive');
    const cam = phase === 'travel' ? 'scale(1.8)' : L.design ? 'none' : 'scale(1.02)';
    const Icon = ICON[cur?.kind] || BookOpen;
    const gateClues = arrange ? [...cur.data.gateClues.map((c) => ({ c, from: 'gate' })), ...journal.filter((j) => j.clue).map((j) => ({ c: j.clue, from: 'journal' }))] : [];
    const myTime = me?.done ? view.times?.[view.you] : null;
    // Over without the treasure but first all the same (the others left): not a "Time up · You lost".
    const wonAnyway = over && view.outcome?.places?.[0]?.length === 1 && view.outcome.places[0][0] === view.seats[view.you]?.side;
    // The phone's view (useAdventureView): the wide layout sideways or turned a quarter, or the upright one.
    const { view: layout, onPhone, stacked: phone, wide, setUpright } = useAdventureView(over);
    const ASPECT = 2000 / 1140;
    const frame = (node) => (layout === 'rotated' ? <RotatedStage aspect={ASPECT}>{node}</RotatedStage>
        : layout === 'landscape' || layout === 'turn-upright' ? <LandscapeStage aspect={ASPECT}>{node}</LandscapeStage>
        : <PhoneStage on={layout === 'stacked'}>{node}</PhoneStage>);
    // On a phone the messages over the picture cover the whole screen instead: inside the picture they were too small to read.
    const layer = (node) => (phone && node ? <div className="pointer-events-none fixed inset-0 z-[140]">{node}</div> : node);

    const panel = cur && (
        <div className={`flex h-full flex-col gap-2 overflow-y-auto rounded-xl p-3 sm:p-4 ${darkPanel} ${shake && jammed ? '[animation:lk-shake_.45s_ease]' : ''}`} data-trial-panel={cur.index}>
            <div className="flex gap-2.5">
                <span className="mt-0.5 flex shrink-0 items-center justify-center rounded-full border border-[#c9a45a]/60 bg-[#efe2c2] text-[#3a2a12]" style={{ width: fs(26, 2.6, 44), height: fs(26, 2.6, 44) }}><Icon style={{ width: '58%', height: '58%' }} /></span>
                <div className="min-w-0" style={{ ...serif, fontSize: fs(12, 1.2, 21) }}>
                    {cur.category && <p className="mb-0.5 text-[0.7em] font-bold uppercase tracking-wider text-[#c9a45a]">{cur.category}</p>}
                    {cur.data?.lines ? (<>
                        <ul className="space-y-1" style={{ fontSize: fs(10, 1, 17) }} data-clue-lines>{cur.data.lines.map((l) => <li key={l} className="rounded bg-black/30 px-2 py-1 leading-snug">• {l}</li>)}</ul>
                        <p className="mt-1.5 font-bold leading-snug">{cur.data.question}</p>
                    </>)
                        : <p className="leading-snug" data-prompt>{cur.prompt}</p>}
                </div>
            </div>
            {cur.kind === 'panels' && <div className="@min-[560px]:hidden"><Panels panels={cur.data.panels} small /></div>}
            {cur.kind === 'bridges' && (
                <ul className="space-y-1 @min-[560px]:hidden">{cur.data.bridges.map((b) => <li key={b.label} className="rounded-md bg-black/40 px-2 py-1 text-sm" style={serif}>Bridge {b.label}: {b.terms.join(', ')}</li>)}</ul>
            )}
            {swapQ ? (
                <div className="flex flex-col items-center gap-2 py-1" data-swap-board>
                    <div className="grid w-full max-w-[19rem] grid-cols-3 gap-1.5 rounded-xl border-2 border-[#c9a45a]/70 bg-[#2a1d0f] p-1.5 shadow-[0_0_18px_rgba(255,170,60,.35)]">
                        {tiles.map((t, i) => (
                            <button key={i} type="button" onClick={() => tapTile(i)} disabled={!canAct} aria-pressed={swapSel === i} aria-label={`Tile ${i + 1}: ${t}${swapSel === i ? ', chosen' : ''}`}
                                className={`overflow-hidden rounded-lg transition-[transform,box-shadow] duration-150 disabled:cursor-not-allowed ${swapSel === i ? 'scale-[1.05] shadow-[0_0_0_3px_#ffd166,0_0_16px_rgba(255,190,60,.95)]' : ''}`}
                                style={{ aspectRatio: `${L.swap ? L.swap.cell.w * 2000 : 1} / ${L.swap ? L.swap.cell.h * 1140 : 1}` }} data-swap-card-tile={i}>
                                <span key={t} className="block h-full w-full [animation:lk-pop_.28s_ease-out_both]">{L.swap ? <SwapTile g={L.swap} art={L.img} symbol={t} /> : t}</span>
                            </button>
                        ))}
                    </div>
                    <p className="text-center text-[#e7c477]" style={{ ...serif, fontSize: fs(12, 1.1, 18) }}>Click tiles to swap them.</p>
                </div>
            ) : gridQ ? (
                <div className="mx-auto grid w-fit grid-cols-3 gap-1.5 py-1" data-grid-cells>
                    {cur.data.cells.map((v, k) => (v == null
                        ? <input key={k} value={typed} onChange={(e) => setTyped(e.target.value.replace(/\D/g, '').slice(0, 3))} inputMode="numeric" onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} aria-label="The missing number" placeholder="?"
                            className="h-14 w-14 rounded-lg border-2 border-amber-300 bg-amber-500/25 text-center text-xl font-black text-amber-200 placeholder:text-amber-300 focus:outline-none" style={serif} />
                        : <span key={k} className="flex h-14 w-14 items-center justify-center rounded-lg border-2 border-[#8a6a2f] bg-[#efe2c2] text-xl font-black text-[#2a1d0c]" style={serif}>{v}</span>))}
                </div>
            ) : tri ? (
                <div className="flex flex-col items-center gap-1.5 py-1" data-triangle-rows>
                    {cur.data.rows.map((row, r) => (
                        <div key={r} className="flex gap-2">
                            {row.map((v, k) => (v == null
                                ? <input key={k} value={typed} onChange={(e) => setTyped(e.target.value.replace(/\D/g, '').slice(0, 2))} inputMode="numeric" onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} aria-label="The missing number" placeholder="?"
                                    className="h-12 w-12 rounded-full border-2 border-amber-300 bg-amber-500/20 text-center text-xl font-black text-amber-200 placeholder:text-amber-300 focus:outline-none" style={serif} />
                                : <span key={k} className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#c9a45a] bg-[#efe2c2] text-xl font-black text-[#2a1d0c]" style={serif}>{v}</span>))}
                        </div>
                    ))}
                </div>
            ) : discs ? (
                <ul className="space-y-1.5" data-disc-lines>
                    {cur.data.lines.map((l) => <li key={l} className="flex gap-2 rounded-md bg-black/30 px-2 py-1.5" style={{ ...serif, fontSize: fs(11, 1.1, 18) }}><span className="text-amber-400">◆</span>{l}</li>)}
                    <li className="pt-1 text-center text-[#e7c477]" style={{ ...serif, fontSize: fs(11, 1.05, 17) }}>Tap a disc to turn it.</li>
                </ul>
            ) : arrange ? (
                <div className={wide ? 'grid min-h-0 flex-1 grid-cols-[1.5fr_1fr] gap-2' : 'contents'}>
                    <ol className={`space-y-1 ${wide ? 'min-h-0 overflow-y-auto pr-1' : ''}`} data-gate-clues>
                        {gateClues.map(({ c, from }, i) => (
                            <li key={c} className="flex items-start gap-2 rounded-md border border-[#c9a45a]/25 bg-black/30 px-2 py-1.5" style={{ ...serif, fontSize: fs(11, 1.05, 18) }}>
                                <span className="flex shrink-0 items-center justify-center rounded-full border border-[#c9a45a] text-[#e7c477]" style={{ width: fs(20, 2, 32), height: fs(20, 2, 32) }}>{i + 1}</span>
                                <span>{c}{from === 'journal' && <span className="ml-1 text-[0.8em] text-[#c9a45a]">(your journal)</span>}</span>
                            </li>
                        ))}
                    </ol>
                    <div className="grid grid-cols-5 gap-1 rounded-md border border-[#c9a45a]/40 bg-black/30 p-1" data-symbol-tray>
                        {cur.data.symbols.map((s) => (
                            <button key={s} type="button" onClick={() => place(s)} disabled={slots.includes(s)} className="flex flex-col items-center rounded p-1 hover:bg-white/10 disabled:opacity-30" data-symbol={s}>
                                <span style={{ width: fs(26, 3, 50), height: fs(26, 3, 50) }}><Symbol name={s} /></span>
                                <span style={{ ...serif, fontSize: fs(9, 0.95, 16) }}>{SYMBOL_NAMES[s]}</span>
                            </button>
                        ))}
                    </div>
                    <div className="grid grid-cols-5 gap-1.5 @min-[560px]:hidden"><Slots slots={slots} onClear={unplace} /></div>
                </div>
            ) : (
                <ol className="space-y-1.5" role="radiogroup" aria-label="Answers" data-options>
                    {cur.options.map((o, i) => (
                        <li key={o}>
                            <button type="button" onClick={() => { setPick(i); submit(i); }} onMouseEnter={() => !tried.includes(i) && setPick(i)} disabled={!canAct || tried.includes(i)} data-option={i} role="radio" aria-checked={pick === i} aria-label={`Answer ${LETTERS[i]}: ${o}`}
                                className={`flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-1.5 text-left transition disabled:cursor-not-allowed ${tried.includes(i) ? 'border-rose-500/50 opacity-50 line-through' : pick === i ? 'border-amber-300 shadow-[0_0_14px_rgba(251,191,36,.45)]' : 'border-[#c9a45a]/35 hover:border-[#c9a45a]/70'}`}
                                style={{ background: tried.includes(i) ? 'rgba(127,29,29,.5)' : pick === i ? 'linear-gradient(90deg, rgba(138,100,32,.92), rgba(90,63,18,.92))' : 'rgba(0,0,0,.45)', color: '#f3e6c8' }}>
                                <span className="flex shrink-0 items-center justify-center rounded-full border border-[#e9d3a0]/70 font-bold" style={{ ...serif, width: fs(24, 2.3, 40), height: fs(24, 2.3, 40), fontSize: fs(11, 1.15, 19) }}>{LETTERS[i]}</span>
                                <span style={{ ...serif, fontSize: fs(12, 1.25, 22) }}>{o}</span>
                            </button>
                        </li>
                    ))}
                </ol>
            )}
            <div className="mt-auto flex items-center gap-2 pt-1">
                <button type="button" onClick={() => submit()} disabled={!canAct || (arrange ? slots.includes(null) : typedQ ? typed === '' : !discs && !swapQ && pick == null)} className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-[#f4d27a] px-4 py-1.5 font-black uppercase tracking-wide text-white shadow-lg disabled:opacity-50" style={{ background: 'linear-gradient(#e0ab48, #93631a)', fontSize: fs(11, 1.05, 17) }} data-submit>
                    {busy ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />} {arrange ? 'Unlock the gate' : discs || typedQ || swapQ ? 'Submit' : 'Choose highlighted'}
                </button>
            </div>
        </div>
    );

    return (
        <>
        {frame(
        <div className={`mx-auto w-full max-w-[1500px] ${onPhone && wide ? '' : 'space-y-4'}`} data-kingdom data-phase={view.phase} data-trial={shown} onPointerDown={() => { if (!prefs.started) audio.start(); }}>
            <style>{CSS}</style>
            {/* On a phone: the title, the clock and the buttons, full size, above the picture. */}
            <section className={`rounded-2xl p-3 ${wide ? 'hidden' : ''} ${darkPanel}`} data-kingdom-hud>
                <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-lg font-bold leading-tight text-[#e7c477]" style={serif}>The Lost Kingdom</p>
                        <p className="truncate text-xs font-bold text-[#f3e6c8]" style={serif}>{phase === 'treasure' ? 'Treasure of Aurelia' : `Trial ${shown + 1}: ${view.titles[shown]}`}</p>
                    </div>
                    {(playing || view.phase === 'ready') && (
                        <div className="flex shrink-0 flex-col items-end gap-1">
                            <span className={`flex items-center gap-1.5 rounded-full border border-[#c9a45a]/70 bg-black/40 px-3 py-1 text-xl font-black tabular-nums ${playing && share < 0.25 ? 'animate-pulse border-rose-500 text-rose-300' : ''}`}>
                                <Hourglass size={18} className="text-[#e7c477]" />{view.phase === 'ready' ? `0:0${Math.max(1, secondsLeft)}` : fmt(left)}
                            </span>
                            {me?.penaltyMs > 0 && <span className="rounded-full bg-rose-700/90 px-2 text-[11px] font-black text-white">+{Math.round(me.penaltyMs / 1000)}s penalty</span>}
                        </div>
                    )}
                </div>
                {phase !== 'treasure' && <TopIcons style={{ position: 'relative', marginTop: 10, justifyContent: 'space-between' }} {...menus} />}
            </section>
            {/* Over, on a phone, the picture is left out: its cut-outs would show with nothing in them. */}
            {!(over && phone) && (
            <div className={`lk-stage ${wide ? 'lk-wide' : ''} ${wide && !onPhone ? 'lk-fit' : ''}`}>
                <div className="lk-scene" data-scene>
                    {/* The picture: this trial's, or the treasure chamber. */}
                    <div className="absolute inset-0" style={{ transform: cam, transformOrigin: `${L.hotspot.x}% ${L.hotspot.y}%`, transition: phase === 'travel' ? 'transform 1.3s cubic-bezier(.55,0,.8,.4), filter 1.3s' : 'transform .9s ease', filter: phase === 'travel' ? 'brightness(1.35) blur(1.5px)' : 'none' }}>
                        <div key={phase === 'treasure' ? 'treasure' : shown} className="absolute inset-0" style={{ animation: phase === 'arrive' || phase === 'treasure' ? 'lk-arrive 1s ease-out both' : L.design ? 'none' : 'lk-breathe 18s ease-in-out infinite alternate' }}>
                            {phase === 'treasure' ? <ChamberPhoto src={TREASURE.img} holes={TREASURE.holes} id="lk-t" />
                                : L.fit ? <img src={L.img} alt="" className="absolute inset-0 h-full w-full select-none" draggable="false" />
                                : <ChamberPhoto src={L.img} holes={L.holes} id={`lk${shown}`} />}
                        </div>
                    </div>
                    {phase === 'unlock' && <span className="pointer-events-none absolute rounded-full" style={{ left: `${L.hotspot.x}%`, top: `${L.hotspot.y}%`, width: '24cqw', height: '24cqw', background: 'radial-gradient(circle, rgba(255,230,150,.95), rgba(255,170,40,.5) 40%, transparent 70%)', animation: 'lk-burst 1.4s ease-out both' }} aria-hidden="true" />}
                    {phase === 'travel' && <div className="pointer-events-none absolute inset-0 bg-[#1a0f02] transition-opacity delay-700 duration-500" style={{ opacity: 0.85 }} aria-hidden="true" />}
                    {shake > 0 && <div key={shake} className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,transparent_40%,rgba(185,28,28,.6))]" style={{ animation: 'lk-flash .9s ease-out both' }} aria-hidden="true" />}

                    {/* ── Trial 1, as the approved design: the live HUD exactly where its picture draws it ── */}
                    {L.design && phase !== 'treasure' && <DesignHud d={L.d} view={view} me={me} stage={stage} shown={shown} playing={playing} share={share} left={left} secondsLeft={secondsLeft} standings={standings} menus={menus} cur={showPuzzle ? cur : null} />}
                    {/* ── The HUD, where the pictures have it ── */}
                    {(!L.design || phase === 'treasure') && (phase === 'treasure'
                        ? <TitlePlaque line="Treasure of Aurelia" style={{ left: '2%', top: '3%', width: '25%' }} />
                        : <TitlePlaque line={`Trial ${shown + 1} : ${view.titles[shown]}`} style={{ ...box(L.plaque), minWidth: 'min(50%, 180px)' }} />)}
                    {!L.design && phase !== 'treasure' && <TopIcons style={{ right: `${L.icons.r}%`, top: `${L.icons.t}%` }} {...menus} />}
                    {/* The clock and the race, under the buttons. */}
                    {!L.design && (
                    <div className="absolute z-30 flex flex-col items-end gap-1.5" data-hud-col style={{ right: `${L.icons.r}%`, top: phase === 'treasure' ? '3%' : `calc(${L.icons.t}% + clamp(40px, 7.4cqw, 160px))` }}>
                        {(playing || view.phase === 'ready') && (
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-black tabular-nums ${playing && share < 0.25 ? 'animate-pulse bg-rose-700/90 text-white' : darkPanel}`} style={{ fontSize: fs(12, 1.6, 30) }} data-timer>
                                <Hourglass style={{ width: '1em', height: '1em' }} className="text-[#e7c477]" /> {view.phase === 'ready' ? `0:0${Math.max(1, secondsLeft)}` : fmt(left)}
                            </span>
                        )}
                        {me?.penaltyMs > 0 && <span className="rounded-full bg-rose-800/90 px-2.5 py-0.5 text-xs font-black text-white" data-penalty>+{Math.round(me.penaltyMs / 1000)}s penalty</span>}
                        <div className={`hidden overflow-hidden rounded-xl @min-[560px]:block ${darkPanel}`} style={{ width: 'clamp(170px, 17cqw, 300px)' }} data-race>
                            <button type="button" onClick={() => setBoardOpen((v) => !v)} className="flex w-full items-center justify-between px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#e7c477]" aria-expanded={boardOpen} style={serif}>
                                <span className="inline-flex items-center gap-1.5"><Trophy size={13} /> Explorers</span>{boardOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                            {boardOpen && (
                                <ol className="space-y-0.5 px-2 pb-2">{standings.map(({ s, i, p, score }, rank) => (
                                    <li key={i} className={`flex items-center gap-2 rounded-md px-1.5 py-1 text-xs ${view.you === i ? 'bg-amber-400/15' : ''} ${p.left ? 'opacity-45' : ''}`} data-racer={i}>
                                        <span className="w-3 font-black text-[#c9a45a]">{rank + 1}</span>
                                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                                        <span className="min-w-0 flex-1 truncate font-bold">{view.you === i ? 'You' : s.name}</span>
                                        <span className="text-[#c9b48a]">{p.done ? '💰' : `${p.at}/${p.of}`}</span>
                                        <span className="w-10 text-right font-black tabular-nums">{score}</span>
                                    </li>
                                ))}</ol>
                            )}
                        </div>
                    </div>
                    )}

                    {/* Puzzle 2: the live discs and their turn buttons, on the picture in either layout. */}
                    {/* Moves with the picture's arrival zoom, so the numbers stay locked on its circles/tiles instead of
                        sitting still while the picture settles under them. */}
                    {showPuzzle && ((L.grid && gridQ) || (L.triangle && tri) || (L.discs && discs) || (L.swap && swapQ) || (L.gate && arrange)) && (
                    <div key={`live${shown}`} className="pointer-events-none absolute inset-0 z-20 [&>*]:pointer-events-auto" style={{ animation: phase === 'arrive' ? 'lk-arrive 1s ease-out both' : 'none' }}>
                    {L.grid && gridQ && <GridLive g={L.grid} art={L.img} cells={cur.data.cells} typed={typed} onType={setTyped} wide={wide} canAct={canAct} busy={busy} shake={shake && jammed} onSubmit={() => submit()} />}
                    {L.triangle && tri && <TriangleLive g={L.triangle} art={L.img} rows={cur.data.rows} typed={typed} onType={setTyped} wide={wide} canAct={canAct} busy={busy} shake={shake && jammed} onSubmit={() => submit()} />}
                    {L.swap && swapQ && <SwapLive g={L.swap} art={L.img} tiles={tiles} sel={swapSel} onTap={tapTile} canAct={canAct} busy={busy} shake={shake && jammed} onSubmit={() => submit()} />}
                    {L.gate && arrange && <GateLive g={L.gate} art={L.img} clues={gateClues} symbols={cur.data.symbols} names={SYMBOL_NAMES} slots={slots} onPlace={place} onClear={unplace} canAct={canAct} busy={busy} shake={shake && jammed} onSubmit={() => submit()} />}
                    {L.discs && discs && <DiscsLive g={L.discs} faces={discFaces} onTurn={turnDisc} canAct={canAct} />}
                    </div>
                    )}
                    {/* The bridge signs (Trial 1), the vault's panels (Trial 4), the gate's slots (Trial 5). */}
                    {showPuzzle && !L.design && L.signs && cur.data?.bridges && L.signs.map((sg, i) => (
                        <div key={i} className="absolute z-20 hidden items-center justify-center rounded-md font-bold shadow-lg @min-[560px]:flex" style={{ ...box(sg), ...serif, fontSize: fs(9, 1.25, 22), color: '#f6e7c1', background: 'linear-gradient(#3d3427, #211a12)', border: `2px solid ${cur.data.ask === i ? '#f4c55a' : '#5a4a32'}`, boxShadow: cur.data.ask === i ? '0 0 16px rgba(244,197,90,.7)' : undefined }} data-sign={i}>
                            {cur.data.bridges[i].terms.join(', ')}
                        </div>
                    ))}
                    {showPuzzle && L.wall && cur.kind === 'panels' && <div className="absolute z-20 hidden @min-[560px]:block" style={box(L.wall)}><Panels panels={cur.data.panels} /></div>}
                    {showPuzzle && L.slots && arrange && <div className="absolute z-20 hidden grid-cols-5 gap-[0.8cqw] @min-[560px]:grid" style={box(L.slots)}><Slots slots={slots} onClear={unplace} big /></div>}
                    {showPuzzle && !L.design && (
                        <div className="hidden @min-[560px]:block">
                            {/* The stick steps the highlight through the answers (up / left back, down / right on); an answer is given by clicking it (no Interact button, asked 2026-10-28). */}
                            <Stick style={{ left: `${L.stick.l}%`, top: `${L.stick.t}%` }} onFlick={(d) => step(d === 'up' || d === 'left' ? -1 : 1)} />
                        </div>
                    )}

                    {/* Time up without finding the treasure — the clock at zero, or the match over: the same "Time up · You lost"
                        picture as The Final Vault, over the whole scene, for those players only (2026-11-05). */}
                    {me && !me.done && !wonAnyway && (over || (view.phase === 'play' && left <= 0)) && (
                        <div className="absolute inset-0 z-[60] overflow-hidden bg-black" style={{ animation: 'lk-arrive .8s ease-out both' }} data-time-up>
                            <img src={`${import.meta.env.BASE_URL || '/'}games/lostkingdom/timeup.jpg`} alt="Time up. You lost." className="absolute inset-0 h-full w-full object-cover" />
                        </div>
                    )}
                    {/* Between puzzles: the picture blurred and a word on what comes next, until the next one is up. */}
                    {(phase === 'unlock' || phase === 'travel') && !me?.done && (
                        <div className="absolute inset-0 z-[45] flex flex-col items-center justify-center bg-black/45 text-center backdrop-blur-md" role="status" aria-live="polite" data-moving-on>
                            <p className="font-bold text-[#7ee2a8] [text-shadow:0_2px_10px_rgba(0,0,0,.8)]" style={{ ...serif, fontSize: fs(16, 2.4, 44) }}>Correct!</p>
                            <p className="mt-[0.6cqw] font-bold text-[#ffe9a8] [text-shadow:0_2px_10px_rgba(0,0,0,.8)]" style={{ ...serif, fontSize: fs(13, 1.8, 34) }}>Moving to Puzzle {stage + 1}…</p>
                            <span className="mt-[1.2cqw] h-[0.35cqw] min-h-1 w-[18cqw] overflow-hidden rounded-full bg-white/15"><span className="block h-full w-1/2 animate-pulse rounded-full bg-[#f4c55a]" /></span>
                        </div>
                    )}
                    {/* The briefing, while the countdown runs. */}
                    {layer(view.phase === 'ready' && !over && (
                        <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-black/65 p-4" data-briefing>
                            <div className="max-w-lg text-center text-[#f3e6c8]">
                                <h2 className="font-bold text-[#e7c477]" style={{ ...serif, fontSize: fs(22, 3.4, 56) }}>The Lost Kingdom</h2>
                                <p className="mt-2" style={{ fontSize: fs(13, 1.3, 20) }}>An old map leads to the lost kingdom of Aurelia. Pass its five trials — numbers, knowledge and logic — and collect the clues for the final gate. Everyone gets the same trials; the first to reach the treasure wins. A wrong answer adds {view.penalty} seconds.</p>
                                <p className="mt-3 font-black tabular-nums" style={{ ...serif, fontSize: fs(30, 5, 80) }}>{Math.max(1, secondsLeft)}</p>
                                {!prefs.started && <button type="button" onClick={() => audio.start()} className="mt-3 rounded-full border border-[#f4d27a] px-6 py-2.5 font-black uppercase text-white" style={{ background: 'linear-gradient(#e0ab48, #93631a)' }}>🔊 Start with sound</button>}
                            </div>
                        </div>
                    ))}
                    {layer(toast && <div className="pointer-events-none absolute inset-x-0 top-[42%] z-40 flex justify-center px-4"><p className="rounded-2xl bg-rose-800/90 px-4 py-2.5 text-center font-black text-white shadow-xl" style={{ fontSize: fs(12, 1.2, 20) }} data-toast>{toast}</p></div>)}

                    {/* The treasure: gold falling, the old explorer's words. */}
                    {phase === 'treasure' && (
                        <>
                            {Array.from({ length: 36 }, (_, i) => <span key={i} className="pointer-events-none absolute top-0 z-20 rounded-full shadow-[0_0_6px_#ffd166]" style={{ left: `${(i * 23) % 100}%`, width: `${0.6 + (i % 3) * 0.3}cqw`, height: `${0.6 + (i % 3) * 0.3}cqw`, background: 'linear-gradient(#fff1b8, #d99a1e)', animation: `lk-fall ${2.6 + (i % 5) * 0.5}s linear ${(i % 9) * 0.3}s infinite` }} />)}
                            <div className="absolute z-30 flex flex-col justify-center rounded-md bg-black/80 p-[1cqw] text-[#f3e6c8]" style={{ left: '11.5%', top: '79.5%', width: '20%', height: '16.5%', ...serif, fontSize: fs(9, 1.1, 19) }} data-treasure-words>
                                “You did it! The five trials have been conquered. The treasure of Aurelia is yours, but its knowledge must live on.”
                            </div>
                            {myTime != null && <p data-my-time className="absolute bottom-[4%] right-[3%] z-30 rounded-full bg-black/70 px-4 py-2 font-bold text-amber-200" style={{ fontSize: fs(11, 1.3, 22) }}>Your time {fmt(myTime)}{me.penaltyMs ? ` (with +${Math.round(me.penaltyMs / 1000)}s)` : ''}</p>}
                        </>
                    )}
                    {/* Finished, the others still playing: everything stops here until the time is up, then the results. */}
                    {layer(me?.done && !over && (
                        <div className="pointer-events-auto absolute inset-0 z-50 flex items-end justify-center pb-[5%]" data-waiting>
                            <p className="rounded-2xl bg-black/80 px-5 py-3 text-center font-black text-[#ffe9a8] shadow-xl" style={{ fontSize: fs(12, 1.4, 24) }}>
                                Waiting for the others to finish…<span className="block text-white/80" style={{ fontSize: fs(10, 1, 18) }}>Results in {fmt(left)}</span>
                            </p>
                        </div>
                    ))}
                    {!prefs.started && playing && <button type="button" onClick={() => audio.start()} className="absolute bottom-3 left-1/2 z-40 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-black text-slate-900 shadow">🔊 Tap for sound</button>}
                </div>
                {/* The question, where the picture has its panel (under the picture on a phone). */}
                {showPuzzle && ((tri && L.triangle) || (gridQ && L.grid) || (swapQ && L.swap) || (arrange && L.gate)) && wide ? null
                    : showPuzzle && discs && !wide ? <div className="mt-3"><DiscsCard lines={cur.data.lines} canAct={canAct} busy={busy} shake={shake && jammed} onSubmit={() => submit()} /></div>
                    : showPuzzle && L.discs && discs && wide ? <DiscsPanel g={L.discs} lines={cur.data.lines} canAct={canAct} busy={busy} shake={shake && jammed} onSubmit={() => submit()} />
                    : showPuzzle && (L.design && wide && cur.kind === 'bridges'
                    ? <PathPanel box={L.panel} cur={cur} pick={pick} tried={tried} canAct={canAct} busy={busy} shake={shake && jammed} onPick={(i) => { setPick(i); audio.sfx('click'); }} onSubmit={() => submit()} />
                    : <section className="lk-panel" style={at(L.panel)}>{panel}</section>)}
            </div>
            )}

            {/* Over, on an upright phone (the picture left out): how it ended, on the treasure chamber (2026-11-05). */}
            {over && phone && me && (
                !me.done ? (wonAnyway ? null :
                    <section className="relative -mx-2 overflow-hidden rounded-2xl bg-black shadow-2xl" style={{ aspectRatio: '4 / 3' }} data-end-card="lost">
                        <img src={`${import.meta.env.BASE_URL || '/'}games/lostkingdom/timeup.jpg`} alt="Time up. You lost." className="absolute inset-0 h-full w-full object-cover" />
                    </section>
                ) :
                <section className="relative overflow-hidden rounded-2xl bg-black shadow-2xl" style={{ aspectRatio: '4 / 3' }} data-end-card={me.done ? 'won' : 'lost'}>
                    <img src={TREASURE.img} alt="" className={`absolute inset-0 h-full w-full object-cover ${me.done ? '' : 'brightness-[.45] grayscale-[.4]'}`} />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-4 text-center">
                        <p className={`font-bold ${me.done ? 'text-[#ffe9a8]' : 'text-rose-200'}`} style={{ ...serif, fontSize: 'clamp(20px, 6vw, 30px)' }}>{me.done ? 'Treasure found!' : 'Time up!'}</p>
                        <p className="mt-1 text-sm text-white/85">{me.done ? 'You conquered all five trials of the Lost Kingdom.' : 'The treasure of Aurelia stays hidden this time.'}</p>
                        {me.done && myTime != null && <p className="mt-1.5 font-black text-amber-200">Your time {fmt(myTime)}{me.penaltyMs ? ` (with +${Math.round(me.penaltyMs / 1000)}s)` : ''}</p>}
                    </div>
                </section>
            )}
            {/* On a phone: the explorer's words and your time, under the treasure. */}
            {phase === 'treasure' && !over && (
                <section className={`rounded-2xl p-4 text-center ${wide ? 'hidden' : ''} ${darkPanel}`} data-treasure-card>
                    <p className="text-base leading-relaxed" style={serif}>“You did it! The five trials have been conquered. The treasure of Aurelia is yours, but its knowledge must live on.”</p>
                    {myTime != null && <p className="mt-3 text-lg font-black text-amber-200">Your time {fmt(myTime)}{me.penaltyMs ? ` (with +${Math.round(me.penaltyMs / 1000)}s)` : ''}</p>}
                </section>
            )}

            {/* On a phone: the race, under the picture. */}
            <section className={`rounded-2xl p-3 ${wide ? 'hidden' : ''} ${darkPanel}`} aria-label="Standings">
                {standings.map(({ s, i, p, score }, rank) => (
                    <div key={i} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${view.you === i ? 'bg-amber-400/15' : ''}`}>
                        <span className="w-4 text-xs font-black">{rank + 1}</span><span className="h-3 w-3 rounded-full" style={{ background: s.color }} />
                        <span className="min-w-0 flex-1 truncate font-bold">{view.you === i ? 'You' : s.name}</span>
                        <span className="text-[11px]">{p.done ? '💰' : `${p.at}/${p.of}`}</span><span className="w-12 text-right font-black tabular-nums">{score}</span>
                    </div>
                ))}
            </section>

            {over && view.review && (
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" data-review>
                    <h3 className="text-base font-black text-slate-900">The trials, explained</h3>
                    <ol className="mt-3 grid gap-2 sm:grid-cols-2">
                        {view.review.map((r, i) => (
                            <li key={i} className="rounded-xl bg-slate-50 p-3 text-sm">
                                <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Trial {i + 1} · {r.title}</p>
                                <p className="mt-1 text-slate-800"><CheckCircle2 size={14} className="mr-1 inline text-emerald-600" />{r.explain}</p>
                                {r.source && <p className="mt-0.5 text-[11px] text-slate-400">Source: {r.source}</p>}
                            </li>
                        ))}
                    </ol>
                </section>
            )}

            {sheet === 'map' && <MapSheet run={runLike} at={me?.done ? 5 : stage} onClose={() => setSheet(null)} />}
            {sheet === 'clues' && <CluesSheet run={runLike} onClose={() => setSheet(null)} />}
            {sheet === 'inventory' && <InventorySheet run={runLike} onClose={() => setSheet(null)} />}
            {sheet === 'pause' && (
                <PauseSheet title="Menu" note="The race keeps going while this is open — everyone shares one clock." prefs={prefs} audio={audio} onResume={() => setSheet(null)}
                    exitLabel={me?.done || me?.failed ? 'Back to Group games' : 'Leave the game'}
                    onExit={() => {
                        setSheet(null);
                        // Run already over (2026-11-06): no ask and no resign — that would throw away a finished result.
                        if (me?.done || me?.failed) { navigate('/games?mode=group'); return; }
                        if (window.confirm('Leave the game? You will lose, and the others play on.')) onAction({ type: 'resign' }).catch(() => {});
                    }} />
            )}
        </div>
        )}
        {layout === 'turn-upright' && <RotatePrompt to="portrait" onCancel={() => setUpright(false)} />}
        </>
    );
}
