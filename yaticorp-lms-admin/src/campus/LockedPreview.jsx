/**
 * A Campus page that is locked for now (2026-11-14), shown whole: greyed and inert, with a lock
 * banner on top. Only attendance and what it needs are open.
 */
import { Lock } from 'lucide-react';

export default function LockedPreview({ title, children }) {
    return (
        <div className="relative">
            <span title={title ? `${title} — locked` : 'Locked'} className="absolute right-2 top-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-400 shadow ring-1 ring-slate-200"><Lock size={14} aria-label="Locked" /></span>
            <div inert="" aria-hidden="true" className="pointer-events-none select-none opacity-60 grayscale">{children}</div>
        </div>
    );
}
