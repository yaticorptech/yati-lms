import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Smartphone } from 'lucide-react';

/**
 * The Lost Kingdom and The Final Vault on a phone (asked 2026-11-05: "play it
 * vertically, full screen, fitted to the device, everything clearly
 * visible"): while `on`, the game leaves the page and fills the screen,
 * upright, above the site's header and bottom bar, scrolling inside itself.
 * The page behind stops scrolling. A Back button stands in for the page's
 * own, which this covers (`back`: off where the screen has its own way out). Off (a wider screen, or the game over and its
 * results to show), the game sits in the page as before.
 */
export default function PhoneStage({ on, children, tone = '#0b0805', back = true, center = false }) {
    useEffect(() => {
        if (!on) return undefined;
        const { overflow } = document.body.style;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = overflow; };
    }, [on]);
    if (!on) return children;
    return createPortal(
        <div className="fixed inset-0 z-[130] flex flex-col overflow-y-auto overscroll-contain text-[#f3e6c8]"
            style={{ background: tone, height: '100dvh', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }} data-phone-stage>
            {back && <div className="flex items-center px-3 pt-2 pb-1">
                <button type="button" onClick={() => window.history.back()} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white/5 px-3.5 text-sm font-semibold text-white/90 ring-1 ring-white/15">
                    <ArrowLeft size={16} aria-hidden="true" /> Back
                </button>
            </div>}
            <div className={`space-y-3 px-2 ${center ? 'my-auto py-4' : ''}`}>{children}</div>
        </div>,
        document.body
    );
}

/**
 * A phone turned sideways, playing the wide layout (Final Vault's "landscape view", 2026-11-05): the game fills
 * the screen, fitted so the whole picture shows — as wide as the screen, or as wide as its height allows.
 * `aspect` is the picture's width over its height.
 */
export function LandscapeStage({ aspect, children }) {
    useEffect(() => {
        const { overflow } = document.body.style;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = overflow; };
    }, []);
    return createPortal(
        <div className="fixed inset-0 z-[130] flex items-center justify-center overflow-hidden bg-black" style={{ height: '100dvh' }} data-landscape-stage>
            <div style={{ width: `min(100vw, calc(100dvh * ${aspect}))` }}>{children}</div>
        </div>,
        document.body
    );
}

/** Asked for the other view than the phone is held in: turn it, or keep this one. */
export function RotatePrompt({ to, onCancel }) {
    return createPortal(
        <div className="fixed inset-0 z-[150] flex flex-col items-center justify-center gap-4 bg-[#0b0805] p-6 text-center text-[#f3e6c8]" role="dialog" aria-modal="true" aria-label="Turn your phone" data-rotate-prompt={to}>
            <Smartphone size={56} className={`text-[#f4c55a] transition-transform duration-700 ${to === 'landscape' ? 'rotate-90' : ''}`} aria-hidden="true" />
            <p className="text-xl font-black">{to === 'landscape' ? 'Turn your phone sideways' : 'Turn your phone upright'}</p>
            <p className="max-w-xs text-sm text-[#d9cbb4]">{to === 'landscape' ? 'The whole chamber, as on a big screen. The game carries on while you turn.' : 'The chamber on top, the puzzle below it.'}</p>
            <button type="button" onClick={onCancel} className="mt-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-bold ring-1 ring-white/20">
                {to === 'landscape' ? 'Stay upright' : 'Stay sideways'}
            </button>
        </div>,
        document.body
    );
}

/**
 * A phone held upright, playing the wide layout (2026-11-05): the game turned a quarter to the right and filling
 * the screen, fitted so the whole picture shows. Turning the phone sideways reads it the right way up.
 */
export function RotatedStage({ aspect, children }) {
    useEffect(() => {
        const { overflow } = document.body.style;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = overflow; };
    }, []);
    return createPortal(
        <div className="fixed z-[130] overflow-hidden bg-black" style={{ top: 0, left: '100vw', width: '100dvh', height: '100vw', transform: 'rotate(90deg)', transformOrigin: 'top left' }} data-rotated-stage>
            <div className="flex h-full w-full items-center justify-center">
                <div style={{ width: `min(100dvh, calc(100vw * ${aspect}))` }}>{children}</div>
            </div>
        </div>,
        document.body
    );
}

/** On a phone in the wide layout: leave, or the upright layout. */
export function WideButtons({ onUpright }) {
    return (
        <div className="fixed bottom-2 left-2 z-[140] flex gap-1.5" data-wide-buttons>
            <button type="button" onClick={() => window.history.back()} className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-black/70 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-lg">
                <ArrowLeft size={13} aria-hidden="true" /> Back
            </button>
            <button type="button" onClick={onUpright} className="inline-flex items-center gap-1 rounded-full border border-[#b8893a] bg-black/70 px-2.5 py-1.5 text-[11px] font-bold text-[#f5e6c4] shadow-lg" data-go-upright>
                <Smartphone size={13} aria-hidden="true" /> Upright view
            </button>
        </div>
    );
}
