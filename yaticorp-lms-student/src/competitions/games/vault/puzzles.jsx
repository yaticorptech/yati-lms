import { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import { Glyph } from './glyphs';
import { fs, at, placed, tile, goldButton, GLYPH_TEXT, traceBeam } from './style';

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
        <section className={`${placed} z-20 mt-3 md:mt-0 ${shake ? 'fv-shake' : ''}`} style={at(box)} data-puzzle-panel>
            <div className="flex h-full flex-col overflow-y-auto rounded-[1cqw] border-[3px] border-[#3b2610] bg-gradient-to-b from-[#f4e5c2] via-[#ead39f] to-[#d9bb80] p-[1.3cqw] pt-[2.2cqw] text-[#3a250d] shadow-[0_10px_30px_rgba(0,0,0,.6),inset_0_0_0_2px_#b8893a,inset_0_0_25px_rgba(120,80,20,.35)] max-md:p-4 max-md:pt-6">
                {children}
            </div>
            <span className="absolute -top-[1.1cqw] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-[0.4cqw] border-2 border-[#b8893a] bg-gradient-to-b from-[#3d2910] to-[#1f1406] px-[2cqw] py-[0.35cqw] font-bold uppercase tracking-wider text-[#f4c55a] shadow-lg max-md:-top-3 max-md:px-4 max-md:py-1" style={{ fontSize: fs(11, 1.05, 18), fontFamily: 'Cinzel, Georgia, serif' }}>{label}</span>
        </section>
    );
}

/** One digit on a drum: the ones either side faded, turned up or down. */
export function Dial({ value, onChange, disabled, big = false }) {
    const turn = (d) => onChange((value + d + 10) % 10);
    return (
        <div className={`${tile} flex-col py-[0.3cqw] max-md:py-1`} style={{ width: big ? fs(40, 4.6, 70) : fs(34, 3.4, 56) }}>
            <button type="button" disabled={disabled} onClick={() => turn(1)} aria-label="Up" className="text-[#f4c55a] hover:text-white disabled:opacity-40"><ChevronUp size={16} /></button>
            <span className="font-black leading-none text-[#8a6a2f]/70" style={{ fontSize: fs(10, 1, 15) }}>{(value + 9) % 10}</span>
            <span className="my-[0.2cqw] font-black leading-none text-[#ffd166] [text-shadow:0_0_8px_rgba(251,191,36,.8)]" style={{ fontSize: fs(18, big ? 2.6 : 2, 36), fontFamily: 'Cinzel, Georgia, serif' }} data-dial>{value}</span>
            <span className="font-black leading-none text-[#8a6a2f]/70" style={{ fontSize: fs(10, 1, 15) }}>{(value + 1) % 10}</span>
            <button type="button" disabled={disabled} onClick={() => turn(-1)} aria-label="Down" className="text-[#f4c55a] hover:text-white disabled:opacity-40"><ChevronDown size={16} /></button>
        </div>
    );
}

const Prompt = ({ children }) => <p className="text-center font-bold leading-snug" style={{ fontSize: fs(13, 1.2, 20) }}>{children}</p>;
const Submit = ({ children, ...props }) => <button type="button" {...props} className={`${goldButton} mx-auto mt-auto block w-[72%] py-[0.7cqw] max-md:py-2.5`} style={{ fontSize: fs(12, 1.15, 19) }}>{children}</button>;

/* ── 1 · The Ancient Lock ── */
export function SequencePuzzle({ cur, box, label, onSubmit, disabled, shake, audio }) {
    const [pick, setPick] = useState(null);
    return (
        <Panel box={box} label={label} shake={shake}>
            <Prompt>{cur.prompt}</Prompt>
            <div className="mt-[1.2cqw] grid gap-[0.6cqw] max-md:mt-3 max-md:gap-1.5" style={{ gridTemplateColumns: `repeat(${cur.sequence.length}, minmax(0,1fr))` }} data-sequence>
                {cur.sequence.map((s, i) => (
                    <div key={i} className={`${tile} aspect-square p-[0.8cqw] ${s ? '' : 'border-[#f4c55a] bg-gradient-to-b from-[#f6e7c4] to-[#d8bd86]'}`}>
                        {s ? <Glyph name={s} /> : pick ? <Glyph name={pick} /> : <span className="font-black text-[#3a250d]" style={{ fontSize: fs(18, 2.6, 44), fontFamily: 'Cinzel, Georgia, serif' }}>?</span>}
                    </div>
                ))}
            </div>
            <div className="mt-[1.4cqw] grid grid-cols-4 gap-[0.8cqw] max-md:mt-3 max-md:gap-2" role="group" aria-label="Symbols">
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

/* ── 2 · The Hidden Mechanism ── */
export function RingsPuzzle({ cur, box, label, onSubmit, disabled, shake, audio }) {
    const [pos, setPos] = useState(cur.start);
    // Each ring on its own; a linked set turns the next one too (the last turns alone).
    const turn = (i, d) => { audio.sfx('gear'); setPos((p) => p.map((x, k) => (k === i || (cur.linked !== false && k === i + 1 && i < 2) ? (x + d + 6) % 6 : x))); };
    const face = (i, off = 0) => cur.rings[i][(((pos[i] + off) % 6) + 6) % 6];
    return (
        <Panel box={box} label={label} shake={shake}>
            <Prompt>{cur.prompt}</Prompt>
            <div className="mt-[0.8cqw] flex items-center justify-center gap-[0.6cqw] max-md:mt-2 max-md:gap-1.5" data-plate>
                <span className="font-bold uppercase text-[#6b4a1a]" style={{ fontSize: fs(10, 0.85, 14) }}>Bridge plate</span>
                {cur.target.map((s, i) => <span key={i} className={`${tile} p-[0.3cqw]`} style={{ width: fs(24, 2.2, 36), height: fs(24, 2.2, 36) }}><Glyph name={s} /></span>)}
            </div>
            <div className="mt-[0.9cqw] flex items-stretch justify-center gap-[0.3cqw] rounded-[0.8cqw] border-2 border-[#3b2610] bg-gradient-to-b from-[#2a1c0b] to-[#120c04] p-[0.8cqw] max-md:mt-2 max-md:p-2" data-rings>
                {[0, 1, 2].map((i) => (
                    <div key={i} className="flex flex-1 flex-col items-center">
                        <button type="button" disabled={disabled} onClick={() => turn(i, -1)} aria-label={`Turn ring ${i + 1} up`} className="text-[#f4c55a] hover:text-white disabled:opacity-40"><ChevronUp size={18} /></button>
                        <div className="relative w-full overflow-hidden rounded-[0.6cqw] border border-[#b8893a] bg-[linear-gradient(90deg,#5a3d14,#d9a441_35%,#f4d27a_50%,#d9a441_65%,#5a3d14)] py-[0.4cqw] shadow-[inset_0_6px_8px_rgba(0,0,0,.55),inset_0_-6px_8px_rgba(0,0,0,.55)]">
                            <div className="mx-auto h-[1.6cqw] w-[1.6cqw] opacity-40 max-md:h-5 max-md:w-5"><Glyph name={face(i, -1)} dim /></div>
                            <div key={pos[i]} className="fv-turn mx-auto my-[0.3cqw] h-[3.4cqw] w-[3.4cqw] max-md:h-10 max-md:w-10" data-ring-face={face(i)}><Glyph name={face(i)} /></div>
                            <div className="mx-auto h-[1.6cqw] w-[1.6cqw] opacity-40 max-md:h-5 max-md:w-5"><Glyph name={face(i, 1)} dim /></div>
                        </div>
                        <button type="button" disabled={disabled} onClick={() => turn(i, 1)} aria-label={`Turn ring ${i + 1} down`} className="text-[#f4c55a] hover:text-white disabled:opacity-40"><ChevronDown size={18} /></button>
                    </div>
                ))}
            </div>
            <Submit disabled={disabled} onClick={() => onSubmit([0, 1, 2].map((i) => face(i)))}>Submit</Submit>
        </Panel>
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
export function CodePuzzle({ cur, box, label, onSubmit, disabled, shake, audio, wall }) {
    const [digits, setDigits] = useState([0, 0, 0]);
    const set = (i, v) => { audio.sfx('dial'); setDigits((d) => d.map((x, k) => (k === i ? v : x))); };
    return (
        <>
            {/* The mural and the dials on the wall, over the chamber's own. */}
            <div className="absolute z-10 hidden md:block" style={{ left: `${wall.mural.l}%`, top: `${wall.mural.t}%`, width: `${wall.mural.w}%`, height: `${wall.mural.h}%` }}><Mural cur={cur} /></div>
            {wall.dials.map((d, i) => (
                <div key={i} className="absolute z-10 hidden -translate-x-1/2 -translate-y-1/2 md:block" style={{ left: `${d.x}%`, top: `${d.y}%` }}>
                    <Dial value={digits[i]} onChange={(v) => set(i, v)} disabled={disabled} big />
                </div>
            ))}
            <Panel box={box} label={label} shake={shake}>
                <Prompt>{cur.prompt}</Prompt>
                <div className="mt-3 md:hidden"><Mural cur={cur} compact /></div>
                <div className="mx-auto mt-[0.8cqw] flex w-fit gap-[0.8cqw] rounded-[0.6cqw] border-2 border-[#3b2610] bg-[#1f1406] p-[0.6cqw] max-md:mt-3 max-md:gap-2 max-md:p-2" data-code>
                    {digits.map((v, i) => (
                        <div key={i} className="flex items-center">
                            <span className="hidden md:block"><span className={`${tile} font-black text-[#ffd166]`} style={{ width: fs(30, 3.4, 54), height: fs(34, 3.6, 58), fontSize: fs(16, 2, 32), fontFamily: 'Cinzel, Georgia, serif' }}>{v}</span></span>
                            <span className="md:hidden"><Dial value={v} onChange={(x) => set(i, x)} disabled={disabled} /></span>
                        </div>
                    ))}
                </div>
                <p className="mt-[0.4cqw] text-center text-[#6b4a1a] max-md:hidden" style={{ fontSize: fs(10, 0.8, 13) }}>Turn the dials on the door: ☀ then ☾ then △</p>
                <Submit disabled={disabled} onClick={() => onSubmit(digits.join(''))}>Submit code</Submit>
            </Panel>
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
            {/* The light path control, where the chamber's image has it. */}
            <section className="absolute z-20 hidden rounded-[0.8cqw] border-2 border-[#b8893a] bg-gradient-to-b from-[#2a1c0b]/95 to-[#120c04]/95 p-[0.8cqw] text-center shadow-xl md:block" style={{ left: `${wall.l}%`, top: `${wall.t}%`, width: `${wall.w}%`, height: `${wall.h}%` }}>
                <p className="font-bold uppercase tracking-wider text-[#f4c55a]" style={{ fontSize: fs(10, 1, 17), fontFamily: 'Cinzel, Georgia, serif' }}>Light path control</p>
                <div className="mx-auto mt-[0.3cqw] h-[78%] w-full"><LightBoard cur={cur} states={states} /></div>
            </section>
            <Panel box={box} label={label} shake={shake}>
                <Prompt>{cur.prompt}</Prompt>
                <div className="mx-auto mt-3 aspect-square w-[80%] md:hidden"><LightBoard cur={cur} states={states} /></div>
                <div className="mt-[0.8cqw] grid grid-cols-4 gap-[0.7cqw] max-md:mt-3 max-md:gap-1.5" data-mirrors>
                    {cur.mirrors.map((m, i) => (
                        <div key={i} className={`${tile} flex-col py-[0.5cqw] max-md:py-1.5`} data-mirror={i} data-state={states[i]}>
                            <div className="h-[2.6cqw] w-[2.6cqw] max-md:h-8 max-md:w-8"><Glyph name={m.symbol} /></div>
                            <div className="mt-[0.2cqw] flex w-full items-center justify-between px-[0.3cqw]">
                                <button type="button" disabled={disabled} onClick={() => turn(i, -1)} aria-label={`Turn the ${m.symbol} mirror left`} className="text-[#f4c55a] hover:text-white disabled:opacity-40"><ChevronLeft size={18} /></button>
                                <span className="font-black text-[#e5e7eb]" style={{ fontSize: fs(12, 1.2, 20) }}>{['╱', '—', '╲', '|'][states[i]]}</span>
                                <button type="button" disabled={disabled} onClick={() => turn(i, 1)} aria-label={`Turn the ${m.symbol} mirror right`} className="text-[#f4c55a] hover:text-white disabled:opacity-40"><ChevronRight size={18} /></button>
                            </div>
                        </div>
                    ))}
                </div>
                <p className={`mt-[0.4cqw] text-center font-bold max-md:mt-2 ${hit ? 'text-emerald-800' : 'text-[#6b4a1a]'}`} style={{ fontSize: fs(10, 0.85, 14) }}>{hit ? '◆ The light reaches the crystal!' : 'The light does not reach the crystal yet.'}</p>
                <Submit disabled={disabled} onClick={() => onSubmit(states)}>Submit answer</Submit>
            </Panel>
        </>
    );
}

/* ── 5 · The Final Trial ── */
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
    return (
        <Panel box={box} label={label} shake={shake}>
            <Prompt>{cur.prompt}</Prompt>
            <ol className="mt-[0.6cqw] space-y-[0.2cqw] rounded-[0.5cqw] bg-[#3a250d]/10 px-[0.8cqw] py-[0.5cqw] max-md:mt-2 max-md:p-2" style={{ fontSize: fs(11, 0.95, 16) }} data-trial-clues>
                {cur.clues.map((c, i) => <li key={i} className="font-semibold">◆ {c}</li>)}
            </ol>
            <p className="mt-[0.6cqw] text-center font-bold uppercase text-[#6b4a1a] max-md:mt-2" style={{ fontSize: fs(10, 0.85, 14) }}>Step 1 · Put the symbols in order</p>
            <div className="mt-[0.3cqw] flex justify-center gap-[0.8cqw] max-md:gap-2" data-altar>
                {slots.map((s, i) => (
                    <div key={i} className={`${tile} flex-col px-[0.3cqw] py-[0.4cqw]`} style={{ width: fs(56, 5.4, 90) }}>
                        <div className="h-[3cqw] w-[3cqw] max-md:h-9 max-md:w-9">{s ? <Glyph name={s} /> : <span className="flex h-full items-center justify-center font-black text-[#8a6a2f]">{i + 1}</span>}</div>
                        <div className="flex w-full justify-between">
                            <button type="button" disabled={disabled} onClick={() => cycle(i, -1)} aria-label={`Slot ${i + 1}: previous relic`} className="text-[#f4c55a] disabled:opacity-40"><ChevronLeft size={16} /></button>
                            <button type="button" disabled={disabled} onClick={() => cycle(i, 1)} aria-label={`Slot ${i + 1}: next relic`} className="text-[#f4c55a] disabled:opacity-40"><ChevronRight size={16} /></button>
                        </div>
                    </div>
                ))}
            </div>
            <p className="mt-[0.6cqw] text-center font-bold uppercase text-[#6b4a1a] max-md:mt-2" style={{ fontSize: fs(10, 0.85, 14) }}>Step 2 · Enter the code</p>
            <p className="text-center" style={{ fontSize: fs(10, 0.85, 14) }}>{cur.rule}</p>
            <div className="mt-[0.4cqw] flex justify-center gap-[0.6cqw] max-md:gap-1.5" data-final-code>
                {digits.map((v, i) => <Dial key={i} value={v} onChange={(x) => { audio.sfx('dial'); setDigits((d) => d.map((y, k) => (k === i ? x : y))); }} disabled={disabled} />)}
            </div>
            <Submit disabled={disabled || !ready} onClick={() => onSubmit({ order: slots, code: digits.join('') })}>Open the vault</Submit>
        </Panel>
    );
}

