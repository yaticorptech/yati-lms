import { useRef, useState } from 'react';
import { fs, serif, darkPanel, SYMBOL_NAMES } from './style';
import { Map as MapIcon, ScrollText, Backpack, Pause, X, Play, RotateCcw, LogOut, Volume2, VolumeX, Music, CheckCircle2, Lock } from 'lucide-react';

/**
 * The Lost Kingdom's screen pieces, in the look of its six pictures: the
 * parchment title plaque with its compass, the round gold-rimmed buttons
 * (Map, Clues, Inventory, Pause; Jump, Slide, Interact), the stick, the five
 * symbols of the final gate, and the menus those buttons open.
 */

/** The compass rose of the title plaque. */
const Compass = ({ className = '' }) => (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
        <circle cx="50" cy="50" r="47" fill="#1d150b" stroke="#c9a45a" strokeWidth="4" />
        <circle cx="50" cy="50" r="38" fill="none" stroke="#8a6a2f" strokeWidth="1.5" />
        <path d="M50 8 L56 44 L92 50 L56 56 L50 92 L44 56 L8 50 L44 44 Z" fill="#e7c477" stroke="#6b4a1a" strokeWidth="1" />
        <path d="M50 22 L53 47 L78 50 L53 53 L50 78 L47 53 L22 50 L47 47 Z" fill="#b8893a" opacity="0.85" />
        <circle cx="50" cy="50" r="4" fill="#3b2610" />
    </svg>
);

/** "The Lost Kingdom / Trial n : name" on parchment. */
export const TitlePlaque = ({ line, style, className = '' }) => (
    <div className={`absolute z-30 flex items-center ${className}`} style={style} data-plaque>
        <span className="relative z-10 shrink-0 drop-shadow-lg" style={{ width: 'clamp(44px, 5.6cqw, 96px)', height: 'clamp(44px, 5.6cqw, 96px)', marginRight: 'calc(-1 * clamp(10px, 1.2cqw, 22px))' }}><Compass className="h-full w-full" /></span>
        <div className="min-w-0 flex-1 rounded-r-lg border border-[#8a6a2f] text-[#2a1d0c] shadow-lg" style={{ background: 'linear-gradient(#efe2c2, #d9c39a)', padding: 'clamp(4px, .6cqw, 12px) clamp(8px, 1.2cqw, 22px) clamp(4px, .6cqw, 12px) clamp(14px, 1.8cqw, 32px)' }}>
            <p className="font-bold leading-tight" style={{ ...serif, fontSize: fs(12, 1.75, 30) }}>The Lost Kingdom</p>
            <p className="leading-tight" style={{ ...serif, fontSize: fs(9, 1.15, 20) }}>{line}</p>
        </div>
    </div>
);

/** A round, gold-rimmed button with its label under it. */
export const RoundIcon = ({ icon: Icon, label, onClick, size = 4.2, active = false }) => (
    <button type="button" onClick={onClick} className="group flex flex-col items-center gap-[0.2cqw]" aria-label={label} data-hud-button={label.toLowerCase()}>
        <span className={`flex items-center justify-center rounded-full border-2 bg-gradient-to-b from-[#3a2a17] to-[#120c06] text-[#e9d3a0] shadow-[0_4px_10px_rgba(0,0,0,.6)] transition group-hover:text-white ${active ? 'border-amber-300 ring-2 ring-amber-400/60' : 'border-[#c9a45a]'}`}
            style={{ width: `clamp(38px, ${size}cqw, 80px)`, height: `clamp(38px, ${size}cqw, 80px)` }}>
            <Icon style={{ width: '48%', height: '48%' }} />
        </span>
        <span className="font-semibold text-[#f3e6c8] [text-shadow:0_1px_3px_#000]" style={{ ...serif, fontSize: fs(9, 1, 17) }}>{label}</span>
    </button>
);

/** The four buttons at the top right. */
export const TopIcons = ({ style, onMap, onClues, onInventory, onPause, counts = {} }) => (
    <div className="absolute z-30 flex items-start justify-end gap-[1.1cqw]" style={style} data-top-icons>
        <RoundIcon icon={MapIcon} label="Map" onClick={onMap} />
        <span className="relative"><RoundIcon icon={ScrollText} label="Clues" onClick={onClues} />{counts.clues > 0 && <Badge n={counts.clues} />}</span>
        <span className="relative"><RoundIcon icon={Backpack} label="Inventory" onClick={onInventory} />{counts.relics > 0 && <Badge n={counts.relics} />}</span>
        <RoundIcon icon={Pause} label="Pause" onClick={onPause} />
    </div>
);
const Badge = ({ n }) => <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[11px] font-black text-black">{n}</span>;

/** The action button at the bottom right: a runner figure, and its word (Jump, Slide, Interact). */
export const ActionButton = ({ label, onPress, style, icon = 'run' }) => (
    <button type="button" onPointerDown={(e) => { e.preventDefault(); onPress(); }} className="absolute z-30 flex flex-col items-center justify-center rounded-full border-[3px] border-[#d9c7a0]/80 bg-gradient-to-b from-[#2a241d]/90 to-[#0c0a07]/90 text-[#e9dcc0] shadow-[0_0_0_4px_rgba(0,0,0,.35)] active:scale-95"
        style={{ width: 'clamp(64px, 10cqw, 190px)', height: 'clamp(64px, 10cqw, 190px)', ...style }} aria-label={label} data-action={label.toLowerCase()}>
        <svg viewBox="0 0 64 64" style={{ width: '50%', height: '50%' }} aria-hidden="true">
            {icon === 'slide'
                ? <g fill="currentColor"><circle cx="46" cy="22" r="6" /><path d="M10 46 L40 30 L50 34 L46 40 L36 38 L20 50 Z" /><rect x="6" y="52" width="52" height="4" rx="2" /></g>
                : <g fill="currentColor"><circle cx="40" cy="10" r="6" /><path d="M34 18 L22 30 L28 34 L34 28 L36 40 L26 54 L32 56 L42 42 L48 50 L54 46 L44 34 L44 22 L54 26 L56 20 L42 16 Z" /><path d="M20 32 L8 36 L10 40 L24 36 Z" /></g>}
        </svg>
        <span className="mt-[0.2cqw]" style={{ ...serif, fontSize: fs(10, 1.4, 24) }}>{label}</span>
    </button>
);

/**
 * The stick: drag it. `onMove({ x, y })` while held (−1..1, y up is negative);
 * `onFlick(dir)` once per push past the rim ('left' | 'right' | 'up' | 'down').
 */
export const Stick = ({ style, onFlick, onMove }) => {
    const [knob, setKnob] = useState({ x: 0, y: 0 });
    const ref = useRef(null);
    const latch = useRef(null);
    const move = (e) => {
        if (!ref.current) return;
        const { x, y, r } = ref.current;
        let dx = e.clientX - x; let dy = e.clientY - y;
        const d = Math.hypot(dx, dy); if (d > r) { dx *= r / d; dy *= r / d; }
        setKnob({ x: dx, y: dy }); onMove?.({ x: dx / r, y: dy / r });
        const nx = dx / r; const ny = dy / r;
        const dir = Math.abs(nx) > Math.abs(ny) ? (nx > 0.55 ? 'right' : nx < -0.55 ? 'left' : null) : (ny > 0.55 ? 'down' : ny < -0.55 ? 'up' : null);
        if (dir && latch.current !== dir) { latch.current = dir; onFlick?.(dir); }
        if (Math.hypot(nx, ny) < 0.3) latch.current = null;
    };
    const end = () => { ref.current = null; latch.current = null; setKnob({ x: 0, y: 0 }); onMove?.({ x: 0, y: 0 }); };
    return (
        <div className="absolute z-30 touch-none select-none rounded-full border-[3px] border-[#d9c7a0]/70 bg-gradient-to-b from-[#3a3128]/80 to-[#15110c]/85 shadow-[0_0_0_4px_rgba(0,0,0,.3),inset_0_0_24px_rgba(0,0,0,.6)]"
            style={{ width: 'clamp(96px, 13cqw, 250px)', height: 'clamp(96px, 13cqw, 250px)', ...style }} data-stick aria-label="Move"
            onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); const b = e.currentTarget.getBoundingClientRect(); ref.current = { x: b.left + b.width / 2, y: b.top + b.height / 2, r: b.width * 0.32 }; move(e); }}
            onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
            {['▲', '▼', '◀', '▶'].map((a, i) => <span key={a} className="absolute text-[#d9c7a0]" style={{ fontSize: fs(10, 1.2, 20), ...[{ top: '6%', left: '50%', transform: 'translateX(-50%)' }, { bottom: '6%', left: '50%', transform: 'translateX(-50%)' }, { left: '7%', top: '50%', transform: 'translateY(-50%)' }, { right: '7%', top: '50%', transform: 'translateY(-50%)' }][i] }}>{a}</span>)}
            <span className="absolute left-1/2 top-1/2 h-[42%] w-[42%] rounded-full bg-gradient-to-b from-[#8f8a82] to-[#3b3732] shadow-lg" style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }} />
        </div>
    );
};

/** The final gate's symbols: Sun, Leaf, Moon, Bird, Key. */
export const Symbol = ({ name, className = 'h-full w-full' }) => (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label={SYMBOL_NAMES[name]} style={{ filter: 'drop-shadow(0 0 4px rgba(251,191,36,.45))' }}>
        {name === 'sun' && <g fill="#f7c64b" stroke="#8a5a12" strokeWidth="1">{Array.from({ length: 12 }, (_, i) => <path key={i} d="M24 3 L26.5 11 L21.5 11 Z" transform={`rotate(${i * 30} 24 24)`} />)}<circle cx="24" cy="24" r="10" /></g>}
        {name === 'leaf' && <g><path d="M8 40 C8 18 22 6 42 6 C42 28 30 40 8 40 Z" fill="#5fb548" stroke="#2f6b22" strokeWidth="1.5" /><path d="M10 38 L36 12" stroke="#2f6b22" strokeWidth="2" /></g>}
        {name === 'moon' && <path d="M30 4 A20 20 0 1 0 44 34 A16 16 0 1 1 30 4 Z" fill="#f2d27a" stroke="#8a6a12" strokeWidth="1.2" />}
        {name === 'bird' && <path d="M4 18 C12 14 18 18 22 24 C26 14 36 8 46 10 C38 14 34 20 30 28 L36 40 L28 34 L22 40 L22 30 C16 28 10 24 4 18 Z" fill="#e7c477" stroke="#7a5a1a" strokeWidth="1.2" />}
        {name === 'key' && <g fill="none" stroke="#e7c477" strokeWidth="4" strokeLinecap="round"><circle cx="14" cy="14" r="8" /><path d="M20 20 L42 42 M34 34 L38 30 M38 38 L42 34" /></g>}
    </svg>
);

/** A menu over the game (Map, Clues, Inventory, Pause). */
export const Sheet = ({ title, onClose, children, wide = false }) => (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/65 p-3 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
        <div onClick={(e) => e.stopPropagation()} className={`max-h-[88vh] w-full overflow-y-auto rounded-2xl p-5 ${wide ? 'max-w-2xl' : 'max-w-md'} ${darkPanel}`}>
            <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xl font-bold text-[#e7c477]" style={serif}>{title}</h2>
                <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-[#e9dcc0] hover:bg-white/10"><X size={20} /></button>
            </div>
            {children}
        </div>
    </div>
);

/** The map: the five regions and the treasure, which are behind you, where you are. */
export const MapSheet = ({ run, at, onClose }) => (
    <Sheet title="Expedition map" onClose={onClose}>
        <ol className="relative space-y-3 border-l-2 border-dashed border-[#c9a45a]/60 pl-5" data-map>
            {[...run.trials.map((t) => ({ title: `Trial ${t.index + 1}: ${t.title}`, region: t.region, done: t.solved })), { title: 'The Treasure of Aurelia', region: 'The treasure chamber', done: run.done }].map((r, i) => (
                <li key={r.title} className="relative">
                    <span className={`absolute -left-[1.85rem] top-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 ${r.done ? 'border-emerald-400 bg-emerald-600' : i === at ? 'border-amber-300 bg-amber-500 animate-pulse' : 'border-[#8a6a2f] bg-[#2a1d0c]'}`}>
                        {r.done ? <CheckCircle2 size={13} /> : i === at ? '●' : <Lock size={11} />}
                    </span>
                    <p className={`font-bold ${i === at ? 'text-amber-300' : ''}`} style={serif}>{r.title}</p>
                    <p className="text-xs text-[#c9b48a]">{r.region}{i === at ? ' — you are here' : ''}</p>
                </li>
            ))}
        </ol>
    </Sheet>
);

/** The journal: every clue collected, and what each trial taught. */
export const CluesSheet = ({ run, onClose }) => {
    const clues = run.trials.filter((t) => t.clue);
    return (
        <Sheet title="Explorer's journal" onClose={onClose} wide>
            {!clues.length && <p className="text-sm text-[#c9b48a]">No clues yet. Each trial you solve adds a clue for the final gate.</p>}
            <ol className="space-y-2" data-journal>
                {clues.map((t) => (
                    <li key={t.index} className="rounded-xl bg-white/5 p-3">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#c9a45a]">From Trial {t.index + 1}: {t.title}</p>
                        <p className="mt-0.5 font-semibold">📜 {t.clue}</p>
                        {t.explain && <p className="mt-1 text-xs text-[#c9b48a]">{t.explain}</p>}
                    </li>
                ))}
            </ol>
        </Sheet>
    );
};

/** The relics collected on the way. */
export const InventorySheet = ({ run, onClose }) => {
    const relics = run.trials.filter((t) => t.relic);
    return (
        <Sheet title="Inventory" onClose={onClose}>
            <div className="grid grid-cols-3 gap-2" data-inventory>
                {run.trials.map((t) => (
                    <div key={t.index} className={`flex flex-col items-center rounded-xl p-3 text-center ${t.relic ? 'bg-amber-500/15 ring-1 ring-amber-400/40' : 'bg-white/5 opacity-50'}`}>
                        <span className="text-3xl">{t.relic ? t.relic.icon : '❔'}</span>
                        <span className="mt-1 text-xs font-bold">{t.relic ? t.relic.name : `Trial ${t.index + 1}`}</span>
                    </div>
                ))}
            </div>
            <p className="mt-3 text-xs text-[#c9b48a]">{relics.length} of 5 relics · {run.trials.filter((t) => t.clue).length} clues in your journal</p>
        </Sheet>
    );
};

/** Paused: resume, restart, the sound, or leave. */
export const PauseSheet = ({ prefs, audio, onResume, onRestart, onExit, exitLabel = 'Exit to Games', title = 'Paused', note = null }) => (
    <Sheet title={title} onClose={onResume}>
        {note && <p className="mb-3 text-sm text-[#c9b48a]">{note}</p>}
        <div className="space-y-2" data-pause>
            <button type="button" onClick={onResume} className="flex w-full items-center gap-2 rounded-xl bg-gradient-to-b from-[#e0ab48] to-[#93631a] px-4 py-3 font-black text-white"><Play size={18} /> Resume</button>
            {onRestart && <button type="button" onClick={onRestart} className="flex w-full items-center gap-2 rounded-xl bg-white/10 px-4 py-3 font-bold hover:bg-white/15"><RotateCcw size={18} /> Restart with a new expedition</button>}
            <div className="rounded-xl bg-white/5 p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#c9a45a]">Settings</p>
                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => { audio.start(); audio.set({ muted: !prefs.muted }); }} className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm font-bold">{prefs.muted ? <VolumeX size={16} /> : <Volume2 size={16} />} Sound {prefs.muted ? 'off' : 'on'}</button>
                    <button type="button" onClick={() => { audio.start(); audio.set({ music: !prefs.music }); }} className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm font-bold"><Music size={16} /> Music {prefs.music ? 'on' : 'off'}</button>
                    <button type="button" onClick={() => { audio.start(); audio.set({ sfx: prefs.sfx === false }); }} className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm font-bold">Effects {prefs.sfx === false ? 'off' : 'on'}</button>
                </div>
                <label className="mt-2 block text-sm font-bold">Volume
                    <input type="range" min={0} max={1} step={0.05} value={prefs.volume} onChange={(e) => { audio.start(); audio.set({ volume: Number(e.target.value), muted: false }); }} className="mt-1 w-full accent-amber-400" /></label>
            </div>
            <button type="button" onClick={onExit} className="flex w-full items-center gap-2 rounded-xl bg-white/5 px-4 py-3 font-bold text-rose-200 hover:bg-white/10"><LogOut size={18} /> {exitLabel}</button>
        </div>
    </Sheet>
);
