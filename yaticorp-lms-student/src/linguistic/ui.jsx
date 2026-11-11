/**
 * Linguistic Ability — the small pieces every screen of the section uses:
 * chunky buttons that press down, the mascot, the speaker button, progress
 * bars, the level chip, and the loading and error states.
 */
import { useEffect, useState } from 'react';
import { Volume2, RotateCcw } from 'lucide-react';
import { COLORS, levelOf, play, canSpeak, canSpeakIn, langOf, onTalk, talkNow } from './meta';

/**
 * A chunky button. `color` is one of COLORS; `variant`:
 *   solid    the colour's face standing on its darker edge (the main action)
 *   outline  white with a grey edge, text in the colour (the second action)
 *   ghost    text only
 */
export function Chunky({ color = 'green', variant = 'solid', className = '', style, disabled, children, ...rest }) {
    const c = COLORS[color] || COLORS.green;
    const look = disabled && variant === 'solid'
        ? { background: '#E5E5E5', borderColor: '#E5E5E5', color: '#AFAFAF' }
        : variant === 'solid' ? { background: c.face, borderColor: c.edge, color: '#fff' }
            : variant === 'outline' ? { background: '#fff', borderColor: '#E5E5E5', color: c.ink }
                : { background: 'transparent', borderColor: 'transparent', color: c.ink };
    return (
        <button type="button" disabled={disabled} className={`lingo-btn inline-flex min-h-12 items-center justify-center gap-2 px-5 text-[15px] ${variant === 'ghost' ? '!border-0' : ''} ${className}`} style={{ ...look, ...style }} {...rest}>
            {children}
        </button>
    );
}

/*
 * Where each pose's mouth is in its picture (2026-11-07, found from the pictures: the dark shape under and between the
 * eyes): [picture width, height, mouth middle x, y, mouth width, height], in the picture's pixels.
 */
const MOUTHS = {
    'cheer-jump': [427, 443, 223, 147, 53, 31], 'confetti-cheer': [331, 324, 166, 125, 44, 23], 'curious-question': [279, 309, 130, 129, 21, 17],
    'flex-content': [345, 430, 152, 140, 44, 18], 'flex-determined': [330, 323, 114, 129, 35, 14], 'heart-hands': [237, 313, 129, 130, 38, 17],
    'jump-cheer': [338, 332, 176, 120, 42, 27], meditating: [286, 308, 137, 125, 39, 14], 'point-right': [387, 437, 165, 155, 53, 30],
    presenting: [314, 309, 119, 120, 41, 23], running: [248, 311, 135, 128, 41, 24], 'sad-slump': [247, 306, 126, 161, 27, 7], sad: [306, 431, 153, 195, 33, 9],
    shocked: [247, 324, 129, 133, 24, 25], 'star-celebrate': [309, 324, 124, 116, 44, 26], 'surprised-gasp': [301, 431, 166, 152, 31, 33],
    thinking: [285, 437, 160, 150, 39, 15], 'thumbs-up': [354, 436, 213, 151, 54, 30], 'walk-wave': [301, 329, 188, 128, 43, 24],
    'wave-hi': [382, 432, 236, 158, 54, 32], worried: [232, 311, 128, 128, 30, 16]
};

/** Whether the mascot is speaking now, and how many words it has said (meta.js onTalk); only while `on`. */
function useTalk(on) {
    const [now, setNow] = useState(talkNow);
    useEffect(() => (on ? onTalk(setNow) : undefined), [on]);
    return on ? now : { on: false, word: 0 };
}

/**
 * A speaking mouth over the picture's own (2026-11-07, the user: "lip movement, like Duolingo — for a sentence, its
 * words"): its own mouth covered with the face's white, a mouth opening and closing on top, opening again at each word
 * the voice reaches. Drawn in the picture's own pixels, scaled as the picture is (object-contain = "meet").
 */
function TalkingMouth({ at: [W, H, x, y, w, h], word }) {
    const rw = Math.max(w, 26) * 0.48, rh = Math.max(h, 18) * 0.62;
    return (
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" data-talking-mouth={word}>
            <defs>
                <radialGradient id="lingo-face-white"><stop offset="72%" stopColor="#fff" /><stop offset="100%" stopColor="#fff" stopOpacity="0" /></radialGradient>
            </defs>
            <ellipse cx={x} cy={y} rx={w * 0.72 + 7} ry={h * 0.85 + 7} fill="url(#lingo-face-white)" />
            <g key={word} className="lingo-talk">
                <ellipse cx={x} cy={y} rx={rw} ry={rh} fill="#1F2B4D" />
                <ellipse cx={x} cy={y + rh * 0.42} rx={rw * 0.62} ry={rh * 0.48} fill="#F47A8C" />
            </g>
        </svg>
    );
}

/** The app's own mascot, in a pose from /mascot/stills; `talk`: its mouth moves while the app's voice speaks (2026-11-07). */
export function Mascot({ pose = 'wave-hi', className = 'h-28 w-28', alt = '', talk = false }) {
    const mouth = talk ? MOUTHS[pose] : null;
    const now = useTalk(!!mouth);
    const img = <img src={`/mascot/stills/${pose}.png`} alt={alt} aria-hidden={alt ? undefined : 'true'} draggable="false" className={`select-none object-contain ${mouth ? 'h-full w-full' : className}`} />;
    if (!mouth) return img;
    return (
        <span className={`relative inline-block ${className}`} data-mascot-talking={now.on ? 'yes' : 'no'}>
            {img}
            {now.on && <TalkingMouth at={mouth} word={now.word} />}
        </span>
    );
}

/**
 * The big blue speaker: plays the recording, or the browser reads the text.
 * With no recording and no voice for the language on this device, it says so
 * for a few seconds instead of staying silent (2026-10-26).
 */
export function Speaker({ src, text, lang = 'en-IN', size = 'md', label = 'Listen', className = '', gender = null }) {
    const [missing, setMissing] = useState(false);
    if (!(canSpeak(src) || (text && canSpeak()))) return null;
    const tap = (e) => {
        e.stopPropagation();
        if (!src && !canSpeakIn(lang)) { setMissing(true); setTimeout(() => setMissing(false), 5000); return; }
        play(src, text, lang, { gender });
    };
    return (
        <span className="relative inline-flex shrink-0">
            <button type="button" onClick={tap} aria-label={`${label}: ${text || ''}`}
                className={`lingo-btn inline-flex shrink-0 items-center justify-center ${size === 'lg' ? 'h-16 w-16 rounded-2xl' : size === 'sm' ? 'h-9 w-9 !rounded-xl !border-b-[3px]' : 'h-12 w-12'} ${className}`}
                style={{ background: COLORS.blue.face, borderColor: COLORS.blue.edge, color: '#fff' }}>
                <Volume2 size={size === 'lg' ? 28 : size === 'sm' ? 16 : 22} strokeWidth={2.5} />
            </button>
            {missing && (
                <span role="status" data-no-voice={lang} className="absolute left-1/2 top-full z-30 mt-2 w-56 -translate-x-1/2 rounded-xl bg-[#4b4b4b] px-3 py-2 text-center text-xs font-bold leading-snug text-white shadow-lg">
                    This device has no {langOf(String(lang).split('-')[0]).name} voice. Add one in your device&apos;s text-to-speech settings.
                </span>
            )}
        </span>
    );
}

/** A rounded progress bar with the glossy stripe along its top. */
export const Bar = ({ value = 0, color = 'green', className = 'h-4', label }) => {
    const v = Math.max(0, Math.min(100, value));
    return (
        <div className={`relative overflow-hidden rounded-full bg-[#E5E5E5] ${className}`} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
            <div className="relative h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: `${v}%`, background: (COLORS[color] || COLORS.green).face }}>
                {v > 6 && <span className="absolute left-2 right-2 top-[22%] h-[28%] rounded-full bg-white/30" />}
            </div>
        </div>
    );
};

export const LevelChip = ({ level, className = '' }) => {
    const l = levelOf(level);
    return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-black ring-1 ring-inset ${l.chip} ${className}`}>{l.label}</span>;
};

/** A white card with the grey edge Linguistic Ability uses for panels. */
export const Panel = ({ as: Tag = 'section', className = '', children, ...rest }) => (
    <Tag className={`rounded-2xl border-2 border-[#E5E5E5] bg-white ${className}`} {...rest}>{children}</Tag>
);

export const Loading = ({ label = 'Loading…' }) => (
    <div className="lingo flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center" role="status">
        <Mascot pose="thinking" className="h-28 w-28 animate-pulse" />
        <p className="text-lg font-extrabold text-[#AFAFAF]">{label}</p>
    </div>
);

export const Problem = ({ error, onRetry }) => (
    <div className="lingo mx-auto flex max-w-md flex-col items-center gap-3 py-12 text-center" role="alert">
        <Mascot pose="worried" className="h-28 w-28" />
        <p className="text-xl font-black">Something went wrong</p>
        <p className="text-[15px] font-semibold text-[#777]">{error?.message || 'Please try again.'}</p>
        {onRetry && <Chunky color="blue" onClick={onRetry} className="mt-1"><RotateCcw size={17} /> Try again</Chunky>}
    </div>
);
