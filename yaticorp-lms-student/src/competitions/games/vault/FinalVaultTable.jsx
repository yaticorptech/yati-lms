import { useEffect, useMemo, useRef, useState } from 'react';
import { Volume2, VolumeX, Music, Settings, Hourglass, Lock, Landmark, CheckCircle2 } from 'lucide-react';
import usePhaseClock from '../usePhaseClock';
import createAudio from '../adventure/audio';
import { Glyph } from './glyphs';
import { SequencePuzzle, RingsPuzzle, CodePuzzle, MirrorsPuzzle, FinalPuzzle } from './puzzles';
import { fs, goldButton } from './style';
import ChamberPhoto from './ChamberPhoto';

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
const IMG = (n) => `${import.meta.env.BASE_URL || '/'}games/finalvault/chamber${n}.jpg`;

// Where things are in each chamber's picture, in % of its width and height:
// the game's HUD where the picture had its own, and `holes`, the picture's own
// panels cut out (ChamberPhoto) so nothing shows twice.
const HOLES_1 = [[1.5, 0.5, 24, 11], [1.8, 11.5, 20, 28.5], [28.5, 0, 46.5, 12], [76.5, 1.5, 22.5, 8.5], [64.5, 44.5, 34.5, 48.5]];
const CHAMBERS = [
    {
        img: IMG(1), theme: 'vault-temple', subtitle: 'The Ancient Lock', holes: HOLES_1,
        plaque: { l: 2.4, t: 1.6, w: 22, h: 9.4 }, board: { l: 2.6, t: 13, w: 18.4, h: 26.2 },
        tracker: { l: 29.2, t: 1.4, w: 45.2, h: 11 }, timer: { l: 77.2, t: 2.4, w: 10, h: 6.6 }, sound: { l: 88.1, t: 2.4, w: 10.1, h: 6.6 },
        panel: { l: 65.2, t: 45.8, w: 32.8, h: 46.4 },
        hotspot: { x: 66, y: 39 }, dolly: { x: 66, y: 42 }
    },
    {
        img: IMG(2), theme: 'vault-mechanism', subtitle: 'The Hidden Mechanism',
        holes: [[0.8, 1.5, 23.5, 10.5], [1, 13, 19.5, 27], [27.5, 1.5, 44, 12.5], [75.5, 2.5, 22.5, 8.5], [69, 45, 30, 42], [3.5, 71, 13.5, 22.5], [89, 85, 8.5, 13]],
        plaque: { l: 1.6, t: 2.6, w: 22, h: 9.4 }, board: { l: 1.6, t: 14.2, w: 18.2, h: 25.6 },
        tracker: { l: 28.2, t: 2.4, w: 42.8, h: 11 }, timer: { l: 76.3, t: 3.4, w: 10, h: 6.6 }, sound: { l: 87.3, t: 3.4, w: 10, h: 6.6 },
        panel: { l: 69.4, t: 46, w: 28.8, h: 40.4 }, clues: { l: 1.6, t: 42.5, w: 15.8, h: 12.6 }, joystick: { x: 10, y: 82.2 },
        hotspot: { x: 56, y: 80 }, dolly: { x: 39, y: 34 }
    },
    {
        img: IMG(3), theme: 'vault-code', subtitle: 'The Secret Code',
        holes: [[0.8, 1.5, 23.5, 10.5], [0.8, 13, 19.5, 25.5], [27.5, 1.5, 44, 12.5], [75.8, 2.5, 22.5, 8.5], [68, 60.5, 30.5, 31.5], [1, 41.5, 17, 14], [3, 70, 13.5, 23], [89.5, 82.5, 8.5, 14], [79, 14.5, 18.5, 44.5], [50.3, 43, 6.6, 23], [58.1, 43, 6.6, 23], [66.7, 43, 6.6, 23]],
        plaque: { l: 1.4, t: 2.6, w: 22, h: 9.6 }, board: { l: 1.4, t: 14, w: 18.4, h: 25 },
        tracker: { l: 28.2, t: 2.6, w: 43, h: 10.8 }, timer: { l: 76.6, t: 3.6, w: 10.2, h: 6.6 }, sound: { l: 87.8, t: 3.6, w: 10, h: 6.6 },
        panel: { l: 68.4, t: 61.4, w: 29.6, h: 30 }, clues: { l: 1.7, t: 42.6, w: 15.8, h: 12.6 },
        wall: { mural: { l: 79.6, t: 15.4, w: 17, h: 42.6 }, dials: [{ x: 53.6, y: 54.4 }, { x: 61.4, y: 54.4 }, { x: 70, y: 54.4 }] },
        joystick: { x: 9.5, y: 81.6 }, hotspot: { x: 61.5, y: 50 }, dolly: { x: 61.5, y: 60 }
    },
    {
        img: IMG(4), theme: 'vault-light', subtitle: 'The Light Path',
        holes: [[0.8, 1.5, 23.5, 10.5], [0.8, 13, 19.5, 25.5], [27.5, 1.5, 44, 12.5], [76.3, 2.2, 22.5, 8.5], [44.5, 63, 37.5, 30], [1, 41, 17.5, 26.5], [3, 70, 13.5, 23], [90, 80, 9, 14], [90.5, 65.5, 9, 12]],
        plaque: { l: 1.6, t: 2.6, w: 22, h: 9.6 }, board: { l: 1.6, t: 14, w: 18.4, h: 25 },
        tracker: { l: 28.4, t: 2.6, w: 43, h: 10.8 }, timer: { l: 77.2, t: 3.4, w: 10, h: 6.6 }, sound: { l: 87.7, t: 3.4, w: 10.2, h: 6.6 },
        panel: { l: 45.2, t: 63.6, w: 36, h: 28.4 }, wall: { l: 1.7, t: 42, w: 16.6, h: 24.8 }, joystick: { x: 9.5, y: 81.3 },
        hotspot: { x: 60.4, y: 47 }, dolly: { x: 79, y: 30 }
    },
    {
        // The vault door from the first chamber, close up, lit red for the last puzzle.
        img: IMG(1), theme: 'vault-final', subtitle: 'The Final Trial', holes: HOLES_1, zoom: { s: 1.65, x: 66, y: 39, dx: -20 }, tint: true,
        plaque: { l: 2.4, t: 1.6, w: 22, h: 9.4 }, board: { l: 2.6, t: 13, w: 18.4, h: 26.2 },
        tracker: { l: 29.2, t: 1.4, w: 45.2, h: 11 }, timer: { l: 77.2, t: 2.4, w: 10, h: 6.6 }, sound: { l: 88.1, t: 2.4, w: 10.1, h: 6.6 },
        panel: { l: 66, t: 17, w: 32, h: 79 }, clues: { l: 2.6, t: 42, w: 18.4, h: 14 }, joystick: { x: 9.5, y: 82 },
        hotspot: { x: 46, y: 39 }, dolly: { x: 46, y: 40 }
    }
];
const PUZZLES = { sequence: SequencePuzzle, rings: RingsPuzzle, code: CodePuzzle, mirrors: MirrorsPuzzle, final: FinalPuzzle };
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

/** The stick: drag to look around the chamber. */
function Stick({ at, onMove }) {
    const [knob, setKnob] = useState({ x: 0, y: 0 });
    const origin = useRef(null);
    const move = (e) => {
        if (!origin.current) return;
        const r = origin.current.r; let dx = e.clientX - origin.current.x; let dy = e.clientY - origin.current.y;
        const d = Math.hypot(dx, dy); if (d > r) { dx *= r / d; dy *= r / d; }
        setKnob({ x: dx, y: dy }); onMove({ x: dx / r, y: dy / r });
    };
    const end = () => { origin.current = null; setKnob({ x: 0, y: 0 }); onMove({ x: 0, y: 0 }); };
    return (
        <div className="absolute z-30 -translate-x-1/2 -translate-y-1/2 touch-none select-none rounded-full border-2 border-[#d9c7a0]/60 bg-gradient-to-b from-[#3a3128]/90 to-[#15110c]/90 shadow-[0_0_0_3px_rgba(0,0,0,.35),inset_0_0_20px_rgba(0,0,0,.6)]"
            style={{ left: `${at.x}%`, top: `${at.y}%`, width: 'clamp(84px, 11.4cqw, 230px)', height: 'clamp(84px, 11.4cqw, 230px)' }} data-stick aria-label="Look around"
            onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); const b = e.currentTarget.getBoundingClientRect(); origin.current = { x: b.left + b.width / 2, y: b.top + b.height / 2, r: b.width * 0.32 }; move(e); }}
            onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
            {['▲', '▼', '◀', '▶'].map((a, i) => <span key={a} className="absolute text-[#d9c7a0]" style={{ fontSize: 'clamp(9px, 1cqw, 18px)', ...[{ top: '6%', left: '50%', transform: 'translateX(-50%)' }, { bottom: '6%', left: '50%', transform: 'translateX(-50%)' }, { left: '7%', top: '50%', transform: 'translateY(-50%)' }, { right: '7%', top: '50%', transform: 'translateY(-50%)' }][i] }}>{a}</span>)}
            <span className="absolute left-1/2 top-1/2 h-[40%] w-[40%] rounded-full bg-gradient-to-b from-[#9b958c] to-[#4b4640] shadow-lg" style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }} />
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
                later(1400, () => { setPhase('travel'); [0, 330, 660, 990].forEach((t) => later(t, () => audio.sfx('step'))); });
                later(2700, () => { setShown(me.stage); setPhase('arrive'); audio.setTheme(CHAMBERS[me.stage].theme); });
                later(3600, () => setPhase('idle'));
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

    // Looking around (the stick).
    const [look, setLook] = useState({ x: 0, y: 0 });

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

    // The camera: looking around with the stick, walking on into the next chamber.
    const cam = phase === 'travel' ? 'scale(1.9)' : `translate(${-look.x * 2}%, ${-look.y * 1.5}%) scale(1.04)`;

    return (
        <div className="mx-auto w-full max-w-[1500px] space-y-4" data-vault data-phase={view.phase} data-chamber={shown} onPointerDown={() => { if (!prefs.started) audio.start(); }}>
            <style>{CSS}</style>
            <div className="relative md:aspect-[2000/1120]" style={{ containerType: 'inline-size' }}>
                {/* ── The chamber ── */}
                <div className="relative aspect-[2000/1120] w-full overflow-hidden rounded-2xl bg-black shadow-2xl md:absolute md:inset-0 md:aspect-auto" data-scene>
                    <div className="absolute inset-0" style={{ transform: ch.zoom ? `translateX(${ch.zoom.dx}%) scale(${ch.zoom.s})` : 'none', transformOrigin: ch.zoom ? `${ch.zoom.x}% ${ch.zoom.y}%` : '50% 50%' }}>
                        <div className="absolute inset-0" style={{ transform: cam, transformOrigin: `${ch.dolly.x}% ${ch.dolly.y}%`, transition: phase === 'travel' ? 'transform 1.3s cubic-bezier(.55,0,.8,.4), filter 1.3s' : 'transform .9s ease', filter: phase === 'travel' ? 'brightness(1.35) blur(1.5px)' : 'none' }}>
                            <div key={shown} className="absolute inset-0" style={{ animation: phase === 'arrive' ? 'fv-arrive .9s ease-out both' : 'fv-breathe 18s ease-in-out infinite alternate' }}>
                                <ChamberPhoto src={ch.img} holes={ch.holes} id={shown} />
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
                    <div className={`absolute z-30 flex flex-col items-center justify-center rounded-[0.6cqw] border-2 border-[#b8893a] ${dark}`} style={box(ch.plaque)} data-plaque>
                        <p className="font-extrabold leading-none text-[#f4c55a] [text-shadow:0_2px_0_#5a3a0c]" style={{ ...cinzel, fontSize: fs(11, 2.6, 52) }}>THE FINAL VAULT</p>
                        <p className="mt-[0.4cqw] font-bold uppercase leading-none text-[#f5e6c4]" style={{ ...cinzel, fontSize: fs(7, 1.05, 21) }}>Stage {Math.min(shown + 1, 5)} - {ch.subtitle}</p>
                    </div>
                    <div className="absolute z-30" style={box(ch.tracker)} aria-label="Chambers" data-tracker>
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
                    <div className={`absolute z-30 flex items-center justify-center gap-[0.5cqw] rounded-full ${dark} ${playing && share < 0.25 ? 'animate-pulse border-rose-500' : ''}`} style={box(ch.timer)} data-timer>
                        <Hourglass className="text-[#f4c55a]" style={{ width: fs(12, 2, 40), height: fs(12, 2, 40) }} />
                        <span className="font-black tabular-nums" style={{ fontSize: fs(12, 2.4, 48) }}>{view.phase === 'ready' ? `0:0${Math.max(1, secondsLeft)}` : fmt(left)}</span>
                    </div>
                    {me?.penaltyMs > 0 && <span className="absolute z-30 rounded-full bg-rose-700/90 px-[0.8cqw] font-black text-white" style={{ left: `${ch.timer.l + 1}%`, top: `${ch.timer.t + ch.timer.h + 0.8}%`, fontSize: fs(9, 0.95, 16) }} data-penalty>+{Math.round(me.penaltyMs / 1000)}s penalty</span>}
                    <SoundBar audio={audio} prefs={prefs} style={box(ch.sound)} />

                    {/* The standings (a phone has them under the chamber). */}
                    <ol className={`absolute z-30 hidden flex-col justify-start overflow-hidden rounded-[0.8cqw] p-[0.5cqw] md:flex ${dark}`} style={box(ch.board)} aria-label="Standings" data-race>
                        {standings.map(({ s, i, p, score }, rank) => (
                            <li key={i} className={`flex items-center gap-[0.6cqw] border-b border-[#b8893a]/20 px-[0.5cqw] last:border-0 ${view.you === i ? 'bg-[#f4c55a]/10' : ''} ${p.left ? 'opacity-45' : ''}`} style={{ height: `${100 / Math.max(5, standings.length)}%` }} data-racer={i}>
                                <span className={`flex shrink-0 items-center justify-center rounded-full font-black ${['bg-[#e0ab48] text-[#2a1c0b]', 'bg-[#9ca3af] text-[#111]', 'bg-[#c2703d] text-white'][rank] || 'text-[#f5e6c4]'}`} style={{ width: fs(14, 1.6, 30), height: fs(14, 1.6, 30), fontSize: fs(8, 0.95, 17) }}>{rank + 1}</span>
                                <span className="flex shrink-0 items-center justify-center rounded-full border-2 font-black text-white" style={{ background: s.color, borderColor: rank === 0 ? '#f4c55a' : '#d9c7a0', width: fs(18, 2.4, 44), height: fs(18, 2.4, 44), fontSize: fs(8, 1.1, 20) }}>{(s.name || '?').trim().charAt(0).toUpperCase()}</span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate font-bold" style={{ fontSize: fs(9, 1.15, 22) }}>{s.name}{view.you === i ? ' (you)' : ''}</span>
                                    <span className="block text-[#d9c7a0]/75" style={{ fontSize: fs(7, 0.75, 13) }}>{p.left ? 'left' : p.done ? `vault open · ${fmt(view.times?.[i] ?? 0)}` : `chamber ${Math.min(p.at + 1, p.of)} of ${p.of}`}</span>
                                </span>
                                <span className="font-black tabular-nums" style={{ fontSize: fs(9, 1.15, 22) }}>{score}</span>
                            </li>
                        ))}
                    </ol>

                    {/* What clearing the chambers has given you. */}
                    {ch.clues && view.clues?.length > 0 && (
                        <section className={`absolute z-30 hidden flex-col items-center justify-center rounded-[0.8cqw] p-[0.5cqw] md:flex ${dark}`} style={box(ch.clues)} data-clues>
                            <p className="font-bold uppercase tracking-wider text-[#f4c55a]" style={{ ...cinzel, fontSize: fs(8, 1, 18) }}>Collected clues</p>
                            <div className="mt-[0.4cqw] flex flex-wrap justify-center gap-[0.4cqw]">
                                {view.clues.map((c) => <span key={c.label} title={c.text} className="rounded-[0.4cqw] border border-[#8a6a2f] bg-[#2a1c0b] px-[0.5cqw] py-[0.2cqw] font-bold text-[#ffd166]" style={{ fontSize: fs(8, 1, 18) }}>{c.glyph}</span>)}
                            </div>
                        </section>
                    )}

                    {/* Looking around. */}
                    {ch.joystick && <div className="hidden md:block"><Stick at={ch.joystick} onMove={setLook} /></div>}

                    {/* The briefing, while the countdown runs. */}
                    {view.phase === 'ready' && !over && (
                        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]" data-briefing>
                            <div className="max-w-lg text-center text-[#f5e6c4]">
                                <h2 className="font-extrabold text-[#f4c55a]" style={{ ...cinzel, fontSize: fs(22, 3.4, 56) }}>The Final Vault</h2>
                                <p className="mt-2" style={{ fontSize: fs(13, 1.3, 20) }}>Solve 5 puzzles to open the treasure vault. Everyone gets the same puzzles. The first to open the vault wins. A wrong answer adds {view.penalty} seconds to your time.</p>
                                <p className="mt-3 font-black tabular-nums" style={{ ...cinzel, fontSize: fs(30, 5, 80) }}>{Math.max(1, secondsLeft)}</p>
                                {!prefs.started && <button type="button" onClick={() => audio.start()} className={`${goldButton} mt-3 px-6 py-2.5`} style={{ fontSize: fs(12, 1.1, 18) }}>🔊 Start with sound</button>}
                            </div>
                        </div>
                    )}
                    {!prefs.started && playing && <button type="button" onClick={() => audio.start()} className="absolute bottom-3 left-1/2 z-40 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-black text-slate-900 shadow">🔊 Tap for sound</button>}

                    {/* What just happened. */}
                    {toast && (
                        <div className="pointer-events-none absolute inset-x-0 top-[40%] z-40 flex justify-center px-4" data-toast>
                            <p className={`rounded-2xl px-4 py-2.5 text-center font-black text-white shadow-xl ${toast.bad ? 'bg-rose-800/90' : 'bg-emerald-700/90'}`} style={{ fontSize: fs(12, 1.2, 20) }}>{toast.text}</p>
                        </div>
                    )}

                    {/* The vault opens. */}
                    {phase === 'open' && (
                        <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden" data-vault-open>
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_46%_39%,rgba(255,236,170,.85),rgba(255,180,60,.35)_35%,rgba(0,0,0,.55)_75%)]" style={{ animation: 'fv-glow 2.5s ease-in-out infinite' }} />
                            {Array.from({ length: 36 }, (_, i) => (
                                <span key={i} className="absolute rounded-full bg-gradient-to-b from-[#fff1b8] to-[#d99a1e] shadow-[0_0_6px_#ffd166]"
                                    style={{ left: `${(i * 29) % 100}%`, top: '-5%', width: `${0.6 + (i % 3) * 0.3}cqw`, height: `${0.6 + (i % 3) * 0.3}cqw`, animation: `fv-fall ${2.4 + (i % 5) * 0.5}s linear ${(i % 9) * 0.3}s infinite` }} />
                            ))}
                            <div className="absolute inset-x-0 top-[28%] text-center">
                                <p className="font-extrabold text-[#ffe9a8] [text-shadow:0_3px_12px_rgba(0,0,0,.8)]" style={{ ...cinzel, fontSize: fs(22, 4.4, 84) }}>The vault is open!</p>
                                {myTime != null && <p className="mt-2 font-bold text-white [text-shadow:0_2px_8px_rgba(0,0,0,.8)]" style={{ fontSize: fs(13, 1.6, 28) }}>Your time {fmt(myTime)}{me.penaltyMs ? ` (with +${Math.round(me.penaltyMs / 1000)}s penalties)` : ''}{!over ? ' · waiting for the others…' : ''}</p>}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── The puzzle ── */}
                {showPuzzle && (
                    <Puzzle key={cur.index} cur={cur} box={ch.panel} wall={ch.wall} label={`Puzzle ${cur.index + 1}`} audio={audio}
                        onSubmit={submit} disabled={!view.canPlay || busy || jammed} shake={shake > 0 && jammed} />
                )}
            </div>

            {/* On a phone: the standings and the clues, under the chamber. */}
            <section className="rounded-2xl bg-[#1d140a] p-3 text-[#f5e6c4] ring-1 ring-[#b8893a]/50 md:hidden" aria-label="Standings">
                {standings.map(({ s, i, p, score }, rank) => (
                    <div key={i} className={`flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm ${view.you === i ? 'bg-[#f4c55a]/10' : ''}`}>
                        <span className="w-4 text-center text-xs font-black">{rank + 1}</span>
                        <span className="h-3 w-3 rounded-full" style={{ background: s.color }} aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate font-bold">{s.name}{view.you === i ? ' (you)' : ''}</span>
                        <span className="text-[11px] text-[#d9c7a0]">{p.done ? '✓' : `${p.at}/${p.of}`}</span>
                        <span className="w-12 text-right font-black tabular-nums">{score}</span>
                    </div>
                ))}
                {view.clues?.length > 0 && <p className="mt-2 border-t border-[#b8893a]/30 pt-2 text-xs">Clues: {view.clues.map((c) => `${c.label} ${c.glyph}`).join(' · ')}</p>}
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
    );
}

