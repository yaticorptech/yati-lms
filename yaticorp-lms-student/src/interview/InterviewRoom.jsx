/**
 * The mock interview's stage (2026-10-27): the interviewer at their desk, in
 * the painted office (public/illustrations/interview-room.jpg), brought to
 * life on top of the picture — the mouth moves while the question is spoken,
 * the eyes blink, and the view drifts a little, so it feels like a person
 * across the table rather than a voice from a circle.
 *
 * The picture carries a "Listening to you" label painted into its top band;
 * the frame hides that band (TRIM) and draws a live status of its own, in the
 * bottom-left corner over the desk, clear of the interviewer's head.
 *
 * Positions are in % of the frame, measured on the 1800 × 1145 picture with
 * its top 170 px trimmed (so the frame is 1800 × 975).
 */
import { Volume2, Mic, Sparkles, Check, X, HelpCircle } from 'lucide-react';
import './interviewRoom.css';

const TRIM = 170 / 1145;                  // the share of the picture hidden at the top
const RATIO = 1800 / 975;                 // the frame's width to height
// Measured from the picture's pixels: the mouth 848–905 × 505–546, the eyes 761–811 × 440–506 and 911–960 × 409–476.
const MOUTH = { left: 48.67, top: 36.51, w: 3.33, h: 4.31 };
const EYES = [{ left: 43.67, top: 31.08, w: 2.78, h: 6.77 }, { left: 51.94, top: 27.9, w: 2.72, h: 6.87 }];
const FACE = '#f2f1f9';   // the face's colour around them
const INK = '#1e1b4b';
// The face in frame pixels (1800 × 975): the eyes' centres and size, the tilt of the head.
const FX = { l: [786, 303], r: [935, 272], eye: [25, 33], tilt: -11.8, centre: [862, 312] };
// The painted eyebrows (frame pixels), each covered by its own patch before the new ones are drawn.
const PAINTED_BROWS = [[784, 249], [941, 212]];

const STATUS = {
    speaking: { icon: Volume2, text: 'Asking', cls: 'bg-indigo-600 text-white' },
    listening: { icon: Mic, text: 'Listening to you', cls: 'bg-rose-600 text-white' },
    review: { icon: Check, text: 'Your answer', cls: 'bg-slate-900 text-white' },
    analyzing: { icon: Sparkles, text: 'Thinking it over', cls: 'bg-violet-600 text-white' },
    next: { icon: Check, text: 'Good — next question', cls: 'bg-emerald-600 text-white' },
    done: { icon: Check, text: 'Interview complete', cls: 'bg-emerald-600 text-white' }
};

// The interviewer's reaction to the last answer (the server's verdict): its face, a sign over its
// head, and what the status says. 'wrong' — not correct; 'unsure' — not satisfying; 'happy' — good.
const MOOD = {
    wrong: { icon: X, text: 'Not correct — improve it', cls: 'bg-rose-600 text-white', sign: 'bg-rose-500', SignIcon: X },
    unsure: { icon: HelpCircle, text: 'Not satisfied — improve it', cls: 'bg-amber-500 text-white', sign: 'bg-amber-400', SignIcon: HelpCircle },
    happy: { icon: Check, text: 'Good answer', cls: 'bg-emerald-600 text-white', sign: 'bg-emerald-500', SignIcon: Check }
};

const at = ({ left, top, w, h }) => ({ left: `${left}%`, top: `${top}%`, width: `${w}%`, height: `${h}%`, transform: 'translate(-50%, -50%)' });

/** The mouth: the painted one is covered by a patch of face, and drawn again so it can move. */
function Mouth({ talking, mood }) {
    return (
        <span aria-hidden className="absolute" style={at({ ...MOUTH, w: MOUTH.w * 1.7, h: MOUTH.h * 1.7 })}>
            {/* The face, over the painted mouth: its own colour, soft-edged so no rim shows. */}
            <span className="absolute inset-0 rounded-full" style={{ background: `radial-gradient(closest-side, ${FACE} 70%, transparent)` }} />
            <svg viewBox="0 0 60 40" preserveAspectRatio="none" className="absolute top-[20%] left-[20%] h-[60%] w-[60%] overflow-visible">
                {talking ? (
                    <g className="ir-lips" style={{ transformOrigin: '30px 4px' }}>
                        {/* Speaking: an open mouth, opening and closing. */}
                        <path d="M2 4 Q30 6 58 4 Q56 38 30 39 Q4 38 2 4 Z" fill="#9f1239" />
                        <ellipse cx="30" cy="31" rx="15" ry="7" fill="#f43f5e" />
                        <path d="M2 4 Q30 6 58 4" stroke="#1e1b4b" strokeWidth="3" fill="none" strokeLinecap="round" />
                    </g>
                ) : mood === 'wrong' ? (
                    /* Not correct: a frown. */
                    <path d="M12 30 Q30 12 48 30" stroke="#1e1b4b" strokeWidth="4.5" fill="none" strokeLinecap="round" />
                ) : mood === 'unsure' ? (
                    /* Not satisfied: a doubtful, crooked line. */
                    <path d="M8 22 Q19 15 30 21 Q41 27 52 17" stroke="#1e1b4b" strokeWidth="4.5" fill="none" strokeLinecap="round" />
                ) : mood === 'happy' ? (
                    /* Good: a wide, open smile. */
                    <path d="M6 10 Q30 44 54 10 Z" fill="#9f1239" stroke="#1e1b4b" strokeWidth="3.5" strokeLinejoin="round" />
                ) : (
                    /* Quiet (listening, thinking): lips closed in a soft smile. */
                    <path className="ir-smile" d="M10 14 Q30 30 50 14" stroke="#1e1b4b" strokeWidth="4.5" fill="none" strokeLinecap="round" style={{ transformOrigin: '30px 20px' }} />
                )}
            </svg>
        </span>
    );
}

/**
 * A reaction drawn as one face over the painted one (brows, eyes, blush, extras), so every part
 * matches: the painted features are covered by a soft patch of face, and the new ones drawn in
 * frame pixels, tilted with the head. The mouth is the Mouth's, drawn over this.
 *   wrong  — disappointed: brows knitted down, heavy lids, eyes looking down
 *   unsure — doubtful: both brows lifted a little in the middle, eyes open, a wavering mouth
 *   happy  — delighted: brows lifted, eyes closed in smiles, brighter blush
 */
function Expression({ mood }) {
    if (!mood) return null;
    const [cx, cy] = FX.centre;
    const [rx, ry] = FX.eye;
    const eye = ([x, y], i) => {
        if (mood === 'happy') {
            return <path key={i} d={`M${x - 26} ${y + 8} Q${x} ${y - 26} ${x + 26} ${y + 8}`} stroke={INK} strokeWidth="9" fill="none" strokeLinecap="round" />;
        }
        // How much of the eye the lid covers: both heavy when wrong; open otherwise.
        const lid = mood === 'wrong' ? 0.45 : 0;
        const look = mood === 'wrong' ? 7 : 0;   // eyes cast down when disappointed
        const clipId = `ir-eye-${mood}-${i}`;
        const top = y - ry + lid * ry * 2;
        return (
            <g key={i}>
                <defs><clipPath id={clipId}><rect x={x - rx - 4} y={top} width={rx * 2 + 8} height={ry * 2 + 8} /></clipPath></defs>
                <g clipPath={`url(#${clipId})`}>
                    <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#0f172a" />
                    <ellipse cx={x} cy={y + look} rx={rx * 0.62} ry={ry * 0.62} fill="#1e3a8a" opacity="0.55" />
                    <circle cx={x - 8} cy={y - 12 + look} r="8" fill="#fff" />
                    <circle cx={x + 9} cy={y + 10 + look} r="3.5" fill="#fff" opacity="0.85" />
                </g>
                {lid > 0 && <line x1={x - rx - 3} y1={top} x2={x + rx + 3} y2={top} stroke={INK} strokeWidth="6" strokeLinecap="round" />}
            </g>
        );
    };
    // Brows: [x offset, y offset from the eye, rotation] for left and right.
    const BROW = {
        wrong: [[2, -52, 14], [-2, -52, -14]],
        unsure: [[0, -56, -8], [0, -56, 8]],
        happy: [[0, -62, -6], [0, -62, 6]]
    }[mood];
    const brow = ([x, y], i) => {
        const [dx, dy, rot] = BROW[i];
        const bx = x + dx; const by = y + dy;
        const arc = mood === 'happy' ? 12 : 4;
        return <path key={`b${i}`} d={`M${bx - 26} ${by + 4} Q${bx} ${by - arc} ${bx + 26} ${by + 4}`} transform={`rotate(${rot + FX.tilt} ${bx} ${by})`} stroke={INK} strokeWidth="8" fill="none" strokeLinecap="round" />;
    };
    return (
        <svg aria-hidden viewBox="0 0 1800 975" preserveAspectRatio="none" className="ir-face pointer-events-none absolute inset-0 h-full w-full">
            <defs>
                <radialGradient id="ir-skin"><stop offset="0.8" stopColor={FACE} /><stop offset="1" stopColor={FACE} stopOpacity="0" /></radialGradient>
            </defs>
            <g transform={`rotate(${FX.tilt} ${cx} ${cy})`}>
                {/* The painted brows, eyes, blush and mouth, under a patch of face. */}
                <ellipse cx={cx} cy={cy + 6} rx="150" ry="112" fill="url(#ir-skin)" />
            </g>
            {/* The painted brows sit at the patch's soft edge: each gets a firm patch of its own. */}
            {PAINTED_BROWS.map(([x, y]) => (
                <ellipse key={x} cx={x} cy={y} rx="48" ry="24" fill="url(#ir-skin)" transform={`rotate(${FX.tilt} ${x} ${y})`} />
            ))}
            {/* Blush */}
            <ellipse cx="760" cy="362" rx="27" ry="15" fill="#fb7185" opacity={mood === 'happy' ? 0.6 : 0.4} />
            <ellipse cx="968" cy="318" rx="27" ry="15" fill="#fb7185" opacity={mood === 'happy' ? 0.6 : 0.4} />
            {[FX.l, FX.r].map(eye)}
            {[FX.l, FX.r].map(brow)}
            {mood === 'wrong' && (
                // A small sigh, puffed from the side of the mouth.
                <g className="ir-sweat" opacity="0.7"><path d="M930 392 q18 -6 30 6 q10 10 26 2" stroke="#94a3b8" strokeWidth="5" fill="none" strokeLinecap="round" /></g>
            )}
        </svg>
    );
}

/** An eyelid over each painted eye, closing for a moment every few seconds. */
function Lids() {
    return EYES.map((e, i) => (
        <span key={i} aria-hidden className="ir-lid absolute rounded-[50%]" style={{ ...at({ ...e, w: e.w * 1.3, h: e.h * 1.15 }), background: FACE, animationDelay: `${i * 0.03}s` }} />
    ));
}

/** The office and the interviewer, with the live status over it. */
export function Room({ phase, mood = null }) {
    const reaction = MOOD[mood] || null;
    // The reaction speaks louder than the plain status, except while they are talking or it is thinking.
    const status = reaction && !['listening', 'analyzing', 'done'].includes(phase) ? reaction : STATUS[phase];
    return (
        /* Phones and tablets: a short widescreen crop centred on the interviewer, a full row of its own; a wide screen the whole room.
           The scene keeps the picture's own proportions inside the frame, so the lips and lids stay on the face. */
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-slate-900 shadow-[0_24px_60px_-24px_rgba(30,27,75,0.55)] ring-1 ring-black/5 sm:aspect-[1800/975] sm:rounded-3xl">
            <div className="absolute top-0 left-1/2 h-full -translate-x-[48.5%] sm:-translate-x-1/2" style={{ aspectRatio: `${RATIO}` }}>
            <div key={mood || 'calm'} className={`ir-cam absolute inset-0 ${mood === 'wrong' ? 'ir-shake' : mood === 'unsure' ? 'ir-tilt' : mood === 'happy' ? 'ir-nod' : ''}`}>
                <img src="/illustrations/interview-room.jpg" alt="The interviewer at a desk in an office"
                    className="absolute top-0 left-0 w-full select-none" draggable={false}
                    style={{ height: 'auto', maxWidth: 'none', transform: `translateY(-${(TRIM * 100).toFixed(2)}%)` }} />
                {!mood && <Lids />}
                <Expression key={mood || 'calm'} mood={mood} />
                <Mouth talking={phase === 'speaking'} mood={mood} />
                {/* A sign over the interviewer's head: ✕, ? or ✓. */}
                {reaction && (
                    <span key={mood} aria-hidden className={`ir-sign absolute flex items-center justify-center rounded-full text-white shadow-lg ring-4 ring-white/80 ${reaction.sign}`}
                        style={{ left: '66%', top: '24%', width: '6%', aspectRatio: '1' }}>
                        <reaction.SignIcon className="h-[60%] w-[60%]" strokeWidth={3} />
                    </span>
                )}
            </div>
            {/* A faint wash of the reaction's colour over the room. */}
            {mood === 'wrong' && <span aria-hidden className="ir-wash pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(225,29,72,0.28))]" />}
            </div>
            {status && (
                <span className={`absolute bottom-3 left-3 z-10 inline-flex max-w-[calc(100%-1.5rem)] items-center gap-1 rounded-full px-2.5 py-1 text-[0.55rem] sm:gap-1.5 sm:text-[0.62rem] font-black tracking-wide whitespace-nowrap uppercase shadow-lg ring-2 ring-white/70 sm:bottom-5 sm:left-5 sm:px-4 sm:py-1.5 sm:text-xs ${status.cls}`} aria-live="polite">
                    {phase === 'listening' ? <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> : <status.icon size={13} />}
                    {status.text}
                </span>
            )}
        </div>
    );
}

/** The question, said by the interviewer: a speech bubble pointing up at them. */
export function Bubble({ children, talking }) {
    return (
        <div className="ir-bubble relative rounded-2xl bg-white p-3.5 shadow-[0_18px_40px_-20px_rgba(49,46,129,0.35)] ring-1 ring-indigo-100 sm:rounded-3xl sm:p-6">
            {/* The tail: up at the room above it, or left at it beside it on a wide screen. */}
            <span aria-hidden className="absolute -top-2 left-10 h-4 w-4 rotate-45 bg-white ring-1 ring-indigo-100 [clip-path:polygon(0_0,100%_0,0_100%)] lg:top-8 lg:-left-2 lg:[clip-path:polygon(0_0,0_100%,100%_100%)]" />
            <div className="mb-2 flex items-center gap-2">
                <span className="text-[0.6rem] font-black tracking-[0.16em] text-indigo-500 uppercase sm:text-[0.68rem]">Interviewer</span>
                {talking && <span aria-hidden className="iv-dots inline-flex items-center gap-1 text-indigo-400"><span /><span /><span /></span>}
            </div>
            {children}
        </div>
    );
}
