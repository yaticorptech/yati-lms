import { useEffect, useMemo, useRef, useState } from 'react';
import { Volume2, VolumeX, Music, Settings, Hourglass, Lock, Landmark, CheckCircle2, RotateCw } from 'lucide-react';
import usePhaseClock from '../usePhaseClock';
import createAudio from '../adventure/audio';
import { Glyph, BoldGlyph } from './glyphs';
import { LockCodePuzzle, MathLogicPuzzle, SequencePuzzle, RingsPuzzle, CodePuzzle, MirrorsPuzzle, FinalPuzzle } from './puzzles';
import { fs, goldButton, PHONE_SCENE_DVH, phoneFocus } from './style';
import ChamberPhoto from './ChamberPhoto';
import PhoneStage, { LandscapeStage, RotatePrompt, RotatedStage } from '../adventure/PhoneStage';
import useAdventureView from '../adventure/useAdventureView';

/**
 * The Final Vault, a Group Brain escape-room race: five temple chambers, the
 * same puzzles for everyone, one shared clock. Each chamber is the
 * picture it was designed from (public/games/finalvault), its own panels cut
 * out (ChamberPhoto) so nothing shows twice, with the game where they were: the title plaque, the standings, the chamber tracker, the
 * clock and the sound, the puzzle panel, and in the code and light chambers
 * the dials, the wall clues and the light board. Puzzles 1–3 are easy,
 * 4 and 5 medium.
 *
 * Solving a chamber works its mechanism (the door, the gears, the dials, the
 * crystal) and walks the camera on into the next chamber; a wrong answer
 * jams it for a moment and adds the same time penalty for everyone.
 * Everything comes from `view`, the server's; an answer names the chamber it
 * is for, so a double click cannot count twice.
 */

// Where things are in each chamber's picture, in % of its width and height:
// the game's HUD where the picture had its own, and `holes`, the picture's own
// panels cut out (ChamberPhoto) so nothing shows twice.
const CHAMBERS = [
    {
        // The approved design itself (2026-11-05, "Crack the Code"): its title, standings, tracker, clock and sound
        // cut out for the live ones, placed where it had them; its puzzle panel is drawn again on top with its
        // controls made live (puzzles.jsx, LockCodePuzzle). Still, so nothing slides off its place.
        img: `${import.meta.env.BASE_URL || '/'}games/finalvault/chamber1-design.jpg`, still: true,
        theme: 'vault-temple', subtitle: 'The Ancient Lock',
        holes: [[2.2, 1.6, 21.3, 10.7], [2.6, 15.2, 17.8, 18.8], [29.4, 0.8, 44.2, 12.7], [76.3, 1.9, 10.8, 7.7], [87.3, 1.9, 11, 7.7], [57.3, 28, 40.4, 68.4]],   // last: the card, so a shake shows no second one
        plaque: { l: 2.58, t: 2.01, w: 20.54, h: 9.87 }, board: { l: 3, t: 15.74, w: 17, h: 17.7 },
        tracker: { l: 29.85, t: 1.26, w: 43.3, h: 11.8 }, timer: { l: 76.7, t: 2.33, w: 10.03, h: 6.87 }, sound: { l: 87.69, t: 2.33, w: 10.21, h: 6.87 },
        panel: { l: 56.76, t: 27.43, w: 41.5, h: 69.5 }, clues: { l: 3, t: 36, w: 15.8, h: 12.6 },
        hotspot: { x: 64, y: 30 }, dolly: { x: 64, y: 30 }
    },
    {
        // The approved design itself (2026-11-05, the Math Logic Challenge): its title, standings, tracker, clock,
        // sound, clues and panel cut out for the live ones, which sit where it had them (puzzles.jsx, MathLogicPuzzle).
        img: `${import.meta.env.BASE_URL || '/'}games/finalvault/chamber2-design.jpg`, still: true,
        theme: 'vault-mechanism', subtitle: 'The Hidden Mechanism',
        holes: [[1.4, 2, 22.5, 10.2], [1.4, 13.7, 18.8, 26.1], [28.2, 1, 42.8, 13], [75, 2.6, 10.7, 7.9], [86.1, 2.6, 10.7, 7.9], [1.4, 41.8, 16.4, 13.2], [58.6, 13, 39, 80.6]],
        plaque: { l: 1.73, t: 2.4, w: 21.9, h: 9.45 }, board: { l: 1.73, t: 14.1, w: 18.2, h: 25.3 },
        tracker: { l: 28.6, t: 1.6, w: 42, h: 11.7 }, timer: { l: 75.4, t: 3.2, w: 9.95, h: 6.7 }, sound: { l: 86.5, t: 3.2, w: 9.9, h: 6.7 },
        panel: { l: 58.88, t: 13.34, w: 38.38, h: 80.04 }, clues: { l: 1.73, t: 42.2, w: 15.7, h: 12.4 },
        hotspot: { x: 40, y: 45 }, dolly: { x: 40, y: 45 }
    },
    {
        // The approved design itself (2026-11-05): its title, standings, tracker, clock, sound, clues, wall chart, dials
        // and card cut out for the live ones, which sit where it had them; the card bottom left (puzzles.jsx, CodePuzzle).
        img: `${import.meta.env.BASE_URL || '/'}games/finalvault/chamber3-design.jpg`, still: true,
        theme: 'vault-code', subtitle: 'The Secret Code',
        holes: [[1.1, 1.9, 22.9, 10.5], [1.1, 13.6, 19.2, 25.1], [28.7, 1.4, 43, 12.3], [76.3, 3.2, 11, 7.2], [87.5, 3.2, 10.8, 7.2], [1.4, 39.5, 16.6, 12.9],
            [79.3, 15, 17.8, 43.4], [50.8, 46.4, 5.4, 17], [58.6, 46.4, 5.4, 17], [67.3, 46.4, 5.4, 17], [1.4, 53.4, 17.1, 33.2]],
        plaque: { l: 1.51, t: 2.38, w: 21.96, h: 9.51 }, board: { l: 1.51, t: 14.05, w: 18.33, h: 24.22 },
        tracker: { l: 29.1, t: 2.38, w: 42.17, h: 10.81 }, timer: { l: 76.71, t: 3.68, w: 10.16, h: 6.27 }, sound: { l: 87.9, t: 3.68, w: 9.98, h: 6.27 },
        panel: { l: 1.63, t: 53.73, w: 16.58, h: 32.54 }, clues: { l: 1.81, t: 40, w: 15.73, h: 11.89 },
        wall: { mural: { l: 79.6, t: 15.4, w: 17, h: 42.6 }, dials: [{ x: 53.6, y: 54.4 }, { x: 61.4, y: 54.4 }, { x: 70, y: 54.4 }] },
        hotspot: { x: 61.5, y: 50 }, dolly: { x: 61.5, y: 60 }
    },
    {
        // The approved design itself (2026-11-05): its title, standings, tracker, clock, sound, light-path board and
        // panel cut out for the live ones, which sit where it had them (puzzles.jsx, MirrorsPuzzle).
        img: `${import.meta.env.BASE_URL || '/'}games/finalvault/chamber4-design.jpg`, still: true,
        theme: 'vault-light', subtitle: 'The Light Path',
        holes: [[1.4, 1.2, 23.3, 11], [1.4, 13.4, 19.6, 24.2], [28.4, 0.4, 44.6, 11.8], [74.9, 2, 10.7, 7.5], [86.1, 2, 12.3, 7.5], [74.2, 11.8, 24.7, 81.2], [2.2, 44.8, 17.4, 24.2]],
        plaque: { l: 1.68, t: 1.59, w: 22.75, h: 10.41 }, board: { l: 1.68, t: 13.82, w: 19.04, h: 23.38 },
        tracker: { l: 28.74, t: 0.85, w: 44.01, h: 11.05 }, timer: { l: 75.15, t: 2.34, w: 10.18, h: 6.91 }, sound: { l: 86.41, t: 2.34, w: 11.8, h: 6.91 },
        panel: { l: 74.43, t: 12.22, w: 24.25, h: 80.45 }, wall: { l: 2.4, t: 45.16, w: 17, h: 23.38 },
        hotspot: { x: 52, y: 55 }, dolly: { x: 52, y: 55 }
    },
    {
        // The vault door from the first chamber, close up, lit red for the last puzzle.
        // The approved design itself (2026-11-05): its title, standings, tracker, clock and sound cut out for the live
        // ones; its Collected Clues card kept, each door's symbol shown in its row (doorClues); its panel drawn again
        // on top with its controls made live (puzzles.jsx, FinalPuzzle).
        img: `${import.meta.env.BASE_URL || '/'}games/finalvault/chamber5-design.jpg`, still: true,
        theme: 'vault-final', subtitle: 'The Final Trial',
        holes: [[0.9, 0.6, 24, 11.1], [1.4, 13, 20.4, 24.8], [28.3, 0.2, 46, 11.9], [75.7, 0.9, 11.3, 7.4], [87.4, 0.9, 11.6, 7.4], [63.2, 14, 34.6, 78.6]],
        plaque: { l: 1.32, t: 1.01, w: 23.22, h: 10.26 }, board: { l: 1.8, t: 13.41, w: 19.62, h: 23.94 },
        tracker: { l: 28.73, t: 0.59, w: 45.18, h: 11.11 }, timer: { l: 76.12, t: 1.34, w: 10.47, h: 6.62 }, sound: { l: 87.79, t: 1.34, w: 10.95, h: 6.62 },
        panel: { l: 62.72, t: 13.41, w: 35.54, h: 79.83 },
        doorClues: [46.21, 55.37, 64.54, 73.69].map((t) => ({ l: 14.54, t, w: 5.87, h: 7.88 })),   // four rows since 2026-11-05 (the fifth gave nothing)
        hotspot: { x: 41, y: 47 }, dolly: { x: 41, y: 47 }
    }
];

/**
 * Where a chamber's picture had a joystick or a run button (bottom left, bottom right): cut out, and since the
 * game has neither (2026-11-05), a bronze seal sits in each instead of an empty blur.
 */
const sealsOf = (holes) => holes
    .filter(([x, y]) => (x < 6 && y >= 65) || (x >= 88 && y >= 60))
    .map(([x, y, w, h]) => { const d = Math.min(w, (h * 1120) / 2000) * 0.9; return { x: x + w / 2, y: y + h / 2, d }; });
const Seal = ({ x, y, d }) => (
    <svg viewBox="0 0 100 100" className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2" aria-hidden="true"
        style={{ left: `${x}%`, top: `${y}%`, width: `${d}%`, height: `${(d * 2000) / 1120}%`, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,.7))' }} data-seal>
        <defs><radialGradient id="fv-seal" cx="50%" cy="40%"><stop offset="0%" stopColor="#5a4126" /><stop offset="100%" stopColor="#1d140a" /></radialGradient></defs>
        <circle cx="50" cy="50" r="47" fill="url(#fv-seal)" stroke="#c9a45a" strokeWidth="3.5" />
        <circle cx="50" cy="50" r="38" fill="none" stroke="#8a6a2f" strokeWidth="1.5" strokeDasharray="3 3" />
        <path d="M50 14 L56 44 L86 50 L56 56 L50 86 L44 56 L14 50 L44 44 Z" fill="#e7c477" stroke="#6b4a1a" strokeWidth="1" />
        <path d="M50 28 L53 47 L72 50 L53 53 L50 72 L47 53 L28 50 L47 47 Z" fill="#b8893a" />
        <circle cx="50" cy="50" r="4" fill="#3b2610" />
    </svg>
);

const PUZZLES = { lockcode: LockCodePuzzle, mathlogic: MathLogicPuzzle, sequence: SequencePuzzle, rings: RingsPuzzle, code: CodePuzzle, mirrors: MirrorsPuzzle, final: FinalPuzzle };
const UNLOCK_SFX = ['door', 'gear', 'unlock', 'crystal', 'door'];
const fmt = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const box = (b) => ({ left: `${b.l}%`, top: `${b.t}%`, width: `${b.w}%`, height: `${b.h}%` });
const dark = 'border border-[#b8893a]/70 bg-gradient-to-b from-[#1d140a]/95 to-[#0b0804]/95 text-[#f5e6c4] shadow-[0_6px_20px_rgba(0,0,0,.6),inset_0_0_0_1px_rgba(244,197,90,.15)]';
const cinzel = { fontFamily: 'Cinzel, Georgia, serif' };

const CSS = `
@keyframes fv-flicker { 0%,100% { opacity:.55; transform:translate(-50%,-50%) scale(1) } 30% { opacity:.85; transform:translate(-50%,-52%) scale(1.08) } 60% { opacity:.6; transform:translate(-50%,-49%) scale(.95) } }
@keyframes fv-dust { from { transform:translateY(0); opacity:0 } 20% { opacity:.7 } to { transform:translateY(-14cqw) translateX(2cqw); opacity:0 } }
@keyframes fv-breathe { from { transform:scale(1) } to { transform:scale(1.035) } }
@keyframes fv-burst { from { transform:translate(-50%,-50%) scale(.2); opacity:1 } to { transform:translate(-50%,-50%) scale(3.2); opacity:0 } }
@keyframes fv-spin { to { transform:translate(-50%,-50%) rotate(360deg) } }
@keyframes fv-arrive { from { transform:scale(1.18); opacity:0; filter:brightness(1.6) } to { transform:scale(1); opacity:1; filter:brightness(1) } }
@keyframes fv-fall { from { transform:translateY(-10cqw) rotate(0) } to { transform:translateY(70cqw) rotate(720deg) } }
@keyframes fv-shake-k { 0%,100% { transform:translateX(0) } 20%,60% { transform:translateX(-8px) } 40%,80% { transform:translateX(8px) } }
@keyframes fv-flash { from { opacity:.75 } to { opacity:0 } }
@keyframes fv-turn-k { from { transform:translateY(-35%); opacity:.3 } to { transform:translateY(0); opacity:1 } }
@keyframes fv-glow { 0%,100% { opacity:.55 } 50% { opacity:1 } }
.fv-shake { animation: fv-shake-k .45s ease }
.fv-turn { animation: fv-turn-k .25s ease-out }
`;

/** The sound controls: sound, music, and the settings (volume, music, effects). */
function SoundBar({ audio, prefs, style }) {
    const [open, setOpen] = useState(false);
    const btn = 'flex flex-1 items-center justify-center text-[#f5e6c4] hover:text-white';
    const size = 'clamp(14px, 1.7cqw, 30px)';
    return (
        <div className={`absolute z-30 flex items-center rounded-full px-[0.6cqw] ${dark}`} style={style} data-sound-controls>
            <button type="button" className={btn} onClick={() => { audio.start(); audio.set({ muted: !prefs.muted }); }} aria-label={prefs.muted ? 'Sound on' : 'Mute'}>{prefs.muted ? <VolumeX style={{ width: size, height: size }} /> : <Volume2 style={{ width: size, height: size }} />}</button>
            <button type="button" className={`${btn} ${prefs.music ? '' : 'opacity-40'}`} onClick={() => { audio.start(); audio.set({ music: !prefs.music }); }} aria-pressed={prefs.music} aria-label="Music"><Music style={{ width: size, height: size }} /></button>
            <button type="button" className={btn} onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label="Sound settings"><Settings style={{ width: size, height: size }} /></button>
            {open && (
                <div className={`absolute right-0 top-[115%] w-56 space-y-3 rounded-2xl p-4 text-sm ${dark}`} data-sound-settings>
                    <label className="block font-bold">Volume
                        <input type="range" min={0} max={1} step={0.05} value={prefs.volume} onChange={(e) => { audio.start(); audio.set({ volume: Number(e.target.value), muted: false }); }} className="mt-1 w-full accent-amber-400" />
                    </label>
                    <label className="flex items-center justify-between font-bold">Music <input type="checkbox" checked={prefs.music} onChange={(e) => { audio.start(); audio.set({ music: e.target.checked }); }} className="h-4 w-4 accent-amber-400" /></label>
                    <label className="flex items-center justify-between font-bold">Sound effects <input type="checkbox" checked={prefs.sfx !== false} onChange={(e) => { audio.start(); audio.set({ sfx: e.target.checked }); }} className="h-4 w-4 accent-amber-400" /></label>
                </div>
            )}
        </div>
    );
}

export default function FinalVaultTable({ view, onAction, busy }) {
    const me = view.me;
    const over = view.status !== 'active';
    const { left, share } = usePhaseClock(view);
    const playing = view.phase === 'play' && !over;
    const cur = view.current;
    const stage = me?.stage ?? 0;

    // The chamber's font, once.
    useEffect(() => {
        if (document.getElementById('fv-cinzel')) return;
        const l = document.createElement('link');
        l.id = 'fv-cinzel'; l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&display=swap';
        document.head.appendChild(l);
    }, []);

    // Sound: each chamber its own music; nothing plays until a tap.
    const audio = useMemo(() => createAudio('vault-temple'), []);
    const [prefs, setPrefs] = useState(() => audio.prefs());
    useEffect(() => { const off = audio.subscribe(setPrefs); return () => { off(); audio.dispose(); }; }, [audio]);
    useEffect(() => { audio.setIntensity(playing ? 1 - share : 0); }, [audio, playing, share]);

    // Which chamber is on screen, and what it is doing: idle, unlock (the mechanism works),
    // travel (the camera walks on), arrive (the next chamber comes in), open (the vault).
    const [shown, setShown] = useState(() => Math.min(stage, 4));
    const [phase, setPhase] = useState(() => (me?.done ? 'open' : 'idle'));
    const timers = useRef([]);
    const later = (ms, f) => timers.current.push(setTimeout(f, ms));
    useEffect(() => () => timers.current.forEach(clearTimeout), []);
    const seen = useRef({ stage, mistakes: me?.mistakes ?? 0, done: !!me?.done });
    const [shake, setShake] = useState(0);
    const [toast, setToast] = useState(null);
    const [jammed, setJammed] = useState(false);
    useEffect(() => {
        if (!me) return;
        const was = seen.current;
        seen.current = { stage: me.stage, mistakes: me.mistakes, done: me.done };
        if (me.mistakes > was.mistakes) {
            later(0, () => { setShake((n) => n + 1); setJammed(true); setToast({ bad: true, text: `Wrong answer. ${view.penalty} seconds added. Wait a moment and try again.` }); audio.sfx('wrong'); });
            later(view.jamMs || 2500, () => setJammed(false));
        }
        if (me.stage === was.stage + 1) {
            const from = was.stage;
            later(0, () => { setPhase('unlock'); audio.sfx('correct'); later(350, () => audio.sfx(UNLOCK_SFX[from])); if (from === 1) later(400, () => audio.sfx('gear')); });
            if (me.done) {
                later(1500, () => { setPhase('open'); audio.sfx('door'); later(700, () => audio.sfx('victory')); });
            } else {
                // Quicker since 2026-11-05: the next puzzle is up in under two seconds, a message over a blur meanwhile.
                later(700, () => { setPhase('travel'); [0, 300].forEach((t) => later(t, () => audio.sfx('step'))); });
                later(1300, () => { setShown(me.stage); setPhase('arrive'); audio.setTheme(CHAMBERS[me.stage].theme); });
                later(1900, () => setPhase('idle'));
            }
        } else if (me.stage !== was.stage) {
            // A jump (back after a reconnect): straight there.
            later(0, () => { setShown(Math.min(me.stage, 4)); setPhase(me.done ? 'open' : 'idle'); audio.setTheme(CHAMBERS[Math.min(me.stage, 4)].theme); });
        }
    }, [me, audio, view.penalty, view.jamMs]);
    useEffect(() => { if (!toast) return undefined; const t = setTimeout(() => setToast(null), 2600); return () => clearTimeout(t); }, [toast]);
    useEffect(() => { audio.setTheme(CHAMBERS[shown].theme); }, [audio, shown]);

    // The last ten seconds tick; a quarter of the time left sounds the alarm once.
    const secondsLeft = Math.ceil(left / 1000);
    const alarmed = useRef(false);
    useEffect(() => {
        if (!playing || me?.done) return;
        if (secondsLeft <= 10 && secondsLeft > 0) audio.sfx('tick');
        if (share < 0.25 && !alarmed.current) { alarmed.current = true; audio.sfx('alarm'); }
    }, [secondsLeft, playing, share, audio, me?.done]);


    const submit = (value) => {
        if (!view.canPlay || busy || jammed) return;
        audio.start(); audio.sfx('click');
        onAction({ type: 'solve', stage, value }).catch((e) => setToast({ bad: true, text: e?.message || 'That did not go through.' }));
    };

    const ch = CHAMBERS[shown];
    const Puzzle = cur && PUZZLES[cur.kind];
    const showPuzzle = playing && cur && !me?.done && Puzzle && shown === stage && (phase === 'idle' || phase === 'arrive');
    const standings = view.seats.map((s, i) => ({ s, i, p: view.players[i], score: view.scores[i] })).sort((a, b) => b.score - a.score || (b.p.at - a.p.at));
    const myTime = me?.done ? view.times?.[view.you] : null;
    // Over with the vault still shut but first all the same (the others left): not a "Time up · You lost".
    const wonAnyway = over && view.outcome?.places?.[0]?.length === 1 && view.outcome.places[0][0] === view.seats[view.you]?.side;
    // The phone's view (useAdventureView): the wide layout sideways or turned a quarter, or the upright one.
    const { view: layout, onPhone, stacked: phone, wide, setUpright } = useAdventureView(over);
    const ASPECT = 2000 / 1120;
    const frame = (node) => (layout === 'rotated' ? <RotatedStage aspect={ASPECT}>{node}</RotatedStage>
        : layout === 'landscape' || layout === 'turn-upright' ? <LandscapeStage aspect={ASPECT}>{node}</LandscapeStage>
        : <PhoneStage on={layout === 'stacked'}>{node}</PhoneStage>);
    // On a phone the messages over the chamber cover the whole screen instead: inside the picture they were too small to read.
    const layer = (node) => (phone && node ? <div className="pointer-events-none fixed inset-0 z-[140]">{node}</div> : node);

    // The camera: looking around with the stick, walking on into the next chamber.
    const cam = phase === 'travel' ? 'scale(1.9)' : ch.still ? 'none' : 'scale(1.04)';

    return (
        <>
        {frame(
        <div className={`mx-auto w-full min-w-0 max-w-[1500px] overflow-x-clip ${onPhone && wide ? '' : 'space-y-4'}`} data-vault data-phase={view.phase} data-chamber={shown} onPointerDown={() => { if (!prefs.started) audio.start(); }}>
            <style>{CSS}</style>
            {/* On a phone (2026-10-29, "not visible properly"): the title, clock, sound and chambers in a bar above the
                chamber, full size — inside the picture they were too small to read. */}
            <section className={`rounded-2xl p-3 ${wide || (over && phone) ? 'hidden' : ''} ${dark}`} data-vault-hud>
                {/* The title on its own line; under it, what can be done (2026-11-05: one row ran off a phone's edge). */}
                <p className="text-lg font-extrabold leading-tight text-[#f4c55a]" style={cinzel}>The Final Vault</p>
                <p className="text-[11px] font-bold uppercase leading-snug text-[#f5e6c4]" style={cinzel}>Stage {Math.min(shown + 1, 5)} - {ch.subtitle}</p>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    {!over && (
                        <span className={`flex items-center gap-1.5 rounded-full border border-[#b8893a]/70 bg-black/40 px-3 py-1 text-xl font-black tabular-nums ${playing && share < 0.25 ? 'animate-pulse border-rose-500 text-rose-300' : ''}`}>
                            <Hourglass size={18} className="text-[#f4c55a]" />{view.phase === 'ready' ? `0:0${Math.max(1, secondsLeft)}` : fmt(left)}
                        </span>
                    )}
                    {me?.penaltyMs > 0 && <span className="rounded-full bg-rose-700/90 px-2.5 py-0.5 text-[11px] font-black text-white">+{Math.round(me.penaltyMs / 1000)}s · {me.mistakes} wrong</span>}
                    {!over && (
                        <span className="ml-auto flex items-center gap-2">
                            <SoundBar audio={audio} prefs={prefs} style={{ position: 'relative', width: 96, height: 38 }} />
                            {onPhone && (
                                <button type="button" onClick={() => setUpright(false)} aria-label="Landscape view: the whole chamber" className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full border border-[#b8893a]/70 bg-black/40 text-[#f4c55a]" data-go-landscape>
                                    <RotateCw size={18} aria-hidden="true" />
                                </button>
                            )}
                        </span>
                    )}
                </div>
                <ol className="relative mt-3 flex items-start justify-between" aria-label="Chambers">
                    <span className="absolute left-[8%] right-[8%] top-4 h-1 -translate-y-1/2 rounded-full bg-black/60" aria-hidden="true" />
                    <span className="absolute left-[8%] top-4 h-1 -translate-y-1/2 rounded-full bg-emerald-400 transition-all duration-700" style={{ width: `${(84 * Math.min(stage, 5)) / 5}%` }} aria-hidden="true" />
                    {[0, 1, 2, 3, 4, 5].map((i) => {
                        const done = i < stage || (i === 5 && me?.done);
                        const now = i === stage && !me?.done;
                        return (
                            <li key={i} className="relative flex flex-1 flex-col items-center gap-1" aria-current={now ? 'step' : undefined}>
                                <span className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${now ? 'border-[#ffd166] bg-gradient-to-b from-[#a8741f] to-[#4a2f0b] shadow-[0_0_12px_rgba(251,191,36,.9)]' : done ? 'border-[#d9c7a0] bg-gradient-to-b from-[#3f7aa8] to-[#123552]' : 'border-[#6b5a3a] bg-gradient-to-b from-[#2a2520] to-[#0d0b08]'}`}>
                                    {i === 5 ? <span className="text-sm">{me?.done ? '💰' : '🧰'}</span> : done || now ? <Landmark size={15} className="text-[#ffe9b0]" /> : <Lock size={13} className="text-[#b9a88a]" />}
                                </span>
                                <span className={`text-[11px] font-bold ${now ? 'text-[#ffd166]' : 'text-[#f5e6c4]'}`}>{i === 5 ? 'Vault' : `Puzzle ${i + 1}`}</span>
                            </li>
                        );
                    })}
                </ol>
            </section>
            {/* "isolate": the chamber's own layers (z-30 HUD) stay inside it, under the site's header, when the page scrolls.
                Over, on a phone, the chamber is left out: its picture's cut-outs would show with nothing in them. */}
            {/* Over, on an upright phone (the chamber left out): the end picture as a card of its own (2026-11-05). */}
            {over && phone && me && (me.done || !wonAnyway) && (
                <section className="relative -mx-2 overflow-hidden rounded-2xl bg-black shadow-2xl" style={{ aspectRatio: '4 / 3', containerType: 'inline-size' }} data-end-card={me.done ? 'won' : 'lost'}>
                    <img src={`${import.meta.env.BASE_URL || '/'}games/finalvault/${me.done ? 'vault-opened' : 'vault-timeup'}.jpg`} alt={me.done ? 'Vault opened! Congratulations.' : 'Time up. You lost.'} className="absolute inset-0 h-full w-full object-cover" />
                    {me.done && myTime != null && (
                        <p className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-center font-bold text-[#ffe9a8]" style={{ top: '89.5%', ...cinzel, fontSize: 'clamp(9px, 2.9cqw, 18px)' }}>
                            Your time {fmt(myTime)}{me.penaltyMs ? ` (with +${Math.round(me.penaltyMs / 1000)}s)` : ''}
                        </p>
                    )}
                </section>
            )}
            {!(over && phone) && (
            <div className={`relative isolate ${wide ? 'aspect-[2000/1120]' : ''}`} style={{ containerType: 'inline-size' }}>
                {/* ── The chamber ── */}
                <div className={`w-full overflow-hidden rounded-2xl bg-black shadow-2xl ${wide ? 'absolute inset-0' : phone ? 'relative' : 'relative aspect-[4/3]'}`} style={phone ? { height: `${PHONE_SCENE_DVH}dvh` } : undefined} data-scene>
                    {/* On a phone: the whole picture's height, cut at the sides around the chamber's key spot. */}
                    <div className="absolute inset-0" style={phone ? { left: '50%', right: 'auto', width: 'auto', aspectRatio: '2000 / 1120', transform: `translateX(-${phoneFocus(ch)}%)` } : undefined}>
                    <div className="absolute inset-0" style={{ transform: ch.zoom ? `translateX(${ch.zoom.dx}%) scale(${ch.zoom.s})` : 'none', transformOrigin: ch.zoom ? `${ch.zoom.x}% ${ch.zoom.y}%` : '50% 50%' }}>
                        <div className="absolute inset-0" style={{ transform: cam, transformOrigin: `${ch.dolly.x}% ${ch.dolly.y}%`, transition: phase === 'travel' ? 'transform 1.3s cubic-bezier(.55,0,.8,.4), filter 1.3s' : 'transform .9s ease', filter: phase === 'travel' ? 'brightness(1.35) blur(1.5px)' : 'none' }}>
                            <div key={shown} className="absolute inset-0" style={{ animation: phase === 'arrive' ? 'fv-arrive .9s ease-out both' : ch.still ? 'none' : 'fv-breathe 18s ease-in-out infinite alternate' }}>
                                <ChamberPhoto src={ch.img} holes={ch.holes} id={shown} />
                                {sealsOf(ch.holes).map((seal, i) => <Seal key={i} {...seal} />)}
                                {/* The Hidden Mechanism: the plate to match, on the bridge. */}
                                {ch.bridge && cur?.kind === 'rings' && cur.target && ch.bridge.faces.map((f, i) => (
                                    // The face's own bronze stays; only its old symbol is covered, and the plate's drawn in gold on it.
                                    <span key={i} className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
                                        style={{ left: `${f.x}%`, top: `${f.y}%`, width: `${ch.bridge.w}%`, height: `${ch.bridge.h}%`, background: 'radial-gradient(closest-side, #3a2812 0%, #2c1e0d 70%, rgba(44,30,13,0) 100%)' }} data-bridge-face={i}>
                                        <span className="h-[80%] w-[80%]" style={{ filter: 'drop-shadow(0 0 3px rgba(255,200,80,1)) drop-shadow(0 0 12px rgba(255,170,40,.75))' }}><BoldGlyph name={cur.target[i]} /></span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                    </div>
                    {ch.tint && <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_46%_39%,rgba(255,170,60,.15),rgba(120,10,10,.45)_55%,rgba(20,0,0,.75))] mix-blend-multiply" aria-hidden="true" />}
                    {ch.tint && (
                        <svg viewBox="-50 -50 100 100" className="pointer-events-none absolute" aria-hidden="true" style={{ left: '46%', top: '39%', width: '44cqw', height: '44cqw', animation: 'fv-spin 40s linear infinite', opacity: 0.8 }}>
                            <circle r="46" fill="none" stroke="#ffb347" strokeWidth="0.6" strokeDasharray="2 3" style={{ animation: 'fv-glow 2.4s ease-in-out infinite' }} />
                            {['☀', '☾', '△', '★', '◉', '⚷', '☀', '☾', '△', '★', '◉', '⚷'].map((g, i) => <text key={i} x={Math.cos((i / 12) * Math.PI * 2) * 41} y={Math.sin((i / 12) * Math.PI * 2) * 41 + 2} fontSize="5" fill="#ffcf70" textAnchor="middle">{g}</text>)}
                        </svg>
                    )}
                    {/* Dust in the light. */}
                    {Array.from({ length: 16 }, (_, i) => (
                        <span key={i} className="pointer-events-none absolute h-[0.25cqw] w-[0.25cqw] rounded-full bg-amber-100/80" aria-hidden="true"
                            style={{ left: `${(i * 37) % 100}%`, top: `${40 + ((i * 23) % 55)}%`, animation: `fv-dust ${7 + (i % 5)}s linear ${i * 0.7}s infinite` }} />
                    ))}
                    {/* The mechanism works. */}
                    {(phase === 'unlock' || phase === 'open') && (
                        <div className="pointer-events-none absolute inset-0" aria-hidden="true" data-unlock>
                            <span className="absolute rounded-full" style={{ left: `${ch.hotspot.x}%`, top: `${ch.hotspot.y}%`, width: '22cqw', height: '22cqw', background: 'radial-gradient(circle, rgba(255,230,150,.95), rgba(255,170,40,.5) 40%, transparent 70%)', animation: 'fv-burst 1.4s ease-out both' }} />
                            <svg viewBox="-50 -50 100 100" className="absolute" style={{ left: `${ch.hotspot.x}%`, top: `${ch.hotspot.y}%`, width: '26cqw', height: '26cqw', animation: 'fv-spin 2.2s linear infinite' }}>
                                <circle r="44" fill="none" stroke="#ffd166" strokeWidth="1.6" strokeDasharray="6 4" />
                                <circle r="34" fill="none" stroke="#ffb627" strokeWidth="1" strokeDasharray="2 3" />
                                {shown === 1 && Array.from({ length: 10 }, (_, i) => <rect key={i} x="-3" y="-50" width="6" height="8" fill="#e0ab48" transform={`rotate(${i * 36})`} />)}
                            </svg>
                            {shown === 3 && <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full"><line x1={ch.hotspot.x} y1={ch.hotspot.y} x2={ch.dolly.x} y2={ch.dolly.y} stroke="#fff3c4" strokeWidth="0.6" style={{ filter: 'drop-shadow(0 0 1px #ffd166)' }} /></svg>}
                        </div>
                    )}
                    {phase === 'travel' && <div className="pointer-events-none absolute inset-0 bg-[#1a0f02] opacity-0 transition-opacity delay-700 duration-500" style={{ opacity: 0.85 }} aria-hidden="true" />}
                    {shake > 0 && <div key={shake} className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,transparent_40%,rgba(185,28,28,.65))]" style={{ animation: 'fv-flash .9s ease-out both' }} aria-hidden="true" />}

                    {/* ── The HUD ── */}
                    <div className={`absolute z-30 hidden flex-col items-center justify-center rounded-[0.6cqw] border-2 border-[#b8893a] @min-[560px]:flex ${dark}`} style={box(ch.plaque)} data-plaque>
                        <p className="whitespace-nowrap font-extrabold leading-none text-[#f4c55a] [text-shadow:0_2px_0_#5a3a0c]" style={{ ...cinzel, fontSize: fs(10, 1.75, 36) }}>THE FINAL VAULT</p>
                        <p className="mt-[0.5cqw] max-w-[94%] truncate font-bold uppercase leading-none text-[#f5e6c4]" style={{ ...cinzel, fontSize: fs(7, 0.9, 18) }}>Stage {Math.min(shown + 1, 5)} - {ch.subtitle}</p>
                    </div>
                    <div className="absolute z-30 hidden @min-[560px]:block" style={box(ch.tracker)} aria-label="Chambers" data-tracker>
                        <div className="relative flex h-full items-start justify-between">
                            <span className="absolute left-[7%] right-[7%] top-[31%] h-[0.25cqw] rounded-full bg-black/60" aria-hidden="true" />
                            <span className="absolute left-[7%] top-[31%] h-[0.25cqw] rounded-full bg-gradient-to-r from-emerald-400 to-emerald-300 shadow-[0_0_6px_#34d399] transition-all duration-700" style={{ width: `${(86 * Math.min(stage, 5)) / 5}%` }} aria-hidden="true" />
                            {[...view.titles.map((_, i) => `Puzzle ${i + 1}`), 'Final Vault'].map((t, i) => {
                                const done = i < stage || (i === 5 && me?.done);
                                const now = i === stage && !me?.done;
                                return (
                                    <div key={t} className="relative z-10 flex w-[14%] flex-col items-center">
                                        <span className={`flex items-center justify-center rounded-full border-2 ${now ? 'border-[#ffd166] bg-gradient-to-b from-[#a8741f] to-[#4a2f0b] shadow-[0_0_16px_rgba(251,191,36,.9)]' : done ? 'border-[#d9c7a0] bg-gradient-to-b from-[#3f7aa8] to-[#123552]' : 'border-[#6b5a3a] bg-gradient-to-b from-[#2a2520] to-[#0d0b08]'}`}
                                            style={{ width: now ? fs(26, 4.6, 92) : fs(22, 3.9, 78), height: now ? fs(26, 4.6, 92) : fs(22, 3.9, 78) }}>
                                            {i === 5 ? <span style={{ fontSize: fs(12, 2.2, 44) }}>{me?.done ? '💰' : '🧰'}</span> : done || now ? <Landmark className="text-[#ffe9b0]" style={{ width: '55%', height: '55%' }} /> : <Lock className="text-[#b9a88a]" style={{ width: '45%', height: '45%' }} />}
                                        </span>
                                        <span className={`mt-[0.3cqw] whitespace-nowrap rounded-full bg-black/55 px-[0.6cqw] font-bold ${now ? 'text-[#ffd166]' : 'text-[#f5e6c4]'}`} style={{ fontSize: fs(7, 0.95, 18) }}>{t}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className={`absolute z-30 hidden items-center justify-center gap-[0.5cqw] rounded-full @min-[560px]:flex ${dark} ${playing && share < 0.25 ? 'animate-pulse border-rose-500' : ''}`} style={box(ch.timer)} data-timer>
                        <Hourglass className="text-[#f4c55a]" style={{ width: fs(12, 2, 40), height: fs(12, 2, 40) }} />
                        <span className="font-black tabular-nums" style={{ fontSize: fs(12, 2.4, 48) }}>{view.phase === 'ready' ? `0:0${Math.max(1, secondsLeft)}` : fmt(left)}</span>
                    </div>
                    {me?.penaltyMs > 0 && <span className="absolute z-30 hidden rounded-full bg-rose-700/90 @min-[560px]:block px-[0.8cqw] font-black text-white" style={{ left: `${ch.timer.l + 1}%`, top: `${ch.timer.t + ch.timer.h + 0.8}%`, fontSize: fs(9, 0.95, 16) }} data-penalty>+{Math.round(me.penaltyMs / 1000)}s · {me.mistakes} wrong</span>}
                    <div className="hidden @min-[560px]:block"><SoundBar audio={audio} prefs={prefs} style={box(ch.sound)} /></div>

                    {/* The standings (a phone has them under the chamber). */}
                    <ol className={`absolute z-30 hidden flex-col justify-evenly gap-[0.35cqw] overflow-hidden rounded-[0.8cqw] p-[0.6cqw] @min-[560px]:flex ${dark}`} style={box(ch.board)} aria-label="Standings" data-race>
                        {standings.map(({ s, i, p, score }, rank) => (
                            <li key={i} className={`flex items-center gap-[0.6cqw] border-b border-[#b8893a]/20 px-[0.5cqw] last:border-0 ${view.you === i ? 'bg-[#f4c55a]/10' : ''} ${p.left ? 'opacity-45' : ''}`} style={{ flex: '0 1 auto', minHeight: 0, paddingTop: '0.25cqw', paddingBottom: '0.25cqw' }} data-racer={i}>
                                <span className={`flex shrink-0 items-center justify-center rounded-full font-black ${['bg-[#e0ab48] text-[#2a1c0b]', 'bg-[#9ca3af] text-[#111]', 'bg-[#c2703d] text-white'][rank] || 'text-[#f5e6c4]'}`} style={{ width: fs(14, 1.6, 30), height: fs(14, 1.6, 30), fontSize: fs(8, 0.95, 17) }}>{rank + 1}</span>
                                <span className="flex shrink-0 items-center justify-center rounded-full border-2 font-black text-white" style={{ background: s.color, borderColor: rank === 0 ? '#f4c55a' : '#d9c7a0', width: fs(16, 1.9, 38), height: fs(16, 1.9, 38), fontSize: fs(8, 1, 18) }}>{(s.name || '?').trim().charAt(0).toUpperCase()}</span>
                                <span className="min-w-0 flex-1">
                                    {/* Opened the vault: the name in green, no words under it (2026-11-05). */}
                                    <span className={`block truncate font-bold ${p.done ? 'text-emerald-400' : ''}`} style={{ fontSize: fs(9, 1.15, 22) }} title={p.done ? 'Opened the vault' : undefined}>{view.you === i ? 'You' : s.name}</span>
                                    {p.left && <span className="block text-[#d9c7a0]/75" style={{ fontSize: fs(7, 0.75, 13) }}>left</span>}
                                </span>
                                <span className={`font-black tabular-nums ${p.done ? 'text-emerald-400' : ''}`} style={{ fontSize: fs(9, 1.15, 22) }}>{score}</span>
                            </li>
                        ))}
                    </ol>

                    {/* The Final Trial's own Collected Clues card (the design's): each door's symbol in its row, its words on hover. */}
                    {ch.doorClues && ch.doorClues.map((b, i) => view.clues?.[i] && (
                        // One line in its row, sized to fit: a single symbol big, "☀2 ☾4 △6" small (2026-11-05: they ran into each other).
                        <span key={i} className="absolute z-30 hidden items-center justify-center overflow-hidden whitespace-nowrap font-black leading-none text-[#ffd97a] [text-shadow:0_0_8px_rgba(255,190,60,.9)] @min-[560px]:flex"
                            style={{ ...box(b), fontSize: fs(7, [...view.clues[i].glyph].length <= 1 ? 1.9 : [...view.clues[i].glyph].length <= 3 ? 1.35 : 0.85, 36) }} title={view.clues[i].text} data-door-clue={i}>{view.clues[i].glyph}</span>
                    ))}
                    {/* What clearing the chambers has given you. */}
                    {ch.clues && view.clues?.length > 0 && (
                        <section className={`absolute z-30 hidden flex-col items-center justify-center rounded-[0.8cqw] p-[0.5cqw] @min-[560px]:flex ${dark}`} style={box(ch.clues)} data-clues>
                            <p className="font-bold uppercase tracking-wider text-[#f4c55a]" style={{ ...cinzel, fontSize: fs(8, 1, 18) }}>Collected clues</p>
                            <div className="mt-[0.4cqw] flex flex-wrap justify-center gap-[0.4cqw]">
                                {view.clues.map((c) => <span key={c.label} title={c.text} className="rounded-[0.4cqw] border border-[#8a6a2f] bg-[#2a1c0b] px-[0.5cqw] py-[0.2cqw] font-bold text-[#ffd166]" style={{ fontSize: fs(8, 1, 18) }}>{c.glyph}</span>)}
                            </div>
                        </section>
                    )}


                    {/* The briefing, while the countdown runs. */}
                    {layer(view.phase === 'ready' && !over && (
                        <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]" data-briefing>
                            <div className="max-w-lg text-center text-[#f5e6c4]">
                                <h2 className="font-extrabold text-[#f4c55a]" style={{ ...cinzel, fontSize: fs(22, 3.4, 56) }}>The Final Vault</h2>
                                <p className="mt-2" style={{ fontSize: fs(13, 1.3, 20) }}>Solve 5 puzzles to open the treasure vault. Everyone gets the same puzzles. The first to open the vault wins. A wrong answer adds {view.penalty} seconds to your time.</p>
                                <p className="mt-3 font-black tabular-nums" style={{ ...cinzel, fontSize: fs(30, 5, 80) }}>{Math.max(1, secondsLeft)}</p>
                                {!prefs.started && <button type="button" onClick={() => audio.start()} className={`${goldButton} mt-3 px-6 py-2.5`} style={{ fontSize: fs(12, 1.1, 18) }}>🔊 Start with sound</button>}
                            </div>
                        </div>
                    ))}
                    {!prefs.started && playing && <button type="button" onClick={() => audio.start()} className="absolute bottom-3 left-1/2 z-40 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-black text-slate-900 shadow">🔊 Tap for sound</button>}

                    {/* Between puzzles: the chamber blurred and a word on what comes next, until the next one is up. */}
                    {(phase === 'unlock' || phase === 'travel') && !me?.done && (
                        <div className="absolute inset-0 z-[45] flex flex-col items-center justify-center bg-black/45 text-center backdrop-blur-md" role="status" aria-live="polite" data-moving-on>
                            <p className="font-extrabold text-[#7ee2a8] [text-shadow:0_2px_10px_rgba(0,0,0,.8)]" style={{ ...cinzel, fontSize: fs(16, 2.4, 44) }}>Correct!</p>
                            <p className="mt-[0.6cqw] font-bold text-[#ffe9a8] [text-shadow:0_2px_10px_rgba(0,0,0,.8)]" style={{ ...cinzel, fontSize: fs(13, 1.8, 34) }}>
                                {stage >= 5 ? 'Opening the vault…' : `Moving to Puzzle ${stage + 1}…`}
                            </p>
                            <span className="mt-[1.2cqw] h-[0.35cqw] min-h-1 w-[18cqw] overflow-hidden rounded-full bg-white/15"><span className="block h-full w-1/2 animate-pulse rounded-full bg-[#f4c55a]" /></span>
                        </div>
                    )}
                    {/* What just happened. */}
                    {layer(toast && (
                        <div className="pointer-events-none absolute inset-x-0 top-[40%] z-40 flex justify-center px-4" data-toast>
                            <p className={`rounded-2xl px-4 py-2.5 text-center font-black text-white shadow-xl ${toast.bad ? 'bg-rose-800/90' : 'bg-emerald-700/90'}`} style={{ fontSize: fs(12, 1.2, 20) }}>{toast.text}</p>
                        </div>
                    ))}

                    {/* All five solved: the approved "Vault opened" picture over the whole chamber, at once (2026-11-05) —
                        only for whoever has opened it. Their time, and while the others still play, when the results come,
                        in the blank band of its banner. */}
                    {/* Time up without opening the vault — the clock at zero, or the match over: the approved "Time up · You lost"
                        picture over the whole chamber, for those players only (2026-11-05). */}
                    {me && !me.done && !wonAnyway && (over || (view.phase === 'play' && left <= 0)) && (
                        <div className="absolute inset-0 z-[60] overflow-hidden bg-black" style={{ animation: 'fv-arrive .8s ease-out both' }} data-time-up>
                            <img src={`${import.meta.env.BASE_URL || '/'}games/finalvault/vault-timeup.jpg`} alt="Time up. You lost." className="absolute inset-0 h-full w-full object-cover" />
                        </div>
                    )}
                    {me?.done && (
                        <div className="absolute inset-0 z-[60] overflow-hidden bg-black" style={{ animation: 'fv-arrive .8s ease-out both' }} data-vault-open>
                            <img src={`${import.meta.env.BASE_URL || '/'}games/finalvault/vault-opened.jpg`} alt="Vault opened! Congratulations — you solved all the puzzles and unlocked the Final Vault." className="absolute inset-0 h-full w-full object-cover" />
                            <div className="absolute left-1/2 flex -translate-x-1/2 flex-col items-center text-center" style={{ top: '85.6%', width: '46%' }} data-vault-open-time>
                                {myTime != null && <p className="font-bold text-[#ffe9a8]" style={{ ...cinzel, fontSize: fs(10, 1.45, 26) }}>Your time {fmt(myTime)}{me.penaltyMs ? ` (with +${Math.round(me.penaltyMs / 1000)}s)` : ''}</p>}
                                {!over && <p className="mt-[0.2cqw] text-white/85" style={{ fontSize: fs(9, 1.05, 18) }}>Waiting for the others… results in {fmt(left)}</p>}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── The puzzle ── */}
                {showPuzzle && (
                    <Puzzle key={cur.index} cur={cur} box={ch.panel} wall={ch.wall} focus={phoneFocus(ch)} label={`Puzzle ${cur.index + 1}`} audio={audio}
                        onSubmit={submit} disabled={!view.canPlay || busy || jammed} shake={shake > 0 && jammed} />
                )}
            </div>
            )}

            {/* On a phone: the standings and the clues, under the chamber. */}
            <section className={`rounded-2xl bg-[#1d140a] p-3 text-[#f5e6c4] ring-1 ring-[#b8893a]/50 ${wide ? 'hidden' : ''}`} aria-label="Standings" data-vault-standings>
                {standings.map(({ s, i, p, score }, rank) => (
                    <div key={i} className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-base ${view.you === i ? 'bg-[#f4c55a]/10' : ''}`}>
                        <span className="w-4 text-center text-xs font-black">{rank + 1}</span>
                        <span className="h-3 w-3 rounded-full" style={{ background: s.color }} aria-hidden="true" />
                        <span className={`min-w-0 flex-1 truncate font-bold ${p.done ? 'text-emerald-400' : ''}`}>{view.you === i ? 'You' : s.name}</span>
                        <span className={`w-12 text-right font-black tabular-nums ${p.done ? 'text-emerald-400' : ''}`}>{score}</span>
                    </div>
                ))}
                {view.clues?.length > 0 && <p className="mt-2 break-words border-t border-[#b8893a]/30 px-1 pt-2 text-sm">Clues: {view.clues.map((c) => `${c.label} ${c.glyph}`).join(' · ')}</p>}
            </section>

            {/* Once it is over: every chamber, solved. */}
            {over && view.review && (
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" data-review>
                    <h3 className="text-base font-black text-slate-900">The chambers, solved</h3>
                    <ol className="mt-3 grid gap-2 sm:grid-cols-2">
                        {view.review.map((r, i) => (
                            <li key={i} className="rounded-xl bg-slate-50 p-3 text-sm">
                                <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Puzzle {i + 1} · {r.title}</p>
                                <p className="mt-1 text-slate-800"><CheckCircle2 size={14} className="mr-1 inline text-emerald-600" aria-hidden="true" />{r.solution}</p>
                            </li>
                        ))}
                    </ol>
                </section>
            )}
                    </div>
        )}
        {layout === 'turn-upright' && <RotatePrompt to="portrait" onCancel={() => setUpright(false)} />}
        </>
    );
}

