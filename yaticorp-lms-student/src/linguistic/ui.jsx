/**
 * Linguistic Ability — the small pieces every screen of the section uses:
 * chunky buttons that press down, the mascot, the speaker button, progress
 * bars, the level chip, and the loading and error states.
 */
import { useState } from 'react';
import { Volume2, RotateCcw } from 'lucide-react';
import { COLORS, levelOf, play, canSpeak, canSpeakIn, langOf } from './meta';

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

/** The app's own mascot, in a pose from /mascot/stills. */
export const Mascot = ({ pose = 'wave-hi', className = 'h-28 w-28', alt = '' }) => (
    <img src={`/mascot/stills/${pose}.png`} alt={alt} aria-hidden={alt ? undefined : 'true'} draggable="false" className={`select-none object-contain ${className}`} />
);

/**
 * The big blue speaker: plays the recording, or the browser reads the text.
 * With no recording and no voice for the language on this device, it says so
 * for a few seconds instead of staying silent (2026-10-26).
 */
export function Speaker({ src, text, lang = 'en-IN', size = 'md', label = 'Listen', className = '' }) {
    const [missing, setMissing] = useState(false);
    if (!(canSpeak(src) || (text && canSpeak()))) return null;
    const tap = (e) => {
        e.stopPropagation();
        if (!src && !canSpeakIn(lang)) { setMissing(true); setTimeout(() => setMissing(false), 5000); return; }
        play(src, text, lang);
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
