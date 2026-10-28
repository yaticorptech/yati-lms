/**
 * The mock interview's stage (2026-10-27): the interviewer at their desk, in
 * the painted office (public/illustrations/interview-room.jpg), brought to
 * life on top of the picture — the mouth moves while the question is spoken,
 * the eyes blink, and the view drifts a little, so it feels like a person
 * across the table rather than a voice from a circle.
 *
 * The picture carries a "Listening to you" label painted into its top band;
 * the frame hides that band (TRIM) and draws a live status of its own.
 *
 * Positions are in % of the frame, measured on the 1800 × 1145 picture with
 * its top 170 px trimmed (so the frame is 1800 × 975).
 */
import { Volume2, Mic, Sparkles, Check } from 'lucide-react';
import './interviewRoom.css';

const TRIM = 170 / 1145;                  // the share of the picture hidden at the top
const RATIO = 1800 / 975;                 // the frame's width to height
// Measured from the picture's pixels: the mouth 848–905 × 505–546, the eyes 761–811 × 440–506 and 911–960 × 409–476.
const MOUTH = { left: 48.67, top: 36.51, w: 3.33, h: 4.31 };
const EYES = [{ left: 43.67, top: 31.08, w: 2.78, h: 6.77 }, { left: 51.94, top: 27.9, w: 2.72, h: 6.87 }];
const FACE = '#f2f1f9';   // the face's colour around them

const STATUS = {
    speaking: { icon: Volume2, text: 'Asking', cls: 'bg-indigo-600 text-white' },
    listening: { icon: Mic, text: 'Listening to you', cls: 'bg-rose-600 text-white' },
    review: { icon: Check, text: 'Your answer', cls: 'bg-slate-900 text-white' },
    analyzing: { icon: Sparkles, text: 'Thinking it over', cls: 'bg-violet-600 text-white' },
    next: { icon: Check, text: 'Good — next question', cls: 'bg-emerald-600 text-white' },
    done: { icon: Check, text: 'Interview complete', cls: 'bg-emerald-600 text-white' }
};

const at = ({ left, top, w, h }) => ({ left: `${left}%`, top: `${top}%`, width: `${w}%`, height: `${h}%`, transform: 'translate(-50%, -50%)' });

/** The mouth: the painted one is covered by a patch of face, and drawn again so it can move. */
function Mouth({ talking }) {
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
                ) : (
                    /* Quiet (listening, thinking): lips closed in a soft smile. */
                    <path className="ir-smile" d="M10 14 Q30 30 50 14" stroke="#1e1b4b" strokeWidth="4.5" fill="none" strokeLinecap="round" style={{ transformOrigin: '30px 20px' }} />
                )}
            </svg>
        </span>
    );
}

/** An eyelid over each painted eye, closing for a moment every few seconds. */
function Lids() {
    return EYES.map((e, i) => (
        <span key={i} aria-hidden className="ir-lid absolute rounded-[50%]" style={{ ...at({ ...e, w: e.w * 1.3, h: e.h * 1.15 }), background: FACE, animationDelay: `${i * 0.03}s` }} />
    ));
}

/** The office and the interviewer, with the live status over it. */
export function Room({ phase }) {
    const status = STATUS[phase];
    return (
        /* Phones and tablets: a short widescreen crop centred on the interviewer, a full row of its own; a wide screen the whole room.
           The scene keeps the picture's own proportions inside the frame, so the lips and lids stay on the face. */
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-slate-900 shadow-[0_24px_60px_-24px_rgba(30,27,75,0.55)] ring-1 ring-black/5 sm:aspect-[1800/975] sm:rounded-3xl">
            <div className="absolute top-0 left-1/2 h-full -translate-x-[48.5%] sm:-translate-x-1/2" style={{ aspectRatio: `${RATIO}` }}>
            <div className="ir-cam absolute inset-0">
                <img src="/illustrations/interview-room.jpg" alt="The interviewer at a desk in an office"
                    className="absolute top-0 left-0 w-full select-none" draggable={false}
                    style={{ height: 'auto', maxWidth: 'none', transform: `translateY(-${(TRIM * 100).toFixed(2)}%)` }} />
                <Lids />
                <Mouth talking={phase === 'speaking'} />
            </div>
            </div>
            {status && (
                <span className={`absolute top-2 left-1/2 inline-flex max-w-[92%] -translate-x-1/2 items-center gap-1 rounded-full px-2.5 py-1 text-[0.55rem] sm:gap-1.5 sm:text-[0.62rem] font-black tracking-wide whitespace-nowrap uppercase shadow-lg sm:top-5 sm:px-4 sm:py-1.5 sm:text-xs ${status.cls}`} aria-live="polite">
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
