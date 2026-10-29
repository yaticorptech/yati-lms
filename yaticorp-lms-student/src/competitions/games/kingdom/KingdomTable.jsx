import { useEffect, useMemo, useRef, useState } from 'react';
import { Hourglass, KeyRound, Loader2, Brain, BookOpen, Sigma, Trophy, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import usePhaseClock from '../usePhaseClock';
import createAudio from '../adventure/audio';
import ChamberPhoto from '../vault/ChamberPhoto';
import { at } from '../vault/style';
import { TitlePlaque, TopIcons, Stick, Symbol, MapSheet, CluesSheet, InventorySheet, PauseSheet } from './parts';
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
const LAYOUT = [
    {
        img: P(1), holes: [[1.8, 2.3, 24, 12.5], [2.4, 16.5, 23.5, 39.5], [77, 1.8, 22.5, 11.8], [5, 65, 14.5, 25.5], [85, 71.5, 12.5, 21], [32, 29.5, 13.6, 6.6], [55.2, 29.5, 13.4, 6.6], [80, 29.5, 13.6, 6.6]],
        plaque: { l: 2.2, t: 2.6, w: 23 }, panel: { l: 2.6, t: 17, w: 22.5, h: 38.5 }, icons: { r: 1.2, t: 2.4 }, stick: { l: 5.6, t: 66 }, action: { l: 86, t: 72.5 },
        signs: [{ l: 32.3, t: 30, w: 13, h: 5.6 }, { l: 55.5, t: 30, w: 12.8, h: 5.6 }, { l: 80.3, t: 30, w: 13, h: 5.6 }], hotspot: { x: 62, y: 45 }
    },
    { img: P(2), holes: [[1.8, 2.3, 25.5, 11.8], [2.3, 16.8, 24.8, 43], [77, 1.6, 22.5, 11.8], [5, 64.5, 14.5, 25.5], [85.5, 72.5, 12, 20]], plaque: { l: 2.2, t: 2.6, w: 24.5 }, panel: { l: 2.8, t: 17.5, w: 23.8, h: 41.5 }, icons: { r: 1.2, t: 2.2 }, stick: { l: 5.6, t: 65.5 }, action: { l: 86.2, t: 73.5 }, hotspot: { x: 57, y: 45 } },
    { img: P(3), holes: [[1.8, 2.3, 25.5, 11.8], [2.4, 17, 25.8, 45], [77, 1.8, 22.5, 11.8], [5, 65, 14.5, 25.5], [86, 73.5, 12, 20]], plaque: { l: 2.2, t: 2.6, w: 24.5 }, panel: { l: 2.8, t: 17.5, w: 25, h: 43.5 }, icons: { r: 1.2, t: 2.4 }, stick: { l: 5.6, t: 66 }, action: { l: 86.6, t: 74.5 }, hotspot: { x: 62, y: 30 } },
    {
        img: P(4), holes: [[2.3, 2.8, 25.5, 12.5], [2.8, 16.5, 25.8, 57.5], [78, 2.2, 21.5, 12], [5, 73.5, 13.5, 22], [86.5, 74.5, 12, 21], [43.5, 20, 26.6, 34]],
        plaque: { l: 2.8, t: 3.2, w: 24.5 }, panel: { l: 3.2, t: 17, w: 25, h: 56.5 }, icons: { r: 0.8, t: 2.8 }, stick: { l: 5.6, t: 74.5 }, action: { l: 87, t: 75.5 },
        wall: { l: 44, t: 20.5, w: 25.6, h: 33 }, hotspot: { x: 57, y: 37 }
    },
    {
        img: P(5), holes: [[2.3, 2.3, 25.5, 11.5], [2.8, 15.2, 28, 54.5], [77.5, 1.4, 21.5, 11.8], [5, 71.5, 13.5, 23], [85.5, 72.5, 12, 20], [42, 39.5, 34.6, 13.2]],
        plaque: { l: 2.8, t: 2.6, w: 24.5 }, panel: { l: 3.2, t: 15.8, w: 27, h: 53.5 }, icons: { r: 1, t: 1.8 }, stick: { l: 5.6, t: 72.5 }, action: { l: 86.2, t: 73.5 },
        slots: { l: 42.3, t: 40, w: 34, h: 12 }, hotspot: { x: 59, y: 45 }
    }
];
const TREASURE = { img: `${import.meta.env.BASE_URL || '/'}games/lostkingdom/treasure.jpg`, holes: [[1.8, 2.8, 25, 11], [11.5, 79.5, 20, 16.5]] };
const ICON = { bridges: Sigma, mcq: BookOpen, panels: Brain, arrange: BookOpen };
const THEMES = ['vault-temple', 'vault-code', 'vault-mechanism', 'vault-light', 'vault-final'];
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
@keyframes lk-shake { 0%,100% { transform: translateX(0) } 25%,75% { transform: translateX(-7px) } 50% { transform: translateX(7px) } }
/* The layout in plain CSS, so it never depends on utility classes being built:
   the picture 2000×1140; on a wide screen the panel sits on it, on a phone under it. */
.lk-stage { position: relative; container-type: inline-size; }
.lk-scene { position: relative; width: 100%; aspect-ratio: 2000 / 1140; overflow: hidden; border-radius: 1rem; background: #000; box-shadow: 0 25px 50px -12px rgba(0,0,0,.4); }
.lk-panel { position: relative; z-index: 20; margin-top: .75rem; }
@media (min-width: 768px) {
  .lk-stage { aspect-ratio: 2000 / 1140; }
  .lk-scene { position: absolute; inset: 0; aspect-ratio: auto; }
  .lk-panel { position: absolute; margin-top: 0; left: var(--l); top: var(--t); width: var(--w); height: var(--h); }
}
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
    const audio = useMemo(() => createAudio('vault-temple'), []);
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
    const curIndex = cur?.index;
    const [pickedFor, setPickedFor] = useState(curIndex);
    if (pickedFor !== curIndex) { setPickedFor(curIndex); setPick(null); setTried([]); setSlots([null, null, null, null, null]); }
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
                later(1400, () => { setPhase('travel'); [0, 330, 660, 990].forEach((t) => later(t, () => audio.sfx('step'))); });
                later(2700, () => { setShown(me.stage); setPhase('arrive'); });
                later(3600, () => setPhase('idle'));
            }
        } else if (me.stage !== was.stage) {
            later(0, () => { setShown(Math.min(me.stage, 4)); setPhase(me.done ? 'treasure' : 'idle'); });
        }
    }, [me, audio, view.penalty, view.jamMs]);
    useEffect(() => { if (!toast) return undefined; const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); }, [toast]);
    useEffect(() => { audio.setTheme(phase === 'treasure' ? 'vault-final' : THEMES[shown]); }, [audio, shown, phase]);
    const secondsLeft = Math.ceil(left / 1000);
    const alarmed = useRef(false);
    useEffect(() => {
        if (!playing || me?.done) return;
        if (secondsLeft <= 10 && secondsLeft > 0) audio.sfx('tick');
        if (share < 0.25 && !alarmed.current) { alarmed.current = true; audio.sfx('alarm'); }
    }, [secondsLeft, playing, share, audio, me?.done]);

    const arrange = cur?.kind === 'arrange';
    const n = cur?.options?.length || 0;
    const canAct = !!view.canPlay && !busy && !jammed && cur && shown === stage && (phase === 'idle' || phase === 'arrive');
    /** Give an answer (an option's number, or the gate's order). */
    const submit = (choice = pick) => {
        if (!canAct) return;
        if (arrange ? slots.includes(null) : choice == null || tried.includes(choice)) return;
        audio.start(); audio.sfx('click');
        lastChoice.current = { stage, choice: arrange ? null : choice };
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
    // Keys: up / down move the highlight, 1–4 or A–D pick, Enter answers.
    useEffect(() => {
        const onKey = (e) => {
            if (/input|textarea/i.test(e.target?.tagName) || !cur) return;
            const k = e.key.toLowerCase();
            if (!arrange && ['arrowup', 'arrowleft', 'w', 'a'].includes(k)) { step(-1); e.preventDefault(); }
            else if (!arrange && ['arrowdown', 'arrowright', 's', 'd'].includes(k)) { step(1); e.preventDefault(); }
            else if (!arrange && ['1', '2', '3', '4'].includes(k) && Number(k) <= n) submit(Number(k) - 1);
            else if (k === 'enter') { e.preventDefault(); submit(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    // The menus: Map, Clues (the journal), Inventory (relics), and the Menu (sound, leave).
    const [sheet, setSheet] = useState(null);
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
    const cam = phase === 'travel' ? 'scale(1.8)' : 'scale(1.02)';
    const Icon = ICON[cur?.kind] || BookOpen;
    const gateClues = arrange ? [...cur.data.gateClues.map((c) => ({ c, from: 'gate' })), ...journal.filter((j) => j.clue).map((j) => ({ c: j.clue, from: 'journal' }))] : [];
    const myTime = me?.done ? view.times?.[view.you] : null;

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
            {cur.kind === 'panels' && <div className="md:hidden"><Panels panels={cur.data.panels} small /></div>}
            {cur.kind === 'bridges' && (
                <ul className="space-y-1 md:hidden">{cur.data.bridges.map((b) => <li key={b.label} className="rounded-md bg-black/40 px-2 py-1 text-sm" style={serif}>Bridge {b.label}: {b.terms.join(', ')}</li>)}</ul>
            )}
            {arrange ? (
                <>
                    <ol className="space-y-1" data-gate-clues>
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
                    <div className="grid grid-cols-5 gap-1.5 md:hidden"><Slots slots={slots} onClear={unplace} /></div>
                </>
            ) : (
                <ol className="space-y-1.5" role="radiogroup" aria-label="Answers" data-options>
                    {cur.options.map((o, i) => (
                        <li key={o}>
                            <button type="button" onClick={() => { setPick(i); submit(i); }} onMouseEnter={() => !tried.includes(i) && setPick(i)} disabled={!canAct || tried.includes(i)} data-option={i} aria-label={`Answer ${LETTERS[i]}: ${o}`}
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
                <button type="button" onClick={() => submit()} disabled={!canAct || (arrange ? slots.includes(null) : pick == null)} className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-[#f4d27a] px-4 py-1.5 font-black uppercase tracking-wide text-white shadow-lg disabled:opacity-50" style={{ background: 'linear-gradient(#e0ab48, #93631a)', fontSize: fs(11, 1.05, 17) }} data-submit>
                    {busy ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />} {arrange ? 'Unlock the gate' : 'Choose highlighted'}
                </button>
            </div>
        </div>
    );

    return (
        <div className="mx-auto w-full max-w-[1500px] space-y-4" data-kingdom data-phase={view.phase} data-trial={shown} onPointerDown={() => { if (!prefs.started) audio.start(); }}>
            <style>{CSS}</style>
            <div className="lk-stage">
                <div className="lk-scene" data-scene>
                    {/* The picture: this trial's, or the treasure chamber. */}
                    <div className="absolute inset-0" style={{ transform: cam, transformOrigin: `${L.hotspot.x}% ${L.hotspot.y}%`, transition: phase === 'travel' ? 'transform 1.3s cubic-bezier(.55,0,.8,.4), filter 1.3s' : 'transform .9s ease', filter: phase === 'travel' ? 'brightness(1.35) blur(1.5px)' : 'none' }}>
                        <div key={phase === 'treasure' ? 'treasure' : shown} className="absolute inset-0" style={{ animation: phase === 'arrive' || phase === 'treasure' ? 'lk-arrive 1s ease-out both' : 'lk-breathe 18s ease-in-out infinite alternate' }}>
                            {phase === 'treasure' ? <ChamberPhoto src={TREASURE.img} holes={TREASURE.holes} id="lk-t" /> : <ChamberPhoto src={L.img} holes={L.holes} id={`lk${shown}`} />}
                        </div>
                    </div>
                    {phase === 'unlock' && <span className="pointer-events-none absolute rounded-full" style={{ left: `${L.hotspot.x}%`, top: `${L.hotspot.y}%`, width: '24cqw', height: '24cqw', background: 'radial-gradient(circle, rgba(255,230,150,.95), rgba(255,170,40,.5) 40%, transparent 70%)', animation: 'lk-burst 1.4s ease-out both' }} aria-hidden="true" />}
                    {phase === 'travel' && <div className="pointer-events-none absolute inset-0 bg-[#1a0f02] transition-opacity delay-700 duration-500" style={{ opacity: 0.85 }} aria-hidden="true" />}
                    {shake > 0 && <div key={shake} className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,transparent_40%,rgba(185,28,28,.6))]" style={{ animation: 'lk-flash .9s ease-out both' }} aria-hidden="true" />}

                    {/* ── The HUD, where the pictures have it ── */}
                    {phase === 'treasure'
                        ? <TitlePlaque line="Treasure of Aurelia" style={{ left: '2%', top: '3%', width: '25%' }} />
                        : <TitlePlaque line={`Trial ${shown + 1} : ${view.titles[shown]}`} style={box(L.plaque)} />}
                    {phase !== 'treasure' && <TopIcons style={{ right: `${L.icons.r}%`, top: `${L.icons.t}%` }} {...menus} />}
                    {/* The clock and the race, under the buttons. */}
                    <div className="absolute z-30 flex flex-col items-end gap-1.5" style={{ right: `${L.icons.r}%`, top: phase === 'treasure' ? '3%' : `${L.icons.t + 13}%` }}>
                        {(playing || view.phase === 'ready') && (
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-black tabular-nums ${playing && share < 0.25 ? 'animate-pulse bg-rose-700/90 text-white' : darkPanel}`} style={{ fontSize: fs(12, 1.6, 30) }} data-timer>
                                <Hourglass style={{ width: '1em', height: '1em' }} className="text-[#e7c477]" /> {view.phase === 'ready' ? `0:0${Math.max(1, secondsLeft)}` : fmt(left)}
                            </span>
                        )}
                        {me?.penaltyMs > 0 && <span className="rounded-full bg-rose-800/90 px-2.5 py-0.5 text-xs font-black text-white" data-penalty>+{Math.round(me.penaltyMs / 1000)}s penalty</span>}
                        <div className={`hidden overflow-hidden rounded-xl md:block ${darkPanel}`} style={{ width: 'clamp(170px, 17cqw, 300px)' }} data-race>
                            <button type="button" onClick={() => setBoardOpen((v) => !v)} className="flex w-full items-center justify-between px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#e7c477]" aria-expanded={boardOpen} style={serif}>
                                <span className="inline-flex items-center gap-1.5"><Trophy size={13} /> Explorers</span>{boardOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                            {boardOpen && (
                                <ol className="space-y-0.5 px-2 pb-2">{standings.map(({ s, i, p, score }, rank) => (
                                    <li key={i} className={`flex items-center gap-2 rounded-md px-1.5 py-1 text-xs ${view.you === i ? 'bg-amber-400/15' : ''} ${p.left ? 'opacity-45' : ''}`} data-racer={i}>
                                        <span className="w-3 font-black text-[#c9a45a]">{rank + 1}</span>
                                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                                        <span className="min-w-0 flex-1 truncate font-bold">{s.name}{view.you === i ? ' (you)' : ''}</span>
                                        <span className="text-[#c9b48a]">{p.done ? '💰' : `${p.at}/${p.of}`}</span>
                                        <span className="w-10 text-right font-black tabular-nums">{score}</span>
                                    </li>
                                ))}</ol>
                            )}
                        </div>
                    </div>

                    {/* The bridge signs (Trial 1), the vault's panels (Trial 4), the gate's slots (Trial 5). */}
                    {showPuzzle && L.signs && cur.data?.bridges && L.signs.map((sg, i) => (
                        <div key={i} className="absolute z-20 hidden items-center justify-center rounded-md font-bold shadow-lg md:flex" style={{ ...box(sg), ...serif, fontSize: fs(9, 1.25, 22), color: '#f6e7c1', background: 'linear-gradient(#3d3427, #211a12)', border: `2px solid ${cur.data.ask === i ? '#f4c55a' : '#5a4a32'}`, boxShadow: cur.data.ask === i ? '0 0 16px rgba(244,197,90,.7)' : undefined }} data-sign={i}>
                            {cur.data.bridges[i].terms.join(', ')}
                        </div>
                    ))}
                    {showPuzzle && L.wall && cur.kind === 'panels' && <div className="absolute z-20 hidden md:block" style={box(L.wall)}><Panels panels={cur.data.panels} /></div>}
                    {showPuzzle && L.slots && arrange && <div className="absolute z-20 hidden grid-cols-5 gap-[0.8cqw] md:grid" style={box(L.slots)}><Slots slots={slots} onClear={unplace} big /></div>}
                    {showPuzzle && (
                        <div className="hidden md:block">
                            {/* The stick steps the highlight through the answers (up / left back, down / right on); an answer is given by clicking it (no Interact button, asked 2026-10-28). */}
                            <Stick style={{ left: `${L.stick.l}%`, top: `${L.stick.t}%` }} onFlick={(d) => step(d === 'up' || d === 'left' ? -1 : 1)} />
                        </div>
                    )}

                    {/* The briefing, while the countdown runs. */}
                    {view.phase === 'ready' && !over && (
                        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/65 p-4" data-briefing>
                            <div className="max-w-lg text-center text-[#f3e6c8]">
                                <h2 className="font-bold text-[#e7c477]" style={{ ...serif, fontSize: fs(22, 3.4, 56) }}>The Lost Kingdom</h2>
                                <p className="mt-2" style={{ fontSize: fs(13, 1.3, 20) }}>An old map leads to the lost kingdom of Aurelia. Pass its five trials — numbers, knowledge and logic — and collect the clues for the final gate. Everyone gets the same trials; the first to reach the treasure wins. A wrong answer adds {view.penalty} seconds.</p>
                                <p className="mt-3 font-black tabular-nums" style={{ ...serif, fontSize: fs(30, 5, 80) }}>{Math.max(1, secondsLeft)}</p>
                                {!prefs.started && <button type="button" onClick={() => audio.start()} className="mt-3 rounded-full border border-[#f4d27a] px-6 py-2.5 font-black uppercase text-white" style={{ background: 'linear-gradient(#e0ab48, #93631a)' }}>🔊 Start with sound</button>}
                            </div>
                        </div>
                    )}
                    {toast && <div className="pointer-events-none absolute inset-x-0 top-[42%] z-40 flex justify-center px-4"><p className="rounded-2xl bg-rose-800/90 px-4 py-2.5 text-center font-black text-white shadow-xl" style={{ fontSize: fs(12, 1.2, 20) }} data-toast>{toast}</p></div>}

                    {/* The treasure: gold falling, the old explorer's words. */}
                    {phase === 'treasure' && (
                        <>
                            {Array.from({ length: 36 }, (_, i) => <span key={i} className="pointer-events-none absolute top-0 z-20 rounded-full shadow-[0_0_6px_#ffd166]" style={{ left: `${(i * 23) % 100}%`, width: `${0.6 + (i % 3) * 0.3}cqw`, height: `${0.6 + (i % 3) * 0.3}cqw`, background: 'linear-gradient(#fff1b8, #d99a1e)', animation: `lk-fall ${2.6 + (i % 5) * 0.5}s linear ${(i % 9) * 0.3}s infinite` }} />)}
                            <div className="absolute z-30 flex flex-col justify-center rounded-md bg-black/80 p-[1cqw] text-[#f3e6c8]" style={{ left: '11.5%', top: '79.5%', width: '20%', height: '16.5%', ...serif, fontSize: fs(9, 1.1, 19) }} data-treasure-words>
                                “You did it! The five trials have been conquered. The treasure of Aurelia is yours, but its knowledge must live on.”
                            </div>
                            {myTime != null && <p className="absolute bottom-[4%] right-[3%] z-30 rounded-full bg-black/70 px-4 py-2 font-bold text-amber-200" style={{ fontSize: fs(11, 1.3, 22) }}>Your time {fmt(myTime)}{me.penaltyMs ? ` (with +${Math.round(me.penaltyMs / 1000)}s)` : ''}{!over ? ' · waiting for the others…' : ''}</p>}
                        </>
                    )}
                    {!prefs.started && playing && <button type="button" onClick={() => audio.start()} className="absolute bottom-3 left-1/2 z-40 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-black text-slate-900 shadow">🔊 Tap for sound</button>}
                </div>
                {/* The question, where the picture has its panel (under the picture on a phone). */}
                {showPuzzle && <section className="lk-panel" style={at(L.panel)}>{panel}</section>}
            </div>

            {/* On a phone: the race, under the picture. */}
            <section className={`rounded-2xl p-3 md:hidden ${darkPanel}`} aria-label="Standings">
                {standings.map(({ s, i, p, score }, rank) => (
                    <div key={i} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${view.you === i ? 'bg-amber-400/15' : ''}`}>
                        <span className="w-4 text-xs font-black">{rank + 1}</span><span className="h-3 w-3 rounded-full" style={{ background: s.color }} />
                        <span className="min-w-0 flex-1 truncate font-bold">{s.name}{view.you === i ? ' (you)' : ''}</span>
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
                    exitLabel="Leave the game" onExit={() => { setSheet(null); if (window.confirm('Leave the game? You will lose, and the others play on.')) onAction({ type: 'resign' }).catch(() => {}); }} />
            )}
        </div>
    );
}
